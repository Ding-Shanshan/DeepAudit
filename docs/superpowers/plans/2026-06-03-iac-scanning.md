# IaC 扫描功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 DeepAudit 上新增最小可用的 IaC（基础设施即代码）静态扫描能力，覆盖 Dockerfile / docker-compose / GitHub Actions 三类文件，共 10 条规则。

**Architecture:** 完全复用现有 Semgrep 扫描器、`AuditTask`、`AuditIssue` 与规则集模型。后端新增一份 IaC 专用 Semgrep 规则文件 + 一个 `iac_scan` 任务类型分支；规则集以 `rule_type="iac"` 预置 3 个（容器镜像类 / 编排部署类 / CI/CD 类）。前端：顶部「审计任务 ▾」加 `IaC扫描` 入口；「审计规则 → 静态规则」`RULE_TYPES` 新增 `IaC规则` 类型。

**Tech Stack:** Python 3.11 + FastAPI + SQLAlchemy (async)；React 18 + TypeScript + shadcn/ui；Semgrep CLI。

**Spec:** `docs/superpowers/specs/2026-06-03-iac-scanning-design.md`

---

## 文件结构

**新建：**
- `rules/semgrep/iac-rules.yml` — IaC Semgrep 规则集（10 条规则）
- `backend/tests/iac/fixtures/` — 每条规则的正反样本
- `backend/tests/iac/test_iac_scan.py` — IaC 扫描集成测试
- `frontend/src/components/audit/CreateIacTaskDialog.tsx` — IaC 任务创建对话框

**修改：**
- `backend/app/services/quick_scan.py` — `run_semgrep_scan` 支持 `rules_file` 参数（不破坏现有调用）
- `backend/app/services/scanner.py` — 新增 `scan_iac_task` 入口
- `backend/app/services/init_templates.py` — 追加 3 个 IaC 规则集到 `SYSTEM_RULE_SETS`
- `backend/app/api/v1/endpoints/projects.py` — 启动扫描接口支持 `task_type=iac_scan`
- `frontend/src/components/layout/Sidebar.tsx` — `auditSubItems` 加 IaC 扫描
- `frontend/src/pages/AuditTasks.tsx` — `TaskTab` 增加 `iac`，新增 IaC 列表与创建按钮
- `frontend/src/pages/AuditRules.tsx` — `RULE_TYPES` / `CATEGORY_ABBREV` 加 `iac`
- `frontend/src/pages/TaskDetail.tsx` — Issue 列表渲染紫色 `IaC` Tag

---

## Task 1: 编写 IaC Semgrep 规则文件

**Files:**
- Create: `rules/semgrep/iac-rules.yml`

- [ ] **Step 1: 创建 IaC 规则文件**

完整内容写入 `rules/semgrep/iac-rules.yml`：

