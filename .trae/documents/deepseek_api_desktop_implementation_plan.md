# DeepSeek API 桌面组件实现计划

> 基于《DeepSeek API 用量与余额桌面组件详细设计文档 v1.0》的完整实现计划

---

## 项目概述

实现一个跨平台的 DeepSeek API 用量与余额桌面监控组件，采用 Tauri 2.x + React + TypeScript + Rust + SQLite 技术栈。

---

## 阶段一：项目初始化与基础架构搭建

### 1.1 初始化 Tauri 2.x 项目
- 使用 `npm create tauri-app@latest` 创建项目骨架
- 配置前端：React 18 + TypeScript + Vite
- 配置后端：Rust + Tauri 2.x
- 配置开发环境（热重载、调试）

### 1.2 目录结构规划
```
deepseek_api_desktop/
├── src/                          # 前端源码
│   ├── components/               # 通用组件
│   ├── pages/                    # 页面
│   ├── hooks/                    # 自定义 Hooks
│   ├── stores/                   # 状态管理 (Zustand)
│   ├── services/                 # API 调用层
│   ├── types/                    # TypeScript 类型定义
│   └── utils/                    # 工具函数
├── src-tauri/                    # Tauri/Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── commands/             # Tauri Commands
│   │   ├── services/             # 核心服务
│   │   ├── models/               # 数据模型
│   │   ├── db/                   # 数据库相关
│   │   ├── proxy/                # 本地代理服务
│   │   ├── keychain/             # 系统钥匙串封装
│   │   └── alerts/               # 告警引擎
│   └── Cargo.toml
├── src-tauri/migrations/         # 数据库迁移脚本
└── docs/                         # 文档
```

### 1.3 依赖安装
- 前端：React Router、Zustand、Recharts、Tailwind CSS、date-fns
- 后端：sqlx、tokio、axum、reqwest、serde、keyring、notify-rust

---

## 阶段二：数据库设计与初始化

### 2.1 创建数据库迁移脚本
按设计文档第 11 节，创建以下表的迁移：
1. `api_keys` — API Key 元信息
2. `balance_snapshots` — 余额快照
3. `request_logs` — 请求日志
4. `daily_usage` — 日用量聚合（物化表）
5. `price_rules` — 价格规则
6. `app_settings` — 应用配置
7. `alert_events` — 告警事件

### 2.2 集成 sqlx
- 配置 SQLite 连接池
- 实现迁移执行逻辑
- 编写数据库访问层 (Repository Pattern)

### 2.3 初始化默认数据
- 插入默认 `app_settings`
- 插入默认 `price_rules`（DeepSeek 模型价格）

---

## 阶段三：核心服务层实现（Rust 后端）

### 3.1 配置管理服务
- 读取/写入 `app_settings`
- 支持默认值回退
- 配置变更通知机制

### 3.2 系统钥匙串封装
- 实现 `KeychainService` trait
- Windows：Credential Manager
- macOS：Keychain Services
- Linux：Secret Service / libsecret
- API Key 的保存、读取、删除、列出别名

### 3.3 API Key 管理服务
- 保存 Key：写入钥匙串 + 记录元信息到 SQLite
- 读取 Key：从钥匙串读取（仅后端）
- 删除 Key：清理钥匙串 + 数据库标记
- 脱敏显示：`sk-********************abcd`
- 指纹生成：`first_12_chars(sha256(api_key))`

### 3.4 DeepSeek API 客户端
- 封装 HTTP 客户端（reqwest）
- 实现 `GET /user/balance`
- 错误处理：401/403/429/5xx/网络失败
- 响应解析与模型映射

### 3.5 余额轮询器 (Balance Poller)
- 定时任务（默认 60 秒，可配置）
- 指数退避重试策略（最大 5 分钟）
- 窗口隐藏时低频刷新
- 写入 `balance_snapshots`
- 触发低余额告警

### 3.6 用量聚合器 (Usage Aggregator)
- 写入 `request_logs`
- 计算 `daily_usage` 物化表
- 费用估算（Decimal 计算）
- 按模型/来源/时间范围聚合查询

