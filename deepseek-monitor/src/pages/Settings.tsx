import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  RefreshCw,
  Bell,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  FileDown,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  listApiKeys,
  saveApiKey,
  deleteApiKey,
  setActiveApiKey,
  getSettings,
  setSettings,
  exportUsage,
} from '../services/tauri';
import type { ApiKeyMeta, AppSettings, TimeRange } from '../types';
import { GlassCard, PageHeader, SectionTitle } from '../components/AppleUI';

export default function Settings() {
  // --- States for Keys ---
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);

  // --- States for Settings ---
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- States for Export ---
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportDays, setExportDays] = useState(7);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      const k = await listApiKeys();
      setKeys(k);

      const s = await getSettings();
      setAppSettings(s);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  }

  // --- Actions for Keys ---
  async function handleAddKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newAlias.trim() || !newApiKey.trim()) return;

    setKeyLoading(true);
    try {
      await saveApiKey(newAlias.trim(), newApiKey.trim());
      setNewAlias('');
      setNewApiKey('');
      const k = await listApiKeys();
      setKeys(k);
    } catch (err) {
      console.error('Failed to add API key:', err);
    } finally {
      setKeyLoading(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm('确定要彻底删除此 API Key 吗？此操作无法撤销。')) return;
    try {
      await deleteApiKey(id);
      const k = await listApiKeys();
      setKeys(k);
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  }

  async function handleSetActiveKey(id: string) {
    try {
      await setActiveApiKey(id);
      const k = await listApiKeys();
      setKeys(k);
    } catch (err) {
      console.error('Failed to activate API key:', err);
    }
  }

  // --- Actions for App Settings ---
  async function handleSaveSettings() {
    if (!appSettings) return;
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      await setSettings(appSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  }

  // --- Actions for Export ---
  async function handleExport() {
    setExporting(true);
    try {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - exportDays * 24 * 60 * 60 * 1000).toISOString();
      const range: TimeRange = { start, end };

      const data = await exportUsage(exportFormat, range);
      const blob = new Blob([data], {
        type: exportFormat === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deepseek-usage-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 overflow-y-auto max-h-[100vh]">
      <PageHeader title="系统设置" description="管理 API 密钥、代理偏好、警报阈值与导出账本" />

      {/* Grid: Left Settings navigation column, Right details */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left column: Quick settings group (Preferences, Notifications, Advanced) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Group 1: API Key Management */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
              <Key className="h-4.5 w-4.5 text-blue-500" />
              <SectionTitle title="API Key 密钥包" subtitle="由您的操作系统本机安全钥匙串托管，物理防窃防泄漏。" />
            </div>

            {/* Keys table list */}
            <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/40 mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">别名</th>
                    <th className="px-4 py-3">密钥指纹</th>
                    <th className="px-4 py-3">活动状态</th>
                    <th className="px-4 py-3 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/50 transition-colors font-medium">
                      <td className="px-4 py-3 text-slate-800 font-bold">{k.alias}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono tracking-tight">{k.key_fingerprint}</td>
                      <td className="px-4 py-3">
                        {k.is_active === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/15">
                            当前活动
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-semibold">未启用</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-3">
                        {k.is_active !== 1 && (
                          <button
                            onClick={() => handleSetActiveKey(k.id)}
                            className="text-blue-600 hover:text-blue-800 transition font-extrabold cursor-pointer"
                          >
                            激活
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="text-rose-500 hover:text-rose-700 transition font-extrabold cursor-pointer"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {keys.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-semibold">
                        暂无任何已配置的 API Key 密钥。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add new key inline form */}
            <form onSubmit={handleAddKey} className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4">
              <h4 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                新增 DeepSeek API Key
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">别名 (Alias)</label>
                  <input
                    type="text"
                    required
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    placeholder="e.g. 个人开发备用"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-300 shadow-inner focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">API Key (秘钥值)</label>
                  <div className="relative">
                    <input
                      type={showKeyPassword ? 'text' : 'password'}
                      required
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-300 shadow-inner focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword((v) => !v)}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-700 transition"
                    >
                      {showKeyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={keyLoading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-850 transition duration-150 cursor-pointer disabled:opacity-50"
                >
                  {keyLoading ? '正在配置钥匙串...' : '添加并激活'}
                </button>
              </div>
            </form>
          </GlassCard>

          {/* Group 2: App Preferences */}
          {appSettings && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
                <RefreshCw className="h-4.5 w-4.5 text-blue-500" />
                <SectionTitle title="余额刷新策略" subtitle="定时向 DeepSeek 官方服务器获取最新计费快照的频率设定。" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700">自动轮询间隔</h5>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">每隔设定的秒数进行后台刷新</p>
                  </div>
                  <select
                    value={appSettings.balance_refresh_interval_seconds}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        balance_refresh_interval_seconds: Number(e.target.value),
                      })
                    }
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                  >
                    <option value={15}>15 秒</option>
                    <option value={30}>30 秒</option>
                    <option value={60}>60 秒</option>
                    <option value={300}>5 分钟</option>
                    <option value={600}>10 分钟</option>
                  </select>
                </div>

                <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700">结算默认币种</h5>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">控制 Dashboard 和账本首选计量单位</p>
                  </div>
                  <select
                    value={appSettings.default_currency}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        default_currency: e.target.value,
                      })
                    }
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                  >
                    <option value="CNY">人民币 (CNY)</option>
                    <option value="USD">美元 (USD)</option>
                  </select>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Group 3: Alert thresholds */}
          {appSettings && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
                <Bell className="h-4.5 w-4.5 text-blue-500" />
                <SectionTitle title="告警与防刷安全策略" subtitle="对高频扣费、异常 HTTP 报错以及单次突发大 tokens 的本地防御阈值设置。" />
              </div>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">低余额提醒阈值</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={appSettings.low_balance_threshold}
                      onChange={(e) =>
                        setAppSettings({ ...appSettings, low_balance_threshold: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">每小时消耗告警阈值</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={appSettings.hourly_cost_threshold}
                      onChange={(e) =>
                        setAppSettings({ ...appSettings, hourly_cost_threshold: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">单次请求 Tokens 告警线</label>
                    <input
                      type="number"
                      required
                      value={appSettings.single_request_token_threshold}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          single_request_token_threshold: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
                  <h5 className="text-xs font-bold text-slate-700 mb-3">系统错误即时警报通知</h5>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 cursor-pointer">
                      <span className="text-[11px] font-semibold text-slate-600">401 密钥失效通知</span>
                      <input
                        type="checkbox"
                        checked={appSettings.notify_on_401}
                        onChange={(e) =>
                          setAppSettings({ ...appSettings, notify_on_401: e.target.checked })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 cursor-pointer">
                      <span className="text-[11px] font-semibold text-slate-600">429 限频拥堵告警</span>
                      <input
                        type="checkbox"
                        checked={appSettings.notify_on_429}
                        onChange={(e) =>
                          setAppSettings({ ...appSettings, notify_on_429: e.target.checked })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 cursor-pointer">
                      <span className="text-[11px] font-semibold text-slate-600">503 服务器过载提醒</span>
                      <input
                        type="checkbox"
                        checked={appSettings.notify_on_503}
                        onChange={(e) =>
                          setAppSettings({ ...appSettings, notify_on_503: e.target.checked })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Group 4: Advanced Privacy & Purges */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
              <Shield className="h-4.5 w-4.5 text-rose-500" />
              <SectionTitle title="隐私与安全高级设置" subtitle="本地日志物理归档策略及高级擦除维护选项。" />
            </div>
            <div className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-rose-800">强制抹除本地 SQLite 日志</h5>
                <p className="text-[10px] text-rose-600/80 font-medium mt-0.5">
                  物理擦除所有历史本地代理请求统计明细，不影响系统钥匙串中的密钥。此操作不可逆。
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('警告：此操作将永久清空本地 SQLite 数据库中的所有 API 请求用量历史！确定继续吗？')) {
                    alert('正在安排底层 SQLite 清理计划...');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-700 text-xs font-bold transition cursor-pointer shrink-0 border border-rose-500/20"
              >
                抹除历史日志
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right column: Sticky save panel and Export actions */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Sticky save card */}
          {appSettings && (
            <GlassCard hoverEffect={false} className="sticky top-6 p-5 border border-white/90 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/40">
                <Lock className="h-4.5 w-4.5 text-blue-500" />
                <h4 className="text-xs font-black tracking-tight text-slate-800 uppercase">策略保存配置</h4>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 leading-relaxed">
                每次更改余额周期、低余额阈值或告警上限时，都需要执行物理封签保存以激活底层 Rust 策略核心。
              </p>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingSettings ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : '更新系统偏好'}
              </button>
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-500/10 border border-emerald-500/15 py-2 rounded-xl"
                  >
                    <CheckCircle className="h-4 w-4" />
                    已成功写入 SQLite 数据库
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          )}

          {/* Export utility widget */}
          <GlassCard hoverEffect={true} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/40 mb-4">
                <FileDown className="h-4.5 w-4.5 text-slate-600" />
                <h4 className="text-xs font-black tracking-tight text-slate-800 uppercase">数据账本离线导出</h4>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 leading-relaxed mb-4">
                导出符合行业标准的 SQLite 计费数据。
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">导出格式</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setExportFormat('csv')}
                      className={`py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                        exportFormat === 'csv'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      CSV 表格格式
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('json')}
                      className={`py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                        exportFormat === 'json'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      JSON 原数据
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">时间跨度</label>
                  <select
                    value={exportDays}
                    onChange={(e) => setExportDays(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value={1}>最近 24 小时</option>
                    <option value={7}>最近 7 日</option>
                    <option value={30}>最近 30 日</option>
                    <option value={90}>最近 3 个月</option>
                  </select>
                </div>

                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-850 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
                >
                  <FileDown className="h-4 w-4" />
                  {exporting ? '导出执行中...' : '启动归档导出'}
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
