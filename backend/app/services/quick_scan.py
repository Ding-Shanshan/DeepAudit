"""
本地快速扫描引擎。
"""

from __future__ import annotations

import fnmatch
import json
import os
import re
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from app.core.config import settings


TEXT_EXTENSIONS = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".java": "java",
    ".kt": "kotlin",
    ".go": "go",
    ".php": "php",
    ".rb": "ruby",
    ".swift": "swift",
    ".m": "objective-c",
    ".mm": "objective-c",
    ".c": "cpp",
    ".h": "cpp",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".hh": "cpp",
    ".hxx": "cpp",
    ".cs": "csharp",
    ".rs": "rust",
    ".sh": "shell",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".sql": "sql",
    ".xml": "xml",
    ".gradle": "gradle",
    ".tf": "terraform",
    ".tfvars": "terraform",
}

SPECIAL_FILENAMES = {
    "dockerfile": "dockerfile",
}

DEFAULT_EXCLUDES = [
    "node_modules/**",
    "vendor/**",
    ".git/**",
    ".svn/**",
    ".hg/**",
    "dist/**",
    "build/**",
    "target/**",
    "__pycache__/**",
    "*.min.js",
    "*.map",
]

PATTERN_RULES = [
    {
        "rule_id": "DA-SQLI-001",
        "title": "可能存在 SQL 注入",
        "issue_type": "security",
        "severity": "high",
        "suggestion": "使用参数化查询或 ORM 安全接口，不要拼接不可信输入。",
        "languages": {"python", "java", "javascript", "typescript", "php", "go", "c", "cpp"},
        "patterns": [
            r"(execute(Query|Update)?|rawQuery|createQuery|prepareStatement)\s*\([^)]*(\+|%s|f\"|f'|\{)",
            r"SELECT\s+.+\s+(FROM|WHERE).*(\+|%s|\{)",
        ],
    },
    {
        "rule_id": "DA-XSS-001",
        "title": "可能存在 XSS 风险",
        "issue_type": "security",
        "severity": "high",
        "suggestion": "避免将不可信输入直接写入 HTML，统一进行输出编码或使用安全渲染组件。",
        "languages": {"javascript", "typescript", "php", "java", "python"},
        "patterns": [
            r"dangerouslySetInnerHTML",
            r"innerHTML\s*=",
            r"document\.write\s*\(",
            r"render_template_string\s*\(",
        ],
    },
    {
        "rule_id": "DA-SSRF-001",
        "title": "可能存在 SSRF 风险",
        "issue_type": "security",
        "severity": "high",
        "suggestion": "限制可访问的目标地址，校验协议、域名/IP，并使用服务端白名单。",
        "languages": {"python", "javascript", "typescript", "java", "go", "php", "swift", "objective-c"},
        "patterns": [
            r"(requests|httpx|axios|fetch|urlopen|RestTemplate|HttpURLConnection|NSURLSession|NSURLConnection).*(url|uri|endpoint|host)",
        ],
    },
    {
        "rule_id": "DA-CMDI-001",
        "title": "可能存在命令注入",
        "issue_type": "security",
        "severity": "critical",
        "suggestion": "避免把外部输入传给系统命令；必须执行时使用参数数组并做严格白名单校验。",
        "languages": {"python", "javascript", "typescript", "java", "php", "ruby", "go", "swift", "objective-c"},
        "patterns": [
            r"os\.system\s*\(",
            r"subprocess\.(run|Popen|call)\s*\(",
            r"Runtime\.getRuntime\(\)\.exec\s*\(",
            r"ProcessBuilder\s*\(",
            r"(exec|system|popen|shell_exec)\s*\(",
            r"NSTask\s*\(",
        ],
    },
    {
        "rule_id": "DA-PATH-001",
        "title": "可能存在路径遍历风险",
        "issue_type": "security",
        "severity": "high",
        "suggestion": "对文件路径做归一化和目录白名单校验，禁止直接使用用户传入路径访问文件系统。",
        "languages": {"python", "javascript", "typescript", "java", "php", "go", "ruby", "swift", "objective-c"},
        "patterns": [
            r"(\.\./|\.\.\\\\)",
            r"(open|FileInputStream|readFile|fopen|os\.Open|Files\.read).*(path|filename|file_path)",
        ],
    },
    {
        "rule_id": "DA-SECRET-001",
        "title": "可能存在硬编码密钥",
        "issue_type": "security",
        "severity": "high",
        "suggestion": "将密钥迁移到环境变量或密钥管理系统，不要硬编码在仓库中。",
        "languages": set(TEXT_EXTENSIONS.values()),
        "patterns": [
            r"(secret|api[_-]?key|token|access[_-]?key|password)\s*[:=]\s*[\"'][^\"']{8,}[\"']",
        ],
    },
    {
        "rule_id": "DA-CRYPTO-001",
        "title": "可能使用弱加密算法",
        "issue_type": "security",
        "severity": "medium",
        "suggestion": "避免使用 MD5、SHA1、DES、RC4 等弱算法，优先使用现代安全算法。",
        "languages": set(TEXT_EXTENSIONS.values()),
        "patterns": [
            r"\b(md5|sha1|des|rc4)\b",
        ],
    },
    {
        "rule_id": "DA-CPP-001",
        "title": "C/C++ 不安全字符串操作",
        "issue_type": "bug",
        "severity": "high",
        "suggestion": "避免使用 strcpy/gets/sprintf 等不安全函数，改用带边界检查的实现。",
        "languages": {"c", "cpp"},
        "patterns": [
            r"\b(strcpy|strcat|gets|sprintf|vsprintf|scanf)\s*\(",
        ],
    },
    {
        "rule_id": "DA-JAVA-RESOURCE-001",
        "title": "Java 资源对象可能未释放",
        "issue_type": "bug",
        "severity": "medium",
        "suggestion": "使用 try-with-resources 或 finally 块确保流、socket、数据库连接被正确关闭。",
        "languages": {"java"},
        "patterns": [
            r"new\s+(FileInputStream|FileOutputStream|BufferedReader|BufferedWriter|Socket|Connection)\s*\(",
        ],
    },
    {
        "rule_id": "DA-AUTH-001",
        "title": "可能存在权限绕过或未授权访问",
        "issue_type": "security",
        "severity": "high",
        "suggestion": "在敏感接口前补充服务端鉴权和角色校验，避免仅依赖前端或客户端参数。",
        "languages": {"python", "javascript", "typescript", "java", "php", "go", "swift", "objective-c"},
        "patterns": [
            r"(is_admin|isAdmin|role|permission).*(request|params|query|body)",
            r"(admin|role)\s*==\s*(request|getParameter|req\.query|req\.body|params)",
        ],
    },
]


