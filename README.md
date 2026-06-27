# Scholar Agent - AI 智能生活助理

基于 LangChain ReAct Agent 的智能对话平台，集成天气查询、数学计算、备忘录、提醒事项等多种工具调用能力，支持自主任务规划与多步骤执行。

> **在线体验**：[https://scholar-agent.pages.dev](https://scholar-agent.pages.dev)

## 功能特性

- **智能对话**：基于 DeepSeek API 的 AI 对话，自然亲切的交互体验
- **ReAct Agent**：采用 ReAct 推理-行动模式，动态决策调用工具
- **自主任务规划**：复合任务自动分解为多步骤执行，支持错误恢复
- **工具调用**：天气查询、数学计算、时间查询、备忘录管理、提醒事项、智能建议
- **用户认证**：注册、登录、会话管理，登录失败锁定机制
- **对话历史**：保存和管理对话记录
- **响应式设计**：支持桌面和移动端
- **暗色模式**：支持亮色/暗色主题切换
- **安全合规**：API 限流、CORS 白名单、密码加密、错误脱敏

## 技术栈

### 前端
- **React 19** + **TypeScript** - UI 框架与类型安全
- **Vite** - 构建工具
- **Tailwind CSS** + **Radix UI** - 样式与组件库
- **tRPC** + **TanStack Query** - 端到端类型安全 API 与数据请求

### 后端
- **Hono** - 轻量级 Web 框架
- **LangChain** + **LangGraph** - ReAct Agent 框架
- **@langchain/openai** - DeepSeek API 接入（兼容 OpenAI 接口）
- **tRPC** - 类型安全 API 层
- **Zod** - 运行时类型校验

### 部署
- **Cloudflare Pages** - 静态资源托管与 Pages Functions 边缘计算
- **esbuild** - Functions 打包构建

## 安装

```bash
# 克隆项目
git clone https://github.com/Up315/scholar-agent-up31.git
cd scholar-agent-up31

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的 API Key
```

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥，获取地址：https://platform.deepseek.com | 是 |
| `DEEPSEEK_API_URL` | DeepSeek API 地址，默认 `https://api.deepseek.com` | 否 |
| `AMAP_API_KEY` | 高德地图 API 密钥（天气查询），获取地址：https://lbs.amap.com | 否 |
| `JWT_SECRET` | JWT 签名密钥，生产环境需设置为强随机字符串 | 是 |
| `DATABASE_URL` | 数据库连接 URL（可选，默认内存存储） | 否 |
| `NODE_ENV` | 运行环境：development / production | 否 |

完整配置参考 [.env.example](.env.example)。

## 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

## 部署到 Cloudflare Pages

### 一键部署

```bash
npm run deploy:pages
```

该命令会依次执行：清理 `dist` → Vite 构建前端 → esbuild 打包 Functions → Wrangler 部署。

### 手动步骤

```bash
# 1. 构建前端 + Functions
npm run build:cf

# 2. 部署到 Cloudflare Pages
npx wrangler pages deploy dist --project-name scholar-agent
```

### 配置环境变量

在 Cloudflare Dashboard 中配置：
- Pages → scholar-agent → Settings → Environment variables

添加以下变量：
- `DEEPSEEK_API_KEY`
- `AMAP_API_KEY`
- `JWT_SECRET`

## 项目结构

```text
scholar-agent/
├── client/                     # 前端代码
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   │   └── ui/             # Radix UI 基础组件
│   │   ├── pages/              # 页面（Chat、Home、NotFound）
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── contexts/           # React Context（主题等）
│   │   ├── _core/hooks/        # 核心 Hooks（useAuth）
│   │   └── lib/                # 工具函数与 tRPC 客户端
│   └── public/
│       └── _routes.json        # Cloudflare Pages 路由配置
├── server/                     # 后端代码
│   ├── _core/                  # 核心模块（env、sdk、trpc、llm 等）
│   ├── routers/                # tRPC 路由（chat）
│   ├── agent.ts                # ReAct Agent 实现
│   ├── autonomous-agent.ts     # 自主任务规划 Agent
│   ├── agent-tools.ts          # Agent 工具定义
│   ├── db.ts                   # 用户数据存储
│   └── storage.ts              # 文件存储
├── src/
│   └── worker.ts               # Cloudflare Pages Functions 入口
├── shared/                     # 前后端共享代码
│   ├── const.ts                # 常量定义
│   ├── types.ts                # 共享类型
│   └── _core/errors.ts         # 错误定义
├── functions/api/              # esbuild 打包输出（部署用）
├── esbuild.functions.js        # esbuild 构建脚本
├── wrangler.toml               # Cloudflare 配置
├── vite.config.ts              # Vite 构建配置
└── drizzle.config.ts           # 数据库 ORM 配置
```

## AI Agent 架构

### ReAct 模式

采用 ReAct（Reasoning + Acting）模式，Agent 在每一步动态推理并决定下一步行动，而非预先规划全部步骤。适用于需要根据工具返回结果动态决策的多工具调用场景。

### 自主任务规划

对于复合任务（如"查北京天气然后规划行程"），自主规划 Agent 会将任务分解为多个执行步骤，逐步调用工具完成，支持错误恢复和重试。

### 可用工具

| 工具 | 功能 | 说明 |
|------|------|------|
| `weather_query` | 查询城市天气 | 支持全国 300+ 城市，返回温度/天气/风力等，并主动给出穿衣/防晒/带伞建议 |
| `calculator` | 数学计算 | 支持加减乘除及括号运算，安全的表达式解析 |
| `get_current_time` | 获取当前时间 | 查询世界各时区时间 |
| `create_memo` | 备忘录管理 | 支持创建、列出、删除备忘录 |
| `set_reminder` | 设置提醒 | 设置定时提醒事项 |
| `generate_response` | 智能建议生成 | 行程规划、问题分析、建议生成等开放式任务 |

## 安全特性

| 特性 | 说明 |
|------|------|
| CORS 白名单 | 仅允许指定域名访问 API，防止未授权调用 |
| API 速率限制 | 30 次/分钟/IP，防止恶意调用消耗 Token 成本 |
| 密码加密存储 | SHA-256 + Salt，符合安全合规要求 |
| 登录失败锁定 | 5 次失败后锁定 15 分钟，防暴力破解攻击 |
| 安全 Headers | X-Frame-Options: DENY、X-Content-Type-Options: nosniff、XSS-Protection |
| 错误信息脱敏 | 不暴露内部 API Key / Token 等敏感信息 |
| 输入验证 | 用户名/密码长度限制、格式校验、类型检查 |
| Cookie 安全 | HttpOnly + Secure + SameSite=None |

## License

MIT License - 详见 [LICENSE](LICENSE) 文件

Copyright (c) 2026 王怡涵

## 作者

**王怡涵** - [GitHub](https://github.com/Up315)
