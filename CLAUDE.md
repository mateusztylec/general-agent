# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **General Agent** platform - a web application that enables users to create and configure AI agents that execute tasks through E2B sandboxes running OpenCode (an open-source AI coding agent). The project demonstrates how to integrate E2B's sandboxing technology with OpenCode for agent orchestration.

## Development Commands

### Setup
```bash
# Install dependencies (requires Bun)
bun install

# Start PostgreSQL database
docker-compose up -d

# Run database migrations
cd packages/database && bun run db:migrate

# Seed database (optional)
cd packages/database && bun run db:seed
```

### Development
```bash
# Start Next.js dev server (from root or apps/main)
cd apps/main && bun run dev

# Lint all code
cd apps/main && bun run lint

# Format code
cd apps/main && bun run format

# Build for production
cd apps/main && bun run build
```

### Database Operations
```bash
# Generate new migration after schema changes
cd packages/database && bun run db:generate

# Apply migrations
cd packages/database && bun run db:migrate

# Open Drizzle Studio (database GUI)
cd packages/database && bun run db:studio
```

### Sandbox Template
```bash
# Build E2B template with OpenCode
cd packages/sandbox && bun run build-template
```

## Monorepo Structure

**Apps:**
- `apps/main` - Next.js web application (primary UI and API server, runs on port 3000)
- `apps/web` - Lightweight web app (minimal, currently unused)

**Packages:**
- `@general-agent/agent` - Agent configuration schemas and OpenCode config builder
- `@general-agent/database` - Drizzle ORM setup, schema definitions, database queries
- `@general-agent/sandbox` - E2B sandbox spawning and OpenCode session management
- `@general-agent/encryption` - AES-256-GCM encryption for credential vault
- `@general-agent/tsconfig` - Shared TypeScript configuration

## High-Level Architecture

### 2-Phase Agent Execution Pattern

**Phase 1 - Session Registration:**
1. Create E2B sandbox with custom template (`general-agent-opencode`)
2. Upload skills to `~/.opencode/skills/`
3. Write agent config to `~/.config/opencode/opencode.json`
4. Start OpenCode server in background (port 4096 with HTTPS)
5. Register session metadata in `opencode_sessions` table (15-minute TTL)

**Phase 2 - Task Execution:**
1. Frontend subscribes to `/api/opencode/steps` (Server-Sent Events)
2. Poll database until session registration is found
3. Stream events from OpenCode sandbox to frontend
4. Clean up session entry after completion

### Agent Architecture Pattern

Each **agent** runs as a single OpenCode instance inside its own E2B sandbox.
There is no in-process "main agent" or separate subagent layer.

### Visual Agent Configuration

ReactFlow-based graph editor in `apps/main/src/components/agent-editor.tsx`:
- Node-based interface for building multi-agent systems
- Property sheets for configuring tools, skills, storage, and sandbox settings
- Real-time validation with Zod schemas
- Serializes to/from database as JSONB

### Agent Configuration Schema

Located in `packages/agent/src/config-types.ts`:

```typescript
AgentConfig {
  llm: {
    provider: "openai" | "anthropic" | "google"
    model: string
    systemPrompt: string
    apiKeyCredentialId: string
    small_model?: string
  }
  tools: { [toolName]: boolean }
  permission: { [toolName]: "allow" | "deny" }
  storage: [{ type: "s3" | "r2", credentialId: string, ... }]
  sandbox: { internetAccess: boolean }
}
```

Tool definitions are in `AGENT_TOOL_DEFINITIONS` - these are the core capabilities agents can access.

### Database Schema (Drizzle + PostgreSQL)

**Better Auth Tables:**
- `user` - User accounts with email verification
- `session` - Session tokens
- `account` - OAuth/provider accounts
- `verification` - Email verification codes

**Application Tables:**
- `agents` - Agent configurations (JSONB `config` column stores full AgentConfig)
- `credentials` - Encrypted credentials vault (AES-256-GCM)
- `opencode_sessions` - Temporary bridge for streaming (15-minute TTL, auto-cleanup)

Migrations are sequential in `packages/database/migrations/` (0000 → 0003).

### E2B Sandbox Integration

Key files:
- `packages/sandbox/src/spawner.ts` - Sandbox lifecycle management
- `packages/sandbox/src/template.ts` - Custom E2B template configuration

