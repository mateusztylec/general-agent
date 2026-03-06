import type { Database } from '@database/client';
import { agents, chatSessions } from '@database/schema';
import { and, desc, eq } from 'drizzle-orm';

export type ChatSessionData = {
  id: string;
  agentId: string;
  sandboxId: string | null;
  opencodeSessionId: string | null;
  url: string | null;
  token: string | null;
  status: string;
  sandboxEndAt: Date | null;
};

export type CreateChatParams = {
  userId: string;
  agentId: string;
};

export type ActivateChatSessionParams = {
  chatId: string;
  userId: string;
  sandboxId: string;
  opencodeSessionId: string;
  url: string;
  token: string;
  sandboxEndAt: Date;
};

export type AgentWithSessions = {
  id: string;
  name: string;
  sessions: Array<{ id: string; status: string; createdAt: Date }>;
};

export const createChat = async (
  db: Database,
  data: CreateChatParams
) => {
  const [result] = await db
    .insert(chatSessions)
    .values({
      userId: data.userId,
      agentId: data.agentId,
      status: 'closed',
    })
    .returning({
      id: chatSessions.id,
      status: chatSessions.status,
      createdAt: chatSessions.createdAt,
    });

  return result;
};

export const activateChatSession = async (
  db: Database,
  data: ActivateChatSessionParams
) => {
  const [session] = await db
    .update(chatSessions)
    .set({
      sandboxId: data.sandboxId,
      opencodeSessionId: data.opencodeSessionId,
      url: data.url,
      token: data.token,
      status: 'active',
      sandboxEndAt: data.sandboxEndAt,
    })
    .where(and(eq(chatSessions.id, data.chatId), eq(chatSessions.userId, data.userId)))
    .returning({
      id: chatSessions.id,
      status: chatSessions.status,
    });

  return session;
};

export const getChatSessionByIdAndUser = async (
  db: Database,
  chatId: string,
  userId: string
): Promise<ChatSessionData | undefined> => {
  const [session] = await db
    .select({
      id: chatSessions.id,
      agentId: chatSessions.agentId,
      sandboxId: chatSessions.sandboxId,
      opencodeSessionId: chatSessions.opencodeSessionId,
      url: chatSessions.url,
      token: chatSessions.token,
      status: chatSessions.status,
      sandboxEndAt: chatSessions.sandboxEndAt,
    })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .limit(1);

  return session;
};

export const closeChatSession = async (
  db: Database,
  chatId: string,
  userId: string
) => {
  const [session] = await db
    .update(chatSessions)
    .set({
      status: 'closed',
    })
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .returning({
      id: chatSessions.id,
      status: chatSessions.status,
    });

  return session;
};

export const pauseChatSession = async (
  db: Database,
  chatId: string,
  userId: string
) => {
  const [session] = await db
    .update(chatSessions)
    .set({
      status: 'paused',
    })
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .returning({
      id: chatSessions.id,
      status: chatSessions.status,
    });

  return session;
};

export const updateSandboxEndAt = async (
  db: Database,
  chatId: string,
  userId: string,
  sandboxEndAt: Date
) => {
  await db
    .update(chatSessions)
    .set({ sandboxEndAt })
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)));
};

export const reactivateChatSession = async (
  db: Database,
  chatId: string,
  userId: string,
  data: { url: string; token: string; sandboxEndAt: Date }
) => {
  const [session] = await db
    .update(chatSessions)
    .set({
      url: data.url,
      token: data.token,
      status: 'active',
      sandboxEndAt: data.sandboxEndAt,
    })
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .returning({
      id: chatSessions.id,
      status: chatSessions.status,
    });

  return session;
};



export const getAgentsWithSessions = async (
  db: Database,
  userId: string
): Promise<AgentWithSessions[]> => {
  const userAgents = await db
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(eq(agents.userId, userId))
    .orderBy(agents.createdAt);

  if (userAgents.length === 0) return [];

  const sessions = await db
    .select({
      id: chatSessions.id,
      agentId: chatSessions.agentId,
      status: chatSessions.status,
      createdAt: chatSessions.createdAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.createdAt));

  const sessionsByAgent = new Map<string, Array<{ id: string; status: string; createdAt: Date }>>();
  for (const session of sessions) {
    const list = sessionsByAgent.get(session.agentId) ?? [];
    list.push({ id: session.id, status: session.status, createdAt: session.createdAt });
    sessionsByAgent.set(session.agentId, list);
  }

  return userAgents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    sessions: sessionsByAgent.get(agent.id) ?? [],
  }));
};
