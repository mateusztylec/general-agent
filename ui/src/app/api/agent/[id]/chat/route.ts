import { convertToModelMessages, streamText } from 'ai';
import { anthropic } from '@/lib/integrations/ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';
import { spawnSubagent } from '@/lib/agent/subagent-spawner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { messages } = await request.json();
    const modelMessages = await convertToModelMessages(messages ?? []);

    // Load agent config from DB
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.id, agentId))
      .limit(1);

    if (!agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract config
    const config = agent.config as any;
    const systemPrompt = config?.systemPrompt || 'You are a helpful AI assistant.';

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
          execute: async ({ task, systemPrompt: subSystemPrompt }) => {
            console.log('Spawning subagent:', { task, systemPrompt: subSystemPrompt });

            // Get first subagent config from agent config
            const subagents = config?.subagents || [];
            if (subagents.length === 0) {
              throw new Error('No subagents configured for this agent');
            }

            const subagentConfig = subagents[0]; // Use first subagent for now

            // Override system prompt if provided
            if (subSystemPrompt) {
              subagentConfig.systemPrompt = subSystemPrompt;
            }

            // Spawn subagent on E2B
            const result = await spawnSubagent(subagentConfig, task);

            return {
              status: 'success',
              sandboxId: result.sandboxId,
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
