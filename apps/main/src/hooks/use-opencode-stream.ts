'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OpencodePart, OpencodePayload, ParsedEvent, ToolSummary } from '@/types/opencode';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseEvent(raw: string): ParsedEvent {
  const trimmed = raw.trim();
  const fallback: ParsedEvent = { id: makeId(), raw: trimmed || raw };
  if (!trimmed) return fallback;

  try {
    const data = JSON.parse(trimmed);
    if (!isRecord(data)) return fallback;

    const payload = isRecord(data.payload) ? (data.payload as OpencodePayload) : (data as OpencodePayload);
    const payloadType = typeof payload.type === 'string' ? payload.type : undefined;
    const part = isRecord(payload.properties) ? (payload.properties.part as OpencodePart | undefined) : undefined;
    const delta =
      isRecord(payload.properties) && typeof payload.properties.delta === 'string'
        ? payload.properties.delta
        : undefined;

    return {
      id: makeId(),
      raw: trimmed,
      payloadType,
      part,
      delta,
    };
  } catch {
    return fallback;
  }
}

function lastSegment(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/\\/g, '/');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || value;
}

function getToolInfo(tool: string | undefined, input: unknown): { title: string; subtitle?: string } {
  const data = isRecord(input) ? input : {};
  const description = typeof data.description === 'string' ? data.description : undefined;
  const filePath = typeof data.filePath === 'string' ? data.filePath : undefined;
  const path = typeof data.path === 'string' ? data.path : undefined;
  const pattern = typeof data.pattern === 'string' ? data.pattern : undefined;
  const url = typeof data.url === 'string' ? data.url : undefined;
  const files = Array.isArray(data.files) ? data.files.length : undefined;

  switch (tool) {
    case 'bash':
      return { title: 'Bash', subtitle: description };
    case 'read':
      return { title: 'Read', subtitle: lastSegment(filePath) };
    case 'list':
      return { title: 'List', subtitle: lastSegment(path) };
    case 'glob':
      return { title: 'Glob', subtitle: pattern };
    case 'grep':
      return { title: 'Grep', subtitle: pattern };
    case 'webfetch':
      return { title: 'Webfetch', subtitle: url };
    case 'edit':
      return { title: 'Edit', subtitle: lastSegment(filePath) };
    case 'write':
      return { title: 'Write', subtitle: lastSegment(filePath) };
    case 'apply_patch':
      return { title: 'Patch', subtitle: files ? `${files} file${files > 1 ? 's' : ''}` : undefined };
    case 'todowrite':
      return { title: 'To-dos' };
    case 'todoread':
      return { title: 'Read to-dos' };
    case 'task':
      return { title: 'Agent', subtitle: description };
    case 'question':
      return { title: 'Questions' };
    default:
      return { title: tool ?? 'Tool' };
  }
}

type UseOpencodeStreamResult = {
  toolSteps: ToolSummary[];
  responseText: string;
  reset: () => void;
  isConnected: boolean;
};

export function useOpencodeStream(chatId: string): UseOpencodeStreamResult {
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/chat/${chatId}/steps`);

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (e) => {
      setEvents((prev) => [...prev, parseEvent(e.data)]);
    };

    es.onerror = () => {
      setIsConnected(false);
      // Don't close — browser will auto-reconnect once sandbox is active
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [chatId]);

  const reset = useCallback(() => {
    setEvents([]);
  }, []);

  const { toolSteps, responseText } = useMemo(() => {
    const visibleEvents = events.slice(-400);
    const order: string[] = [];
    const map = new Map<string, ToolSummary>();
    const textOrder: string[] = [];
    const textMap = new Map<string, string>();

    for (const event of visibleEvents) {
      if (event.part && event.part.type === 'tool') {
        const callID = event.part.callID ?? `${event.part.id ?? 'tool'}-${event.part.messageID ?? 'unknown'}`;
        const status = event.part.state?.status ?? 'unknown';
        const tool = event.part.tool ?? 'tool';
        const info = getToolInfo(tool, event.part.state?.input);
        if (!map.has(callID)) order.push(callID);
        map.set(callID, {
          callID,
          tool,
          status,
          title: info.title,
          subtitle: info.subtitle,
          output: status === 'completed' ? event.part.state?.output : undefined,
          error: status === 'error' ? event.part.state?.error : undefined,
          raw: event.part,
        });
        continue;
      }

      if (event.part && event.part.type === 'text') {
        const id = event.part.id ?? `${event.part.messageID ?? 'msg'}-${textOrder.length}`;
        if (!textMap.has(id)) textOrder.push(id);
        if (typeof event.part.text === 'string') {
          textMap.set(id, event.part.text);
        } else if (event.delta) {
          const current = textMap.get(id) ?? '';
          textMap.set(id, current + event.delta);
        }
      }
    }

    return {
      toolSteps: order.map((id) => map.get(id)!).filter(Boolean),
      responseText: textOrder.map((id) => textMap.get(id) ?? '').join(''),
    };
  }, [events]);

  return { toolSteps, responseText, reset, isConnected };
}
