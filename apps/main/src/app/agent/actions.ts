'use server';

import { db } from '@general-agent/database/client';
import { createAgent } from '@general-agent/database/queries/agents';
import { getSession } from '@/lib/auth';

export async function createAgentAction(name: string) {
  const session = await getSession();

  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');

  const defaultConfig = {
    llm: {
      provider: 'anthropic' as const,
      model: 'anthropic/claude-sonnet-4-5-20250929',
      systemPrompt: '',
      apiKeyCredentialId: '',
    },
    tools: {},
    sandbox: {},
  };

  const agent = await createAgent(db, {
    userId: session.user.id,
    name: trimmed,
    config: defaultConfig,
  });

  return { agent };
}
