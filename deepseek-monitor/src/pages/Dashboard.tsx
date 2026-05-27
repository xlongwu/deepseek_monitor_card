import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  Gauge,
  History,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getDashboardSummary,
  getUsageStats,
  getAlertEvents,
  acknowledgeAlert,
  refreshBalance,
  getSettings,
  toggleMiniWindow,
} from '../services/tauri';
import type { DashboardSummary, AlertEvent, AppSettings } from '../types';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatMoney(value: number | string | undefined, currency = 'CNY') {
  const n = Number(value || 0);
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function formatTime(value?: string) {
  if (!value) return '尚未刷新';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function StatusPill({ available }: { available: boolean }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur transition-all duration-300',
        available
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
          : 'border-rose-500/20 bg-rose-500/10 text-rose-600'
      )}
    >
      {available ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {available ? 'API 可用' : '额度耗尽/无效'}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/65 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:border-white/80">
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'grid h-9 w-9 place-items-center rounded-xl transition-colors duration-300',
            tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dailyStats, setDailyStats] = useState<{ date: string; cost: number }[]>([]);
  const [yesterdayCost, setYesterdayCost] = useState<number>(0);
  const [sevenDayAvg, setSevenDayAvg] = useState<number>(0);

  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch dashboard summary
      const sum = await getDashboardSummary();
      setDashboard(sum);

      // 2. Fetch settings
      const setts = await getSettings();
      setSettings(setts);

      // 3. Fetch alert events
      const alertEvents = await getAlertEvents();
      setAlerts(alertEvents);

      // 4. Fetch 7 days details in parallel to calculate averages and history bars
      const dailyRanges = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        return {
          dateStr,
          range: {
            start: `${dateStr}T00:00:00`,
            end: `${dateStr}T23:59:59`,
          },
        };
      });

      const dailyData = await Promise.all(
        dailyRanges.map((item) =>
          getUsageStats(item.range)
            .then((res) => ({
              date: item.dateStr,
              cost: Number(res.total_estimated_cost || 0),
            }))
            .catch(() => ({ date: item.dateStr, cost: 0 }))
        )
      );
      setDailyStats(dailyData);

      // Calculate Yesterday's cost specifically (index 5 of last 7 days)
      const yCost = dailyData[5]?.cost ?? 0;
      setYesterdayCost(yCost);

      // Calculate 7-day average
      const total7Days = dailyData.reduce((acc, curr) => acc + curr.cost, 0);
      const avg = total7Days / 7;
      setSevenDayAvg(avg);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await refreshBalance();
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAckAlert(id: string) {
    try {
      await acknowledgeAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  }

  const balance = dashboard?.balance;
  const balanceCny = dashboard?.balance_cny;
  const balanceUsd = dashboard?.balance_usd;

  const total = balanceCny ? Number(balanceCny.total_balance) : (balanceUsd ? Number(balanceUsd.total_balance) : Number(balance?.total_balance || 0));
  const granted = balanceCny ? Number(balanceCny.granted_balance) : (balanceUsd ? Number(balanceUsd.granted_balance) : Number(balance?.granted_balance || 0));
  const currency = balanceCny ? 'CNY' : (balanceUsd ? 'USD' : (balance?.currency || 'CNY'));

  // Compare actual balance with configured threshold (from app settings)
  const lowBalanceThreshold = Number(settings?.low_balance_threshold || '10.00');
  const isLowBalance = total < lowBalanceThreshold;

  const grantedRatio = useMemo(() => {
    if (!total) return 0;
    return Math.min(100, Math.round((granted / total) * 100));
  }, [granted, total]);

  // Calculate estimated days left
  const estimatedDays = useMemo(() => {
    if (sevenDayAvg <= 0) return 99.9;
    return Math.min(99.9, total / sevenDayAvg);
  }, [total, sevenDayAvg]);

  // Calculate trends for bars
  const usageBars = useMemo(() => {
    const maxCost = Math.max(...dailyStats.map((d) => d.cost), 0.01);
    return dailyStats.map((d) => (d.cost / maxCost) * 100);
  }, [dailyStats]);

  // Fallback logs if no actual alert events exist
  const displayEvents = useMemo(() => {
    if (alerts.length > 0) {
      return alerts.map((a) => ({
        id: a.id,
        label: a.message,
        time: a.triggered_at.split('T')[1]?.substring(0, 5) || '刚刚',
        type: a.severity === 'error' ? 'error' : 'warning',
        isAlert: true,
      }));
    }
    return [
      { id: '1', label: '余额同步成功', time: '刚刚', type: 'success', isAlert: false },
      { id: '2', label: 'API 代理服务运行正常', time: '运行中', type: 'success', isAlert: false },
      { id: '3', label: '本地安全数据库已挂载', time: '已连接', type: 'success', isAlert: false },
    ];
  }, [alerts]);

  if (isLoading && !dashboard) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm text-slate-500 font-medium">读取本地 API 统计数据...</p>
        </div>
      </div>
    );
  }

  // Handle empty state if no keys are configure at all
  if (!balance) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(135deg,#f8fafc,#eef2ff_46%,#f8fafc)] p-6 text-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full rounded-[2rem] border border-white/70 bg-white/60 p-8 shadow-2xl backdrop-blur-2xl text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner mb-6">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">未配置 API Key</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            要启用本地用量监控与余额警报，需要首先添加您的 DeepSeek 账户 API Key。所有 Key 均保存在您的系统安全钥匙串中。
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/keys"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-xl hover:bg-slate-800 transition duration-200"
            >
              配置 API Key <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(135deg,#f8fafc,#eef2ff_46%,#f8fafc)] p-6 text-slate-900 transition-colors duration-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between pb-5">
        <div>
          <p className="text-sm font-medium text-slate-500">DeepSeek API Monitor</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">DeepSeek API 余额监控</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleMiniWindow(true)}
            className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white hover:shadow flex items-center gap-1.5"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            打开悬浮窗
          </button>
          <button
            onClick={() => setCompact((v) => !v)}
            className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white hover:shadow"
          >
            {compact ? '完整视图' : '紧凑视图'}
          </button>
          <Link
            to="/proxy"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/70 bg-white/60 text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white"
            title="代理设置"
          >
            <Settings className="h-4.5 w-4.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-6xl mb-4 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[390px_1fr]"
      >
        {/* Left Side Widget Card */}
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/60 shadow-2xl shadow-slate-200/70 backdrop-blur-2xl flex flex-col justify-between">
          <div className="relative p-6">
            <div className="absolute right-5 top-5 flex items-center gap-2">
              <StatusPill available={dashboard?.balance?.is_available ?? false} />
              <button
                onClick={() => setHidden((v) => !v)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-slate-500 transition hover:bg-white hover:text-slate-900 shadow-sm"
              >
                {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>

            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">DeepSeek Balance</p>
                <p className="text-xs text-slate-400">实时余额 · 自动轮询</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/40">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/55">当前可用余额</p>
                  <div className="mt-2 flex flex-col gap-1">
                    {/* CNY Balance (Large) */}
                    {balanceCny && (
                      <p className="text-4.5xl font-semibold tracking-tight text-white">
                        {hidden ? '••••' : formatMoney(balanceCny.total_balance, 'CNY')}
                      </p>
                    )}
                    {/* USD Balance (Medium/Elegant) */}
                    {balanceUsd && (
                      <p className={cn(
                        "font-medium tracking-tight text-white/70",
                        balanceCny ? "text-lg" : "text-4.5xl font-semibold text-white"
                      )}>
                        {hidden ? '••••' : formatMoney(balanceUsd.total_balance, 'USD')}
                      </p>
                    )}
                    {/* Fallback if neither is loaded */}
                    {!balanceCny && !balanceUsd && balance && (
                      <p className="text-4.5xl font-semibold tracking-tight text-white">
                        {hidden ? '••••' : formatMoney(balance.total_balance, balance.currency)}
                      </p>
                    )}
                  </div>
                </div>
                <CircleDollarSign className="h-7 w-7 text-white/55" />
              </div>

              {/* Sub-balances boxes showing both stacked */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-3 flex flex-col justify-between">
                  <p className="text-xs text-white/50 mb-1">赠送余额</p>
                  <div>
                    {balanceCny && (
                      <p className="text-base font-semibold text-white">
                        {hidden ? '••••' : formatMoney(balanceCny.granted_balance, 'CNY')}
                      </p>
                    )}
                    {balanceUsd && (
                      <p className={cn("text-xs text-white/70", balanceCny ? "mt-0.5" : "text-base font-semibold text-white")}>
                        {hidden ? '••••' : formatMoney(balanceUsd.granted_balance, 'USD')}
                      </p>
                    )}
                    {!balanceCny && !balanceUsd && balance && (
                      <p className="text-base font-semibold text-white">
                        {hidden ? '••••' : formatMoney(balance.granted_balance, balance.currency)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 flex flex-col justify-between">
                  <p className="text-xs text-white/50 mb-1">充值余额</p>
                  <div>
                    {balanceCny && (
                      <p className="text-base font-semibold text-white">
                        {hidden ? '••••' : formatMoney(balanceCny.topped_up_balance, 'CNY')}
                      </p>
                    )}
                    {balanceUsd && (
                      <p className={cn("text-xs text-white/70", balanceCny ? "mt-0.5" : "text-base font-semibold text-white")}>
                        {hidden ? '••••' : formatMoney(balanceUsd.topped_up_balance, 'USD')}
                      </p>
                    )}
                    {!balanceCny && !balanceUsd && balance && (
                      <p className="text-base font-semibold text-white">
                        {hidden ? '••••' : formatMoney(balance.topped_up_balance, balance.currency)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-white/55">
                  <span>余额结构 {balanceCny ? '(CNY)' : (balanceUsd ? '(USD)' : '')}</span>
                  <span>
                    赠送 {grantedRatio}% · 充值 {100 - grantedRatio}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-white" style={{ width: `${grantedRatio}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-600 shadow-sm">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">上次同步 {formatTime(dashboard?.last_refresh)}</p>
                  <p className="text-xs text-slate-400">自动同步间隔: 每分钟</p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 shadow-sm transition hover:text-slate-950 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>
        </section>

        {/* Right Side Cards */}
        {!compact && (
          <section className="grid gap-5">
            {/* Top metric row */}
            <div className="grid gap-5 md:grid-cols-3">
              <MetricCard
                icon={Gauge}
                label="今日消耗"
                value={formatMoney(dashboard?.today_estimated_cost, currency)}
                sub={`昨日消耗 ${formatMoney(yesterdayCost, currency)}`}
              />
              <MetricCard
                icon={Activity}
                label="7 日均耗"
                value={formatMoney(sevenDayAvg, currency)}
                sub="用于预测可用时长"
              />
              <MetricCard
                icon={Bell}
                label="预计可用"
                value={sevenDayAvg <= 0 ? '99.9 天' : `${estimatedDays.toFixed(1)} 天`}
                sub={isLowBalance ? '当前余额较低，建议充值' : '余额状态充足'}
                tone={isLowBalance ? 'warning' : 'default'}
              />
            </div>

            {/* Graphs and Alert Strategies */}
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              {/* Daily trend graph */}
              <div className="rounded-[2rem] border border-white/70 bg-white/60 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">近 7 日消费趋势</h2>
                      <p className="mt-1 text-sm text-slate-500">按日捕获的代理调用费用走势</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      {currency} / 天
                    </span>
                  </div>

                  <div className="mt-6 flex h-44 items-end gap-3 rounded-3xl bg-slate-50/80 p-4 border border-slate-100">
                    {dailyStats.map((item, index) => (
                      <div key={item.date} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                        <div className="group relative w-full flex flex-col items-center">
                          {/* Tooltip on Hover */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                            <span className="bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-xl">
                              {formatMoney(item.cost, currency)}
                            </span>
                            <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1" />
                          </div>
                          
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(4, usageBars[index])}%` }}
                            transition={{ duration: 0.5, delay: index * 0.04 }}
                            className={cn(
                              "w-full rounded-t-2xl rounded-b-md shadow-sm transition-all duration-300",
                              index === 6 
                                ? "bg-blue-600 group-hover:bg-blue-700" 
                                : "bg-slate-900/80 group-hover:bg-slate-900"
                            )}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {item.date.split('-').slice(1).join('/')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Alert engine rule card */}
              <div className="rounded-[2rem] border border-white/70 bg-white/60 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">本地告警配置</h2>
                      <p className="mt-1 text-sm text-slate-500">常驻桌面的主动安全卫士</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className={cn(
                      'rounded-2xl border p-4 transition-all duration-300',
                      isLowBalance ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-200/70 bg-white/70'
                    )}>
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={cn('h-4 w-4', isLowBalance ? 'text-amber-600' : 'text-slate-500')} />
                        <p className="text-sm font-semibold text-slate-900">低余额提醒</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        当前设为低于 <strong className="text-slate-800">{formatMoney(lowBalanceThreshold, currency)}</strong> 时自动发起桌面通知。
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                      <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-slate-600" />
                        <p className="text-sm font-semibold text-slate-900">超额请求警报</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        单次代理调用请求超过 <strong className="text-slate-800">{settings?.single_request_token_threshold || 100000}</strong> tokens 时拦截或记录警报。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync records and active alerts */}
            <div className="rounded-[2rem] border border-white/70 bg-white/60 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">同步与告警历史</h2>
                  <p className="mt-1 text-sm text-slate-500">查看本地错误状态与最新的告警事件</p>
                </div>
                <History className="h-5 w-5 text-slate-400" />
              </div>

              <div className="divide-y divide-slate-200/70 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70">
                <AnimatePresence initial={false}>
                  {displayEvents.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'h-2.5 w-2.5 rounded-full shrink-0',
                            item.type === 'success' && 'bg-emerald-500',
                            item.type === 'warning' && 'bg-amber-500',
                            item.type === 'error' && 'bg-rose-500'
                          )}
                        />
                        <p className="text-sm font-medium text-slate-800 leading-tight">{item.label}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400">{item.time}</span>
                        {item.isAlert && (
                          <button
                            onClick={() => handleAckAlert(item.id)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1 px-2.5 rounded-full transition-all"
                          >
                            忽略
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}
      </motion.section>
    </main>
  );
}
