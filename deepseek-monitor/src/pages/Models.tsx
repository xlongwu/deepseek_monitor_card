import { useEffect, useState } from 'react';
import { getUsageStats } from '../services/tauri';
import type { UsageStats } from '../types';

export default function Models() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const data = await getUsageStats({ start, end });
      setStats(data);
    } catch (error) {
      console.error('Failed to load model stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">模型统计</h2>
        <p className="text-gray-500 mt-1">按模型查看用量分布</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">模型用量排行</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">请求数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">输入 Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">输出 Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">总 Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预估费用</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats?.by_model?.map((model, index) => (
                  <tr key={model.model} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{model.model}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{model.request_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{model.prompt_tokens}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{model.completion_tokens}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{model.total_tokens}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{model.estimated_cost}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
