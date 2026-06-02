/**
 * Phase Detail Component
 * 按阶段分组展示审计活动 - 当前阶段实时流 + 已完成阶段折叠摘要
 */

import { useState, useEffect, useRef, memo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Wrench,
  Bug,
  Zap,
  Terminal,
  AlertTriangle,
  Shield,
  CheckCircle2,
  Loader2,
  FileCode,
  Cpu,
  Scan,
  FileSearch,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AUDIT_PHASES, AUDIT_PHASE_CONFIG } from "../types";
import type { AuditPhase, LogItem } from "../types";

// ============ Log Type Human Labels ============

const LOG_HUMAN_LABELS: Record<string, { icon: React.ReactNode; label: string; colorClass: string }> = {
  thinking: {
    icon: <Brain className="w-3.5 h-3.5" />,
    label: "思考",
    colorClass: "text-violet-600 bg-violet-50 border-violet-200",
  },
  tool: {
    icon: <Wrench className="w-3.5 h-3.5" />,
    label: "工具",
    colorClass: "text-amber-600 bg-amber-50 border-amber-200",
  },
  finding: {
    icon: <Bug className="w-3.5 h-3.5" />,
    label: "漏洞",
    colorClass: "text-rose-600 bg-rose-50 border-rose-200",
  },
  dispatch: {
    icon: <Zap className="w-3.5 h-3.5" />,
    label: "调度",
    colorClass: "text-sky-600 bg-sky-50 border-sky-200",
  },
  info: {
    icon: <Terminal className="w-3.5 h-3.5" />,
    label: "信息",
    colorClass: "text-slate-600 bg-slate-50 border-slate-200",
  },
  error: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: "错误",
    colorClass: "text-red-600 bg-red-50 border-red-200",
  },
  progress: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    label: "进度",
    colorClass: "text-cyan-600 bg-cyan-50 border-cyan-200",
  },
  phase: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "阶段",
    colorClass: "text-teal-600 bg-teal-50 border-teal-200",
  },
  user: {
    icon: <Shield className="w-3.5 h-3.5" />,
    label: "用户",
    colorClass: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
};

// ============ Clean title (remove emojis) ============

function cleanTitle(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[✅🔗🛑✕⚠️❌⚡🔄🔍💡📁📄🐛🛡️🔧📤📊📦🔬]/g, "")
    .replace(/^[:\-–—•·\s]+/, "")
    .trim() || title;
}

// ============ Severity Badge ============

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700 border-rose-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  low: "bg-sky-100 text-sky-700 border-sky-300",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "严重",
  high: "高危",
  medium: "中危",
  low: "低危",
};

// ============ Single Log Row ============