def normalize_path(path: str | Path) -> str:
    return str(path).replace("\\", "/")


def is_text_file(path: str | Path) -> bool:
    path_obj = Path(path)
    if path_obj.name.lower() in SPECIAL_FILENAMES:
        return True
    return path_obj.suffix.lower() in TEXT_EXTENSIONS


def get_language_from_path(path: str | Path) -> str:
    path_obj = Path(path)
    if path_obj.name.lower() in SPECIAL_FILENAMES:
        return SPECIAL_FILENAMES[path_obj.name.lower()]
    return TEXT_EXTENSIONS.get(path_obj.suffix.lower(), "text")


def should_exclude(path: str | Path, exclude_patterns: list[str] | None = None) -> bool:
    normalized = normalize_path(path).lstrip("./")
    normalized_with_slashes = f"/{normalized.strip('/')}/"

    for raw_pattern in DEFAULT_EXCLUDES + (exclude_patterns or []):
        pattern = normalize_path(raw_pattern).strip().lstrip("./")
        if not pattern:
            continue

        if (
            fnmatch.fnmatch(normalized, pattern)
            or fnmatch.fnmatch(Path(normalized).name, pattern)
            or pattern in normalized
        ):
            return True

        directory_pattern = pattern
        if directory_pattern.endswith("/**"):
            directory_pattern = directory_pattern[:-3]
        directory_pattern = directory_pattern.rstrip("/")
        if directory_pattern and f"/{directory_pattern}/" in normalized_with_slashes:
            return True

    return False


def extract_code_snippet(file_path: str | Path, line_number: int, context: int = 2) -> str:
    try:
        lines = Path(file_path).read_text(errors="ignore").splitlines()
    except OSError:
        return ""

    if not lines:
        return ""

    start = max(0, line_number - 1 - context)
    end = min(len(lines), line_number + context)
    return "\n".join(lines[start:end])


def collect_source_files(
    workspace_dir: str | Path,
    exclude_patterns: list[str] | None = None,
    target_files: list[str] | None = None,
    max_file_size: int | None = None,
) -> list[dict[str, Any]]:
    workspace = Path(workspace_dir)
    target_set = {normalize_path(item) for item in (target_files or [])}
    max_size = max_file_size if max_file_size is not None else settings.MAX_FILE_SIZE_BYTES
    files = []

    def append_if_supported(file_path: Path, relative_path: str) -> None:
        if should_exclude(relative_path, exclude_patterns):
            return
        if target_set and relative_path not in target_set:
            return
        if not is_text_file(file_path):
            return

        try:
            stat = file_path.stat()
        except OSError:
            return
        if stat.st_size > max_size:
            return

        files.append(
            {
                "path": relative_path,
                "absolute_path": str(file_path),
                "language": get_language_from_path(file_path),
                "size": stat.st_size,
            }
        )

    if target_set:
        for relative_path in sorted(target_set):
            if Path(relative_path).is_absolute() or ".." in Path(relative_path).parts:
                continue
            append_if_supported(workspace / relative_path, relative_path)
        return sorted(files, key=lambda item: item["path"])

    for root, dirnames, filenames in os.walk(workspace):
        root_path = Path(root)
        relative_root = "" if root_path == workspace else normalize_path(root_path.relative_to(workspace))
        dirnames[:] = [
            dirname
            for dirname in dirnames
            if not should_exclude(
                f"{relative_root}/{dirname}" if relative_root else dirname,
                exclude_patterns,
            )
        ]

        for filename in filenames:
            file_path = root_path / filename
            relative_path = normalize_path(file_path.relative_to(workspace))
            append_if_supported(file_path, relative_path)

    return sorted(files, key=lambda item: item["path"])


