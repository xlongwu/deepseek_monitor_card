import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { listApiKeys, saveApiKey, deleteApiKey } from '../services/tauri';

export default function Keys() {
  const { apiKeys, setApiKeys } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const keys = await listApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  }

  async function handleAddKey() {
    if (!newAlias.trim() || !newApiKey.trim()) return;
    
    setLoading(true);
    try {
      await saveApiKey(newAlias, newApiKey);
      setNewAlias('');
      setNewApiKey('');
      setShowAddModal(false);
      await loadKeys();
    } catch (error) {
      console.error('Failed to save API key:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm('确定要删除这个 API Key 吗？')) return;
    
    try {
      await deleteApiKey(id);
      await loadKeys();
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Key 管理</h2>
          <p className="text-gray-500 mt-1">管理 DeepSeek API Key</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          添加 Key
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">别名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">指纹</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">提供商</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{key.alias}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{key.key_fingerprint}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{key.provider}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {apiKeys.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    暂无 API Key，请点击右上角添加
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">添加 API Key</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">别名</label>
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="例如：个人账号"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Key 将被安全存储在系统钥匙串中</p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddKey}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
