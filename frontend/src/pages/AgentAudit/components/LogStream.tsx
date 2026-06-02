/**
 * 日志流组件
 * 卡片式日志条目，左侧彩色边条标识类型，全中文标签
 */

import { memo, useRef, useEffect } from "react";
import {
  Brain, Wrench, Bug, Zap, Terminal, AlertTriangle,
  Loader2, Shield, ChevronDown, ChevronRight, ScrollText
} from "lucide-react";
import { LOG_TYPE_CONFIG } from "../constants";
import { AUDIT_PHASE_CONFIG, AUDIT_PHASES } from "../types";
import type { AuditPhase, LogItem } from "../types";

// ============ 严重等级配色 ============

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: "严重", className: "bg-rose-500/15 text-rose-600 border border-rose-500/25" },
  high: { label: "高危", className: "bg-orange-500/15 text-orange-600 border border-orange-500/25" },
  medium: { label: "中危", className: "bg-amber-500/15 text-amber-600 border border-amber-500/25" },
  low: { label: "低危", className: "bg-sky-500/15 text-sky-600 border border-sky-500/25" },
};

// ============ 清理标题 ============

function cleanTitle(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[✅🔗🛑✕⚠️❌⚡🔄🔍💡📁📄🐛🛡️🔧📤📊📦🔬]/g, "")
    .replace(/^[:\-–—•·\s]+/, "")
    .trim() || title;
}

// ============ 单条日志卡片 ============

function LogCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: LogItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const typeConfig = LOG_TYPE_CONFIG[item.type] || LOG_TYPE_CONFIG.info;
  const title = cleanTitle(item.title);
  const isCollapsible = !!(item.content && item.type !== "thinking");
  const isThinking = item.type === "thinking";

  // 图标映射
  const typeIcons: Record<string, React.ReactNode> = {
    thinking: <Brain className="w-3.5 h-3.5 text-violet-500" />,
    tool: <Wrench className="w-3.5 h-3.5 text-amber-500" />,
    finding: <Bug className="w-3.5 h-3.5 text-rose-500" />,
    dispatch: <Zap className="w-3.5 h-3.5 text-sky-500" />,
    info: <Terminal className="w-3.5 h-3.5 text-slate-400" />,
    error: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
    progress: <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />,
    user: <Shield className="w-3.5 h-3.5 text-indigo-500" />,
  };

  return (
    <div
      className={`rounded-lg border-l-[3px] ${typeConfig.borderColor} ${typeConfig.bgColor} px-3 py-2 mb-1.5 transition-all duration-150`}
      onClick={isCollapsible ? onToggle : undefined}
    >
      {/* 标题行 */}
      <div className="flex items-center gap-2">
        {typeIcons[item.type] || typeIcons.info}

        {/* 类型标签 */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
          item.type === 'thinking' ? 'bg-violet-100 text-violet-700' :
          item.type === 'tool' ? 'bg-amber-100 text-amber-700' :
          item.type === 'finding' ? 'bg-rose-100 text-rose-700' :
          item.type === 'dispatch' ? 'bg-sky-100 text-sky-700' :
          item.type === 'error' ? 'bg-red-100 text-red-700' :
          item.type === 'progress' ? 'bg-emerald-100 text-emerald-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {typeConfig.label}
        </span>

        {/* 时间戳 */}
        {item.time && (
          <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">{item.time}</span>
        )}

        {/* 标题 */}
        <span className="text-xs text-slate-700 truncate flex-1">
          {isThinking && item.isStreaming ? (
            <>
              {title || "正在思考..."}
              <span className="inline-block w-1 h-3 bg-violet-400 rounded-sm ml-0.5 animate-pulse" />
            </>
          ) : title}
        </span>

        {/* 工具状态 */}
        {item.tool?.status === "running" && (
          <span className="text-[10px] text-amber-600 flex-shrink-0 flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            运行中
          </span>
        )}
        {item.tool?.status === "completed" && (
          <span className="text-[10px] text-emerald-600 flex-shrink-0">
            完成{item.tool.duration ? ` ${item.tool.duration}ms` : ""}
          </span>
        )}

        {/* 严重度 */}
        {item.severity && SEVERITY_BADGE[item.severity] && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${SEVERITY_BADGE[item.severity].className}`}>
            {SEVERITY_BADGE[item.severity].label}
          </span>
        )}

        {/* Agent名 */}
        {item.agentName && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">@{item.agentName}</span>
        )}

        {/* 展开指示 */}
        {isCollapsible && (
          <span className="text-slate-400 flex-shrink-0">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
      </div>

      {/* 思考内容（始终显示） */}
      {isThinking && item.content && (
        <div className="mt-1.5 ml-7 text-xs text-slate-500 whitespace-pre-wrap break-words leading-relaxed">
          {item.content}
        </div>
      )}

      {/* 可展开内容 */}
      {isCollapsible && isExpanded && item.content && (
        <div className="mt-1.5 ml-7 text-xs text-slate-500 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto bg-white/60 rounded p-2">
          {item.content}
        </div>
      )}
    </div>
  );
}

// ============ 主组件 ============

interface LogStreamProps {
  currentPhase: AuditPhase;
  completedPhases: AuditPhase[];
  isRunning: boolean;
  isComplete: boolean;
  phaseLogMap: Record<string, LogItem[]>;
  expandedLogIds: Set<string>;
  onToggleLogExpanded: (id: string) => void;
  isAutoScroll: boolean;
  onToggleAutoScroll: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const LogStream = memo(function LogStream({
  currentPhase,
  completedPhases,
  isRunning,
  isComplete,
  phaseLogMap,
  expandedLogIds,
  onToggleLogExpanded,
  isAutoScroll,
  onToggleAutoScroll,
  scrollRef,
}: LogStreamProps) {
  const startedPhases = AUDIT_PHASES.filter((phase) => {
    if (completedPhases.includes(phase)) return true;
    if (phase === currentPhase) return true;
    if (isComplete) return true;
    return false;
  });

  const totalLogs = Object.values(phaseLogMap).reduce((sum, logs) => sum + logs.length, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">审计日志</h3>
          <span className="text-xs text-slate-400">{totalLogs} 条记录</span>
        </div>
        <button
          onClick={onToggleAutoScroll}
          className={`
            text-xs px-2.5 py-1 rounded-lg font-medium transition-colors
            ${isAutoScroll
              ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
              : "text-slate-400 border border-slate-200 hover:bg-slate-50"
            }
          `}
        >
          {isAutoScroll ? "自动滚动 开" : "自动滚动 关"}
        </button>
      </div>

      {/* 日志流 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
        {startedPhases.length === 0 && (
          <div className="py-12 text-center">
            <ScrollText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              {isRunning ? "等待活动..." : "暂无活动记录"}
            </p>
          </div>
        )}

        {startedPhases.map((phase) => {
          const isCompleted = completedPhases.includes(phase) || (isComplete && phase === currentPhase);
          const isActive = phase === currentPhase && !isCompleted;
          const logs = phaseLogMap[phase] || [];
          const config = AUDIT_PHASE_CONFIG[phase];

          return (
            <div key={phase}>
              {/* 阶段分隔线 */}
              <div className={`
                flex items-center gap-2 py-2 mb-1
                ${isActive ? 'text-indigo-600' : 'text-slate-500'}
              `}>
                <span className="text-xs font-semibold">{config.icon} {config.label}阶段开始</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* 日志条目 */}
              {logs.length > 0 && (
                <div>
                  {logs.map((item) => (
                    <LogCard
                      key={item.id}
                      item={item}
                      isExpanded={expandedLogIds.has(item.id)}
                      onToggle={() => onToggleLogExpanded(item.id)}
                    />
                  ))}
                </div>
              )}

              {/* 活跃阶段无日志 */}
              {isActive && logs.length === 0 && (
                <div className="py-3 text-center text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-400" />
                  等待活动...
                </div>
              )}

              {/* 阶段结束标记 */}
              {isCompleted && (
                <div className="flex items-center gap-2 py-2 mt-1">
                  <span className="text-xs text-emerald-600 font-medium">{config.label}阶段结束</span>
                  <div className="flex-1 h-px bg-emerald-200" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default LogStream;