```yaml
rules:
  # ============ 容器镜像类 (4 条) ============
  - id: IAC-CTR-001
    message: "Dockerfile 未指定非 root USER，容器将以 root 运行"
    severity: WARNING
    languages: [generic]
    paths:
      include: ["Dockerfile", "*.dockerfile", "Dockerfile.*"]
    patterns:
      - pattern-either:
          - pattern: USER root
          - pattern: USER 0
    metadata:
      category: iac
      iac_target: dockerfile
      rule_code: IAC-CTR-001

  - id: IAC-CTR-002
    message: "镜像使用 :latest 标签，不利于复现"
    severity: WARNING
    languages: [generic]
    paths:
      include: ["Dockerfile", "*.dockerfile", "Dockerfile.*"]
    pattern-regex: '^FROM\s+\S+:latest(\s|$)'
    metadata:
      category: iac
      iac_target: dockerfile
      rule_code: IAC-CTR-002

  - id: IAC-CTR-003
    message: "Dockerfile 使用 ADD 抓取远程 URL，建议改用 RUN curl + 校验"
    severity: WARNING
    languages: [generic]
    paths:
      include: ["Dockerfile", "*.dockerfile", "Dockerfile.*"]
    pattern-regex: '^ADD\s+https?://'
    metadata:
      category: iac
      iac_target: dockerfile
      rule_code: IAC-CTR-003

  - id: IAC-CTR-004
    message: "Dockerfile 出现 'curl ... | sh' 模式，远程脚本执行风险"
    severity: ERROR
    languages: [generic]
    paths:
      include: ["Dockerfile", "*.dockerfile", "Dockerfile.*"]
    pattern-regex: '(curl|wget)[^\n]*\|\s*(sh|bash)'
    metadata:
      category: iac
      iac_target: dockerfile
      rule_code: IAC-CTR-004

  # ============ 编排部署类 (3 条) ============
  - id: IAC-ORC-001
    message: "容器以 privileged: true 运行，等同于 root 主机权限"
    severity: ERROR
    languages: [yaml]
    paths:
      include: ["docker-compose*.yml", "docker-compose*.yaml", "compose.yml", "compose.yaml"]
    pattern: "privileged: true"
    metadata:
      category: iac
      iac_target: compose
      rule_code: IAC-ORC-001

  - id: IAC-ORC-002
    message: "服务使用 network_mode: host，破坏容器网络隔离"
    severity: WARNING
    languages: [yaml]
    paths:
      include: ["docker-compose*.yml", "docker-compose*.yaml", "compose.yml", "compose.yaml"]
    pattern-regex: 'network_mode:\s*["'"'"']?host["'"'"']?'
    metadata:
      category: iac
      iac_target: compose
      rule_code: IAC-ORC-002

  - id: IAC-ORC-003
    message: "容器挂载 /var/run/docker.sock，等同于授予宿主机 root"
    severity: ERROR
    languages: [yaml]
    paths:
      include: ["docker-compose*.yml", "docker-compose*.yaml", "compose.yml", "compose.yaml"]
    pattern-regex: '/var/run/docker\.sock'
    metadata:
      category: iac
      iac_target: compose
      rule_code: IAC-ORC-003

  # ============ CI/CD 类 (3 条) ============
  - id: IAC-CI-001
    message: "pull_request_target 触发器存在权限提升风险，避免直接 checkout PR 头"
    severity: ERROR
    languages: [yaml]
    paths:
      include: [".github/workflows/*.yml", ".github/workflows/*.yaml"]
    pattern: "pull_request_target"
    metadata:
      category: iac
      iac_target: github_actions
      rule_code: IAC-CI-001

  - id: IAC-CI-002
    message: "GitHub Action 未固定 commit SHA，存在供应链篡改风险"
    severity: WARNING
    languages: [yaml]
    paths:
      include: [".github/workflows/*.yml", ".github/workflows/*.yaml"]
    pattern-regex: 'uses:\s+[\w\-]+/[\w\-]+@(v\d+(\.\d+)*|main|master|latest|\w{1,39})$'
    metadata:
      category: iac
      iac_target: github_actions
      rule_code: IAC-CI-002

  - id: IAC-CI-003
    message: "secrets 直接出现在 run 脚本里，可能被日志/进程列表泄漏，建议改用 env 注入"
    severity: ERROR
    languages: [yaml]
    paths:
      include: [".github/workflows/*.yml", ".github/workflows/*.yaml"]
    patterns:
      - pattern-regex: 'run:[^\n]*\$\{\{\s*secrets\.'
    metadata:
      category: iac
      iac_target: github_actions
      rule_code: IAC-CI-003
```

- [ ] **Step 2: 验证规则文件语法**

Run: `semgrep --validate --config rules/semgrep/iac-rules.yml`
Expected: 输出 `Configuration is valid`（或等价提示），返回码 0。

- [ ] **Step 3: 提交**

```bash
git add rules/semgrep/iac-rules.yml
git commit -m "feat(iac): add semgrep ruleset for Dockerfile/compose/github-actions

10 rules across 3 categories: container image, orchestration, CI/CD."
```

---

## Task 2: 添加测试 fixtures + 集成测试

**Files:**
- Create: `backend/tests/iac/__init__.py`
- Create: `backend/tests/iac/fixtures/Dockerfile.bad`
- Create: `backend/tests/iac/fixtures/Dockerfile.good`
- Create: `backend/tests/iac/fixtures/docker-compose.bad.yml`
- Create: `backend/tests/iac/fixtures/docker-compose.good.yml`
- Create: `backend/tests/iac/fixtures/.github/workflows/bad.yml`
- Create: `backend/tests/iac/fixtures/.github/workflows/good.yml`
- Create: `backend/tests/iac/test_iac_scan.py`

