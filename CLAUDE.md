# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-agent AI orchestration system where a main agent (Claude) can spawn specialized subagents in secure E2B sandboxes running OpenCode for autonomous task execution.

## Commands

### Development
```bash
# Install dependencies (from root)
bun install

# Start PostgreSQL
docker-compose up -d

# Start dev server
cd apps/main && bun run dev

# Linting and formatting
cd apps/main && bun run lint
cd apps/main && bun run format
```

### Database
```bash
# From packages/database
bun run db:generate   # Generate migrations
bun run db:migrate    # Apply migrations
bun run db:studio     # Open Drizzle Studio GUI
```

### E2B Template (optional, speeds up sandbox spawning)
```bash
cd packages/sandbox && bun run build-template
```

## Architecture

```
User → ChatInterface → /api/agent/[id]/chat → Main Agent (Claude)
                                                    ↓
                                            spawnSubagent tool
                                                    ↓
                                            E2B Sandbox
                                            └─ OpenCode Server (:4096)
                                               └─ HTTP API (authenticated)
```

### Monorepo Structure
- `apps/main` - Next.js 16 app with UI and API routes
- `packages/database` - Shared Drizzle ORM schema and client
- `packages/tsconfig` - Shared TypeScript config

### Key Files
| Path | Purpose |
|------|---------|
| `apps/main/src/app/api/agent/[id]/chat/route.ts` | Main agent API with tool calling |
| `apps/main/src/lib/agent/subagent-spawner.ts` | E2B sandbox + OpenCode integration |
| `apps/main/src/lib/config/agent-config-types.ts` | Zod schemas for agent config |
| `packages/database/src/schema.ts` | Database schema (agents table) |

### Technology Stack
- **Bun** - Package manager (1.2.22+)
- **Next.js 16** - App Router, React 19
- **Vercel AI SDK v6** - Streaming, tool calling
- **Anthropic Claude** - Main agent LLM
- **Drizzle ORM** - Type-safe PostgreSQL access
- **E2B** - Secure sandbox execution
- **OpenCode AI SDK** - Subagent CLI
- **Biome** - Linting and formatting (not ESLint)

### Agent Configuration

Stored as JSONB in `agents.config`:
```typescript
{
  name: "My Agent System",
  mainAgent: {
    systemPrompt: "...",
    model: "claude-sonnet-4-5-20250929"
  },
  subagents: [{
    name: "Python Specialist",
    systemPrompt: "...",
    description: "Use when...",
    skills: ["python-expert"],
    storage: [],
    tools: { bash: true, edit: true }
  }]
}
```

### Skills System

Skills are folders in `apps/main/skills/` containing a `SKILL.md` file. At spawn time, they're copied to `/home/user/.opencode/skills/` in the sandbox.

### Routing
- `/` - Agent dashboard
- `/agent/[id]` - Visual editor (ReactFlow)
- `/agent/[id]/chat` - Chat interface
- `POST /api/agent/[id]/chat` - Streaming chat API

## Design Decisions

1. **JSON Config over UI State** - ReactFlow generates UI from config, not stored separately
2. **No Nested Subagents** - Main → Subagent only (no chains)
3. **Skills = Folders** - Skill name is the folder name
4. **E2B Security** - All subagent code runs in sandboxes with `secure: true`, requires traffic access token

## Environment Variables

Required in `apps/main/.env.local`:
```bash
DATABASE_URL=postgresql://agent:agent_dev_password@localhost:5432/agent_db
ANTHROPIC_API_KEY=sk-ant-xxx
E2B_API_KEY=e2b_xxx
OPENAI_API_KEY=sk-xxx  # For subagents
```

Optional:
```bash
LANGFUSE_PUBLIC_KEY=xxx
LANGFUSE_SECRET_KEY=xxx
```
