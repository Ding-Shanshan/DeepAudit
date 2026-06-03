"""代码分析服务

提供统一的代码分析入口，整合:
- API 接口资产提取
- 函数调用图分析
- 文件包含/依赖关系
- 控制流图生成
"""

import os
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import dataclass, field

from .parser import TreeSitterParser
from .extractors import (
    FileDependencyExtractor,
    APIEndpointExtractor,
    CallGraphExtractor,
    ControlFlowExtractor,
    ImportInfo,
    APIEndpointInfo,
    CallEdgeInfo,
    ControlFlowResult,
)

logger = logging.getLogger(__name__)


@dataclass
class APIEndpoint:
    """API 端点信息"""
    file_path: str
    line_number: int
    method: str  # GET, POST, PUT, DELETE, etc.
    path: str  # URL path pattern
    handler: Optional[str] = None  # Handler function name
    framework: Optional[str] = None  # Framework name (spring, express, etc.)
    parameters: List[Dict[str, str]] = field(default_factory=list)
    annotations: List[str] = field(default_factory=list)
    source_code: Optional[str] = None


@dataclass
class CallEdge:
    """函数调用边"""
    caller_file: str
    caller_function: str
    caller_line: int
    callee_file: Optional[str]  # 可能为空(外部调用)
    callee_function: str
    call_type: str = "direct"  # direct, virtual, dynamic


@dataclass
class FileDependency:
    """文件依赖关系"""
    source_file: str
    target_file: str
    dependency_type: str  # import, include, require, etc.
    line_number: int
    is_external: bool = False  # 是否为外部依赖


@dataclass
class ControlFlowNode:
    """控制流节点"""
    node_id: str
    node_type: str  # entry, exit, branch, merge, statement
    line_number: int
    file_path: str
    condition: Optional[str] = None  # 条件表达式(针对分支节点)
    statements: List[str] = field(default_factory=list)


@dataclass
class ControlFlowEdge:
    """控制流边"""
    source_id: str
    target_id: str
    edge_type: str  # normal, true, false, exception


