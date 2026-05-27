import { useEffect, useState } from 'react';
import { getUsageStats } from '../services/tauri';
import type { UsageStats, TimeRange } from '../types';

export default function Usage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadStats();
  }, [days]);

  async function loadStats() {
    setLoading(true);
    try {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const range: TimeRange = { start, end };
      const data = await getUsageStats(range);
      setStats(data);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">用量明细</h2>
          <p className="text-gray-500 mt-1">查看 API 调用统计</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={1}>最近1天</option>
          <option value={7}>最近7天</option>
          <option value={30}>最近30天</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">总请求数</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.total_requests || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">总 Tokens</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.total_tokens || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">输入 Tokens</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.total_prompt_tokens || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">预估费用</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.total_estimated_cost || '0.00'}</p>
            </div>
          </div>

          {/* By Model */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">按模型统计</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">请求数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">输入 Tokens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">输出 Tokens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">总 Tokens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预估费用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats?.by_model?.map((model) => (
                    <tr key={model.model} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{model.model}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{model.request_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{model.prompt_tokens}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{model.completion_tokens}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{model.total_tokens}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{model.estimated_cost}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* By Source */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">按来源统计</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">请求数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预估费用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats?.by_source?.map((source) => (
                    <tr key={source.source_name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{source.source_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{source.request_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{source.estimated_cost}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
