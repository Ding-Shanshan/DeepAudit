# Dashboard 数据可视化重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Dashboard 页面从项目概览导向重构为风险洞察导向，包含 5 个新统计模块

**Architecture:** 创建 Dashboard 目录结构，将组件、类型、工具函数分离；使用现有 cyber-* 样式类和 recharts 图表库；前端聚合 AuditIssue + AgentFinding 数据

**Tech Stack:** React, TypeScript, Tailwind CSS, recharts, lucide-react

---

## 文件结构

```
frontend/src/pages/Dashboard/
├── index.tsx                      # 主 Dashboard 页面组件
├── types.ts                       # 类型定义
├── utils/
│   └── aggregation.ts             # 数据聚合函数
├── components/
│   ├── index.ts                   # 组件导出索引
│   ├── RiskOverviewCards.tsx      # 模块1: 风险态势总览
│   ├── RiskMatrixTable.tsx        # 模块2: 风险分布矩阵
│   ├── FileHotspotsList.tsx       # 模块3左: 文件热点排行
│   ├── VulnerabilityTypesRanking.tsx # 模块3右: 漏洞类型排行
│   ├── ResolutionProgressSection.tsx  # 模块4: 解决进度
│   └── ProjectRiskList.tsx        # 模块5: 项目风险列表
```

---

## Task 1: 创建类型定义

**Files:**
- Create: `frontend/src/pages/Dashboard/types.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
/**
 * Dashboard 类型定义
 * 风险洞察导向的数据可视化页面
 */

import type { AuditIssue, Project, AuditTask } from "@/shared/types";
import type { AgentTask, AgentFinding } from "@/shared/api/agentTasks";

// ============ 统计数据类型 ============

/** 风险态势总览数据 */
export interface RiskOverviewData {
  criticalIssues: number;      // 严重问题数
  highRiskProjects: number;    // 高危项目数
  pendingIssues: number;       // 待解决问题数
  todayNewIssues: number;      // 今日新增问题
}

/** 风险分布矩阵行数据 */
export interface RiskMatrixRow {
  projectId: string;
  projectName: string;
  critical: number;            // 严重问题数
  high: number;                 // 高危问题数
  medium: number;               // 中危问题数
  low: number;                  // 低危问题数
  total: number;                // 未解决问题总数
}

/** 文件热点数据 */
export interface FileHotspot {
  filePath: string;
  shortPath: string;           // 截断显示的路径
  issueCount: number;
  maxSeverity: 'critical' | 'high' | 'medium' | 'low';
}

/** 漏洞类型统计 */
export interface VulnTypeCount {
  type: string;                // issue_type 或 vulnerability_type
  typeName: string;            // 显示名称
  count: number;
  maxSeverity: 'critical' | 'high' | 'medium' | 'low';
}

/** 解决进度数据 */
export interface ResolutionProgress {
  total: number;               // 发现问题总数
  resolved: number;            // 已解决问题数
  percentage: number;          // 解决百分比
  trend: Array<{               // 近7天解决趋势
    date: string;
    count: number;
  }>;
}

/** 项目风险项 */
export interface ProjectRiskItem {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalIssues: number;         // 未解决问题总数
  riskScore: number;           // 风险加权分: critical*4 + high*2 + medium*1
  maxSeverity: 'critical' | 'high' | 'medium' | 'low';
  lastAuditAt?: string;
}

// ============ 聚合数据来源类型 ============

/** 统一的 Issue 数据结构（用于聚合） */
export interface UnifiedIssue {
  id: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskKind: 'audit' | 'agent';
  filePath: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issueType: string;           // bug, security, performance 等
  status: string;              // open, pending_review, resolved, false_positive
  createdAt: string;
  resolvedAt: string | null;
}

/** 聚合后的 Dashboard 全量数据 */
export interface DashboardAggregatedData {
  riskOverview: RiskOverviewData;
  riskMatrix: RiskMatrixRow[];
  fileHotspots: FileHotspot[];
  vulnerabilityTypes: VulnTypeCount[];
  resolutionProgress: ResolutionProgress;
  projectRiskList: ProjectRiskItem[];
}

// ============ 组件 Props 类型 ============

export interface RiskOverviewCardsProps {
  data: RiskOverviewData;
  loading?: boolean;
}

export interface RiskMatrixTableProps {
  data: RiskMatrixRow[];
  loading?: boolean;
}

export interface FileHotspotsListProps {
  data: FileHotspot[];
  loading?: boolean;
}

export interface VulnerabilityTypesRankingProps {
  data: VulnTypeCount[];
  loading?: boolean;
}

export interface ResolutionProgressSectionProps {
  data: ResolutionProgress;
  loading?: boolean;
}

export interface ProjectRiskListProps {
  data: ProjectRiskItem[];
  loading?: boolean;
}

// ============ 辅助类型 ============

/** 严重等级颜色映射 */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export const SEVERITY_COLORS: Record<SeverityLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  low: { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/20' },
};

/** 问题类型中文映射 */
export const ISSUE_TYPE_NAMES: Record<string, string> = {
  security: '安全问题',
  bug: '潜在Bug',
  performance: '性能问题',
  style: '代码风格',
  maintainability: '可维护性',
  sql_injection: 'SQL注入',
  xss: 'XSS跨站脚本',
  hardcoded_credentials: '硬编码密码',
  path_traversal: '路径遍历',
  crypto_weakness: '加密弱点',
  insecure_deserialization: '不安全反序列化',
  command_injection: '命令注入',
  open_redirect: '开放重定向',
  ssrf: 'SSRF服务端请求伪造',
  information_disclosure: '信息泄露',
  authentication_bypass: '认证绕过',
  access_control: '访问控制缺陷',
};