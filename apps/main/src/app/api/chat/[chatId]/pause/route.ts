import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  getChatSessionByIdAndUser,
  pauseChatSession,
} from '@general-agent/database/queries/chat-sessions';
import { db } from '@general-agent/database/client';
import { pauseSandbox } from '@general-agent/sandbox/spawner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    if (chat.status !== 'active' || !chat.sandboxId) {
      return new Response(
        JSON.stringify({ error: 'Sandbox is not active.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await pauseSandbox(chat.sandboxId);
    await pauseChatSession(db, chatId, session.user.id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Pause API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
