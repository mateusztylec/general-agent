import type { Database } from '@database/client';
import { chatSessions } from '@database/schema';
import { and, eq } from 'drizzle-orm';

export type ChatSessionData = {
  id: string;
  agentId: string;
  sandboxId: string | null;
  opencodeSessionId: string | null;
  url: string | null;
  token: string | null;
  status: string;
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