- [ ] **Step 1: 创建 Dockerfile 正反样本**

`backend/tests/iac/fixtures/Dockerfile.bad`：

```dockerfile
FROM ubuntu:latest
ADD https://example.com/install.sh /tmp/install.sh
RUN curl https://get.docker.com | sh
USER root
CMD ["/bin/bash"]
```

`backend/tests/iac/fixtures/Dockerfile.good`：

```dockerfile
FROM ubuntu:22.04
COPY install.sh /tmp/install.sh
RUN sha256sum -c install.sh.sha256 && bash /tmp/install.sh
USER appuser
CMD ["/bin/bash"]
```

- [ ] **Step 2: 创建 docker-compose 正反样本**

`backend/tests/iac/fixtures/docker-compose.bad.yml`：

```yaml
version: "3"
services:
  app:
    image: nginx
    privileged: true
    network_mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

`backend/tests/iac/fixtures/docker-compose.good.yml`：

```yaml
version: "3"
services:
  app:
    image: nginx:1.25
    ports:
      - "8080:80"
    volumes:
      - ./data:/usr/share/nginx/html
```

- [ ] **Step 3: 创建 GitHub Actions 正反样本**

`backend/tests/iac/fixtures/.github/workflows/bad.yml`：

```yaml
name: bad
on:
  pull_request_target:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: deploy
        run: echo "${{ secrets.DEPLOY_KEY }}" > /tmp/k
```

`backend/tests/iac/fixtures/.github/workflows/good.yml`：

```yaml
name: good
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab
      - name: deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: echo "$DEPLOY_KEY" > /tmp/k
