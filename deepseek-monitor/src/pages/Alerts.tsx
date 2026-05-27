import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { getAlertConfig, setAlertConfig, getAlertEvents, acknowledgeAlert } from '../services/tauri';
import type { AlertConfig } from '../types';

export default function Alerts() {
  const { alerts, setAlerts } = useAppStore();
  const [config, setConfigState] = useState<AlertConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
    loadAlerts();
  }, []);

  async function loadConfig() {
    try {
      const data = await getAlertConfig();
      setConfigState(data);
    } catch (error) {
      console.error('Failed to load alert config:', error);
    }
  }

  async function loadAlerts() {
    try {
      const data = await getAlertEvents();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  async function handleSaveConfig() {
    if (!config) return;
    
    setSaving(true);
    try {
      await setAlertConfig(config);
      alert('配置已保存');
    } catch (error) {
      console.error('Failed to save alert config:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleAcknowledge(id: string) {
    try {
      await acknowledgeAlert(id);
      await loadAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }

  const severityColors: Record<string, string> = {
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">告警设置</h2>
        <p className="text-gray-500 mt-1">配置告警阈值与查看告警历史</p>
      </div>

      {/* Alert Config */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">告警阈值配置</h3>
        
        {config && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">低余额阈值</label>
              <input
                type="text"
                value={config.low_balance_threshold}
                onChange={(e) => setConfigState({ ...config, low_balance_threshold: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">余额低于此值时触发提醒</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">小时消耗阈值</label>
              <input
                type="text"
                value={config.hourly_cost_threshold}
                onChange={(e) => setConfigState({ ...config, hourly_cost_threshold: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">1小时消耗超过此值时触发提醒</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">单次请求 Token 阈值</label>
              <input
                type="number"
                value={config.single_request_token_threshold}
                onChange={(e) => setConfigState({ ...config, single_request_token_threshold: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">单次请求超过此 Token 数时触发提醒</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.notify_on_401}
                  onChange={(e) => setConfigState({ ...config, notify_on_401: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">API Key 无效时通知 (401)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.notify_on_429}
                  onChange={(e) => setConfigState({ ...config, notify_on_429: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">请求频繁时通知 (429)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.notify_on_503}
                  onChange={(e) => setConfigState({ ...config, notify_on_503: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">服务不可用时通知 (503)</span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      {/* Alert History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">未处理告警</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">消息</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      severityColors[alert.severity] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {alert.severity === 'warning' ? '警告' : alert.severity === 'error' ? '错误' : '信息'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{alert.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{alert.message}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(alert.triggered_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      确认
                    </button>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    暂无未处理告警
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
