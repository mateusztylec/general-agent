import { db } from '@general-agent/database/client';
import * as schema from '@general-agent/database/schema';
import {
  activateChatSession,
  getChatSessionByIdAndUser,
} from '@general-agent/database/queries/chat-sessions';
import { and, eq } from 'drizzle-orm';
import { parseAgentConfig } from '@general-agent/agent/config-types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { startAgentChatSession } from '@/lib/agent/agent-spawner';

export async function POST(
  _request: Request,
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
    const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
    if (!chat) {
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (chat.status === 'active' && chat.sandboxId && chat.opencodeSessionId && chat.url && chat.token) {
      return new Response(
        JSON.stringify({ status: 'active' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
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
    const started = await startAgentChatSession(config, {
      userId: session.user.id,
    });

    await activateChatSession(db, {
      chatId,
      userId: session.user.id,
      sandboxId: started.sandboxId,
      opencodeSessionId: started.opencodeSessionId,
      url: started.url,
      token: started.token,
    });

    return new Response(
      JSON.stringify({ status: 'active' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Start chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
