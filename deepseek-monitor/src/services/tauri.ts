import { invoke } from '@tauri-apps/api/core';
import type {
  DashboardSummary,
  BalanceSnapshot,
  UsageStats,
  TimeRange,
  ApiKeyMeta,
  ProxyStatus,
  AlertConfig,
  AlertEvent,
  AppSettings,
} from '../types';

type InvokeArgs = Record<string, unknown>;
type DevFallback<T> = () => T | Promise<T>;

function hasTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invokeCommand<T>(
  command: string,
  args?: InvokeArgs,
  devFallback?: DevFallback<T>,
): Promise<T> {
  if (!hasTauriRuntime() && import.meta.env.DEV && devFallback) {
    return devFallback();
  }

  return invoke<T>(command, args);
}

const mockBalance: BalanceSnapshot = {
  id: 'dev-balance',
  api_key_id: 'dev-key',
  captured_at: new Date().toISOString(),
  is_available: true,
  currency: 'CNY',
  total_balance: '128.60',
  granted_balance: '18.60',
  topped_up_balance: '110.00',
};

const mockProxyStatus: ProxyStatus = {
  enabled: true,
  running: false,
  host: '127.0.0.1',
  port: 8787,
  url: 'http://127.0.0.1:8787',
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return invokeCommand('get_dashboard_summary', undefined, () => ({
    balance: mockBalance,
    today_requests: 36,
    today_prompt_tokens: 48200,
    today_completion_tokens: 18740,
    today_total_tokens: 66940,
    today_estimated_cost: '0.19',
    last_hour_cost: '0.04',
    proxy_status: mockProxyStatus,
    last_refresh: new Date().toISOString(),
    status: 'normal',
  }));
}

export async function getBalance(): Promise<BalanceSnapshot> {
  return invokeCommand('get_balance', undefined, () => mockBalance);
}

export async function getUsageStats(range: TimeRange): Promise<UsageStats> {
  return invokeCommand('get_usage_stats', { range }, () => ({
    total_requests: 128,
    total_prompt_tokens: 186000,
    total_completion_tokens: 73200,
    total_tokens: 259200,
    total_estimated_cost: '0.76',
    by_model: [
      {
        model: 'deepseek-chat',
        request_count: 96,
        prompt_tokens: 120000,
        completion_tokens: 52000,
        total_tokens: 172000,
        estimated_cost: '0.42',
      },
      {
        model: 'deepseek-reasoner',
        request_count: 32,
        prompt_tokens: 66000,
        completion_tokens: 21200,
        total_tokens: 87200,
        estimated_cost: '0.34',
      },
    ],
    by_source: [
      { source_name: 'local-proxy', request_count: 91, estimated_cost: '0.51' },
      { source_name: 'script', request_count: 37, estimated_cost: '0.25' },
    ],
  }));
}

export async function saveApiKey(alias: string, apiKey: string): Promise<void> {
  return invokeCommand('save_api_key', { alias, apiKey }, () => undefined);
}

export async function listApiKeys(): Promise<ApiKeyMeta[]> {
  return invokeCommand('list_api_keys', undefined, () => []);
}

export async function deleteApiKey(id: string): Promise<void> {
  return invokeCommand('delete_api_key', { id }, () => undefined);
}

export async function setActiveApiKey(id: string): Promise<void> {
  return invokeCommand('set_active_api_key', { id }, () => undefined);
}

export async function startProxy(): Promise<ProxyStatus> {
  return invokeCommand('start_proxy', undefined, () => ({ ...mockProxyStatus, running: true }));
}

export async function stopProxy(): Promise<void> {
  return invokeCommand('stop_proxy', undefined, () => undefined);
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  return invokeCommand('get_proxy_status', undefined, () => mockProxyStatus);
}

export async function getAlertConfig(): Promise<AlertConfig> {
  return invokeCommand('get_alert_config', undefined, () => ({
    low_balance_threshold: '10.00',
    hourly_cost_threshold: '5.00',
    single_request_token_threshold: 100000,
    notify_on_401: true,
    notify_on_429: true,
    notify_on_503: true,
  }));
}

export async function setAlertConfig(config: AlertConfig): Promise<void> {
  return invokeCommand('set_alert_config', { config }, () => undefined);
}

export async function getAlertEvents(): Promise<AlertEvent[]> {
  return invokeCommand('get_alert_events', undefined, () => []);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  return invokeCommand('acknowledge_alert', { id }, () => undefined);
}

export async function getSettings(): Promise<AppSettings> {
  return invokeCommand('get_settings');
}

export async function setSettings(settings: AppSettings): Promise<void> {
  return invokeCommand('set_settings', { settings }, () => undefined);
}

export async function refreshBalance(): Promise<BalanceSnapshot> {
  return invokeCommand('refresh_balance', undefined, () => ({
    ...mockBalance,
    captured_at: new Date().toISOString(),
  }));
}

export async function exportUsage(format: string, range: TimeRange): Promise<string> {
  return invokeCommand('export_usage', { format, range }, () => {
    if (format === 'csv') {
      return 'model,request_count,total_tokens,estimated_cost\ndeepseek-chat,96,172000,0.42\n';
    }

    return JSON.stringify([], null, 2);
  });
}

export async function toggleMiniWindow(show: boolean): Promise<void> {
  return invokeCommand('toggle_mini_window', { show }, () => undefined);
}

export async function toggleMainWindow(show: boolean): Promise<void> {
  return invokeCommand('toggle_main_window', { show }, () => undefined);
}
