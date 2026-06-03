// frontend/src/components/code-analysis/types.ts

/**
 * API接口资产类型
 */
export interface APIEndpoint {
  type: 'web_api' | 'function' | 'external_call';
  name: string;
  file: string;
  line: number;
  params?: Array<{ name: string; type: string }>;
  return_type?: string;
  target?: string;      // 外部调用目标
  category?: string;    // 外部调用类别 (database, http, file, etc.)
}

/**
 * 函数调用图节点
 */
export interface CallGraphNode {
  caller: string;
  caller_file: string;
  callee: string;
  callee_file: string;
  line: number;
}

/**
 * 文件包含关系
 */
export interface FileDependency {
  file: string;
  includes: Array<{
    target: string;
    type: string;  // import, include, require
    line: number;
  }>;
}

/**
 * 控制流节点
 */
export interface ControlFlowNode {
  function: string;
  file: string;
  line: number;
  nodes: Array<{
    id: string;
    type: string;  // entry, branch, exit, loop
    condition?: string;
    line: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
  complexity?: number;  // 圈复杂度
}

/**
 * 代码分析完整结果
 */
export interface CodeAnalysisResult {
  api_endpoints: APIEndpoint[];
  call_graph: CallGraphNode[];
  file_dependencies: FileDependency[];
  control_flow: ControlFlowNode[];
}
