import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { closeChatSession, getChatSession } from '@/lib/agent/chat-session-registry';
import { killAgent } from '@/lib/agent/agent-spawner';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { chatId } = await params;
    const chat = await getChatSession(chatId, session.user.id);
    if (!chat) {
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (chat.sandboxId) {
      try {
        await killAgent(chat.sandboxId);
      } catch (error) {
        console.error('Failed to kill sandbox:', error);
      }
    }

    await closeChatSession(chatId, session.user.id);
    return new Response(
      JSON.stringify({ status: 'closed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Close chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
