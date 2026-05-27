# DeepSeek API Monitor (双币种桌面监控组件)

> 🚀 **基于 Tauri 2.x + React 19 + TypeScript + Rust + SQLite 构建的跨平台桌面应用。**  
> 专为个人开发者和团队设计，支持 **人民币 (CNY) / 美元 (USD) 双币种并列展示**、**免后台轮询的手动刷新与冷启动装载**，并通过本地 Axum 代理完美统计 **流式请求 (Cline / Claude Code)** 的 Token 消耗与计费。

![Tauri 2.x](https://img.shields.io/badge/Tauri-2.x-24C8D8?logo=tauri&style=flat-square)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&style=flat-square)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&style=flat-square)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-Anim-FF00C1?logo=framer&style=flat-square)
![Rust 1.77+](https://img.shields.io/badge/Rust-1.77%2B-000000?logo=rust&style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 🌟 核心特性 (Key Features)

### 💎 1. 双币种并列尊享看板 (RMB & USD Stacked Display)
- **主余额显示**：主卡片区域优先以尊贵大字号显示**人民币余额 (CNY)**，在其下方优雅并列显示**美元余额 (USD)**。
- **子额度分离**：将“赠送余额”与“充值余额”小状态框重构，同时叠放人民币与美元的精确值。
- **全量保存与持久化分发**：Rust 后端在拉取接口时会全量捕获 DeepSeek 返回的双币种信息并存入数据库，确保历史记录和展示的数据偏差为零。

### 🔋 2. 极致手动刷新控制 (Zero Background Polling & Local Cache Loader)
- **拒绝后台网络开销**：完全关闭了无限循环自动后台轮询 API 的逻辑，保护您的 API 调用额度及流量。
- **离线秒开机制**：在软件启动时，异步从 SQLite 极速装载上一次同步并加密缓存好的余额数据，**实现秒开且不发送任何网络请求**。
- **手动一键同步**：只有在前端手动点击“刷新”键，或系统托盘菜单中选择“刷新余额”时，才会实时发起网络查询，完美掌控查询节奏。

### 🔌 3. 完备的流式 SSE 拦截器 (Cline / Claude Code 完美统计)
- **零延迟拦截转发**：采用 Axum 结合 Rust 异步生成流（`async-stream`），对流式请求（`stream=true`）进行无延迟的字节转发。
- **SSE Chunk 精准解析**：在后台拼接字节并按行解析 SSE 报文，提取末尾携带的 `usage` 块，获取精确的 `prompt_tokens`、`completion_tokens`、`reasoning_tokens` 以及 `estimated_cost`。
- **IDE 插件完美监控**：Cline、Claude Code、Cursor 等 IDE 插件通过配置本地 `base_url` 后，所有调用均可被高精度统计。

### 🛡️ 4. 全局告警引擎与原生系统推送 (Alert Engine & OS Notifications)
- **系统原生弹窗**：后端 Rust 连接了 `tauri-plugin-notification` 模块。警报被触发时，会立即向 Windows/macOS 操作系统发送系统级原生推送。
- **全场景安全检测**：
  - 余额检测：当前余额低于设定的 `low_balance_threshold` 阈值时触发。
  - 请求检测：单次代理调用 Token 消耗超过设定的超大阈值时触发。
  - 费用突增：近一小时消耗突破阈值时触发。
  - API 状态异常：捕获代理转发中出现的 401（Key 无效）、429（请求频繁）、503（服务不可用）并生成错误告警。
- **交互忽略**：告警历史记录呈现在前端 Alerts 页面中，支持一键点击“忽略”实时修改 SQLite 告警库状态。

### 🏷️ 5. 动态数据库计费 (Dynamic Pricing)
- 代理层费用计算完全对接 SQLite 数据库的 `price_rules` 价格表，自动按您配置的输入、输出、缓存击中单价精确算费，杜绝了硬编码，价格规则后期支持极速手动更新。

---

## 🎨 视觉设计 (Premium Visual Design)
基于 **磨砂玻璃拟物化设计 (Glassmorphism & Rich Aesthetics)**：
- 深色质感黑金卡片搭载高对比度彩色图标，极具科技视觉张力。
- 动态消费走势柱状图支持鼠标指针 Hover，悬浮浮窗流畅弹出对应天数的人民币/美元金额 Tooltip 提示。
- 提供“隐藏/显示”眼部按钮，可一键遮罩隐藏核心隐私余额信息。

---

## ⚙️ 环境要求 (Prerequisites)

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18 | 前端构建环境 |
| Rust | >= 1.77.2 | 后端编译环境（安装 `rustup`） |
| npm / pnpm | 任意 | 包管理器 |

---

## 📂 项目结构 (Project Architecture)

```text
deepseek_api_desktop/             # 根目录 (已内置 NPM 脚本代理分发)
├── package.json                  # 根目录代理脚本文件，支持免 cd 直接启动
├── .gitignore                    # 极高安全性屏蔽配置，保护 node_modules、Rust 构建产物及 SQLite 数据库
├── 设计方案文档.md                # 详细系统架构与数据模型设计方案
└── deepseek-monitor/             # Tauri 桌面应用主体
    ├── src/                      # 前端源码 (React + TS + Tailwind v4)
    │   ├── pages/
    │   │   └── Dashboard.tsx     # 尊享版双币种与手动刷新 Dashboard 主视口
    │   ├── services/
    │   │   └── tauri.ts          # 前后端 Tauri API 通信层
    │   └── App.tsx               # 路由与常驻框架
    ├── src-tauri/                # 后端源码 (Rust)
    │   ├── src/
    │   │   ├── main.rs           # 应用入口、系统托盘及通知挂载
    │   │   ├── commands/         # Tauri Commands 通信控制器
    │   │   ├── services/
    │   │   │   ├── balance_poller.rs  # 余额拉取与 SQLite 离线缓存
    │   │   │   └── alert_engine.rs    # 原生弹窗告警引擎
    │   │   └── proxy/            # Axum SSE 拦截代理与动态计费
    │   ├── migrations/           # 数据库迁移脚本
    │   └── Cargo.toml            # Rust 依赖 (已引入 async-stream & futures-util)
    └── tauri.conf.json           # Tauri 2.0 配置 (包含 notification 插件修复)
```

---

## 🚀 快速启动 (Quick Start)

我们已经在项目的**根目录**下为您配置好了 **NPM 快捷代理指令**，您在克隆项目后无需进入子目录，即可在当前根目录下直接一键完成安装和运行！

### 1. 克隆项目与安装依赖

```bash
git clone <your-repository-url>
cd deepseek_api_desktop

# 在根目录下直接一键安装前端依赖
npm install
```

### 2. 启动开发模式

在当前**根目录下**直接运行开发指令：
```bash
npm run tauri:dev
```
- **注意**：首次启动时 Rust 编译器需要拉取并全量构建依赖包，这可能需要花费几分钟时间。启动成功后，您会同时获得 Vite 前端热重载服务和原生的桌面端 Tauri App 视口。

### 3. 构建与打包

在根目录下直接打包编译纯净的生产版本：
```bash
# 构建本地免安装可执行程序
npm run tauri:build

# 构建完整平台分发安装包（如 Windows 的 .msi）
npm run tauri:bundle
```

---

## 🔒 安全说明 (Security & Privacy)

- **API Key 物理加密**：明文 API Key 采用操作系统的原生钥匙串（Windows Credential Manager / macOS Keychain / Linux Secret Service）强加密存储。
- **绝不泄漏**：本地 SQLite 数据库中只记录 Key 的别名和脱敏指纹（`sk-********************xxxx`），绝对不保留任何明文 Key。
- **本地优先**：所有的代理和数据存储均 100% 发生在您本地的 `127.0.0.1` 环回接口及数据库中，绝对不会上传到任何第三方云服务器上。

---

## 📄 开源许可证 (License)

本项目遵循 [MIT License](LICENSE) 许可证开源。
