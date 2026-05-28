import { useEffect, useState } from 'react';
import {
  Layers,
  Cpu,
  Coins,
  Activity,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { getUsageStats, getSettings } from '../services/tauri';
import type { UsageStats, TimeRange, AppSettings } from '../types';
import { GlassCard, PageHeader, MetricCard, SectionTitle } from '../components/AppleUI';

function formatMoney(value: number | string | undefined, currency = 'CNY') {
  const n = Number(value || 0);
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function formatCombinedCost(cny: string | number | undefined, usd: string | number | undefined) {
  const cnyVal = Number(cny || 0);
  const usdVal = Number(usd || 0);
  return `${formatMoney(cnyVal, 'CNY')} / ${formatMoney(usdVal, 'USD')}`;
}

function formatTokens(count?: number) {
  if (!count) return '0';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + ' M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + ' K';
  }
  return String(count);
}

export default function Usage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadStats();
    getSettings().then(setSettings).catch(console.error);
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

  const displayCurrency = settings?.default_currency || 'CNY';

  return (
    <div className="p-6 overflow-y-auto max-h-[100vh]">
      <PageHeader
        title="用量明细"
        description="追溯本地代理拦截的所有 API 调用请求的 Tokens 资源与估算消耗"
        action={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase mr-1">时间步长</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-white/60 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm focus:outline-none cursor-pointer"
            >
              <option value={1}>最近 24 小时</option>
              <option value={7}>最近 7 日</option>
              <option value={30}>最近 30 日</option>
              <option value={90}>最近 90 日</option>
            </select>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64 min-h-[300px]">
          <GlassCard hoverEffect={false} className="p-6 text-center w-[200px] flex flex-col items-center">
            <RefreshCw className="h-[26px] w-[26px] text-blue-500 animate-spin mb-3" />
            <p className="text-xs font-extrabold text-slate-700">正在生成账单...</p>
          </GlassCard>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 4 metrics cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              icon={Activity}
              label="总请求数"
              value={stats?.total_requests || 0}
              sub="代理请求拦截计数"
              tone="default"
              delay={0.02}
            />
            <MetricCard
              icon={Layers}
              label="累计 Tokens"
              value={formatTokens(stats?.total_tokens)}
              sub="总算力消耗值"
              tone="success"
              delay={0.04}
            />
            <MetricCard
              icon={Cpu}
              label="输入 Tokens"
              value={formatTokens(stats?.total_prompt_tokens)}
              sub="提示词与上下文"
              tone="warning"
              delay={0.06}
            />
            <MetricCard
              icon={Coins}
              label="预估总费用"
              value={formatCombinedCost(stats?.total_estimated_cost_cny, stats?.total_estimated_cost_usd)}
              sub="日滑动周期累计"
              tone="default"
              delay={0.08}
            />
          </div>

          {/* Model distribution sheet (Apple Numbers Style) */}
          <GlassCard delay={0.1}>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
              <Cpu className="h-[18px] w-[18px] text-blue-500" />
              <SectionTitle title="按模型分类统计" subtitle="不同 DeepSeek 架构模型对 Tokens 的计价与消耗明细表格。" />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">模型名称</th>
                    <th className="px-4 py-3">请求数 (次)</th>
                    <th className="px-4 py-3">输入 Tokens</th>
                    <th className="px-4 py-3">输出 Tokens</th>
                    <th className="px-4 py-3">总 Tokens</th>
                    <th className="px-4 py-3 text-right">预估费用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats?.by_model && stats.by_model.length > 0 ? (
                    stats.by_model.map((m) => (
                      <tr key={m.model} className="hover:bg-slate-50/50 transition-colors font-medium">
                        <td className="px-4 py-3 text-slate-800 font-bold">{m.model}</td>
                        <td className="px-4 py-3 text-slate-500 font-semibold">{m.request_count}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{m.prompt_tokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{m.completion_tokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-700 font-bold font-mono">{m.total_tokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-800 font-extrabold text-right font-mono">{formatMoney(m.estimated_cost, displayCurrency)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold">
                        当前过滤范围内没有任何模型调用。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Sources distribution sheet */}
          <GlassCard delay={0.12}>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
              <UserCheck className="h-[18px] w-[18px] text-blue-500" />
              <SectionTitle title="按调用来源分类" subtitle="根据第三方 IDE（如 Cline、Cursor）、脚本或工具别名识别的客户端分布。" />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">来源 Client 标识</th>
                    <th className="px-4 py-3">拦截调用数</th>
                    <th className="px-4 py-3 text-right">预估消费总额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats?.by_source && stats.by_source.length > 0 ? (
                    stats.by_source.map((s) => (
                      <tr key={s.source_name} className="hover:bg-slate-50/50 transition-colors font-medium">
                        <td className="px-4 py-3 text-slate-800 font-bold">
                          {s.source_name === 'unknown' ? (
                            <span className="text-slate-400 italic">未识别来源 / 外部脚本</span>
                          ) : (
                            s.source_name
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-semibold">{s.request_count} 次</td>
                        <td className="px-4 py-3 text-slate-800 font-extrabold text-right font-mono">{formatMoney(s.estimated_cost, displayCurrency)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400 font-semibold">
                        当前时间跨度内无代理来源数据。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

        </div>
      )}
    </div>
  );
}
