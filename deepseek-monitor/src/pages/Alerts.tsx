import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { getAlertEvents, acknowledgeAlert } from '../services/tauri';
import {
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { GlassCard, PageHeader, EmptyState } from '../components/AppleUI';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export default function Alerts() {
  const { alerts, setAlerts } = useAppStore();

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const data = await getAlertEvents();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
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

  // Visual helper elements
  const severityMetadata = {
    error: {
      color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      badge: '错误',
      icon: XCircle,
      borderColor: 'border-l-rose-500',
    },
    warning: {
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      badge: '警告',
      icon: AlertTriangle,
      borderColor: 'border-l-amber-500',
    },
    info: {
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      badge: '信息',
      icon: Info,
      borderColor: 'border-l-blue-500',
    },
  };

  return (
    <div className="p-6 overflow-y-auto max-h-[100vh]">
      <PageHeader
        title="告警中心"
        description="实时监控本地 API 计费代理的超量警告、服务器 5xx 故障及额度欠费记录"
      />

      {alerts.length > 0 ? (
        <div className="grid gap-4 max-w-4xl">
          {alerts.map((alert, index) => {
            const meta = severityMetadata[alert.severity as 'error' | 'warning' | 'info'] || severityMetadata.info;
            const Icon = meta.icon;
            
            return (
              <GlassCard
                key={alert.id}
                delay={index * 0.03}
                className={cn(
                  "border-l-4 p-5 hover:translate-x-[2px]",
                  meta.borderColor
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("grid h-9 w-9 place-items-center rounded-xl shrink-0 mt-0.5", meta.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("inline-flex px-2 py-0.5 text-[9px] font-black rounded-full border uppercase tracking-widest", meta.color)}>
                          {meta.badge}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
                          {alert.title}
                        </h4>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-500 max-w-xl">
                        {alert.message}
                      </p>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>触发时间: {formatTime(alert.triggered_at)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100/50 transition cursor-pointer border border-blue-500/10 shrink-0"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    忽略告警
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <div className="py-12 max-w-xl mx-auto">
          <EmptyState
            icon={ShieldCheck}
            title="系统状态安全运行"
            description="目前没有检测到任何 API 代理欠费、限频拥堵或单次 Tokens 调用超标的阻断通知。"
          />
        </div>
      )}
    </div>
  );
}
