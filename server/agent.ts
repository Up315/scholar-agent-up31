/**
 * AI Agent Implementation using LangChain ReAct Pattern
 * Supports both Qwen and DeepSeek LLMs
 */

import { ChatOpenAI } from "@langchain/openai";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { agentTools } from "./agent-tools";

let llm: ChatOpenAI | null = null;

const SYSTEM_PROMPT = `你是一位贴心、温暖的私人生活助理。你的回答要像朋友聊天一样自然、有温度。

## 核心原则

1. **像朋友一样说话**：不要用生硬的"官方腔"，要用口语化、亲切的表达方式。

2. **天气查询回复规则**（非常重要）：

   当收到天气数据后，你必须根据数据主动给出生活建议：

   **温差提醒**：
   - 如果最高温和最低温差值超过 10°C，必须提醒："早晚温差比较大，记得适时增减衣物哦。"

   **防晒提醒**：
   - 如果天气是"晴"或"多云"，必须提醒："紫外线比较强，出门记得涂防晒或戴帽子。"

   **带伞提醒**：
   - 如果天气包含"雨"字，必须提醒："今天有雨，出门别忘了带把伞。"
   - 如果是小雨，可以说："可能会下小雨，带把伞以防万一。"

   **穿衣建议**（根据当前温度或平均温度）：
   - ≤0°C："天气很冷，一定要穿羽绒服或棉衣，注意保暖。"
   - 1-10°C："气温较低，建议穿厚外套、毛衣或羽绒服。"
   - 11-20°C："天气微凉，适合穿风衣、薄外套或长袖。"
   - 21-28°C："气温舒适，穿短袖、薄衫就可以了。"
   - >28°C："天气比较热，穿轻薄透气的衣服，注意防暑。"

   **雾/霾提醒**：
   - 如果天气包含"雾"或"霾"，必须提醒："能见度比较低，开车或出行要注意安全。"

   **雪天提醒**：
   - 如果天气包含"雪"，必须提醒："路面可能结冰，走路开车都要小心。"

3. **回复格式示例**：

   ❌ 错误示例（不要这样回复）：
   "北京今天天气晴，最高25°C，最低15°C，温差10°C"

   ✅ 正确示例（要这样回复）：
   "北京今天天气不错，晴朗的一天！最高25度，最低15度。早晚温差有点大，记得适时增减衣物哦。紫外线比较强，出门记得涂防晒或戴帽子。现在这个温度穿件薄外套刚刚好。"

4. **数学计算**：清晰展示结果，可以适当解释。

5. **时间查询**：准确告知，可以补充一些贴心提醒。

6. **如果用户问题模糊**：友好地询问澄清，比如"你想查哪个城市的天气呀？"

## 排版格式要求
- 紧凑排版：段落之间只保留一个换行，不要留空行
- 列表紧凑：列表项之间不要插入空行，保持紧凑
- 禁止连续换行：输出中不应出现连续两个换行符
- 整体风格：内容紧凑、易读、不松散

## 重要提醒
- 永远不要直接展示原始数据标签（如"温差: 10°C"）
- 永远不要像念报表一样回答问题
- 每次回复都要经过思考，给出有温度、有价值的建议
- 用中文回复`;

/**
 * Initialize the LLM
 * Supports both Qwen (default) and DeepSeek
 */
function initializeLLM(): ChatOpenAI {
  if (llm) {
    return llm;
  }

  // 检查是否使用 DeepSeek API
  const useDeepSeek = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_URL;

  if (useDeepSeek) {
    // DeepSeek 配置
    llm = new ChatOpenAI({
      model: "deepseek-chat",
      temperature: 0.7,
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      configuration: {
        baseURL: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com",
      },
    });
    console.log("[Agent] Using DeepSeek API");
  } else {
    // Qwen 配置（默认）
    llm = new ChatOpenAI({
      model: "qwen-plus",
      temperature: 0.7,
      apiKey: process.env.BUILT_IN_FORGE_API_KEY || "",
      configuration: {
        baseURL: process.env.BUILT_IN_FORGE_API_URL || "",
      },
    });
    console.log("[Agent] Using Qwen API");
  }

  return llm;
}

/**
 * Type for tool call information
 */
export interface ToolCall {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput: string;
}

/**
 * Execute agent with conversation history
 * Returns the final response and any tool calls made
 */
export async function executeAgent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<{
  response: string;
  toolCalls: ToolCall[];
  intermediateSteps: Array<{ tool: string; toolInput: Record<string, unknown>; observation: string }>;
}> {
  const model = initializeLLM();

  const messages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)];
  
  for (const msg of conversationHistory) {
    if (msg.role === "user") {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new AIMessage(msg.content));
    }
  }

  messages.push(new HumanMessage(userMessage));

  const toolCalls: ToolCall[] = [];
  const intermediateSteps: Array<{ tool: string; toolInput: Record<string, unknown>; observation: string }> = [];

  try {
    const modelWithTools = model.bindTools(agentTools);

    let response = await modelWithTools.invoke(messages);
    let maxIterations = 5;
    let iteration = 0;

    while (response.tool_calls && Array.isArray(response.tool_calls) && response.tool_calls.length > 0 && iteration < maxIterations) {
      iteration++;
      
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.name;
        const toolInput = toolCall.args as Record<string, unknown>;
        const tool = agentTools.find((t) => t.name === toolName);

        if (tool) {
          try {
            const toolOutput = await (tool as any).invoke(toolInput);
            toolCalls.push({
              toolName,
              toolInput,
              toolOutput: String(toolOutput),
            });

            intermediateSteps.push({
              tool: toolName,
              toolInput,
              observation: String(toolOutput),
            });

            messages.push(new AIMessage(JSON.stringify({ tool_call: { name: toolName, args: toolInput } })));
            messages.push(new HumanMessage(`工具 ${toolName} 的执行结果是：\n${toolOutput}\n\n请根据这个结果给用户一个友好、有帮助的回复。`));
          } catch (toolError) {
            const errorMsg = toolError instanceof Error ? toolError.message : "工具执行失败";
            toolCalls.push({
              toolName,
              toolInput,
              toolOutput: `错误: ${errorMsg}`,
            });
            messages.push(new HumanMessage(`工具 ${toolName} 执行出错：${errorMsg}`));
          }
        }
      }

      response = await modelWithTools.invoke(messages);
    }

    const responseContent = response.content || "";

    return {
      response: String(responseContent),
      toolCalls,
      intermediateSteps,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error("[Agent] 错误:", errorMessage);

    return {
      response: `我遇到了一个错误: ${errorMessage}。请重试。`,
      toolCalls: [],
      intermediateSteps: [],
    };
  }
}
