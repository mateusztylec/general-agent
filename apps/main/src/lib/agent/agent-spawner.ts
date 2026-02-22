import type { AgentConfig } from '@general-agent/agent/config-types';
import { createOpencodeClient } from '@opencode-ai/sdk';
import {
  createAgentSession,
  type GetCredentialFn,
} from '@general-agent/sandbox/spawner';
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

  if (!agentConfig.sandbox?.e2bApiKeyCredentialId) {
    throw new Error('E2B API key credential is required. Please configure it in the Sandbox tab.');
  }
  const e2bCredential = await credFetcher(agentConfig.sandbox.e2bApiKeyCredentialId);
  const e2bApiKey = (e2bCredential.data as { apiKey: string }).apiKey;

  const session = await createAgentSession(
    agentConfig,
    llmEnvVars,
    credFetcher,
    undefined,
    e2bApiKey,
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
): Promise<{ text: string }> {
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

  const parts = messageResult.data?.parts ?? [];
  const text = parts
    .filter((p) => p.type === 'text' && 'text' in p)
    .map((p) => (p as { text: string }).text)
    .join('');

  return { text };
}
