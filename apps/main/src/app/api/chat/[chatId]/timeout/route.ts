import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  getChatSessionByIdAndUser,
  closeChatSession,
} from '@general-agent/database/queries/chat-sessions';
import { db } from '@general-agent/database/client';
import { getSandboxInfo } from '@general-agent/sandbox/spawner';

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
    const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
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
      const info = await getSandboxInfo(chat.sandboxId);
      return jsonResponse({
        sandboxId: info.sandboxId,
        startedAt: info.startedAt,
        endAt: info.endAt,
      });
    } catch (error) {
      console.error('Failed to fetch sandbox timeout info:', error);
      await closeChatSession(db, chatId, session.user.id);
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