### 3.7 告警引擎 (Alert Engine)
- 余额低于阈值告警
- 近 1 小时消耗超限告警
- 单次请求 token 过大告警
- API 错误码告警（401/429/503）
- 代理长时间无 usage 数据告警
- 系统通知（notify-rust）

---

## 阶段四：本地代理服务实现

### 4.1 HTTP 代理服务器
- 基于 Axum 实现
- 默认监听 `127.0.0.1:8787`
- 端口占用自动切换（8787 → 8788 → 8789）
- 连接数限制（默认 32 并发）
- Body 大小限制（默认 20 MB）

### 4.2 路由实现
- `POST /chat/completions`
- `POST /v1/chat/completions`
- `GET /models`
- `GET /v1/models`
- `GET /user/balance`
- 路径映射到 DeepSeek 官方端点

### 4.3 非流式请求处理
- 透传请求到 DeepSeek
- 捕获响应中的 `usage` 字段
- 异步写入 `request_logs`
- 原样返回响应

### 4.4 流式请求处理
- 注入 `stream_options.include_usage = true`
- SSE 逐行解析 + 逐行转发
- 捕获最终 usage chunk
- JSON 解析失败记录 warning，不中断链路
- 未捕获 usage 时写入 `usage_missing` 记录

### 4.5 请求来源识别
- 优先级：手动分配 `source_name` > `User-Agent` > `X-Client-Name` > `unknown`
- 记录到 `request_logs.source_name`

### 4.6 代理鉴权（可选）
- `X-Local-Proxy-Token` 验证
- 支持开启/关闭

---

## 阶段五：前端 UI 实现

### 5.1 全局布局与导航
- 主窗口布局
- 系统托盘集成
- 托盘菜单（显示余额、打开主窗口、退出）
- 页面导航：Dashboard / Usage / Models / Keys / Proxy / Alerts / Data

### 5.2 Dashboard 首页
- 余额卡片（总余额、赠金、充值、可用状态）
- 今日统计卡片（请求数、Tokens、预估费用、最近 1 小时）
- 最近刷新时间
- 快捷操作按钮（打开代理设置、手动刷新、导出 CSV）
- 状态指示器（正常/警告/错误/离线）

### 5.3 用量明细页 (Usage)
- 请求日志表格
- 字段：时间、来源、模型、类型、输入/输出/总 tokens、费用、状态、耗时
- 分页与筛选
- 时间范围选择

### 5.4 模型统计页 (Models)
- 按模型聚合表格
- 请求数、tokens、费用汇总
- 费用占比饼图

### 5.5 API Key 管理页 (Keys)
- Key 列表（别名、指纹、状态）
- 新增/编辑/删除 Key
- 脱敏显示
- 余额切换

### 5.6 代理设置页 (Proxy)
- 代理开关
- 端口配置
- Token 鉴权开关
- 流式 usage 注入开关
- 并发/Body 大小限制
- 代理状态显示
- "复制配置" 按钮

### 5.7 告警设置页 (Alerts)
- 阈值配置（余额、小时消耗、单次 token）
- 错误码通知开关
- 告警历史列表

### 5.8 数据导入导出页 (Data)
- CSV / JSON 导出
- 时间范围选择
- 官方 CSV 导入（M5）
- 数据清理策略配置

### 5.9 图表组件
- 今日每小时费用柱状图
- 最近 7 天费用折线图
- 按模型费用占比图
- 按来源请求数排行榜

---

## 阶段六：Tauri Commands 桥接

### 6.1 实现前端调用的 Rust 命令
```rust
// Dashboard
get_dashboard_summary() -> DashboardSummary
get_balance() -> BalanceSnapshot
get_usage_stats(range: TimeRange) -> UsageStats

// API Key
save_api_key(alias: String, api_key: String) -> Result<()>
list_api_keys() -> Vec<ApiKeyMeta>
delete_api_key(id: String) -> Result<()>
set_active_api_key(id: String) -> Result<()>

// Proxy
start_proxy(config: ProxyConfig) -> Result<ProxyStatus>
stop_proxy() -> Result<()>
get_proxy_status() -> ProxyStatus

// Alerts
get_alert_config() -> AlertConfig
set_alert_config(config: AlertConfig) -> Result<()>
get_alert_events() -> Vec<AlertEvent>
acknowledge_alert(id: String) -> Result<()>

// Data
export_usage(format: String, range: TimeRange) -> Result<String>
import_official_csv(path: String) -> Result<ImportReport>

// Settings
get_settings() -> AppSettings
set_settings(settings: AppSettings) -> Result<()>

// Misc
refresh_balance() -> Result<BalanceSnapshot>
get_diagnostics() -> Result<String>
```

