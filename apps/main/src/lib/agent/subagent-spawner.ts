import type { SubagentConfig } from '@general-agent/agent/config-types';
import { spawnSubagent as spawnSandboxSubagent, type SpawnSubagentResult } from '@general-agent/sandbox/spawner';
import { serverEnv } from '@/lib/config/env-server';
import { setOpencodeToolCall } from '@/lib/agent/opencode-job-registry';

/**
 * Spawns a subagent on E2B sandbox with OpenCode
 * Thin wrapper that gets env vars and handles job registry
 */
export async function spawnSubagent(
  subagentConfig: SubagentConfig,
  task: string,
  toolCallId: string
): Promise<SpawnSubagentResult> {
  const result = await spawnSandboxSubagent(
    subagentConfig,
    task,
    {
      AI_GATEWAY_API_KEY: serverEnv.VERCEL_AI_GATEWAY_API_KEY,
      OPENAI_API_KEY: serverEnv.OPENAI_API_KEY,
    }
  );

  // Register tool call for job tracking
  setOpencodeToolCall(toolCallId, {
    sessionId: result.sessionId,
    url: result.url,
    token: result.token,
  });

  return result;
}

/**
 * Kill a running sandbox
 */
export { killSandbox as killSubagent } from '@general-agent/sandbox/spawner';
