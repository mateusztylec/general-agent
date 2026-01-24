type OpencodeToolCallEntry = {
  sessionId: string;
  url: string;
  token: string;
  updatedAt: number;
};

const JOB_TTL_MS = 15 * 60 * 1000;

// Use globalThis to share the Map across all Next.js route handlers
// Without this, each route handler gets its own module instance with separate Map
const globalForRegistry = globalThis as typeof globalThis & {
  __opcodeToolCallMap?: Map<string, OpencodeToolCallEntry>;
};

if (!globalForRegistry.__opcodeToolCallMap) {
  globalForRegistry.__opcodeToolCallMap = new Map<string, OpencodeToolCallEntry>();
}

const toolCallMap = globalForRegistry.__opcodeToolCallMap;

function cleanupExpiredJobs(now: number) {
  for (const [toolCallId, entry] of toolCallMap.entries()) {
    if (now - entry.updatedAt > JOB_TTL_MS) {
      toolCallMap.delete(toolCallId);
    }
  }
}

export function setOpencodeToolCall(
  toolCallId: string,
  data: { sessionId: string; url: string; token: string }
) {
  const now = Date.now();
  cleanupExpiredJobs(now);
  toolCallMap.set(toolCallId, { ...data, updatedAt: now });
  console.log('[JobRegistry] SET', { toolCallId, mapSize: toolCallMap.size });
}

export function getOpencodeToolCallDebug() {
  return Array.from(toolCallMap.keys());
}

export function getOpencodeToolCall(toolCallId: string) {
  const result = toolCallMap.get(toolCallId);
  console.log('[JobRegistry] GET', { toolCallId, found: !!result, allKeys: Array.from(toolCallMap.keys()) });
  return result;
}

export async function waitForOpencodeToolCall(
  toolCallId: string,
  opts: { timeoutMs: number; intervalMs: number }
) {
  const start = Date.now();
  while (Date.now() - start < opts.timeoutMs) {
    const entry = getOpencodeToolCall(toolCallId);
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, opts.intervalMs));
  }
  return undefined;
}
