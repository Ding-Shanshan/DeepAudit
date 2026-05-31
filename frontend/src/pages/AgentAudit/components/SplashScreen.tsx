/**
 * Splash Screen Component - Simplified
 * 简洁的欢迎页面，一个醒目的「开始审计任务」按钮
 */

import { memo } from "react";
import { Shield, Play } from "lucide-react";
import { BRAND_AGENT_AUDIT_NAME } from "@/shared/constants/branding";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = memo(function SplashScreen({
  onComplete,
}: SplashScreenProps) {
  const [BRAND_AGENT_PRIMARY, BRAND_AGENT_SECONDARY = "Audit"] =
    BRAND_AGENT_AUDIT_NAME.split(" ");

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold tracking-wide">
              <span className="text-primary">{BRAND_AGENT_PRIMARY}</span>
              <span className="text-foreground ml-2">{BRAND_AGENT_SECONDARY}</span>
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm tracking-widest uppercase">
          Autonomous Security Agent
        </p>
      </div>

      {/* Start Button */}
      <button
        onClick={onComplete}
        className="
          flex items-center gap-3 px-8 py-4
          bg-primary text-white font-semibold text-lg
          rounded-lg shadow-lg shadow-primary/25
          hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        "
      >
        <Play className="w-5 h-5" />
        开始审计任务
      </button>

      {/* Hint */}
      <p className="text-muted-foreground text-sm mt-4">
        点击按钮创建并启动新的安全审计任务
      </p>
    </div>
  );
});

export default SplashScreen;