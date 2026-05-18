"""
定时扫描调度器。
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select

from app.core.encryption import decrypt_sensitive_data
from app.db.session import AsyncSessionLocal
from app.models.audit import AuditTask
from app.models.project import Project
from app.models.scheduled_scan import ScheduledScan
from app.models.user_config import UserConfig
from app.services.scanner import scan_repo_task
from app.services.zip_storage import load_project_zip

logger = logging.getLogger(__name__)

DEFAULT_SCHEDULE_TIMEZONE = "Asia/Shanghai"

SENSITIVE_LLM_FIELDS = [
    "llmApiKey",
    "geminiApiKey",
    "openaiApiKey",
    "claudeApiKey",
    "qwenApiKey",
    "deepseekApiKey",
    "zhipuApiKey",
    "moonshotApiKey",
    "baiduApiKey",
    "minimaxApiKey",
    "doubaoApiKey",
]
SENSITIVE_OTHER_FIELDS = [
    "githubToken",
    "gitlabToken",
    "giteaToken",
    "sshPrivateKey",
    "svnUsername",
    "svnPassword",
]


def _decrypt_config(config: dict, sensitive_fields: list[str]) -> dict:
    decrypted = config.copy()
    for field in sensitive_fields:
        if field in decrypted and decrypted[field]:
            decrypted[field] = decrypt_sensitive_data(decrypted[field])
    return decrypted


async def _load_user_config(user_id: str) -> dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(UserConfig).where(UserConfig.user_id == user_id))
        config = result.scalar_one_or_none()
        if not config:
            return {}
        return {
            "llmConfig": _decrypt_config(json.loads(config.llm_config or "{}"), SENSITIVE_LLM_FIELDS),
            "otherConfig": _decrypt_config(json.loads(config.other_config or "{}"), SENSITIVE_OTHER_FIELDS),
        }


def _parse_window_time(value: str | None) -> time | None:
    if not value:
        return None
    try:
        hour_text, minute_text = value.split(":", 1)
        hour = int(hour_text)
        minute = int(minute_text)
    except (TypeError, ValueError):
        return None
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return time(hour=hour, minute=minute)


def _zoneinfo(tz_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or DEFAULT_SCHEDULE_TIMEZONE)
    except ZoneInfoNotFoundError:
        logger.warning("无效的定时扫描时区 %s，已回退到 %s", tz_name, DEFAULT_SCHEDULE_TIMEZONE)
        return ZoneInfo(DEFAULT_SCHEDULE_TIMEZONE)


def _is_within_time_window(schedule: ScheduledScan, moment: datetime) -> bool:
    start_time = _parse_window_time(getattr(schedule, "time_window_start", None))
    end_time = _parse_window_time(getattr(schedule, "time_window_end", None))
    if not start_time or not end_time:
        return True

    local_time = moment.astimezone(_zoneinfo(getattr(schedule, "timezone", None))).time().replace(second=0, microsecond=0)
    if start_time <= end_time:
        return start_time <= local_time <= end_time
    return local_time >= start_time or local_time <= end_time


def _next_allowed_time(schedule: ScheduledScan, candidate: datetime) -> datetime:
    start_time = _parse_window_time(getattr(schedule, "time_window_start", None))
    end_time = _parse_window_time(getattr(schedule, "time_window_end", None))
    if not start_time or not end_time or _is_within_time_window(schedule, candidate):
        return candidate

    zone = _zoneinfo(getattr(schedule, "timezone", None))
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


def _calculate_next_run_at(schedule: ScheduledScan, base: datetime) -> datetime:
    candidate = base + timedelta(minutes=max(1, schedule.interval_minutes))
    return _next_allowed_time(schedule, candidate)


class ScheduledScanRunner:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._stopping = False

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._stopping = False
        self._task = asyncio.create_task(self._run_loop(), name="scheduled-scan-runner")
        logger.info("定时扫描调度器已启动")

    async def stop(self) -> None:
        self._stopping = True
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("定时扫描调度器已停止")

    async def _run_loop(self) -> None:
        while not self._stopping:
            try:
                await self.run_once()
            except Exception as exc:
                logger.warning("定时扫描执行失败: %s", exc)
            await asyncio.sleep(30)

    async def run_once(self) -> None:
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ScheduledScan).where(
                    ScheduledScan.is_active == True,
                    ScheduledScan.next_run_at.is_not(None),
                    ScheduledScan.next_run_at <= now,
                )
            )
            schedules = result.scalars().all()
            for schedule in schedules:
                project = await db.get(Project, schedule.project_id)
                if not project or not project.is_active:
                    schedule.is_active = False
                    continue

                if not _is_within_time_window(schedule, now):
                    schedule.next_run_at = _next_allowed_time(schedule, now)
                    continue

                task = AuditTask(
                    project_id=project.id,
                    created_by=schedule.created_by,
                    task_type="scheduled_scan",
                    status="pending",
                    branch_name=schedule.branch_name or project.default_branch or "main",
                    exclude_patterns=schedule.exclude_patterns or "[]",
                    scan_config=json.dumps(
                        {
                            "file_paths": json.loads(schedule.file_paths or "[]"),
                            "exclude_patterns": json.loads(schedule.exclude_patterns or "[]"),
                            "scheduled_scan_id": schedule.id,
                            "rule_set_id": schedule.rule_set_id,
                            "prompt_template_id": schedule.prompt_template_id,
                        }
                    ),
                )
                db.add(task)
                await db.flush()

                user_config = await _load_user_config(schedule.created_by)
                user_config["scan_config"] = {
                    "file_paths": json.loads(schedule.file_paths or "[]"),
                    "exclude_patterns": json.loads(schedule.exclude_patterns or "[]"),
                    "rule_set_id": schedule.rule_set_id,
                    "prompt_template_id": schedule.prompt_template_id,
                }

                if project.source_type == "zip":
                    archive_path = await load_project_zip(project.id)
                    if archive_path:
                        from app.api.v1.endpoints.scan import process_zip_task

                        asyncio.create_task(
                            process_zip_task(task.id, archive_path, AsyncSessionLocal, user_config)
                        )
                else:
                    asyncio.create_task(scan_repo_task(task.id, AsyncSessionLocal, user_config))

                schedule.last_run_at = now
                schedule.next_run_at = _calculate_next_run_at(schedule, now)

            await db.commit()


scheduled_scan_runner = ScheduledScanRunner()
