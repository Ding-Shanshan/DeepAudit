/**
 * Sidebar Component
 * Enterprise console navigation
 */

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LayoutDashboard,
  FolderGit2,
  Zap,
  ListTodo,
  Settings,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Github,
  UserCircle,
  Shield,
  MessageSquare,
  Bot,
} from "lucide-react";
import routes from "@/app/routes";
import { version } from "../../../package.json";

// Icon mapping for routes with consistent sizing
const routeIcons: Record<string, React.ReactNode> = {
    "/": <Bot className="w-[18px] h-[18px]" />,
    "/dashboard": <LayoutDashboard className="w-[18px] h-[18px]" />,
    "/projects": <FolderGit2 className="w-[18px] h-[18px]" />,
    "/instant-analysis": <Zap className="w-[18px] h-[18px]" />,
    "/audit-tasks": <ListTodo className="w-[18px] h-[18px]" />,
    "/audit-rules": <Shield className="w-[18px] h-[18px]" />,
    "/prompts": <MessageSquare className="w-[18px] h-[18px]" />,
    "/admin": <Settings className="w-[18px] h-[18px]" />,
    "/recycle-bin": <Trash2 className="w-[18px] h-[18px]" />,
};

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleRoutes = routes.filter((route) => route.visible !== false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/28 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen border-r border-white/70 bg-white/88 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex h-full flex-col">
          <div className={`flex h-20 items-center border-b border-border px-4 ${collapsed ? "justify-center" : "gap-3 px-5"}`}>
            <Link
              to="/"
              className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} min-w-0 flex-1 text-foreground hover:text-foreground`}
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-orange-50 to-white shadow-sm">
                <img src="/logo_deepaudit.png" alt="DeepAudit" className="h-7 w-7 object-contain" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold tracking-tight">DeepAudit</div>
                  <div className="truncate text-xs text-muted-foreground">Security Console</div>
                </div>
              )}
            </Link>

            <button
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary md:flex"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "展开导航" : "收起导航"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="px-4 pt-5">
            {!collapsed && (
              <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-white px-4 py-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-primary/80">Workspace</div>
                <div className="mt-2 text-sm font-medium text-foreground">代码审计工作台</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  覆盖 Agent 审计、项目治理、任务跟踪和规则运营。
                </p>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-1.5">
              {visibleRoutes.map((route) => {
                const isActive =
                  location.pathname === route.path ||
                  (route.path !== "/" && location.pathname.startsWith(route.path));

                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={`group flex items-center rounded-2xl px-3 py-3 transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    } ${collapsed ? "justify-center" : "gap-3"}`}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? route.name : undefined}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? "bg-white text-primary shadow-sm" : "bg-slate-100 text-muted-foreground group-hover:bg-white"
                      }`}
                    >
                      {routeIcons[route.path] || <LayoutDashboard className="h-[18px] w-[18px]" />}
                    </span>
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{route.name}</div>
                      </div>
                    )}
                    {!collapsed && (
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          isActive ? "text-primary" : "translate-x-0 text-transparent group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                        }`}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-border bg-slate-50/70 p-4">
            <Link
              to="/account"
              className={`group flex items-center rounded-2xl px-3 py-3 transition-all ${
                location.pathname === "/account"
                  ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10"
                  : "text-muted-foreground hover:bg-white hover:text-foreground"
              } ${collapsed ? "justify-center" : "gap-3"}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? "账号管理" : undefined}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  location.pathname === "/account" ? "bg-white text-primary shadow-sm" : "bg-slate-100"
                }`}
              >
                <UserCircle className="h-[18px] w-[18px]" />
              </span>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">账号管理</div>
                  <div className="text-xs text-muted-foreground">个人信息与认证状态</div>
                </div>
              )}
            </Link>

            <div className={`mt-4 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
              <a
                href="https://github.com/lintsinghua/DeepAudit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                title="GitHub"
              >
                <Github className="h-4 w-4" />
                {!collapsed && <span>v{version}</span>}
              </a>

              {!collapsed && (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Ready
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