**Sandbox Lifecycle:**
1. Create sandbox with internet access toggle
2. Upload files (skills) via `sandbox.files.write()`
3. Start OpenCode server: `nohup opencode serve --host 0.0.0.0 --port 4096`
4. Poll health endpoint with retries
5. Secure traffic with `e2b-traffic-access-token` header
6. 5-minute timeout for long-running tasks

**Template:** Custom E2B template named `general-agent-opencode` with OpenCode pre-installed.

### Authentication (better-auth)

Implementation in `apps/main/src/lib/auth.ts` and `auth-client.ts`:
- Email/password authentication
- Drizzle adapter for PostgreSQL
- Session-based tokens
- Protected API routes check session via `auth.api.getSession()`
- All auth routes mounted at `/api/auth/[...all]`

### Encrypted Credential Vault

Located in `packages/encryption/`:
- AES-256-GCM encryption with database-stored encrypted data
- Support for multiple credential types: `api-key`, `s3`, `aws`, `custom`
- Credentials referenced by ID in agent configs (never embedded directly)
- Encryption key must be stored in environment variable

### API Routes Architecture

Key routes in `apps/main/src/app/api/`:

**Agent Management:**
- `GET /api/agent` - List all agents
- `POST /api/agent` - Create new agent
- `GET /api/agent/[id]` - Get agent details
- `PATCH /api/agent/[id]` - Update agent config
- `DELETE /api/agent/[id]` - Delete agent
- `POST /api/agent/[id]/chat` - Stream chat with tool calling (main agent)

**Sandbox Execution:**
- `POST /api/opencode/spawn` - Phase 1: Create sandbox + register session
- `GET /api/opencode/steps` - Phase 2: Stream events via SSE

**Credentials:**
- `GET /api/credential` - List all credentials
- `POST /api/credential` - Create encrypted credential
- `DELETE /api/credential/[id]` - Delete credential

All routes check authentication via better-auth sessions.

## Environment Configuration

Required environment variables in `apps/main/.env.local` (see `.env.example`):

```bash
DATABASE_URL=postgresql://agent:agent_dev_password@localhost:5432/agent_db
E2B_API_KEY=           # Required for sandbox spawning
ANTHROPIC_API_KEY=     # Required for Claude models
BETTER_AUTH_SECRET=    # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Optional
OPENAI_API_KEY=        # For OpenAI models
LANGFUSE_PUBLIC_KEY=   # For observability
LANGFUSE_SECRET_KEY=
```

## Important Architectural Decisions

1. **Job Registry Pattern**: Use `opencode_sessions` table as temporary storage for sandbox metadata, enabling stateless horizontal scaling with automatic TTL cleanup.

2. **Configuration-as-Code**: Agent capabilities defined via JSON config written to sandbox filesystem, allowing runtime modification of tool availability.

3. **Separate Credential Storage**: Never embed API keys in agent configs - always reference by `credentialId` for security and rotation flexibility.

4. **Server-Sent Events for Streaming**: Use SSE instead of WebSockets for real-time sandbox events - simpler implementation, automatic reconnection, works through proxies.

5. **Two-Phase Spawning**: Separate session creation from task execution to reduce latency for event streaming and enable frontend subscription before task starts.

## Common Patterns

### Adding a New Tool to Agents

1. Add tool definition to `AGENT_TOOL_DEFINITIONS` in `packages/agent/src/config-types.ts`
2. Update `AvailableToolSchema` and related maps if needed
3. OpenCode will automatically recognize the tool if it's built-in

### Creating a Custom Skill

1. Write skill as standalone script (bash, python, etc.)
2. Upload via agent editor UI or directly to sandbox
3. Attach the skill to the agent (UI saves to `agent_skills`)
4. Skills are uploaded to `~/.opencode/skills/` during sandbox initialization

### Adding a New Credential Type

1. Add type to `CredentialType` enum in `packages/database/src/schema.ts`
2. Update frontend credential form in agent editor
3. Encryption/decryption is automatic via `packages/encryption`

## Linting and Code Quality

- **Linter**: Biome (not ESLint/Prettier)
- **Config**: `apps/main/biome.json`
- Check: `bun run lint`
- Fix: `bun run format`
