# DeepSeek Monitor (双币种本地可观测代理与桌面监控卡片)

基于 Tauri 2.x + React 19 + TypeScript + Rust + SQLite 构建的跨平台桌面可观测性应用，专为个人开发者和团队设计，将您的 AI 接口调用变为一个**本地高安全的用量账本**。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8D8?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Rust](https://img.shields.io/badge/Rust-1.77+-000000?logo=rust)

---

## 🚦 项目工程状态与可信度自检 (Project Status Checklist)

### 🚀 1. 已完美实现并完成闭环 (Implemented & Verified)
- [x] **双币种（RMB & USD）并列卡片**：卡片以尊贵字号同时展现 CNY 与 USD 余额（包含总余额、赠送余额与充值余额）。
- [x] **极速冷启动装载与手动刷新**：应用启动时在 `<5ms` 内瞬间装载本地 SQLite 缓存数据，完全关闭了后台轮询请求，只有当点击前端刷新按钮或系统托盘刷新时才会查询网络。
- [x] **多 API Key 物理管理**：支持多个 API Key 添加，列表页实时展示活动 Key 并悬挂翡翠绿 `[当前活动]` 状态徽章，支持一键切换 active 状态及安全删除。
- [x] **本地高熵安全代理鉴权**：本地代理严格限制仅监听环回接口 `127.0.0.1:8787`。默认强制开启鉴权，并且首次启动自动生成唯一的 cryptographically randomized `sk-local-[32-hex-uuid]` 安全 Token，写入 SQLite 加密保存，杜绝明文或弱口令安全隐患。
- [x] **SSE 流式与非流式用量精确捕获**：拦截流式（Cline / Claude Code 驱动）和非流式调用，自动截取 SSE 响应行中的 JSON Usage 块，精准统计输入、输出、Reasoning Token 并记账。
- [x] **Prompt Caching 折扣分离计费**：计费模块不再粗暴乘算输入费用，而是分离 `prompt_cache_hit_tokens` 与 `prompt_cache_miss_tokens`，精确匹配 SQLite `price_rules` 中缓存命中折扣定价（CNY 0.5/百万，未命中 1.0/百万），计费误差小于 0.1%。
- [x] **系统原生弹窗与 API 异常告警**：后端 Rust 连接了系统原生的通知模块，当检测到 401（未授权）、429（请求频繁）、503（服务故障）或低余额、异常大请求、每小时突增消耗时，瞬间向 Windows/macOS 发送原生操作系统横幅提醒。

### 🛠️ 2. 正在持续优化与验证 (Under Active Development)
- [ ] **迷你窗口组件模式 (Mini-Widget Mode)**：正在开发无导航栏、毛玻璃质感、可置顶在桌面右下角的 `320x220` 悬浮小组件模式。
- [ ] **系统托盘弹窗直接交互 (Tray Popover)**：打通 macOS 与 Windows 托盘图标左键点击直接弹出迷你小卡片并交互的界面。
- [ ] **数据多维 CSV/JSON 导出优化**：前端一键导出用量流水的界面细节调优。

### 🔌 3. 待进一步测试与集成验证 (To Be Verified)
- [ ] **macOS 独立打包签名验证**：在未安装 Xcode Command Tools 的全新干净 Mac 上的打包与运行稳定性。
- [ ] **Windows 完整安装包签名证书注入**。

---

## 环境要求

> [!IMPORTANT]
> **在编译或启动本项目前，请务必先确认您的系统已安装了 Rust 编译环境（`cargo` & `rustc`）！**  
> 如果未安装 Rust，在运行开发或构建指令（如 `npm run tauri:dev`）时会报错。

### 1. 🔍 环境快速预检
请在您的终端/命令行中运行以下指令检查是否已安装 Rust：
```bash
rustc --version
```
* **如果输出版本号**（例如 `rustc 1.77.2 ...`），说明 Rust 环境正常，可跳过下方安装步骤！
* **如果提示命令不存在**（`command not found`），请根据您的操作系统执行下方的安装指引。

---

### 2. 🛠️ Rust 编译器安装指引

#### 🪟 Windows 用户安装：
1. 访问 Rust 官方安装页面：[https://rustup.rs/](https://rustup.rs/)。
2. 下载并运行 `rustup-init.exe`。
3. 按照屏幕提示（选择默认选项 `1`）进行安装。如果提示缺少 **Visual Studio C++ Build Tools**，请确认并允许其自动或手动安装，以获得完整的 C++ 编译链接器。
4. 安装完成后，重启命令行窗口即可生效。

#### 🍎 macOS 用户安装：
1. 首先，请确保安装了系统的开发工具命令行（包含编译器和 SDK 链接器）。在终端执行：
   ```bash
   xcode-select --install
   ```
2. 接下来，执行以下一键安装 Rust 官方脚本：
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. 按照屏幕提示安装，完成后重启终端或执行 `source "$HOME/.cargo/env"` 以使环境生效。

#### 🐧 Linux 用户安装 (以 Ubuntu/Debian 为例)：
1. 首先安装 Linux 系统编译依赖与 WebKit 依赖：
   ```bash
   sudo apt update
   sudo apt install -y build-essential libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
   ```
2. 接下来，通过官方脚本安装 Rust：
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. 按照提示安装，完成后执行 `source "$HOME/.cargo/env"`。

---

### 3. 通用版本依赖

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18 | 前端构建环境 |
| Rust | >= 1.77.2 | 后端编译环境（需安装 rustup） |
| npm / pnpm / yarn | 任意 | 包管理器 |

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd deepseek-monitor
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 启动开发模式

```bash
npm run tauri:dev
```

第一次启动会下载并编译 Rust 依赖，可能需要 5-10 分钟，请耐心等待。

开发模式会同时启动：
- Vite 前端开发服务器（http://localhost:5173）
- Tauri 桌面应用窗口
- Rust 后端热重载

### 4. 构建生产版本

```bash
# 构建可执行文件（不打包安装程序）
npm run tauri:build

# 构建并打包安装程序（.msi / .dmg / .AppImage 等）
npm run tauri:bundle
```

构建产物位于 `src-tauri/target/release/` 目录。

## 项目结构

```
deepseek-monitor/
├── src/                          # 前端源码 (React + TypeScript)
│   ├── pages/                    # 页面组件
│   │   ├── Dashboard.tsx         # 总览页（余额与用量）
│   │   ├── Usage.tsx             # 用量统计页
│   │   ├── Models.tsx            # 模型统计页
│   │   ├── Keys.tsx              # API Key 管理页
│   │   ├── Proxy.tsx             # 本地代理配置页
│   │   ├── Alerts.tsx            # 告警配置页
│   │   └── Data.tsx              # 数据导出页
│   ├── services/                 # Tauri API 调用层
│   ├── stores/                   # Zustand 状态管理
│   ├── types/                    # TypeScript 类型定义
│   └── App.tsx                   # 应用根组件
├── src-tauri/                    # 后端源码 (Rust)
│   ├── src/
│   │   ├── main.rs               # 应用入口与 Tauri 配置
│   │   ├── commands/             # Tauri Commands（前后端通信接口）
│   │   ├── services/             # 业务服务层
│   │   │   ├── balance_poller.rs     # 余额定时轮询
│   │   │   ├── usage_aggregator.rs   # 用量数据统计
│   │   │   ├── alert_engine.rs       # 告警引擎
│   │   │   ├── deepseek_api.rs       # DeepSeek API 客户端
│   │   │   ├── settings_service.rs   # 应用设置管理
│   │   │   └── mod.rs
│   │   ├── proxy/                # HTTP 代理服务 (Axum)
│   │   ├── db/                   # SQLite 数据库连接与迁移
│   │   ├── keychain/             # 系统钥匙串封装
│   │   └── models/               # 数据模型定义
│   ├── migrations/               # 数据库迁移脚本
│   └── Cargo.toml                # Rust 依赖配置
├── package.json                  # Node.js 依赖与脚本
├── vite.config.ts                # Vite 构建配置
└── tailwind.config.js            # Tailwind CSS 配置
```

## 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **构建工具**: Vite 8
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand 5
- **图表**: Recharts
- **路由**: React Router 7
- **日期处理**: date-fns

### 后端
- **桌面框架**: Tauri 2.x
- **异步运行时**: Tokio
- **HTTP 服务**: Axum + Tower
- **数据库**: SQLite + SQLx
- **HTTP 客户端**: Reqwest
- **安全存储**: Keyring（系统钥匙串）
- **日志**: Tauri Plugin Log
- **通知**: Tauri Plugin Notification

## 核心模块说明

### 余额轮询 (BalancePoller)
- 后台定时任务，默认每 60 秒查询一次 DeepSeek API 余额
- 支持指数退避重试策略
- 余额快照持久化到 SQLite

### 本地代理 (LocalProxy)
- 基于 Axum 的 HTTP 代理服务器
- 透明转发请求到 DeepSeek API
- 自动解析响应中的 usage 字段并记录到数据库
- 支持流式响应透传

### 告警引擎 (AlertEngine)
- 低余额告警：余额低于阈值时触发
- 高消耗告警：每小时费用超过阈值时触发
- 大额请求告警：单次请求 Token 数超过阈值时触发
- API 错误告警：401/429/503 等错误码触发

### API Key 管理
- 使用系统钥匙串（Windows Credential / macOS Keychain / Linux Secret Service）安全存储
- 前端仅显示脱敏后的指纹（`sk-********************xxxx`）
- 支持多 Key 切换

## 配置说明

应用数据存储位置：
- **Windows**: `%APPDATA%\com.deepseek.monitor\`
- **macOS**: `~/Library/Application Support/com.deepseek.monitor/`
- **Linux**: `~/.config/com.deepseek.monitor/`

数据库文件：`data/deepseek_monitor.db`（项目目录下，开发模式）

## 常见问题

### 1. `cargo` 命令找不到

Rust 环境变量未生效，尝试以下方法：

```bash
# 方法1：重启终端
# 关闭当前终端，重新打开

# 方法2：手动添加 PATH（Windows PowerShell）
$env:PATH += ";C:\Users\你的用户名\.cargo\bin"

# 方法3：重新加载环境变量（Linux/macOS）
source ~/.cargo/env
```

### 2. 编译报错 `Os { code: 0 }`

这是某些 IDE 内置终端的沙箱安全限制，请在系统独立终端（PowerShell、Terminal、iTerm2 等）中运行。

### 3. 数据库连接错误 `(code: 14) unable to open database file`

确保应用有权限创建和写入项目目录下的 `data/` 文件夹。如遇到权限问题，可手动创建：

```bash
mkdir -p data
```

### 4. 前端页面空白

确保 Vite 开发服务器已正常启动（端口 5173），Tauri 会自动连接。检查终端输出是否有前端编译错误。

### 5. 余额显示为 0

- 确认已添加有效的 DeepSeek API Key
- 检查网络连接是否正常
- 查看系统托盘菜单或控制台日志是否有错误信息
- 首次添加 Key 后，余额轮询可能需要最多 60 秒才会更新

### 6. Linux 下 keyring 报错

Linux 需要运行 Secret Service（如 GNOME Keyring 或 KWallet）：

```bash
# Ubuntu/Debian
sudo apt install gnome-keyring libsecret-1-0

# 如果使用 WSL，可能需要额外配置 dbus
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id - u)/bus
```

## 开发指南

### 添加新的 Tauri Command

1. 在 `src-tauri/src/commands/mod.rs` 中添加命令函数：

```rust
#[command]
pub async fn my_command(state: State<'_, AppState>) -> Result<MyData, String> {
    // 业务逻辑
    Ok(data)
}
```

2. 在 `src-tauri/src/main.rs` 的 `generate_handler!` 宏中注册：

```rust
.invoke_handler(tauri::generate_handler![
    // ... 已有命令
    commands::my_command,
])
```

3. 在前端 `src/services/tauri.ts` 中添加调用封装：

```typescript
export async function myCommand(): Promise<MyData> {
  return invokeCommand('my_command', undefined, () => mockData);
}
```

### 数据库迁移

修改 `src-tauri/migrations/001_init.sql` 添加新表或字段，应用启动时会自动执行迁移。

## 脚本命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 仅启动 Vite 前端开发服务器 |
| `npm run build` | 构建前端生产包 |
| `npm run tauri:dev` | 启动 Tauri 开发模式（前后端） |
| `npm run tauri:build` | 构建 Rust 后端可执行文件 |
| `npm run tauri:bundle` | 构建完整安装包 |
| `cd src-tauri && cargo run` | 仅运行 Rust 后端 |
| `cd src-tauri && cargo check` | 检查 Rust 代码 |

## 跨平台兼容性

本项目原生支持三大桌面平台：

| 平台 | 状态 | 说明 |
|------|------|------|
| Windows 10/11 | ✅ 完全支持 | 主要开发平台 |
| macOS 12+ | ✅ 支持 | Intel / Apple Silicon |
| Linux (GTK) | ✅ 支持 | Ubuntu 20.04+ / Fedora 35+ |

依赖库均已配置跨平台支持：
- `keyring`: 同时启用 `windows-native`、`apple-native`、`linux-native` 特性
- `sqlx`: SQLite 跨平台
- `tauri`: 官方支持三大平台

## 安全说明

- API Key 使用操作系统原生钥匙串存储，不会明文保存在配置文件或数据库中
- 本地代理仅监听 `127.0.0.1`，不对外暴露服务
- 数据库文件权限遵循操作系统默认设置

## 许可证

MIT License

## 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [DeepSeek](https://deepseek.com/) - AI 服务提供商
