from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, defer
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime, timezone
import json
import uuid

from app.api import deps
from app.db.session import get_db, async_session_factory
from app.models.audit import AuditTask, AuditIssue
from app.models.project import Project
from app.models.user import User
from app.models.user_config import UserConfig
from app.services.scanner import task_control
from app.services.quick_scan import calculate_quality_score
from app.services.ai_investigation import (
    execute_single_investigation,
    execute_batch_investigation,
    get_batch_progress,
    set_batch_progress,
)

router = APIRouter()


async def _fix_stale_issues_count(db: AsyncSession, tasks: list[AuditTask]) -> None:
    """校正 stale 的 issues_count：从 audit_issues 表重新计数并更新任务对象。

    注意：本函数在 GET 端点里被调用，必须避免不必要的写入——
    1) 只统计可能 stale 的任务（status 不是 completed/failed/cancelled，
       或 issues_count==0 但任务已结束、可能是历史脏数据）
    2) quality_score 对比改 0.05 容差（DB Float 精度 vs Python float）
    3) 没有真正变化就不 commit
    """
    if not tasks:
        return
    # 终态任务的 issues_count 通常已经写定，无需每次查 issues 表
    # 仅对未终态任务、或 issues_count==0/quality_score==0 但已完成的可疑任务，做校正
    candidates = [
        t for t in tasks
        if t.status not in ("completed", "failed", "cancelled")
        or (t.status == "completed" and (t.issues_count == 0 or t.quality_score == 0.0))
    ]
    if not candidates:
        return

    task_ids = [t.id for t in candidates]
    counts_result = await db.execute(
        select(AuditIssue.task_id, func.count(AuditIssue.id))
        .where(AuditIssue.task_id.in_(task_ids))
        .group_by(AuditIssue.task_id)
    )
    counts_map = dict(counts_result.all())

    needs_commit = False
    for task in candidates:
        actual_count = counts_map.get(task.id, 0)
        if task.issues_count != actual_count:
            task.issues_count = actual_count
            needs_commit = True
        # 修正 quality_score（scanned_files=0 时用 total_files 代替）
        file_count = task.scanned_files or task.total_files or 0
        if file_count > 0:
            expected_score = calculate_quality_score(file_count, actual_count)
            # DB Float 精度可能跟 Python float 有 0.01~0.02 漂移，容忍 0.05
            if abs((task.quality_score or 0.0) - expected_score) > 0.05:
                task.quality_score = expected_score
                needs_commit = True

    if needs_commit:
        await db.commit()


# Schemas
class AuditIssueSchema(BaseModel):
    id: str
    task_id: str
    file_path: str
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    issue_type: str
    severity: str
    title: Optional[str] = None
    message: Optional[str] = None
    description: Optional[str] = None
    suggestion: Optional[str] = None
    code_snippet: Optional[str] = None
    ai_explanation: Optional[str] = None
    status: str
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    ai_suggestion: Optional[str] = None
    # 数据流路径字段
    source: Optional[str] = None
    sink: Optional[str] = None
    dataflow_path: Optional[str] = None  # JSON string of DataFlowStep[]
    code_context: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class IssueUpdateSchema(BaseModel):
    status: Optional[str] = None


class PaginatedIssuesResponse(BaseModel):
    total: int
    items: List[AuditIssueSchema]
    skip: int
    limit: int

    class Config:
        from_attributes = True
    

class ProjectSchema(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    source_type: Optional[str] = None
    repository_url: Optional[str] = None
    repository_type: Optional[str] = None
    default_branch: Optional[str] = None
    programming_languages: Optional[str] = None
    owner_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditTaskSchema(BaseModel):
    id: str
    project_id: str
    task_type: str
    status: str
    branch_name: Optional[str] = None
    exclude_patterns: Optional[str] = None
    scan_config: Optional[str] = None
    total_files: int = 0
    scanned_files: int = 0
    total_lines: int = 0
    issues_count: int = 0
    quality_score: float = 0.0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    project: Optional[ProjectSchema] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[AuditTaskSchema])
