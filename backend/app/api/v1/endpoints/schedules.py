import json
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.session import get_db
from app.models.project import Project
from app.models.scheduled_scan import ScheduledScan
from app.models.user import User

router = APIRouter()


class ScheduledScanBase(BaseModel):
    project_id: str
    name: str
    branch_name: Optional[str] = None
    interval_minutes: int = Field(default=60, ge=1, le=10080)
    exclude_patterns: List[str] = Field(default_factory=list)
    file_paths: List[str] = Field(default_factory=list)
    is_active: bool = True


class ScheduledScanCreate(ScheduledScanBase):
    pass


class ScheduledScanUpdate(BaseModel):
    name: Optional[str] = None
    branch_name: Optional[str] = None
    interval_minutes: Optional[int] = Field(default=None, ge=1, le=10080)
    exclude_patterns: Optional[List[str]] = None
    file_paths: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ScheduledScanResponse(ScheduledScanBase):
    id: str
    created_by: str
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


def _serialize_schedule(item: ScheduledScan) -> ScheduledScanResponse:
    return ScheduledScanResponse(
        id=item.id,
        project_id=item.project_id,
        name=item.name,
        branch_name=item.branch_name,
        interval_minutes=item.interval_minutes,
        exclude_patterns=[] if not item.exclude_patterns else json.loads(item.exclude_patterns),
        file_paths=[] if not item.file_paths else json.loads(item.file_paths),
        is_active=item.is_active,
        created_by=item.created_by,
        last_run_at=item.last_run_at,
        next_run_at=item.next_run_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=List[ScheduledScanResponse])
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    result = await db.execute(
        select(ScheduledScan)
        .where(ScheduledScan.created_by == current_user.id)
        .order_by(ScheduledScan.created_at.desc())
    )
    schedules = result.scalars().all()
    return [_serialize_schedule(item) for item in schedules]


@router.post("", response_model=ScheduledScanResponse)
async def create_schedule(
    payload: ScheduledScanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    project = await db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能为自己的项目创建计划")

    schedule = ScheduledScan(
        project_id=payload.project_id,
        created_by=current_user.id,
        name=payload.name,
        branch_name=payload.branch_name,
        interval_minutes=payload.interval_minutes,
        exclude_patterns=json.dumps(payload.exclude_patterns),
        file_paths=json.dumps(payload.file_paths),
        is_active=payload.is_active,
        next_run_at=datetime.now(timezone.utc) + timedelta(minutes=payload.interval_minutes),
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return _serialize_schedule(schedule)


@router.put("/{schedule_id}", response_model=ScheduledScanResponse)
async def update_schedule(
    schedule_id: str,
    payload: ScheduledScanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    schedule = await db.get(ScheduledScan, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="计划不存在")
    if schedule.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此计划")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in {"exclude_patterns", "file_paths"} and value is not None:
            setattr(schedule, field, json.dumps(value))
        else:
            setattr(schedule, field, value)

    if payload.interval_minutes:
        schedule.next_run_at = datetime.now(timezone.utc) + timedelta(minutes=payload.interval_minutes)

    await db.commit()
    await db.refresh(schedule)
    return _serialize_schedule(schedule)


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    schedule = await db.get(ScheduledScan, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="计划不存在")
    if schedule.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此计划")
    await db.delete(schedule)
    await db.commit()
    return {"message": "计划已删除"}
