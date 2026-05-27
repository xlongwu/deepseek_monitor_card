import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { getProxyStatus, startProxy, stopProxy } from '../services/tauri';

export default function Proxy() {
  const { proxyStatus, setProxyStatus } = useAppStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProxyStatus();
  }, []);

  async function loadProxyStatus() {
    try {
      const status = await getProxyStatus();
      setProxyStatus(status);
    } catch (error) {
      console.error('Failed to load proxy status:', error);
    }
  }

  async function handleToggleProxy() {
    setLoading(true);
    try {
      if (proxyStatus?.running) {
        await stopProxy();
      } else {
        await startProxy();
      }
      await loadProxyStatus();
    } catch (error) {
      console.error('Failed to toggle proxy:', error);
    } finally {
      setLoading(false);
    }
  }

  function copyConfig() {
    const config = `base_url: ${proxyStatus?.url || 'http://127.0.0.1:8787'}
api_key: local-proxy-token`;
    navigator.clipboard.writeText(config).then(() => {
      alert('配置已复制到剪贴板');
    });
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">代理设置</h2>
        <p className="text-gray-500 mt-1">配置本地代理以统计 API 用量</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">本地代理状态</h3>
            <p className="text-gray-500 mt-1">将第三方工具的 base_url 指向本地代理即可统计用量</p>
          </div>
          <button
            onClick={handleToggleProxy}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              proxyStatus?.running
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            {loading ? '处理中...' : proxyStatus?.running ? '停止代理' : '启动代理'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">代理地址</label>
            <div className="flex items-center">
              <input
                type="text"
                readOnly
                value={proxyStatus?.url || 'http://127.0.0.1:8787'}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
              />
              <button
                onClick={copyConfig}
                className="ml-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                复制配置
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                proxyStatus?.running ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-gray-900">
                {proxyStatus?.running ? '运行中' : '已停止'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h3>
        <div className="space-y-4 text-gray-600">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Node.js / OpenAI SDK</h4>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`const client = new OpenAI({
  baseURL: "${proxyStatus?.url || 'http://127.0.0.1:8787'}",
  apiKey: "local-proxy-token",
});`}
            </pre>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Python / OpenAI SDK</h4>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`client = OpenAI(
    base_url="${proxyStatus?.url || 'http://127.0.0.1:8787'}",
    api_key="local-proxy-token",
)`}
            </pre>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">注意事项</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>代理默认只监听 127.0.0.1，仅本机可访问</li>
              <li>第三方工具配置代理后，实际请求仍通过你的 DeepSeek API Key 转发</li>
              <li>流式请求会自动注入 include_usage=true 以统计用量</li>
              <li>如果端口被占用，代理会自动尝试下一个可用端口</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
