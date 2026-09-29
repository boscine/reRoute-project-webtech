# ReRoute — Campus Locator

Scan a QR code, land on the student page, see which building and floor the code points to. Public read-only student side, login-gated admin side for managing buildings, floors, locations, QR codes, users, and scan/activity logs.

Spec: `Prompt.txt`

## Repo layout

```
ReRoute/
├── frontend/          Vue 3 + Vite SPA (student + admin UI)   → port 5173
├── laravel-backend/   Laravel 13 API + Sanctum auth (active)   → port 8000
├── tests/             Playwright suite (functional + UI)
├── tools/             test runner
├── playwright.config.js
└── Prompt.txt         Original build spec
```

`laravel-backend/` is the backend the Vue app talks to. It uses Sanctum bearer tokens and SQLite, so there is no database server to install.

## Prerequisites

- PHP 8.3+ with the `pdo_sqlite`, `mbstring`, `openssl`, `fileinfo` extensions
- Composer 2
- Node.js 20+ and npm

Verify:

```bash
php -v
composer -V
node -v
```

## Setup

### 1. Backend

```bash
cd laravel-backend
composer install
cp .env.example .env        # skip if .env already exists
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
```

The repo ships with `.env` and a pre-migrated `database/database.sqlite`, so on a fresh clone you can often go straight to `composer install` and `php artisan serve`. `migrate --seed` is safe to re-run: the seeder uses `updateOrCreate` / `firstOrCreate`.

Seeded admin account:

| Email | Password | Role |
| --- | --- | --- |
| `admin@reroute.campus` | `admin12345` | SUPERADMIN |

Change this before any shared deployment. The seeder also creates four buildings (North Hall, Science Centre, Student Hub, Library Building) with floors and QR slugs such as `nh-gf`, `sc-f1`, `lib-f3`, so the QR flow is demoable immediately.

### 2. Frontend

```bash
cd frontend
npm install
```

Vite serves on `http://localhost:5173` and proxies `/api` to `http://localhost:8000` (see `frontend/vite.config.js`). No frontend env vars to set.

### 3. Run

Two terminals:

```bash
cd laravel-backend && php artisan serve      # http://localhost:8000
cd frontend && npm run dev                    # http://localhost:5173
```

Or use the Playwright runner, which starts both itself: `npm test`.

## Try it

Student side, no login:

```
http://localhost:5173/?loc=nh-gf
http://localhost:5173/                         # dropdown fallback when loc is missing or unknown
```

Admin side:

```
http://localhost:5173/admin/login             # admin@reroute.campus / admin12345
```

## API

Public (no auth):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/buildings` | list buildings |
| GET | `/api/floors?building={id}` | floors for a building |
| GET | `/api/locations/{qrSlug}` | resolve a QR slug to building + floor, writes a ScanLog row (`resolved` true/false) |

Auth:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/admin/login` | returns a Sanctum bearer token + user |
| GET | `/api/admin/me` | current user |

Admin (Bearer token required) — `routes/api.php` has full CRUD for `/api/admin/buildings`, `/api/admin/floors`, `/api/admin/locations`, plus `/api/admin/qr/image/{qrSlug}`, `/api/admin/scan-logs`, `/api/admin/activity-logs`, `/api/admin/reports`, `/api/admin/dashboard`, and `/api/admin/users` (create + `PATCH .../toggle-active`).

The frontend stores the token in `localStorage` under `reroute_token` and attaches it in `frontend/src/services/api.js`. A 401 clears the token and redirects to `/admin/login`.

## Database

Six tables created by `database/migrations/2026_09_28_000001_create_reroute_tables.php` plus stock Laravel tables:

`buildings` → `floors` → `locations` (each location holds the `qr_slug` a QR code points to), `scan_logs`, `activity_logs` (audit trail of admin actions), `users` (admins only, with `role` and `is_active`).

Switch off SQLite by setting `DB_CONNECTION` and the `DB_*` variables in `.env` to `mysql` or `pgsql` and re-running `php artisan migrate`.

## Tests

Two suites at the repo root. Both start the Vue dev server and the API automatically; neither needs you to run anything first.

```bash
npm install                    # once; also npx playwright install chromium
npm test                       # stub API, 22 passed / 7 skipped
npm run test:api               # real Laravel + SQLite, 29 passed
```

| | |
| --- | --- |
| `npm test` | Boots `tests/stubs/api-server.js`, an in-memory stand-in mirroring `routes/api.php`. No PHP or SQLite needed. |
| `npm run test:api` | Boots `php artisan serve`. The only mode that verifies Sanctum enforcement, cascade deletes, the ScanLog audit trail, and report aggregation. |

The stub reimplements the HTTP contract rather than exercising it, so tests whose premise is real backend behaviour are **skipped**, not passed, under `npm test` (`skipIfStubbed()` in `tests/helpers.js`). That is deliberate: a green stub run should never overstate what was verified.

`npm run test:api` writes to the real SQLite file, so several tests skip unless you opt in:

```bash
cd laravel-backend && php artisan migrate:fresh --seed && cd ..
REROUTE_ALLOW_DB_WRITES=1 npm run test:api
```

That reseed matters. Tests create buildings and locations, and both columns carry unique constraints, so a second run without a reset would fail on data left by the first.

Individual files: `npm run test:ui`, `npm run test:functional`. Pass extra Playwright flags through the runner, e.g. `node tools/run-tests.cjs stub tests/ui.spec.js --headed`.

### Coverage

- `tests/functional.spec.js` — public QR resolution, dropdown fallback, auth rejection on every admin route, session lifecycle, building CRUD through the UI, plus a real-API-only block for ScanLog auditing, cascade deletes, activity-log attribution, and report aggregation.
- `tests/ui.spec.js` — branding, computed styles, the three.js canvas, responsive layout with no horizontal overflow, admin nav states, and the styling of all nine admin pages.

### Known defects

`tests/ui.spec.js` ends with two tests that document real gaps. They currently pass, meaning the gap is present. Flip the assertion to the desired behaviour once fixed.

- **UI-11** — the student page has an `h2` result but no `h1`, so it has no top-level heading for assistive technology.
- **UI-12** — `StudentLocatorView` cancels its `requestAnimationFrame` on unmount but never disposes the WebGL renderer or removes the canvas. Navigating away and back leaves orphaned canvases in the document.

## Other checks

```bash
cd laravel-backend && php artisan test        # PHPUnit, stock example tests
php artisan route:list                        # confirm the API surface
cd ../frontend && npm run build               # production bundle
```

## Notes

- `laravel-backend/AGENTS.md` and `CLAUDE.md` ask coding agents to run `composer require laravel/boost --dev` and `php artisan boost:install` before making changes. That is not required to run the app.
- QR images are generated server-side with `simplesoftwareio/simple-qrcode`; no external QR service is called.
- `ScanLog` casts `resolved` to a boolean. SQLite stores booleans as integers, so without the cast the API returns `0`/`1` where the Vue client expects a real boolean. It is masked today only because `v-if` treats `0` as falsy.
- `.env` files are gitignored. Do not commit them.
- The frontend is JavaScript, not TypeScript.
