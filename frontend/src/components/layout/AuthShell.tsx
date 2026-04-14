import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, FolderKanban, Sparkles } from "lucide-react";
import {
  BRAND_COMPANY_NAME,
  BRAND_DESCRIPTION,
  BRAND_LOGO_PATH,
  BRAND_NAME,
  BRAND_TAGLINE,
  CONSOLE_HOME_ROUTE,
} from "@/shared/constants/branding";
import { version } from "../../../package.json";

interface AuthShellProps {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}

const highlights = [
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "统一安全运营入口",
    description: "将项目管理、规则治理、任务分析与智能审计汇聚到统一控制台。",
  },
  {
    icon: <FolderKanban className="h-4 w-4" />,
    title: "企业级协同体验",
    description: "以稳定、清晰、可长时间使用的控制台交互承载日常安全运营。",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: "保留既有能力",
    description: "不改变认证流程与核心接口，仅重塑品牌外壳与可见交互层。",
  },
];

export default function AuthShell({
  title,
  description,
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen gradient-bg">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-10 lg:py-10">
        <section className="relative hidden overflow-hidden rounded-[32px] border border-[#d92625]/20 bg-[#101923] px-10 py-12 text-white shadow-[0_32px_90px_rgba(8,15,28,0.22)] lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,38,37,0.36),transparent_30%),linear-gradient(160deg,#131d29_0%,#0b1320_52%,#121d2c_100%)]" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="relative z-10 flex h-full flex-col">
            <Link to={CONSOLE_HOME_ROUTE} className="inline-flex items-center gap-3 text-white hover:text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <img src={BRAND_LOGO_PATH} alt={BRAND_COMPANY_NAME} className="h-7 w-7 object-contain" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">{BRAND_NAME}</div>
                <div className="text-sm text-white/70">{BRAND_COMPANY_NAME}</div>
              </div>
            </Link>

            <div className="mt-20 max-w-xl">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
                TOPSEC Security Operations Console
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white">
                以统一品牌界面承载企业级代码安全运营。
              </h1>
              <p className="mt-5 text-base leading-7 text-white/72">
                {BRAND_DESCRIPTION}
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[#ff8a89]">
                      {item.icon}
                    </span>
                    {item.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/70">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-white/12 pt-8 text-sm text-white/55">
              <span>Version {version}</span>
              <span>{BRAND_TAGLINE}</span>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center py-6 lg:py-0">
          <div className="w-full max-w-xl">
            <div className="mb-8 lg:hidden">
              <Link to={CONSOLE_HOME_ROUTE} className="inline-flex items-center gap-3 text-foreground hover:text-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-white shadow-sm">
                  <img src={BRAND_LOGO_PATH} alt={BRAND_COMPANY_NAME} className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight">{BRAND_NAME}</div>
                  <div className="text-sm text-muted-foreground">{BRAND_COMPANY_NAME}</div>
                </div>
              </Link>
            </div>

            <div className="cyber-card border-white/60 p-8 lg:p-10">
              <div className="mb-8">
                <div className="text-sm font-medium text-primary">{BRAND_TAGLINE}</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>

              {children}

              <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
                {footer}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
