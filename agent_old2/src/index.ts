import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { streamSSE } from 'hono/streaming';
import { cors } from 'hono/cors';
import { handleChat } from './chat';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

// Chat endpoint with SSE streaming
app.post('/chat', async (c) => {
  const body = await c.req.json<{ message: string; sessionId?: string }>();
  const { message, sessionId } = body;

  if (!message) {
    return c.json({ error: 'message is required' }, 400);
  }

  console.log('[chat] request', {
    sessionId: sessionId ?? null,
    messagePreview: message.length > 200 ? `${message.slice(0, 200)}…` : message,
  });

  return streamSSE(c, async (stream) => {
    try {
      await handleChat(message, stream, { sessionId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[chat] handler error', errorMessage);
      await stream.writeSSE({
        data: JSON.stringify({ type: 'error', error: errorMessage }),
      });
    }
  });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Serve static files (chat UI) - must be after API routes
app.use('/*', serveStatic({ root: './public' }));

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Agent server running at http://localhost:${port}`);

export default {
  port,
  // SSE connections (like /chat) can stay open for a long time; disable the default 10s idle timeout.
  idleTimeout: 0,
  fetch: app.fetch,
};
