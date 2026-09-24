# CHANGES.md — ReRoute Project

> This file is automatically updated at the end of each development session.
> It tracks all architecture changes, new features, and improvements across the full stack.

---

## Session: 2026-09-24 — Repository Restructure & Cleanup

### Overview
- Moved `reroute-auth/` to `frontend/auth/`.
- Moved `reroute-dashboard/` to `frontend/dashboard/`.
- Moved `reroute-backend/` to `backend/`.
- Moved documentation (`CHANGES.md`, `SETUP_GUIDE.md`) into `docs/`.
- Moved design and legacy references (`core_campus/`, `admin_login/`, `admin_registration/`) into `docs/design/`.
- Added a root `README.md` so the repository has a clear landing page.
- Stopped tracking generated artifacts (`playwright-report/`, `test-results/`).
- Updated npm workspace paths, root scripts, Playwright server commands, shared Tailwind imports, and documentation paths.

---

## Session: 2026-09-21 — Full-Stack Architecture (Vue 3 + React + Express + MongoDB)

### Overview
Per project requirements, Angular was replaced with a tailored dual-frontend setup paired with a Node.js Express & MongoDB backend:
1. **Vue 3 + Vite (`frontend/auth/`)**: Handles administrator authentication (Login & Registration with invite codes).
2. **React + Vite (`frontend/dashboard/`)**: Handles the Admin Portal (Overview Dashboard, Admin Staff Management, Campus Network Infrastructure Telemetry).
3. **Node.js + Express + MongoDB (`backend/`)**: REST API server with session cookies, IP whitelist security, and full database persistence.
4. **Core Campus Design System**: Consistent Tailwind CSS styling derived from `docs/design/core-campus/DESIGN.md` across both frontends.

---

### 📂 Repository Layout

```
ReRoute/
├── backend/                            # Express.js REST API & Mongoose models (Port 3000)
│   ├── middleware/                     # Session auth & campus IP whitelist
│   ├── models/                         # Mongoose models (Admin, InviteCode, NetworkNode)
│   ├── routes/                         # /api/auth, /api/admins, /api/network
│   ├── db.js                           # MongoDB connection & seeding
│   ├── seed.js
│   └── server.js                       # Express server entry point
├── frontend/
│   ├── auth/                           # Vue 3 + Vite Auth Application (Port 5173)
│   └── dashboard/                      # React + Vite Admin Portal (Port 5174)
├── tests/                              # Playwright E2E test suite
├── docs/
│   ├── CHANGES.md                      # Session audit log
│   ├── SETUP_GUIDE.md                  # Setup & installation guide
│   └── design/                         # Design system & legacy references
│       ├── core-campus/DESIGN.md
│       ├── admin-login/
│       └── admin-registration/
├── package.json                        # Root monorepo orchestrator
└── playwright.config.js                # Playwright E2E configuration
```

---

### 🛡️ Security & Authentication Implementation

- **No Public End-User Accounts**: Exclusively configured for campus administrators and maintenance staff.
- **Session-Based Cookies**: Express sessions stored in MongoDB with `httpOnly` and `sameSite` cookie security.
- **Campus IP Whitelist**: Middleware verifies incoming client IPs against authorized subnet ranges (`ALLOWED_IPS` in `.env`).
- **Invite-Only Registration**: New administrators must provide a single-use valid invite code created by an active admin.
- **Password Security**: Bcrypt salt hashing (12 rounds) enforced on all admin passwords.

---

### 🌐 Home Network / LAN Testing Guide

Your local Wi-Fi IP address is detected as: **`192.168.100.14`**

All dev servers and backend APIs are configured with `host: 0.0.0.0` and dynamic hostname resolution. You can open any device connected to the same home Wi-Fi (smartphones, tablets, other laptops) and navigate to:

| App | Local URL (This PC) | Home Wi-Fi URL (Any Device on LAN) |
|---|---|---|
| **Vue Auth App (Login/Register)** | `http://localhost:5173` | `http://192.168.100.14:5173` |
| **React Dashboard (Admin Portal)** | `http://localhost:5174` | `http://192.168.100.14:5174` |
| **Express Backend API** | `http://localhost:3000` | `http://192.168.100.14:3000` |

#### MongoDB Setup for Home Testing
1. **Free Cloud Database (Recommended)**:
   - Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - In `backend/.env`, set:
     ```env
     MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/reroute?retryWrites=true&w=majority
     ```
2. **Local MongoDB**:
   - Alternatively, install [MongoDB Community Server](https://www.mongodb.com/try/download/community) on Windows.

---

### 🚀 Running the Project

#### Run All Services Concurrently
From the root directory:
```bash
npm run dev
```
Or start each service individually:
- **Backend API**: `npm run backend` (`http://localhost:3000`)
- **Vue Auth App**: `npm run auth` (`http://localhost:5173`)
- **React Dashboard**: `npm run dashboard` (`http://localhost:5174`)

---

### 🧪 Verification
- `frontend/auth/` built cleanly with Vite.
- `frontend/dashboard/` built cleanly with Vite.
- Both apps and backend connected to shared API contracts.
