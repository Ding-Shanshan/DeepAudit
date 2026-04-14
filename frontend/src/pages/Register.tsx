/**
 * Register Page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/shared/api/serverClient';
import AuthShell from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Lock } from 'lucide-react';
import { BRAND_NAME } from '@/shared/constants/branding';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      toast.success('注册成功，请登录');
      navigate('/login');
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join('; ');
        toast.error(messages || '注册失败');
      } else if (typeof detail === 'object') {
        toast.error(detail.msg || detail.message || JSON.stringify(detail));
      } else {
        toast.error(detail || '注册失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="创建账号"
      description={`注册新的${BRAND_NAME}账号后即可进入控制台，继续配置项目、规则与安全审计工作流。`}
      footer={
        <div className="flex items-center justify-between gap-4">
          <span>已有账号？</span>
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => navigate('/login')}
          >
            直接登录
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
            姓名
          </Label>
          <div className="relative">
            <Input
              id="fullName"
              placeholder="请输入姓名"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-12 pl-11"
            />
            <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            邮箱地址
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 pl-11"
            />
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            密码
          </Label>
          <div className="relative">
            <Input
              id="password"
              type="password"
              placeholder="请设置登录密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 pl-11"
            />
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-muted-foreground">
          注册成功后将直接使用当前邮箱进行登录认证。建议使用团队常用邮箱，方便后续项目协作。
        </div>

        <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              注册中...
            </span>
          ) : (
            "创建账号"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
