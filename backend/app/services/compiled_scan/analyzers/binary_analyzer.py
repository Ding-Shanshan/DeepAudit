"""Analyzer for native binaries (ELF + PE)."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

from app.services.compiled_scan.analyzers.base import CompiledAnalyzer, Finding

_RULES_DIR = Path(__file__).resolve().parent.parent / "rules"
_PRINTABLE_RE = re.compile(rb"[\x20-\x7e]{6,}")     # ASCII strings of length >= 6
_MAX_STRINGS = 5000                                  # cap for huge binaries


def _load_yaml(name: str) -> list[dict]:
    with open(_RULES_DIR / name, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or []


class BinaryAnalyzer(CompiledAnalyzer):
    name = "compiled.binary"
    supported_extensions = {".so", ".dll", ".exe", ".elf"}

    def __init__(self) -> None:
        self._dangerous = _load_yaml("dangerous_functions.yml")
        self._secrets = [
            {**rule, "_compiled": re.compile(rule["pattern"])}
            for rule in _load_yaml("secret_patterns.yml")
        ]

    def applies_to(self, file_path: Path) -> bool:
        return file_path.suffix.lower() in self.supported_extensions

    def analyze(self, file_path: Path, options: dict[str, Any]) -> list[Finding]:
        rel = str(file_path)
        findings: list[Finding] = []

        # 1. Symbol extraction (format-specific). Failures fall through to string scan.
        symbols: set[str] = set()
        parse_failed = False
        try:
            if file_path.suffix.lower() in {".elf", ".so"}:
                symbols = self._elf_symbols(file_path)
            elif file_path.suffix.lower() in {".exe", ".dll"}:
                symbols = self._pe_symbols(file_path)
        except Exception as exc:   # noqa: BLE001 — analyzers must never raise
            parse_failed = True
            findings.append(
                Finding(
                    file_path=rel,
                    rule_id="compiled.binary.parse_failed",
                    severity="info",
                    title="二进制解析失败",
                    description=f"无法解析为 ELF/PE：{exc}",
                    tool=self.name,
                )
            )

        for rule in self._dangerous:
            if rule["symbol"] in symbols:
                findings.append(
                    Finding(
                        file_path=rel,
                        rule_id=f"compiled.binary.dangerous_func.{rule['symbol']}",
                        severity=rule["severity"],
                        title=rule["title"],
                        description=rule["description"],
                        suggestion=rule["suggestion"],
                        code_snippet=f"SYMBOL: {rule['symbol']}",
                        tool=self.name,
                    )
                )

        # 2. String extraction (works even if ELF/PE parsing failed).
        try:
            strings = self._extract_strings(file_path)
        except OSError:
            strings = []

        for rule in self._secrets:
            for s in strings:
                if rule["_compiled"].search(s):
                    findings.append(
                        Finding(
                            file_path=rel,
                            rule_id=f"compiled.binary.secret.{rule['name']}",
                            severity=rule["severity"],
                            title=rule["title"],
                            description=rule["description"],
                            suggestion=rule["suggestion"],
                            code_snippet=s[:120],
                            tool=self.name,
                        )
                    )
                    break   # one hit per rule per file is enough

        if parse_failed:
            # No symbol-based hits possible; string-based hits below are still useful.
            pass

        return findings

    # ----- helpers ---------------------------------------------------------

    def _elf_symbols(self, file_path: Path) -> set[str]:
        from elftools.elf.elffile import ELFFile
        from elftools.elf.sections import SymbolTableSection

        out: set[str] = set()
        with open(file_path, "rb") as fh:
            elf = ELFFile(fh)
            for section in elf.iter_sections():
                if not isinstance(section, SymbolTableSection):
                    continue
                for sym in section.iter_symbols():
                    name = sym.name
                    if name:
                        out.add(name)
        return out

    def _pe_symbols(self, file_path: Path) -> set[str]:
        import pefile

        out: set[str] = set()
        pe = pefile.PE(str(file_path), fast_load=True)
        try:
            pe.parse_data_directories(
                directories=[pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_IMPORT"]],
            )
            for entry in getattr(pe, "DIRECTORY_ENTRY_IMPORT", []) or []:
                for imp in entry.imports:
                    if imp.name:
                        try:
                            out.add(imp.name.decode("ascii", errors="ignore"))
                        except Exception:
                            continue
        finally:
            pe.close()
        return out

    def _extract_strings(self, file_path: Path) -> list[str]:
        with open(file_path, "rb") as fh:
            blob = fh.read()
        results: list[str] = []
        for i, m in enumerate(_PRINTABLE_RE.finditer(blob)):
            if i >= _MAX_STRINGS:
                break
            results.append(m.group(0).decode("ascii", errors="ignore"))
        return results
