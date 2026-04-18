/**
 * Autonomous Agent - 自主代理系统
 * 支持任务规划、多步骤执行、错误恢复
 */

import { ChatOpenAI } from "@langchain/openai";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { agentTools } from "./agent-tools";

interface TaskStep {
  id: string;
  description: string;
  tool?: string;
  toolInput?: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  retryCount: number;
}

interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  currentStepIndex: number;
  status: "planning" | "executing" | "completed" | "failed";
}

interface AgentState {
  conversationHistory: BaseMessage[];
  currentPlan: TaskPlan | null;
  completedActions: Array<{
    tool: string;
    input: Record<string, unknown>;
    output: string;
    success: boolean;
  }>;
  retryAttempts: number;
  maxRetries: number;
}

const PLANNER_PROMPT = `你是一个智能任务规划专家。当用户给你一个任务时，你需要：

1. 分析任务目标
2. 将任务分解为必要的执行步骤
3. 每个步骤应该明确说明要使用什么工具

可用的工具：
- get_current_time: 获取当前时间或查询世界各地时间
- weather_query: 查询中国城市天气
- calculator: 执行数学计算
- create_memo: 创建备忘录/记事（仅当用户明确要求"记下来"、"保存"、"备忘"时才使用）
- set_reminder: 设置提醒事项（仅当用户提供了明确的时间时才使用，如"明天早上8点"、"下午3点"）
- generate_response: 当任务需要AI生成内容（如规划行程、给出建议、分析问题）但没有对应工具时使用

【重要规则】：
1. 复合任务必须完整执行：如果用户输入包含多个意图（使用"然后"、"并且"、"接着"、"再"连接），你必须为每个意图创建步骤，直到所有任务都完成
2. 简单查询直接执行：如果用户只是问天气、时间、做计算，直接调用对应工具即可
3. 无工具任务使用generate_response：对于"规划行程"、"给出建议"、"分析问题"等没有对应工具的任务，使用generate_response工具
4. 按需调用备忘录：不要默认调用 create_memo，只有用户明确要求记录时才调用
5. 时间参数检查：调用 set_reminder 前，必须确认用户提供了具体时间

【复合任务示例】：
用户："查北京天气，然后规划行程"
正确计划：
{
  "goal": "查询北京天气并规划出行行程",
  "steps": [
    {"description": "查询北京天气", "tool": "weather_query", "toolInput": {"city": "北京"}},
    {"description": "根据天气规划出行行程", "tool": "generate_response", "toolInput": {"task": "根据北京天气规划出行行程"}}
  ]
}

请以 JSON 格式返回任务计划：
{
  "goal": "任务目标描述",
  "steps": [
    {"description": "步骤描述", "tool": "工具名称", "toolInput": {"参数": "值"}},
    ...
  ]
}

如果任务无法用现有工具完成，或缺少必要参数，返回：
{
  "goal": "任务目标描述",
  "steps": [],
  "reason": "无法完成的原因或缺少的参数",
  "suggestion": "给用户的建议"
}`;

const EXECUTOR_PROMPT = `你是一个任务执行专家。根据任务计划执行具体步骤。

当前任务计划：
{plan}

已完成步骤：
{completedSteps}

当前需要执行的步骤：
{currentStep}

【重要规则】：
1. 如果调用 set_reminder，必须确保有明确的 remindAt 参数（如"30分钟后"、"明天早上9点"）
2. 如果没有时间参数，返回 {"skip": true, "reason": "缺少时间参数"}
3. 工具参数必须完整且有效

请根据步骤描述和工具信息，返回执行该步骤需要的参数：
{
  "toolInput": {"参数": "值"},
  "reasoning": "为什么这样执行"
}`;

