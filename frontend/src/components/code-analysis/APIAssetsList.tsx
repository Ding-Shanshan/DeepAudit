// frontend/src/components/code-analysis/APIAssetsList.tsx

import { APIEndpoint } from './types';
import { Globe, Code, Database } from 'lucide-react';

interface Props {
  data: APIEndpoint[];
}

export function APIAssetsList({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="text-muted-foreground text-xs">暂无数据</div>;
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web_api': return <Globe className="w-3 h-3 text-blue-500" />;
      case 'function': return <Code className="w-3 h-3 text-green-500" />;
      case 'external_call': return <Database className="w-3 h-3 text-orange-500" />;
      default: return <Code className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-1">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs p-1 hover:bg-muted/30 rounded">
          {getTypeIcon(item.type)}
          <span className="font-medium truncate flex-1">{item.name}</span>
          <span className="text-muted-foreground truncate">{item.file}:{item.line}</span>
        </div>
      ))}
    </div>
  );
}
