# Busy Bee Backend

AI Mission Control API — Node.js, TypeScript, Express, Prisma (PostgreSQL).

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL
```

`npm install` also generates the Prisma client (via `@prisma/client`'s own postinstall step) — no manual `prisma generate` needed. No migration has been run yet; create your first one with `npx prisma migrate dev` once you're ready to apply the schema to a real database.

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
