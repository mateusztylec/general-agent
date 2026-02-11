import { pgTable, text, timestamp, jsonb, uuid, boolean } from 'drizzle-orm/pg-core';

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// Application tables
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Credentials table - stores encrypted secrets separately from agent config
export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // User-friendly name like "Production OpenAI Key"
  type: text('type').notNull(), // Type: 'llm_api_key', 's3_credentials', 'aws_credentials', etc.
  data: text('data').notNull(), // Encrypted JSON containing the actual credentials
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Chat sessions - persistent bridge between one chat and one sandbox/OpenCode session
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  sandboxId: text('sandbox_id'), // E2B sandbox ID
  opencodeSessionId: text('opencode_session_id'), // OpenCode session ID for event filtering
  url: text('url'), // E2B sandbox URL (e.g., https://xxx.e2b.dev)
  token: text('token'), // E2B traffic access token
  status: text('status').notNull().default('closed'), // 'active' | 'closed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Custom Skills - user-created reusable code modules stored as files on disk
// Files are stored at /app/data/skills/{name}/ and referenced by globally unique name
// NOTE: Pre-built skills (e.g., from anthropics/skills) are NOT stored here
// They are defined in code and referenced by name in agent.config.skills.prebuilt
export const customSkills = pgTable('custom_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull().unique(), // Globally unique, immutable, used as folder name
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Inferred row types for use throughout the app
export type Agent = typeof agents.$inferSelect;
export type Credential = typeof credentials.$inferSelect;
export type CustomSkill = typeof customSkills.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type User = typeof user.$inferSelect;
