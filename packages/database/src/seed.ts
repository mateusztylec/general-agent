import * as dotenv from 'dotenv';
import { and, eq, isNotNull } from 'drizzle-orm';

// Load env FIRST, before importing db (which creates the connection pool)
dotenv.config({ path: 'apps/main/.env.local' });

const DEFAULT_TEST_EMAIL = 'test@example.com';
const DEFAULT_TEST_NAME = 'Test User';

async function createTestUserViaAuthApi(params: {
  name: string;
  email: string;
  password: string;
}) {
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Failed to sign up test user via ${baseUrl}/api/auth/sign-up/email: ` +
        `${response.status} ${response.statusText} ${bodyText}`,
    );
  }
}

async function seed() {
  console.log('🌱 Seeding database...');

  // Import db and schema AFTER dotenv.config() has run
  const { db } = await import('./client.js');
  const schema = await import('./schema.js');

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not set. Add it to apps/main/.env.local or your shell env.',
      );
    }

    try {
      const parsedUrl = new URL(databaseUrl);
      if (!parsedUrl.password) {
        throw new Error(
          'DATABASE_URL has no password segment. ' +
            'Expected format: postgresql://user:password@host:port/db',
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('DATABASE_URL is invalid.');
    }

    const testEmail = process.env.TEST_USER_EMAIL || DEFAULT_TEST_EMAIL;
    const testName = process.env.TEST_USER_NAME || DEFAULT_TEST_NAME;
    const testPassword = process.env.TEST_USER_PASSWORD;

    // Get test user by email or create a local dev user
    let [testUser] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, testEmail))
      .limit(1);

    if (testPassword) {
      const [passwordAccount] = testUser
        ? await db
            .select()
            .from(schema.account)
            .where(
              and(
                eq(schema.account.userId, testUser.id),
                isNotNull(schema.account.password),
              ),
            )
            .limit(1)
        : [];

      if (!testUser || !passwordAccount) {
        try {
          await createTestUserViaAuthApi({
            name: testName,
            email: testEmail,
            password: testPassword,
          });
          [testUser] = await db
            .select()
            .from(schema.user)
            .where(eq(schema.user.email, testEmail))
            .limit(1);
          console.log('✅ Created test user via auth API');
        } catch (error) {
          if (!testUser) {
            throw error;
          }
          console.warn(
            '⚠️ Failed to create test user via auth API. ' +
              'Existing user will be used without a password.',
          );
        }
      }
    } else if (!testUser) {
      [testUser] = await db
        .insert(schema.user)
        .values({
          id: 'utiEEe9kc3hDOyDTh2hFOSWw9LOaYc29',
          name: testName,
          email: testEmail,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      console.log('✅ Created test user (no password set)');
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
              "bash": true,
              "edit": true,
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
