import { getSandbox } from '@cloudflare/sandbox';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for cross-origin requests from agent
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json<Record<string, unknown>>();
      const sessionId = (body.sessionId as string) || 'default';
      // IMPORTANT: Don't cache Sandbox handles across requests.
      // Cloudflare Workers disallow using I/O objects created in one request in another request.
      // Recreate the handle per-request; the underlying Durable Object still provides continuity via sessionId.
      const sandbox = getSandbox(env.Sandbox, sessionId);

      // Execute command in sandbox
      if (url.pathname === '/sandbox/exec') {
        const { command } = body as { command: string };
        if (!command) {
          return Response.json({ error: 'command is required' }, { status: 400, headers: corsHeaders });
        }

        const result = await sandbox.exec(command);
        return Response.json({
          stdout: result.stdout,
          stderr: result.stderr,
          success: result.success,
          exitCode: result.exitCode,
        }, { headers: corsHeaders });
      }

      // Read file from sandbox
      if (url.pathname === '/sandbox/read') {
        const { path } = body as { path: string };
        if (!path) {
          return Response.json({ error: 'path is required' }, { status: 400, headers: corsHeaders });
        }

        const result = await sandbox.readFile(path);
        return Response.json({
          content: result.content,
          success: true,
        }, { headers: corsHeaders });
      }

      // Write file to sandbox
      if (url.pathname === '/sandbox/write') {
        const { path, content } = body as { path: string; content: string };
        if (!path || content === undefined) {
          return Response.json({ error: 'path and content are required' }, { status: 400, headers: corsHeaders });
        }

        await sandbox.writeFile(path, content);
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Response.json({ error: message, success: false }, { status: 500, headers: corsHeaders });
    }
  }
};

export { Sandbox } from '@cloudflare/sandbox';
