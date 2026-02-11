import type { AgentConfig } from '@general-agent/agent/config-types';
import { createOpencodeClient } from '@opencode-ai/sdk';
import {
  createAgentSession,
  type GetCredentialFn,
  getSandboxInfo,
  killSandbox,
  setSandboxTimeout,
} from '@general-agent/sandbox/spawner';
import { serverEnv } from '@/lib/config/env-server';
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

function buildLlmEnvVars(
  agentConfig: AgentConfig,
  data: { apiKey: string; organization?: string; projectId?: string }
) {
  const llmEnvVars: Record<string, string> = {};

  if (agentConfig.llm.provider === 'openai') {
    llmEnvVars.OPENAI_API_KEY = data.apiKey;
    if (data.organization) {
      llmEnvVars.OPENAI_ORGANIZATION = data.organization;
    }
  } else if (agentConfig.llm.provider === 'anthropic') {
    llmEnvVars.ANTHROPIC_API_KEY = data.apiKey;
  } else if (agentConfig.llm.provider === 'google') {
    llmEnvVars.GOOGLE_API_KEY = data.apiKey;
    if (data.projectId) {
      llmEnvVars.GOOGLE_PROJECT_ID = data.projectId;
    }
  }

  if (serverEnv.VERCEL_AI_GATEWAY_API_KEY) {
    llmEnvVars.AI_GATEWAY_API_KEY = serverEnv.VERCEL_AI_GATEWAY_API_KEY;
  }

  return llmEnvVars;
}

export async function startAgentChatSession(
  agentConfig: AgentConfig,
  metadata: { userId: string }
) {
  if (!agentConfig.llm.apiKeyCredentialId) {
    throw new Error('LLM credential is required. Please configure a credential in the Config tab.');
  }

  console.log('[Agent Spawner] Starting chat session');
  const credFetcher = createCredentialFetcher(metadata.userId);
  const credential = await credFetcher(agentConfig.llm.apiKeyCredentialId);
  const data = credential.data as { apiKey: string; organization?: string; projectId?: string };
  const llmEnvVars = buildLlmEnvVars(agentConfig, data);
  const session = await createAgentSession(
    agentConfig,
    llmEnvVars,
    credFetcher
  );

  return {
    sandboxId: session.sandboxId,
    opencodeSessionId: session.sessionId,
    url: session.url,
    token: session.token,
  };
}

export async function sendAgentChatMessage(
  agentConfig: AgentConfig,
  task: string,
  session: {
    opencodeSessionId: string;
    url: string;
    token: string;
  }
) {
  const client = createOpencodeClient({
    baseUrl: session.url,
    headers: {
      'e2b-traffic-access-token': session.token,
    },
  });

  const messageResult = await client.session.prompt({
    path: { id: session.opencodeSessionId },
    body: {
      ...(agentConfig.llm?.systemPrompt
        ? { system: agentConfig.llm.systemPrompt }
        : {}),
      parts: [{ type: 'text', text: task }],
    },
  });

  if (messageResult.error) {
    throw new Error(
      `OpenCode prompt failed: ${JSON.stringify(messageResult.error)}`
    );
  }
}

/**
 * Kill a running sandbox
 */
export async function getAgentSandboxInfo(sandboxId: string) {
  return await getSandboxInfo(sandboxId);
}

export async function resetAgentTimeout(sandboxId: string, timeoutMs: number) {
  return await setSandboxTimeout(sandboxId, timeoutMs);
}

export async function killAgent(sandboxId: string) {
  await killSandbox(sandboxId);
}
