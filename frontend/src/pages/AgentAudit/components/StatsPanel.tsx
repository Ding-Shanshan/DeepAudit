/**
 * Stats Panel Component
 * Workspace statistics panel
 */

import { memo } from "react";
import { Activity, FileCode, Repeat, Zap, Bug, Shield, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StatsPanelProps } from "../types";

function CircularProgress({
  value,
  size = 52,
  strokeWidth = 4,
  color = "primary",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colorMap: Record<string, { stroke: string }> = {
    primary: { stroke: "#F97316" },
    emerald: { stroke: "#16A34A" },
    rose: { stroke: "#DC2626" },
    amber: { stroke: "#D97706" },
  };

  const colors = colorMap[color] || colorMap.primary;

  return (
    <svg width={size} height={size} className="-rotate-90 transform">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(148,163,184,0.22)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

function MetricCard({
  icon,
  label,
  value,
  suffix = "",
  colorClass = "text-muted-foreground",
  bgClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  colorClass?: string;
  bgClass?: string;
}) {
  return (
    <div
      className={`
        group relative flex items-center gap-3 rounded-lg border border-border bg-white p-3.5
        transition-all duration-300 hover:border-primary/15 hover:shadow-sm
        ${bgClass}
      `}
    >
      <div className={`relative z-10 rounded-md border border-border bg-slate-50 p-2 ${colorClass}`}>
        {icon}
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="mb-0.5 truncate text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold leading-tight text-foreground">
          {value}
          <span className="ml-0.5 text-sm text-muted-foreground">{suffix}</span>
        </div>
      </div>
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
      <div className="relative overflow-hidden rounded-lg border border-border bg-white p-4 shadow-sm">
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-md border border-primary/10 bg-orange-50 p-1.5">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">执行进度</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-primary">{progressPercent.toFixed(0)}</span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="relative h-3 overflow-hidden rounded-full border border-border/30 bg-muted/50">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
              style={{
                width: `${progressPercent}%`,
                animation: "shine 2s ease-in-out infinite",
              }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileCode className="h-4 w-4" />
              <span className="font-medium">已扫描文件</span>
            </div>
            <span className="font-semibold text-foreground">
              {task.analyzed_files}
              <span className="font-normal text-muted-foreground"> / {task.total_files}</span>
            </span>
          </div>

          {task.files_with_findings > 0 && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span className="font-medium">发现问题的文件</span>
              </div>
              <span className="font-semibold text-rose-500">{task.files_with_findings}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          icon={<Repeat className="h-4 w-4" />}
          label="迭代次数"
          value={task.total_iterations || 0}
          colorClass="text-teal-500"
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="工具调用"
          value={task.tool_calls_count || 0}
          colorClass="text-amber-500"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Token 使用"
          value={((task.tokens_used || 0) / 1000).toFixed(1)}
          suffix="k"
          colorClass="text-violet-500"
        />
        <MetricCard
          icon={<Bug className="h-4 w-4" />}
          label="问题总数"
          value={totalFindings}
          colorClass={totalFindings > 0 ? "text-rose-500" : "text-muted-foreground"}
          bgClass={totalFindings > 0 ? "border-rose-100" : ""}
        />
      </div>

      {totalFindings > 0 && (
        <div className="relative overflow-hidden rounded-lg border border-rose-100 bg-white p-4 shadow-sm">
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="rounded-md border border-rose-200 bg-rose-50 p-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">问题等级分布</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {severityCounts.critical > 0 && (
                <Badge className="border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                  严重 {severityCounts.critical}
                </Badge>
              )}
              {severityCounts.high > 0 && (
                <Badge className="border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                  高危 {severityCounts.high}
                </Badge>
              )}
              {severityCounts.medium > 0 && (
                <Badge className="border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  中危 {severityCounts.medium}
                </Badge>
              )}
              {severityCounts.low > 0 && (
                <Badge className="border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  低危 {severityCounts.low}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {task.security_score !== null && task.security_score !== undefined && (
        <div className="relative overflow-hidden rounded-lg border border-border bg-white p-4 shadow-sm">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`rounded-md border p-1.5 ${
                  task.security_score >= 80
                    ? "border-emerald-200 bg-emerald-50"
                    : task.security_score >= 60
                      ? "border-amber-200 bg-amber-50"
                      : "border-rose-200 bg-rose-50"
                }`}
              >
                <Shield
                  className={`h-4 w-4 ${
                    task.security_score >= 80
                      ? "text-primary"
                      : task.security_score >= 60
                        ? "text-amber-500"
                        : "text-rose-500"
                  }`}
                />
              </div>
              <div>
                <span className="block text-sm font-semibold text-foreground">安全评分</span>
                <span className="text-xs text-muted-foreground">
                  {task.security_score >= 80
                    ? "整体风险较低"
                    : task.security_score >= 60
                      ? "仍需跟进部分问题"
                      : "建议优先处理高风险项"}
                </span>
              </div>
            </div>
            <div className="relative">
              <CircularProgress
                value={task.security_score}
                size={56}
                strokeWidth={4}
                color={getScoreColor(task.security_score)}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-base font-semibold ${
                    task.security_score >= 80
                      ? "text-primary"
                      : task.security_score >= 60
                        ? "text-amber-500"
                        : "text-rose-500"
                  }`}
                >
                  {task.security_score.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
});

export default StatsPanel;
