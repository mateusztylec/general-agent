import { createOpencodeClient } from '@opencode-ai/sdk';
import { NextRequest } from 'next/server';
import { waitForOpencodeToolCall } from '@/lib/agent/opencode-job-registry';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const toolCallId = searchParams.get('toolCallId');
  console.log('[OpenCode Steps] connect', { toolCallId });
  if (!toolCallId) {
    return new Response('Missing toolCallId', { status: 400 });
  }

  const job = await waitForOpencodeToolCall(toolCallId, {
    timeoutMs: 120_000,
    intervalMs: 500,
  });

  if (!job) {
    console.warn('[OpenCode Steps] job not found', { toolCallId });
    return new Response('Job not found', { status: 404 });
  }
  console.log('[OpenCode Steps] job ready', {
    toolCallId,
    sessionId: job.sessionId,
  });

  if (!job.token) {
    console.warn('[OpenCode Steps] missing access token', { toolCallId });
    return new Response('Missing access token', { status: 401 });
  }

  const client = createOpencodeClient({
    baseUrl: job.url,
    headers: { 'e2b-traffic-access-token': job.token },
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const events = await client.event.subscribe();
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              payload: { type: 'steps.connected', properties: { toolCallId } },
            })}\n\n`
          )
        );
        for await (const event of events.stream) {
          const payload = (event as { payload?: { type?: string; properties?: Record<string, unknown> } } | undefined)?.payload;
          const properties = payload?.properties as
            | { sessionID?: string; part?: { sessionID?: string }; info?: { sessionID?: string } }
            | undefined;
          const sessionId =
            properties?.sessionID ??
            properties?.part?.sessionID ??
            properties?.info?.sessionID;
          console.log('[OpenCode Steps] event', {
            toolCallId,
            type: payload?.type,
            sessionId,
          });
          if (sessionId && sessionId !== job.sessionId) {
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