### 6.2 事件推送
- 余额更新事件（从前端到 UI）
- 告警触发事件
- 代理状态变更事件

---

## 阶段七：安全与隐私加固

### 7.1 API Key 安全
- 验证：SQLite 无明文 Key、日志无 Key、前端无 Key
- 实现日志脱敏中间件
- 前端 DevTools 无法读取 Key

### 7.2 代理安全
- 默认仅监听 127.0.0.1
- 开启 0.0.0.0 时强制警告
- Token 鉴权支持

### 7.3 数据隐私
- 默认不保存 prompt/completion 正文
- 请求 hash 用于去重
- 诊断包脱敏导出

---

## 阶段八：测试与质量保障

### 8.1 单元测试（Rust）
- 余额响应解析
- usage 响应解析
- SSE 流式 usage 解析
- Decimal 金额计算
- Key 脱敏逻辑
- 日聚合计算
- 告警规则匹配

### 8.2 集成测试
- 代理转发非流式请求
- 代理转发流式请求
- 代理注入 `stream_options.include_usage`
- 错误码透传
- 数据库写入失败不影响主请求
- 端口占用自动切换

### 8.3 兼容性测试
- Node.js OpenAI SDK
- Python OpenAI SDK
- Claude Code
- Cherry Studio
- NextChat

### 8.4 安全测试
- API Key 不泄漏验证
- 代理默认本机限制验证
- Token 鉴权验证

---

## 阶段九：构建与发布

### 9.1 平台构建配置
- macOS：.dmg / .app
- Windows：.msi / .exe
- Linux：.AppImage / .deb

### 9.2 自动启动配置
- 登录自启动
- 启动最小化到托盘
- 代理随应用启动

### 9.3 数据目录
- macOS：`~/Library/Application Support/DeepSeekMonitor/`
- Windows：`%APPDATA%\DeepSeekMonitor\`
- Linux：`~/.config/deepseek-monitor/`

### 9.4 CI/CD 配置
- GitHub Actions 多平台构建
- 自动签名（如可能）
- Release 自动发布

---

## 里程碑与验收标准

| 里程碑 | 完成标志 |
|--------|----------|
| **M1 余额组件 MVP** | 托盘显示余额、手动刷新、低余额提醒、Key 安全存储 |
| **M2 本地 usage 统计** | 代理运行、非流式 usage 捕获、Dashboard 展示今日统计 |
| **M3 流式与第三方接入** | SSE 透传、流式 usage 捕获、兼容主流工具 |
| **M4 告警与导出** | 可配置阈值告警、系统通知、CSV/JSON 导出 |
| **M5 对账与高级统计** | 余额差额对账、按模型/来源聚合、7 天趋势图 |

---

## 风险应对

| 风险 | 应对措施 |
|------|----------|
| 官方 API 变化 | 宽松 Schema 解析、未识别字段存 raw_json、价格规则配置化 |
| usage 捕获不完整 | UI 区分本地统计与余额差额、usage 缺失提示、官方 CSV 对账 |
| 流式代理卡顿 | 转发优先、统计异步、逐行处理 |
| API Key 泄漏 | 钥匙串存储、后端持有、日志脱敏 |
| 官方账单不一致 | 明确"预估费用"标签、Decimal 计算、价格规则用户可维护 |

---

## 后续扩展（M5 之后）

- 多供应商支持（OpenAI、Anthropic、Gemini 等）
- 团队版（共享代理、成员统计、预算审批）
- 自动价格同步
- 官方 CSV 导入对账
