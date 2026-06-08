# 🧭 Beginner's Guide — How Time Auditor / Productivity Shastra Works

This guide explains the app in plain language: how the pieces fit together, how
login/registration works, where the API lives, how the database connects, and how
to run and deploy it. For the click-by-click deploy steps, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

> **Stack reality check:** this app is built with **Vite + React + JavaScript +
> React Router** on the front end and **Node/Express + MongoDB** on the back end.
> (It is *not* Next.js/TypeScript — we kept the existing working stack rather than
> rewriting it.)

---

## 1. The big picture

Think of the app as three boxes that talk to each other:

```
  ┌──────────────┐   HTTP (JSON)   ┌──────────────┐   Mongoose   ┌──────────────┐
  │   FRONTEND   │  ───────────▶   │   BACKEND    │  ─────────▶  │   DATABASE   │
  │ React + Vite │   axios calls   │ Node/Express │   queries    │   MongoDB    │
  │ (the browser)│  ◀───────────   │  (the API)   │  ◀─────────  │   (Atlas)    │
  └──────────────┘   JSON replies  └──────────────┘    docs      └──────────────┘
       :3000                            :5000
```

- **Frontend** = what the user sees (pages, buttons, forms). Runs in the browser.
- **Backend** = a small server with **API routes** like `/api/auth/login`. It contains
  the rules (who can log in, what data to return) and is the only thing allowed to
  touch the database.
- **Database** = where data is permanently stored (users, time entries, reports).

> 💡 **You can run the frontend alone.** If `VITE_API_URL` is empty, the app uses
> realistic *mock data* and any email/password logs you in — great for trying the UI
> without setting up a database.

---

## 2. Run it locally (step by step)

### A) Frontend only (no database needed)
```bash
npm install
copy .env.example .env      # Windows (use: cp on Mac/Linux)
npm run dev                 # opens http://localhost:3000
```
Leave `VITE_API_URL` empty in `.env` → you're in mock mode. Log in with anything.

### B) Add the real backend + database
```bash
cd server
npm install
copy .env.example .env      # then edit it (see below)
npm run seed                # creates a demo admin + sample data
npm run dev                 # API runs on http://localhost:5000
```
In `server/.env` set at least:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/time-auditor
JWT_SECRET=any-long-random-string
```
Then tell the frontend where the API is — in the **root** `.env`:
```
VITE_API_URL=http://localhost:5000
```
Restart `npm run dev`. Now the app uses real data.

**Seeded admin login:** `admin@unleashed.in` / `password123`

---

## 3. Authentication explained (the login/register flow)

This app uses **JWT (JSON Web Token)** auth with an **admin-approval** step.

```
Register form ──▶ POST /api/auth/register
                    └─ creates a user with status = "Pending" (NO token yet)
                    └─ frontend then shows the Onboarding questionnaire

Admin opens Admin Panel ──▶ approves the user (status = "Approved")

Login form ──▶ POST /api/auth/login
                 ├─ checks the password (bcrypt)
                 ├─ blocks if status is "Pending" or "Rejected"
                 └─ on success returns a TOKEN + the user object
```

What the **token** is for: after login, the frontend saves the token and sends it on
every request in an `Authorization: Bearer <token>` header. The backend's `protect`
middleware (`server/src/middleware/auth.js`) checks the token before letting a request
reach a protected route. No valid token → `401 Unauthorized`.

Key files to read if you want to understand it:
| Concern | File |
| --- | --- |
| Register / login / "who am I" logic | `server/src/controllers/auth.controller.js` |
| Password hashing & `comparePassword` | `server/src/models/User.js` |
| Token create/verify | `server/src/utils/token.js`, `server/src/middleware/auth.js` |
| Frontend login/register state | `src/context/AuthContext.jsx`, `src/services/authService.js` |
| Who can see which page | `src/routes/ProtectedRoute.jsx` |

---

## 4. API routes (the backend's "menu")

Every route is registered in `server/src/server.js` and grouped by feature. The pattern
is always: **route file → controller function → Mongoose model → MongoDB**.

| Base path | What it does | Files |
| --- | --- | --- |
| `/api/auth` | register, login, forgot-password, me | `routes/auth.routes.js` → `controllers/auth.controller.js` |
| `/api/entries` | create/list time entries | `routes/entry.routes.js` |
| `/api/dashboard` | dashboard summary numbers | `routes/dashboard.routes.js` |
| `/api/analytics` | charts data | `routes/analytics.routes.js` |
| `/api/reports` | report builder/history | `routes/report.routes.js` |
| `/api/challenges` | challenges feature | `routes/challenge.routes.js` |
| `/api/users` | profile updates | `routes/user.routes.js` |
| `/api/admin` | approve users, admin stats (admin only) | `routes/admin.routes.js` |
| `/api/health` | "is the server alive?" check | `server.js` |

**To add a new endpoint** (e.g. `GET /api/notes`): create a model in `models/`, a
controller function in `controllers/`, a route file in `routes/`, then register it in
`server.js` with `app.use('/api/notes', notesRoutes)`.

---

## 5. Database connection

- The backend uses **Mongoose** (a library that maps JavaScript objects to MongoDB
  documents). Connection happens once at startup in `server/src/config/db.js`, called
  from `server.js` with your `MONGODB_URI`.
- **Models** (`server/src/models/`) define the shape of each collection:
  `User.js`, `TimeEntry.js`, `Report.js`, `Counter.js` (used to auto-number Client IDs).
- For a free cloud database, use **MongoDB Atlas** — DEPLOYMENT.md §1 walks you through
  creating a cluster and getting the `MONGODB_URI`.

---

## 6. Deployment (where it goes live)

The recommended setup (all have free tiers):

| Piece | Host | Why |
| --- | --- | --- |
| Database | **MongoDB Atlas** | managed MongoDB |
| Backend (`server/`) | **Render** | runs the Node API |
| Frontend (repo root) | **Vercel** | serves the React build |

Deploy in this order: **Atlas → Render → Vercel**, because each needs the previous one's
URL. Full step-by-step (with the exact env vars and a CORS fix) is in
**[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 7. Where the recent flow changes live

If you need to tweak the product flow we just implemented:

| Want to change… | Edit this |
| --- | --- |
| The 4 home cards (Time Auditor / Power Planner / Time Finder / Reason Eliminator) | `src/pages/Home.jsx` |
| Which page has **no sidebar** (the 4-card home) | `src/layouts/HomeLayout.jsx` + `src/routes/AppRoutes.jsx` |
| Sidebar menu items / labels (Dashboard, Create Entry, …) | `src/constants/navigation.js` |
| Auto-capitalising the first letter of names | `src/pages/auth/Register.jsx` |
| The onboarding questions (Consent / ECG / Health Form) | `src/data/onboardingForm.js` |
| The logo (used everywhere) | `src/assets/logo.png` + `src/components/ui/Logo.jsx` |
| Theme colours (black + red) | `tailwind.config.js`, `src/index.css` |

> **To fill in the Health Form:** open `src/data/onboardingForm.js`, find the section
> with `id: 'health'`, and replace the placeholder questions. Each question supports
> these `type`s: `text`, `email`, `date`, `textarea`, `select`, `radio`, `checkbox`,
> `scale` (1–10), `file`. Add `required: true` to force an answer.
>
> Same for the **Consent** legal text: replace the `[Full … text goes here …]`
> placeholders in the two `type: 'legal'` blocks.
