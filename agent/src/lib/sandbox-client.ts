const SANDBOX_URL = process.env.SANDBOX_WORKER_URL || "http://localhost:8787";

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
  const response = await fetch(`${SANDBOX_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sandbox error: ${response.status} - ${text}`);
  }

  return (await response.json()) as T;
}

export const sandboxClient = {
  async exec(command: string): Promise<ExecResult> {
    return sandboxFetch<ExecResult>("/sandbox/exec", { command });
  },

  async readFile(path: string): Promise<ReadResult> {
    return sandboxFetch<ReadResult>("/sandbox/read", { path });
  },

  async writeFile(path: string, content: string): Promise<WriteResult> {
    return sandboxFetch<WriteResult>("/sandbox/write", { path, content });
  },
};


