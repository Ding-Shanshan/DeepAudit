/**
 * Stats Panel Component - Compact version for the right sidebar
 * Shows progress, key metrics, and severity distribution
 */

import { memo } from "react";
import { Activity, FileCode, Repeat, Zap, Bug, Shield, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StatsPanelProps } from "../types";

function MetricRow({
  icon,
  label,
  value,
  suffix = "",
  colorClass = "text-muted-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={colorClass}>{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">
        {value}
        <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>
      </span>
    </div>
  );
}

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "emerald";
    if (score >= 60) return "amber";
    return "rose";
  };

  return (
    <div className="space-y-3">
      {/* 执行进度 */}
      <div className="rounded-lg border border-border bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">执行进度</span>
          </div>
          <span className="text-sm font-bold text-primary">{progressPercent.toFixed(0)}%</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 overflow-hidden rounded-full bg-muted border border-border/30">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <FileCode className="w-3 h-3 inline mr-1" />
            已扫描
          </span>
          <span className="font-semibold text-foreground">
            {task.analyzed_files}
            <span className="text-muted-foreground"> / {task.total_files}</span>
          </span>
        </div>
      </div>

      {/* 统计指标 */}
      <div className="rounded-lg border border-border bg-white p-3">
        <MetricRow
          icon={<Repeat className="w-3.5 h-3.5" />}
          label="迭代次数"
          value={task.total_iterations || 0}
          colorClass="text-teal-500"
        />
        <MetricRow
          icon={<Zap className="w-3.5 h-3.5" />}
          label="工具调用"
          value={task.tool_calls_count || 0}
          colorClass="text-amber-500"
        />
        <MetricRow
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Token 使用"
          value={((task.tokens_used || 0) / 1000).toFixed(1)}
          suffix="k"
          colorClass="text-violet-500"
        />
        <MetricRow
          icon={<Bug className="w-3.5 h-3.5" />}
          label="问题总数"
          value={totalFindings}
          colorClass={totalFindings > 0 ? "text-rose-500" : "text-muted-foreground"}
        />
      </div>

      {/* 漏洞等级分布 */}
      {totalFindings > 0 && (
        <div className="rounded-lg border border-rose-100 bg-white p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold text-foreground">问题等级分布</span>
          </div>
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
        </div>
      )}

      {/* 安全评分 */}
      {task.security_score !== null && task.security_score !== undefined && (
        <div className="rounded-lg border border-border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield
                className={`w-4 h-4 ${
                  task.security_score >= 80 ? "text-emerald-500"
                    : task.security_score >= 60 ? "text-amber-500"
                    : "text-rose-500"
                }`}
              />
              <div>
                <span className="text-xs font-semibold text-foreground">安全评分</span>
                <span className="text-xs text-muted-foreground block">
                  {task.security_score >= 80 ? "整体风险较低"
                    : task.security_score >= 60 ? "仍需跟进部分问题"
                    : "建议优先处理高风险项"}
                </span>
              </div>
            </div>
            <span
              className={`text-xl font-bold ${
                task.security_score >= 80 ? "text-emerald-600"
                  : task.security_score >= 60 ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {task.security_score.toFixed(0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default StatsPanel;