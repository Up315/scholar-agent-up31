# DeepSeek API 配置指南

## 概述

学术智能体支持使用 **DeepSeek API** 作为 AI 模型提供者。如果你配置了 DeepSeek API 密钥，系统将自动使用 DeepSeek 而不是默认的 Qwen API。

## 配置步骤

### 1. 获取 DeepSeek API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com)
2. 注册或登录你的账户
3. 进入 **API Keys** 页面
4. 创建新的 API Key 并复制

### 2. 填写 API 密钥

在 Manus 项目管理界面中，进入 **Settings** → **Secrets** 页面，填写以下两个密钥：

| 环境变量名 | 值 | 说明 |
|-----------|-----|------|
| `DEEPSEEK_API_KEY` | 你的 API Key | 从 DeepSeek 平台获取 |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com/v1` | DeepSeek 的 API 基础 URL |

### 3. 验证配置

保存后，系统会自动验证配置。你可以在以下位置查看配置状态：

- **开发服务器日志**：启动时会显示 `[Agent] Using DeepSeek API`
- **测试结果**：运行 `pnpm test` 会显示配置验证结果

## 使用说明

### 自动切换

- **如果配置了 DeepSeek**：系统将使用 DeepSeek 模型（`deepseek-chat`）
- **如果未配置 DeepSeek**：系统将使用默认的 Qwen API（`qwen-plus`）

### 模型选择

当前支持的模型：

| API 提供者 | 模型名称 | 说明 |
|-----------|---------|------|
| DeepSeek | `deepseek-chat` | DeepSeek 的主要聊天模型 |
| Qwen | `qwen-plus` | 阿里云百炼的 Qwen Plus 模型 |

## 常见问题

### Q: 如何验证 API Key 是否有效？

运行以下命令检查配置：

```bash
pnpm test -- server/deepseek-config.test.ts
```

如果输出显示 `✓ DeepSeek API 已成功配置！`，说明配置正确。

### Q: 如果我想切换回 Qwen API？

只需清除 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_API_URL` 环境变量，系统会自动使用 Qwen API。

### Q: DeepSeek API 的费用如何计算？

请访问 [DeepSeek 定价页面](https://platform.deepseek.com/pricing) 了解最新的费用信息。

### Q: 支持哪些 DeepSeek 模型？

当前代码使用 `deepseek-chat` 模型。如需使用其他模型，请修改 `server/agent.ts` 中的 `model` 字段。

## 技术细节

### 代码位置

- **配置文件**：`server/agent.ts` 中的 `initializeLLM()` 函数
- **测试文件**：`server/deepseek-config.test.ts`
- **API 路由**：`server/routers/chat.ts` 中的 `sendMessage` 接口

### 环境变量检查逻辑

```typescript
const useDeepSeek = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_URL;

if (useDeepSeek) {
  // 使用 DeepSeek API
} else {
  // 使用 Qwen API（默认）
}
```

## 支持

如有问题，请：

1. 检查 API Key 是否正确复制
2. 确认 API URL 格式正确
3. 查看开发服务器日志获取错误信息
4. 运行配置测试验证设置

---

**最后更新**：2026-04-16
