// frontend/src/components/code-analysis/CodeAnalysisPanel.tsx

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, GitBranch, Globe, Network } from 'lucide-react';

import { apiClient } from '@/shared/api/serverClient';

import { APIAssetsList } from './APIAssetsList';
import { CallGraphTree } from './CallGraphTree';
import { ControlFlowTree } from './ControlFlowTree';
import { FileDepsTree } from './FileDepsTree';
import {
  toApiView,
  toCallGraphView,
  toControlFlowView,
  toFileDepsView,
} from './adapters';
import type { CodeAnalysisResult } from './types';

interface Props {
  taskId: string;
  taskType: 'quick' | 'agent';
  /** 隐藏 API 接口资产那一栏（在外部 Tab 里单独展示时使用） */
  hideApi?: boolean;
}

export function CodeAnalysisPanel({ taskId, taskType, hideApi = false }: Props) {
  const [data, setData] = useState<CodeAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  useEffect(() => {
    const endpoint =
      taskType === 'quick' ? `/tasks/${taskId}/code-analysis` : `/agent-tasks/${taskId}/code-analysis`;

    apiClient
      .get(endpoint)
      .then((res) => {
        setData((res.data as CodeAnalysisResult) || {});
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load code analysis:', err);
        setError('加载失败');
        setLoading(false);
      });
  }, [taskId, taskType]);

  // 计数用适配器的视图模型，避免后端字段错位导致计数为 0
  const counts = useMemo(() => {
    if (!data) return { api: 0, call: 0, deps: 0, cfg: 0 };
    return {
      api: toApiView(data.api_endpoints ?? []).length,
      call: toCallGraphView(data.call_graph ?? []).edges.length,
      deps: toFileDepsView(data.file_dependencies ?? []).edges.length,
      cfg: toControlFlowView(data.control_flow ?? {}).files.length,
    };
  }, [data]);

  if (loading) return <div className="p-4 text-muted-foreground">加载中...</div>;
  if (error) return <div className="p-4 text-destructive">{error}</div>;
  if (!data) return <div className="p-4 text-muted-foreground">暂无数据</div>;

  const sections = [
    { key: 'api', title: 'API 接口资产', icon: Globe, count: counts.api },
    { key: 'call', title: '函数调用图', icon: Network, count: counts.call },
    { key: 'deps', title: '文件包含关系', icon: FileCode, count: counts.deps },
    { key: 'cfg', title: '函数控制流图', icon: GitBranch, count: counts.cfg },
  ].filter((s) => !(hideApi && s.key === 'api'));

  return (
    <div className="cyber-card p-4 h-full overflow-auto">
      <h3 className="text-sm font-bold uppercase mb-3 text-foreground">代码结构分析</h3>

      <div className="space-y-2">
        {sections.map((section) => {
          const open = expanded.has(section.key);
          return (
            <div key={section.key} className="border border-border rounded">
              <button
                className="w-full flex items-center justify-between p-2 text-sm hover:bg-muted/50"
                onClick={() => toggleSection(section.key)}
              >
                <div className="flex items-center gap-2">
                  {open ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <section.icon className="w-4 h-4 text-primary" />
                  <span className="font-medium">{section.title}</span>
                </div>
                <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded">
                  {section.count}
                </span>
              </button>

              {open && (
                <div className="p-2 border-t border-border">
                  {section.key === 'api' && <APIAssetsList data={data.api_endpoints ?? []} />}
                  {section.key === 'call' && <CallGraphTree data={data.call_graph ?? []} />}
                  {section.key === 'deps' && <FileDepsTree data={data.file_dependencies ?? []} />}
                  {section.key === 'cfg' && <ControlFlowTree data={data.control_flow ?? {}} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
