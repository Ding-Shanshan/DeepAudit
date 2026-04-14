/**
 * Header Component
 * Enterprise workspace header
 */

import { Square, Download, Loader2, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import type { HeaderProps } from "../types";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/shared/constants/branding";

export function Header({
  task,
  isRunning,
  isCancelling,
  onCancel,
  onExport,
  onNewAudit,
}: HeaderProps) {
  return (
    <header className="relative flex h-20 shrink-0 items-center justify-between border-b border-border bg-white/88 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3 border-r border-border pr-5">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/12 to-white shadow-sm">
            <img src={BRAND_LOGO_PATH} alt={BRAND_NAME} className="h-5 w-5 object-contain" />
            {isRunning && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold leading-tight text-foreground">
              {BRAND_NAME}
            </span>
            <span className="text-xs text-muted-foreground">智能安全审计工作区</span>
          </div>
        </div>

        {task && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1.5">
              <Radio className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">当前任务</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="max-w-[240px] truncate text-sm font-medium text-foreground">
                {task.name || task.id.slice(0, 8)}
              </span>
              <StatusBadge status={task.status} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isRunning && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
            className="h-10 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                <span>停止中</span>
              </>
            ) : (
              <>
                <Square className="mr-2 h-3.5 w-3.5" />
                <span>停止任务</span>
              </>
            )}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!task}
          className="h-10"
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          <span>导出报告</span>
        </Button>

        <Button size="sm" onClick={onNewAudit} className="h-10">
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          <span>新建审计</span>
        </Button>
      </div>
    </header>
  );
}

export default Header;