function ActivityRow({
  item,
  isExpanded,
  onToggle,
}: {
  item: LogItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const typeConfig = LOG_HUMAN_LABELS[item.type] || LOG_HUMAN_LABELS.info;
  const isCollapsible = !!(item.content && item.type !== "thinking");
  const isFinding = item.type === "finding";
  const isError = item.type === "error";
  const isThinking = item.type === "thinking";
  const title = cleanTitle(item.title);

  return (
    <div
      className={`
        group rounded-md border transition-all duration-200
        ${isFinding ? "bg-rose-50/80 border-rose-200/80" : ""}
        ${isError ? "bg-red-50/80 border-red-200/80" : ""}
        ${isThinking ? "bg-violet-50/50 border-violet-200/50" : ""}
        ${!isFinding && !isError && !isThinking ? "bg-white border-slate-200/80 hover:border-slate-300" : ""}
        ${isCollapsible ? "cursor-pointer" : ""}
      `}
      onClick={isCollapsible ? onToggle : undefined}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Type badge */}
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${typeConfig.colorClass}`}
        >
          {typeConfig.icon}
          <span className="hidden sm:inline">{typeConfig.label}</span>
        </span>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground font-mono tabular-nums flex-shrink-0">
          {item.time}
        </span>

        {/* Title */}
        <span
          className={`text-sm truncate flex-1 ${
            isError ? "text-red-700 font-medium" : isFinding ? "text-rose-700 font-medium" : "text-foreground"
          }`}
        >
          {isThinking && item.isStreaming ? (
            <>
              {title || "正在思考..."}
              <span className="inline-block w-1.5 h-4 bg-violet-500 rounded-sm ml-1 animate-pulse" />
            </>
          ) : (
            title
          )}
        </span>

        {/* Streaming cursor */}
        {item.isStreaming && !isThinking && (
          <span className="w-1.5 h-4 bg-primary rounded-sm animate-pulse flex-shrink-0" />
        )}

        {/* Tool status */}
        {item.tool?.status === "running" && (
          <span className="flex items-center gap-1 text-xs text-amber-600 flex-shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
            运行中
          </span>
        )}
        {item.tool?.status === "completed" && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            {item.tool.duration ? `${item.tool.duration}ms` : "完成"}
          </span>
        )}

        {/* Severity */}
        {item.severity && (
          <Badge
            className={`text-xs font-semibold px-1.5 py-0 border flex-shrink-0 ${
              SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.medium
            }`}
          >
            {SEVERITY_LABEL[item.severity] || item.severity}
          </Badge>
        )}

        {/* Agent badge */}
        {item.agentName && (
          <Badge
            variant="outline"
            className="text-xs px-1.5 py-0 border-primary/30 text-primary bg-primary/5 flex-shrink-0"
          >
            {item.agentName}
          </Badge>
        )}

        {/* Expand indicator */}
        {isCollapsible && (
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </div>

      {/* Thinking content */}
      {isThinking && item.content && (
        <div className="px-3 pb-2">
          <div className="relative pl-3 border-l-2 border-violet-300">
            <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
              {item.content}
            </p>
          </div>
        </div>
      )}

      {/* Collapsible content */}
      {isCollapsible && isExpanded && item.content && (
        <div className="px-3 pb-2">
          <pre className="text-xs font-mono text-foreground/75 bg-muted/50 rounded p-2 border border-border max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
            {item.content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============ Phase Summary Card ============

function PhaseSummaryCard({
  phase,
  logs,
  isExpanded,
  onToggle,
}: {
  phase: AuditPhase;
  logs: LogItem[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = AUDIT_PHASE_CONFIG[phase];
  const findingsCount = logs.filter((l) => l.type === "finding").length;
  const toolCount = logs.filter((l) => l.type === "tool").length;
  const errorCount = logs.filter((l) => l.type === "error").length;

  // Agent icon map for phase
  const phaseIcons: Record<string, React.ReactNode> = {
    preparation: <FileCode className="w-4 h-4" />,
    recon: <Scan className="w-4 h-4" />,
    analysis: <FileSearch className="w-4 h-4" />,
    verification: <ShieldCheck className="w-4 h-4" />,
    reporting: <Cpu className="w-4 h-4" />,
  };

  return (
    <div className="border border-emerald-200/80 bg-emerald-50/50 rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-emerald-50 transition-colors"
        onClick={onToggle}
      >
        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-emerald-700">
            {config.icon} {config.label}阶段
          </span>
          <span className="text-xs text-emerald-600/70 ml-2">已完成</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {findingsCount > 0 && (
            <Badge className="text-xs bg-rose-100 text-rose-700 border-rose-200 px-1.5 py-0">
              {findingsCount} 漏洞
            </Badge>
          )}
          {toolCount > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 px-1.5 py-0">
              {toolCount} 工具
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge className="text-xs bg-red-100 text-red-700 border-red-200 px-1.5 py-0">
              {errorCount} 错误
            </Badge>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-emerald-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-emerald-600" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-1.5 max-h-64 overflow-y-auto border-t border-emerald-200/50">
          {logs.map((item) => (
            <ActivityRow
              key={item.id}
              item={item}
              isExpanded={false}
              onToggle={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Main PhaseDetail Component ============

interface PhaseDetailProps {
  logs: LogItem[];
  currentPhase: AuditPhase;
  completedPhases: AuditPhase[];
  isRunning: boolean;
  expandedLogIds: Set<string>;
  onToggleLogExpanded: (id: string) => void;
}

export const PhaseDetail = memo(function PhaseDetail({
  logs,
  currentPhase,
  completedPhases,
  isRunning,
  expandedLogIds,
  onToggleLogExpanded,
}: PhaseDetailProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<AuditPhase>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // 按阶段分组日志
  const phaseLogMap: Record<string, LogItem[]> = {};
  for (const phase of AUDIT_PHASES) {
    phaseLogMap[phase] = [];
  }
  for (const log of logs) {
    const phase = log.phase || currentPhase;
    if (!phaseLogMap[phase]) phaseLogMap[phase] = [];
    phaseLogMap[phase].push(log);
  }

  const currentPhaseLogs = phaseLogMap[currentPhase] || [];

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentPhaseLogs.length, isAutoScroll]);

  const togglePhaseExpanded = (phase: AuditPhase) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col">
      {/* Compact toolbar */}
      <div className="flex items-center justify-between flex-shrink-0 py-2">
        <Badge variant="outline" className="text-xs h-6 px-2 font-sans">
          {currentPhaseLogs.length} 条记录
        </Badge>
        <button
          onClick={() => setIsAutoScroll(!isAutoScroll)}
          className={`
            text-xs px-2 py-1 rounded-md font-medium transition-colors
            ${isAutoScroll
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground border border-border hover:bg-muted"
            }
          `}
        >
          自动滚动
        </button>
      </div>

      {/* Log scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {/* 已完成阶段（折叠摘要） */}
        {AUDIT_PHASES.filter(
          (p) => completedPhases.includes(p) && p !== currentPhase
        ).map((phase) => (
          <PhaseSummaryCard
            key={phase}
            phase={phase}
            logs={phaseLogMap[phase] || []}
            isExpanded={expandedPhases.has(phase)}
            onToggle={() => togglePhaseExpanded(phase)}
          />
        ))}

        {/* 当前阶段 - 实时活动流 */}
        {currentPhaseLogs.length > 0 ? (
          <div className="space-y-1.5">
            {currentPhaseLogs.map((item) => (
              <ActivityRow
                key={item.id}
                item={item}
                isExpanded={expandedLogIds.has(item.id)}
                onToggle={() => onToggleLogExpanded(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <div className="text-center">
              {isRunning ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">等待活动...</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">暂无活动记录</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default PhaseDetail;