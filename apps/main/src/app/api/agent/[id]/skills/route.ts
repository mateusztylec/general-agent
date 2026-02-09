import { NextRequest } from 'next/server';
import { db } from '@general-agent/database/client';
import { getSkillsByIds } from '@general-agent/database/queries/skills';
import { getAgentById, updateAgent } from '@general-agent/database/queries/agents';
import { parseAgentConfig } from '@general-agent/agent/config-types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * GET /api/agent/[id]/skills - Get skills for an agent
 */
export async function GET(
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

    // Get agent and verify ownership
    const agent = await getAgentById(db, id);
    if (!agent || agent.userId !== session.user.id) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract custom skill IDs from config
    const config = parseAgentConfig(agent.config);
    const customSkillIds = config.skills?.custom || [];
    const skills = await getSkillsByIds(customSkillIds);

    return new Response(
      JSON.stringify({ skills }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get agent skills error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * PUT /api/agent/[id]/skills - Set skills for an agent (replaces all)
 */
export async function PUT(
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
    const { skillIds } = body;

    if (!Array.isArray(skillIds)) {
      return new Response(
        JSON.stringify({ error: 'skillIds must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get agent and verify ownership
    const agent = await getAgentById(db, id);
    if (!agent || agent.userId !== session.user.id) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update config with new skill IDs
    const config = parseAgentConfig(agent.config);
    const updatedConfig = {
      ...config,
      skills: {
        prebuilt: config.skills?.prebuilt || [],
        custom: skillIds,
      },
    };

    // Save updated config using query function
    await updateAgent(db, {
      id,
      config: updatedConfig,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Set agent skills error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
