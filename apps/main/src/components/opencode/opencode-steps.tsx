'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OpencodePart, OpencodePayload, ParsedEvent } from '@/types/opencode';

interface OpencodeStepsProps {
  toolCallId: string;
}

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

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type ToolSummary = {
  callID: string;
  tool: string;
  status: string;
  title: string;
  subtitle?: string;
  output?: unknown;
  error?: string;
  raw: OpencodePart;
};

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

function ToolStep({ step }: { step: ToolSummary }) {
  const hasDetails = step.output !== undefined || !!step.error || step.raw.state?.input !== undefined;

  return (
    <details className="group rounded border bg-white/70 px-3 py-2 text-xs" open={!hasDetails}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 font-medium">
          <span className="text-muted-foreground">›</span>
          <span>{step.title}</span>
          {step.subtitle ? <span className="text-muted-foreground">· {step.subtitle}</span> : null}
        </div>
        <div className="uppercase text-[10px] text-muted-foreground">{step.status}</div>
      </summary>
      {hasDetails && (
        <div className="mt-2 space-y-2">
          {step.raw.state?.input !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Input</div>
              <pre className="whitespace-pre-wrap rounded border bg-white p-2 text-[11px]">
                {formatJson(step.raw.state?.input)}
              </pre>
            </div>
          )}
          {step.output !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Output</div>
              <pre className="whitespace-pre-wrap rounded border bg-white p-2 text-[11px]">
                {formatJson(step.output)}
              </pre>
            </div>
          )}
          {step.error && (
            <div>
              <div className="text-[10px] uppercase text-red-600">Error</div>
              <pre className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                {step.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </details>
  );
}

export function OpencodeSteps({ toolCallId }: OpencodeStepsProps) {
  const [events, setEvents] = useState<ParsedEvent[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ toolCallId });
    const es = new EventSource(`/api/opencode/steps?${params.toString()}`);

    es.onmessage = (e) => {
      setEvents((prev) => [...prev, parseEvent(e.data)]);
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [toolCallId]);

  const visibleEvents = useMemo(() => events.slice(-400), [events]);

  const { toolSteps, otherParts, rawEvents, responseText } = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ToolSummary>();
    const fallbackParts: OpencodePart[] = [];
    const leftovers: ParsedEvent[] = [];
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
        continue;
      }

      if (event.part) {
        fallbackParts.push(event.part);
        continue;
      }

      leftovers.push(event);
    }

    return {
      toolSteps: order.map((id) => map.get(id)!).filter(Boolean),
      otherParts: fallbackParts,
      rawEvents: leftovers,
      responseText: textOrder.map((id) => textMap.get(id) ?? '').join(''),
    };
  }, [visibleEvents]);

  if (visibleEvents.length === 0) {
    return (
      <div className="font-mono text-xs max-h-96 overflow-y-auto border rounded p-2 bg-gray-50 text-gray-900">
        <div className="text-gray-400">Waiting for events...</div>
      </div>
    );
  }

  return (
    <div className="font-mono text-xs max-h-96 overflow-y-auto border rounded p-2 bg-gray-50 text-gray-900 space-y-4">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-500">
          Steps · {toolSteps.length}
        </div>
        {toolSteps.map((step) => (
          <ToolStep key={step.callID} step={step} />
        ))}
      </div>

      {responseText && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Response</div>
          <div className="whitespace-pre-wrap rounded border bg-white/70 p-3 text-sm">{responseText}</div>
        </div>
      )}

      {(otherParts.length > 0 || rawEvents.length > 0) && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Other events</div>
          {otherParts.map((part, index) => (
            <pre
              key={`${part.id ?? 'part'}-${index}`}
              className="whitespace-pre-wrap rounded border bg-white/70 p-2 text-[11px]"
            >
              {formatJson(part)}
            </pre>
          ))}
          {rawEvents.map((event) => (
            <pre key={event.id} className="whitespace-pre-wrap rounded border bg-white/70 p-2 text-[11px]">
              {event.raw}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}
