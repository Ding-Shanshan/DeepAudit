/**
 * Agent Detail Panel Component
 * 终端日志风格，与 PhaseStepper 视觉一致
 */

import { memo } from "react";
import { X } from "lucide-react";
import { AGENT_STATUS_CONFIG } from "../constants";
import { findAgentInTree } from "../utils";
import type { AgentDetailPanelProps } from "../types";

const AGENT_TYPE_LABEL: Record<string, string> = {
  orchestrator: "编排器",
  recon: "侦察",
  analysis: "分析",
  verification: "验证",
};

export const AgentDetailPanel = memo(function AgentDetailPanel({ agentId, treeNodes, onClose }: AgentDetailPanelProps) {
  const agent = findAgentInTree(treeNodes, agentId);
  if (!agent) return null;

  const statusConfig = AGENT_STATUS_CONFIG[agent.status] || AGENT_STATUS_CONFIG.created;
  const typeLabel = AGENT_TYPE_LABEL[agent.agent_type] || "Agent";

  return (
    <div className="font-sans text-xs space-y-1.5 rounded border border-slate-200 p-3">
      {/* Close button */}
      <div className="flex items-center justify-between py-1">
        <span className="text-slate-800 font-semibold">{agent.agent_name}</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          [关闭]
        </button>
      </div>

      {/* 类型 + 状态 */}
      <div className="text-slate-500">
        [{typeLabel}] [{statusConfig.text}]
      </div>

      {/* 漏洞数 - 仅根 Agent */}
      {!agent.parent_agent_id && (
        <div className={agent.findings_count > 0 ? "text-slate-700" : "text-slate-500"}>
          [漏洞] {agent.findings_count}
        </div>
      )}

      {/* 时长 - 仅子 Agent */}
      {agent.parent_agent_id && agent.duration_ms && (
        <div className="text-slate-500">
          [时长] {(agent.duration_ms / 1000).toFixed(1)}s
        </div>
      )}

      {/* 任务描述 */}
      {agent.task_description && (
        <div className="text-slate-500">
          [任务] {agent.task_description.length > 120 ? agent.task_description.slice(0, 120) + "..." : agent.task_description}
        </div>
      )}

      {/* 子 Agent */}
      {agent.children && agent.children.length > 0 && (
        <div className="text-slate-400">
          {agent.children.length} 个子 Agent
        </div>
      )}
    </div>
  );
});

export default AgentDetailPanel;