const RECOVERY_PROMPT = `你是一个错误恢复专家。当任务执行失败时，你需要分析错误并尝试恢复。

原始任务：
{goal}

失败的步骤：
{failedStep}

错误信息：
{error}

已完成的步骤：
{completedSteps}

【重要规则】：
1. 如果是缺少参数导致的错误（如缺少时间），不要重试，而是引导用户提供信息
2. 如果是工具不支持的操作，建议替代方案或跳过该步骤

请分析错误原因并提供恢复方案：
{
  "shouldRetry": true/false,
  "alternativeApproach": "替代方案描述",
  "newStep": {"description": "新步骤", "tool": "工具名", "toolInput": {...}},
  "userGuidance": "需要向用户询问的信息（如缺少时间参数时）"
}

如果无法恢复或需要用户提供更多信息，返回：
{
  "shouldRetry": false,
  "reason": "无法恢复的原因",
  "suggestion": "给用户的建议（如：需要我帮您设置提醒吗？请告诉我具体时间）"
}`;

let llm: ChatOpenAI | null = null;

function initializeLLM(): ChatOpenAI {
  if (llm) return llm;

  const useDeepSeek = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_URL;

  if (useDeepSeek) {
    llm = new ChatOpenAI({
      model: "deepseek-chat",
      temperature: 0.3,
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      configuration: {
        baseURL: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com",
      },
    });
    console.log("[AutonomousAgent] Using DeepSeek API");
  } else {
    llm = new ChatOpenAI({
      model: "qwen-plus",
      temperature: 0.3,
      apiKey: process.env.BUILT_IN_FORGE_API_KEY || "",
      configuration: {
        baseURL: process.env.BUILT_IN_FORGE_API_URL || "",
      },
    });
    console.log("[AutonomousAgent] Using Qwen API");
  }

  return llm;
}

function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function planTask(userMessage: string, state: AgentState): Promise<TaskPlan | null> {
  const model = initializeLLM();
  
  const messages: BaseMessage[] = [
    new SystemMessage(PLANNER_PROMPT),
    new HumanMessage(userMessage),
  ];

  try {
    const response = await model.invoke(messages);
    const content = String(response.content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AutonomousAgent] No JSON found in planner response");
      return null;
    }

    const plan = JSON.parse(jsonMatch[0]);
    
    return {
      goal: plan.goal || userMessage,
      steps: (plan.steps || []).map((s: any) => ({
        id: generateStepId(),
        description: s.description || "",
        tool: s.tool,
        toolInput: s.toolInput || {},
        status: "pending" as const,
        retryCount: 0,
      })),
      currentStepIndex: 0,
      status: "planning" as const,
    };
  } catch (error) {
    console.error("[AutonomousAgent] Planning error:", error);
    return null;
  }
}

async function executeStep(
  step: TaskStep,
  state: AgentState
): Promise<{ success: boolean; output: string }> {
  if (!step.tool) {
    return { success: false, output: "步骤没有指定工具" };
  }

  const tool = agentTools.find((t) => t.name === step.tool);
  if (!tool) {
    return { success: false, output: `工具 ${step.tool} 不存在` };
  }

  try {
    const output = await (tool as any).invoke(step.toolInput || {});
    return { success: true, output: String(output) };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "工具执行失败";
    return { success: false, output: errorMsg };
  }
}

async function recoverFromError(
  step: TaskStep,
  error: string,
  state: AgentState
): Promise<{ shouldRetry: boolean; newStep?: TaskStep; suggestion?: string }> {
  const model = initializeLLM();
  
  const completedStepsStr = state.completedActions
    .map((a) => `- ${a.tool}: ${JSON.stringify(a.input)} -> ${a.output}`)
    .join("\n");

  const prompt = RECOVERY_PROMPT
    .replace("{goal}", state.currentPlan?.goal || "")
    .replace("{failedStep}", `${step.description} (${step.tool})`)
    .replace("{error}", error)
    .replace("{completedSteps}", completedStepsStr || "无");

  try {
    const response = await model.invoke([new HumanMessage(prompt)]);
    const content = String(response.content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { shouldRetry: false, suggestion: "无法解析恢复方案" };
    }

    const recovery = JSON.parse(jsonMatch[0]);
    
    if (recovery.newStep) {
      return {
        shouldRetry: recovery.shouldRetry ?? true,
        newStep: {
          id: generateStepId(),
          description: recovery.newStep.description,
          tool: recovery.newStep.tool,
          toolInput: recovery.newStep.toolInput || {},
          status: "pending" as const,
          retryCount: step.retryCount + 1,
        },
        suggestion: recovery.suggestion,
      };
    }

    return {
      shouldRetry: recovery.shouldRetry ?? false,
      suggestion: recovery.suggestion || recovery.reason,
    };
  } catch (error) {
    console.error("[AutonomousAgent] Recovery error:", error);
    return { shouldRetry: false, suggestion: "恢复分析失败" };
  }
}

