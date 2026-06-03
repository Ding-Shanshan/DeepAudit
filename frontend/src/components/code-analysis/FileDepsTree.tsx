// frontend/src/components/code-analysis/FileDepsTree.tsx

import { useState } from 'react';
import { FileDependency } from './types';
import { ChevronDown, ChevronRight, File } from 'lucide-react';

interface Props {
  data: FileDependency[];
}

export function FileDepsTree({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="text-muted-foreground text-xs">暂无数据</div>;
  }

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  return (
    <div className="space-y-1">
      {data.map((item, idx) => (
        <div key={idx}>
          <button
            className="w-full flex items-center gap-2 text-xs p-1 hover:bg-muted/30 rounded"
            onClick={() => setExpanded(prev => {
              const newSet = new Set(prev);
              newSet.has(idx) ? newSet.delete(idx) : newSet.add(idx);
              return newSet;
            })}
          >
            {expanded.has(idx) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <File className="w-3 h-3 text-primary" />
            <span className="truncate">{item.file}</span>
            <span className="text-muted-foreground ml-auto">{item.includes?.length || 0}</span>
          </button>
          {expanded.has(idx) && item.includes && (
            <div className="ml-4 mt-1 space-y-0.5">
              {item.includes.map((inc, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="truncate">{inc.target}</span>
                  <span className="text-xs">:{inc.line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
