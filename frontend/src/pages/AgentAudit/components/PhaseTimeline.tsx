/**
 * 阶段时间线组件
 * 左侧面板中的垂直阶段时间线，含图标、标签、状态指示
 */

import { memo } from "react";
import {
  Settings2, Eye, Microscope, ShieldAlert, FileText,
  Check, Loader2
} from "lucide-react";
import { AUDIT_PHASE_CONFIG, AUDIT_PHASES } from "../types";
import type { AuditPhase } from "../types";

// 阶段图标映射
const PHASE_ICONS: Record<AuditPhase, React.ReactNode> = {
  preparation: <Settings2 className="w-4 h-4" />,
  recon: <Eye className="w-4 h-4" />,
  analysis: <Microscope className="w-4 h-4" />,
  verification: <ShieldAlert className="w-4 h-4" />,
  reporting: <FileText className="w-4 h-4" />,
};

interface PhaseTimelineProps {
  currentPhase: AuditPhase;
  completedPhases: AuditPhase[];
  isRunning: boolean;
  isComplete: boolean;
  phaseLogMap: Record<string, unknown[]>;
}

export const PhaseTimeline = memo(function PhaseTimeline({
  currentPhase,
  completedPhases,
  isRunning,
  isComplete,
  phaseLogMap,
}: PhaseTimelineProps) {
  return (
    <div className="space-y-0">
      {AUDIT_PHASES.map((phase, index) => {
        const isCompleted = completedPhases.includes(phase) || (isComplete && phase === currentPhase);
        const isActive = phase === currentPhase && !isCompleted;
        const isPending = !isCompleted && !isActive;
        const config = AUDIT_PHASE_CONFIG[phase];
        const logCount = (phaseLogMap[phase] || []).length;

        return (
          <div key={phase} className="relative">
            {/* 连接线 */}
            {index < AUDIT_PHASES.length - 1 && (
              <div className={`absolute left-[15px] top-[34px] w-0.5 h-[calc(100%-18px)] ${
                isCompleted ? 'bg-emerald-500/60' : 'bg-slate-700'
              }`} />
            )}

            {/* 阶段节点 */}
            <div className="flex items-start gap-3 pb-4">
              {/* 状态圆 */}
              <div className={`
                relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full flex-shrink-0
                transition-all duration-300
                ${isCompleted
                  ? 'bg-emerald-500/20 border-2 border-emerald-500'
                  : isActive
                    ? 'bg-indigo-500/20 border-2 border-indigo-400'
                    : 'bg-slate-800 border-2 border-slate-700'
                }
              `}>
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : isActive ? (
                  <div className="text-indigo-300">
                    {PHASE_ICONS[phase]}
                  </div>
                ) : (
                  <div className="text-slate-600">
                    {PHASE_ICONS[phase]}
                  </div>
                )}

                {/* 活动脉冲 */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-30" />
                )}
              </div>

              {/* 标签+描述 */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    isCompleted ? 'text-emerald-300' :
                    isActive ? 'text-white' :
                    'text-slate-500'
                  }`}>
                    {config.label}
                  </span>
                  {logCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isCompleted ? 'bg-emerald-500/10 text-emerald-400' :
                      isActive ? 'bg-indigo-500/10 text-indigo-300' :
                      'bg-slate-800 text-slate-500'
                    }`}>
                      {logCount}
                    </span>
                  )}
                </div>
                <p className={`text-[11px] mt-0.5 leading-tight ${
                  isActive ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {config.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default PhaseTimeline;