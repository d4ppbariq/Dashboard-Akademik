<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Dashboard Akademik Nesaciba

SINAR is the light-theme academic dashboard for SMPN 1 Cibalong: students, cohorts/classes, grades, attendance, Excel imports, RBAC, and published academic predictions. Stack: Next.js 16.3.1 App Router, React 19, strict TypeScript, PostgreSQL via `pg`, Tailwind CSS 4, and shadcn/ui; a separate Python/scikit-learn pipeline produces ML results.

## Dev environment

- Run commands from the repository root; use `npm ci` with `package-lock.json`.
- `package.json` requires Node.js >=20.12.0; README recommends Node.js 22 LTS and PostgreSQL 14+. The database CLI requires `process.loadEnvFile`.
- Setup: `cp .env.example .env`, then configure `DATABASE_URL`, `SESSION_SECRET` (at least 32 characters), and `COOKIE_SECURE` (exactly `true` or `false`; `false` only for HTTP development/LAN).
- Initial seed requires separate `SEED_SUPERADMIN_PASSWORD`, `SEED_OPERATOR_PASSWORD`, and `SEED_GURU_PASSWORD` values. Keep credentials out of tracked files.
- Create the PostgreSQL role/database first (README has SQL), then run `npm run db:setup` only against an empty database.
- `npm run dev` serves http://localhost:3000; documented alternate port: `npm run dev -- -p 3001`.

## Build & test

- `npm run test` — colocated `src/**/*.test.ts`, using Node's test runner with `--conditions=react-server --import tsx`.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` — ESLint 9 flat config with Next core-web-vitals and TypeScript rules (not `next lint`).
- `npm run build` — production build; `npm run start` — serve the resulting build.
- `npm run ml:test` — Python unittest discovery under `ml/tests`; npm's ML scripts invoke `python`, so use the intended Python environment with dependencies from `ml/requirements.txt`.
- Pure helpers are tested with `node:test` and `node:assert/strict`, outside `"use server"` modules; auth token/throttle/access decisions are separated from Next request APIs for this reason.

## Layout & conventions

- `src/app/(protected)/` contains authenticated pages; `src/app/api/` contains route handlers. `src/proxy.ts` checks page sessions, but its matcher excludes APIs; API handlers must enforce their own access checks.
- `src/lib/auth/dal.ts` supplies `requireAuth`, `requireRoute`, and `hasPermission`; route access is fail-closed. New routes need database `Route`/role grants (and `Menu` grants when navigation is needed), not just a new page file.
- Domain server actions live in `src/lib/{siswa,master,admin,import}/`; the observed pattern is `"use server"`, auth/permission guards, Zod `safeParse`, Indonesian `{ error?: string }` messages, audit entries, `persist`, and `revalidatePath`.
- `src/server/service/` holds statistics/prediction logic; `src/lib/import/` separates validation, subject resolution, and applying Excel data.
- `@/*` resolves to `src/*`. Shared UI lives in `src/components/ui/`; shadcn uses `radix-nova`, with Tailwind tokens in `src/app/globals.css` (no Tailwind config file configured).
- `src/lib/db/types.ts` defines the dataset shape; `store.ts` reads it, `normalize.ts` converts SQL rows, and `write.ts` persists it. Schema is `src/lib/db/schema.sql`; numbered changes belong in `src/lib/db/migrations/`.
- NIS is text, preserving leading zeros; use `src/lib/nis.ts` normalization instead of numeric coercion. Attendance calendar configuration lives in `config/hari-efektif.json`.

## Database pitfalls

- `npm run db:setup` applies schema, seed, then all migration SQL files in sorted order; it refuses databases where the `Role` table already exists.
- Despite its name, `npm run db:migrate` applies only `schema.sql`, NOT the migration directory. Existing installations need SQL migrations applied manually in order; see `src/lib/db/migrations/README.md`, including `005_nis_format.sql` (the top-level README's migration list is incomplete).
- `npm run db:seed` and `npm run db:reset` overwrite academic data; never use them to change a password or repair an existing installation. `db:reset` also does not apply numbered migrations.
- `persist()` writes the dataset using `TRUNCATE ... CASCADE` and reinserts in a transaction; do not treat it as a single-row update. Seed changes do not update populated databases, and changing `SEED_*` does not rotate existing passwords.

## ML workflow & references

- `npm run ml:extract` reads the database; `npm run ml:train` trains; `npm run ml:predict` generates predictions. Training outputs live in `ml/artefak/`.
- B2 publication uses `npm run ml:publish-b2`, then `npm run ml:post:b2`; the latter writes to `Prediksi` using `POST_DATABASE_URL` or `DATABASE_URL`. These are data-changing operations, not verification commands.
- The web app reads published predictions; it does not run model training. Consult `docs/Protokol_Evaluasi_A1.md` before changing evaluation/features and `docs/LAPORAN_ML_Rencana_dan_Hasil.md` for exact experiment commands and publication artifacts.
- Product reference: `docs/PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md`; v0.3 is superseded. `CLAUDE.md` delegates to this file.
