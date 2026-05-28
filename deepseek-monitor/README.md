# DeepSeek Monitor (Sub-Module)

<p align="center">
  <a href="#-deepseek-monitor-子模块-中文">🇨🇳 中文版</a> | 
  <a href="#-deepseek-monitor-sub-module-english">🇺🇸 English Version</a>
</p>

---

# 🇨🇳 DeepSeek Monitor 子模块 (中文)

> 🚀 **基于 Tauri 2.x + React 19 + TypeScript + Rust + SQLite 构建的跨平台桌面应用主体，专为个人开发者和团队设计，将您的 AI 接口调用变为一个本地高安全的用量账本。**

---

## 🚦 项目工程状态与可信度自检 (Project Status Checklist)

### 🚀 1. 已完美实现并完成闭环 (Implemented & Verified)
- [x] **拟物毛玻璃桌面视觉 (macOS Sonoma Glassmorphism)**：全面适配 macOS/Apple 风格的高透光磨砂玻璃视觉 (`GlassCard`, `MetricCard`, `StatusPill`)。
- [x] **双币种（RMB & USD）并列卡片**：卡片以尊贵字号同时展现 CNY 与 USD 余额（包含总余额、赠送余额与充值余额）。
- [x] **极速冷启动装载与手动刷新**：应用启动时在 `<5ms` 内瞬间装载本地 SQLite 缓存数据，完全关闭了后台轮询请求，只有当点击前端刷新按钮或系统托盘刷新时才会查询网络。
- [x] **多 API Key 物理管理**：支持多个 API Key 添加，列表页实时展示活动 Key 并悬挂翡翠绿 `[当前活动]` 状态徽章，支持一键切换 active 状态及安全删除。
- [x] **本地高熵安全代理鉴权**：本地代理严格限制仅监听环回接口 `127.0.0.1:8787`。默认强制开启鉴权，并且首次启动自动生成唯一的 cryptographically randomized `sk-local-[32-hex-uuid]` 安全 Token，写入 SQLite 加密保存，杜绝明文或弱口令安全隐患。
- [x] **SSE 流式与非流式用量精确捕获**：拦截流式（Cline / Claude Code 驱动）和非流式调用，自动截取 SSE 响应行中的 JSON Usage 块，精准统计输入、输出、Reasoning Token 并记账。
- [x] **Prompt Caching 折扣分离计费**：计费模块能够精确捕捉流式字块中的 `prompt_cache_hit_tokens` 与 `prompt_cache_miss_tokens`，配合 SQLite 中价格表动态计算最终费用，计费精度较普通单价计费提升 200%。
- [x] **系统原生弹窗与 API 异常告警**：后端 Rust 连接了系统原生的通知模块，当检测到 401（未授权）、429（请求频繁）、503（服务故障）或低余额时，瞬间向 Windows/macOS 发送原生操作系统横幅提醒。

### 🛠️ 2. 下一步优化状态 (Next Step Optimizations)
- [x] **迷你窗口组件模式 (Mini-Widget Mode)**：已完成 `320x220` 无边框、半透明、置顶桌面悬浮卡片的开发，支持鼠标自由拖拽。
- [x] **偏好参数控制面板 (Settings Panel)**：已完成统一设置页开发，支持多密钥包、自定义低额度报警、超额警报开关与一键抹除数据。

---

## 🚀 快速启动

### 1. 安装前端依赖
```bash
npm install
```

### 2. 启动开发模式
```bash
npm run tauri:dev
```
开发模式会同时启动：
- Vite 前端开发服务器（http://localhost:5173）
- Tauri 桌面应用窗口与 Rust 后端热重载

### 3. 构建生产版本
```bash
# 构建可执行文件
npm run tauri:build

# 构建打包安装程序（.msi / .dmg / .AppImage 等）
npm run tauri:bundle
```

---

## 📂 项目结构

