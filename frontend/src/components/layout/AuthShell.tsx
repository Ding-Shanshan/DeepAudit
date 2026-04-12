import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, FolderKanban, Sparkles } from "lucide-react";
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
    title: "统一安全审计入口",
    description: "将项目、任务、规则和 Agent 审计工作流整合到同一控制台。",
  },
  {
    icon: <FolderKanban className="h-4 w-4" />,
    title: "成熟产品化体验",
    description: "以清晰层级和可读性优先，适合团队日常长时间使用。",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: "保留业务能力",
    description: "不改变认证流程和核心接口，只重构前端视觉与交互外壳。",
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
        <section className="relative hidden overflow-hidden rounded-[28px] border border-white/60 bg-slate-900 px-10 py-12 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.28),transparent_28%),linear-gradient(160deg,#182234_0%,#0f172a_55%,#111827_100%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative z-10 flex h-full flex-col">
            <Link to="/" className="inline-flex items-center gap-3 text-white hover:text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                <img src="/logo_deepaudit.png" alt="DeepAudit" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">DeepAudit</div>
                <div className="text-sm text-white/70">Code Security Console</div>
              </div>
            </Link>

            <div className="mt-20 max-w-xl">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
                Enterprise-ready security operations
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white">
                用更成熟的产品界面，承载你的代码审计流程。
              </h1>
              <p className="mt-5 text-base leading-7 text-white/72">
                DeepAudit 将项目管理、任务分析、规则治理与 Agent 工作区整合为统一控制台，
                让团队可以在更稳定、更清晰的前端中完成安全审计协作。
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-orange-300">
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
              <span>DeepAudit Frontend Refresh</span>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center py-6 lg:py-0">
          <div className="w-full max-w-xl">
            <div className="mb-8 lg:hidden">
              <Link to="/" className="inline-flex items-center gap-3 text-foreground hover:text-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-white shadow-sm">
                  <img src="/logo_deepaudit.png" alt="DeepAudit" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight">DeepAudit</div>
                  <div className="text-sm text-muted-foreground">Code Security Console</div>
                </div>
              </Link>
            </div>

            <div className="cyber-card p-8 lg:p-10">
              <div className="mb-8">
                <div className="text-sm font-medium text-primary">DeepAudit</div>
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
