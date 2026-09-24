# ReRoute Campus Platform — Setup & Installation Guide for Another Device

This guide walks you through setting up and running the **ReRoute Campus Platform** (Vue 3 Auth + React Dashboard + Express/MongoDB API) and its **Playwright Automated Test Suite** on a fresh computer (Windows, macOS, or Linux).

---

## 1. System Requirements & Prerequisites

Ensure the target machine has the following installed:

1. **Node.js**: Version 18.x or 20.x+ ([Download Node.js](https://nodejs.org/))
   - Verify in terminal:
     ```bash
     node -v
     npm -v
     ```
2. **MongoDB**:
   - **Option A (Local)**: Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and MongoDB Compass, and ensure the service is running on `mongodb://127.0.0.1:27017`.
   - **Option B (Cloud / Atlas)**: Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and get your connection string.

---

## 2. Transfer & Project Structure

Copy or clone the `ReRoute` repository directory onto the new machine.

The workspace layout:
```text
ReRoute/
├── package.json               # Root monorepo orchestrator
├── playwright.config.js       # Playwright E2E configuration & web servers
├── tests/                     # 20 Playwright Test Cases
│   ├── ui.spec.js             # 10 UI tests
│   ├── functional.spec.js     # 10 Functional tests
│   └── helpers.js             # Shared test utilities & login helper
├── reroute-auth/              # Vue 3 Authentication frontend (Port 5173)
├── reroute-dashboard/         # React Admin Dashboard frontend (Port 5174)
└── reroute-backend/           # Express.js REST API & Mongoose models (Port 3000)
```

---

## 3. Install Dependencies

Open a terminal inside the project root (`ReRoute` directory):

### Step A: Install Node Dependencies
```bash
npm install
```
*(This installs root dependencies like Playwright and concurrently, and automatically installs packages for all three workspaces: `reroute-auth`, `reroute-dashboard`, and `reroute-backend`).*

### Step B: Install Playwright Browsers
Playwright requires browser binaries to execute end-to-end tests:
```bash
npx playwright install chromium
```
*(On Linux systems, if system libraries are required, run: `npx playwright install --with-deps chromium`)*

---

## 4. Configure Backend Environment (.env)

Navigate to `reroute-backend/` and verify or create `.env`:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/reroute
SESSION_SECRET=reroute_super_secure_session_key_2026
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

> **Note for MongoDB Atlas**: If using cloud MongoDB, replace `MONGO_URI` with your connection string:
> `MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/reroute?retryWrites=true&w=majority`

---

## 5. Seed the Database

Initialize default system administrator account, sample network devices, and registration invite codes:

```bash
npm run seed
```

Default credentials created:
- **Admin Email**: `admin@campus.edu`
- **Admin Password**: `password123`
- **Seeded Invite Codes**: `CR-CAMPUS-2026`, `CR-NET-ADMIN`

---

## 6. Running the Application

### Start All Services Concurrently:
```bash
npm run dev
```
This simultaneously boots:
- **Backend API**: [http://localhost:3000](http://localhost:3000) (Health check: `/api/health`)
- **Vue 3 Auth Application**: [http://localhost:5173](http://localhost:5173)
- **React Admin Dashboard**: [http://localhost:5174](http://localhost:5174)

### Or Run Individual Services in Separate Terminals:
```bash
# Terminal 1: Backend
npm run backend

# Terminal 2: Auth App
npm run auth

# Terminal 3: Admin Dashboard
npm run dashboard
```

---

## 7. Running the Playwright Test Suite

The test suite contains **20 total tests** (10 UI and 10 Functional tests). Playwright will automatically start dev servers if they are not already running.

```bash
# 1. Run all 20 tests (Headless mode)
npm test

# 2. Run with interactive Playwright UI Runner
npm run test:ui

# 3. Run with visible browser windows (Headed mode)
npm run test:headed

# 4. Run only the 10 UI tests
npx playwright test tests/ui.spec.js

# 5. Run only the 10 Functional tests
npx playwright test tests/functional.spec.js

# 6. View generated HTML test report
npm run test:report
```

---

## 8. Common Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `Port 3000 / 5173 / 5174 already in use` | Another process is occupying the port | Terminate the process using that port or reboot terminal. |
| `MongoDB connection error / connect ECONNREFUSED` | MongoDB service is not started | Start MongoDB via Windows Services (`services.msc`), brew service on Mac, or `systemctl start mongod` on Linux. |
| `Executable doesn't exist at ... chromium` | Playwright browser binary not installed | Run `npx playwright install chromium`. |
| `Unauthorized: Admin session required` | Database was not seeded | Run `npm run seed` to ensure `admin@campus.edu` exists. |
