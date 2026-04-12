/**
 * Status Badge Component
 * Enterprise status indicator
 */

import { memo } from "react";
import { CheckCircle2, XCircle, Clock, Loader2, Square, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

const STATUS_CONFIG: Record<string, {
  icon: React.ReactNode;
  iconSm: React.ReactNode;
  bg: string;
  text: string;
  label: string;
}> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    iconSm: <Clock className="h-3 w-3" />,
    bg: "bg-slate-100 border-slate-200",
    text: "text-slate-700",
    label: "待处理",
  },
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    iconSm: <Loader2 className="h-3 w-3 animate-spin" />,
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    label: "运行中",
  },
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    iconSm: <CheckCircle2 className="h-3 w-3" />,
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    label: "已完成",
  },
  failed: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    iconSm: <XCircle className="h-3 w-3" />,
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    label: "失败",
  },
  cancelled: {
    icon: <Square className="h-3.5 w-3.5" />,
    iconSm: <Square className="h-3 w-3" />,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    label: "已取消",
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    iconSm: <AlertCircle className="h-3 w-3" />,
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    label: "异常",
  },
};

export const StatusBadge = memo(function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isSmall = size === "sm";

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        transition-all duration-300
        ${config.bg}
        ${config.text}
        ${isSmall ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs"}
      `}
    >
      {isSmall ? config.iconSm : config.icon}
      <span>{config.label}</span>
    </div>
  );
});

export default StatusBadge;
