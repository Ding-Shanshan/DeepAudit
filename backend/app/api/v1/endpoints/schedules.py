import json
from datetime import datetime, time, timedelta, timezone
from typing import Any, List, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

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

DEFAULT_SCHEDULE_TIMEZONE = "Asia/Shanghai"


def _parse_window_time(value: Optional[str]) -> Optional[time]:
    if not value:
        return None
    try:
        hour_text, minute_text = value.split(":", 1)
        hour = int(hour_text)
        minute = int(minute_text)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="扫描时间段格式必须为 HH:mm")
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise HTTPException(status_code=400, detail="扫描时间段必须在 00:00 到 23:59 之间")
    return time(hour=hour, minute=minute)


def _validate_time_window(start: Optional[str], end: Optional[str]) -> None:
    if bool(start) != bool(end):
        raise HTTPException(status_code=400, detail="扫描时间段需要同时设置开始和结束时间")
    _parse_window_time(start)
    _parse_window_time(end)


def _zoneinfo(tz_name: Optional[str]) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or DEFAULT_SCHEDULE_TIMEZONE)
    except ZoneInfoNotFoundError:
        raise HTTPException(status_code=400, detail="无效的时区配置")


def _is_within_time_window(
    moment: datetime,
    start: Optional[str],
    end: Optional[str],
    tz_name: Optional[str],
) -> bool:
    start_time = _parse_window_time(start)
    end_time = _parse_window_time(end)
    if not start_time or not end_time:
        return True

    local_time = moment.astimezone(_zoneinfo(tz_name)).time().replace(second=0, microsecond=0)
    if start_time <= end_time:
        return start_time <= local_time <= end_time
    return local_time >= start_time or local_time <= end_time


def _next_allowed_time(
    candidate: datetime,
    start: Optional[str],
    end: Optional[str],
    tz_name: Optional[str],
) -> datetime:
    start_time = _parse_window_time(start)
    end_time = _parse_window_time(end)
    if not start_time or not end_time or _is_within_time_window(candidate, start, end, tz_name):
        return candidate

    zone = _zoneinfo(tz_name)
    local = candidate.astimezone(zone)
    today_start = local.replace(
        hour=start_time.hour,
        minute=start_time.minute,
        second=0,
        microsecond=0,
    )

    if start_time <= end_time:
        next_local = today_start if local.time() < start_time else today_start + timedelta(days=1)
    else:
        next_local = today_start

    return next_local.astimezone(timezone.utc)


def _calculate_next_run_at(
    base: datetime,
    interval_minutes: int,
    start: Optional[str],
    end: Optional[str],
    tz_name: Optional[str],
) -> datetime:
    candidate = base + timedelta(minutes=max(1, interval_minutes))
    return _next_allowed_time(candidate, start, end, tz_name)


class ScheduledScanBase(BaseModel):
    project_id: str
    name: str
    branch_name: Optional[str] = None
    interval_minutes: int = Field(default=60, ge=1, le=10080)
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    timezone: str = DEFAULT_SCHEDULE_TIMEZONE
    rule_set_id: Optional[str] = None
    prompt_template_id: Optional[str] = None
    exclude_patterns: List[str] = Field(default_factory=list)
    file_paths: List[str] = Field(default_factory=list)
    is_active: bool = True


class ScheduledScanCreate(ScheduledScanBase):
    pass


class ScheduledScanUpdate(BaseModel):
    name: Optional[str] = None
    branch_name: Optional[str] = None
    interval_minutes: Optional[int] = Field(default=None, ge=1, le=10080)
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    timezone: Optional[str] = None
    rule_set_id: Optional[str] = None
    prompt_template_id: Optional[str] = None
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
        time_window_start=item.time_window_start,
        time_window_end=item.time_window_end,
        timezone=item.timezone or DEFAULT_SCHEDULE_TIMEZONE,
        rule_set_id=item.rule_set_id,
        prompt_template_id=item.prompt_template_id,
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
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    _validate_time_window(payload.time_window_start, payload.time_window_end)
    _zoneinfo(payload.timezone)

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
        time_window_start=payload.time_window_start,
        time_window_end=payload.time_window_end,
        timezone=payload.timezone,
        rule_set_id=payload.rule_set_id,
        prompt_template_id=payload.prompt_template_id,
        exclude_patterns=json.dumps(payload.exclude_patterns),
        file_paths=json.dumps(payload.file_paths),
        is_active=payload.is_active,
        next_run_at=_calculate_next_run_at(
            datetime.now(timezone.utc),
            payload.interval_minutes,
            payload.time_window_start,
            payload.time_window_end,
            payload.timezone,
        ),
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
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    schedule = await db.get(ScheduledScan, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="计划不存在")
    if schedule.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此计划")

    update_data = payload.model_dump(exclude_unset=True)
    next_start = update_data.get("time_window_start", schedule.time_window_start)
    next_end = update_data.get("time_window_end", schedule.time_window_end)
    next_timezone = update_data.get("timezone", schedule.timezone or DEFAULT_SCHEDULE_TIMEZONE)
    _validate_time_window(next_start, next_end)
    _zoneinfo(next_timezone)

    for field, value in update_data.items():
        if field in {"exclude_patterns", "file_paths"} and value is not None:
            setattr(schedule, field, json.dumps(value))
        else:
            setattr(schedule, field, value)

    recalc_fields = {
        "interval_minutes",
        "time_window_start",
        "time_window_end",
        "timezone",
        "is_active",
    }
    if recalc_fields.intersection(update_data) and schedule.is_active:
        schedule.next_run_at = _calculate_next_run_at(
            datetime.now(timezone.utc),
            schedule.interval_minutes,
            schedule.time_window_start,
            schedule.time_window_end,
            schedule.timezone,
        )

    await db.commit()
    await db.refresh(schedule)
    return _serialize_schedule(schedule)


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    schedule = await db.get(ScheduledScan, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="计划不存在")
    if schedule.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此计划")
    await db.delete(schedule)
    await db.commit()
    return {"message": "计划已删除"}
