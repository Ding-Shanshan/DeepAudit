/**
 * 统计面板组件
 * 深色背景，渐变进度条，全中文标签
 */

import { memo } from "react";
import { Activity, FileCode, Bug } from "lucide-react";
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
    <div className="space-y-4">
      {/* 执行进度 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-xs font-medium text-slate-300">执行进度</span>
          </div>
          <span className="text-sm font-bold text-white">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <FileCode className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-400">
            已分析 <span className="text-slate-300">{task.analyzed_files}</span> / {task.total_files} 文件
          </span>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-slate-700/60" />

      {/* 问题统计 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bug className="w-3.5 h-3.5 text-rose-300" />
            <span className="text-xs font-medium text-slate-300">问题总数</span>
          </div>
          <span className={`text-sm font-bold ${totalFindings > 0 ? "text-rose-400" : "text-slate-300"}`}>
            {totalFindings}
          </span>
        </div>

        {totalFindings > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {severityCounts.critical > 0 && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-rose-500/15 border border-rose-500/20">
                <span className="text-xs text-rose-300">严重</span>
                <span className="text-xs font-bold text-rose-400">{severityCounts.critical}</span>
              </div>
            )}
            {severityCounts.high > 0 && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-orange-500/15 border border-orange-500/20">
                <span className="text-xs text-orange-300">高危</span>
                <span className="text-xs font-bold text-orange-400">{severityCounts.high}</span>
              </div>
            )}
            {severityCounts.medium > 0 && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/20">
                <span className="text-xs text-amber-300">中危</span>
                <span className="text-xs font-bold text-amber-400">{severityCounts.medium}</span>
              </div>
            )}
            {severityCounts.low > 0 && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-sky-500/15 border border-sky-500/20">
                <span className="text-xs text-sky-300">低危</span>
                <span className="text-xs font-bold text-sky-400">{severityCounts.low}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-2">暂无问题</div>
        )}
      </div>
    </div>
  );
});

export default StatsPanel;