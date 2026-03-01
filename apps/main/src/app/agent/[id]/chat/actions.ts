'use server';

import { db } from '@general-agent/database/client';
import * as schema from '@general-agent/database/schema';
import {
  createChat as createChatInDb,
  getChatSessionByIdAndUser,
  activateChatSession,
  closeChatSession,
  pauseChatSession,
  reactivateChatSession,
} from '@general-agent/database/queries/chat-sessions';
import { and, eq } from 'drizzle-orm';
import { parseAgentConfig } from '@general-agent/agent/config-types';
import { getSession } from '@/lib/auth';
import { startAgentChatSession, sendAgentChatMessage } from '@/lib/agent/agent-spawner';
import { setSandboxTimeout, killSandbox, pauseSandbox, resumeSandbox } from '@general-agent/sandbox/spawner';

const RESET_TIMEOUT_MS = 3 * 60 * 1000;

export async function createChatAction(agentId: string) {
  const session = await getSession();

  const [agent] = await db
    .select({ id: schema.agents.id })
    .from(schema.agents)
    .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, session.user.id)))
    .limit(1);

  if (!agent) throw new Error('Agent not found');

  const chat = await createChatInDb(db, { userId: session.user.id, agentId });
  return { chatId: chat.id, status: chat.status };
}

export async function startChatAction(chatId: string) {
  const session = await getSession();

  const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
  if (!chat) throw new Error('Chat not found');

  if (chat.status === 'active' && chat.sandboxId && chat.opencodeSessionId && chat.url && chat.token) {
    return { status: 'active' as const };
  }

  const [agent] = await db
    .select()
    .from(schema.agents)
    .where(and(eq(schema.agents.id, chat.agentId), eq(schema.agents.userId, session.user.id)))
    .limit(1);

  if (!agent) throw new Error('Agent not found');

  const config = parseAgentConfig(agent.config);
  const started = await startAgentChatSession(config, { userId: session.user.id });

  await activateChatSession(db, {
    chatId,
    userId: session.user.id,
    sandboxId: started.sandboxId,
    opencodeSessionId: started.opencodeSessionId,
    url: started.url,
    token: started.token,
  });

  return { status: 'active' as const };
}

export async function pauseChatAction(chatId: string) {
  const session = await getSession();

  const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
  if (!chat) throw new Error('Chat not found');
  if (chat.status !== 'active' || !chat.sandboxId) throw new Error('Sandbox is not active.');

  await pauseSandbox(chat.sandboxId);
  await pauseChatSession(db, chatId, session.user.id);
}

export async function resumeChatAction(chatId: string) {
  const session = await getSession();

  const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
  if (!chat) throw new Error('Chat not found');
  if (chat.status !== 'paused' || !chat.sandboxId) throw new Error('Sandbox is not paused.');

  try {
    const resumed = await resumeSandbox(chat.sandboxId);
    await reactivateChatSession(db, chatId, session.user.id, resumed);
  } catch (error) {
    console.error('Resume failed, closing session:', error);
    await closeChatSession(db, chatId, session.user.id);
    throw new Error('Failed to resume sandbox. Session closed.');
  }
}

export async function closeChatAction(chatId: string) {
  const session = await getSession();

  const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
  if (!chat) throw new Error('Chat not found');

  if (chat.sandboxId) {
    try {
      await killSandbox(chat.sandboxId);
    } catch (error) {
      console.error('Failed to kill sandbox:', error);
    }
  }

  await closeChatSession(db, chatId, session.user.id);
}

export async function sendMessageAction(chatId: string, task: string) {
  const session = await getSession();

  const trimmedTask = task.trim();
  if (!trimmedTask) throw new Error('Task is required');

  const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
  if (!chat) throw new Error('Chat not found');
  if (chat.status !== 'active' || !chat.opencodeSessionId || !chat.url || !chat.token) {
    throw new Error('Sandbox is not active. Start sandbox first.');
  }

  const [agent] = await db
    .select()
    .from(schema.agents)
    .where(and(eq(schema.agents.id, chat.agentId), eq(schema.agents.userId, session.user.id)))
    .limit(1);

  if (!agent) throw new Error('Agent not found');

  const config = parseAgentConfig(agent.config);

  try {
    const result = await sendAgentChatMessage(config, trimmedTask, {
      opencodeSessionId: chat.opencodeSessionId,
      url: chat.url,
      token: chat.token,
    });
    return { text: result.text };
  } catch (error) {
    console.error('Message send failed, closing chat session:', error);
    await closeChatSession(db, chatId, session.user.id);
    throw new Error('Sandbox session closed. Start sandbox again.');
  }
}

export async function resetChatTimeoutAction(chatId: string) {
  const session = await getSession();

  const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
  if (!chat) throw new Error('Chat not found');
  if (chat.status !== 'active' || !chat.sandboxId) {
    throw new Error('Sandbox is not active. Start sandbox first.');
  }

  try {
    const info = await setSandboxTimeout(chat.sandboxId, RESET_TIMEOUT_MS);
    const endAt = info.endAt instanceof Date ? info.endAt.toISOString() : String(info.endAt ?? '');
    return { endAt };
  } catch (error) {
    console.error('Failed to reset sandbox timeout:', error);
    await closeChatSession(db, chatId, session.user.id);
    throw new Error('Sandbox session expired. Start sandbox again.');
  }
}
