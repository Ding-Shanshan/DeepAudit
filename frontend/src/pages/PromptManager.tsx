/**
 * Prompt Template Manager Page
 * Cyberpunk Terminal Aesthetic - Table View matching Static Rules style
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit,
  Copy,
  Play,
  FileText,
  Sparkles,
  Check,
  Loader2,
  Search,
} from 'lucide-react';
import {
  getPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  testPromptTemplate,
  type PromptTemplate,
  type PromptTemplateCreate,
} from '@/shared/api/prompts';
import { TEST_CODE_SAMPLES, TEMPLATE_TEST_CODES } from './prompt-manager/testCodeSamples';

const TEMPLATE_TYPES = [
  { value: 'system', label: '系统提示词' },
  { value: 'user', label: '用户提示词' },
  { value: 'analysis', label: '分析提示词' },
];

export default function PromptManager() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [form, setForm] = useState<PromptTemplateCreate>({
    name: '', description: '', template_type: 'system', content_zh: '', content_en: '', is_active: true,
  });
  const [testForm, setTestForm] = useState({ language: 'python', code: TEST_CODE_SAMPLES.python, promptLang: 'zh' as 'zh' | 'en' });
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewTemplate, setViewTemplate] = useState<PromptTemplate | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterEnabled, setFilterEnabled] = useState('all');

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await getPromptTemplates();
      setTemplates(response.items);
    } catch (error) {
      toast.error('加载提示词模板失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    if (filterName && !template.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterType !== 'all' && template.template_type !== filterType) return false;
    if (filterEnabled === 'enabled' && !template.is_active) return false;
    if (filterEnabled === 'disabled' && template.is_active) return false;
    return true;
  });

  const handleCreate = async () => {
    try {
      await createPromptTemplate(form);
      toast.success('创建成功');
      setShowCreateDialog(false);
      resetForm();
      loadTemplates();
    } catch (error) { toast.error('创建失败'); }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;
    try {
      await updatePromptTemplate(selectedTemplate.id, form);
      toast.success('更新成功');
      setShowEditDialog(false);
      loadTemplates();
    } catch (error) { toast.error('更新失败'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此模板吗？')) return;
    try {
      await deletePromptTemplate(id);
      toast.success('删除成功');
      loadTemplates();
    } catch (error: any) { toast.error(error.message || '删除失败'); }
  };

  const handleTest = async () => {
    if (!selectedTemplate) return;
    const content = testForm.promptLang === 'zh'
      ? (selectedTemplate.content_zh || selectedTemplate.content_en || '')
      : (selectedTemplate.content_en || selectedTemplate.content_zh || '');
    if (!content) { toast.error('提示词内容为空'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testPromptTemplate({ content, language: testForm.language, code: testForm.code, output_language: testForm.promptLang });
      setTestResult(result);
      if (result.success) toast.success(`测试完成，耗时 ${result.execution_time}s`);
      else toast.error(result.error || '测试失败');
    } catch (error: any) { toast.error(error.message || '测试失败'); }
    finally { setTesting(false); }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', template_type: 'system', content_zh: '', content_en: '', is_active: true });
  };

  const openEditDialog = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setForm({ name: template.name, description: template.description || '', template_type: template.template_type, content_zh: template.content_zh || '', content_en: template.content_en || '', is_active: template.is_active });
    setShowEditDialog(true);
  };

  const openTestDialog = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setTestResult(null);
    const templateCodes = TEMPLATE_TEST_CODES[template.name];
    const defaultLang = 'python';
    if (templateCodes && templateCodes[defaultLang]) {
      setTestForm(prev => ({ ...prev, language: defaultLang, code: templateCodes[defaultLang] }));
    } else {
      setTestForm(prev => ({ ...prev, language: defaultLang, code: TEST_CODE_SAMPLES[defaultLang] }));
    }
    setShowTestDialog(true);
  };

  const openViewDialog = (template: PromptTemplate) => {
    setViewTemplate(template);
    setShowViewDialog(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen cyber-bg-elevated">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto" />
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      {templates.length === 0 ? (
        <div className="cyber-card p-16">
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <p className="empty-state-title">暂无提示词模板</p>
            <p className="empty-state-description">点击"新建规则"创建自定义提示词</p>
            <Button className="cyber-btn-primary h-12 px-8 mt-6" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              创建模板
            </Button>
          </div>
        </div>
      ) : (
        <div className="cyber-card p-0">
          {/* Toolbar: filters + actions */}
          <div className="p-4 flex items-center gap-3 border-b border-border flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                placeholder="搜索规则名称"
                className="h-8 text-sm !pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="cyber-input h-8 w-[160px] text-sm">
                <SelectValue placeholder="模板类型" />
              </SelectTrigger>
              <SelectContent className="cyber-dialog border-border">
                <SelectItem value="all">全部类型</SelectItem>
                {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterEnabled} onValueChange={setFilterEnabled}>
              <SelectTrigger className="cyber-input h-8 w-[120px] text-sm">
                <SelectValue placeholder="启用状态" />
              </SelectTrigger>
              <SelectContent className="cyber-dialog border-border">
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="enabled">已启用</SelectItem>
                <SelectItem value="disabled">已禁用</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="cyber-btn-primary h-8">
                <Plus className="w-4 h-4 mr-2" />
                新建规则
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-6 font-medium">规则名称</th>
                  <th className="text-left py-2 px-3 font-medium">简介</th>
                  <th className="text-left py-2 px-3 font-medium">模板类型</th>
                  <th className="text-left py-2 px-3 font-medium">查看详情</th>
                  <th className="text-left py-2 px-3 font-medium">是否启用</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      无匹配规则
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map(template => (
                    <tr key={template.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 px-6">
                        <span className="font-medium text-foreground">{template.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">{template.description || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-muted-foreground">{TEMPLATE_TYPES.find(t => t.value === template.template_type)?.label}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button onClick={() => openViewDialog(template)} className="text-primary hover:underline">
                          查看详情
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Switch checked={template.is_active} onCheckedChange={() => {
                            const updated = { ...form, is_active: !template.is_active };
                            setSelectedTemplate(template);
                            setForm({
                              name: template.name,
                              description: template.description || '',
                              template_type: template.template_type,
                              content_zh: template.content_zh || '',
                              content_en: template.content_en || '',
                              is_active: !template.is_active,
                            });
                            updatePromptTemplate(template.id, {
                              name: template.name,
                              description: template.description || '',
                              template_type: template.template_type,
                              content_zh: template.content_zh || '',
                              content_en: template.content_en || '',
                              is_active: !template.is_active,
                            }).then(() => {
                              toast.success(template.is_active ? '已禁用' : '已启用');
                              loadTemplates();
                            }).catch(() => toast.error('操作失败'));
                          }} className="h-5 w-9 data-[state=checked]:bg-violet-300 data-[state=unchecked]:bg-muted [&>[data-slot=switch-thumb]]:w-4 [&>[data-slot=switch-thumb]]:h-4 [&>[data-slot=switch-thumb]]:data-[state=checked]:translate-x-4 [&>[data-slot=switch-thumb]]:data-[state=unchecked]:translate-x-0.5" />
                          {!template.is_system && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)} className="cyber-btn-ghost h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="h-7 w-7 hover:bg-destructive/12 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={showCreateDialog || showEditDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setShowEditDialog(false); } }}>
        <SheetContent side="right" className="!w-[min(90vw,700px)] sm:max-w-[700px] !sm:max-w-none flex flex-col p-0 gap-0 border-border overflow-y-auto">
          <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0 bg-muted">
            <SheetTitle className="flex items-center gap-3 font-mono text-foreground">
              <div className="p-2 bg-primary/20 rounded border border-primary/30">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-base font-bold uppercase tracking-wider">
                {showEditDialog ? '编辑规则' : '新建规则'}
              </span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground font-normal">
              {showEditDialog ? '修改提示词模板配置' : '创建自定义提示词模板'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">模板名称 *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：安全专项审计" className="cyber-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">模板类型</Label>
                <Select value={form.template_type} onValueChange={v => setForm({ ...form, template_type: v })}>
                  <SelectTrigger className="cyber-input"><SelectValue /></SelectTrigger>
                  <SelectContent className="cyber-dialog border-border">
                    {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">描述</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="模板用途描述" className="cyber-input" />
            </div>
            <Tabs defaultValue="zh" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted border border-border p-1 h-auto gap-1 rounded">
                <TabsTrigger value="zh" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-2 text-muted-foreground transition-all rounded-sm text-xs">
                  中文提示词
                </TabsTrigger>
                <TabsTrigger value="en" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-2 text-muted-foreground transition-all rounded-sm text-xs">
                  英文提示词
                </TabsTrigger>
              </TabsList>
              <TabsContent value="zh" className="mt-4">
                <Textarea value={form.content_zh} onChange={e => setForm({ ...form, content_zh: e.target.value })} placeholder="输入中文提示词内容..." rows={12} className="cyber-input font-mono text-sm text-primary" />
              </TabsContent>
              <TabsContent value="en" className="mt-4">
                <Textarea value={form.content_en} onChange={e => setForm({ ...form, content_en: e.target.value })} placeholder="Enter English prompt content..." rows={12} className="cyber-input font-mono text-sm text-primary" />
              </TabsContent>
            </Tabs>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label className="text-xs font-bold text-muted-foreground uppercase">启用此模板</Label>
            </div>
          </div>
          <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 bg-muted border-t border-border">
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setShowEditDialog(false); }} className="cyber-btn-outline">取消</Button>
            <Button onClick={showEditDialog ? handleUpdate : handleCreate} className="cyber-btn-primary">{showEditDialog ? '保存' : '创建'}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="!w-[min(95vw,1200px)] !max-w-none max-h-[85vh] flex flex-col p-0 gap-0 cyber-dialog border border-border rounded-lg">
          <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0 bg-muted">
            <DialogTitle className="flex items-center gap-3 font-mono text-foreground">
              <div className="p-2 bg-violet-500/20 rounded border border-violet-500/30">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <span className="text-base font-bold uppercase tracking-wider">
                  测试提示词: {selectedTemplate?.name}
                </span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">使用示例代码测试提示词效果</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-6">
            {/* Left: Input */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">编程语言</Label>
                  <Select value={testForm.language} onValueChange={v => {
                    const templateCodes = selectedTemplate ? TEMPLATE_TEST_CODES[selectedTemplate.name] : null;
                    const code = templateCodes?.[v] || TEST_CODE_SAMPLES[v] || TEST_CODE_SAMPLES.python;
                    setTestForm({ ...testForm, language: v, code });
                  }}>
                    <SelectTrigger className="cyber-input"><SelectValue /></SelectTrigger>
                    <SelectContent className="cyber-dialog border-border">
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">提示词语言</Label>
                  <Select value={testForm.promptLang} onValueChange={(v: 'zh' | 'en') => setTestForm({ ...testForm, promptLang: v })}>
                    <SelectTrigger className="cyber-input"><SelectValue /></SelectTrigger>
                    <SelectContent className="cyber-dialog border-border">
                      <SelectItem value="zh">中文提示词</SelectItem>
                      <SelectItem value="en">英文提示词</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">测试代码</Label>
                <Textarea value={testForm.code} onChange={e => setTestForm({ ...testForm, code: e.target.value })} rows={10} className="cyber-input font-mono text-sm text-primary" />
              </div>
              <Button onClick={handleTest} disabled={testing} className="w-full cyber-btn-primary h-12">
                {testing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中...</>) : (<><Play className="w-4 h-4 mr-2" />运行测试</>)}
              </Button>
            </div>
            {/* Right: Results */}
            <div className="space-y-4">
              <Label className="text-xs font-bold text-muted-foreground uppercase">分析结果</Label>
              <div className="border border-border h-[400px] overflow-auto cyber-bg-elevated rounded">
                {testResult ? (
                  testResult.success ? (
                    <div className="flex flex-col h-full">
                      {/* Success Header */}
                      <div className="flex items-center justify-between p-3 bg-primary/10 border-b border-primary/25">
                        <div className="flex items-center gap-2 text-primary font-bold">
                          <Check className="w-5 h-5" />
                          <span className="uppercase text-sm">分析成功</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {testResult.execution_time}s
                        </span>
                      </div>

                      {/* Quality Score */}
                      {testResult.result?.quality_score !== undefined && (
                        <div className="p-3 bg-muted border-b border-border flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-muted-foreground">质量评分</span>
                          <div className="flex items-center gap-2">
                            <div className={`text-2xl font-bold ${testResult.result.quality_score >= 80 ? 'text-primary' :
                              testResult.result.quality_score >= 60 ? 'text-warning' : 'text-destructive'
                              }`}>
                              {testResult.result.quality_score}
                            </div>
                            <span className="text-xs text-muted-foreground">/ 100</span>
                          </div>
                        </div>
                      )}

                      {/* Issues List */}
                      <ScrollArea className="flex-1 p-3">
                        {testResult.result?.issues?.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase text-muted-foreground">发现问题</span>
                              <span className="text-xs text-destructive font-bold">
                                {testResult.result.issues.length} 个
                              </span>
                            </div>
                            {testResult.result.issues.map((issue: any, idx: number) => (
                              <div key={idx} className="cyber-card p-0 overflow-hidden">
                                <div className={`px-3 py-2 border-b border-border flex items-center justify-between ${issue.severity === 'critical' ? 'bg-destructive/12 text-destructive' :
                                  issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                    issue.severity === 'medium' ? 'bg-amber-500/20 text-warning' : 'bg-secondary/15 text-secondary'
                                  }`}>
                                  <span className="font-bold text-xs uppercase">{issue.severity}</span>
                                  {issue.line && <span className="text-xs opacity-80">行 {issue.line}</span>}
                                </div>
                                <div className="p-3">
                                  <h4 className="font-bold text-sm mb-1 text-foreground">{issue.title}</h4>
                                  {issue.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">{issue.description}</p>
                                  )}
                                  {issue.suggestion && (
                                    <div className="mt-2 p-2 bg-secondary/8 border-l-2 border-sky-500 rounded-r">
                                      <p className="text-xs text-secondary">
                                        <span className="font-bold">建议: </span>
                                        {issue.suggestion}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-primary/20 border border-primary/25 flex items-center justify-center mx-auto mb-3 rounded">
                              <Check className="w-6 h-6 text-primary" />
                            </div>
                            <p className="font-bold text-primary uppercase text-sm">未发现问题</p>
                            <p className="text-xs text-muted-foreground mt-1">代码质量良好</p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      {/* Error Header */}
                      <div className="flex items-center justify-between p-3 bg-destructive/8 border-b border-destructive/25">
                        <div className="flex items-center gap-2 text-destructive font-bold">
                          <span className="uppercase text-sm">测试失败</span>
                        </div>
                        {testResult.execution_time && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {testResult.execution_time}s
                          </span>
                        )}
                      </div>
                      {/* Error Details */}
                      <div className="flex-1 p-4">
                        <div className="bg-destructive/8 border border-destructive/25 p-4 h-full overflow-auto rounded">
                          <pre className="text-sm text-destructive font-mono whitespace-pre-wrap break-words">
                            {testResult.error || '未知错误'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <div className="w-16 h-16 bg-muted border border-border flex items-center justify-center mb-4 rounded">
                      <Play className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-mono uppercase text-sm">点击"运行测试"</p>
                    <p className="font-mono text-xs mt-1">查看分析结果</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 bg-muted border-t border-border">
            <Button variant="outline" onClick={() => setShowTestDialog(false)} className="cyber-btn-outline">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="!w-[min(90vw,800px)] !max-w-none max-h-[85vh] flex flex-col p-0 gap-0 cyber-dialog border border-border rounded-lg">
          <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0 bg-muted">
            <DialogTitle className="flex items-center gap-3 font-mono text-foreground">
              <div className="p-2 bg-primary/20 rounded border border-primary/30">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-base font-bold uppercase tracking-wider">
                {viewTemplate?.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <Tabs defaultValue="zh" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted border border-border p-1 h-auto gap-1 rounded">
                <TabsTrigger value="zh" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-2 text-muted-foreground transition-all rounded-sm text-xs">
                  中文提示词
                </TabsTrigger>
                <TabsTrigger value="en" className="data-[state=active]:bg-primary data-[state=active]:text-foreground font-mono font-bold uppercase py-2 text-muted-foreground transition-all rounded-sm text-xs">
                  英文提示词
                </TabsTrigger>
              </TabsList>
              <TabsContent value="zh" className="mt-4">
                <div className="cyber-bg-elevated text-primary p-4 border border-border font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto rounded">
                  {viewTemplate?.content_zh || '(无中文内容)'}
                </div>
              </TabsContent>
              <TabsContent value="en" className="mt-4">
                <div className="cyber-bg-elevated text-primary p-4 border border-border font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto rounded">
                  {viewTemplate?.content_en || '(No English content)'}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 bg-muted border-t border-border">
            <Button variant="outline" onClick={() => copyToClipboard(viewTemplate?.content_zh || viewTemplate?.content_en || '')} className="cyber-btn-outline">
              <Copy className="w-4 h-4 mr-2" />
              复制内容
            </Button>
            <Button variant="outline" onClick={() => { setShowViewDialog(false); if (viewTemplate) openTestDialog(viewTemplate); }} className="cyber-btn-outline">
              <Play className="w-4 h-4 mr-2" />
              测试
            </Button>
            {!viewTemplate?.is_system && (
              <Button variant="outline" onClick={() => { setShowViewDialog(false); if (viewTemplate) openEditDialog(viewTemplate); }} className="cyber-btn-outline">
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </Button>
            )}
            <Button onClick={() => setShowViewDialog(false)} className="cyber-btn-primary">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}