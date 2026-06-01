/**
 * PhaseStepper Component - Terminal-style log stream
 * 所有阶段日志在同一个展示框内以终端日志风格输出，
 * 阶段开始/结束时打印阶段名称，日志纯文本无图标无边框
 */

import { memo } from "react";
import { Terminal } from "lucide-react";
import { AUDIT_PHASE_CONFIG, AUDIT_PHASES } from "../types";
import type { AuditPhase, LogItem } from "../types";

// ============ Log type display config ============

const LOG_LABELS: Record<string, { text: string; color: string }> = {
  thinking: { text: "思考", color: "text-slate-500" },
  tool: { text: "工具", color: "text-slate-500" },
  finding: { text: "漏洞", color: "text-slate-600" },
  dispatch: { text: "调度", color: "text-slate-500" },
  info: { text: "信息", color: "text-slate-400" },
  error: { text: "错误", color: "text-slate-700" },
  progress: { text: "进度", color: "text-slate-500" },
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-slate-700",
  high: "text-slate-600",
  medium: "text-slate-600",
  low: "text-slate-500",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "严重",
  high: "高危",
  medium: "中危",
  low: "低危",
};

function cleanTitle(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[✅🔗🛑✕⚠️❌⚡🔄🔍💡📁📄🐛🛡️🔧📤📊📦🔬]/g, "")
    .replace(/^[:\-–—•·\s]+/, "")
    .trim() || title;
}

// ============ Log row (pure text, no border, no icon) ============

function LogRow({
  item,
  isExpanded,
  onToggle,
}: {
  item: LogItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const typeInfo = LOG_LABELS[item.type] || LOG_LABELS.info;
  const title = cleanTitle(item.title);
  const isCollapsible = !!(item.content && item.type !== "thinking");
  const isThinking = item.type === "thinking";

  return (
    <div className="font-mono text-xs leading-4">
      <div className="flex items-center gap-2" onClick={isCollapsible ? onToggle : undefined}>
        <span className={`${typeInfo.color} flex-shrink-0`}>[{typeInfo.text}]</span>
        {item.time && (
          <span className="text-slate-400 tabular-nums flex-shrink-0">{item.time}</span>
        )}
        <span className={`truncate flex-1 text-slate-700`}>
          {isThinking && item.isStreaming ? (
            <>
              {title || "正在思考..."}
              <span className="inline-block w-1 h-3 bg-slate-400 rounded-sm ml-0.5 animate-pulse" />
            </>
          ) : title}
        </span>
        {item.isStreaming && !isThinking && (
          <span className="w-1 h-3 bg-slate-400 rounded-sm animate-pulse flex-shrink-0" />
        )}
        {item.tool?.status === "running" && (
          <span className="text-slate-500 flex-shrink-0">运行中</span>
        )}
        {item.tool?.status === "completed" && (
          <span className="text-slate-600 flex-shrink-0">
            完成{item.tool.duration ? ` ${item.tool.duration}ms` : ""}
          </span>
        )}
        {item.severity && (
          <span className={`flex-shrink-0 ${SEVERITY_COLOR[item.severity] || SEVERITY_COLOR.medium}`}>
            [{SEVERITY_LABEL[item.severity] || item.severity}]
          </span>
        )}
        {item.agentName && (
          <span className="text-slate-400 flex-shrink-0">@{item.agentName}</span>
        )}
        {isCollapsible && (
          <span className="text-slate-400 flex-shrink-0">{isExpanded ? "▼" : "▶"}</span>
        )}
      </div>
      {isThinking && item.content && (
        <div className="pl-4 text-slate-600 whitespace-pre-wrap break-words">
          {item.content}
        </div>
      )}
      {isCollapsible && isExpanded && item.content && (
        <div className="pl-4 py-0.5 text-slate-600 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
          {item.content}
        </div>
      )}
    </div>
  );
}

// ============ Main Component ============

interface PhaseStepperProps {
  currentPhase: AuditPhase;
  completedPhases: AuditPhase[];
  isRunning: boolean;
  isComplete: boolean;
  phaseLogMap: Record<string, LogItem[]>;
  expandedPhases: Set<AuditPhase>;
  onTogglePhaseExpanded: (phase: AuditPhase) => void;
  currentPhaseLogs: LogItem[];
  expandedLogIds: Set<string>;
  onToggleLogExpanded: (id: string) => void;
  isAutoScroll: boolean;
  onToggleAutoScroll: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const PhaseStepper = memo(function PhaseStepper({
  currentPhase,
  completedPhases,
  isRunning,
  isComplete,
  phaseLogMap,
  expandedPhases,
  onTogglePhaseExpanded,
  currentPhaseLogs,
  expandedLogIds,
  onToggleLogExpanded,
  isAutoScroll,
  onToggleAutoScroll,
  scrollRef,
}: PhaseStepperProps) {
  const startedPhases = AUDIT_PHASES.filter((phase) => {
    if (completedPhases.includes(phase)) return true;
    if (phase === currentPhase) return true;
    if (isComplete) return true;
    return false;
  });

  const totalLogs = Object.values(phaseLogMap).reduce((sum, logs) => sum + logs.length, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-4 overflow-hidden flex flex-col min-h-0">
      {/* Section header */}
      <div className="section-header !mb-1 !pb-1 !gap-2 !border-b-0">
        <Terminal className="w-4 h-4 text-primary" />
        <h3 className="section-title text-sm">日志详情</h3>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0 py-1">
        <span className="text-xs font-mono text-muted-foreground">{totalLogs} 条记录</span>
        <button
          onClick={onToggleAutoScroll}
          className={`
            text-xs px-2 py-1 rounded-md font-mono transition-colors
            ${isAutoScroll
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground border border-border hover:bg-muted"
            }
          `}
        >
          自动滚动
        </button>
      </div>

      {/* Terminal-style log stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {startedPhases.length === 0 && (
          <div className="py-8 text-center font-mono text-xs text-muted-foreground">
            {isRunning ? "等待活动..." : "暂无活动记录"}
          </div>
        )}

        {startedPhases.map((phase) => {
          const isCompleted = completedPhases.includes(phase) || (isComplete && phase === currentPhase);
          const isActive = phase === currentPhase && !isCompleted;
          const logs = phaseLogMap[phase] || [];
          const config = AUDIT_PHASE_CONFIG[phase];

          return (
            <div key={phase}>
              {/* Phase start line */}
              <div className="font-mono text-xs leading-4 text-slate-800 font-semibold">
                --- {config.label}阶段开始 ---
              </div>

              {/* Phase logs */}
              {logs.length > 0 && (
                <div className="pl-2">
                  {logs.map((item) => (
                    <LogRow
                      key={item.id}
                      item={item}
                      isExpanded={expandedLogIds.has(item.id)}
                      onToggle={() => onToggleLogExpanded(item.id)}
                    />
                  ))}
                </div>
              )}

              {/* Active phase with no logs yet */}
              {isActive && logs.length === 0 && (
                <div className="pl-2 font-mono text-xs text-muted-foreground">
                  等待活动...
                </div>
              )}

              {/* Phase end line (only for completed phases) */}
              {isCompleted && (
                <div className="font-mono text-xs leading-4 text-slate-600 font-semibold">
                  --- {config.label}阶段结束 ---
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default PhaseStepper;
