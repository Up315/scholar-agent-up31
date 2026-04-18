/**
 * Chat Router - tRPC procedures for chat functionality
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { 
  getOrCreateConversation, 
  getConversationMessages, 
  addMessage, 
  getUserConversations,
  updateConversationTitle,
  deleteConversation,
  createNewConversation
} from "../db";
import { executeAgent } from "../agent";
import { executeAutonomousAgent } from "../autonomous-agent";
import type { Message } from "../../drizzle/schema";

export const chatRouter = router({
  /**
   * Send a message and get AI response (standard mode)
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().optional(),
        message: z.string().min(1),
        autonomousMode: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      let conversation = await getOrCreateConversation(userId, input.conversationId);
      if (!conversation) {
        throw new Error("Failed to create conversation");
      }

      const conversationId = conversation.id;

      if (!input.conversationId && conversation.title === "New Conversation") {
        const title = input.message.slice(0, 30) + (input.message.length > 30 ? "..." : "");
        await updateConversationTitle(conversationId, title);
      }

      await addMessage(conversationId, "user", input.message);

      const history = await getConversationMessages(conversationId);

      const conversationHistory = history.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (input.autonomousMode) {
        const result = await executeAutonomousAgent(input.message, conversationHistory);
        
        await addMessage(conversationId, "assistant", result.finalResponse);

        const toolCalls = result.completedActions.map((action) => ({
          toolName: action.tool,
          toolInput: action.input,
          toolOutput: action.output,
        }));

        for (const action of result.completedActions) {
          await addMessage(
            conversationId,
            "tool",
            action.output,
            action.tool,
            JSON.stringify(action.input),
            action.output
          );
        }

        return {
          conversationId,
          response: result.finalResponse,
          toolCalls,
          intermediateSteps: result.steps.map((step) => ({
            tool: step.tool,
            toolInput: step.toolInput,
            observation: step.result,
          })),
          autonomousResult: {
            success: result.success,
            goal: result.goal,
            stepsCompleted: result.steps.filter((s) => s.status === "completed").length,
            totalSteps: result.steps.length,
          },
        };
      }

      const result = await executeAgent(input.message, conversationHistory);

      await addMessage(conversationId, "assistant", result.response);

      for (const toolCall of result.toolCalls) {
        await addMessage(
          conversationId,
          "tool",
          toolCall.toolOutput,
          toolCall.toolName,
          JSON.stringify(toolCall.toolInput),
          toolCall.toolOutput
        );
      }

      return {
        conversationId,
        response: result.response,
        toolCalls: result.toolCalls,
        intermediateSteps: result.intermediateSteps,
      };
    }),

  /**
   * Get conversation history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const conversation = await getOrCreateConversation(userId, input.conversationId);
      if (!conversation || conversation.userId !== userId) {
        throw new Error("Conversation not found or unauthorized");
      }

      const messages = await getConversationMessages(input.conversationId);
      return messages;
    }),

  /**
   * Get all conversations for current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const conversations = await getUserConversations(userId);
    return conversations;
  }),

  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const conversation = await createNewConversation(userId, input.title);
      return conversation;
    }),

  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const conversations = await getUserConversations(userId);
      const conversation = conversations.find(c => c.id === input.conversationId);
      
      if (!conversation) {
        throw new Error("Conversation not found or unauthorized");
      }

      await deleteConversation(input.conversationId);
      return { success: true };
    }),

  /**
   * Update conversation title
   */
  updateTitle: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        title: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const conversations = await getUserConversations(userId);
      const conversation = conversations.find(c => c.id === input.conversationId);
      
      if (!conversation) {
        throw new Error("Conversation not found or unauthorized");
      }

      await updateConversationTitle(input.conversationId, input.title);
      return { success: true };
    }),

  /**
   * Clear conversation history
   */
  clearHistory: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const conversation = await getOrCreateConversation(userId, input.conversationId);
      if (!conversation || conversation.userId !== userId) {
        throw new Error("Conversation not found or unauthorized");
      }

      await (await import("../db")).clearConversationMessages(input.conversationId);

      return { success: true };
    }),
});
