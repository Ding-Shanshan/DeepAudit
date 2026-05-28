/**
 * Sidebar Component
 * Indigo Modern navigation — vibrant block-based style
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
} from "lucide-react";
import routes from "@/app/routes";
import { useAuth } from "@/shared/context/AuthContext";
import {
  BRAND_COMPANY_NAME,
  BRAND_LOGO_PATH,
  BRAND_NAME,
  CONSOLE_HOME_ROUTE,
} from "@/shared/constants/branding";

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
  const { user } = useAuth();

  const visibleRoutes = routes.filter((route) => {
    if (route.visible === false) {
      return false;
    }
    if (route.path === "/admin" && user?.role !== "admin") {
      return false;
    }
    return true;
  });

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 border-primary/30 bg-white text-primary shadow-lg md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen border-r border-[#E0E7FF] bg-[#F5F3FF] text-[#1E1B4B] shadow-[0_2px_12px_rgba(99,102,241,0.06)] transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex h-full flex-col">
          {/* Header: logo + collapse toggle */}
          <div
            className={`flex min-h-20 items-center border-b border-[#E0E7FF] ${
              collapsed ? "justify-center px-4" : "gap-3 px-5"
            }`}
          >
            <Link
              to={CONSOLE_HOME_ROUTE}
              className={`flex min-w-0 flex-1 items-center text-[#1E1B4B] hover:text-[#1E1B4B] ${
                collapsed ? "justify-center" : "gap-4"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#C7D2FE] bg-[linear-gradient(180deg,#F5F3FF,#E0E7FF)] shadow-[0_4px_12px_rgba(99,102,241,0.08)]">
                <img src={BRAND_LOGO_PATH} alt={BRAND_COMPANY_NAME} className="h-6 w-6 object-contain" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tracking-[0.02em] text-[#1E1B4B]">
                    {BRAND_NAME}
                  </div>
                  <div className="truncate text-xs text-[#6B7280]">{BRAND_COMPANY_NAME}</div>
                </div>
              )}
            </Link>

            <button
              className="hidden h-8 w-8 items-center justify-center rounded border border-[#E0E7FF] bg-white text-[#6B7280] transition-colors hover:border-[#C7D2FE] hover:bg-[#F5F3FF] hover:text-primary md:flex"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "展开导航" : "收起导航"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {visibleRoutes.map((route) => {
                const isActive =
                  location.pathname === route.path ||
                  (route.path !== "/" && location.pathname.startsWith(route.path));

                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={`group flex items-center rounded-md px-3 py-2.5 transition-all duration-200 ${
                      isActive
                        ? "bg-[#E0E7FF] text-[#6366F1] shadow-[0_2px_8px_rgba(99,102,241,0.10)] ring-1 ring-[#C7D2FE]/60"
                        : "text-[#374151] hover:bg-white hover:text-[#1E1B4B]"
                    } ${collapsed ? "justify-center" : "gap-3"}`}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? route.name : undefined}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded transition-colors ${
                        isActive
                          ? "bg-[#EEF2FF] text-[#6366F1]"
                          : "bg-[#EEF2FF] text-[#6B7280] group-hover:bg-[#EEF2FF] group-hover:text-[#6366F1]"
                      }`}
                    >
                      {routeIcons[route.path] || <BriefcaseBusiness className="h-[18px] w-[18px]" />}
                    </span>
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm ${isActive ? "font-semibold tracking-[0.01em]" : "font-medium"}`}>{route.name}</div>
                      </div>
                    )}
                    {!collapsed && isActive && (
                      <ChevronRight
                        className="h-4 w-4 text-[#6366F1]"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Account section */}
          <div className="border-t border-[#E0E7FF] bg-[#F5F3FF] p-3">
            <Link
              to="/account"
              className={`group flex items-center rounded-md px-3 py-2.5 transition-all ${
                location.pathname === "/account"
                  ? "bg-[#E0E7FF] text-[#6366F1] ring-1 ring-[#C7D2FE]/60"
                  : "text-[#374151] hover:bg-white hover:text-[#1E1B4B]"
              } ${collapsed ? "justify-center" : "gap-3"}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? "账号管理" : undefined}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded ${
                  location.pathname === "/account"
                    ? "bg-[#EEF2FF] text-[#6366F1]"
                    : "bg-white text-[#6B7280]"
                }`}
              >
                <UserCircle className="h-[18px] w-[18px]" />
              </span>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">账号管理</div>
                  <div className="text-xs text-[#6B7280]">个人信息与认证状态</div>
                </div>
              )}
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}