# ReRoute — Campus Locator

Scan a QR code, land on the student page, see which building and floor the code points to. Public read-only student side, login-gated admin side for managing buildings, floors, locations, QR codes, users, and scan/activity logs.

Spec: `Prompt.txt`

## Repo layout

```
ReRoute/
├── frontend/          Vue 3 + Vite SPA (student + admin UI)   → port 5173
├── laravel-backend/   Laravel 13 API + Sanctum auth (active)   → port 8000
├── backend/           Node/Express + Prisma + Postgres API (legacy alternative, not wired to the UI)
└── Prompt.txt         Original build spec
```

`laravel-backend/` is the backend the Vue app actually talks to. It uses Sanctum bearer tokens and SQLite, so there is no database server to install. `backend/` is the earlier Prisma/Postgres version kept for reference; running it is optional and would collide on port 8000 with Laravel.

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
npm run dev
```

Vite serves on `http://localhost:5173` and proxies `/api` to `http://localhost:8000` (see `frontend/vite.config.js`). No frontend env vars to set.

### 3. Run

Two terminals:

```bash
cd laravel-backend && php artisan serve      # http://localhost:8000
cd frontend && npm run dev                    # http://localhost:5173
```

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

## Tests and checks

```bash
cd laravel-backend
php artisan test                                    # PHPUnit, stock example tests
php artisan route:list                              # confirm the API surface
cd ../frontend && npm run build                     # production bundle
```

## Notes

- `laravel-backend/AGENTS.md` and `CLAUDE.md` ask coding agents to run `composer require laravel/boost --dev` and `php artisan boost:install` before making changes. That is not required to run the app.
- QR images are generated server-side with `simplesoftwareio/simple-qrcode`; no external QR service is called.
- `.env` files are gitignored. Do not commit them.
- Laravel Boost is not currently installed in `laravel-backend/vendor`.
