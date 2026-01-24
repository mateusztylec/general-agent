import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@general-agent/database/client';
import { updateAgent } from '@general-agent/database/queries/agents';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { parseAgentConfig } from '@general-agent/agent/config-types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });


    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { config } = body;

    // Validate config structure
    try {
      parseAgentConfig(config);
    } catch (error) {
      const details = error instanceof z.ZodError ? error.errors : String(error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid agent config format',
          details 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update agent
    const updated = await updateAgent(db, {
      id,
      config,
    });

    if (!updated) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, agent: updated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Agent update error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
