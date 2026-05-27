import { useState } from 'react';
import { exportUsage } from '../services/tauri';
import type { TimeRange } from '../types';

export default function Data() {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [days, setDays] = useState(7);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const range: TimeRange = { start, end };
      
      const data = await exportUsage(format, range);
      
      const blob = new Blob([data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deepseek-usage-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">数据导出</h2>
        <p className="text-gray-500 mt-1">导出用量数据用于分析</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">CSV</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={format === 'json'}
                  onChange={() => setFormat('json')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">JSON</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>最近1天</option>
              <option value={7}>最近7天</option>
              <option value={30}>最近30天</option>
              <option value={90}>最近90天</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {exporting ? '导出中...' : '导出数据'}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">导出内容说明</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>导出数据包含经过本地代理的请求记录</li>
            <li>包含字段：时间、来源、模型、Tokens、费用、状态等</li>
            <li>CSV 格式可直接用 Excel 打开分析</li>
            <li>JSON 格式包含完整的请求元数据</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">数据清理</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">请求日志</h4>
              <p className="text-sm text-gray-500">保留 180 天的请求明细</p>
            </div>
            <span className="text-sm text-gray-500">自动清理</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">日聚合数据</h4>
              <p className="text-sm text-gray-500">永久保留每日统计摘要</p>
            </div>
            <span className="text-sm text-gray-500">永久保留</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">余额快照</h4>
              <p className="text-sm text-gray-500">保留 90 天的余额历史</p>
            </div>
            <span className="text-sm text-gray-500">自动清理</span>
          </div>
        </div>
      </div>
    </div>
  );
}
