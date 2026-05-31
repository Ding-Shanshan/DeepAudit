import { useState, useMemo } from "react";
import { FileText, Shield, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IssuesSummary, LatestProblem, AggregatedAuditIssue, AggregatedAgentFinding } from "@/shared/types";
import IssueDetailSheet from "@/components/issues/IssueDetailSheet";

const STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  pending_review: "存疑",
  new: "待处理",
  resolved: "已解决",
  false_positive: "误报",
  fixed: "已修复",
  wont_fix: "不修复",
  verified: "已验证",
  analyzing: "分析中",
  needs_review: "待审核",
  duplicate: "重复",
};

function getStatusLabel(status?: string): string {
  if (!status) return "待处理";
  return STATUS_LABELS[status] || status;
}

function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case "resolved":
    case "fixed":
      return "bg-primary/15 text-primary dark:text-primary border-primary/25";
    case "pending_review":
    case "needs_review":
      return "bg-secondary/15 text-secondary dark:text-secondary border-secondary/25";
    case "false_positive":
    case "wont_fix":
    case "duplicate":
      return "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30";
    default:
      return "bg-warning/15 text-warning dark:text-warning border-warning/25";
  }
}

export function ProjectIssuesTab(props: {
  hasAnyTasks: boolean;
  issuesSummary: IssuesSummary;
  loading: boolean;
  latestProblems: LatestProblem[];
  latestIssues: AggregatedAuditIssue[];
  latestFindings: AggregatedAgentFinding[];
  formatDate: (dateString: string) => string;
  onStatusChange?: (problem: LatestProblem, newStatus: string) => void;
}) {
  const { loading, latestProblems, latestIssues, latestFindings, formatDate, onStatusChange } = props;

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 详情 Sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAuditIssue, setSelectedAuditIssue] = useState<AggregatedAuditIssue | undefined>(undefined);
  const [selectedAgentFinding, setSelectedAgentFinding] = useState<AggregatedAgentFinding | undefined>(undefined);

  const handleViewDetail = (problem: LatestProblem) => {
    if (problem.kind === "audit") {
      const full = latestIssues.find((i) => i.id === problem.id);
      setSelectedAuditIssue(full);
      setSelectedAgentFinding(undefined);
    } else {
      const full = latestFindings.find((f) => f.id === problem.id);
      setSelectedAgentFinding(full);
      setSelectedAuditIssue(undefined);
    }
    setDetailOpen(true);
  };

  // 筛选后的问题列表
  const filteredProblems = useMemo(() => {
    return latestProblems.filter((issue) => {
      // 问题名称搜索
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = issue.title?.toLowerCase().includes(term);
        const matchPath = issue.file_path?.toLowerCase().includes(term);
        if (!matchTitle && !matchPath) return false;
      }
      // 严重程度筛选
      if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
      // 处理状态筛选
      if (statusFilter !== "all") {
        const currentStatus = issue.status || "open";
        if (currentStatus !== statusFilter) return false;
      }
      return true;
    });
  }, [latestProblems, searchTerm, severityFilter, statusFilter]);

  if (loading) {
    return (
      <div className="cyber-card p-12 text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-muted-foreground font-mono">正在加载问题列表...</p>
      </div>
    );
  }

  return (
    <>
      <div className="cyber-card p-0">
        {latestProblems.length > 0 ? (
          <>
            {/* 筛选栏 */}
            <div className="p-4 flex items-center gap-3 border-b border-border flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索问题名称"
                  className="h-8 text-sm !pl-9"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="cyber-input h-8 w-[120px] text-sm">
                  <SelectValue placeholder="严重程度" />
                </SelectTrigger>
                <SelectContent className="cyber-dialog border-border">
                  <SelectItem value="all">全部程度</SelectItem>
                  <SelectItem value="critical">严重</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="cyber-input h-8 w-[120px] text-sm">
                  <SelectValue placeholder="处理状态" />
                </SelectTrigger>
                <SelectContent className="cyber-dialog border-border">
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="open">待处理</SelectItem>
                  <SelectItem value="pending_review">存疑</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="fixed">已修复</SelectItem>
                  <SelectItem value="false_positive">误报</SelectItem>
                  <SelectItem value="wont_fix">不修复</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || severityFilter !== "all" || statusFilter !== "all") && (
                <span className="text-xs text-muted-foreground">
                  {filteredProblems.length} / {latestProblems.length}
                </span>
              )}
            </div>

            {/* 问题列表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-6 font-medium">问题名称</th>
                    <th className="text-left py-2 px-3 font-medium">严重程度</th>
                    <th className="text-left py-2 px-3 font-medium">文件路径</th>
                    <th className="text-left py-2 px-3 font-medium">状态</th>
                    <th className="text-left py-2 px-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProblems.length > 0 ? (
                    filteredProblems.map((issue, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-6">
                          <span className="font-medium text-foreground">{issue.title}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            className={`
                              ${issue.severity === "critical"
                                ? "severity-critical"
                                : issue.severity === "high"
                                  ? "severity-high"
                                  : issue.severity === "medium"
                                    ? "severity-medium"
                                    : "severity-low"}
                              font-bold uppercase px-2 py-1 rounded text-xs inline-flex justify-center min-w-[56px] text-center
                            `}
                          >
                            {issue.severity === "critical" ? "严重" : issue.severity === "high" ? "高" : issue.severity === "medium" ? "中" : "低"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded border border-border">
                            {issue.file_path || "-"}
                            {issue.line_number != null
                              ? issue.line_end != null && issue.line_end !== issue.line_number
                                ? `:${issue.line_number}-${issue.line_end}`
                                : `:${issue.line_number}`
                              : ""}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {onStatusChange ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className={`text-xs font-mono border h-7 ${getStatusBadgeClass(issue.status)}`}>
                                  {getStatusLabel(issue.status)}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {issue.kind === "audit" ? (
                                  <>
                                    <DropdownMenuItem onClick={() => onStatusChange(issue, "pending_review")}>存疑</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(issue, "resolved")}>已解决</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(issue, "false_positive")}>误报</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(issue, "open")}>恢复</DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem onClick={() => onStatusChange(issue, "fixed")}>已修复</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(issue, "wont_fix")}>不修复</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(issue, "false_positive")}>误报</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(issue, "new")}>恢复</DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs">{getStatusLabel(issue.status)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-primary/12 hover:text-primary h-7"
                            onClick={() => handleViewDetail(issue)}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            查看详情
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        无匹配的问题
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-primary/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2 uppercase">未发现问题</h3>
            <p className="text-sm text-muted-foreground font-mono">该项目暂未发现安全问题，或尚未进行审计。</p>
          </div>
        )}
      </div>

      {/* 问题详情 Sheet */}
      <IssueDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        auditIssue={selectedAuditIssue}
        agentFinding={selectedAgentFinding}
      />
    </>
  );
}