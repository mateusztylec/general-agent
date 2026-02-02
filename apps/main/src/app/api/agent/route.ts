import { NextRequest } from 'next/server';
import { db } from '@general-agent/database/client';
import { createAgent } from '@general-agent/database/queries/agents';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * POST /api/agent - Create a new agent
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create agent with default config
    const defaultConfig = {
      llm: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        systemPrompt: '',
      },
      tools: {},
      sandbox: {
        internetAccess: false,
      },
    };

    const agent = await createAgent(db, {
      userId: session.user.id,
      name: name.trim(),
      config: defaultConfig,
    });

    return new Response(
      JSON.stringify({ agent }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create agent error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
