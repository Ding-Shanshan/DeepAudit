/**
 * RiskMatrixTable - 风险分布矩阵
 * 项目 × 严重等级的二维分布表格
 */

import { memo } from "react";
import { Link } from "react-router-dom";
import { Grid3X3, AlertTriangle } from "lucide-react";
import type { RiskMatrixTableProps, SeverityLevel } from "../types";
import { SEVERITY_COLORS } from "../types";

// 严重等级列配置
const SEVERITY_COLUMNS: Array<{ key: SeverityLevel; label: string }> = [
  { key: 'critical', label: '严重' },
  { key: 'high', label: '高危' },
  { key: 'medium', label: '中危' },
  { key: 'low', label: '低危' },
];

// 渲染带背景色的单元格数字
function SeverityCell({
  count,
  severity,
  projectId,
}: {
  count: number;
  severity: SeverityLevel;
  projectId: string;
}) {
  if (count === 0) {
    return <span className="text-muted-foreground block text-center">0</span>;
  }

  const colors = SEVERITY_COLORS[severity];

  return (
    <Link
      to={`/projects/${projectId}?severity=${severity}`}
      className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-md ${colors.bg} ${colors.text} ${colors.border} font-semibold text-xs hover:opacity-80 transition-opacity`}
    >
      {count}
    </Link>
  );
}

export const RiskMatrixTable = memo(function RiskMatrixTable({
  data,
  loading = false,
}: RiskMatrixTableProps) {
  if (loading) {
    return (
      <div className="cyber-card p-3">
        <div className="section-header">
          <Grid3X3 className="w-5 h-5 text-primary" />
          <h3 className="section-title">风险分布矩阵</h3>
        </div>
        <div className="flex items-center justify-center h-[200px]">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="cyber-card p-3">
        <div className="section-header">
          <Grid3X3 className="w-5 h-5 text-primary" />
          <h3 className="section-title">风险分布矩阵</h3>
        </div>
        <div className="empty-state h-[200px]">
          <AlertTriangle className="empty-state-icon" />
          <p className="empty-state-description">暂无风险分布数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-card p-3">
      <div className="section-header">
        <Grid3X3 className="w-5 h-5 text-primary" />
        <h3 className="section-title">风险分布矩阵</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          按 TOP 10 项目未解决问题数排序
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="cyber-table">
          <thead>
            <tr>
              <th className="text-left">项目</th>
              {SEVERITY_COLUMNS.map((col) => (
                <th key={col.key} className="text-center">{col.label}</th>
              ))}
              <th className="text-center">总计</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.projectId}>
                <td>
                  <Link
                    to={`/projects/${row.projectId}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {row.projectName}
                  </Link>
                </td>
                {SEVERITY_COLUMNS.map((col) => (
                  <td key={col.key} className="text-center">
                    <SeverityCell
                      count={row[col.key]}
                      severity={col.key}
                      projectId={row.projectId}
                    />
                  </td>
                ))}
                <td className="text-center font-bold text-foreground">
                  <span className="inline-block min-w-[32px]">{row.total}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default RiskMatrixTable;