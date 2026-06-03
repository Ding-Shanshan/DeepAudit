// frontend/src/components/code-analysis/ControlFlowTree.tsx

import { useState } from 'react';
import { ControlFlowNode } from './types';
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react';

interface Props {
  data: ControlFlowNode[];
}

export function ControlFlowTree({ data }: Props) {
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
            <GitBranch className="w-3 h-3 text-primary" />
            <span className="truncate font-medium">{item.function}</span>
            <span className="text-muted-foreground ml-auto">
              复杂度: {item.complexity || item.nodes?.length || 0}
            </span>
          </button>
          {expanded.has(idx) && item.nodes && (
            <div className="ml-4 mt-1 space-y-0.5">
              {item.nodes.map((node, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="truncate">{node.type}</span>
                  {node.condition && <span className="text-xs truncate">[{node.condition}]</span>}
                  <span className="text-xs">:{node.line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
