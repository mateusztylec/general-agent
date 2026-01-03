import { handleChat } from "@/lib/agent/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const { message, sessionId } = body as { message?: unknown; sessionId?: unknown };

  if (typeof message !== "string" || message.trim() === "") {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  if (sessionId !== undefined && typeof sessionId !== "string") {
    return Response.json({ error: "sessionId must be a string" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const writeSSE = async (event: { data: string; event?: string; id?: string }) => {
        // Minimal SSE: our client only parses `data: ...` lines.
        controller.enqueue(encoder.encode(`data: ${event.data}\n\n`));
      };

      (async () => {
        try {
          await handleChat(message, { writeSSE }, { sessionId });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await writeSSE({ data: JSON.stringify({ type: "error", error: msg }) });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


