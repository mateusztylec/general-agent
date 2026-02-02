import { NextRequest } from 'next/server';
import { db } from '@general-agent/database/client';
import * as schema from '@general-agent/database/schema';
import { eq, and } from 'drizzle-orm';
import { parseAgentConfig } from '@general-agent/agent/config-types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { spawnAgentRun } from '@/lib/agent/agent-spawner';
import { getSkillsForAgent } from '@general-agent/database/queries/skills';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id: agentId } = await params;
    const body = await request.json().catch(() => null);
    const task = typeof body?.task === 'string' ? body.task.trim() : '';

    if (!task) {
      return new Response(
        JSON.stringify({ error: 'Task is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load agent config from DB and verify ownership
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.id, agentId),
          eq(schema.agents.userId, session.user.id)
        )
      )
      .limit(1);

    if (!agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract config
    const config = parseAgentConfig(agent.config);
    const skills = await getSkillsForAgent(db, agentId);
    const skillNames = skills.map((skill) => skill.name);

    const run = await spawnAgentRun(config, skillNames, task, {
      userId: session.user.id,
      agentId,
    });

    return new Response(
      JSON.stringify(run),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
