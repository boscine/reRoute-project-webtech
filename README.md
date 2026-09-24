# ReRoute — Campus Network Admin Platform

ReRoute is a full-stack campus network administration platform with a Vue 3 authentication app, a React admin dashboard, and an Express + MongoDB API.

## Repository Structure

```text
ReRoute/
├── backend/                              # Express.js REST API & Mongoose models (Port 3000)
├── frontend/
│   ├── auth/                             # Vue 3 authentication app (Port 5173)
│   └── dashboard/                        # React admin dashboard (Port 5174)
├── tests/                                # Playwright E2E test suite
├── docs/
│   ├── CHANGES.md                        # Session audit log
│   ├── SETUP_GUIDE.md                    # Setup & installation guide
│   └── design/                           # Design system & legacy references
│       ├── core-campus/                  # Master design system documentation
│       ├── admin-login/                  # Legacy login reference
│       └── admin-registration/           # Legacy registration reference
├── package.json                          # Root monorepo orchestrator (npm workspaces)
├── package-lock.json
└── playwright.config.js                  # Playwright E2E configuration
```

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure the backend environment in `backend/.env` (see [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)).
3. Seed the database:
   ```bash
   npm run seed
   ```
4. Start everything:
   ```bash
   npm run dev
   ```

- Backend API: http://localhost:3000
- Auth app: http://localhost:5173
- Dashboard: http://localhost:5174

## Tests

```bash
npm test        # Run all Playwright tests
npm run test:ui # Run with the Playwright UI
```

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for the full setup and troubleshooting guide.