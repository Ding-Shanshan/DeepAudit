/**
 * Agent 详情面板
 * 卡片式详情展示，全中文标签
 */

import { memo } from "react";
import { X, Zap, Bug, Clock } from "lucide-react";
import { AGENT_TYPE_CONFIG, AGENT_STATUS_CONFIG } from "../constants";
import { findAgentInTree } from "../utils";
import type { AgentDetailPanelProps } from "../types";

export const AgentDetailPanel = memo(function AgentDetailPanel({ agentId, treeNodes, onClose }: AgentDetailPanelProps) {
  const agent = findAgentInTree(treeNodes, agentId);
  if (!agent) return null;

  const typeConfig = AGENT_TYPE_CONFIG[agent.agent_type] || AGENT_TYPE_CONFIG.orchestrator;
  const statusConfig = AGENT_STATUS_CONFIG[agent.status] || AGENT_STATUS_CONFIG.created;

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
      {/* 头部：名称 + 类型 + 状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {typeConfig.icon}
          <span className="text-sm font-semibold text-slate-800">{agent.agent_name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
          {typeConfig.label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusConfig.color}`}>
          {statusConfig.text}
        </span>
      </div>

      {/* 关键指标网格 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 发现数 - 仅根 Agent */}
        {!agent.parent_agent_id && (
          <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-center">
            <Bug className="w-4 h-4 text-rose-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">{agent.findings_count}</p>
            <p className="text-[10px] text-slate-500">发现数</p>
          </div>
        )}

        {/* 迭代数 */}
        {(agent.iterations ?? 0) > 0 && (
          <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-center">
            <Zap className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">{agent.iterations}</p>
            <p className="text-[10px] text-slate-500">迭代次数</p>
          </div>
        )}

        {/* 时长 - 仅子 Agent */}
        {agent.parent_agent_id && agent.duration_ms && (
          <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-center">
            <Clock className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">{(agent.duration_ms / 1000).toFixed(1)}s</p>
            <p className="text-[10px] text-slate-500">执行时长</p>
          </div>
        )}

        {/* 子Agent数 */}
        {agent.children && agent.children.length > 0 && (
          <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-center">
            <Zap className="w-4 h-4 text-sky-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">{agent.children.length}</p>
            <p className="text-[10px] text-slate-500">子 Agent</p>
          </div>
        )}
      </div>

      {/* 任务描述 */}
      {agent.task_description && (
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-[10px] text-slate-500 mb-1 font-medium">任务描述</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {agent.task_description.length > 200 ? agent.task_description.slice(0, 200) + "..." : agent.task_description}
          </p>
        </div>
      )}
    </div>
  );
});

export default AgentDetailPanel;