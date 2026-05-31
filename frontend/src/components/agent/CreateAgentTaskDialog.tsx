/**
 * Agent 审计任务创建侧边栏
 * 从右侧滑出的抽屉式界面
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BranchSelector } from "@/components/ui/branch-selector";
import {
  ChevronRight,
  GitBranch,
  Package,
  Globe,
  Loader2,
  Bot,
  Settings2,
  Play,
  Upload,
  FolderOpen,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/shared/config/database";
import { apiClient } from "@/shared/api/serverClient";
import { createAgentTask } from "@/shared/api/agentTasks";
import { isRepositoryProject, isZipProject } from "@/shared/utils/projectUtils";
import { getZipFileInfo, type ZipFileMeta } from "@/shared/utils/zipStorage";
import { validateZipFile } from "@/features/projects/services/repoZipScan";
import type { Project } from "@/shared/types";
import FileSelectionDialog from "@/components/audit/FileSelectionDialog";

interface CreateAgentTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_EXCLUDES = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "*.log",
];

export default function CreateAgentTaskDialog({
  open,
  onOpenChange,
}: CreateAgentTaskDialogProps) {
  const navigate = useNavigate();

  // 状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [taskName, setTaskName] = useState("");
  const [branch, setBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [excludePatterns, setExcludePatterns] = useState(DEFAULT_EXCLUDES);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState("1440");
  const [scheduleWindowStart, setScheduleWindowStart] = useState("00:00");
  const [scheduleWindowEnd, setScheduleWindowEnd] = useState("23:59");

  // ZIP 文件状态
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [storedZipInfo, setStoredZipInfo] = useState<ZipFileMeta | null>(null);
  const [useStoredZip, setUseStoredZip] = useState(true);

  // 文件选择状态
  const [selectedFiles, setSelectedFiles] = useState<string[] | undefined>();
  const [showFileSelection, setShowFileSelection] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // 加载项目列表
  useEffect(() => {
    if (open) {
      setLoadingProjects(true);
      api.getProjects()
        .then((data) => {
          setProjects(data.filter((p: Project) => p.is_active));
        })
        .catch(() => {
          toast.error("加载项目列表失败");
        })
        .finally(() => setLoadingProjects(false));

      // 重置状态
      setSelectedProjectId("");
      setTaskName("");
      setBranch("main");
      setExcludePatterns(DEFAULT_EXCLUDES);
      setShowAdvanced(false);
      setZipFile(null);
      setStoredZipInfo(null);
      setSelectedFiles(undefined);
      setScheduleEnabled(false);
      setScheduleIntervalMinutes("1440");
      setScheduleWindowStart("00:00");
      setScheduleWindowEnd("23:59");
    }
  }, [open]);

  // 加载分支列表
  useEffect(() => {
    const loadBranches = async () => {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (!project || !isRepositoryProject(project)) {
        setBranches([]);
        return;
      }

      setLoadingBranches(true);
      try {
        const result = await api.getProjectBranches(project.id);

        if (result.error) {
          toast.error(`加载分支失败: ${result.error}`);
        }

        setBranches(result.branches);
        if (result.default_branch) {
          setBranch(result.default_branch);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误";
        toast.error(`加载分支失败: ${msg}`);
        setBranches([project.default_branch || "main"]);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [selectedProjectId, projects]);

  // 加载 ZIP 文件信息
  useEffect(() => {
    const loadZipInfo = async () => {
      if (!selectedProject || !isZipProject(selectedProject)) {
        setStoredZipInfo(null);
        return;
      }

      try {
        const info = await getZipFileInfo(selectedProject.id);
        setStoredZipInfo(info);
        setUseStoredZip(info.has_file);
      } catch {
        setStoredZipInfo(null);
      }
    };

    loadZipInfo();
  }, [selectedProject?.id]);

  // 是否可以开始
  const canStart = useMemo(() => {
    if (!selectedProject) return false;
    if (!taskName.trim()) return false;
    if (isZipProject(selectedProject)) {
      return (useStoredZip && storedZipInfo?.has_file) || !!zipFile;
    }
    return !!selectedProject.repository_url && !!branch.trim();
  }, [selectedProject, taskName, useStoredZip, storedZipInfo, zipFile, branch]);

  // 创建任务
  const handleCreate = async () => {
    if (!selectedProject) return;
    if (!taskName.trim()) {
      toast.error("请输入任务名称");
      return;
    }
    if (scheduleEnabled) {
      const intervalMinutes = Number(scheduleIntervalMinutes);
      if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1) {
        toast.error("扫描周期必须大于 0");
        return;
      }
      if (!scheduleWindowStart || !scheduleWindowEnd) {
        toast.error("请设置完整的扫描时间段");
        return;
      }
    }

    setCreating(true);
    try {
      const agentTask = await createAgentTask({
        project_id: selectedProject.id,
        name: taskName.trim(),
        branch_name: isRepositoryProject(selectedProject) ? branch : undefined,
        exclude_patterns: excludePatterns,
        target_files: selectedFiles,
        verification_level: "sandbox",
      });

      let scheduleError: string | null = null;
      if (scheduleEnabled) {
        try {
          await apiClient.post("/schedules", {
            project_id: selectedProject.id,
            name: `定时审计-${taskName.trim()}`,
            scan_mode: "agent",
            branch_name: isRepositoryProject(selectedProject) ? branch : null,
            interval_minutes: Number(scheduleIntervalMinutes),
            time_window_start: scheduleWindowStart,
            time_window_end: scheduleWindowEnd,
            timezone: "Asia/Shanghai",
            file_paths: selectedFiles || [],
            exclude_patterns: excludePatterns,
            is_active: true,
          });
        } catch (error) {
          scheduleError = error instanceof Error ? error.message : "创建定时计划失败";
        }
      }

      onOpenChange(false);
      if (scheduleError) {
        toast.warning(`审计任务已创建，但定时计划创建失败: ${scheduleError}`);
      } else if (scheduleEnabled) {
        toast.success("审计任务已创建，定时计划已创建");
      } else {
        toast.success("审计任务已创建");
      }
      navigate(`/agent-audit/${agentTask.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建失败";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateZipFile(file);
      if (!validation.valid) {
        toast.error(validation.error || "文件无效");
        e.target.value = "";
        return;
      }
      setZipFile(file);
      setUseStoredZip(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!w-[min(90vw,520px)] !max-w-none flex flex-col p-0 gap-0 border-l border-border bg-background">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <Bot className="w-5 h-5 text-primary" />
            新建深度审计任务
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* 任务名称 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">任务名称</Label>
            <Input
              placeholder="输入审计任务名称..."
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="h-9"
            />
          </div>

          {/* 项目选择 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">选择项目</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={loadingProjects}
            >
              <SelectTrigger className="h-9">
                {loadingProjects ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-muted-foreground">加载中...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="选择要审计的项目" />
                )}
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    暂无可用项目
                  </div>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        {isRepositoryProject(project) ? (
                          <Globe className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span>{project.name}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {isRepositoryProject(project) ? "Git" : "ZIP"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 配置区域 */}
          {selectedProject && (
            <div className="space-y-3 pt-3 border-t border-border">
              {/* 仓库项目：分支选择 */}
              {isRepositoryProject(selectedProject) && (
                <div className="flex items-center gap-3">
                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-xs font-medium w-12">分支</Label>
                  {loadingBranches ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">加载中...</span>
                    </div>
                  ) : (
                    <BranchSelector
                      value={branch}
                      onChange={setBranch}
                      branches={branches}
                      placeholder="选择分支"
                      className="flex-1"
                    />
                  )}
                </div>
              )}

              {/* ZIP 项目：文件选择 */}
              {isZipProject(selectedProject) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-xs font-medium">ZIP 文件</Label>
                  </div>

                  {storedZipInfo?.has_file && (
                    <div
                      className={`p-2.5 rounded border cursor-pointer transition-colors ${
                        useStoredZip
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setUseStoredZip(true)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          useStoredZip ? 'border-primary bg-primary' : 'border-border'
                        }`} />
                        <span className="text-sm">{storedZipInfo.original_filename}</span>
                        <Badge variant="outline" className="text-xs ml-auto">已存储</Badge>
                      </div>
                    </div>
                  )}

                  <div
                    className={`p-2.5 rounded border cursor-pointer transition-colors ${
                      !useStoredZip && zipFile
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-3 h-3 rounded-full border-2 ${
                        !useStoredZip && zipFile ? 'border-primary bg-primary' : 'border-border'
                      }`} />
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {zipFile ? zipFile.name : "上传新文件..."}
                      </span>
                      <input
                        type="file"
                        accept=".zip"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* 高级选项 */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
                  <Settings2 className="w-4 h-4" />
                  <span className="font-medium">高级选项</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {/* 文件选择 */}
                  {(() => {
                    const isRepo = isRepositoryProject(selectedProject);
                    const isZip = isZipProject(selectedProject);
                    const hasStoredZip = storedZipInfo?.has_file;
                    const canSelectFiles = isRepo || (isZip && useStoredZip && hasStoredZip);

                    return (
                      <div className="flex items-center justify-between p-2.5 border border-border rounded">
                        <div>
                          <p className="text-xs text-muted-foreground">扫描范围</p>
                          <p className="text-sm font-medium mt-0.5">
                            {selectedFiles ? `${selectedFiles.length} 个文件` : "全部文件"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {selectedFiles && canSelectFiles && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedFiles(undefined)}
                              className="h-7 text-xs text-destructive hover:text-destructive"
                            >
                              重置
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowFileSelection(true)}
                            disabled={!canSelectFiles}
                            className="h-7 text-xs"
                          >
                            <FolderOpen className="w-3 h-3 mr-1" />
                            选择
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 排除模式 */}
                  <div className="p-2.5 border border-border rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">排除模式</span>
                      <button
                        type="button"
                        onClick={() => setExcludePatterns(DEFAULT_EXCLUDES)}
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        重置
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {excludePatterns.map((p) => (
                        <Badge
                          key={p}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          onClick={() => setExcludePatterns((prev) => prev.filter((x) => x !== p))}
                        >
                          {p} ×
                        </Badge>
                      ))}
                    </div>

                    <Input
                      placeholder="添加模式..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value) {
                          const val = e.currentTarget.value.trim();
                          if (val && !excludePatterns.includes(val)) {
                            setExcludePatterns((prev) => [...prev, val]);
                          }
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>

                  {/* 定时审计 */}
                  <div className="p-2.5 border border-border rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">定时审计</span>
                      </div>
                      <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                    </div>

                    {scheduleEnabled && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">周期（分钟）</Label>
                          <Input
                            type="number"
                            min="1"
                            value={scheduleIntervalMinutes}
                            onChange={(e) => setScheduleIntervalMinutes(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">开始</Label>
                          <Input
                            type="time"
                            value={scheduleWindowStart}
                            onChange={(e) => setScheduleWindowStart(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">结束</Label>
                          <Input
                            type="time"
                            value={scheduleWindowEnd}
                            onChange={(e) => setScheduleWindowEnd(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="h-9"
          >
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canStart || creating}
            className="h-9"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                启动中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1.5" />
                开始审计
              </>
            )}
          </Button>
        </div>
        </SheetContent>
      </Sheet>

      {/* 文件选择对话框 */}
      <FileSelectionDialog
        open={showFileSelection}
        onOpenChange={setShowFileSelection}
        projectId={selectedProjectId}
        branch={branch}
        excludePatterns={excludePatterns}
        onConfirm={setSelectedFiles}
      />
    </>
  );
}
