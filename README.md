# Scholar Agent - AI 学术科研助手

一个基于 LangChain ReAct Agent 的智能对话平台，支持天气查询、数学计算、备忘录等多种工具调用。

## 🌟 功能特性

- **智能对话**：基于 DeepSeek API 的 AI 对话能力
- **工具调用**：支持天气查询、数学计算、时间查询、备忘录、提醒事项
- **用户认证**：注册、登录、会话管理
- **对话历史**：保存和管理对话记录
- **响应式设计**：支持桌面和移动端
- **暗色模式**：支持亮色/暗色主题切换

## 🛠️ 技术栈

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **tRPC** - 类型安全 API
- **TanStack Query** - 数据请求

### 后端
- **Hono** - 轻量级 Web 框架
- **LangChain** - AI Agent 框架
- **tRPC** - 类型安全 API

### 部署
- **Cloudflare Workers** - 边缘计算平台
- **Cloudflare Pages** - 静态资源托管

## 📦 安装

```bash
# 克隆项目
git clone https://github.com/your-username/scholar-agent.git
cd scholar-agent

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key
```

## ⚙️ 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | ✅ |
| `AMAP_API_KEY` | 高德地图 API 密钥（天气查询） | ❌ |
| `JWT_SECRET` | JWT 签名密钥 | ✅ |

## 🚀 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

## 🌐 部署到 Cloudflare

### 1. 构建项目

```bash
npm run build
```

### 2. 部署

```bash
# 登录 Cloudflare
npx wrangler login

# 部署
npx wrangler deploy
```

### 3. 配置环境变量

在 Cloudflare Dashboard 中配置：
- Workers → scholar-agent → Settings → Variables

添加以下变量：
- `DEEPSEEK_API_KEY`
- `AMAP_API_KEY`
- `JWT_SECRET`

## 📁 项目结构

```
scholar-agent/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── pages/          # 页面
│   │   ├── hooks/          # 自定义 Hooks
│   │   └── lib/            # 工具函数
│   └── index.html
├── server/                 # 后端代码
│   ├── _core/              # 核心模块
│   ├── routers/            # tRPC 路由
│   ├── agent.ts            # AI Agent 实现
│   └── agent-tools.ts      # Agent 工具定义
├── src/
│   └── worker.ts           # Cloudflare Workers 入口
├── shared/                 # 共享代码
├── wrangler.toml           # Cloudflare 配置
└── vite.config.ts          # Vite 配置
```

## 🤖 AI Agent 工具

| 工具 | 功能 |
|------|------|
| `weather_query` | 查询城市天气 |
| `calculator` | 数学计算 |
| `get_current_time` | 获取当前时间 |
| `create_memo` | 创建备忘录 |
| `set_reminder` | 设置提醒 |

## 🔒 安全特性

- ✅ CORS 限制
- ✅ API 速率限制（30次/分钟/IP）
- ✅ 密码 SHA-256 加密存储
- ✅ 登录失败锁定（5次失败锁定15分钟）
- ✅ 安全 Headers（X-Frame-Options, XSS-Protection）
- ✅ 错误信息脱敏
- ✅ 输入验证

## 📝 License

MIT

## 👨‍💻 Author

Your Name - [GitHub](https://github.com/your-username)
