/**
 * Stats Panel Component
 * Shows execution progress and issue count
 */

import { memo } from "react";
import { Activity, FileCode, Bug, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StatsPanelProps } from "../types";

export const StatsPanel = memo(function StatsPanel({ task }: StatsPanelProps) {
  if (!task) return null;

  const severityCounts = {
    critical: task.critical_count || 0,
    high: task.high_count || 0,
    medium: task.medium_count || 0,
    low: task.low_count || 0,
  };
  const totalFindings = task.findings_count || 0;
  const progressPercent = task.progress_percentage || 0;

  return (
    <div className="flex gap-4">
      {/* 执行进度 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-5 flex-1 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="section-title text-sm">执行进度</h3>
          <span className="text-sm font-bold text-primary">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="flex-1 relative h-1.5 overflow-hidden rounded-full bg-muted border border-border/30">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          <FileCode className="w-3 h-3 inline mr-1" />
          {task.analyzed_files}<span className="text-muted-foreground"> / {task.total_files}</span>
        </span>
      </div>

      {/* 问题数 */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-5 flex-1 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Bug className="w-4 h-4 text-primary" />
          <h3 className="section-title text-sm">问题总数</h3>
          <span className={`text-sm font-bold ${totalFindings > 0 ? "text-rose-600" : "text-foreground"}`}>
            {totalFindings}
          </span>
        </div>
        {totalFindings > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {severityCounts.critical > 0 && (
              <Badge className="border bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 border-rose-200">
                严重 {severityCounts.critical}
              </Badge>
            )}
            {severityCounts.high > 0 && (
              <Badge className="border bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 border-orange-200">
                高危 {severityCounts.high}
              </Badge>
            )}
            {severityCounts.medium > 0 && (
              <Badge className="border bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 border-amber-200">
                中危 {severityCounts.medium}
              </Badge>
            )}
            {severityCounts.low > 0 && (
              <Badge className="border bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 border-sky-200">
                低危 {severityCounts.low}
              </Badge>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">暂无问题</div>
        )}
      </div>
    </div>
  );
});

export default StatsPanel;