class CodeAnalysisService:
    """
    代码分析服务 - 统一入口

    提供项目级别的代码静态分析能力，支持多种编程语言。
    """

    # 支持的语言及其文件扩展名
    LANGUAGE_EXTENSIONS = {
        '.java': 'java',
        '.c': 'c',
        '.h': 'c',
        '.cpp': 'cpp',
        '.hpp': 'cpp',
        '.cc': 'cpp',
        '.cxx': 'cpp',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
    }

    # 默认排除模式
    DEFAULT_EXCLUDE_PATTERNS = [
        'node_modules/',
        '__pycache__/',
        '.git/',
        'venv/',
        '.venv/',
        'dist/',
        'build/',
        'target/',
        '.idea/',
        '.vscode/',
        'vendor/',
        'third_party/',
        'third-party/',
        'minified/',
        '.min.js',
    ]

    def __init__(self, project_root: str):
        """
        初始化代码分析服务

        Args:
            project_root: 项目根目录路径
        """
        self.project_root = os.path.abspath(project_root)
        self.parser = TreeSitterParser()

        # 初始化提取器
        self._file_dependency_extractor = FileDependencyExtractor(self.parser)
        self._api_endpoint_extractor = APIEndpointExtractor(self.parser)
        self._call_graph_extractor = CallGraphExtractor(self.parser)
        self._control_flow_extractor = ControlFlowExtractor(self.parser)

        logger.info(f"CodeAnalysisService initialized for project: {self.project_root}")

    def detect_language(self, file_path: str) -> Optional[str]:
        """
        检测文件语言

        Args:
            file_path: 文件路径

        Returns:
            语言名称或 None
        """
        ext = Path(file_path).suffix.lower()
        return self.LANGUAGE_EXTENSIONS.get(ext)

    def analyze(
        self,
        exclude_patterns: Optional[List[str]] = None,
        target_files: Optional[List[str]] = None,
        extract_api: bool = True,
        extract_calls: bool = True,
        extract_dependencies: bool = True,
        extract_control_flow: bool = False,
    ) -> Dict[str, Any]:
        """
        执行完整代码分析

        Args:
            exclude_patterns: 排除模式列表
            target_files: 目标文件列表(相对于项目根目录)
            extract_api: 是否提取 API 端点
            extract_calls: 是否提取调用关系
            extract_dependencies: 是否提取文件依赖
            extract_control_flow: 是否提取控制流

        Returns:
            分析结果字典
        """
        results = {
            "project_root": self.project_root,
            "api_endpoints": [],
            "call_graph": [],
            "file_dependencies": [],
            "control_flow": {},
            "statistics": {
                "total_files": 0,
                "analyzed_files": 0,
                "by_language": {},
            }
        }

        # 合并排除模式
        exclude_set = set(exclude_patterns or [])
        exclude_set.update(self.DEFAULT_EXCLUDE_PATTERNS)

        # 扫描文件
        files = self._scan_files(list(exclude_set), target_files)
        results["statistics"]["total_files"] = len(files)

        logger.info(f"Found {len(files)} files to analyze")

        # 按语言分组统计
        for file_path in files:
            lang = self.detect_language(file_path)
            if lang:
                results["statistics"]["by_language"][lang] = \
                    results["statistics"]["by_language"].get(lang, 0) + 1

        # 执行分析
        for file_path in files:
            try:
                file_result = self._analyze_single_file(
                    file_path,
                    extract_api=extract_api,
                    extract_calls=extract_calls,
                    extract_dependencies=extract_dependencies,
                    extract_control_flow=extract_control_flow,
                )

                # 合并结果
                if extract_api:
                    results["api_endpoints"].extend(file_result.get("api_endpoints", []))
                if extract_calls:
                    results["call_graph"].extend(file_result.get("call_graph", []))
                if extract_dependencies:
                    results["file_dependencies"].extend(file_result.get("file_dependencies", []))
                if extract_control_flow:
                    rel_path = os.path.relpath(file_path, self.project_root)
                    cf_result = file_result.get("control_flow")
                    if cf_result:
                        results["control_flow"][rel_path] = cf_result

                results["statistics"]["analyzed_files"] += 1

            except Exception as e:
                logger.error(f"Failed to analyze file {file_path}: {e}")

        logger.info(f"Analysis completed: {results['statistics']}")

        return results

    def analyze_file(
        self,
        file_path: str,
        extract_api: bool = True,
        extract_calls: bool = True,
        extract_dependencies: bool = True,
    ) -> Dict[str, Any]:
        """
        分析单个文件

        Args:
            file_path: 文件路径
            extract_api: 是否提取 API 端点
            extract_calls: 是否提取调用关系
            extract_dependencies: 是否提取文件依赖

        Returns:
            文件分析结果
        """
        abs_path = os.path.abspath(file_path)
        rel_path = os.path.relpath(abs_path, self.project_root)
        language = self.detect_language(abs_path)

        results = {
            "file_path": rel_path,
            "language": language,
            "api_endpoints": [],
            "function_calls": [],
            "imports": [],
            "definitions": [],
            "error": None,
        }

        if language is None:
            results["error"] = f"Unsupported file type: {abs_path}"
            return results

        # 解析文件
        tree = self.parser.parse_file(abs_path, language)
        if tree is None:
            results["error"] = f"Failed to parse file: {abs_path}"
            return results

        # 读取源代码(用于提取文本)
        try:
            with open(abs_path, "rb") as f:
                source_code = f.read()
        except Exception as e:
            results["error"] = f"Failed to read file: {e}"
            return results

        # 调用提取器
        if extract_dependencies:
            imports = self._file_dependency_extractor.extract(tree, source_code, rel_path, language)
            results["imports"] = [
                {
                    "module_name": imp.module_name,
                    "imported_names": imp.imported_names,
                    "line_number": imp.line_number,
                    "import_type": imp.import_type,
                    "is_external": imp.is_external,
                    "alias": imp.alias,
                }
                for imp in imports
            ]

        if extract_api:
            endpoints = self._api_endpoint_extractor.extract(tree, source_code, rel_path, language)
            results["api_endpoints"] = [
                {
                    "file_path": ep.file_path,
                    "line_number": ep.line_number,
                    "method": ep.method,
                    "path": ep.path,
                    "handler": ep.handler,
                    "framework": ep.framework,
                    "parameters": ep.parameters,
                    "annotations": ep.annotations,
                    "source_snippet": ep.source_snippet,
                }
                for ep in endpoints
            ]

        if extract_calls:
            calls = self._call_graph_extractor.extract(tree, source_code, rel_path, language)
            results["function_calls"] = [
                {
                    "caller_file": call.caller_file,
                    "caller_function": call.caller_function,
                    "caller_line": call.caller_line,
                    "callee_name": call.callee_name,
                    "callee_object": call.callee_object,
                    "call_type": call.call_type,
                    "arguments": call.arguments,
                }
                for call in calls
            ]

        return results

    def _analyze_single_file(
        self,
        file_path: str,
        extract_api: bool = True,
        extract_calls: bool = True,
        extract_dependencies: bool = True,
        extract_control_flow: bool = False,
    ) -> Dict[str, Any]:
        """
        分析单个文件（内部方法）

        Args:
            file_path: 文件绝对路径
            extract_api: 是否提取 API 端点
            extract_calls: 是否提取调用关系
            extract_dependencies: 是否提取文件依赖
            extract_control_flow: 是否提取控制流

        Returns:
            文件分析结果
        """
        rel_path = os.path.relpath(file_path, self.project_root)
        language = self.detect_language(file_path)

        result = {
            "file_path": rel_path,
            "language": language,
            "api_endpoints": [],
            "call_graph": [],
            "file_dependencies": [],
            "control_flow": None,
        }

        if language is None:
            return result

        # 解析文件
        tree = self.parser.parse_file(file_path, language)
        if tree is None:
            return result

        # 读取源代码
        try:
            with open(file_path, "rb") as f:
                source_code = f.read()
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            return result

        # 提取 API 端点
        if extract_api:
            endpoints = self._api_endpoint_extractor.extract(tree, source_code, rel_path, language)
            result["api_endpoints"] = endpoints

        # 提取调用图
        if extract_calls:
            calls = self._call_graph_extractor.extract(tree, source_code, rel_path, language)
            result["call_graph"] = calls

        # 提取文件依赖
        if extract_dependencies:
            imports = self._file_dependency_extractor.extract(tree, source_code, rel_path, language)
            result["file_dependencies"] = [
                FileDependency(
                    source_file=rel_path,
                    target_file=imp.module_name,
                    dependency_type=imp.import_type,
                    line_number=imp.line_number,
                    is_external=imp.is_external,
                )
                for imp in imports
            ]

        # 提取控制流
        if extract_control_flow:
            cf_result = self._control_flow_extractor.extract(tree, source_code, rel_path, language)
            result["control_flow"] = {
                "nodes": [
                    {
                        "node_id": node.node_id,
                        "node_type": node.node_type,
                        "line_number": node.line_number,
                        "condition": node.condition,
                        "statements": node.statements,
                        "depth": node.depth,
                    }
                    for node in cf_result.nodes
                ],
                "edges": [
                    {
                        "source_id": edge.source_id,
                        "target_id": edge.target_id,
                        "edge_type": edge.edge_type,
                    }
                    for edge in cf_result.edges
                ],
                "complexity": cf_result.complexity,
            }

        return result

    def _scan_files(
        self,
        exclude_patterns: List[str],
        target_files: Optional[List[str]] = None
    ) -> List[str]:
        """
        扫描项目文件

        Args:
            exclude_patterns: 排除模式列表
            target_files: 目标文件列表(相对路径)

        Returns:
            文件路径列表(绝对路径)
        """
        files = []
        target_set = set(target_files) if target_files else None

        try:
            for root, dirs, filenames in os.walk(self.project_root):
                # 过滤排除的目录
                dirs[:] = [d for d in dirs if not self._should_exclude_dir(d, exclude_patterns)]

                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(file_path, self.project_root)

                    # 检查排除模式
                    if self._should_exclude_file(rel_path, exclude_patterns):
                        continue

                    # 检查是否是目标语言文件
                    if not self.detect_language(file_path):
                        continue

                    # 如果指定了目标文件，只处理目标文件
                    if target_set and rel_path not in target_set:
                        continue

                    files.append(file_path)

        except Exception as e:
            logger.error(f"Error scanning files: {e}")

        return files

    def _should_exclude_dir(self, dir_name: str, exclude_patterns: List[str]) -> bool:
        """检查目录是否应该被排除"""
        for pattern in exclude_patterns:
            if pattern.endswith('/') and pattern[:-1] == dir_name:
                return True
            if dir_name in pattern:
                return True
        return False

    def _should_exclude_file(self, rel_path: str, exclude_patterns: List[str]) -> bool:
        """检查文件是否应该被排除"""
        for pattern in exclude_patterns:
            if pattern.startswith('.'):
                if rel_path.endswith(pattern) or f"/{pattern}" in f"/{rel_path}":
                    return True
            if pattern.endswith('/'):
                if f"/{pattern}" in f"/{rel_path}/":
                    return True
            if pattern in rel_path:
                return True
        return False

    def get_supported_languages(self) -> List[str]:
        """获取支持的语言列表"""
        return list(set(self.LANGUAGE_EXTENSIONS.values()))

    def get_project_structure(self) -> Dict[str, Any]:
        """
        获取项目结构

        Returns:
            项目结构树
        """
        structure = {
            "name": os.path.basename(self.project_root),
            "type": "directory",
            "children": [],
        }

        def build_tree(path: str, node: dict):
            try:
                items = sorted(os.listdir(path))
            except PermissionError:
                return

            for item in items:
                item_path = os.path.join(path, item)

                # 跳过隐藏文件和排除目录
                if item.startswith('.'):
                    continue
                if self._should_exclude_dir(item, self.DEFAULT_EXCLUDE_PATTERNS):
                    continue

                if os.path.isdir(item_path):
                    child = {
                        "name": item,
                        "type": "directory",
                        "children": [],
                    }
                    build_tree(item_path, child)
                    if child["children"]:  # 只添加非空目录
                        node["children"].append(child)
                else:
                    lang = self.detect_language(item_path)
                    if lang:
                        node["children"].append({
                            "name": item,
                            "type": "file",
                            "language": lang,
                        })

        build_tree(self.project_root, structure)
        return structure