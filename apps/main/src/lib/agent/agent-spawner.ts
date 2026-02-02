import type { AgentConfig } from '@general-agent/agent/config-types';
import {
  createAgentSession,
  executeAgentTask,
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
    console.log('[Agent Spawner] Fetching credential:', credentialId);

    const credential = await getCredentialByIdAndUser(db, credentialId, userId);
    const decryptedData = decryptCredentials(credential.data);

    return {
      type: credential.type,
      data: decryptedData,
    };
  };
}

/**
 * Spawns an agent OpenCode session (2-phase approach)
 * Phase 1: Create session and register in DB (frontend can start subscribing)
 * Phase 2: Execute task (events are streamed to frontend)
 */
export async function spawnAgentRun(
  agentConfig: AgentConfig,
  skillNames: string[],
  task: string,
  metadata: {
    userId: string;
    agentId: string;
  }
): Promise<{ toolCallId: string; sessionId: string }> {
  // Phase 1: Create session (DON'T send prompt yet)
  console.log('[Agent Spawner] Phase 1: Creating session...');
  const session = await createAgentSession(
    agentConfig,
    {
      AI_GATEWAY_API_KEY: serverEnv.VERCEL_AI_GATEWAY_API_KEY,
      OPENAI_API_KEY: serverEnv.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: serverEnv.ANTHROPIC_API_KEY,
    },
    createCredentialFetcher(metadata.userId),
    skillNames
  );

  const toolCallId = crypto.randomUUID();

  // Register in DB - frontend can now subscribe to events!
  console.log('[Agent Spawner] Registering session in DB...');
  await setOpencodeToolCall(toolCallId, {
    sessionId: session.sessionId,
    url: session.url,
    token: session.token,
    userId: metadata.userId,
    agentId: metadata.agentId,
  });

  // Phase 2: Execute task (events will be streamed)
  console.log('[Agent Spawner] Phase 2: Executing task...');
  void executeAgentTask(session, agentConfig, task).catch((error) => {
    console.error('[Agent Spawner] Phase 2 error:', error);
  });

  return {
    toolCallId,
    sessionId: session.sessionId,
  };
}

/**
 * Kill a running sandbox
 */
export { killSandbox as killAgent } from '@general-agent/sandbox/spawner';
