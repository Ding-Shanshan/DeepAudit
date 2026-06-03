/**
 * Create IaC Task Dialog
 * 简化的 IaC 扫描任务创建对话框 - 只需选项目和分支
 */

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/shared/api/serverClient";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  default_branch?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (taskId: string) => void;
}

export default function CreateIacTaskDialog({ open, onOpenChange, onCreated }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [branch, setBranch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiClient
      .get("/projects")
      .then((res) => {
        const list: Project[] =
          (res.data as any)?.items ?? (res.data as any) ?? [];
        setProjects(Array.isArray(list) ? list : []);
      })
      .catch(() => toast.error("加载项目失败"));
  }, [open]);

  const handleSubmit = async () => {
    if (!projectId) {
      toast.error("请选择项目");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/projects/${projectId}/scan`, {
        task_type: "iac_scan",
        branch_name: branch || undefined,
        full_scan: true,
      });
      toast.success("IaC 扫描任务已启动");
      onOpenChange(false);
      setProjectId("");
      setBranch("");
      onCreated?.((res.data as any)?.task_id);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "启动失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="cyber-dialog border-border">
        <SheetHeader>
          <SheetTitle>新建 IaC 扫描</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>项目</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="选择项目" />
              </SelectTrigger>
              <SelectContent className="cyber-dialog border-border">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>分支（可选，默认使用项目默认分支）</Label>
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="如 main"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            将自动加载全部 IaC 规则集（容器镜像类 / 编排部署类 / CI/CD 类），对 Dockerfile、docker-compose、GitHub Actions 文件进行扫描。
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "启动中..." : "开始扫描"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
