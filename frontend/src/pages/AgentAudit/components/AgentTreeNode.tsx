/**
 * Agent 树节点组件
 * 卡片式节点，左边框按类型颜色编码，全中文标签
 */

import { useState, memo } from "react";
import { ChevronDown, ChevronRight, Zap, Bug } from "lucide-react";
import { AGENT_TYPE_CONFIG, AGENT_STATUS_CONFIG } from "../constants";
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

  const typeConfig = AGENT_TYPE_CONFIG[node.agent_type] || AGENT_TYPE_CONFIG.orchestrator;
  const statusConfig = AGENT_STATUS_CONFIG[node.status] || AGENT_STATUS_CONFIG.created;

  const indent = depth * 20;

  return (
    <div className="relative">
      {/* 树形连接线 */}
      {depth > 0 && (
        <>
          <div
            className="absolute border-l border-slate-200"
            style={{
              left: `${indent - 10}px`,
              top: 0,
              height: isLast ? '18px' : '100%',
            }}
          />
          <div
            className="absolute border-t border-slate-200"
            style={{
              left: `${indent - 10}px`,
              top: '18px',
              width: '10px',
            }}
          />
        </>
      )}

      {/* 卡片节点 */}
      <div
        className={`
          relative flex items-center gap-2.5 py-2 px-3 cursor-pointer rounded-lg mb-1
          border-l-[3px] transition-all duration-150
          ${isSelected
            ? `ring-2 ring-indigo-300 shadow-md ${typeConfig.borderColor} bg-white`
            : `${typeConfig.borderColor} bg-white hover:shadow hover:bg-slate-50`
          }
        `}
        style={{ marginLeft: `${indent}px` }}
        onClick={() => onSelect(node.agent_id)}
      >
        {/* 展开/折叠 */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* 类型图标 */}
        <div className="flex-shrink-0">
          {typeConfig.icon}
        </div>

        {/* Agent名称 */}
        <span className="text-xs font-medium truncate flex-1 text-slate-700">
          {node.agent_name}
        </span>

        {/* 状态文字 */}
        <span className={`text-[10px] font-medium flex-shrink-0 ${statusConfig.color}`}>
          {statusConfig.text}
        </span>

        {/* 指标 */}
        {(node.iterations ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-500 flex-shrink-0">
            <Zap className="w-2.5 h-2.5" />
            {node.iterations}
          </span>
        )}

        {!node.parent_agent_id && node.findings_count > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-rose-500 flex-shrink-0">
            <Bug className="w-2.5 h-2.5" />
            {node.findings_count}
          </span>
        )}
      </div>

      {/* 子Agent */}
      {expanded && hasChildren && (
        <div style={{ marginLeft: `${indent + 10}px` }}>
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