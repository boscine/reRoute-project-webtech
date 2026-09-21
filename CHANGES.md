# CHANGES.md — ReRoute Project

> This file is automatically updated at the end of each development session.
> It tracks all architecture changes, new features, and improvements across the full stack.

---

## Session: 2026-09-21 — Full-Stack Architecture (Vue 3 + React + Express + MongoDB)

### Overview
Per project requirements, Angular was replaced with a tailored dual-frontend setup paired with a Node.js Express & MongoDB backend:
1. **Vue 3 + Vite (`reroute-auth/`)**: Handles administrator authentication (Login & Registration with invite codes).
2. **React + Vite (`reroute-dashboard/`)**: Handles the Admin Portal (Overview Dashboard, Admin Staff Management, Campus Network Infrastructure Telemetry).
3. **Node.js + Express + MongoDB (`reroute-backend/`)**: REST API server with session cookies, IP whitelist security, and full database persistence.
4. **Core Campus Design System**: Consistent Tailwind CSS styling derived from `core_campus/DESIGN.md` across both frontends.

---

### 📂 Current Monorepo Directory Layout

```
ReRoute/
├── package.json                         # Root monorepo orchestrator (npm workspaces + concurrently)
├── CHANGES.md                           # Session audit log
│
├── core_campus/
│   └── DESIGN.md                        # Master Core Campus design system documentation
│
├── admin_login/                         # Legacy static reference
│   ├── code.html
│   └── screen.png
├── admin_registration/                  # Legacy static reference
│   └── code.html
│
├── reroute-auth/                        # Frontend 1: Vue 3 + Vite Auth Application (Port 5173)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── src/
│       ├── main.js                      # Router and application bootstrap
│       ├── style.css                    # Tailwind directives & reusable UI classes
│       ├── design/
│       │   └── tokens.js                # Core Campus Design tokens (colors, font sizes, spacing)
│       ├── components/
│       │   ├── AppInput.vue             # Labelled input with validation & error displays
│       │   ├── PasswordInput.vue        # Password input with visibility reveal toggle
│       │   ├── PasswordStrength.vue     # Dynamic 4-stage password strength bar
│       │   └── AlertBanner.vue          # Status feedback banner (success / error)
│       └── views/
│           ├── LoginView.vue            # Admin login connecting to POST /api/auth/login
│           └── RegisterView.vue         # Invite-code registration connecting to POST /api/auth/register
│
├── reroute-dashboard/                   # Frontend 2: React + Vite Admin Portal (Port 5174)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                     # React DOM entry
│       ├── App.jsx                      # App shell with session check & React Router
│       ├── index.css                    # Global styling & component classes
│       ├── api.js                       # Axios instance with credentials & session error handling
│       ├── components/
│       │   └── Sidebar.jsx              # Navigation sidebar with admin identity & sign out
│       └── pages/
│           ├── DashboardPage.jsx        # Stats overview (total admins, active nodes, load telemetry)
│           ├── AdminsPage.jsx           # Admin account management & invite code generator
│           └── NetworkPage.jsx          # Campus nodes grid, status toggles, & device registration modal
│
└── reroute-backend/                     # Backend: Node.js, Express, MongoDB (Port 3000)
    ├── .env                             # Port, MongoDB URI, session secret, allowed IPs
    ├── .gitignore                       # Ignores env and node_modules
    ├── package.json                     # Backend dependencies & scripts (start, dev, seed)
    ├── server.js                        # Express server entry point (CORS, sessions, router bindings)
    ├── seed.js                          # Database seeder (creates default admin, invite codes, nodes)
    ├── middleware/
    │   ├── ipWhitelist.js               # Campus network IP restriction middleware
    │   └── auth.js                      # Express session authentication & role guard
    ├── models/
    │   ├── Admin.js                     # Mongoose Admin model with bcrypt pre-save hash
    │   ├── InviteCode.js                # Single-use admin invite codes with expiration
    │   └── NetworkNode.js               # Network device entity (AP, switch, gateway)
    └── routes/
        ├── auth.js                      # /api/auth (login, register, logout, me)
        ├── admins.js                    # /api/admins (list admins, generate invite, delete admin)
        └── network.js                   # /api/network (nodes list, create node, update status, stats)
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
   - In `reroute-backend/.env`, set:
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
- `reroute-auth` built cleanly with Vite.
- `reroute-dashboard` built cleanly with Vite.
- Both apps and backend connected to shared API contracts.
