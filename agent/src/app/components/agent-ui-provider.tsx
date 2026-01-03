"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ConversationSummary = {
  sessionId: string;
  title: string;
  updatedAt: number;
};

export type DebugEvent = {
  ts: number;
  scope?: string; // sessionId or "global"
  kind: "info" | "event" | "error";
  label: string;
  detail?: string;
};

type AgentUiContextValue = {
  // conversations (localStorage, option A)
  conversations: ConversationSummary[];
  upsertConversation: (c: { sessionId: string; title?: string; updatedAt?: number }) => void;
  renameConversation: (sessionId: string, title: string) => void;
  deleteConversation: (sessionId: string) => void;
  clearConversations: () => void;

  // debug/inspector
  debugEvents: DebugEvent[];
  addDebugEvent: (e: Omit<DebugEvent, "ts"> & { ts?: number }) => void;
  clearDebugEvents: () => void;

  // allow inspector to stop currently running stream
  registerActiveStop: (stopFn: (() => void) | null) => void;
  stopActive: () => void;
};

const LS_CONVERSATIONS = "agent_ui_conversations_v1";
const MAX_DEBUG_EVENTS = 400;

const AgentUiContext = createContext<AgentUiContextValue | null>(null);

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function AgentUiProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const activeStopRef = useRef<(() => void) | null>(null);

  // conversations: load once
  useEffect(() => {
    const parsed = safeParse<ConversationSummary[]>(localStorage.getItem(LS_CONVERSATIONS));
    if (Array.isArray(parsed)) setConversations(parsed);
  }, []);

  // conversations: persist
  useEffect(() => {
    localStorage.setItem(LS_CONVERSATIONS, JSON.stringify(conversations));
  }, [conversations]);

  const upsertConversation = useCallback(
    (c: { sessionId: string; title?: string; updatedAt?: number }) => {
      const now = c.updatedAt ?? Date.now();
      setConversations((prev) => {
        const idx = prev.findIndex((x) => x.sessionId === c.sessionId);
        const next = [...prev];
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            ...(c.title ? { title: c.title } : {}),
            updatedAt: now,
          };
        } else {
          next.push({
            sessionId: c.sessionId,
            title: c.title ?? "Untitled",
            updatedAt: now,
          });
        }
        next.sort((a, b) => b.updatedAt - a.updatedAt);
        return next;
      });
    },
    []
  );

  const renameConversation = useCallback((sessionId: string, title: string) => {
    const clean = title.trim() || "Untitled";
    setConversations((prev) =>
      prev.map((c) => (c.sessionId === sessionId ? { ...c, title: clean, updatedAt: Date.now() } : c))
    );
  }, []);

  const deleteConversation = useCallback((sessionId: string) => {
    setConversations((prev) => prev.filter((c) => c.sessionId !== sessionId));
  }, []);

  const clearConversations = useCallback(() => setConversations([]), []);

  const addDebugEvent = useCallback((e: Omit<DebugEvent, "ts"> & { ts?: number }) => {
    const ev: DebugEvent = { ts: e.ts ?? Date.now(), ...e };
    setDebugEvents((prev) => {
      const next = [...prev, ev];
      return next.length > MAX_DEBUG_EVENTS ? next.slice(next.length - MAX_DEBUG_EVENTS) : next;
    });
  }, []);

  const clearDebugEvents = useCallback(() => setDebugEvents([]), []);

  const registerActiveStop = useCallback((stopFn: (() => void) | null) => {
    activeStopRef.current = stopFn;
  }, []);

  const stopActive = useCallback(() => {
    activeStopRef.current?.();
  }, []);

  const value = useMemo<AgentUiContextValue>(
    () => ({
      conversations,
      upsertConversation,
      renameConversation,
      deleteConversation,
      clearConversations,
      debugEvents,
      addDebugEvent,
      clearDebugEvents,
      registerActiveStop,
      stopActive,
    }),
    [
      conversations,
      upsertConversation,
      renameConversation,
      deleteConversation,
      clearConversations,
      debugEvents,
      addDebugEvent,
      clearDebugEvents,
      registerActiveStop,
      stopActive,
    ]
  );

  return <AgentUiContext.Provider value={value}>{children}</AgentUiContext.Provider>;
}

export function useAgentUi() {
  const ctx = useContext(AgentUiContext);
  if (!ctx) throw new Error("useAgentUi must be used within AgentUiProvider");
  return ctx;
}