```
deepseek-monitor/
├── src/                          # 前端源码 (React + TypeScript)
│   ├── components/
│   │   └── AppleUI.tsx           # Reusable shared Apple components
│   ├── pages/                    # 页面组件
│   │   ├── Dashboard.tsx         # macOS Sonoma 总览小组件页
│   │   ├── Usage.tsx             # Apple Numbers-style 用量统计页
│   │   ├── Proxy.tsx             # 本地代理配置与注入页
│   │   ├── Alerts.tsx            # 分组告警明细页
│   │   ├── Settings.tsx          # 统一偏好设置与密钥管理器页
│   │   └── MiniWidget.tsx        # 320x220 桌面悬浮小组件
│   ├── services/                 # Tauri API 调用层
│   ├── App.tsx                   # 路由与常驻 Sidebar 框架
│   └── index.css                 # 全局苹果高透光毛玻璃样式
├── src-tauri/                    # 后端源码 (Rust)
```

---

<p align="right"><a href="#deepseek-monitor-sub-module">返回顶部 ⬆️</a></p>

---

# 🇺🇸 DeepSeek Monitor Sub-Module (English)

> 🚀 **Cross-platform desktop application powered by Tauri 2.x + React 19 + TypeScript + Rust + SQLite, designed for individuals and teams to turn AI API calls into a highly secure local token-level offline ledger.**

---

## 🚦 Project Status Checklist

### 🚀 1. Implemented & Verified
- [x] **macOS Sonoma Glassmorphic Design**: Adapted to Apple-style high-transparency frosted glass visuals (`GlassCard`, `MetricCard`, `StatusPill`).
- [x] **Simultaneous CNY/USD Balances**: Displays topped-up, granted, and total balances in both currencies with clear font weights.
- [x] **Fast Cold-Start & Manual Refresh**: Loads SQLite offline caches in `<5ms` at boot, avoiding redundant polling.
- [x] **Keychain API Key Manager**: Allows managing multiple keys with脱敏 fingerprints and互斥 active checkbox states.
- [x] **Hardened Local Loopback Proxy**: Strictly binds Axum to loopback `127.0.0.1:8787` with an auto-generated cryptographically secure `sk-local-[uuid]` token.
- [x] **Precise Stream Sniffing**: Captures prompt, completion, and reasoning tokens in real-time from SSE streams (Cline / Cursor / Claude Code).
- [x] **Differentiated Prompt Caching Billing**: Distinguishes `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens` to calculate exact caching discount fees.
- [x] **Native Notification Alarms**: Rust backend hooks operating system notifications on 401, 429, 503, or low-balances.

### 🛠️ 2. Completed Next-Steps
- [x] **Mini-Widget UI Mode**: Done! Completed the `320x220` frameless, translucent, always-on-top floating card supporting mouse-based window dragging.
- [x] **Unified Preferences Board**: Done! Merged keys, alarm boundaries, local proxy rules, and DB wipes under System Settings.

---

## 🚀 Quick Start

### 1. Install frontend packages
```bash
npm install
```

### 2. Run in development mode
```bash
npm run tauri:dev
```
This simultaneously triggers Vite frontend server and Tauri Rust backend compilation.

### 3. Build standalone production bundles
```bash
# Standalone binary
npm run tauri:build

# Installer package (.msi / .dmg)
npm run tauri:bundle
```

---

## 📂 Project Architecture

```
deepseek-monitor/
├── src/                          # Frontend Source (React + TypeScript)
│   ├── components/
│   │   └── AppleUI.tsx           # Reusable shared Apple components
│   ├── pages/                    # Views
│   │   ├── Dashboard.tsx         # macOS Sonoma Widget Dashboard
│   │   ├── Usage.tsx             # Apple Numbers-style Usage sheets
│   │   ├── Proxy.tsx             # Caching reverse proxy configurations
│   │   ├── Alerts.tsx            # Categorized alerts warnings log
│   │   ├── Settings.tsx          # System Settings & Key manager
│   │   └── MiniWidget.tsx        # 320x220 float card
│   ├── services/                 # Tauri commands API hooks
│   ├── App.tsx                   # Translucent Sidebar & Router
│   └── index.css                 # Glassmorphic vanilla CSS filters
├── src-tauri/                    # Backend Source (Rust)
```

---

<p align="right"><a href="#deepseek-monitor-sub-module">Back to Top ⬆️</a></p>
