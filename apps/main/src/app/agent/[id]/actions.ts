'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { db } from '@general-agent/database/client';
import { updateAgent } from '@general-agent/database/queries/agents';
import { auth } from '@/lib/auth';
import { parseAgentConfig } from '@general-agent/agent/config-types';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function updateAgentAction(
  id: string,
  data: { config?: unknown; name?: string }
) {
  const session = await getSession();

  if (data.config) {
    try {
      parseAgentConfig(data.config);
    } catch (error) {
      const details = error instanceof z.ZodError ? error.issues : String(error);
      throw new Error(`Invalid agent config format: ${JSON.stringify(details)}`);
    }
  }

  const updatePayload: { id: string; config?: unknown; name?: string } = { id };
  if (data.config !== undefined) updatePayload.config = data.config;
  if (data.name !== undefined) updatePayload.name = data.name;

  const updated = await updateAgent(db, updatePayload);

  if (!updated) throw new Error('Agent not found');

  return { success: true, agent: updated };
}