export interface AutonomousAgentResult {
  success: boolean;
  goal: string;
  steps: TaskStep[];
  completedActions: Array<{
    tool: string;
    input: Record<string, unknown>;
    output: string;
    success: boolean;
  }>;
  finalResponse: string;
}

export async function executeAutonomousAgent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<AutonomousAgentResult> {
  const model = initializeLLM();
  
  const state: AgentState = {
    conversationHistory: [
      new SystemMessage("你是一个智能助手，能够自主完成复杂任务。"),
      ...conversationHistory.map((msg) =>
        msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
    ],
    currentPlan: null,
    completedActions: [],
    retryAttempts: 0,
    maxRetries: 3,
  };

  console.log(`[AutonomousAgent] Starting task: ${userMessage}`);

  const plan = await planTask(userMessage, state);
  
  if (!plan) {
    return {
      success: false,
      goal: userMessage,
      steps: [],
      completedActions: [],
      finalResponse: "抱歉，我无法理解这个任务。请尝试更清晰地描述你的需求。",
    };
  }

  if (plan.steps.length === 0) {
    const response = await model.invoke([
      ...state.conversationHistory,
      new HumanMessage(userMessage),
    ]);
    
    return {
      success: true,
      goal: plan.goal,
      steps: [],
      completedActions: [],
      finalResponse: String(response.content),
    };
  }

  console.log(`[AutonomousAgent] Plan created with ${plan.steps.length} steps`);
  state.currentPlan = plan;
  plan.status = "executing";

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    step.status = "running";
    plan.currentStepIndex = i;

    console.log(`[AutonomousAgent] Executing step ${i + 1}: ${step.description}`);

    let result = await executeStep(step, state);

    if (result.success) {
      step.status = "completed";
      step.result = result.output;
      
      state.completedActions.push({
        tool: step.tool!,
        input: step.toolInput || {},
        output: result.output,
        success: true,
      });
      
      console.log(`[AutonomousAgent] Step ${i + 1} completed: ${result.output}`);
    } else {
      console.log(`[AutonomousAgent] Step ${i + 1} failed: ${result.output}`);
      
      const isMissingParam = result.output.includes("缺少") || 
                             result.output.includes("需要提供") ||
                             result.output.includes("无效") ||
                             result.output.includes("错误：");
      
      if (isMissingParam) {
        const completedResults = state.completedActions
          .filter(a => a.success)
          .map(a => a.output)
          .join("\n");
        
        const guidancePrompt = `你是一位贴心、温暖的私人生活助理。

任务：${plan.goal}

已完成的部分：
${completedResults || "无"}

遇到的问题：
${result.output}

【回复要求】：
1. 像朋友一样说话，用口语化、亲切的表达方式
2. 说明已经完成的部分
3. 友好地询问用户是否需要进一步帮助
4. 如果是缺少时间参数，可以问"需要我帮您设置提醒吗？请告诉我具体时间"

请给用户一个友好、贴心的回复：`;

        const guidanceResponse = await model.invoke([
          ...state.conversationHistory,
          new HumanMessage(guidancePrompt),
        ]);
        
        return {
          success: true,
          goal: plan.goal,
          steps: plan.steps,
          completedActions: state.completedActions,
          finalResponse: String(guidanceResponse.content),
        };
      }
      
      while (step.retryCount < state.maxRetries && state.retryAttempts < state.maxRetries * 2) {
        step.retryCount++;
        state.retryAttempts++;
        
        console.log(`[AutonomousAgent] Attempting recovery (retry ${step.retryCount})`);
        
        const recovery = await recoverFromError(step, result.output, state);
        
        if (!recovery.shouldRetry) {
          step.status = "failed";
          step.result = result.output;
          
          state.completedActions.push({
            tool: step.tool!,
            input: step.toolInput || {},
            output: result.output,
            success: false,
          });
          
          plan.status = "failed";
          
          return {
            success: false,
            goal: plan.goal,
            steps: plan.steps,
            completedActions: state.completedActions,
            finalResponse: recovery.suggestion || `任务执行失败：${result.output}`,
          };
        }

        if (recovery.newStep) {
          const newStep = recovery.newStep;
          result = await executeStep(newStep, state);
          
          if (result.success) {
            step.status = "completed";
            step.result = result.output;
            
            state.completedActions.push({
              tool: newStep.tool!,
              input: newStep.toolInput || {},
              output: result.output,
              success: true,
            });
            
            console.log(`[AutonomousAgent] Recovery successful: ${result.output}`);
            break;
          }
        }
      }

      if (step.status !== "completed") {
        step.status = "failed";
        step.result = result.output;
        plan.status = "failed";
        
        return {
          success: false,
          goal: plan.goal,
          steps: plan.steps,
          completedActions: state.completedActions,
          finalResponse: `任务执行失败，已尝试 ${step.retryCount} 次恢复但未成功。最后错误：${result.output}`,
        };
      }
    }
  }

  plan.status = "completed";

  const hasGenerateResponse = state.completedActions.some(a => a.tool === "generate_response");
  const toolResults = state.completedActions
    .filter(a => a.tool !== "generate_response")
    .map(a => `${a.tool}: ${a.output}`)
    .join("\n");
  const generateResponseResult = state.completedActions
    .filter(a => a.tool === "generate_response")
    .map(a => a.output)
    .join("\n");

  let finalPrompt: string;
  
  if (hasGenerateResponse && toolResults) {
    finalPrompt = `你是一位贴心、温暖的私人生活助理。请根据任务执行结果给用户一个完整、友好、有温度的回复。

任务目标：${plan.goal}

工具执行结果：
${toolResults}

AI生成的规划/建议：
${generateResponseResult}

【回复要求】：
1. 首先简要总结工具查询的结果（如天气信息）
2. 然后详细展开AI生成的规划或建议
3. 像朋友一样说话，用口语化、亲切的表达方式
4. 给出有温度、有价值的贴心建议
5. 如果是行程规划，要具体、可执行，包含时间安排

【天气相关的贴心建议】：
- 温差超过10°C：提醒"早晚温差比较大，记得适时增减衣物"
- 晴天/多云：提醒"紫外线比较强，出门记得涂防晒或戴帽子"
- 有雨：提醒"今天有雨，出门别忘了带把伞"

【排版格式要求】：
- 段落之间只保留一个换行，不要留空行
- 列表项之间不要插入空行
- 禁止连续换行

请给用户一个完整、友好、贴心的回复：`;
  } else {
    finalPrompt = `你是一位贴心、温暖的私人生活助理。请根据任务执行结果给用户一个友好、有温度的回复。

任务目标：${plan.goal}

执行结果：
${toolResults || generateResponseResult}

【回复风格】：
1. 像朋友一样说话，用口语化、亲切的表达方式
2. 不要生硬地罗列数据，要自然地融入建议
3. 给出有温度、有价值的贴心建议

【天气查询的贴心建议规则】：
- 温差超过10°C：提醒"早晚温差比较大，记得适时增减衣物"
- 晴天/多云：提醒"紫外线比较强，出门记得涂防晒或戴帽子"
- 有雨：提醒"今天有雨，出门别忘了带把伞"
- 温度≤10°C：建议穿厚外套、毛衣或羽绒服
- 温度11-20°C：适合穿风衣、薄外套或长袖
- 温度21-28°C：穿短袖、薄衫就可以了
- 温度>28°C：穿轻薄透气的衣服，注意防暑

【排版格式要求】：
- 段落之间只保留一个换行，不要留空行
- 列表项之间不要插入空行
- 禁止连续换行

请给用户一个友好、贴心的回复：`;
  }

  const finalResponse = await model.invoke([
    ...state.conversationHistory,
    new HumanMessage(finalPrompt),
  ]);

  return {
    success: true,
    goal: plan.goal,
    steps: plan.steps,
    completedActions: state.completedActions,
    finalResponse: String(finalResponse.content),
  };
}

export { TaskStep, TaskPlan, AgentState };