def run_semgrep_scan(
    workspace_dir: str | Path,
    source_files: list[dict[str, Any]],
    exclude_patterns: list[str] | None = None,
    timeout_seconds: int = 120,
) -> list[dict[str, Any]]:
    if not shutil.which("semgrep"):
        return []

    rules_path = Path(__file__).resolve().parents[3] / "rules" / "semgrep" / "deepaudit-rules.yml"
    if not rules_path.exists():
        return []

    workspace = Path(workspace_dir)
    source_set = {item["path"] for item in source_files}
    command = [
        "semgrep",
        "scan",
        "--json",
        "--quiet",
        "--config",
        str(rules_path),
    ]

    for pattern in DEFAULT_EXCLUDES + (exclude_patterns or []):
        command.extend(["--exclude", pattern])

    if 0 < len(source_files) <= 200:
        command.extend(str(Path(item["absolute_path"])) for item in source_files)
    else:
        command.append(str(workspace))

    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return []
    if result.returncode not in {0, 1}:
        return []

    try:
        payload = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return []

    findings = []
    for item in payload.get("results", []):
        relative_path = normalize_path(item.get("path", ""))
        item_path = Path(relative_path)
        if item_path.is_absolute():
            try:
                relative_path = normalize_path(item_path.relative_to(workspace))
            except ValueError:
                continue
        if relative_path not in source_set:
            continue
        line_number = int(item.get("start", {}).get("line", 1))
        findings.append(
            {
                "tool": "semgrep",
                "rule_id": item.get("check_id", "semgrep"),
                "title": item.get("extra", {}).get("message", "Semgrep 检测结果"),
                "issue_type": "security",
                "severity": (item.get("extra", {}).get("severity") or "WARNING").lower().replace("error", "high").replace("warning", "medium").replace("info", "low"),
                "file_path": relative_path,
                "line_number": line_number,
                "column_number": item.get("start", {}).get("col"),
                "description": item.get("extra", {}).get("message", ""),
                "suggestion": "请结合上下文复核 Semgrep 结果并完成修复。",
                "code_snippet": item.get("extra", {}).get("lines") or extract_code_snippet(Path(workspace_dir) / relative_path, line_number),
            }
        )
    return findings


def _compiled_pattern_rules() -> list[dict[str, Any]]:
    compiled_rules = []
    for rule in PATTERN_RULES:
        compiled = rule.get("compiled_patterns")
        if compiled is None:
            compiled = [re.compile(pattern, re.IGNORECASE) for pattern in rule["patterns"]]
            rule["compiled_patterns"] = compiled
        compiled_rules.append({**rule, "compiled_patterns": compiled})
    return compiled_rules


def _scan_single_file_for_patterns(
    source_file: dict[str, Any],
    compiled_rules: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    path = Path(source_file["absolute_path"])
    try:
        lines = path.read_text(errors="ignore").splitlines()
    except OSError:
        source_file["line_count"] = 0
        return []

    source_file["line_count"] = len(lines)
    findings = []
    seen = set()

    for index, line in enumerate(lines, start=1):
        for rule in compiled_rules:
            if source_file["language"] not in rule["languages"]:
                continue
            for pattern in rule["compiled_patterns"]:
                if pattern.search(line):
                    key = (rule["rule_id"], source_file["path"], index)
                    if key in seen:
                        continue
                    seen.add(key)
                    findings.append(
                        {
                            "tool": "pattern",
                            "rule_id": rule["rule_id"],
                            "title": rule["title"],
                            "issue_type": rule["issue_type"],
                            "severity": rule["severity"],
                            "file_path": source_file["path"],
                            "line_number": index,
                            "column_number": None,
                            "description": f"命中规则 {rule['rule_id']}，请复核该行及上下文是否构成真实风险。",
                            "suggestion": rule["suggestion"],
                            "code_snippet": "\n".join(lines[max(0, index - 3): min(len(lines), index + 2)]),
                        }
                    )
                    break
    return findings


def run_pattern_scan(source_files: list[dict[str, Any]]) -> list[dict[str, Any]]:
    findings = []
    compiled_rules = _compiled_pattern_rules()
    max_workers = min(32, (os.cpu_count() or 4) + 4, max(1, len(source_files)))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(_scan_single_file_for_patterns, source_file, compiled_rules)
            for source_file in source_files
        ]
        for future in as_completed(futures):
            findings.extend(future.result())

    return findings


def deduplicate_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduplicated = []
    seen = set()
    for finding in findings:
        key = (
            finding.get("title"),
            finding.get("file_path"),
            finding.get("line_number"),
        )
        if key in seen:
            continue
        seen.add(key)
        deduplicated.append(finding)
    return deduplicated


def calculate_quality_score(total_files: int, findings_count: int) -> float:
    if total_files <= 0:
        return 100.0
    penalty = min(80.0, findings_count * 2.5)
    return max(20.0, round(100.0 - penalty, 1))
