import { createOpencodeClient } from '@opencode-ai/sdk';
import { NextRequest } from 'next/server';
import { waitForOpencodeJob } from '@/lib/agent/opencode-job-registry';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  if (!jobId) {
    return new Response('Missing jobId', { status: 400 });
  }

  const job = await waitForOpencodeJob(jobId, {
    timeoutMs: 15_000,
    intervalMs: 250,
  });

  if (!job) {
    return new Response('Job not found', { status: 404 });
  }

  const client = createOpencodeClient({
    baseUrl: job.url,
    fetch: job.token
      ? (input: RequestInfo | URL, init?: RequestInit) => {
        if (input instanceof Request) {
          const headers = new Headers(input.headers);
          headers.set('e2b-traffic-access-token', job.token);
          return fetch(new Request(input, { headers }));
        }

        const headers = new Headers(init?.headers);
        headers.set('e2b-traffic-access-token', job.token);
        return fetch(input, { ...init, headers });
      }
      : fetch,
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const events = await client.global.event();
        for await (const event of events.stream) {
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
