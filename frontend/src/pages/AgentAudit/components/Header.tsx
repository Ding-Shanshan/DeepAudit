/**
 * 顶部栏组件
 * 深色渐变背景，白色文字，全中文标签
 */

import { Square, Loader2, Download, Wifi, WifiOff } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { HeaderProps } from "../types";

export function Header({
  task,
  isRunning,
  isCancelling,
  onCancel,
}: HeaderProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 px-6 py-3.5">
      <div className="flex items-center justify-between">
        {/* 左侧：任务信息 */}
        <div className="flex items-center gap-4">
          {task && (
            <div className="flex items-center gap-3">
              <span className="max-w-[320px] truncate text-white font-semibold text-base">
                {task.name || task.id.slice(0, 8)}
              </span>
              <StatusBadge status={task.status} size="sm" />
            </div>
          )}
        </div>

        {/* 右侧：状态+操作 */}
        <div className="flex items-center gap-3">
          {/* 连接状态指示 */}
          {isRunning && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-300">实时</span>
            </div>
          )}

          {/* 终止按钮 */}
          {isRunning && (
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className="
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-white/10 text-white border border-white/20
                hover:bg-rose-500/30 hover:border-rose-400/40 hover:text-rose-100
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在终止</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  <span>终止审计</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;