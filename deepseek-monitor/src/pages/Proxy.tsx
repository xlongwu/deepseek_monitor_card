import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { getProxyStatus, startProxy, stopProxy } from '../services/tauri';
import {
  Activity,
  Play,
  Square,
  Copy,
  CheckCircle,
  Terminal,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { GlassCard, PageHeader, StatusPill, SectionTitle } from '../components/AppleUI';

export default function Proxy() {
  const { proxyStatus, setProxyStatus } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
    const config = `base_url: ${proxyStatus?.url || 'http://127.0.0.1:8787'}/v1\napi_key: sk-local-... (查看系统设置获取)`;
    navigator.clipboard.writeText(config).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const running = proxyStatus?.running ?? false;

  return (
    <div className="p-6 overflow-y-auto max-h-[100vh]">
      <PageHeader
        title="本地安全代理"
        description="将大模型客户端指向本地环回代理接口，自动嗅探 SSE 流中的 Token 级计费并安全记账"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left main config block */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Proxy controller */}
          <GlassCard>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 mb-5">
              <div className="flex items-center gap-2">
                <Activity className="h-[18px] w-[18px] text-blue-500" />
                <SectionTitle title="代理状态控制" subtitle="监听本地 127.0.0.1 闭合安全环回接口" />
              </div>
              <StatusPill available={running} text={running ? '代理运行中' : '服务已关停'} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/50 bg-slate-50/50 p-4 flex flex-col justify-between h-[120px]">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">代理监听地址</h4>
                  <p className="mt-1 text-lg font-black text-slate-800 tracking-tight font-mono">
                    {proxyStatus?.url || 'http://127.0.0.1:8787'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-700 bg-white hover:bg-slate-50 transition border border-slate-200 shadow-sm cursor-pointer"
                  >
                    {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? '已复制到剪切板' : '复制 Base URL'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-slate-50/50 p-4 flex flex-col justify-between h-[120px]">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">物理开关联动</h4>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400 leading-normal">
                    开机自动启动，为第三方终端应用（如 Cursor, Cline, Claude Code）提供零延时中继。
                  </p>
                </div>
                <button
                  onClick={handleToggleProxy}
                  disabled={loading}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                    running
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10'
                  } disabled:opacity-50`}
                >
                  {loading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : running ? (
                    <>
                      <Square className="h-3.5 w-3.5" />
                      停止代理服务
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      启动代理服务
                    </>
                  )}
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Code SDK Setups */}
          <GlassCard>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200/40 mb-5">
              <Terminal className="h-[18px] w-[18px] text-slate-600" />
              <SectionTitle title="开发者 IDE 及大模型 SDK 注入指南" subtitle="将原有 DeepSeek 官方 Endpoint 替换为本机的安全环回代理。" />
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/50 bg-slate-950 p-4 text-slate-200 font-mono text-[11px] leading-relaxed shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Cursor / Cline / Cline AI Config</span>
                  <span className="text-[10px] text-blue-400 font-bold">127.0.0.1 Endpoint</span>
                </div>
                <p className="text-slate-400">// 输入自定义的 API Base URL 地址及安全 Proxy Token 头信息</p>
                <p className="text-white mt-1">API URL (Base URL): <span className="text-emerald-400 font-bold">{proxyStatus?.url || 'http://127.0.0.1:8787'}/v1</span></p>
                <p className="text-white">API Key (Proxy Token): <span className="text-amber-400 font-bold">sk-local-[系统设置中生成的本地高熵秘钥]</span></p>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-slate-950 p-4 text-slate-200 font-mono text-[11px] leading-relaxed shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Python OpenAI SDK 注入</span>
                  <span className="text-[10px] text-slate-500">Python 3.x</span>
                </div>
                <pre className="text-slate-100 overflow-x-auto whitespace-pre">
{`from openai import OpenAI

client = OpenAI(
    base_url="${proxyStatus?.url || 'http://127.0.0.1:8787'}/v1",
    api_key="sk-local-[系统设置中生成的本地高熵秘钥]"
)`}
                </pre>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right side: Security rules info */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="bg-slate-50/50">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/40 mb-3">
              <Shield className="h-[18px] w-[18px] text-blue-500" />
              <h4 className="text-xs font-black tracking-tight text-slate-800 uppercase">环回网络安全声明</h4>
            </div>
            
            <ul className="space-y-3.5 text-[11px] font-semibold text-slate-500 leading-normal">
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span><strong>严格本机环回模式</strong>：代理网络仅在本机的 127.0.0.1 闭环网络中生效，局域网及外部公网绝对无法穿透嗅探，保证隐私安全。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span><strong>流式统计捕获</strong>：在以 Stream SSE 流传输推理字块时，代理会在响应末尾安全注入 `include_usage` 参数以防统计数据丢失。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span><strong>零中转安全中继</strong>：您的 API 钥匙串不会上传给任何第三方，在请求通过代理核算完 Tokens 花费后，即由底层网络直连官方，不存在任何中间商。</span>
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
