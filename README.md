# ReRoute Campus Locator

Scan a QR code, land on the student page, see which building and floor the code points to. Public read-only student side, login-gated admin side for managing buildings, floors, locations, QR codes, users, and scan/activity logs.

Spec: Prompt.txt

## Repo layout

```
ReRoute/
├── frontend/          Vue 3 + Vite SPA (student + admin UI) -> port 5173
├── backend/           Express + Prisma + PostgreSQL API (active) -> port 8000
├── laravel-backend/   Laravel 13 API + Sanctum auth (kept, not active)
├── tests/             Playwright suite (functional + UI)
├── tools/             test runner
├── playwright.config.js
└── Prompt.txt         Original build spec
```

`backend/` is the backend the Vue app talks to. It is an Express + Prisma + PostgreSQL API using JWT bearer tokens. The Vite dev server proxies `/api` to `http://localhost:8000`.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL server (or set DATABASE_URL to an existing PostgreSQL instance)

Verify:

```bash
node -v
npm -v
```

## Setup

### 1. Backend (Express + Prisma + PostgreSQL)

```bash
cd backend
npm install
cp .env.example .env        # skip if .env already exists
# Edit .env to set DATABASE_URL to your PostgreSQL connection string
npx prisma generate
npx prisma migrate dev
npx prisma seed
```

`backend/.env.example` ships with a placeholder PostgreSQL URL:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reroute_db?schema=public"
JWT_SECRET="reroute-secret-key-development-12345"
PORT=8000
```

Edit `DATABASE_URL` to match your PostgreSQL instance before running migrations.

Seeded admin account:

| Email | Password | Role |
| --- | --- | --- |
| admin@reroute.campus | admin12345 | SUPERADMIN |

Change this before any shared deployment. The seeder creates four buildings (North Hall, Science Centre, Student Hub, Library Building) with floors and QR slugs such as `h-gf`, `sc-f1`, `lib-f3`, so the QR flow is demoable immediately.

Backend scripts:

- `npm start` — run the Express server on port 8000
- `npm run dev` — run with `--watch`
- `npm run prisma:generate` — generate Prisma Client
- `npm run prisma:migrate` — run `prisma migrate dev`
- `npm run prisma:seed` — seed the database

### 2. Frontend

```bash
cd frontend
npm install
```

Vite serves on `http://localhost:5173` and proxies `/api` to `http://localhost:8000` (see `frontend/vite.config.js`). No frontend env vars to set.

### 3. Run

Two terminals:

```bash
cd backend && npm start                         # http://localhost:8000
cd frontend && npm run dev                      # http://localhost:5173
```

Or use the Playwright runner, which starts both itself: `npm test` (stub API mode).

## Try it

Student side, no login:

```bash
http://localhost:5173/?loc=nh-gf
http://localhost:5173/                         # dropdown fallback when loc is missing or unknown
```

Admin side:

```bash
http://localhost:5173/admin/login             # admin@reroute.campus / admin12345
```

## API

Public (no auth):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/buildings | list buildings |
| GET | /api/floors?building={id} | floors for a building |
| GET | /api/locations/{qrSlug} | resolve a QR slug to building + floor, writes a ScanLog row (resolved true/false) |

Auth:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /api/admin/login | returns a JWT bearer token + user |
| GET | /api/admin/me | current user |

Admin (Bearer token required) — `backend/src/server.js` has full CRUD for `/api/admin/buildings`, `/api/admin/floors`, `/api/admin/locations`, plus `/api/admin/qr/image/{qrSlug}`, `/api/admin/scan-logs`, `/api/admin/activity-logs`, `/api/admin/reports`, `/api/admin/dashboard`, and `/api/admin/users` (create + PATCH `.../toggle-active`).

The frontend stores the token in localStorage under `reroute_token` and attaches it in `frontend/src/services/api.js`. A 401 clears the token and redirects to `/admin/login`.

## Database

The backend uses Prisma ORM with PostgreSQL. The schema is defined in `backend/prisma/schema.prisma`:

- `buildings` -> `floors` -> locations (each location holds the `qrSlug` a QR code points to)
- `scan_logs` — records every public QR lookup (resolved true/false)
- `activity_logs` — audit trail of admin actions
- `admin_users` — admin accounts with `role` and `isActive`

To set up the database:

```bash
cd backend
npx prisma generate      # generate Prisma Client
npx prisma migrate dev   # create tables and migrations
npx prisma seed          # seed admin + sample campus data
```

The datasource provider is postgresql. Set `DATABASE_URL` in `backend/.env` to your PostgreSQL connection string before migrating.

## Tests

Two suites at the repo root. Both start the Vue dev server and the API automatically; neither needs you to run anything first.

```bash
npm install                    # once; also npx playwright install chromium
npm test                       # stub API, 22 passed / 7 skipped
npm run test:api               # real API mode (requires backend running on :8000), 29 passed
```

| Command | Description |
| --- | --- |
| `npm test` | Boots `tests/stubs/api-server.cjs`, an in-memory stand-in mirroring the Express API contract. No PostgreSQL needed. |
| `npm run test:api` | Runs against the real Express + Prisma backend on `:8000`. The only mode that verifies JWT enforcement, cascade deletes, the ScanLog audit trail, and report aggregation. Requires `npm install` + `prisma migrate` + `prisma seed` in `backend/` first. |

`npm run test:api` writes to the real PostgreSQL database, so several tests skip unless you opt in:

```bash
cd backend && npx prisma migrate reset && npx prisma seed
REROUTE_ALLOW_DB_WRITES=1 npm run test:api
```

That reseed matters. Tests create buildings and locations, and both columns carry unique constraints, so a second run without a reset would fail on data left by the first.

Individual files: `npm run test:ui`, `npm run test:functional`. Pass extra Playwright flags through the runner, e.g. `node tools/run-tests.cjs stub tests/ui.spec.js --headed`.

### Coverage

- `tests/functional.spec.js` — public QR resolution, dropdown fallback, auth rejection on every admin route, session lifecycle, building CRUD through the UI, plus a real-API-only block for ScanLog auditing, cascade deletes, activity-log attribution, and report aggregation.
- `tests/ui.spec.js` — branding, computed styles, the three.js canvas, responsive layout with no horizontal overflow, admin nav states, and the styling of all nine admin pages.

### Known defects

`tests/ui.spec.js` ends with two tests that document real gaps. They currently pass, meaning the gap is present. Flip the assertion to the desired behaviour once fixed.

- UI-11 — the student page has an h2 result but no h1, so it has no top-level heading for assistive technology.
- UI-12 — StudentLocatorView cancels its `requestAnimationFrame` on unmount but never disposes the WebGL renderer or removes the canvas. Navigating away and back leaves orphaned canvases in the document.

## Other checks

```bash
cd backend && npm start                         # confirm the API surface on :8000
cd ../frontend && npm run build               # production bundle
```

The Express API routes are defined in `backend/src/server.js`:
- Public: GET /api/buildings, GET /api/floors?building=, GET /api/locations/:qrSlug
- Admin (JWT): full CRUD for /api/admin/buildings, /api/admin/floors, /api/admin/locations, plus /api/admin/qr/image/:qrSlug, /api/admin/scan-logs, /api/admin/activity-logs, /api/admin/dashboard, /api/admin/reports, /api/admin/users (create + PATCH `.../toggle-active`), and auth (POST /api/admin/login, GET /api/admin/me).

## Notes

- QR images are generated server-side with the qrcode package; no external QR service is called.
- `.env` files are gitignored. Do not commit them.
- The frontend is JavaScript, not TypeScript.
