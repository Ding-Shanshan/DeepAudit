from datetime import datetime, timezone

from app.api.v1.endpoints.schedules import _calculate_next_run_at
from app.schemas.user import UserCreate
from app.services.quick_scan import collect_source_files, run_pattern_scan, should_exclude


def test_user_create_full_name_is_optional():
    payload = UserCreate(username="alice", password="Admin@123456")

    assert payload.full_name is None


def test_collect_source_files_prunes_default_excluded_directories(tmp_path):
    source = tmp_path / "src"
    excluded = tmp_path / "node_modules" / "pkg"
    source.mkdir()
    excluded.mkdir(parents=True)
    (source / "main.py").write_text("password = 'admin123456'\n")
    (excluded / "index.js").write_text("const token = 'secret-token'\n")

    files = collect_source_files(tmp_path)

    assert [item["path"] for item in files] == ["src/main.py"]
    assert should_exclude("src/node_modules/pkg/index.js") is True


def test_pattern_scan_sets_line_counts_and_finds_secret(tmp_path):
    source = tmp_path / "main.py"
    source.write_text("print('ok')\napi_key = '1234567890'\n")
    files = collect_source_files(tmp_path)

    findings = run_pattern_scan(files)

    assert files[0]["line_count"] == 2
    assert any(finding["rule_id"] == "DA-SECRET-001" for finding in findings)


def test_schedule_next_run_moves_into_same_day_window():
    base = datetime(2026, 5, 18, 0, 0, tzinfo=timezone.utc)

    next_run = _calculate_next_run_at(base, 60, "10:00", "12:00", "Asia/Shanghai")

    assert next_run == datetime(2026, 5, 18, 2, 0, tzinfo=timezone.utc)


def test_schedule_next_run_supports_cross_midnight_window():
    base = datetime(2026, 5, 18, 11, 30, tzinfo=timezone.utc)

    next_run = _calculate_next_run_at(base, 60, "22:00", "02:00", "Asia/Shanghai")

    assert next_run == datetime(2026, 5, 18, 14, 0, tzinfo=timezone.utc)