```

- [ ] **Step 4: 创建测试文件**

`backend/tests/iac/__init__.py`：留空。

`backend/tests/iac/test_iac_scan.py`：

```python
"""IaC Semgrep 规则集成测试 - 验证规则触发与未误报。"""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
RULES_PATH = REPO_ROOT / "rules" / "semgrep" / "iac-rules.yml"
FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def semgrep_findings() -> dict:
    """对 fixtures 目录跑一次 IaC 规则集，返回 rule_id -> [file_path, ...]。"""
    if not shutil.which("semgrep"):
        pytest.skip("semgrep CLI 未安装")
    result = subprocess.run(
        ["semgrep", "scan", "--json", "--quiet", "--config", str(RULES_PATH), str(FIXTURES)],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert result.returncode in (0, 1), result.stderr
    payload = json.loads(result.stdout or "{}")
    findings = {}
    for item in payload.get("results", []):
        findings.setdefault(item["check_id"], []).append(item["path"])
    return findings


EXPECTED_BAD_HITS = [
    ("IAC-CTR-001", "Dockerfile.bad"),
    ("IAC-CTR-002", "Dockerfile.bad"),
    ("IAC-CTR-003", "Dockerfile.bad"),
    ("IAC-CTR-004", "Dockerfile.bad"),
    ("IAC-ORC-001", "docker-compose.bad.yml"),
    ("IAC-ORC-002", "docker-compose.bad.yml"),
    ("IAC-ORC-003", "docker-compose.bad.yml"),
    ("IAC-CI-001", "bad.yml"),
    ("IAC-CI-002", "bad.yml"),
    ("IAC-CI-003", "bad.yml"),
]


@pytest.mark.parametrize("rule_id,filename", EXPECTED_BAD_HITS)
def test_bad_fixture_triggers_rule(semgrep_findings, rule_id, filename):
    hits = semgrep_findings.get(rule_id, [])
    assert any(filename in p for p in hits), f"{rule_id} 未在 {filename} 中触发，命中={hits}"


GOOD_FILES = ["Dockerfile.good", "docker-compose.good.yml", "good.yml"]


def test_good_fixtures_do_not_trigger(semgrep_findings):
    for rule_id, hits in semgrep_findings.items():
        for path in hits:
            for good in GOOD_FILES:
                assert good not in path, f"规则 {rule_id} 在 good 样本 {path} 误报"
```

- [ ] **Step 5: 运行测试，确认全部通过**

Run: `cd backend && pytest tests/iac/test_iac_scan.py -v`
Expected: 11 tests pass (10 bad fixture triggers + 1 good fixtures clean)。如有失败，回到 Task 1 调整对应规则正则。

- [ ] **Step 6: 提交**

```bash
git add backend/tests/iac/
git commit -m "test(iac): add fixtures and integration tests for 10 iac rules"
```

---

## Task 3: 改造 run_semgrep_scan 支持自定义规则文件

**Files:**
- Modify: `backend/app/services/quick_scan.py:763-810` (函数 `run_semgrep_scan`)

- [ ] **Step 1: 给 run_semgrep_scan 增加 rules_file 参数**

将函数签名与规则路径解析改为：

```python
def run_semgrep_scan(
    workspace_dir: str | Path,
    source_files: list[dict[str, Any]],
    exclude_patterns: list[str] | None = None,
    timeout_seconds: int = 120,
    rules_file: str | Path | None = None,
) -> list[dict[str, Any]]:
    if not shutil.which("semgrep"):
        return []

    if rules_file is not None:
        rules_path = Path(rules_file)
    else:
        rules_path = Path(__file__).resolve().parents[3] / "rules" / "semgrep" / "deepaudit-rules.yml"
    if not rules_path.exists():
        return []
```

其余正文保持不变（仍然 `--config str(rules_path)`）。

- [ ] **Step 2: 验证未破坏现有调用**

Run: `cd backend && python -c "from app.services.quick_scan import run_semgrep_scan; import inspect; print(inspect.signature(run_semgrep_scan))"`
Expected: 打印新签名，含 `rules_file=None` 默认参数。所有现有调用站点（不传 `rules_file`）行为不变。

- [ ] **Step 3: 提交**

```bash
git add backend/app/services/quick_scan.py
git commit -m "refactor(scan): allow run_semgrep_scan to accept custom rules file"
```

---

## Task 4: 新增 scan_iac_task 入口

**Files:**
- Modify: `backend/app/services/scanner.py` (在文件末尾新增函数)

- [ ] **Step 1: 阅读 scan_repo_task 现有结构**

Run: `sed -n '526,560p' backend/app/services/scanner.py`
目的：了解克隆/解压/状态更新模式，新函数将复用其骨架。

- [ ] **Step 2: 在 scanner.py 末尾新增 scan_iac_task 函数**

追加以下内容（依赖现有 import：`AuditTask` / `AuditIssue` / `AsyncSession` / `select` / `Path` / `uuid` 等已在文件顶部，无需新增）：

```python
# ============ IaC 扫描入口 ============

IAC_FILE_GLOBS = [
    "**/Dockerfile",
    "**/Dockerfile.*",
    "**/*.dockerfile",
    "**/docker-compose*.yml",
    "**/docker-compose*.yaml",
    "**/compose.yml",
    "**/compose.yaml",
    "**/.github/workflows/*.yml",
    "**/.github/workflows/*.yaml",
]


def _collect_iac_files(workspace: Path) -> list[dict[str, Any]]:
    """收集 IaC 文件，返回 run_semgrep_scan 所需 source_files 结构。"""
    seen: set[Path] = set()
    files: list[dict[str, Any]] = []
    for pattern in IAC_FILE_GLOBS:
        for abs_path in workspace.glob(pattern):
            if not abs_path.is_file() or abs_path in seen:
                continue
            seen.add(abs_path)
            rel = abs_path.relative_to(workspace).as_posix()
            files.append({
                "path": rel,
                "absolute_path": str(abs_path),
                "language": "yaml" if abs_path.suffix in {".yml", ".yaml"} else "generic",
            })
    return files


async def scan_iac_task(task_id: str, db_session_factory, user_config: dict | None = None):
    """IaC 扫描任务入口：克隆仓库 → 收集 IaC 文件 → 跑 IaC Semgrep 规则 → 落 Issue。"""
    from datetime import datetime, timezone
    from app.services.quick_scan import run_semgrep_scan

    iac_rules_path = Path(__file__).resolve().parents[3] / "rules" / "semgrep" / "iac-rules.yml"

    async with db_session_factory() as db:
        task = await db.get(AuditTask, task_id)
        if not task:
            print(f"❌ IaC 任务 {task_id} 不存在")
            return
        task.status = "running"
        task.started_at = datetime.now(timezone.utc)
        await db.commit()

    workspace_dir: Optional[Path] = None
    try:
        # 复用 scan_repo_task 的仓库准备逻辑
        async with db_session_factory() as db:
            task = await db.get(AuditTask, task_id)
            project = await db.get(Project, task.project_id)

        workspace_dir = Path(tempfile.mkdtemp(prefix="iac_scan_"))
        await clone_repository(project, workspace_dir, task.branch_name)

        # 收集 IaC 文件
        iac_files = _collect_iac_files(workspace_dir)
        print(f"📦 IaC 扫描发现 {len(iac_files)} 个文件")

        # 调用 Semgrep
        findings = []
        if iac_files:
            findings = run_semgrep_scan(
                workspace_dir=workspace_dir,
                source_files=iac_files,
                rules_file=iac_rules_path,
            )

        # 写入 Issue
        async with db_session_factory() as db:
            task = await db.get(AuditTask, task_id)
            for f in findings:
                issue = AuditIssue(
                    task_id=task.id,
                    file_path=f["file_path"],
                    line_number=f.get("line_number"),
                    column_number=f.get("column_number"),
                    issue_type="iac",  # category 字段在 AuditIssue 中名为 issue_type
                    severity=f.get("severity", "medium"),
                    title=f.get("title"),
                    message=f.get("title"),
                    description=f.get("description"),
                    suggestion=f.get("suggestion"),
                    code_snippet=f.get("code_snippet"),
                )
                db.add(issue)
            task.total_files = len(iac_files)
            task.scanned_files = len(iac_files)
            task.issues_count = len(findings)
            task.status = "completed"
            task.completed_at = datetime.now(timezone.utc)
            await db.commit()
        print(f"✅ IaC 任务 {task_id} 完成，共 {len(findings)} 条 issue")

    except Exception as exc:
        print(f"❌ IaC 任务 {task_id} 失败: {exc}")
        async with db_session_factory() as db:
            task = await db.get(AuditTask, task_id)
            if task:
                task.status = "failed"
                task.completed_at = datetime.now(timezone.utc)
                await db.commit()
    finally:
        if workspace_dir and workspace_dir.exists():
            shutil.rmtree(workspace_dir, ignore_errors=True)
```

> **注意：** 若 `scan_repo_task` 中克隆逻辑不是封装为独立 `clone_repository` 函数，则将其内联到本函数（复制对应代码片段），不要因为追求复用而改动 `scan_repo_task`。先 grep 确认：`grep -n "def clone_repository\|async def clone_repository" backend/app/services/scanner.py`。如果不存在该函数，把上方 `await clone_repository(...)` 一行替换为 `scan_repo_task` 中的实际克隆代码段。

- [ ] **Step 3: 语法 + import 自检**

Run: `cd backend && python -c "from app.services.scanner import scan_iac_task, _collect_iac_files; print('ok')"`
Expected: 输出 `ok`，无 ImportError。

- [ ] **Step 4: 单元测试 _collect_iac_files**

新建 `backend/tests/iac/test_collect.py`：

```python
from pathlib import Path
import shutil
import tempfile

from app.services.scanner import _collect_iac_files


def test_collect_iac_files_finds_all_three_types():
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "Dockerfile").write_text("FROM alpine\n")
        (tmp / "docker-compose.yml").write_text("services: {}\n")
        wf = tmp / ".github" / "workflows"
        wf.mkdir(parents=True)
        (wf / "ci.yml").write_text("name: ci\n")
        (tmp / "README.md").write_text("ignored\n")

        files = _collect_iac_files(tmp)
        paths = sorted(f["path"] for f in files)
        assert paths == [".github/workflows/ci.yml", "Dockerfile", "docker-compose.yml"]
    finally:
        shutil.rmtree(tmp)
```

Run: `cd backend && pytest tests/iac/test_collect.py -v`
Expected: 1 passed。

- [ ] **Step 5: 提交**

```bash
git add backend/app/services/scanner.py backend/tests/iac/test_collect.py
git commit -m "feat(scan): add scan_iac_task entrypoint for IaC scanning"
```

---

