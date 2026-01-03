const SANDBOX_URL = process.env.SANDBOX_WORKER_URL || 'http://localhost:8787';

interface ExecResult {
  stdout: string;
  stderr: string;
  success: boolean;
  exitCode?: number;
  error?: string;
}

interface ReadResult {
  content: string;
  success: boolean;
  error?: string;
}

interface WriteResult {
  success: boolean;
  error?: string;
}

async function sandboxFetch<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  console.log('[sandbox] request', {
    url: `${SANDBOX_URL}${endpoint}`,
    body,
  });

  const response = await fetch(`${SANDBOX_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[sandbox] error', {
      url: `${SANDBOX_URL}${endpoint}`,
      status: response.status,
      body,
      responseText: text,
    });
    throw new Error(`Sandbox error: ${response.status} - ${text}`);
  }

  const json = (await response.json()) as T;
  console.log('[sandbox] response', { url: `${SANDBOX_URL}${endpoint}`, ok: true });
  return json;
}

export const sandboxClient = {
  /**
   * Execute a command in the sandbox
   */
  async exec(command: string): Promise<ExecResult> {
    return sandboxFetch<ExecResult>('/sandbox/exec', { command });
  },

  /**
   * Read a file from the sandbox
   */
  async readFile(path: string): Promise<ReadResult> {
    return sandboxFetch<ReadResult>('/sandbox/read', { path });
  },

  /**
   * Write a file to the sandbox
   */
  async writeFile(path: string, content: string): Promise<WriteResult> {
    return sandboxFetch<WriteResult>('/sandbox/write', { path, content });
  },
};
