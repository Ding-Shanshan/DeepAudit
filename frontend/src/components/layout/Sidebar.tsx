/**
 * Sidebar Component
 * Enterprise console navigation
 */

import { useState, type ReactNode } from "react";
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
  UserCircle,
  Shield,
  MessageSquare,
  BriefcaseBusiness,
  Building2,
} from "lucide-react";
import routes from "@/app/routes";
import {
  BRAND_COMPANY_NAME,
  BRAND_LOGO_PATH,
  BRAND_NAME,
  BRAND_TAGLINE,
  CONSOLE_HOME_ROUTE,
} from "@/shared/constants/branding";
import { version } from "../../../package.json";

// Icon mapping for routes with consistent sizing
const routeIcons: Record<string, ReactNode> = {
  "/dashboard": <LayoutDashboard className="h-[18px] w-[18px]" />,
  "/projects": <FolderGit2 className="h-[18px] w-[18px]" />,
  "/instant-analysis": <Zap className="h-[18px] w-[18px]" />,
  "/audit-tasks": <ListTodo className="h-[18px] w-[18px]" />,
  "/audit-rules": <Shield className="h-[18px] w-[18px]" />,
  "/prompts": <MessageSquare className="h-[18px] w-[18px]" />,
  "/admin": <Settings className="h-[18px] w-[18px]" />,
  "/recycle-bin": <Trash2 className="h-[18px] w-[18px]" />,
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
        className="fixed left-4 top-4 z-50 border-[#d92625]/40 bg-white text-[#8b171b] shadow-lg md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#09111b]/45 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen border-r border-[#7f1d1d] bg-[linear-gradient(180deg,#78161d_0%,#5b1218_22%,#222f41_58%,#1a2433_100%)] text-white shadow-[0_22px_60px_rgba(8,15,28,0.38)] transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex min-h-24 items-center border-b border-white/12 ${
              collapsed ? "justify-center px-4" : "gap-3 px-5"
            }`}
          >
            <Link
              to={CONSOLE_HOME_ROUTE}
              className={`flex min-w-0 flex-1 items-center text-white hover:text-white ${
                collapsed ? "justify-center" : "gap-4"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] shadow-[0_12px_30px_rgba(217,38,37,0.2)]">
                <img src={BRAND_LOGO_PATH} alt={BRAND_COMPANY_NAME} className="h-7 w-7 object-contain" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tracking-[0.02em] text-white">
                    {BRAND_NAME}
                  </div>
                  <div className="truncate text-xs text-slate-100/80">{BRAND_COMPANY_NAME}</div>
                </div>
              )}
            </Link>

            <button
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/85 transition-colors hover:border-white/25 hover:bg-white/16 hover:text-white md:flex"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "展开导航" : "收起导航"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="px-4 pt-5">
            {!collapsed && (
              <div className="rounded-3xl border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] px-4 py-4 shadow-[0_18px_35px_rgba(8,15,28,0.24)]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd3d2]">
                  Tianrongxin
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                  <Building2 className="h-4 w-4 text-[#ffd3d2]" />
                  {BRAND_TAGLINE}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-100/78">
                  聚合项目治理、审计任务、规则运营与智能工作区，统一承载企业级代码安全运营。
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
                    className={`group flex items-center rounded-2xl px-3 py-3 transition-all duration-200 ${
                      isActive
                        ? "bg-[linear-gradient(135deg,#f4d2d2,#f0b1b0)] text-[#6f1117] shadow-[0_12px_30px_rgba(217,38,37,0.24)] ring-1 ring-white/35"
                        : "text-slate-50/92 hover:bg-white/14 hover:text-white"
                    } ${collapsed ? "justify-center" : "gap-3"}`}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? route.name : undefined}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-white/75 text-[#b21d22]"
                          : "bg-white/10 text-slate-100/88 group-hover:bg-white/18 group-hover:text-white"
                      }`}
                    >
                      {routeIcons[route.path] || <BriefcaseBusiness className="h-[18px] w-[18px]" />}
                    </span>
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold tracking-[0.01em]">{route.name}</div>
                      </div>
                    )}
                    {!collapsed && (
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          isActive
                            ? "text-[#b21d22]"
                            : "translate-x-0 text-transparent group-hover:translate-x-0.5 group-hover:text-white/75"
                        }`}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/12 bg-[#162131] p-4">
            <Link
              to="/account"
              className={`group flex items-center rounded-2xl px-3 py-3 transition-all ${
                location.pathname === "/account"
                  ? "bg-[linear-gradient(135deg,#f4d2d2,#f0b1b0)] text-[#6f1117] ring-1 ring-white/30"
                  : "text-slate-50/92 hover:bg-white/14 hover:text-white"
              } ${collapsed ? "justify-center" : "gap-3"}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? "账号管理" : undefined}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  location.pathname === "/account"
                    ? "bg-white/75 text-[#b21d22]"
                    : "bg-white/10 text-slate-100/88"
                }`}
              >
                <UserCircle className="h-[18px] w-[18px]" />
              </span>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">账号管理</div>
                  <div className="text-xs text-slate-100/72">个人信息与认证状态</div>
                </div>
              )}
            </Link>

            <div className={`mt-4 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
              <div
                className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-slate-50/88 ${
                  collapsed ? "px-2" : ""
                }`}
                title={`v${version}`}
              >
                <span className="h-2 w-2 rounded-full bg-[#d92625]" />
                {!collapsed ? <span>v{version}</span> : <span className="sr-only">v{version}</span>}
              </div>

              {!collapsed && (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-300">
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
