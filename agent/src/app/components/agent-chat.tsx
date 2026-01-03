"use client";

import { parseSSE } from "@/lib/sse";
import { useEffect, useRef, useState } from "react";

type AgentEvent =
  | { type: "session"; sessionId: string }
  | { type: "text"; content: string }
  | { type: "tool_start"; tool_use_id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; result: string }
  | { type: "done"; result: string; cost?: number }
  | { type: "error"; error: string; cost?: number };

type UiItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "event"; label: string; detail?: string };

const LS_SESSION_ID = "agent_ui_session_id";

function safeJsonStringify(value: unknown, maxLen = 2000): string {
  try {
    const s = JSON.stringify(value, null, 2);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return String(value);
  }
}

export default function AgentChat() {
  const [sessionId, setSessionId] = useState<string>("");
  const [items, setItems] = useState<UiItem[]>([]);
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastCost, setLastCost] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem(LS_SESSION_ID);
    if (savedSession) setSessionId(savedSession);
  }, []);

  useEffect(() => {
    if (sessionId) localStorage.setItem(LS_SESSION_ID, sessionId);
  }, [sessionId]);

  function resetConversation() {
    setItems([]);
    setLastCost(null);
    setSessionId("");
    localStorage.removeItem(LS_SESSION_ID);
  }

  function stopStreaming() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }

  async function sendMessage() {
    const message = input.trim();
    if (!message || isStreaming) return;

    setInput("");
    setItems((prev) => [...prev, { kind: "user", text: message }]);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    // We keep a "current assistant message" and append streaming chunks to it.
    let assistantIndex: number | null = null;
    let buffer = "";

    const pushEvent = (label: string, detail?: string) => {
      setItems((prev) => [...prev, { kind: "event", label, detail }]);
    };

    const appendAssistant = (chunk: string) => {
      setItems((prev) => {
        const next = [...prev];
        if (assistantIndex === null) {
          assistantIndex = next.length;
          next.push({ kind: "assistant", text: chunk });
        } else {
          const cur = next[assistantIndex];
          if (cur && cur.kind === "assistant") next[assistantIndex] = { ...cur, text: cur.text + chunk };
        }
        return next;
      });
    };

    try {
      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, ...(sessionId ? { sessionId } : {}) }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ""}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSSE(buffer);
        buffer = parsed.rest;

        for (const raw of parsed.events) {
          let evt: AgentEvent | null = null;
          try {
            evt = JSON.parse(raw) as AgentEvent;
          } catch {
            pushEvent("Malformed event", raw);
            continue;
          }

          if (evt.type === "session") {
            setSessionId(evt.sessionId);
            pushEvent("Session", evt.sessionId);
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
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pushEvent("Request error", msg);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

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
              {isStreaming ? "streaming" : "idle"}
            </span>
          </div>
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Last cost:</span>{" "}
            <code className="font-mono">{lastCost ?? "-"}</code>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Conversation</h2>
          <button
            type="button"
            onClick={stopStreaming}
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


