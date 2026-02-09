import { db } from '@general-agent/database/client';
import * as queries from '@general-agent/database/queries/chat-sessions';

export type ChatSessionEntry = queries.ChatSessionData;

export async function createChat(userId: string, agentId: string) {
  return await queries.createChat(db, { userId, agentId });
}

export async function activateChatSession(
  chatId: string,
  userId: string,
  session: {
    sandboxId: string;
    opencodeSessionId: string;
    url: string;
    token: string;
  }
) {
  return await queries.activateChatSession(db, {
    chatId,
    userId,
    sandboxId: session.sandboxId,
    opencodeSessionId: session.opencodeSessionId,
    url: session.url,
    token: session.token,
  });
}

export async function getChatSession(
  chatId: string,
  userId: string
): Promise<ChatSessionEntry | undefined> {
  return await queries.getChatSessionByIdAndUser(db, chatId, userId);
}

export async function closeChatSession(chatId: string, userId: string) {
  return await queries.closeChatSession(db, chatId, userId);
}
