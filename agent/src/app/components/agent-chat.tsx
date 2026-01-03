"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgentUi } from "@/app/components/agent-ui-provider";
import { useChatStream, type AgentEvent } from "@/app/components/use-chat-stream";

type UiItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "event"; label: string; detail?: string };

function safeJsonStringify(value: unknown, maxLen = 2000): string {
  try {
    const s = JSON.stringify(value, null, 2);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return String(value);
  }
}

export default function AgentChat(props: {
  initialSessionId?: string;
  /**
   * Used for "new conversation" flow: when server emits a real sessionId, caller can update URL.
   */
  onSessionResolved?: (sessionId: string) => void;
}) {
  const router = useRouter();
  const { addDebugEvent, upsertConversation, registerActiveStop } = useAgentUi();

  const [sessionId, setSessionId] = useState<string>(props.initialSessionId ?? "");
  const [items, setItems] = useState<UiItem[]>([]);
  const [input, setInput] = useState<string>("");
  const [lastCost, setLastCost] = useState<number | null>(null);
  const firstUserMessageRef = useRef<string>("");
  const assistantIndexRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset assistant streaming target when switching conversations.
    assistantIndexRef.current = null;
  }, [props.initialSessionId]);

  const pushEvent = (label: string, detail?: string) => {
    setItems((prev) => [...prev, { kind: "event", label, detail }]);
  };

  const appendAssistant = (chunk: string) => {
    setItems((prev) => {
      const next = [...prev];
      if (assistantIndexRef.current === null) {
        assistantIndexRef.current = next.length;
        next.push({ kind: "assistant", text: chunk });
      } else {
        const idx = assistantIndexRef.current;
        const cur = idx === null ? null : next[idx];
        if (cur && cur.kind === "assistant") next[idx] = { ...cur, text: cur.text + chunk };
      }
      return next;
    });
  };

  const stream = useChatStream({
    onRaw: (raw) => addDebugEvent({ kind: "event", label: "SSE", detail: raw, scope: sessionId || "global" }),
    onEvent: (evt: AgentEvent) => {
      if (evt.type === "session") {
        setSessionId(evt.sessionId);
        addDebugEvent({ kind: "info", label: "Session", detail: evt.sessionId, scope: evt.sessionId });

        const title = firstUserMessageRef.current ? firstUserMessageRef.current.slice(0, 80) : "Untitled";
        upsertConversation({ sessionId: evt.sessionId, title, updatedAt: Date.now() });

        props.onSessionResolved?.(evt.sessionId);
      } else if (evt.type === "text") {
        appendAssistant(evt.content);
      } else if (evt.type === "tool_start") {
        pushEvent(`Tool start: ${evt.name}`, safeJsonStringify(evt.input, 1500));
      } else if (evt.type === "tool_result") {
        pushEvent(`Tool result: ${evt.tool_use_id}`, evt.result);
      } else if (evt.type === "done") {
        if (typeof evt.cost === "number") setLastCost(evt.cost);
        pushEvent("Done", evt.result);
      } else if (evt.type === "error") {
        if (typeof evt.cost === "number") setLastCost(evt.cost);
        pushEvent("Error", evt.error);
      }
    },
  });

  useEffect(() => {
    registerActiveStop(stream.stop);
    return () => registerActiveStop(null);
  }, [registerActiveStop, stream.stop]);

  function resetConversation() {
    setItems([]);
    setLastCost(null);
    setSessionId("");
    router.refresh();
  }

  async function sendMessage() {
    const message = input.trim();
    if (!message || stream.state === "connecting" || stream.state === "streaming") return;

    setInput("");
    setItems((prev) => [...prev, { kind: "user", text: message }]);

    if (!props.initialSessionId && !sessionId && !firstUserMessageRef.current) {
      firstUserMessageRef.current = message;
    }

    await stream.start({ message, ...(sessionId ? { sessionId } : {}) });

    if (sessionId) upsertConversation({ sessionId, updatedAt: Date.now() });
  }

  const isStreaming = stream.state === "connecting" || stream.state === "streaming";
  const canSend = input.trim().length > 0 && !isStreaming;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Agent UI</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Uses <code className="font-mono">POST /api/chat</code> (SSE) from this Next.js app.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Session:</span>{" "}
            <code className="font-mono">{sessionId || "(none yet)"}</code>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetConversation}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-black dark:hover:bg-zinc-900"
            >
              New session
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Status:</span>{" "}
            <span className={isStreaming ? "text-amber-600 dark:text-amber-400" : ""}>
              {isStreaming ? stream.state : "idle"}
            </span>
          </div>
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Last cost:</span>{" "}
            <code className="font-mono">{lastCost ?? "-"}</code>
          </div>
          {(stream.state === "error" || stream.state === "interrupted") && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">Error:</span>
              <span className="text-red-600 dark:text-red-400">{stream.error ?? "Unknown"}</span>
              {stream.lastRequest && (
                <button
                  type="button"
                  onClick={stream.retry}
                  className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium dark:border-zinc-700 dark:bg-black"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Conversation</h2>
          <button
            type="button"
            onClick={stream.stop}
            disabled={!isStreaming}
            className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium disabled:opacity-50 dark:border-zinc-700 dark:bg-black"
          >
            Stop
          </button>
        </div>

        <div className="mt-3 max-h-[55vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-black">
          {items.length === 0 ? (
            <div className="text-zinc-500 dark:text-zinc-500">No messages yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((it, idx) => {
                if (it.kind === "user") {
                  return (
                    <div key={idx} className="flex gap-2">
                      <div className="w-16 shrink-0 text-zinc-500">You</div>
                      <pre className="whitespace-pre-wrap font-sans">{it.text}</pre>
                    </div>
                  );
                }
                if (it.kind === "assistant") {
                  return (
                    <div key={idx} className="flex gap-2">
                      <div className="w-16 shrink-0 text-zinc-500">Agent</div>
                      <pre className="whitespace-pre-wrap font-sans">{it.text}</pre>
                    </div>
                  );
                }
                return (
                  <div key={idx} className="rounded-md bg-white p-2 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                    <div className="font-medium">{it.label}</div>
                    {it.detail && <pre className="mt-1 whitespace-pre-wrap font-mono">{it.detail}</pre>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void sendMessage();
            }}
            placeholder="Type a message… (Ctrl/Cmd + Enter to send)"
            className="min-h-[96px] w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-black"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!canSend}
              className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


