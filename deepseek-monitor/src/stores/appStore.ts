import { create } from 'zustand';
import type { DashboardSummary, ApiKeyMeta, ProxyStatus, AlertEvent, AppSettings } from '../types';

interface AppState {
  dashboard: DashboardSummary | null;
  apiKeys: ApiKeyMeta[];
  proxyStatus: ProxyStatus | null;
  alerts: AlertEvent[];
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  
  setDashboard: (dashboard: DashboardSummary) => void;
  setApiKeys: (keys: ApiKeyMeta[]) => void;
  setProxyStatus: (status: ProxyStatus) => void;
  setAlerts: (alerts: AlertEvent[]) => void;
  setSettings: (settings: AppSettings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  dashboard: null,
  apiKeys: [],
  proxyStatus: null,
  alerts: [],
  settings: null,
  isLoading: false,
  error: null,
  
  setDashboard: (dashboard) => set({ dashboard }),
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setProxyStatus: (proxyStatus) => set({ proxyStatus }),
  setAlerts: (alerts) => set({ alerts }),
  setSettings: (settings) => set({ settings }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
