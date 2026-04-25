"""
归档处理工具。
"""

from __future__ import annotations

import gzip
import os
import shutil
import subprocess
import tarfile
import zipfile
from pathlib import Path

import rarfile

from app.core.config import settings
from app.services.zip_storage import normalize_archive_extension


SUPPORTED_ARCHIVE_EXTENSIONS = {
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    ".tgz",
    ".tar.gz",
}


def is_supported_archive(filename: str) -> bool:
    return normalize_archive_extension(filename) in SUPPORTED_ARCHIVE_EXTENSIONS


def _ensure_safe_path(base_dir: Path, candidate: Path) -> None:
    base_resolved = base_dir.resolve()
    candidate_resolved = candidate.resolve()
    if not str(candidate_resolved).startswith(str(base_resolved)):
        raise ValueError(f"归档中存在越界路径: {candidate}")


def _extract_zip(archive_path: Path, destination: Path) -> None:
    with zipfile.ZipFile(archive_path, "r") as archive:
        for member in archive.infolist():
            target = destination / member.filename
            _ensure_safe_path(destination, target)
        archive.extractall(destination)


def _extract_tar(archive_path: Path, destination: Path) -> None:
    mode = "r:*"
    with tarfile.open(archive_path, mode) as archive:
        for member in archive.getmembers():
            target = destination / member.name
            _ensure_safe_path(destination, target)
        archive.extractall(destination)


def _extract_gzip(archive_path: Path, destination: Path) -> None:
    output_name = archive_path.name[: -len(archive_path.suffix)] or archive_path.stem
    target = destination / output_name
    _ensure_safe_path(destination, target)
    with gzip.open(archive_path, "rb") as src, open(target, "wb") as dst:
        shutil.copyfileobj(src, dst)


def _extract_rar(archive_path: Path, destination: Path) -> None:
    with rarfile.RarFile(archive_path) as archive:
        for member in archive.infolist():
            target = destination / member.filename
            _ensure_safe_path(destination, target)
        archive.extractall(destination)


def _extract_7z(archive_path: Path, destination: Path) -> None:
    subprocess.run(
        ["7z", "x", "-y", f"-o{destination}", str(archive_path)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def extract_archive(archive_path: str | Path, destination: str | Path) -> None:
    source = Path(archive_path)
    dest = Path(destination)
    dest.mkdir(parents=True, exist_ok=True)

    archive_ext = normalize_archive_extension(source.name)
    if archive_ext == ".zip":
        _extract_zip(source, dest)
    elif archive_ext in {".tar", ".tar.gz", ".tgz"}:
        _extract_tar(source, dest)
    elif archive_ext == ".gz":
        _extract_gzip(source, dest)
    elif archive_ext == ".rar":
        _extract_rar(source, dest)
    elif archive_ext == ".7z":
        _extract_7z(source, dest)
    else:
        raise ValueError(f"不支持的归档格式: {source.name}")


def extract_archive_recursive(
    archive_path: str | Path,
    destination: str | Path,
    max_depth: int | None = None,
) -> None:
    max_depth = max_depth if max_depth is not None else settings.MAX_ARCHIVE_DEPTH
    destination_path = Path(destination)
    extract_archive(archive_path, destination_path)

    for depth in range(max_depth):
        nested_archives = []
        for file_path in destination_path.rglob("*"):
            if file_path.is_file() and is_supported_archive(file_path.name):
                nested_archives.append(file_path)
        if not nested_archives:
            break

        for nested_archive in nested_archives:
            nested_destination = nested_archive.with_name(f"{nested_archive.stem}_contents")
            nested_destination.mkdir(parents=True, exist_ok=True)
            extract_archive(nested_archive, nested_destination)
            nested_archive.unlink(missing_ok=True)
    else:
        raise ValueError(f"归档嵌套层级超过限制: {max_depth}")
