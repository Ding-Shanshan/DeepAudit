// frontend/src/components/code-analysis/CodeAnalysisPanel.tsx

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Api, GitBranch, FileCode, Network } from 'lucide-react';
import { apiClient } from '@/shared/api/serverClient';
import { CodeAnalysisResult } from './types';
import { APIAssetsList } from './APIAssetsList';
import { CallGraphTree } from './CallGraphTree';
import { FileDepsTree } from './FileDepsTree';
import { ControlFlowTree } from './ControlFlowTree';

interface Props {
  taskId: string;
  taskType: 'quick' | 'agent';
}

export function CodeAnalysisPanel({ taskId, taskType }: Props) {
  const [data, setData] = useState<CodeAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 展开/折叠状态
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // 获取分析数据
  useEffect(() => {
    const endpoint = taskType === 'quick'
      ? `/tasks/${taskId}/code-analysis`
      : `/agent-tasks/${taskId}/code-analysis`;

    apiClient.get(endpoint)
      .then((res) => {
        setData(res.data || {});
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load code analysis:', err);
        setError('加载失败');
        setLoading(false);
      });
  }, [taskId, taskType]);

  if (loading) return <div className="p-4 text-muted-foreground">加载中...</div>;
  if (error) return <div className="p-4 text-destructive">{error}</div>;
  if (!data) return <div className="p-4 text-muted-foreground">暂无数据</div>;

  const sections = [
    { key: 'api', title: 'API接口资产', icon: Api, count: data.api_endpoints?.length || 0 },
    { key: 'call', title: '函数调用图', icon: Network, count: data.call_graph?.length || 0 },
    { key: 'deps', title: '文件包含关系', icon: FileCode, count: data.file_dependencies?.length || 0 },
    { key: 'cfg', title: '函数控制流图', icon: GitBranch, count: data.control_flow?.length || 0 },
  ];

  return (
    <div className="cyber-card p-4 h-full overflow-auto">
      <h3 className="text-sm font-bold uppercase mb-3 text-foreground">代码结构分析</h3>

      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.key} className="border border-border rounded">
            <button
              className="w-full flex items-center justify-between p-2 text-sm hover:bg-muted/50"
              onClick={() => toggleSection(section.key)}
            >
              <div className="flex items-center gap-2">
                {expanded.has(section.key) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <section.icon className="w-4 h-4 text-primary" />
                <span className="font-medium">{section.title}</span>
              </div>
              <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded">
                {section.count}
              </span>
            </button>

            {expanded.has(section.key) && (
              <div className="p-2 border-t border-border max-h-64 overflow-auto">
                {section.key === 'api' && <APIAssetsList data={data.api_endpoints || []} />}
                {section.key === 'call' && <CallGraphTree data={data.call_graph || []} />}
                {section.key === 'deps' && <FileDepsTree data={data.file_dependencies || []} />}
                {section.key === 'cfg' && <ControlFlowTree data={data.control_flow || []} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}