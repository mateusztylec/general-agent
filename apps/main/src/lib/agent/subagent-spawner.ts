import type { SubagentConfig } from '@general-agent/agent/config-types';
import {
  createSubagentSession,
  executeSubagentTask,
  type SpawnSubagentResult,
  type GetCredentialFn,
} from '@general-agent/sandbox/spawner';
import { serverEnv } from '@/lib/config/env-server';
import { setOpencodeToolCall } from '@/lib/agent/opencode-job-registry';
import { db } from '@general-agent/database/client';
import { getCredentialByIdAndUser } from '@general-agent/database/queries/credentials';
import { decryptCredentials } from '@general-agent/encryption/credentials';

/**
 * Creates a credential fetcher function for a specific user
 */
function createCredentialFetcher(userId: string): GetCredentialFn {
  return async (credentialId: string) => {
    console.log('[Subagent Spawner] Fetching credential:', credentialId);

    const credential = await getCredentialByIdAndUser(db, credentialId, userId);
    const decryptedData = decryptCredentials(credential.data);

    return {
      type: credential.type,
      data: decryptedData,
    };
  };
}

/**
 * Spawns a subagent on E2B sandbox with OpenCode (2-phase approach)
 * Phase 1: Create session and register in DB (frontend can start subscribing)
 * Phase 2: Execute task (events are streamed to frontend)
 */
export async function spawnSubagent(
  subagentConfig: SubagentConfig,
  task: string,
  toolCallId: string,
  metadata: {
    userId: string;
    agentId: string;
  }
): Promise<SpawnSubagentResult> {

  // Phase 1: Create session (DON'T send prompt yet)
  console.log('[Subagent Spawner] Phase 1: Creating session...');
  const session = await createSubagentSession(
    subagentConfig,
    {
      AI_GATEWAY_API_KEY: serverEnv.VERCEL_AI_GATEWAY_API_KEY,
      OPENAI_API_KEY: serverEnv.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: serverEnv.ANTHROPIC_API_KEY,
    },
    createCredentialFetcher(metadata.userId)
  );

  // Register in DB - frontend can now subscribe to events!
  console.log('[Subagent Spawner] Registering session in DB...');
  await setOpencodeToolCall(toolCallId, {
    sessionId: session.sessionId,
    url: session.url,
    token: session.token,
    userId: metadata.userId,
    agentId: metadata.agentId,
  });

  // Phase 2: Execute task (events will be streamed)
  console.log('[Subagent Spawner] Phase 2: Executing task...');
  const result = await executeSubagentTask(session, subagentConfig, task);

  return result;
}

/**
 * Kill a running sandbox
 */
export { killSandbox as killSubagent } from '@general-agent/sandbox/spawner';
