import { createOpencodeClient } from '@opencode-ai/sdk';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getChatSessionByIdAndUser } from '@general-agent/database/queries/chat-sessions';
import { db } from '@general-agent/database/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { chatId } = await params;
  const chat = await getChatSessionByIdAndUser(db, chatId, session.user.id);
  if (!chat || !chat.url || !chat.token || !chat.opencodeSessionId) {
    return new Response('Chat session not ready', { status: 404 });
  }

  if (chat.status !== 'active') {
    return new Response('Chat is not active', { status: 409 });
  }

  const client = createOpencodeClient({
    baseUrl: chat.url,
    headers: { 'e2b-traffic-access-token': chat.token },
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const events = await client.event.subscribe();
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              payload: { type: 'steps.connected', properties: { chatId } },
            })}\n\n`
          )
        );

        for await (const event of events.stream) {
          const payload = (event as { payload?: { properties?: Record<string, unknown> } } | undefined)?.payload;
          const properties = payload?.properties as
            | { sessionID?: string; part?: { sessionID?: string }; info?: { sessionID?: string } }
            | undefined;
          const sessionId =
            properties?.sessionID ??
            properties?.part?.sessionID ??
            properties?.info?.sessionID;

          if (sessionId && sessionId !== chat.opencodeSessionId) {
            continue;
          }

          const data = JSON.stringify(event) + '\n';
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
