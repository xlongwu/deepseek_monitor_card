import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Coins,
  TrendingUp,
  Clock,
  Calendar,
  Layers,
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
import {
  GlassCard,
  StatusPill,
  MetricCard,
  EmptyState,
  SectionTitle,
} from '../components/AppleUI';

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

function formatCombinedCost(cny: string | number | undefined, usd: string | number | undefined) {
  const cnyVal = Number(cny || 0);
  const usdVal = Number(usd || 0);
  return `${formatMoney(cnyVal, 'CNY')} / ${formatMoney(usdVal, 'USD')}`;
}

function formatTime(value?: string) {
  if (!value) return '尚未刷新';
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dailyStats, setDailyStats] = useState<{ date: string; costCny: number; costUsd: number }[]>([]);
  const [yesterdayCostCny, setYesterdayCostCny] = useState<number>(0);
  const [yesterdayCostUsd, setYesterdayCostUsd] = useState<number>(0);
  const [sevenDayAvgCny, setSevenDayAvgCny] = useState<number>(0);
  const [sevenDayAvgUsd, setSevenDayAvgUsd] = useState<number>(0);

  const [hidden, setHidden] = useState(false);
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

      // 4. Fetch 7 days details
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
              costCny: Number(res.total_estimated_cost_cny || 0),
              costUsd: Number(res.total_estimated_cost_usd || 0),
            }))
            .catch(() => ({ date: item.dateStr, costCny: 0, costUsd: 0 }))
        )
      );
      setDailyStats(dailyData);

      // Calculate Yesterday's cost
      setYesterdayCostCny(dailyData[5]?.costCny ?? 0);
      setYesterdayCostUsd(dailyData[5]?.costUsd ?? 0);

      // Calculate 7-day average
      const total7DaysCny = dailyData.reduce((acc, curr) => acc + curr.costCny, 0);
      const total7DaysUsd = dailyData.reduce((acc, curr) => acc + curr.costUsd, 0);
      setSevenDayAvgCny(total7DaysCny / 7);
      setSevenDayAvgUsd(total7DaysUsd / 7);

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
  const currency = balanceCny ? 'CNY' : (balanceUsd ? 'USD' : (balance?.currency || 'CNY'));
  const displayCurrency = settings?.default_currency || currency;

  const lowBalanceThreshold = Number(settings?.low_balance_threshold || '10.00');
  const isLowBalance = total < lowBalanceThreshold;

  const sevenDayAvg = displayCurrency === 'USD' ? sevenDayAvgUsd : sevenDayAvgCny;

  const estimatedDays = useMemo(() => {
    if (sevenDayAvg <= 0) return 99.9;
    return Math.min(99.9, total / sevenDayAvg);
  }, [total, sevenDayAvg]);

  const usageBars = useMemo(() => {
    const costs = dailyStats.map((d) => displayCurrency === 'USD' ? d.costUsd : d.costCny);
    const maxCost = Math.max(...costs, 0.01);
    return costs.map((c) => (c / maxCost) * 100);
  }, [dailyStats, displayCurrency]);

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
    return [];
  }, [alerts]);

  if (isLoading && !dashboard) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50/50 p-6 min-h-[580px]">
        <GlassCard hoverEffect={false} className="w-[320px] text-center p-8 flex flex-col items-center border border-white/80">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-sm font-bold text-slate-800 tracking-tight">正在读取本地大模型账单</p>
          <p className="text-xs text-slate-400 font-semibold mt-2">加载安全钥匙串与数据库...</p>
        </GlassCard>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50/50 p-8 min-h-[580px]">
        <EmptyState
          icon={AlertTriangle}
          title="未配置 API Key"
          description="要启用大模型余额监控与安全代理计费，请首先添加您的 DeepSeek 账户 API Key。"
          action={
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition duration-200"
            >
              配置 API Key <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto max-h-[100vh] min-h-[580px]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-200/50 mb-6">
        <div>
          <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">DEEPSEEK MONITOR</span>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-800">总览</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleMiniWindow(true)}
            className="rounded-full border border-white/60 bg-white/60 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white hover:shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            打开悬浮窗
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-white/60 text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white hover:shadow cursor-pointer"
            title="手动刷新"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-[18px] w-[18px] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout: Left Widget, Right Cards & Charts */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Balance Widget (Mac Widget Style) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard hoverEffect={true} className="relative flex flex-col justify-between h-[360px] overflow-hidden border border-white/80 shadow-2xl shadow-slate-100/40">
            {/* Background gradient decorative glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-44 w-44 rounded-full bg-emerald-500/5 blur-3xl" />

            <div className="z-10 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold tracking-wider text-slate-800 uppercase">DeepSeek Wallet</h2>
                  <p className="text-[9px] text-slate-500 mt-0.5">多币种自愈轮询</p>
                </div>
              </div>
              <button
                onClick={() => setHidden((v) => !v)}
                className="grid h-7 w-7 place-items-center rounded-full bg-slate-100/80 text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800"
              >
                {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="z-10 my-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">账户可用总额</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-slate-800">
                  {hidden ? '••••••' : formatMoney(balanceCny?.total_balance, 'CNY')}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  / {hidden ? '••••' : formatMoney(balanceUsd?.total_balance, 'USD')}
                </span>
              </div>
              
              <div className="mt-1.5 flex items-center gap-1.5">
                <StatusPill available={dashboard?.balance?.is_available ?? false} className="border-slate-200/50 text-emerald-600 font-bold" />
                <span className="text-[9px] text-slate-500 font-medium">上次同步: {formatTime(dashboard?.last_refresh)}</span>
              </div>
            </div>

            <div className="z-10 grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/40">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase">充值余额</p>
                <div className="mt-0.5 flex flex-col">
                  {balanceCny && (
                    <span className="text-xs font-bold text-slate-800">
                      {hidden ? '•••' : formatMoney(balanceCny.topped_up_balance, 'CNY')}
                    </span>
                  )}
                  {balanceUsd && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      {hidden ? '•••' : formatMoney(balanceUsd.topped_up_balance, 'USD')}
                    </span>
                  )}
                  {!balanceCny && !balanceUsd && (
                    <span className="text-xs font-bold text-slate-400">
                      {hidden ? '•••' : formatMoney(0, 'CNY')}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase">赠送余额</p>
                <div className="mt-0.5 flex flex-col">
                  {balanceCny && (
                    <span className="text-xs font-bold text-slate-800">
                      {hidden ? '•••' : formatMoney(balanceCny.granted_balance, 'CNY')}
                    </span>
                  )}
                  {balanceUsd && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      {hidden ? '•••' : formatMoney(balanceUsd.granted_balance, 'USD')}
                    </span>
                  )}
                  {!balanceCny && !balanceUsd && (
                    <span className="text-xs font-bold text-slate-400">
                      {hidden ? '•••' : formatMoney(0, 'CNY')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Quick Alarm Indicator */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                "grid h-10 w-10 place-items-center rounded-2xl shrink-0",
                isLowBalance ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
              )}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">本地安全雷达</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  {isLowBalance ? `余额低于阈值 (${formatMoney(lowBalanceThreshold, displayCurrency)})，请注意额度。` : "API 代理及额度防护正常运行。"}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Usage Cards & Daily Charts */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Five stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MetricCard
              icon={TrendingUp}
              label="今日预估消费"
              value={formatCombinedCost(dashboard?.today_estimated_cost_cny, dashboard?.today_estimated_cost_usd)}
              sub="基于捕获的 API 调用"
              tone="success"
            />
            <MetricCard
              icon={Clock}
              label="昨日消费额"
              value={formatCombinedCost(yesterdayCostCny, yesterdayCostUsd)}
              sub="前一日整日消耗"
            />
            <MetricCard
              icon={Calendar}
              label="7 日日均消费"
              value={formatCombinedCost(sevenDayAvgCny, sevenDayAvgUsd)}
              sub="近一周滑动均值"
            />
            <MetricCard
              icon={Layers}
              label="预计可用天数"
              value={sevenDayAvg <= 0 ? '99.9 天' : `${estimatedDays.toFixed(1)} 天`}
              sub={isLowBalance ? '余额紧张，建议充值' : '余额状态充足'}
              tone={isLowBalance ? 'warning' : 'default'}
            />
            <MetricCard
              icon={Coins}
              label="近一小时扣费"
              value={formatCombinedCost(dashboard?.last_hour_cost_cny, dashboard?.last_hour_cost_usd)}
              sub="高频流式计价走势"
              tone={Number(dashboard?.last_hour_cost_cny || 0) > 0 || Number(dashboard?.last_hour_cost_usd || 0) > 0 ? "warning" : "default"}
            />
          </div>

          {/* Bar Chart & Alert Log */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Bar Chart */}
            <GlassCard className="flex flex-col justify-between">
              <div>
                <SectionTitle title="近 7 日消费走势" subtitle={`${displayCurrency} 结算 / 日`} />
                
                <div className="mt-6 flex h-40 items-end gap-3 rounded-2xl bg-slate-50/70 p-4 border border-slate-100/50">
                  {dailyStats.map((item, index) => (
                    <div key={item.date} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                      <div className="group relative w-full flex flex-col items-center">
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                          <span className="bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-xl">
                            {formatMoney(displayCurrency === 'USD' ? item.costUsd : item.costCny, displayCurrency)}
                          </span>
                          <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                        </div>
                        
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(6, usageBars[index])}%` }}
                          transition={{ duration: 0.45, delay: index * 0.03 }}
                          className={cn(
                            "w-full rounded-t-lg rounded-b shadow-sm transition-all duration-300",
                            index === 6 
                              ? "bg-blue-500 group-hover:bg-blue-600" 
                              : "bg-slate-900/60 group-hover:bg-slate-900/80"
                          )}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400">
                        {item.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Alert Logs */}
            <GlassCard className="flex flex-col justify-between">
              <div>
                <SectionTitle title="告警与安全日志" subtitle="本地 SQLite 告警数据库拦截记录" />
                
                <div className="mt-4 overflow-y-auto max-h-[160px] pr-1 space-y-2">
                  <AnimatePresence initial={false}>
                    {displayEvents.length > 0 ? (
                      displayEvents.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/50 bg-white/40 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              item.type === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                            )} />
                            <p className="text-xs font-bold text-slate-700 truncate max-w-[170px]">{item.label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-semibold text-slate-400">{item.time}</span>
                            <button
                              onClick={() => handleAckAlert(item.id)}
                              className="text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100/50 px-2 py-0.5 rounded-full transition cursor-pointer"
                            >
                              忽略
                            </button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 border border-slate-100 rounded-2xl">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                           <ShieldCheck className="h-[18px] w-[18px]" />
                        </div>
                        <p className="text-xs font-bold text-slate-600">系统状态安全</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">未触发任何扣费或安全警报</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
