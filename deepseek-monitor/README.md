# DeepSeek Monitor

DeepSeek API 用量与余额桌面监控组件。基于 Tauri 2.x 构建的跨平台桌面应用，支持 Windows、macOS 和 Linux。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8D8?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Rust](https://img.shields.io/badge/Rust-1.77+-000000?logo=rust)

## 功能特性

- **余额监控**：定时轮询 DeepSeek API 余额，支持系统托盘实时显示
- **用量统计**：按模型 / 来源 / 时间维度聚合，本地 SQLite 持久化存储
- **本地代理**：`127.0.0.1:8787` HTTP 代理，透明转发并自动统计用量
- **API Key 管理**：系统钥匙串安全存储，前端脱敏显示
- **告警引擎**：低余额 / 高消耗 / 大额请求 / API 错误实时告警
- **数据导出**：支持 CSV / JSON 格式导出历史用量数据
- **跨平台**：支持 Windows、macOS、Linux 三大桌面平台

## 界面预览

应用主界面包含：
- **总览 (Dashboard)**：余额、今日用量、Token 构成、费用压力
- **用量 (Usage)**：历史用量趋势图表
- **模型 (Models)**：各模型调用统计
- **Key 管理 (Keys)**：API Key 的增删改查
- **代理 (Proxy)**：本地代理服务启停与状态
- **告警 (Alerts)**：告警规则配置与事件列表
- **导出 (Data)**：数据导出功能

## 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18 | 前端构建环境 |
| Rust | >= 1.77.2 | 后端编译环境（需安装 rustup） |
| npm / pnpm / yarn | 任意 | 包管理器 |

### 平台特定依赖

**Windows**: 无需额外依赖

**macOS**: 无需额外依赖

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**Linux (Fedora)**:
```bash
sudo dnf install gtk3-devel webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel
```

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
