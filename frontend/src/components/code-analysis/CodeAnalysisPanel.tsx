// frontend/src/components/code-analysis/CodeAnalysisPanel.tsx

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, GitBranch, Globe, Network } from 'lucide-react';

import { apiClient } from '@/shared/api/serverClient';

import { APIAssetsList } from './APIAssetsList';
import { CallGraphTree } from './CallGraphTree';
import { ControlFlowTree } from './ControlFlowTree';
import { FileDepsTree } from './FileDepsTree';

interface Props {
  taskId: string;
  taskType: 'quick' | 'agent';
  /** 隐藏 API 接口资产那一栏（在外部 Tab 里单独展示时使用） */
  hideApi?: boolean;
}

/** 后端 /summary 端点返回 */
interface SectionSummary {
  api_endpoints: number;
  call_graph: number;
  file_dependencies: number;
  control_flow_files: number;
}

/** 单节的加载状态 */
interface SectionState {
  data: unknown;
  loading: boolean;
  error: string | null;
}

interface SectionDef {
  key: 'api' | 'call' | 'deps' | 'cfg';
  title: string;
  icon: typeof Globe;
  /** /summary 响应里对应的字段 */
  countField: keyof SectionSummary;
  /** /{section} 路径片段 */
  sectionPath: 'api_endpoints' | 'call_graph' | 'file_dependencies' | 'control_flow';
}

const SECTIONS: readonly SectionDef[] = [
  { key: 'api', title: 'API 接口资产', icon: Globe, countField: 'api_endpoints', sectionPath: 'api_endpoints' },
  { key: 'call', title: '函数调用图', icon: Network, countField: 'call_graph', sectionPath: 'call_graph' },
  { key: 'deps', title: '文件包含关系', icon: FileCode, countField: 'file_dependencies', sectionPath: 'file_dependencies' },
  { key: 'cfg', title: '函数控制流图', icon: GitBranch, countField: 'control_flow_files', sectionPath: 'control_flow' },
];

// 单 section 请求超时上限：大项目（百万级 call_graph）确实需要几十秒
// axios 默认 30s 在小项目下够用，这里给大项目一些余地
const SECTION_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

export function CodeAnalysisPanel({ taskId, taskType, hideApi = false }: Props) {
  const [summary, setSummary] = useState<SectionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, SectionState>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const basePath = taskType === 'quick' ? '/tasks' : '/agent-tasks';

  // 首屏只加载 summary
  useEffect(() => {
    let cancelled = false;
    setLoadingSummary(true);
    setSummaryError(null);
    apiClient
      .get(`${basePath}/${taskId}/code-analysis/summary`, { timeout: SECTION_REQUEST_TIMEOUT_MS })
      .then((res) => {
        if (cancelled) return;
        setSummary(res.data as SectionSummary);
        setLoadingSummary(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load code analysis summary:', err);
        setSummaryError('加载失败');
        setLoadingSummary(false);
      });
    return () => {
      cancelled = true;
    };
  }, [basePath, taskId]);

  const loadSection = useCallback(
    (sectionKey: string) => {
      const sec = SECTIONS.find((s) => s.key === sectionKey);
      if (!sec) return;
      setSections((prev) => ({ ...prev, [sectionKey]: { data: null, loading: true, error: null } }));
      apiClient
        .get(`${basePath}/${taskId}/code-analysis/${sec.sectionPath}`, { timeout: SECTION_REQUEST_TIMEOUT_MS })
        .then((res) => {
          setSections((prev) => ({
            ...prev,
            [sectionKey]: { data: res.data, loading: false, error: null },
          }));
        })
        .catch((err) => {
          console.error(`Failed to load section ${sec.sectionPath}:`, err);
          setSections((prev) => ({
            ...prev,
            [sectionKey]: { data: null, loading: false, error: '加载失败' },
          }));
        });
    },
    [basePath, taskId]
  );

  const toggleSection = useCallback(
    (sectionKey: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(sectionKey)) {
          next.delete(sectionKey);
        } else {
          next.add(sectionKey);
          // 展开时若该节未加载（且也不是 loading 中）则触发加载
          if (!sections[sectionKey]) {
            loadSection(sectionKey);
          }
        }
        return next;
      });
    },
    [loadSection, sections]
  );

  if (loadingSummary) return <div className="p-4 text-muted-foreground">加载中...</div>;
  if (summaryError) return <div className="p-4 text-destructive">{summaryError}</div>;
  if (!summary) return <div className="p-4 text-muted-foreground">暂无数据</div>;

  const visibleSections = SECTIONS.filter((s) => !(hideApi && s.key === 'api'));

  return (
    <div className="cyber-card p-4 h-full overflow-auto">
      <h3 className="text-sm font-bold uppercase mb-3 text-foreground">代码结构分析</h3>

      <div className="space-y-2">
        {visibleSections.map((section) => {
          const open = expanded.has(section.key);
          const state = sections[section.key];
          const count = summary[section.countField];
          const oversized = count === -1;

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
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    oversized
                      ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                      : 'text-muted-foreground bg-muted'
                  }`}
                  title={oversized ? '数据过大，DB 解析失败' : undefined}
                >
                  {oversized ? '过大' : count}
                </span>
              </button>

              {open && (
                <div className="p-2 border-t border-border">
                  {state?.loading ? (
                    <div className="text-muted-foreground text-xs py-2">加载中...</div>
                  ) : state?.error ? (
                    <div className="text-destructive text-xs py-2">{state.error}</div>
                  ) : state?.data !== undefined && state?.data !== null ? (
                    <>
                      {section.key === 'api' && (
                        <APIAssetsList data={Array.isArray(state.data) ? state.data : []} />
                      )}
                      {section.key === 'call' && (
                        <CallGraphTree data={Array.isArray(state.data) ? state.data : []} />
                      )}
                      {section.key === 'deps' && (
                        <FileDepsTree data={Array.isArray(state.data) ? state.data : []} />
                      )}
                      {section.key === 'cfg' && (
                        <ControlFlowTree data={state.data ?? {}} />
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground text-xs py-2">加载中...</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
