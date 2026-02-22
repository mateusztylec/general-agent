import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  getChatSessionByIdAndUser,
  reactivateChatSession,
  closeChatSession,
} from '@general-agent/database/queries/chat-sessions';
import { db } from '@general-agent/database/client';
import { resumeSandbox } from '@general-agent/sandbox/spawner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { chatId } = await params;
    const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);

    if (!chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (chat.status !== 'paused' || !chat.sandboxId) {
      return new Response(
        JSON.stringify({ error: 'Sandbox is not paused.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let resumed: { url: string; token: string };
    try {
      resumed = await resumeSandbox(chat.sandboxId);
    } catch (error) {
      console.error('Resume failed, closing session:', error);
      await closeChatSession(db, chatId, session.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to resume sandbox. Session closed.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await reactivateChatSession(db, chatId, session.user.id, resumed);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Resume API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
