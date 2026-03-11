# AgentTerminal - Session Save

**Date**: 2026-03-11
**Repo**: https://github.com/superaicoder/AgentTerminal
**Branch**: main
**Commit**: `6fdab4b` - Initial scaffold

---

## What Was Done

### Step 1: Monorepo Scaffold - DONE
- pnpm workspace + turbo.json + tsconfig.base.json
- docker-compose.yml (PostgreSQL 16 + Redis 7)
- `.env.example`, `.gitignore`
- packages/shared (types.ts, constants.ts)

### Step 2: Database + Auth - DONE
- Drizzle schema: user_profile, conversation, message, usage_log + Better Auth tables (user, session, account, verification)
- Migration generated and applied (`drizzle/0000_fearless_jane_foster.sql`)
- Better Auth config: email/password, cookie session, 8h expiry, drizzle adapter
- `requireAuth` + `requireRole` middleware
- Seed script: admin user `admin@agent.local` / `admin123456` - seeded successfully

### Step 3: Frontend Auth - DONE
- Login page (`/login`) with email/password form
- `auth-client.ts` using `better-auth/react`
- Root page redirects to `/chat` or `/login` based on session
- Chat layout checks session, redirects if unauthenticated

### Step 4: Conversation CRUD - DONE
- API routes: GET/POST/PATCH/DELETE `/api/conversations`, GET `/api/conversations/:id/messages`
- ChatSidebar component with new/delete/select
- useConversations hook

### Step 5: Claude Service - DONE (needs e2e test)
- `services/claude.ts`: spawn `claude -p --output-format stream-json --verbose`
- Unsets `CLAUDECODE` env var to allow nested spawning
- Parser handles actual claude stream-json format:
  - `{"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}`
  - `{"type":"result","session_id":"...","usage":{...}}`
- Handles cancellation via AbortSignal → SIGTERM

### Step 6: BullMQ Queue + SSE - DONE (needs e2e test)
- Queue setup with Redis connection, `chat-queue`
- Worker with concurrency: 1
- Worker spawns claude, publishes deltas to Redis pub/sub `chat:{jobId}`
- SSE endpoint subscribes to Redis channel, pipes to browser
- POST `/api/chat/send` → enqueue → return jobId + position
- GET `/api/chat/stream/:jobId` → SSE with 5min timeout
- POST `/api/chat/stop/:jobId` → abort controller

### Step 7: Chat UI - DONE
- ChatInput (textarea, Enter to send, Shift+Enter newline, Stop button)
- useChat hook (POST send → SSE stream → accumulate text)
- MessageBubble (user=blue, assistant=gray, markdown rendering with react-markdown)
- MessageList (auto-scroll, queue position display, "Thinking..." indicator)

### Step 8: Rate Limiting + Quota - DONE
- express-rate-limit with Redis store (per-minute by role)
- Redis daily counter `quota:{userId}:{date}` with 24h TTL
- GET `/api/quota/me` endpoint
- Admin: 20/min, 500/day | Manager: 10/min, 200/day | User: 5/min, 100/day

### Step 9: Admin Page - DONE
- User list with role dropdown + active toggle
- Usage stats table (tokens, requests per user/model)
- 403 handling for non-admin users

### Step 10: Polish - PARTIAL
- Dark/light mode via CSS prefers-color-scheme
- Error handling in API + frontend
- Health check endpoint `/api/health`
- **TODO**: responsive sidebar toggle, loading skeletons

---

## Verified Working

| Test | Result |
|------|--------|
| `pnpm dev` boots both API + Web | API :3001, Web :3000 |
| Health check `GET /api/health` | `{"status":"ok"}` |
| Login `POST /api/auth/sign-in/email` | Returns token + user |
| Create conversation | Returns new conversation |
| List conversations | Returns array |
| Get quota | `{"used":0,"limit":500,"remaining":500}` |
| Admin users list | Returns user profiles |
| Admin usage stats | Returns empty (no usage yet) |
| Chat send (enqueue) | Returns `{jobId, position}` |
| SSE stream connects | OK |
| Login page renders | 200 OK |

---

## Known Issues / TODO

1. **Claude stream-json e2e test not completed** - The spawn works, format is verified, parser is updated, but full flow (send → queue → spawn → stream → SSE → browser) wasn't tested end-to-end in this session
2. **`--resume` flag** - Need to verify claude session resume works with the session_id from previous result
3. **Responsive sidebar** - No mobile hamburger menu yet
4. **Loading states** - No skeleton loaders
5. **Dark/light toggle button** - Currently auto from system preference only
6. **Conversation auto-title** - Could auto-generate title from first message

---

## Key Technical Decisions

- **Better Auth tables in Drizzle schema**: Must define user/session/account/verification tables in `schema.ts` for drizzle adapter to find them
- **Express 4 wildcard**: Use `app.all("/api/auth/*", handler)` not `*splat` (Express 5 syntax)
- **claude CLI**: Requires `--verbose` flag with `--output-format stream-json` in `-p` mode
- **CLAUDECODE env var**: Must be deleted from spawn env to avoid "nested session" error
- **Prisma override**: Better Auth pulls prisma as optional dep; overridden with `noop-package` in pnpm overrides

---

## Environment

- Node.js v23.6.0
- pnpm 9.14.1
- Claude Code 2.1.72
- Docker Desktop (PostgreSQL 16-alpine, Redis 7-alpine)
- macOS Darwin 24.1.0

---

## How to Resume Development

```bash
cd /Volumes/CORSAIR/Disk/ForFun/AgentTerminal

# Start services
docker compose up -d

# Install deps (if needed)
pnpm install --ignore-scripts

# Run migrations (if DB was reset)
export DATABASE_URL=postgresql://agent:agent_secret@localhost:5432/agent_terminal
cd apps/api && npx drizzle-kit migrate && cd ../..

# Seed admin (if DB was reset)
cd apps/api && npx tsx src/db/seed.ts && cd ../..

# Dev
pnpm dev
# API: http://localhost:3001
# Web: http://localhost:3000
# Login: admin@agent.local / admin123456
```
