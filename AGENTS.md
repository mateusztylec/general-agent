# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service | How to start | Port |
|---|---|---|
| PostgreSQL 16 | `docker compose up -d` (from repo root) | 5432 |
| Next.js dev server | `cd apps/main && bun run dev` | 3000 |

### Startup sequence

1. Start Docker daemon: `sudo dockerd &>/tmp/dockerd.log &` (wait ~3s, then `sudo chmod 666 /var/run/docker.sock`)
2. Start PostgreSQL: `docker compose up -d` (from repo root)
3. Run migrations: `cd packages/database && bun run db:migrate`
4. Start dev server: `cd apps/main && bun run dev`

### Non-obvious caveats

- **Biome lint**: Running `bun run lint` from `apps/main/` fails because biome's `useIgnoreFile: true` looks for `.gitignore` in `apps/main/` (none exists). Run lint from repo root instead: `cd /workspace && npx @biomejs/biome check --config-path apps/main`
- **Build fails**: `bun run build` has pre-existing module-not-found errors (`@/app/skills/actions`, `@general-agent/agent/skills/prebuilt`). The skills feature is WIP. The dev server (Turbopack) works fine since it lazily compiles.
- **Environment variables**: `apps/main/.env.local` is required. See `apps/main/.env.example` for the template. Key required vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CREDENTIALS_ENCRYPTION_KEY`. Generate secrets with `openssl rand -base64 32` and `openssl rand -hex 32`.
- **Docker in cloud VM**: Requires `fuse-overlayfs` storage driver and `iptables-legacy`. See daemon config at `/etc/docker/daemon.json`.
- **E2B/LLM API keys**: Not needed to start the app. They are stored per-user in the encrypted credential vault, not as global env vars.
- **Langfuse warnings**: Harmless `[Langfuse SDK] [WARN]` messages appear on startup when `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` are not set. These are optional and can be ignored.
- **Database config**: The drizzle config at `packages/database/drizzle.config.ts` loads env from `../../apps/main/.env.local`, so the `.env.local` file must exist before running migrations.
