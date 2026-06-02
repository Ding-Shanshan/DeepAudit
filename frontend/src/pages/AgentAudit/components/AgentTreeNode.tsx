/**
 * Agent Tree Node Component
 * 简洁灰色边框风格，与日志流视觉一致
 */

import { useState, memo } from "react";
import { ChevronDown, ChevronRight, Zap, Bug } from "lucide-react";
import type { AgentTreeNodeItemProps } from "../types";

export const AgentTreeNodeItem = memo(function AgentTreeNodeItem({
  node,
  depth = 0,
  selectedId,
  onSelect,
  isLast = false
}: AgentTreeNodeItemProps & { isLast?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.agent_id;
  const isRunning = node.status === 'running';

  const indent = depth * 24;

  return (
    <div className="relative">
      {/* 树形连接线 */}
      {depth > 0 && (
        <>
          <div
            className="absolute border-l border-slate-200"
            style={{
              left: `${indent - 12}px`,
              top: 0,
              height: isLast ? '20px' : '100%',
            }}
          />
          <div
            className="absolute border-t border-slate-200"
            style={{
              left: `${indent - 12}px`,
              top: '20px',
              width: '12px',
            }}
          />
        </>
      )}

      {/* Node item - 灰色细边框 + 小圆角 */}
      <div
        className={`
          relative flex items-center gap-2 py-2.5 px-2 cursor-pointer rounded
          ${isSelected
            ? 'border border-slate-400'
            : 'border border-slate-200 hover:border-slate-300'
          }
        `}
        style={{ marginLeft: `${indent}px` }}
        onClick={() => onSelect(node.agent_id)}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Status dot */}
        <div className={`
          w-2 h-2 rounded-full flex-shrink-0
          ${isRunning ? 'bg-emerald-400' : ''}
          ${node.status === 'completed' ? 'bg-slate-400' : ''}
          ${node.status === 'failed' ? 'bg-rose-400' : ''}
          ${node.status === 'waiting' ? 'bg-amber-400' : ''}
          ${node.status === 'created' ? 'bg-slate-200' : ''}
        `} />

        {/* Agent name */}
        <span className="font-sans text-xs truncate flex-1 text-slate-700">
          {node.agent_name}
        </span>

        {/* Metrics */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(node.iterations ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500 font-sans">
              <Zap className="w-3 h-3" />
              {node.iterations}
            </span>
          )}

          {!node.parent_agent_id && node.findings_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-600 font-sans">
              <Bug className="w-3 h-3" />
              {node.findings_count}
            </span>
          )}
        </div>
      </div>

      {/* Children - 灰色细边框包裹 */}
      {expanded && hasChildren && (
        <div
          className="ml-3 mt-1 p-1.5 rounded border border-slate-200"
          style={{ marginLeft: `${indent + 12}px` }}
        >
          {node.children.map((child, index) => (
            <AgentTreeNodeItem
              key={child.agent_id}
              node={child}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              isLast={index === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default AgentTreeNodeItem;