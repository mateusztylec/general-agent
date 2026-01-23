import dotenv from 'dotenv';
import { db, schema } from './index';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Delete existing agents
    await db.delete(schema.agents);
    console.log('✅ Cleared existing agents');

    // Insert test agent
    const [agent] = await db.insert(schema.agents).values({
      name: 'Test Agent with Subagent',
      config: {
        name: 'Test Agent with Subagent',
        mainAgent: {
          systemPrompt: 'You are a helpful coding assistant. When you need to execute code or perform complex tasks, use the spawnSubagent tool to delegate work to a specialized subagent running in a secure E2B sandbox with OpenCode.',
          model: 'claude-sonnet-4-5-20250929',
        },
        subagents: [
          {
            name: 'Code Executor',
            systemPrompt: 'You are an expert code executor. You have access to a full development environment. Execute code, run commands, and provide detailed results.',
            description: 'Use when code execution or file manipulation is needed',
            skills: [], // No skills for now
            storage: [],
            tools: {
              "write": true,
              "read": true,
              "grep": true,
              "glob": true,
              "list": true,
              "lsp": true,
              "patch": true,
              "skill": true,
              "todowrite": true,
              "todoread": true,
              "webfetch": true,
              "question": true,
            }
          },
        ],
      },
    }).returning();

    console.log('✅ Created test agent:', {
      id: agent.id,
      name: agent.name,
    });

    console.log('\n🎉 Seeding complete!');
    console.log(`\nTest the agent at: http://localhost:3000/agent/${agent.id}/chat`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seed();
