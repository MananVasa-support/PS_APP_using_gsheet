# ⏱️ Time Auditor — Productivity Shastra

> **Audit your time. Improve your life.**

A professional, dark-themed time-tracking & productivity analytics web app with
role-based dashboards for Admins, Consultants and Clients. Built on **React +
Vite + Tailwind** with a fully managed **Supabase** backend (Postgres + Auth +
Storage + Realtime).

---

## ✨ Features

- 🔐 **Auth** — email/password with admin approval, 3 roles (admin / consultant
  / client), session persistence, password reset
- 📊 **Dashboard** — daily score ring, KPI cards, focus-time trend, quick actions
- 🕒 **Time Entry** — 30-minute block tracker with inactivity detection and
  end-of-day summary
- 📈 **Analytics** — time-distribution donut, performance radar, AI-style
  insights, round-1 / round-2 deep analysis
- 📄 **Reports** — builder + live preview charts + export history backed by
  Supabase Storage (signed-URL downloads)
- 👤 **Profile + Settings** — editable info, preferences, notifications, danger
  zone
- 🛡️ **Admin Panel** — client approvals, consultant assignment, activity log,
  per-client form viewer
- 🤝 **Consultant Panel** — assigned-clients view + per-client tasks (CRUD)
- 🎮 **Level 2 / Challenges** — gamified streaks, rankings, performance board
- 📱 **Mobile-ready** — installable PWA, ready to wrap with Capacitor for
  Android/iOS

---

## 🛠️ Tech stack

| Frontend | Backend |
| --- | --- |
| React 18 + Vite 5 | Supabase (Postgres + Auth + Storage + Realtime) |
| Tailwind CSS 3 | Row-Level Security (RLS) on every table |
| React Router 6 | `SECURITY DEFINER` RPCs for atomic admin ops |
| `@supabase/supabase-js` | Auto-generated REST + Realtime API |
| Framer Motion | (No custom backend server to deploy or maintain) |
| React Icons + Recharts | |

---

## 📁 Project structure

```
time-auditor/
├─ src/
│  ├─ lib/supabase.js          # Single Supabase client
│  ├─ services/                # auth, user, time, analytics, forms, reports, admin, consultant, challenge
│  ├─ hooks/                   # useAuth, useSupabaseQuery, useSupabaseMutation, useRealtime, ...
│  ├─ context/                 # AuthContext (subscribes to onAuthStateChange)
│  ├─ routes/                  # AppRoutes + ProtectedRoute (role + status gates)
│  ├─ layouts/                 # AuthLayout, HomeLayout, DashboardLayout
│  ├─ pages/                   # Landing, auth/, onboarding/, Dashboard, Analytics, ...
│  ├─ components/              # ui/, forms/, charts/, features/, layout/
│  ├─ utils/                   # mappers (snake_case ↔ camelCase), roles, format, cn
│  └─ data/                    # mockData fallback when Supabase env is missing
├─ supabase/
│  ├─ migrations/0001_init.sql # Schema + RLS + RPCs + Storage buckets (idempotent)
│  ├─ seed.sql                 # One-liners to promote a user to admin/consultant
│  └─ README.md                # What the migration creates
├─ public/
│  ├─ favicon.svg
│  └─ manifest.webmanifest     # PWA manifest (installable + Capacitor-friendly)
├─ .env.example                # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├─ vercel.json                 # SPA rewrite config
├─ SUPABASE_SETUP.md           # Architecture + security model deep-dive
├─ FINAL_SETUP.md              # The one walkthrough to follow — start here
└─ server/                     # Legacy Express/Mongo backend (kept for reference, NOT used)
```

---

## 🚀 Quick start

### Prerequisites
- Node.js **18+** and npm
- A free [Supabase](https://supabase.com) project (you already have one
  configured in `.env`)

### 1. Install + run

```bash
npm install
npm run dev      # http://localhost:3000 (auto-falls-back to 3001 etc.)
```

> 💡 If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing, the app
> falls back to demo/mock data so you can still click around. Log in with any
> email + password to explore.

### 2. Apply the database schema (one-time)

Open the Supabase dashboard → **SQL editor → New query** → paste the contents
of `supabase/migrations/0001_init.sql` → **Run**.

### 3. Disable email confirmation

Supabase dashboard → **Authentication → Providers → Email** → turn **"Confirm
email"** OFF (admin approval is the gate, not email verification).

### 4. Create an admin

Sign up via the app's Register page using `admin@unleashed.in`, then run in
the SQL editor:

```sql
update public.profiles
   set role = 'admin', status = 'Approved'
 where email = 'admin@unleashed.in';
```

Sign out and back in — the Admin panel is now reachable.

📘 **Complete walkthrough with screenshots-friendly clicks**:
[FINAL_SETUP.md](./FINAL_SETUP.md)

---

## 🔑 Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Your project's URL — `Project Settings → API`. |
| `VITE_SUPABASE_ANON_KEY` | Anon public key (safe to ship — every table is RLS-locked). |
| `VITE_API_URL` | **Legacy.** Only used if you re-enable the old Express server in `server/`. Leave blank. |

---

## 📜 Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |

---

## ☁️ Deployment

**Frontend** → Vercel (config already in `vercel.json`).
**Backend** → Supabase (managed; nothing to deploy).

Detailed Vercel + Capacitor (Android/iOS) steps in
[FINAL_SETUP.md](./FINAL_SETUP.md).

---

## 📄 License

MIT.
