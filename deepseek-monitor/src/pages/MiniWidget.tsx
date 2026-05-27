import React, { useEffect, useState } from 'react';
import { RefreshCw, ExternalLink, X, Coins, ShieldAlert } from 'lucide-react';
import {
  getDashboardSummary,
  refreshBalance,
  toggleMiniWindow,
  toggleMainWindow,
} from '../services/tauri';
import type { DashboardSummary } from '../types';

function formatMoney(value: number | string | undefined, currency = 'CNY') {
  const n = Number(value || 0);
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function formatTokens(count?: number) {
  if (!count) return '0';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return String(count);
}

export default function MiniWidget() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Auto refresh mini widget stats every 10 seconds for real-time responsiveness
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    try {
      const sum = await getDashboardSummary();
      setDashboard(sum);
    } catch (err) {
      console.error('Failed to load mini widget data:', err);
    }
  }

  async function handleRefresh(e: React.MouseEvent) {
    e.stopPropagation(); // Avoid triggering drag
    setRefreshing(true);
    setError(null);
    try {
      await refreshBalance();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleMaximize(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await toggleMainWindow(true);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await toggleMiniWindow(false);
    } catch (err) {
      console.error(err);
    }
  }

  const balanceCny = dashboard?.balance_cny;
  const balanceUsd = dashboard?.balance_usd;
  const proxyRunning = dashboard?.proxy_status?.running ?? false;

  return (
    <div
      data-tauri-drag-region
      className="select-none relative flex h-[220px] w-[320px] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 p-4 text-white shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-white/15"
    >
      {/* Background Decorative Glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl" />

      {/* Header */}
      <header data-tauri-drag-region className="flex items-center justify-between">
        <div data-tauri-drag-region className="flex items-center gap-2">
          {/* Status Dot */}
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                proxyRunning ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                proxyRunning ? 'bg-emerald-500' : 'bg-slate-500'
              }`}
            />
          </span>
          <span data-tauri-drag-region className="text-xs font-semibold tracking-wider text-slate-400">
            DEEPSEEK MONITOR
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            className="grid h-6.5 w-6.5 place-items-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="刷新余额"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-white' : ''}`} />
          </button>
          <button
            onClick={handleMaximize}
            className="grid h-6.5 w-6.5 place-items-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="打开主窗口"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="grid h-6.5 w-6.5 place-items-center rounded-lg bg-rose-500/10 text-rose-400 transition hover:bg-rose-500/20 hover:text-rose-300"
            title="隐藏悬浮窗"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Balance Core Section */}
      <section data-tauri-drag-region className="my-2 flex flex-col justify-center">
        {error ? (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 p-2 text-rose-300 text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        ) : (
          <div data-tauri-drag-region className="flex items-baseline justify-between">
            <div data-tauri-drag-region>
              <p data-tauri-drag-region className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                可用余额
              </p>
              <div data-tauri-drag-region className="mt-0.5 flex items-baseline gap-2">
                <span data-tauri-drag-region className="text-2xl font-black tracking-tight text-white">
                  {formatMoney(balanceCny?.total_balance, 'CNY')}
                </span>
                <span data-tauri-drag-region className="text-sm font-semibold text-slate-400">
                  / {formatMoney(balanceUsd?.total_balance, 'USD')}
                </span>
              </div>
            </div>
            
            {/* Currency Badge */}
            <div className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
              <Coins className="h-2.5 w-2.5" />
              CNY+USD
            </div>
          </div>
        )}
      </section>

      {/* Stats Divider Line */}
      <div className="h-px bg-white/10" />

      {/* Usage Stats Bottom Grid */}
      <footer data-tauri-drag-region className="grid grid-cols-3 gap-1 pt-1 text-center">
        <div>
          <p className="text-[9px] font-medium text-slate-400 uppercase">今日预估</p>
          <p className="mt-0.5 text-xs font-bold text-emerald-400">
            {formatMoney(dashboard?.today_estimated_cost || 0, 'CNY')}
          </p>
        </div>
        <div className="border-x border-white/5">
          <p className="text-[9px] font-medium text-slate-400 uppercase">请求总数</p>
          <p className="mt-0.5 text-xs font-bold text-white">
            {dashboard?.today_requests ?? 0} <span className="text-[9px] font-normal text-slate-400">次</span>
          </p>
        </div>
        <div>
          <p className="text-[9px] font-medium text-slate-400 uppercase">已用 Token</p>
          <p className="mt-0.5 text-xs font-bold text-blue-400">
            {formatTokens(dashboard?.today_total_tokens)}
          </p>
        </div>
      </footer>
    </div>
  );
}
