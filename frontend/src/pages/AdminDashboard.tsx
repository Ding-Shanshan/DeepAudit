import { useEffect, useState } from "react";
import { Database, BookOpen, CalendarClock, RefreshCw, Settings, Shield, Terminal, Users } from "lucide-react";
import { toast } from "sonner";

import { DatabaseManager } from "@/components/database/DatabaseManager";
import { SystemConfig } from "@/components/system/SystemConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/shared/api/serverClient";
import { useAuth } from "@/shared/context/AuthContext";
import type { Project } from "@/shared/types";

type AdminUser = {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role: "admin" | "member";
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
};

type UserListResponse = {
  users: AdminUser[];
  total: number;
  skip: number;
  limit: number;
};

type ScheduledScan = {
  id: string;
  project_id: string;
  name: string;
  branch_name?: string;
  interval_minutes: number;
  exclude_patterns: string[];
  file_paths: string[];
  is_active: boolean;
  next_run_at?: string;
  last_run_at?: string;
};

type KnowledgeEntry = {
  id: string;
  title: string;
  category: string;
  language: string;
  content: string;
  is_active: boolean;
  created_at: string;
};

const DEFAULT_PASSWORD = "Admin@123456";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedules, setSchedules] = useState<ScheduledScan[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);

  const [userForm, setUserForm] = useState({
    username: "",
    full_name: "",
    password: DEFAULT_PASSWORD,
    email: "",
    role: "member",
    is_superuser: false,
  });
  const [scheduleForm, setScheduleForm] = useState({
    project_id: "",
    name: "",
    branch_name: "main",
    interval_minutes: "60",
    file_paths: "",
    exclude_patterns: "",
    is_active: true,
  });
  const [knowledgeForm, setKnowledgeForm] = useState({
    title: "",
    category: "security",
    language: "all",
    content: "",
    is_active: true,
  });

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const response = await apiClient.get<UserListResponse>("/users/");
      setUsers(response.data.users);
    } catch (error) {
      console.error("加载用户列表失败", error);
      toast.error("加载用户列表失败");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadProjects = async () => {
    if (!isAdmin) return;
    try {
      const response = await apiClient.get<Project[]>("/projects/");
      setProjects(response.data);
    } catch (error) {
      console.error("加载项目列表失败", error);
    }
  };

  const loadSchedules = async () => {
    if (!isAdmin) return;
    setLoadingSchedules(true);
    try {
      const response = await apiClient.get<ScheduledScan[]>("/schedules");
      setSchedules(response.data);
      if (!scheduleForm.project_id && response.data.length === 0 && projects.length > 0) {
        setScheduleForm((prev) => ({ ...prev, project_id: projects[0].id }));
      }
    } catch (error) {
      console.error("加载计划扫描失败", error);
      toast.error("加载计划扫描失败");
    } finally {
      setLoadingSchedules(false);
    }
  };

  const loadKnowledgeEntries = async () => {
    if (!isAdmin) return;
    setLoadingKnowledge(true);
    try {
      const response = await apiClient.get<KnowledgeEntry[]>("/knowledge");
      setKnowledgeEntries(response.data);
    } catch (error) {
      console.error("加载知识库失败", error);
      toast.error("加载知识库失败");
    } finally {
      setLoadingKnowledge(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
    void loadProjects();
    void loadSchedules();
    void loadKnowledgeEntries();
  }, [isAdmin]);

  useEffect(() => {
    if (!scheduleForm.project_id && projects.length > 0) {
      setScheduleForm((prev) => ({ ...prev, project_id: projects[0].id }));
    }
  }, [projects, scheduleForm.project_id]);

  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.full_name || !userForm.password) {
      toast.error("请填写用户名、姓名和密码");
      return;
    }
    try {
      await apiClient.post("/users/", {
        username: userForm.username,
        full_name: userForm.full_name,
        password: userForm.password,
        email: userForm.email || null,
        role: userForm.role,
        is_superuser: userForm.is_superuser,
        is_active: true,
      });
      toast.success("用户已创建");
      setUserForm({
        username: "",
        full_name: "",
        password: DEFAULT_PASSWORD,
        email: "",
        role: "member",
        is_superuser: false,
      });
      await loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "创建用户失败");
    }
  };

  const handleToggleUserStatus = async (target: AdminUser) => {
    try {
      await apiClient.post(`/users/${target.id}/toggle-status`);
      toast.success(`用户已${target.is_active ? "禁用" : "启用"}`);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "更新用户状态失败");
    }
  };

  const handleResetPassword = async (target: AdminUser) => {
    try {
      await apiClient.put(`/users/${target.id}`, { password: DEFAULT_PASSWORD });
      toast.success(`已将 ${target.username} 的密码重置为 ${DEFAULT_PASSWORD}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "重置密码失败");
    }
  };

  const handleDeleteUser = async (target: AdminUser) => {
    try {
      await apiClient.delete(`/users/${target.id}`);
      toast.success("用户已删除");
      await loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "删除用户失败");
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleForm.project_id || !scheduleForm.name) {
      toast.error("请填写计划名称并选择项目");
      return;
    }
    try {
      await apiClient.post("/schedules", {
        project_id: scheduleForm.project_id,
        name: scheduleForm.name,
        branch_name: scheduleForm.branch_name || null,
        interval_minutes: Number(scheduleForm.interval_minutes || 60),
        file_paths: parseCommaList(scheduleForm.file_paths),
        exclude_patterns: parseCommaList(scheduleForm.exclude_patterns),
        is_active: scheduleForm.is_active,
      });
      toast.success("计划扫描已创建");
      setScheduleForm((prev) => ({
        ...prev,
        name: "",
        branch_name: "main",
        interval_minutes: "60",
        file_paths: "",
        exclude_patterns: "",
        is_active: true,
      }));
      await loadSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "创建计划扫描失败");
    }
  };

  const handleToggleSchedule = async (target: ScheduledScan) => {
    try {
      await apiClient.put(`/schedules/${target.id}`, { is_active: !target.is_active });
      toast.success(`计划已${target.is_active ? "停用" : "启用"}`);
      await loadSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "更新计划失败");
    }
  };

  const handleDeleteSchedule = async (target: ScheduledScan) => {
    try {
      await apiClient.delete(`/schedules/${target.id}`);
      toast.success("计划已删除");
      await loadSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "删除计划失败");
    }
  };

  const handleCreateKnowledge = async () => {
    if (!knowledgeForm.title || !knowledgeForm.content) {
      toast.error("请填写标题和内容");
      return;
    }
    try {
      await apiClient.post("/knowledge", knowledgeForm);
      toast.success("知识条目已创建");
      setKnowledgeForm({
        title: "",
        category: "security",
        language: "all",
        content: "",
        is_active: true,
      });
      await loadKnowledgeEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "创建知识条目失败");
    }
  };

  const handleToggleKnowledge = async (target: KnowledgeEntry) => {
    try {
      await apiClient.put(`/knowledge/${target.id}`, { is_active: !target.is_active });
      toast.success(`知识条目已${target.is_active ? "停用" : "启用"}`);
      await loadKnowledgeEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "更新知识条目失败");
    }
  };

  const handleDeleteKnowledge = async (target: KnowledgeEntry) => {
    try {
      await apiClient.delete(`/knowledge/${target.id}`);
      toast.success("知识条目已删除");
      await loadKnowledgeEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "删除知识条目失败");
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 p-6 cyber-bg-elevated min-h-screen font-mono relative">
        <div className="absolute inset-0 cyber-grid-subtle pointer-events-none" />
        <div className="relative z-10 cyber-card p-8">
          <div className="cyber-card-header">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold uppercase tracking-wider text-foreground">系统管理</h1>
          </div>
          <div className="p-6 text-sm text-muted-foreground">
            当前账号不是管理员，无法访问用户管理、计划扫描和知识库维护功能。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 cyber-bg-elevated min-h-screen font-mono relative">
      <div className="absolute inset-0 cyber-grid-subtle pointer-events-none" />

      <div className="relative z-10">
        <div className="cyber-card p-0">
          <div className="cyber-card-header">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold uppercase tracking-wider text-foreground">系统管理</h1>
          </div>
          <div className="px-6 py-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Badge className="cyber-badge-info">本地用户管理</Badge>
            <Badge className="cyber-badge-warning">计划扫描</Badge>
            <Badge className="cyber-badge-success">知识库维护</Badge>
            <span>当前管理员：{user?.username}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full relative z-10">
        <TabsList className="grid w-full grid-cols-5 bg-muted border border-border p-1 h-auto gap-1 rounded-lg mb-6">
          <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-3 text-xs flex items-center gap-2">
            <Users className="w-4 h-4" />
            用户
          </TabsTrigger>
          <TabsTrigger value="schedules" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-3 text-xs flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            计划
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-3 text-xs flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            知识库
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-3 text-xs flex items-center gap-2">
            <Settings className="w-4 h-4" />
            配置
          </TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-3 text-xs flex items-center gap-2">
            <Database className="w-4 h-4" />
            数据
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="cyber-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground uppercase">创建本地用户</h3>
                <p className="text-xs text-muted-foreground mt-1">公开注册已关闭，所有账号由管理员统一创建。</p>
              </div>
              <Button variant="outline" className="cyber-btn-outline h-9" onClick={() => void loadUsers()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input value={userForm.username} onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input value={userForm.full_name} onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>邮箱（可选）</Label>
                <Input value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>初始密码</Label>
                <Input value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={userForm.role} onValueChange={(value: "admin" | "member") => setUserForm((prev) => ({ ...prev, role: value }))}>
                  <SelectTrigger className="cyber-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="cyber-dialog border-border">
                    <SelectItem value="member">成员</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>超级管理员</Label>
                <div className="h-10 px-3 border border-border rounded-md flex items-center justify-between bg-background">
                  <span className="text-sm text-muted-foreground">启用系统级权限</span>
                  <Switch checked={userForm.is_superuser} onCheckedChange={(checked) => setUserForm((prev) => ({ ...prev, is_superuser: checked }))} />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="cyber-btn-primary" onClick={() => void handleCreateUser()}>
                创建用户
              </Button>
            </div>
          </div>

          <div className="cyber-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground uppercase">用户列表</h3>
              <Badge className="cyber-badge-muted">{users.length} 个账户</Badge>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">加载中...</TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">暂无用户</TableCell>
                    </TableRow>
                  ) : (
                    users.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold">{item.username}</TableCell>
                        <TableCell>{item.full_name || "-"}</TableCell>
                        <TableCell>{item.role === "admin" ? "管理员" : "成员"}</TableCell>
                        <TableCell>
                          <Badge className={item.is_active ? "cyber-badge-success" : "cyber-badge-danger"}>
                            {item.is_active ? "启用" : "禁用"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="cyber-btn-outline h-8" onClick={() => void handleResetPassword(item)}>
                              重置密码
                            </Button>
                            <Button variant="outline" size="sm" className="cyber-btn-outline h-8" onClick={() => void handleToggleUserStatus(item)}>
                              {item.is_active ? "禁用" : "启用"}
                            </Button>
                            {item.username !== user?.username && (
                              <Button variant="outline" size="sm" className="cyber-btn-ghost h-8 hover:text-rose-400" onClick={() => void handleDeleteUser(item)}>
                                删除
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <div className="cyber-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground uppercase">创建计划扫描</h3>
                <p className="text-xs text-muted-foreground mt-1">按分钟周期自动生成审计任务，支持项目、分支和排除规则配置。</p>
              </div>
              <Button variant="outline" className="cyber-btn-outline h-9" onClick={() => void loadSchedules()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>项目</Label>
                <Select value={scheduleForm.project_id} onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, project_id: value }))}>
                  <SelectTrigger className="cyber-input">
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent className="cyber-dialog border-border">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>计划名称</Label>
                <Input value={scheduleForm.name} onChange={(e) => setScheduleForm((prev) => ({ ...prev, name: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>分支</Label>
                <Input value={scheduleForm.branch_name} onChange={(e) => setScheduleForm((prev) => ({ ...prev, branch_name: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>扫描周期（分钟）</Label>
                <Input type="number" min="1" value={scheduleForm.interval_minutes} onChange={(e) => setScheduleForm((prev) => ({ ...prev, interval_minutes: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>限定文件（逗号分隔）</Label>
                <Input value={scheduleForm.file_paths} onChange={(e) => setScheduleForm((prev) => ({ ...prev, file_paths: e.target.value }))} className="cyber-input" placeholder="cmd/main.go,src/App.tsx" />
              </div>
              <div className="space-y-2">
                <Label>排除模式（逗号分隔）</Label>
                <Input value={scheduleForm.exclude_patterns} onChange={(e) => setScheduleForm((prev) => ({ ...prev, exclude_patterns: e.target.value }))} className="cyber-input" placeholder="node_modules/**,dist/**" />
              </div>
            </div>

            <div className="h-10 px-3 border border-border rounded-md flex items-center justify-between bg-background">
              <span className="text-sm text-muted-foreground">创建后立即启用</span>
              <Switch checked={scheduleForm.is_active} onCheckedChange={(checked) => setScheduleForm((prev) => ({ ...prev, is_active: checked }))} />
            </div>

            <div className="flex justify-end">
              <Button className="cyber-btn-primary" onClick={() => void handleCreateSchedule()}>
                创建计划
              </Button>
            </div>
          </div>

          <div className="cyber-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground uppercase">计划列表</h3>
              <Badge className="cyber-badge-muted">{schedules.length} 个计划</Badge>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>项目</TableHead>
                    <TableHead>周期</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>下次执行</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSchedules ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">加载中...</TableCell>
                    </TableRow>
                  ) : schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">暂无计划</TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold">{item.name}</TableCell>
                        <TableCell>{projects.find((project) => project.id === item.project_id)?.name || item.project_id}</TableCell>
                        <TableCell>{item.interval_minutes} 分钟</TableCell>
                        <TableCell>
                          <Badge className={item.is_active ? "cyber-badge-success" : "cyber-badge-danger"}>
                            {item.is_active ? "启用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.next_run_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="cyber-btn-outline h-8" onClick={() => void handleToggleSchedule(item)}>
                              {item.is_active ? "停用" : "启用"}
                            </Button>
                            <Button variant="outline" size="sm" className="cyber-btn-ghost h-8 hover:text-rose-400" onClick={() => void handleDeleteSchedule(item)}>
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <div className="cyber-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground uppercase">维护漏洞知识库</h3>
                <p className="text-xs text-muted-foreground mt-1">供 AI 解释、规则生成和修复建议引用的本地知识条目。</p>
              </div>
              <Button variant="outline" className="cyber-btn-outline h-9" onClick={() => void loadKnowledgeEntries()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input value={knowledgeForm.title} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, title: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Input value={knowledgeForm.category} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, category: e.target.value }))} className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label>语言</Label>
                <Input value={knowledgeForm.language} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, language: e.target.value }))} className="cyber-input" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea value={knowledgeForm.content} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, content: e.target.value }))} rows={6} className="cyber-input min-h-[160px]" />
            </div>

            <div className="h-10 px-3 border border-border rounded-md flex items-center justify-between bg-background">
              <span className="text-sm text-muted-foreground">创建后立即启用</span>
              <Switch checked={knowledgeForm.is_active} onCheckedChange={(checked) => setKnowledgeForm((prev) => ({ ...prev, is_active: checked }))} />
            </div>

            <div className="flex justify-end">
              <Button className="cyber-btn-primary" onClick={() => void handleCreateKnowledge()}>
                新增知识条目
              </Button>
            </div>
          </div>

          <div className="cyber-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground uppercase">知识条目列表</h3>
              <Badge className="cyber-badge-muted">{knowledgeEntries.length} 条</Badge>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>语言</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingKnowledge ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">加载中...</TableCell>
                    </TableRow>
                  ) : knowledgeEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">暂无知识条目</TableCell>
                    </TableRow>
                  ) : (
                    knowledgeEntries.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold">{item.title}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.language}</TableCell>
                        <TableCell>
                          <Badge className={item.is_active ? "cyber-badge-success" : "cyber-badge-danger"}>
                            {item.is_active ? "启用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="cyber-btn-outline h-8" onClick={() => void handleToggleKnowledge(item)}>
                              {item.is_active ? "停用" : "启用"}
                            </Button>
                            <Button variant="outline" size="sm" className="cyber-btn-ghost h-8 hover:text-rose-400" onClick={() => void handleDeleteKnowledge(item)}>
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="config" className="flex flex-col gap-6">
          <SystemConfig />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <DatabaseManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
