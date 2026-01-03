export type SSEParseResult = {
  events: string[];
  rest: string;
};

/**
 * Minimal SSE parser for "data: ..." lines separated by a blank line.
 * Returns raw `data` payload strings (one per SSE event).
 */
export function parseSSE(buffer: string): SSEParseResult {
  const normalized = buffer.replaceAll("\r\n", "\n");
  const parts = normalized.split("\n\n");

  // If the buffer doesn't end with a full event separator, keep the tail as rest.
  const rest = normalized.endsWith("\n\n") ? "" : (parts.pop() ?? "");
  const events: string[] = [];

  for (const part of parts) {
    const lines = part.split("\n");
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trimStart());
    }
    if (dataLines.length > 0) events.push(dataLines.join("\n"));
  }

  return { events, rest };
}


