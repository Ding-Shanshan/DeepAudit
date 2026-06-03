from pathlib import Path

import pytest

from app.services.compiled_scan.analyzers.binary_analyzer import BinaryAnalyzer

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "compiled"


def _by_rule(findings):
    return {f.rule_id: f for f in findings}


def test_applies_to_elf_pe_so_dll_exe():
    a = BinaryAnalyzer()
    for ext in (".so", ".dll", ".exe", ".elf"):
        assert a.applies_to(Path(f"x{ext}"))
    assert not a.applies_to(Path("x.apk"))
    assert not a.applies_to(Path("x.txt"))


@pytest.mark.skipif(not (FIXTURES / "hello.elf").exists(), reason="fixture missing")
def test_elf_detects_strcpy():
    a = BinaryAnalyzer()
    findings = a.analyze(FIXTURES / "hello.elf", {})
    rules = {f.rule_id for f in findings}
    assert "compiled.binary.dangerous_func.strcpy" in rules


@pytest.mark.skipif(not (FIXTURES / "hello.exe").exists(), reason="fixture missing")
def test_pe_detects_system_import():
    a = BinaryAnalyzer()
    findings = a.analyze(FIXTURES / "hello.exe", {})
    rules = {f.rule_id for f in findings}
    assert "compiled.binary.dangerous_func.system" in rules


@pytest.mark.skipif(not (FIXTURES / "libssl-fake-1.0.0.so").exists(), reason="fixture missing")
def test_string_extraction_finds_openssl_string():
    a = BinaryAnalyzer()
    findings = a.analyze(FIXTURES / "libssl-fake-1.0.0.so", {})
    # No secret-pattern hit expected here, just ensure analyze() doesn't crash on a shared object.
    assert isinstance(findings, list)


def test_analyze_unparseable_file_produces_warning_not_exception(tmp_path: Path):
    junk = tmp_path / "junk.so"
    junk.write_bytes(b"not really an ELF")
    a = BinaryAnalyzer()
    findings = a.analyze(junk, {})
    # Must not raise, and must surface a warning finding.
    assert any(f.rule_id == "compiled.binary.parse_failed" for f in findings)


def test_secret_pattern_detects_api_key_in_strings(tmp_path: Path):
    # Forge an ELF-like file containing an AKIA string in raw bytes; analyzer should
    # still extract strings and match the secret regex even if ELF parsing fails.
    f = tmp_path / "fake.so"
    f.write_bytes(b"junk-AKIAIOSFODNN7EXAMPLE-tail")
    a = BinaryAnalyzer()
    findings = a.analyze(f, {})
    rules = {f.rule_id for f in findings}
    assert "compiled.binary.secret.aws_access_key" in rules
