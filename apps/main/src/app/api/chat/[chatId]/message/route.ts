import { db } from '@general-agent/database/client';
import * as schema from '@general-agent/database/schema';
import { and, eq } from 'drizzle-orm';
import { parseAgentConfig } from '@general-agent/agent/config-types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { closeChatSession, getChatSession } from '@/lib/agent/chat-session-registry';
import { sendAgentChatMessage } from '@/lib/agent/agent-spawner';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { chatId } = await params;
    const body = await request.json().catch(() => null);
    const task = typeof body?.task === 'string' ? body.task.trim() : '';
    if (!task) {
      return new Response(
        JSON.stringify({ error: 'Task is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const chat = await getChatSession(chatId, session.user.id);
    if (!chat) {
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (chat.status !== 'active' || !chat.opencodeSessionId || !chat.url || !chat.token) {
      return new Response(
        JSON.stringify({ error: 'Sandbox is not active. Start sandbox first.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.id, chat.agentId),
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

    const config = parseAgentConfig(agent.config);

    try {
      await sendAgentChatMessage(config, task, {
        opencodeSessionId: chat.opencodeSessionId,
        url: chat.url,
        token: chat.token,
      });
    } catch (error) {
      console.error('Message send failed, closing chat session:', error);
      await closeChatSession(chatId, session.user.id);
      return new Response(
        JSON.stringify({ error: 'Sandbox session closed. Start sandbox again.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Message API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
