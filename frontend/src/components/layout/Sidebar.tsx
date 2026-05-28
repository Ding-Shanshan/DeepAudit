/**
 * TopNav Component
 * Horizontal navigation bar at the top of the page
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

export default function Sidebar() {
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
      <header className="sticky top-0 z-40 border-b border-[#E0E7FF] bg-[#F5F3FF] shadow-[0_2px_12px_rgba(99,102,241,0.06)]">
        {/* Desktop nav */}
        <div className="hidden md:flex md:h-14 md:items-center md:px-5">
          <Link to={CONSOLE_HOME_ROUTE} className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C7D2FE] bg-[linear-gradient(180deg,#F5F3FF,#E0E7FF)] shadow-[0_4px_12px_rgba(99,102,241,0.08)]">
              <img src={BRAND_LOGO_PATH} alt={BRAND_COMPANY_NAME} className="h-5 w-5 object-contain" />
            </div>
            <div className="truncate text-sm font-semibold tracking-[0.02em] text-[#1E1B4B]">
              {BRAND_NAME}
            </div>
          </Link>

          <nav className="flex items-center gap-1 ml-6 flex-1 overflow-x-auto">
            {visibleRoutes.map((route) => {
              const isActive =
                location.pathname === route.path ||
                (route.path !== "/" && location.pathname.startsWith(route.path));

              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={`group flex items-center gap-2 rounded-md px-3 py-2 transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-[#E0E7FF] text-[#6366F1] shadow-[0_2px_8px_rgba(99,102,241,0.10)] ring-1 ring-[#C7D2FE]/60"
                      : "text-[#374151] hover:bg-white hover:text-[#1E1B4B]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors ${
                      isActive
                        ? "bg-[#EEF2FF] text-[#6366F1]"
                        : "bg-[#EEF2FF] text-[#6B7280] group-hover:bg-[#EEF2FF] group-hover:text-[#6366F1]"
                    }`}
                  >
                    {routeIcons[route.path] || <BriefcaseBusiness className="h-[18px] w-[18px]" />}
                  </span>
                  <span className={`text-sm ${isActive ? "font-semibold tracking-[0.01em]" : "font-medium"}`}>
                    {route.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          <Link
            to="/account"
            className={`group flex items-center gap-2 rounded-md px-3 py-2 transition-all shrink-0 ${
              location.pathname === "/account"
                ? "bg-[#E0E7FF] text-[#6366F1] ring-1 ring-[#C7D2FE]/60"
                : "text-[#374151] hover:bg-white hover:text-[#1E1B4B]"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded ${
                location.pathname === "/account"
                  ? "bg-[#EEF2FF] text-[#6366F1]"
                  : "bg-white text-[#6B7280]"
              }`}
            >
              <UserCircle className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm font-medium">账号管理</span>
          </Link>
        </div>

        {/* Mobile nav */}
        <div className="flex h-14 items-center justify-between px-4 md:hidden">
          <Link to={CONSOLE_HOME_ROUTE} className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C7D2FE] bg-[linear-gradient(180deg,#F5F3FF,#E0E7FF)] shadow-[0_4px_12px_rgba(99,102,241,0.08)]">
              <img src={BRAND_LOGO_PATH} alt={BRAND_COMPANY_NAME} className="h-5 w-5 object-contain" />
            </div>
            <div className="truncate text-sm font-semibold tracking-[0.02em] text-[#1E1B4B]">
              {BRAND_NAME}
            </div>
          </Link>
          <Button
            variant="outline"
            size="icon"
            className="border-primary/30 bg-white text-primary shadow-lg"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="border-t border-[#E0E7FF] bg-[#F5F3FF] px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {visibleRoutes.map((route) => {
                const isActive =
                  location.pathname === route.path ||
                  (route.path !== "/" && location.pathname.startsWith(route.path));

                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={`group flex items-center gap-3 rounded-md px-3 py-2.5 transition-all duration-200 ${
                      isActive
                        ? "bg-[#E0E7FF] text-[#6366F1] shadow-[0_2px_8px_rgba(99,102,241,0.10)] ring-1 ring-[#C7D2FE]/60"
                        : "text-[#374151] hover:bg-white hover:text-[#1E1B4B]"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors ${
                        isActive
                          ? "bg-[#EEF2FF] text-[#6366F1]"
                          : "bg-[#EEF2FF] text-[#6B7280] group-hover:bg-[#EEF2FF] group-hover:text-[#6366F1]"
                      }`}
                    >
                      {routeIcons[route.path] || <BriefcaseBusiness className="h-[18px] w-[18px]" />}
                    </span>
                    <span className={`text-sm ${isActive ? "font-semibold tracking-[0.01em]" : "font-medium"}`}>
                      {route.name}
                    </span>
                  </Link>
                );
              })}
              <Link
                to="/account"
                className={`group flex items-center gap-3 rounded-md px-3 py-2.5 transition-all ${
                  location.pathname === "/account"
                    ? "bg-[#E0E7FF] text-[#6366F1] ring-1 ring-[#C7D2FE]/60"
                    : "text-[#374151] hover:bg-white hover:text-[#1E1B4B]"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded ${
                    location.pathname === "/account"
                      ? "bg-[#EEF2FF] text-[#6366F1]"
                      : "bg-white text-[#6B7280]"
                  }`}
                >
                  <UserCircle className="h-[18px] w-[18px]" />
                </span>
                <span className="text-sm font-medium">账号管理</span>
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}