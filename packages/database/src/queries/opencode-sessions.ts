import type { Database } from '@database/client';
import { opencodeSessions } from '@database/schema';
import { eq, lt } from 'drizzle-orm';

export type OpencodeSessionData = {
  sessionId: string;
  url: string;
  token: string;
};

export type CreateOpencodeSessionParams = {
  toolCallId: string;
  userId: string;
  agentId: string;
  sessionId: string;
  url: string;
  token: string;
  expiresAt: Date;
};

export const createOpencodeSession = async (
  db: Database,
  data: CreateOpencodeSessionParams
) => {
  const [result] = await db
    .insert(opencodeSessions)
    .values(data)
    .returning({
      toolCallId: opencodeSessions.toolCallId,
      sessionId: opencodeSessions.sessionId,
      url: opencodeSessions.url,
    });

  return result;
};

export const getOpencodeSession = async (
  db: Database,
  toolCallId: string
): Promise<OpencodeSessionData | undefined> => {
  const [session] = await db
    .select({
      sessionId: opencodeSessions.sessionId,
      url: opencodeSessions.url,
      token: opencodeSessions.token,
    })
    .from(opencodeSessions)
    .where(eq(opencodeSessions.toolCallId, toolCallId))
    .limit(1);

  return session;
};

export const getOpencodeSessionWithAuth = async (
  db: Database,
  toolCallId: string,
  userId: string
): Promise<OpencodeSessionData | undefined> => {
  const [session] = await db
    .select({
      sessionId: opencodeSessions.sessionId,
      url: opencodeSessions.url,
      token: opencodeSessions.token,
      userId: opencodeSessions.userId,
    })
    .from(opencodeSessions)
    .where(eq(opencodeSessions.toolCallId, toolCallId))
    .limit(1);

  if (!session || session.userId !== userId) {
    return undefined;
  }

  return {
    sessionId: session.sessionId,
    url: session.url,
    token: session.token,
  };
};

export const cleanupExpiredSessions = async (db: Database) => {
  await db
    .delete(opencodeSessions)
    .where(lt(opencodeSessions.expiresAt, new Date()));
};

export const getAllOpencodeSessionIds = async (db: Database) => {
  const sessions = await db
    .select({ toolCallId: opencodeSessions.toolCallId })
    .from(opencodeSessions);

  return sessions.map((s) => s.toolCallId);
};
