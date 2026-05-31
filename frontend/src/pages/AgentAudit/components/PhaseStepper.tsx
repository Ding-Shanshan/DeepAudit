/**
 * Phase Stepper Component
 * Horizontal progress bar showing audit execution phases
 * 让用户一眼看出任务执行到了哪个阶段
 */

import { memo } from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { AUDIT_PHASE_CONFIG, AUDIT_PHASES } from "../types";
import type { AuditPhase } from "../types";

interface PhaseStepperProps {
  currentPhase: AuditPhase;
  completedPhases: AuditPhase[];
  isRunning: boolean;
  isComplete: boolean;
}

function PhaseStep({
  phase,
  status,
  isLast,
  isFirst,
}: {
  phase: AuditPhase;
  status: "completed" | "active" | "pending";
  isLast: boolean;
  isFirst: boolean;
}) {
  const config = AUDIT_PHASE_CONFIG[phase];

  return (
    <div className="flex flex-col items-center relative flex-1 min-w-0">
      {/* 上层：连接线 + 图标 */}
      <div className="flex items-center justify-center w-full h-10 relative">
        {/* 左侧连接线 - 到上一个阶段 */}
        {!isFirst && (
          <div
            className={`
              absolute left-0 right-1/2 h-0.5 transition-all duration-500
              ${status === "completed" || status === "active"
                ? "bg-emerald-500"
                : "bg-border"
              }
            `}
          />
        )}

        {/* 右侧连接线 - 到下一个阶段 */}
        {!isLast && (
          <div
            className={`
              absolute left-1/2 right-0 h-0.5 transition-all duration-500
              ${status === "completed"
                ? "bg-emerald-500"
                : status === "active"
                  ? "bg-primary/50"
                  : "bg-border"
              }
            `}
          />
        )}

        {/* Icon circle - 居中 */}
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10
            ${status === "completed"
              ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
              : status === "active"
                ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/25"
                : "border-border bg-muted text-muted-foreground"
            }
          `}
        >
          {status === "completed" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : status === "active" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* 下层：标签和描述 - 与图标纵向对齐居中 */}
      <div className="mt-2 text-center min-w-0 px-2 max-w-[160px]">
        <span
          className={`
            text-sm font-semibold block truncate
            ${status === "completed"
              ? "text-emerald-600"
              : status === "active"
                ? "text-primary"
                : "text-muted-foreground"
            }
          `}
        >
          {config.icon} {config.label}
        </span>
        <span
          className={`
            text-xs block mt-0.5 line-clamp-2
            ${status === "completed"
              ? "text-emerald-600/70"
              : status === "active"
                ? "text-primary/70"
                : "text-muted-foreground/50"
            }
          `}
        >
          {config.description}
        </span>
      </div>
    </div>
  );
}

export const PhaseStepper = memo(function PhaseStepper({
  currentPhase,
  completedPhases,
  isRunning,
  isComplete,
}: PhaseStepperProps) {
  const currentIndex = AUDIT_PHASES.indexOf(currentPhase);

  return (
    <div className="flex-shrink-0 border-b border-border bg-white/90 backdrop-blur-sm px-6 py-4">
      <div className="flex items-stretch justify-center max-w-3xl mx-auto">
        {AUDIT_PHASES.map((phase, index) => {
          let status: "completed" | "active" | "pending";

          if (isComplete) {
            status = "completed";
          } else if (completedPhases.includes(phase)) {
            status = "completed";
          } else if (phase === currentPhase && isRunning) {
            status = "active";
          } else if (index < currentIndex) {
            status = "completed";
          } else {
            status = "pending";
          }

          return (
            <PhaseStep
              key={phase}
              phase={phase}
              status={status}
              isFirst={index === 0}
              isLast={index === AUDIT_PHASES.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
});

export default PhaseStepper;