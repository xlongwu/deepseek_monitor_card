# DeepSeek API Monitor (双币种本地可观测代理与余额桌面监控组件)

> 🚀 **基于 Tauri 2.x + React 19 + TypeScript + Rust + SQLite 构建的跨平台桌面可观测性应用。**  
> 本项目专为个人开发者和团队设计，将您的 AI 接口调用变为一个**本地高安全的离线记账本**。支持 **人民币 (CNY) / 美元 (USD) 双币种并列展示**、**免后台轮询的冷启动装载**，并通过本地 Axum 高安全环回代理完美统计 **流式请求 (Cline / Cursor / Claude Code)** 的 Token 消耗与 Prompt 缓存命中计费。

![Tauri 2.x](https://img.shields.io/badge/Tauri-2.x-24C8D8?logo=tauri&style=flat-square)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&style=flat-square)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&style=flat-square)
![Rust 1.77+](https://img.shields.io/badge/Rust-1.77%2B-000000?logo=rust&style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

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

> [!IMPORTANT]
> **在编译或启动本项目前，请务必先确认您的系统已安装了 Rust 编译环境（`cargo` & `rustc`）！**  
> 如果未安装 Rust，在运行开发或构建指令（如 `npm run tauri:dev`）时会报错。

### 1. 🔍 环境快速预检 (Environment Pre-check)
请在您的终端/命令行中运行以下指令检查是否已安装 Rust：
```bash
rustc --version
```
* **如果输出版本号**（例如 `rustc 1.77.2 ...`），说明 Rust 环境正常，可跳过下方安装步骤！
* **如果提示命令不存在**（`command not found` 或 `无法识别`），请根据您的操作系统执行下方的安装指引。

---

### 2. 🛠️ Rust 编译器安装指引 (Rust Installation Guide)

#### 🪟 Windows 用户安装：
1. 访问 Rust 官方安装程序下载页面：[https://rustup.rs/](https://rustup.rs/)。
2. 下载并运行 `rustup-init.exe`。
3. 启动安装程序后，通常会提示您安装 **Visual Studio C++ Build Tools**，请按照屏幕提示（选择默认选项 `1`）进行安装以获得完整的 C++ 编译链接器。
4. 安装完成后，重启您的命令行窗口（PowerShell 或 CMD）即可生效。

#### 🍎 macOS 用户安装：
1. 首先，请确保安装了系统的 C 编译器和 SDK 链接器。在终端执行：
   ```bash
   xcode-select --install
   ```
   *根据系统提示点击“安装”，等待下载安装完成。*
2. 接下来，执行以下一键安装 Rust 官方脚本：
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. 按照屏幕提示，默认按回车键进行安装。安装成功后，执行以下指令或重启终端以使环境生效：
   ```bash
   source "$HOME/.cargo/env"
   ```

#### 🐧 Linux 用户安装 (以 Ubuntu/Debian 为例)：
1. 首先安装 Linux 系统编译所需的依赖库与 WebKit 依赖：
   ```bash
   sudo apt update
   sudo apt install -y build-essential libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
   ```
2. 接下来，通过官方脚本安装 Rust：
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. 按照提示选择默认安装，安装成功后运行：
   ```bash
   source "$HOME/.cargo/env"
   ```

---

### 3. 通用版本要求 (General Version Matrix)

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
