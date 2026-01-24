import { convertToModelMessages, streamText } from 'ai';
import { anthropic } from '@/lib/integrations/ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@general-agent/database/client';
import * as schema from '@general-agent/database/schema';
import { eq, and } from 'drizzle-orm';
import { spawnSubagent } from '@/lib/agent/subagent-spawner';
import { parseAgentConfig } from '@/lib/config/agent-config-types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id: agentId } = await params;
    const { messages } = await request.json();
    const modelMessages = await convertToModelMessages(messages ?? []);

    // Load agent config from DB and verify ownership
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.id, agentId),
          eq(schema.agents.userId, session.user.id)
        )
      )
      .limit(1);

    if (!agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract config
    const config = parseAgentConfig(agent.config);
    const systemPrompt =
      config.mainAgent.systemPrompt || 'You are a helpful AI assistant.';

    // Stream response with tool calling
    const result = streamText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: systemPrompt,
      messages: modelMessages,
      experimental_telemetry: {
        isEnabled: true,
      },
      tools: {
        spawnSubagent: {
          description: 'Spawn a subagent on E2B sandbox to execute OpenCode tasks',
          inputSchema: z.object({
            task: z.string().describe('The task for the subagent to perform'),
            systemPrompt: z.string().optional().describe('Optional system prompt for the subagent'),
          }),
          execute: async (
            { task, systemPrompt: subSystemPrompt },
            options?: { toolCallId?: string }
          ) => {
            console.log('Spawning subagent:', { task, systemPrompt: subSystemPrompt, toolCallIdFromOptions: options?.toolCallId });

            // Get first subagent config from agent config
            const subagents = config.subagents || [];
            if (subagents.length === 0) {
              throw new Error('No subagents configured for this agent');
            }

            const subagentBase = subagents[0]; // Use first subagent for now
            const subagentConfig = {
              ...subagentBase,
              systemPrompt: subSystemPrompt ?? subagentBase.systemPrompt,
            };

            // Spawn subagent on E2B
            const toolCallId = options?.toolCallId ?? crypto.randomUUID();
            console.log('Using toolCallId:', { toolCallId, fromOptions: !!options?.toolCallId });
            const result = await spawnSubagent(subagentConfig, task, toolCallId);

            return {
              status: 'success',
              sandboxId: result.sandboxId,
              sessionId: result.sessionId,
              url: result.url,
              token: result.token,
              output: result.output,
            };
          },
        },
      },
      onFinish: (result) => {
        console.log('Chat finished:', {
          agentId,
          usage: result.usage,
          finishReason: result.finishReason,
        });
      },
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
