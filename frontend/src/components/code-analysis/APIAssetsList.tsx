// frontend/src/components/code-analysis/APIAssetsList.tsx
//
// API 资产列表：method 徽标 + path + framework + file:line + 注解。
// 顶部带一个按 API 地址（path）筛选的搜索框。

import { useMemo, useState } from 'react';
import { Globe, Search } from 'lucide-react';

import { toApiView } from './adapters';

interface Props {
  data: unknown[] | unknown;
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  PATCH: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
  DELETE: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
};

export function APIAssetsList({ data }: Props) {
  const rows = useMemo(() => toApiView(data), [data]);
  const [pathFilter, setPathFilter] = useState('');

  const filtered = useMemo(() => {
    const kw = pathFilter.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter((r) => (r.path || '').toLowerCase().includes(kw));
  }, [rows, pathFilter]);

  if (!rows.length) {
    return <div className="text-muted-foreground text-xs py-4 px-2">暂无 API 接口</div>;
  }

  return (
    <div className="space-y-2">
      {/* 按 API 地址筛选 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            placeholder="按 API 地址搜索"
            className="h-8 w-full text-xs pl-8 pr-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {pathFilter ? `${filtered.length} / ${rows.length}` : `共 ${rows.length} 条`}
        </span>
      </div>

      <div className="space-y-1 max-h-[420px] overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground text-xs py-4 px-2">无匹配 API</div>
        ) : (
          filtered.map((r, idx) => {
            const methodCls = METHOD_COLOR[r.method] ?? 'bg-muted text-muted-foreground border-border';
            return (
              <div
                key={`${r.file}:${r.line}:${idx}`}
                className="flex items-center gap-2 text-xs p-1.5 hover:bg-muted/30 rounded"
              >
                <Globe className="w-3 h-3 text-primary shrink-0" />
                <span
                  className={`inline-block min-w-[44px] text-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${methodCls}`}
                >
                  {r.method || '?'}
                </span>
                <span className="font-mono truncate flex-1" title={r.path}>
                  {r.path || '(no path)'}
                </span>
                {r.framework && (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {r.framework}
                  </span>
                )}
                <span className="text-muted-foreground truncate shrink-0" title={`${r.file}:${r.line}`}>
                  {r.file}:{r.line}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