async def list_tasks(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List tasks for current user's projects.
    """
    # 先获取当前用户的项目ID列表
    projects_result = await db.execute(
        select(Project.id).where(Project.owner_id == current_user.id)
    )
    user_project_ids = [p[0] for p in projects_result.fetchall()]

    query = (
        select(AuditTask)
        .options(
            selectinload(AuditTask.project),
            # code_analysis_results 是 JSON 列，单条记录可达数百 MB；
            # 列表接口不需要它（response schema 也未声明），必须 defer 避免每次刷新拉 GB 级数据。
            defer(AuditTask.code_analysis_results),
        )
    )
    # 只返回当前用户项目的任务
    query = query.where(AuditTask.project_id.in_(user_project_ids)) if user_project_ids else query.where(False)
    if project_id:
        query = query.where(AuditTask.project_id == project_id)
    query = query.order_by(AuditTask.created_at.desc())
    result = await db.execute(query)
    tasks = result.scalars().all()
    # 校正 stale 的 issues_count
    await _fix_stale_issues_count(db, tasks)
    return tasks


@router.get("/{id}", response_model=AuditTaskSchema)
async def read_task(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get task status by ID.
    """
    result = await db.execute(
        select(AuditTask)
        .options(
            selectinload(AuditTask.project),
            # 同 list_tasks：code_analysis_results 可达数百 MB，详情页通过
            # 专门的 /tasks/{id}/code-analysis 端点获取，read_task 不需要它。
            defer(AuditTask.code_analysis_results),
        )
        .where(AuditTask.id == id)
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 检查权限：只有任务创建者可以查看
    if task.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此任务")

    # 校正 stale 的 issues_count
    await _fix_stale_issues_count(db, [task])

    return task


@router.post("/{id}/cancel")
async def cancel_task(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Cancel a running task.
    """
    result = await db.execute(select(AuditTask).where(AuditTask.id == id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 检查权限：只有任务创建者可以取消
    if task.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权取消此任务")
    
    if task.status not in ["pending", "running", "scheduled"]:
        raise HTTPException(status_code=400, detail="只能取消待扫描、待处理或运行中的任务")

    # 如果是定时占位任务，同时停用关联的定时计划
    if task.status == "scheduled" and hasattr(task, "scheduled_scan_id") and task.scheduled_scan_id:
        from app.models.scheduled_scan import ScheduledScan
        schedule = await db.get(ScheduledScan, task.scheduled_scan_id)
        if schedule:
            schedule.is_active = False
    
    # 标记任务为取消
    task_control.cancel_task(id)
    
    # 更新数据库状态
    task.status = "cancelled"
    task.completed_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "任务已取消", "task_id": id}


@router.get("/{id}/issues", response_model=PaginatedIssuesResponse)
async def read_task_issues(
    id: str,
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=200, description="每页记录数"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get issues for a specific task (paginated).
    """
    # 先检查任务是否存在且属于当前用户
    task_result = await db.execute(
        select(AuditTask).where(AuditTask.id == id)
    )
    task = task_result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 检查权限：只有任务创建者可以查看问题
    if task.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此任务的问题")

    # 查询总数
    count_result = await db.execute(
        select(func.count(AuditIssue.id)).where(AuditIssue.task_id == id)
    )
    total = count_result.scalar() or 0

    # 分页查询
    result = await db.execute(
        select(AuditIssue)
        .where(AuditIssue.task_id == id)
        .order_by(
            AuditIssue.severity.desc(),
            AuditIssue.created_at.desc()
        )
        .offset(skip)
        .limit(limit)
    )
    items = result.scalars().all()

    # 显式转换为 Pydantic schema，避免 from_attributes 序列化失败
    # (Pydantic v2 在嵌套 dict 中无法自动转换 SQLAlchemy ORM 对象)
    schema_items = [AuditIssueSchema.model_validate(item) for item in items]

    return PaginatedIssuesResponse(
        total=total,
        items=schema_items,
        skip=skip,
        limit=limit,
    )


@router.get("/{task_id}/code-analysis")
async def get_code_analysis(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """获取快速审计任务的代码分析结果"""
    task = await db.get(AuditTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 检查权限
    project = await db.get(Project, task.project_id)
    if project and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此任务")

    return task.code_analysis_results or {
        "api_endpoints": [],
        "call_graph": [],
        "file_dependencies": [],
        "control_flow": [],
    }


@router.patch("/{task_id}/issues/{issue_id}", response_model=AuditIssueSchema)
async def update_issue(
    task_id: str,
    issue_id: str,
    issue_update: IssueUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update issue status (e.g., resolve, mark as false positive).
    """
    result = await db.execute(
        select(AuditIssue)
        .where(AuditIssue.id == issue_id, AuditIssue.task_id == task_id)
    )
    issue = result.scalars().first()
    if not issue:
        raise HTTPException(status_code=404, detail="问题不存在")
    
    if issue_update.status:
        if issue_update.status not in {"fixed", "not_fixed", "false_positive", "suspicious"}:
            raise HTTPException(status_code=400, detail="不支持的问题状态")
        issue.status = issue_update.status
        if issue_update.status == "fixed":
            issue.resolved_by = current_user.id
            issue.resolved_at = datetime.now(timezone.utc)
        else:
            issue.resolved_by = None
            issue.resolved_at = None
    
    await db.commit()
    await db.refresh(issue)
    return AuditIssueSchema.model_validate(issue)


# ============ AI排查相关端点 ============

async def _get_user_config(db: AsyncSession, user_id: str) -> Optional[dict]:
    """获取用户 LLM 配置"""
    if not user_id:
        return None
    try:
        from app.api.v1.endpoints.config import decrypt_config, SENSITIVE_LLM_FIELDS, SENSITIVE_OTHER_FIELDS
        result = await db.execute(select(UserConfig).where(UserConfig.user_id == user_id))
        config = result.scalar_one_or_none()
        if config and config.llm_config:
            user_llm_config = json.loads(config.llm_config) if config.llm_config else {}
            user_other_config = json.loads(config.other_config) if config.other_config else {}
            user_llm_config = decrypt_config(user_llm_config, SENSITIVE_LLM_FIELDS)
            user_other_config = decrypt_config(user_other_config, SENSITIVE_OTHER_FIELDS)
            return {"llmConfig": user_llm_config, "otherConfig": user_other_config}
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"获取用户配置失败: {e}")
    return None


@router.post("/{task_id}/issues/{issue_id}/ai-investigate")
async def ai_investigate_issue(
    task_id: str,
    issue_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    对单个 AuditIssue 进行 AI 排查
    """
    # 验证问题存在
    result = await db.execute(
        select(AuditIssue).where(AuditIssue.id == issue_id, AuditIssue.task_id == task_id)
    )
    issue = result.scalars().first()
    if not issue:
        raise HTTPException(status_code=404, detail="问题不存在")

    # 验证权限
    task = await db.get(AuditTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    project = await db.get(Project, task.project_id)
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    # 标记为排查中
    issue.ai_suggestion = json.dumps({
        "verdict": "analyzing",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }, ensure_ascii=False)
    await db.commit()

    # 获取用户配置
    user_config = await _get_user_config(db, current_user.id)

    # 启动后台任务
    background_tasks.add_task(
        execute_single_investigation,
        issue_id,
        "audit",
        user_config,
    )

    return {"message": "AI排查已启动", "issue_id": issue_id, "status": "analyzing"}


@router.post("/{task_id}/issues/ai-investigate-batch")
async def ai_investigate_batch(
    task_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    对任务下所有未排查的 AuditIssue 进行批量 AI 排查
    """
    # 验证任务和权限
    task = await db.get(AuditTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    project = await db.get(Project, task.project_id)
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    # 获取未排查的问题
    result = await db.execute(
        select(AuditIssue).where(
            AuditIssue.task_id == task_id,
            (AuditIssue.ai_suggestion == None) | (AuditIssue.ai_suggestion == "")
        )
    )
    issues = result.scalars().all()

    if not issues:
        return {"message": "没有需要排查的问题", "batch_id": None, "total": 0}

    # 标记所有为排查中
    for issue in issues:
        issue.ai_suggestion = json.dumps({
            "verdict": "analyzing",
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        }, ensure_ascii=False)
    await db.commit()

    batch_id = str(uuid.uuid4())[:8]
    issue_ids = [i.id for i in issues]
    issue_types = ["audit"] * len(issues)

    # 初始化进度
    set_batch_progress(batch_id, {
        "total": len(issues),
        "completed": 0,
        "current_issue": "",
        "status": "running",
    })

    user_config = await _get_user_config(db, current_user.id)

    background_tasks.add_task(
        execute_batch_investigation,
        batch_id,
        issue_ids,
        issue_types,
        user_config,
    )

    return {
        "message": "批量AI排查已启动",
        "batch_id": batch_id,
        "total": len(issues),
    }


@router.get("/{task_id}/issues/ai-investigate-batch/{batch_id}/status")
async def get_batch_status(
    task_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """查询批量 AI 排查进度"""
    progress = get_batch_progress(batch_id)
    if not progress:
        raise HTTPException(status_code=404, detail="批量排查任务不存在")
    return progress
async def export_task_report_pdf(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Export task audit report as PDF.
    """
    from fastapi.responses import Response
    from app.services.report_generator import ReportGenerator
    
    # 获取任务
    result = await db.execute(
        select(AuditTask)
        .options(selectinload(AuditTask.project))
        .where(AuditTask.id == id)
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 检查权限
    if task.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权导出此任务报告")
    
    # 获取问题列表
    issues_result = await db.execute(
        select(AuditIssue)
        .where(AuditIssue.task_id == id)
        .order_by(AuditIssue.severity.desc(), AuditIssue.created_at.desc())
    )
    issues = issues_result.scalars().all()
    
    # 转换为字典
    task_dict = {
        'id': task.id,
        'status': task.status,
        'branch_name': task.branch_name,
        'total_files': task.total_files,
        'scanned_files': task.scanned_files,
        'total_lines': task.total_lines,
        'issues_count': task.issues_count,
        'quality_score': task.quality_score,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'completed_at': task.completed_at.isoformat() if task.completed_at else None,
    }
    
    issues_list = [
        {
            'title': issue.title,
            'description': issue.description,
            'severity': issue.severity,
            'issue_type': issue.issue_type,
            'file_path': issue.file_path,
            'line_number': issue.line_number,
            'column_number': issue.column_number,
            'code_snippet': issue.code_snippet,
            'suggestion': issue.suggestion,
        }
        for issue in issues
    ]
    
    project_name = task.project.name if task.project else "Unknown Project"
    
    # 生成 PDF
    pdf_bytes = ReportGenerator.generate_task_report(task_dict, issues_list, project_name)
    
    # 返回 PDF 文件
    filename = f"audit-report-{task.id[:8]}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
