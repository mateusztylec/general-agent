"use client";

import { parseSSE } from "@/lib/sse";
import { useCallback, useEffect, useRef, useState } from "react";

export type AgentEvent =
  | { type: "session"; sessionId: string }
  | { type: "text"; content: string }
  | { type: "tool_start"; tool_use_id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; result: string }
  | { type: "done"; result: string; cost?: number }
  | { type: "error"; error: string; cost?: number };

type StartArgs = { message: string; sessionId?: string };

type UseChatStreamOptions = {
  onEvent: (evt: AgentEvent) => void;
  onRaw?: (raw: string) => void;
};

type StreamState = "idle" | "connecting" | "streaming" | "interrupted" | "error";

export function useChatStream(options: UseChatStreamOptions) {
  const [state, setState] = useState<StreamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastReqRef = useRef<StartArgs | null>(null);
  const gotAnyEventRef = useRef(false);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
  }, []);

  const startOnce = useCallback(
    async (args: StartArgs) => {
      gotAnyEventRef.current = false;
      setError(null);
      setState("connecting");

      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ""}`);
      }

      setState("streaming");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSSE(buffer);
        buffer = parsed.rest;

        for (const raw of parsed.events) {
          options.onRaw?.(raw);
          let evt: AgentEvent | null = null;
          try {
            evt = JSON.parse(raw) as AgentEvent;
          } catch {
            continue;
          }
          gotAnyEventRef.current = true;
          options.onEvent(evt);
        }
      }
    },
    [options]
  );

  const start = useCallback(
    async (args: StartArgs) => {
      if (state === "connecting" || state === "streaming") return;
      lastReqRef.current = args;

      const backoffMs = [300, 1000, 2500];

      for (let attempt = 0; attempt < backoffMs.length + 1; attempt++) {
        try {
          await startOnce(args);
          setState("idle");
          abortRef.current = null;
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);

          // If user cancelled -> just exit.
          if ((e as any)?.name === "AbortError") {
            setState("idle");
            setError(null);
            return;
          }

          // If we already received events, do NOT auto-retry (would duplicate content).
          if (gotAnyEventRef.current) {
            setState("interrupted");
            setError(msg);
            abortRef.current = null;
            return;
          }

          // No events yet: retry a few times.
          if (attempt < backoffMs.length) {
            setState("connecting");
            await new Promise((r) => setTimeout(r, backoffMs[attempt]));
            continue;
          }

          setState("error");
          setError(msg);
          abortRef.current = null;
          return;
        }
      }
    },
    [startOnce, state]
  );

  const retry = useCallback(() => {
    const last = lastReqRef.current;
    if (!last) return;
    void start(last);
  }, [start]);

  // Reconnect on visibility if we failed before getting any events.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (state !== "error") return;
      const last = lastReqRef.current;
      if (!last) return;
      void start(last);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [state, start]);

  return { state, error, start, stop, retry, lastRequest: lastReqRef.current };
}


