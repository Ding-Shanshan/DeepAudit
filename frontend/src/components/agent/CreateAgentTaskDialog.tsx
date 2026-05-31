/**
 * Agent 审计任务创建侧边栏
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BranchSelector } from "@/components/ui/branch-selector";
import {
  GitBranch,
  Package,
  Globe,
  Loader2,
  Play,
  Upload,
  FolderSync,
  Clock,
  Sparkles,
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
  const [creating, setCreating] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState("1440");
  const [scheduleWindowStart, setScheduleWindowStart] = useState("00:00");
  const [scheduleWindowEnd, setScheduleWindowEnd] = useState("23:59");

  // ZIP 文件状态
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [storedZipInfo, setStoredZipInfo] = useState<ZipFileMeta | null>(null);

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
      return storedZipInfo?.has_file || !!zipFile;
    }
    return !!selectedProject.repository_url && !!branch.trim();
  }, [selectedProject, taskName, storedZipInfo, zipFile, branch]);

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
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!w-[min(90vw,480px)] !max-w-none flex flex-col p-0 gap-0 bg-background">
          {/* Header */}
          <SheetHeader className="px-6 py-4 flex-shrink-0">
            <SheetTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              新建深度审计任务
            </SheetTitle>
          </SheetHeader>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* 任务名称 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">任务名称</Label>
              <Input
                placeholder="为本次审计任务命名..."
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="h-10"
              />
            </div>

            {/* 选择项目 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">目标项目</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loadingProjects}
              >
                <SelectTrigger className="h-10">
                  {loadingProjects ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-muted-foreground">加载项目...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="选择要审计的项目" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {projects.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      <Package className="w-5 h-5 mx-auto mb-2 opacity-50" />
                      暂无可用项目
                    </div>
                  ) : (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2.5">
                          {isRepositoryProject(project) ? (
                            <Globe className="w-4 h-4 opacity-60" />
                          ) : (
                            <Package className="w-4 h-4 opacity-60" />
                          )}
                          <span className="font-medium">{project.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {isRepositoryProject(project) ? "Git" : "ZIP"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 项目配置（选择项目后显示） */}
            {selectedProject && (
              <>
                <div className="h-px bg-border" />

                {/* 仓库项目：分支选择 */}
                {isRepositoryProject(selectedProject) && (
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground w-12">分支</Label>
                    {loadingBranches ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">加载分支...</span>
                      </div>
                    ) : (
                      <BranchSelector
                        value={branch}
                        onChange={setBranch}
                        branches={branches}
                        placeholder="选择分支"
                        className="flex-1 h-10"
                      />
                    )}
                  </div>
                )}

                {/* ZIP 项目：文件显示 + 更换 */}
                {isZipProject(selectedProject) && (
                  <div className="flex items-center gap-3 h-10 px-3 rounded-lg border border-border bg-muted/30">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">
                      {zipFile ? zipFile.name : storedZipInfo?.original_filename || "未选择文件"}
                    </span>
                    <label className="cursor-pointer">
                      <Badge variant="outline" className="text-xs hover:bg-primary/10 cursor-pointer">
                        <Upload className="w-3 h-3 mr-1" />
                        更换文件
                        <input
                          type="file"
                          accept=".zip"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </Badge>
                    </label>
                  </div>
                )}

                <div className="h-px bg-border" />

                {/* 扫描配置 */}
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">扫描配置</Label>

                  {/* 扫描范围 + 排除模式 */}
                  <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {selectedFiles ? `已选 ${selectedFiles.length} 个文件` : "全部文件"}
                      </span>
                      <div className="flex gap-2">
                        {selectedFiles && (
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
                          disabled={!isRepositoryProject(selectedProject) && !(isZipProject(selectedProject) && storedZipInfo?.has_file)}
                          className="h-7 text-xs"
                        >
                          <FolderSync className="w-3 h-3 mr-1" />
                          选择文件
                        </Button>
                      </div>
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* 排除模式 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">排除模式</span>
                        <button
                          type="button"
                          onClick={() => setExcludePatterns(DEFAULT_EXCLUDES)}
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          重置默认
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {excludePatterns.map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                            onClick={() => setExcludePatterns((prev) => prev.filter((x) => x !== p))}
                          >
                            {p} ×
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="输入排除模式后按回车添加..."
                        className="h-9 text-sm"
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
                  </div>

                  {/* 定时审计 */}
                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">定时审计</span>
                      </div>
                      <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                    </div>

                    {scheduleEnabled && (
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">周期（分钟）</Label>
                          <Input
                            type="number"
                            min="1"
                            value={scheduleIntervalMinutes}
                            onChange={(e) => setScheduleIntervalMinutes(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">开始时间</Label>
                          <Input
                            type="time"
                            value={scheduleWindowStart}
                            onChange={(e) => setScheduleWindowStart(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">结束时间</Label>
                          <Input
                            type="time"
                            value={scheduleWindowEnd}
                            onChange={(e) => setScheduleWindowEnd(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {selectedProject ? (
                  <span>已选择 <strong className="text-foreground">{selectedProject.name}</strong></span>
                ) : (
                  <span>请先选择项目</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={creating}
                  className="h-10 px-4"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!canStart || creating}
                  className="h-10 px-5"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      启动中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      开始审计
                    </>
                  )}
                </Button>
              </div>
            </div>
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