import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  getChatSession,
  closeChatSession,
} from '@/lib/agent/chat-session-registry';
import {
  getAgentSandboxInfo,
  resetAgentTimeout,
} from '@/lib/agent/agent-spawner';

const RESET_TIMEOUT_MS = 3 * 60 * 1000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { chatId } = await params;
    const chat = await getChatSession(chatId, session.user.id);
    if (!chat) {
      return jsonResponse({ error: 'Chat not found' }, 404);
    }

    if (chat.status !== 'active' || !chat.sandboxId) {
      return jsonResponse(
        { error: 'Sandbox is not active. Start sandbox first.' },
        409
      );
    }

    try {
      const info = await getAgentSandboxInfo(chat.sandboxId);
      return jsonResponse({
        sandboxId: info.sandboxId,
        startedAt: info.startedAt,
        endAt: info.endAt,
      });
    } catch (error) {
      console.error('Failed to fetch sandbox timeout info:', error);
      await closeChatSession(chatId, session.user.id);
      return jsonResponse(
        { error: 'Sandbox session expired. Start sandbox again.' },
        409
      );
    }
  } catch (error) {
    console.error('Get timeout API error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { chatId } = await params;
    const chat = await getChatSession(chatId, session.user.id);
    if (!chat) {
      return jsonResponse({ error: 'Chat not found' }, 404);
    }

    if (chat.status !== 'active' || !chat.sandboxId) {
      return jsonResponse(
        { error: 'Sandbox is not active. Start sandbox first.' },
        409
      );
    }

    try {
      const info = await resetAgentTimeout(chat.sandboxId, RESET_TIMEOUT_MS);
      return jsonResponse({
        timeoutMs: RESET_TIMEOUT_MS,
        endAt: info.endAt,
      });
    } catch (error) {
      console.error('Failed to reset sandbox timeout:', error);
      await closeChatSession(chatId, session.user.id);
      return jsonResponse(
        { error: 'Sandbox session expired. Start sandbox again.' },
        409
      );
    }
  } catch (error) {
    console.error('Reset timeout API error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}
