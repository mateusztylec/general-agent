import * as dotenv from 'dotenv';
import { db } from '@database/client';
import * as schema from '@database/schema';

// Load environment variables
dotenv.config({ path: '../../.env.local' });

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Get first user or create a test user
    let [testUser] = await db.select().from(schema.user).limit(1);

    if (!testUser) {
      [testUser] = await db.insert(schema.user).values({
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      console.log('✅ Created test user');
    }

    if (!testUser) {
      throw new Error('Failed to get or create test user');
    }

    // Delete existing agents
    await db.delete(schema.agents);
    console.log('✅ Cleared existing agents');

    // Insert test agent
    const [agent] = await db.insert(schema.agents).values({
      userId: testUser.id,
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

    if (!agent) {
      throw new Error('Failed to create test agent');
    }

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
