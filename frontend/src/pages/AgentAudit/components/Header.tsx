/**
 * Header Component
 * Enterprise workspace header
 */

import { Square, Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import type { HeaderProps } from "../types";

export function Header({
  task,
  isRunning,
  isCancelling,
  onCancel,
}: HeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-4">
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-5">
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
      </div>
    </div>
    </div>
  );
}

export default Header;
