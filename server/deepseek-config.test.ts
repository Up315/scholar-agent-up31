import { describe, it, expect } from "vitest";

describe("DeepSeek API Configuration", () => {
  it("should have DeepSeek credentials configured if provided", () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiUrl = process.env.DEEPSEEK_API_URL;

    // 如果用户配置了 DeepSeek，验证配置
    if (apiKey) {
      expect(apiKey).toBeTruthy();
      expect(apiKey.length).toBeGreaterThan(0);
      console.log("✓ DeepSeek API Key 已配置");
    } else {
      console.log("ℹ DeepSeek API Key 未配置，将使用默认 Qwen API");
    }

    if (apiUrl) {
      expect(apiUrl).toBeTruthy();
      expect(apiUrl).toMatch(/^https?:\/\//);
      console.log("✓ DeepSeek API URL 已配置:", apiUrl);
    } else if (apiKey) {
      console.log("ℹ DeepSeek API URL 未配置，将使用默认值");
    }
  });

  it("should validate that if DEEPSEEK_API_KEY is set, DEEPSEEK_API_URL should also be set", () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiUrl = process.env.DEEPSEEK_API_URL;

    if (apiKey) {
      expect(apiUrl).toBeTruthy();
      expect(apiUrl).toMatch(/^https?:\/\//);
    }
  });

  it("should provide guidance for DeepSeek configuration", () => {
    const hasDeepSeekConfig = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_URL;

    if (!hasDeepSeekConfig) {
      console.log("\n📝 DeepSeek 配置指南：");
      console.log("1. 访问 https://platform.deepseek.com");
      console.log("2. 获取你的 API Key");
      console.log("3. 在管理界面中填写以下信息：");
      console.log("   - DEEPSEEK_API_KEY: 你的 API Key");
      console.log("   - DEEPSEEK_API_URL: https://api.deepseek.com (或你的自定义 URL)");
      console.log("4. 保存后，系统将自动使用 DeepSeek API\n");
    } else {
      console.log("\n✓ DeepSeek API 已成功配置！");
      console.log("系统将使用 DeepSeek 作为 AI 模型提供者。\n");
    }
  });
});
