/**
 * Task Detail Page
 * Matching Project Detail layout style
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  GitBranch,
  Bug,
  Code,
  Lightbulb,
  Info,
  Zap,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/shared/config/database";
import type { AuditTask, AuditIssue, AggregatedAuditIssue } from "@/shared/types";
import { toast } from "sonner";
import { calculateTaskProgress } from "@/shared/utils/utils";
import IssueDetailSheet from "@/components/issues/IssueDetailSheet";

// Issues Table Component
function IssuesTable({ issues, onStatusChange, onViewDetail }: {
  issues: AuditIssue[];
  onStatusChange?: (issue: AuditIssue, newStatus: string) => void;
  onViewDetail?: (issue: AuditIssue) => void;
}) {
  const getSeverityBadge = (severity: string) => {
    const baseClass = "font-bold uppercase px-2 py-1 rounded text-xs inline-flex justify-center min-w-[56px] text-center";
    switch (severity) {
      case 'critical': return <Badge className={`severity-critical ${baseClass}`}>严重</Badge>;
      case 'high': return <Badge className={`severity-high ${baseClass}`}>高</Badge>;
      case 'medium': return <Badge className={`severity-medium ${baseClass}`}>中</Badge>;
      case 'low': return <Badge className={`severity-low ${baseClass}`}>低</Badge>;
      default: return <Badge className={`severity-info ${baseClass}`}>信息</Badge>;
    }
  };

  if (issues.length === 0) {
    return (
      <div className="cyber-card p-0">
        <div className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-primary dark:text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2 uppercase">未发现问题</h3>
          <p className="text-sm text-muted-foreground font-mono">代码质量检查通过，没有发现任何问题</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-card p-0">
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
            {issues.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  无匹配问题
                </td>
              </tr>
            ) : (
              issues.map((issue, index) => (
                <tr key={issue.id || index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-2.5 px-6">
                    <span className="font-medium text-foreground">{issue.title}</span>
                  </td>
                  <td className="py-2.5 px-3">{getSeverityBadge(issue.severity)}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded border border-border">
                      {issue.file_path || "-"}
                      {issue.line_number ? `:${issue.line_number}` : ""}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {onStatusChange ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs font-mono border h-7">
                            {issue.status === 'resolved' ? '已解决' :
                              issue.status === 'false_positive' ? '误报' :
                                issue.status === 'pending_review' ? '存疑' : '待处理'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onStatusChange(issue, "pending_review")}>存疑</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStatusChange(issue, "resolved")}>已解决</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStatusChange(issue, "false_positive")}>误报</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStatusChange(issue, "open")}>恢复</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs">{issue.status === 'resolved' ? '已解决' :
                        issue.status === 'false_positive' ? '误报' :
                          issue.status === 'pending_review' ? '存疑' : '待处理'}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-primary/12 hover:text-primary h-7"
                      onClick={() => onViewDetail?.(issue)}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      查看详情
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<AuditTask | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [nameFilter, setNameFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Issue detail Sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);

  const handleViewDetail = (issue: AuditIssue) => {
    setSelectedIssue(issue);
    setDetailOpen(true);
  };

  // Zombie task detection
  const [lastProgressTime, setLastProgressTime] = useState<number>(Date.now());
  const [lastProgress, setLastProgress] = useState<number>(0);
  const ZOMBIE_TIMEOUT = 180000;

  useEffect(() => {
    if (id) {
      loadTaskDetail();
    }
  }, [id]);

  // Silent progress update for running tasks
  useEffect(() => {
    if (!task || !id) {
      return;
    }

    if (task.status === 'running' || task.status === 'pending') {
      const intervalId = setInterval(async () => {
        try {
          const [taskData, issuesData] = await Promise.all([
            api.getAuditTaskById(id),
            api.getAuditIssues(id)
          ]);

          if (!taskData) {
            console.error('任务数据获取失败');
            return;
          }

          const currentProgress = taskData.scanned_files || 0;
          if (currentProgress !== lastProgress) {
            setLastProgress(currentProgress);
            setLastProgressTime(Date.now());
          } else if (taskData.status === 'running' && Date.now() - lastProgressTime > ZOMBIE_TIMEOUT) {
            toast.warning("任务可能已停止响应，建议取消后重试", {
              id: 'zombie-warning',
              duration: 10000,
            });
          }

          if (
            taskData.status !== task.status ||
            taskData.scanned_files !== task.scanned_files ||
            taskData.issues_count !== task.issues_count
          ) {
            setTask(taskData);
            setIssues(issuesData);

            if (['completed', 'failed', 'cancelled'].includes(taskData.status)) {
              clearInterval(intervalId);
            }
          }
        } catch (error) {
          console.error('静默更新任务失败:', error);
          toast.error("获取任务状态失败，请检查网络连接", {
            id: 'network-error',
            duration: 5000,
          });
        }
      }, 3000);

      return () => clearInterval(intervalId);
    }
  }, [task?.status, task?.scanned_files, id, lastProgress, lastProgressTime]);

  const handleCancelTask = async () => {
    if (!id || cancelling) return;

    try {
      setCancelling(true);
      await api.cancelAuditTask(id);
      toast.success("任务已取消");
      const taskData = await api.getAuditTaskById(id);
      if (taskData) {
        setTask(taskData);
      }
    } catch (error: any) {
      console.error('取消任务失败:', error);
      toast.error(error?.response?.data?.detail || "取消任务失败");
    } finally {
      setCancelling(false);
    }
  };

  const loadTaskDetail = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [taskData, issuesData] = await Promise.all([
        api.getAuditTaskById(id),
        api.getAuditIssues(id)
      ]);

      setTask(taskData);
      setIssues(issuesData);
    } catch (error) {
      console.error('Failed to load task detail:', error);
      toast.error("加载任务详情失败");
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(i => {
    if (nameFilter && !i.title.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (statusFilter !== "all" && (i.status || 'open') !== statusFilter) return false;
    return true;
  });

  const handleIssueStatusChange = async (issue: AuditIssue, newStatus: string) => {
    if (!id) return;
    try {
      await api.updateAuditIssue(id, issue.id, { status: newStatus } as any);
      toast.success("状态已更新");
      const issuesData = await api.getAuditIssues(id);
      setIssues(issuesData);
    } catch (error) {
      console.error("Failed to update issue status:", error);
      toast.error("状态更新失败");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="cyber-badge-success">完成</Badge>;
      case 'running':
        return <Badge className="cyber-badge-info">运行中</Badge>;
      case 'failed':
        return <Badge className="cyber-badge-danger">失败</Badge>;
      case 'cancelled':
        return <Badge className="cyber-badge-muted">已取消</Badge>;
      default:
        return <Badge className="cyber-badge-muted">等待中</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto" />
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">加载任务详情...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4 px-6 pt-1 pb-6 cyber-bg-elevated min-h-screen font-mono">
        <div className="flex items-center space-x-4">
          <Link to="/audit-tasks">
            <Button variant="outline" size="sm" className="cyber-btn-ghost h-10 w-10 p-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        <div className="cyber-card p-16 text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground uppercase mb-2">任务不存在</h3>
          <p className="text-muted-foreground font-mono">请检查任务ID是否正确</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6 pt-1 pb-6 cyber-bg-elevated min-h-screen font-mono relative">
      {/* Grid background */}
      <div className="absolute inset-0 cyber-grid-subtle pointer-events-none" />

      {/* 顶部操作栏 */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/audit-tasks">
            <Button variant="outline" size="sm" className="cyber-btn-ghost h-10 w-10 p-0 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-wider">{task.task_type === 'repository' ? '仓库审计任务' : '即时分析任务'}</h1>
        </div>

        <div className="flex items-center space-x-3">
          {(task.status === 'running' || task.status === 'pending') && (
            <Button
              size="sm"
              className="cyber-btn bg-destructive/90 border-destructive/40 text-foreground hover:bg-destructive h-10"
              onClick={handleCancelTask}
              disabled={cancelling}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {cancelling ? '取消中...' : '取消任务'}
            </Button>
          )}

                  </div>
      </div>

      {/* 任务信息 */}
      <div className="cyber-card p-4 relative z-10">
        <div className="space-y-3 font-mono">
          {task.project && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground uppercase">项目名称</span>
                <Link to={`/projects/${task.project.id}`} className="text-sm font-bold text-primary hover:underline">
                  {task.project.name}
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground uppercase">项目负责人</span>
                <span className="text-sm text-foreground">{task.project.owner?.full_name || task.project.owner?.phone || '未知'}</span>
              </div>

              {task.project.programming_languages && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground uppercase">项目语言</span>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(task.project.programming_languages).map((lang: string) => (
                      <Badge key={lang} className="cyber-badge-primary">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border" />
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase">任务类型</span>
            <span className="text-sm font-bold text-foreground">{task.task_type === 'repository' ? '仓库审计任务' : '即时分析任务'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase">目标分支</span>
            <span className="text-sm text-foreground flex items-center">
              <GitBranch className="w-3.5 h-3.5 mr-1" />
              {task.branch_name || '默认分支'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase">创建时间</span>
            <span className="text-sm text-foreground">{formatDate(task.created_at)}</span>
          </div>

          {task.completed_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground uppercase">完成时间</span>
              <span className="text-sm text-foreground">{formatDate(task.completed_at)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase">文件数</span>
            <span className="text-sm text-foreground">{task.total_files ?? 0}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase">问题数</span>
            <span className={`text-sm font-bold ${task.issues_count > 0 ? 'text-warning' : 'text-foreground'}`}>{task.issues_count}</span>
          </div>

          {task.scan_config && (() => {
            let config: any = {};
            try { config = JSON.parse(task.scan_config); } catch {}
            const excludePatterns: string[] = config.exclude_patterns || [];
            return excludePatterns.length > 0 && (
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground uppercase pt-0.5">白名单</span>
                  <div className="flex flex-wrap gap-2 justify-end max-w-[70%]">
                    {excludePatterns.map((pattern: string) => (
                      <Badge key={pattern} className="cyber-badge-muted">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase">任务状态</span>
            {getStatusBadge(task.status)}
          </div>

          <div className="border-t border-border" />
        </div>
      </div>

      {/* 问题列表 */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap">
          <span className="font-mono font-bold uppercase text-foreground bg-primary text-primary-foreground border border-primary/20 px-6 py-2.5 rounded-xl text-sm tracking-wider min-w-[240px] text-center">问题列表</span>
          <div className="relative flex-1 min-w-[180px] max-w-[240px] ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
              placeholder="搜索问题名称"
              className="h-8 text-sm !pl-9"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="cyber-input h-8 w-[120px] text-sm">
              <SelectValue placeholder="全部程度" />
            </SelectTrigger>
            <SelectContent className="cyber-dialog border-border">
              <SelectItem value="all">全部程度</SelectItem>
              <SelectItem value="critical">严重 ({issues.filter(i => i.severity === 'critical').length})</SelectItem>
              <SelectItem value="high">高 ({issues.filter(i => i.severity === 'high').length})</SelectItem>
              <SelectItem value="medium">中 ({issues.filter(i => i.severity === 'medium').length})</SelectItem>
              <SelectItem value="low">低 ({issues.filter(i => i.severity === 'low').length})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="cyber-input h-8 w-[120px] text-sm">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent className="cyber-dialog border-border">
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(
                issues.reduce((acc: Record<string, number>, i) => {
                  const key = i.status || 'open';
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {})
              ).map(([key, count]) => (
                <SelectItem key={key} value={key}>
                  {{ open: '待处理', pending_review: '存疑', resolved: '已解决', false_positive: '误报' }[key] || key} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <IssuesTable issues={filteredIssues} onStatusChange={handleIssueStatusChange} onViewDetail={handleViewDetail} />
      </div>

      {/* Issue detail Sheet */}
      <IssueDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        auditIssue={selectedIssue as any}
      />

          </div>
  );
}