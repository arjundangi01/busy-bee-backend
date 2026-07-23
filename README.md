# Busy Bee Backend

AI Mission Control API — Node.js, TypeScript, Express, Prisma 7 (PostgreSQL).

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL, SESSION_TOKEN_SECRET, ANTHROPIC_API_KEY
npm install
npx prisma migrate dev   # applies the committed migrations to your database
```

`npm install` also generates the Prisma client (via `@prisma/client`'s own postinstall step) — no manual `prisma generate` needed. The app boots without one, but throws a clear startup error if `DATABASE_URL` or `SESSION_TOKEN_SECRET` is missing. `ANTHROPIC_API_KEY` is only required for the AI mission-breakdown call (`POST /missions/plan`) — everything else runs without it. `REVENUECAT_WEBHOOK_SECRET` is optional for the same reason — no real RevenueCat account/products exist yet; `POST /webhooks/revenuecat` rejects every request until it's set for real.

## Run

```bash
npm run dev     # ts-node-dev, hot reload
npm run build   # tsc + path alias rewrite -> dist/
npm start        # run the built output
```

## Verify

```bash
curl http://localhost:4000/api/health
# { "success": true, "message": "success", "data": { "status": "ok", "timestamp": "..." } }
```

## Structure

See [`code-practice-be.md`](../code-practice-be.md) at the project root for the full conventions this app follows (feature-folder pattern, `AppError`, `SuccessResponse`/`ErrorResponse`, enums over raw strings, etc.). `lib/routes/health/` is a working example of the feature-folder convention — copy its shape (`index.ts` router / `routes.ts` handlers / `helpers.ts` business logic) for new features.

## Routes

- `POST /api/auth/sign-up`, `POST /api/auth/sign-in`, `GET /api/auth/me` — email/password auth, HMAC-signed session token (`lib/utils/helpers/sessionToken.ts`, `lib/middleware/auth.ts`). Social login (Apple/Google) is not wired up yet.
- `POST /api/missions/plan` — free-text task → Claude API (`claude-opus-4-8`) → next-smallest-step preview (not persisted until `POST /missions`)
- `POST /api/missions`, `GET /api/missions`, `GET /api/missions/:missionId`, `POST /api/missions/:missionId/tasks/:taskId/complete` — mission/task CRUD
- `GET /api/dashboard` — streak, backlog, time-reclaimed, 7-day trend, today summary, pattern signal
- `GET /api/progress` — all-time best streak, 30-day calendar (with a no-history state for pre-account days), 8-week rolling time-reclaimed/focus-duration buckets, best focus window, toughest weekday, distraction attempts this week
- `POST /api/focus-sessions`, `POST /api/focus-sessions/:id/blocked-attempt`, `POST /api/focus-sessions/:id/end` — session start/end, elapsed time, block-attempt count (UI-only stub, no real OS-level enforcement — see `design-artifacts/E-Development/DD-001-implementation-plan.md` Open Item 1). Free-tier callers are also gated against `PlanLimits` (see below): a 3rd same-day session is rejected (`403 SESSION_CAP_REACHED`), and `end` clamps `elapsedSeconds`/forces `sessionEndReason: TIME_LIMIT_REACHED` if the Free duration cap was exceeded, regardless of what the client sends
- `GET /api/subscription/status` — the caller's own entitlement: `isPro`, `status`, `expiresAt`, `productId`, and the real `limits` (`dailySessionCap`/`sessionDurationCapSeconds`) currently in effect for their tier
- `POST /api/webhooks/revenuecat` — RevenueCat's server webhook (its own shared-secret auth via `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`, not `requireAuth`); maps `app_user_id` to `User.id` and upserts `Subscription` per event type
- All routes above except `/auth/sign-up`, `/auth/sign-in`, and `/webhooks/revenuecat` require `Authorization: Bearer <session-token>` (`requireAuth` middleware)

## Free/Pro limits (`PlanLimits`)

Free and Pro session limits are rows in the `PlanLimits` table (one per `PlanTier`), not hardcoded constants — seeded by their own migration (`FREE`: 2 sessions/day, 3600s session cap; `PRO`: both `null` = unlimited). Change a limit by updating that row directly; no code deploy needed. A missing row is treated as a real misconfiguration and throws (500) rather than silently defaulting to unlimited or zero.

## Notes

- CORS is wide open (`cors()` with no options) for local scaffolding convenience — tighten to an explicit origin allowlist before deploying anywhere real.
- Prisma 7 moved the DB connection string out of `schema.prisma` and into `prisma.config.ts` + a driver adapter (`@prisma/adapter-pg`) — see `lib/db/db.ts` and `prisma.config.ts`.
