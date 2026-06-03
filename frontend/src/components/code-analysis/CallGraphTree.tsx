// frontend/src/components/code-analysis/CallGraphTree.tsx

import { CallGraphNode } from './types';
import { ArrowRight } from 'lucide-react';

interface Props {
  data: CallGraphNode[];
}

export function CallGraphTree({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="text-muted-foreground text-xs">暂无数据</div>;
  }

  return (
    <div className="space-y-1">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1 text-xs p-1 hover:bg-muted/30 rounded">
          <span className="font-medium truncate">{item.caller}</span>
          <ArrowRight className="w-3 h-3 text-primary" />
          <span className="font-medium truncate">{item.callee}</span>
          <span className="text-muted-foreground ml-auto truncate">{item.caller_file}:{item.line}</span>
        </div>
      ))}
    </div>
  );
}
