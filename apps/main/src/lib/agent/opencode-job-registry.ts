import { db } from '@general-agent/database/client';
import * as queries from '@general-agent/database/queries/opencode-sessions';

const JOB_TTL_MS = 15 * 60 * 1000;

export type OpencodeToolCallEntry = queries.OpencodeSessionData;

/**
 * Store OpenCode session data for streaming bridge
 */
export async function setOpencodeToolCall(
  toolCallId: string,
  data: {
    sessionId: string;
    url: string;
    token: string;
    userId: string;
    agentId: string;
  }
) {
  const expiresAt = new Date(Date.now() + JOB_TTL_MS);

  try {
    await queries.createOpencodeSession(db, {
      toolCallId,
      ...data,
      expiresAt,
    });
    console.log('[JobRegistry] SET', { toolCallId });

    // Cleanup expired sessions opportunistically
    queries.cleanupExpiredSessions(db).catch((error) =>
      console.error('[JobRegistry] Cleanup error:', error)
    );
  } catch (error) {
    console.error('[JobRegistry] SET error:', error);
    throw error;
  }
}

/**
 * Get OpenCode session data (internal - no auth check)
 */
export async function getOpencodeToolCall(
  toolCallId: string
): Promise<OpencodeToolCallEntry | undefined> {
  try {
    const session = await queries.getOpencodeSession(db, toolCallId);
    console.log('[JobRegistry] GET', { toolCallId, found: !!session });
    return session;
  } catch (error) {
    console.error('[JobRegistry] GET error:', error);
    return undefined;
  }
}

/**
 * Get OpenCode session with auth check
 */
export async function getOpencodeToolCallWithAuth(
  toolCallId: string,
  userId: string
): Promise<OpencodeToolCallEntry | undefined> {
  try {
    const session = await queries.getOpencodeSessionWithAuth(db, toolCallId, userId);
    if (!session) {
      console.log('[JobRegistry] GET auth failed', { toolCallId, userId });
      return undefined;
    }
    console.log('[JobRegistry] GET auth success', { toolCallId, userId });
    return session;
  } catch (error) {
    console.error('[JobRegistry] GET auth error:', error);
    return undefined;
  }
}

/**
 * Wait for OpenCode session to be registered (polling)
 */
export async function waitForOpencodeToolCall(
  toolCallId: string,
  opts: { timeoutMs: number; intervalMs: number }
): Promise<OpencodeToolCallEntry | undefined> {
  const start = Date.now();
  while (Date.now() - start < opts.timeoutMs) {
    const entry = await getOpencodeToolCall(toolCallId);
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, opts.intervalMs));
  }
  return undefined;
}

/**
 * Wait for OpenCode session with auth check (polling)
 */
export async function waitForOpencodeToolCallWithAuth(
  toolCallId: string,
  userId: string,
  opts: { timeoutMs: number; intervalMs: number }
): Promise<OpencodeToolCallEntry | undefined> {
  const start = Date.now();
  while (Date.now() - start < opts.timeoutMs) {
    const entry = await getOpencodeToolCallWithAuth(toolCallId, userId);
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, opts.intervalMs));
  }
  return undefined;
}