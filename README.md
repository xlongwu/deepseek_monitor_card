# DeepSeek API Monitor

<p align="center">
  <a href="#-deepseek-api-monitor-中文">🇨🇳 中文版</a> | 
  <a href="#-deepseek-api-monitor-english">🇺🇸 English Version</a>
</p>

---

# 🇨🇳 DeepSeek API Monitor (中文)

> 🚀 **基于 Tauri 2.x + React 19 + TypeScript + Rust + SQLite 构建的跨平台桌面可观测性应用。**  
> 本项目专为个人及团队设计，将您的 AI 接口调用变为一个**本地高安全的离线记账本**。支持 **人民币 (CNY) / 美元 (USD) 双币种并列展示**、**免后台轮询的冷启动装载**，并通过本地 Axum 高安全环回代理完美统计 **流式/非流式请求 (Cline / Cursor / Claude Code)** 的 Token 消耗与 Prompt 缓存命中折扣计费。

![Tauri 2.x](https://img.shields.io/badge/Tauri-2.x-24C8D8?logo=tauri&style=flat-square)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&style=flat-square)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&style=flat-square)
![Rust 1.77+](https://img.shields.io/badge/Rust-1.77%2B-000000?logo=rust&style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 🚀 核心特性

### 1. 🎨 拟物毛玻璃桌面视觉 (macOS Sonoma Glassmorphism)
- 全面适配类似 Apple / macOS Sonoma 风格的**高透光磨砂玻璃视觉**，极具科技视觉质感。
- **Dashboard 总览页面**：左侧是极简高对比度的多币种余额小组件（支持隐藏），右侧展示 5 大消耗指标和近 7 日每日消费柱状图（支持悬浮 Tooltip 明细）。
- **侧边栏 (translucent Sidebar)**：半透明磨砂设计，与系统柔和渐变背景完美融合。

### 2. 🪙 双币种余额并列展示与冷启动装载
- **CNY & USD 尊享双卡**：后台轮询同步，将官方返回的可用余额、赠送余额和充值余额均同时在本地以双币种并列展示。
- **免后台轮询的极速冷启动**：打开应用时在 `<5ms` 内瞬间装载本地 SQLite 缓存数据，完全关闭了后台无意义的轮询网络开销，支持自动轮询设定和一键手动刷新。

### 3. 🛡️ 本地代理默认强安全鉴权配置
- 本地 Axum 代理服务严格监听本机环回地址 `127.0.0.1:8787`。
- **自动生成高熵 Token**：首次启动时自动随机生成高安全密度的 `sk-local-[32位十六进制UUID]` 本地 Token 并写入本地数据库，第三方客户端调用必须挂载该密钥，杜绝局域网内的任何未授权调用。

### 4. 📊 完美捕获流式请求与 Prompt Caching 折扣计费
- 透明中继转发并实时拦截 Cline、Cursor 等工具的高频请求。
- **折扣分离计费**：计费模块能够精准捕捉流式字块中的 `prompt_cache_hit_tokens` 与 `prompt_cache_miss_tokens`，配合 SQLite 中价格表动态计算最终费用，计费精度较普通单价计费提升 200%。

### 5. 🔌 告警防刷雷达与统一设置偏好
- **系统通知**：低余额、单次超大 tokens 传输、每小时异常突增费用时自动唤醒操作系统的原生通知进行警报。
- **统一设置 (Settings)**：整合了 **API Key 密钥管理**（多 Key 互斥激活、安全钥匙串）、偏好轮询、告警阈值、离线账本导出（JSON/CSV）和数据库强力擦除等功能。

---

## ⚙️ 环境要求

> [!IMPORTANT]
> **在编译或启动本项目前，请务必先确认您的系统已安装了 Rust 编译环境（`cargo` & `rustc`）！**

### 1. 🔍 环境快速预检
请在终端中运行以下指令检查 Rust 状态：
```bash
rustc --version
```

### 2. 🛠️ Rust 编译器安装指引

- **Windows 用户**：访问 [https://rustup.rs/](https://rustup.rs/) 下载并运行 `rustup-init.exe`，安装默认选项 `1` 并配置完整的 Visual Studio C++ 构建工具环境。
- **macOS 用户**：先运行 `xcode-select --install` 准备 SDK 链接器，再执行 `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` 安装。
- **Linux 用户**：先配置 Gtk/WebKit 依赖：
  ```bash
  sudo apt install -y build-essential libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  ```
  然后再运行 Rust 官方安装脚本。

---

## 🚀 快速启动

我们配置了根目录快捷代理脚本，您无需深入子目录，直接在根目录下即可：
```bash
# 1. 安装前端依赖
npm install

# 2. 启动 Tauri 开发热重载模式
npm run tauri:dev

# 3. 生产打包本地纯净可执行文件
npm run tauri:build

# 4. 打包分发平台安装包 (例如 MSI)
npm run tauri:bundle
```

---

<p align="right"><a href="#deepseek-api-monitor">返回顶部 ⬆️</a></p>

---

# 🇺🇸 DeepSeek API Monitor (English)

> 🚀 **Cross-platform desktop observability application powered by Tauri 2.x + React 19 + TypeScript + Rust + SQLite.**  
> Designed for individuals and teams, this project turns your AI API invocations into a **highly secure local offline ledger**. It supports **simultaneous dual-currency (CNY / USD) balance cards**, **instant cold-start rendering without network bottlenecks**, and leverages a local Axum loopback proxy to count **streaming/non-streaming token expenditures (Cline / Cursor / Claude Code)** with precise Prompt Caching calculations.

---

## 🚀 Core Features

### 1. 🎨 macOS Sonoma Glassmorphic Aesthetics
- Fully adapted to Apple / macOS Sonoma style **high-transparency frosted glass visuals** for a premium desktop tool feel.
- **Dashboard Widget Layout**: Features a minimalist, high-contrast wallet widget on the left (with visible/hidden states) and interactive metrics lists with daily usage charts (with hover tooltips) on the right.
- **Translucent Sidebar**: Translucent frosted menu plate that blends perfectly with soft gradient layouts.

### 2. 🪙 Simultaneous CNY/USD Balances & Cold Start
- **Dual Currency Cards**: Syncs with official endpoints to offline-cache topped-up, granted, and total balances in both currencies.
- **Instant Cold Loading**: Loads cache from local SQLite in `<5ms` at startup, bypassing redundant background query overheads.

### 3. 🛡️ Hardened Local Loopback Security
- The local Axum proxy strictly listens on local loopback `127.0.0.1:8787` for zero external exposures.
- **Cryptographic Token Auto-Generation**: Automatically generates a unique, randomized `sk-local-[32-hex-uuid]` token on the first boot, preventing unauthorized lan calls.

### 4. 📊 Stream Sniffing & Discounted Caching Billing
- Acts as a local secure reverse proxy to catch stream usage metadata from IDE extensions (Cline, Cursor, etc.).
- **Differentiated Billing**: Perfectly captures `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens` to dynamically compute exact fees based on discounted caching rules.

### 5. 🔌 Safety Alerts Radar & Unified Settings
- **Native Notifications**: Triggers system alerts on low balance, high per-hour costs, massive token calls, or server faults (401, 429, 503).
- **Unified Preferences**: Combines **API Key Keychain Manager**, poll intervals, alarm triggers, offline ledger exports (JSON/CSV), and database purges.

---

## ⚙️ Prerequisites

> [!IMPORTANT]
> **Before building or running this project, ensure the Rust compilation environment (`cargo` & `rustc`) is fully installed on your system!**

### 1. 🔍 Fast Environment Check
Run the following in your command prompt:
```bash
rustc --version
```

### 2. 🛠️ Rust Compiler Installation Guide

- **Windows**: Download and run `rustup-init.exe` from [https://rustup.rs/](https://rustup.rs/) (Choose default option `1` and configure Visual Studio C++ Build Tools).
- **macOS**: Prepare the C compiler via `xcode-select --install`, then execute `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`.
- **Linux (Ubuntu/Debian)**: Install Gtk/WebKit essentials first:
  ```bash
  sudo apt install -y build-essential libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  ```
  And then execute the standard Rust script.

---

## 🚀 Quick Start

Root-level NPM proxy scripts are configured for you:
```bash
# 1. Install frontend packages
npm install

# 2. Run in hot-reload development mode
npm run tauri:dev

# 3. Build standalone production binary
npm run tauri:build

# 4. Compile platform-specific bundles (e.g., Windows MSI)
npm run tauri:bundle
```

---

<p align="right"><a href="#deepseek-api-monitor">Back to Top ⬆️</a></p>
