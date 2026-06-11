# 06 — Backend Setup (Supabase) — Plan & Checklist

_Last updated: 2026-06-09 — **PREP. Backend not connected yet; app still runs on
localStorage.** Follow this when you're ready to start._

## Decision

- **Database + Auth + API:** **Supabase** (free tier). Gives a hosted Postgres
  database, built-in login, an auto API, and a **spreadsheet-style Table Editor**
  to view/edit/export data — so we get the "Google-Sheets-easy" view your boss
  wanted, but on a real database (no concurrency/rate-limit problems).
- **Frontend hosting (later):** **Cloudflare Pages** (free, unlimited bandwidth)
  — or Vercel/Netlify.
- **Cost:** free for our scale (≤ ~1000 users, light data). Would only cost
  ~$25/mo if it ever far outgrows the free limits; no surprise billing (free plan
  needs no card and just shows a usage meter).

## Why not Google Sheets as the live DB

Sheets is great to *read* but a poor *live database*: it corrupts on simultaneous
writes, has tight rate limits (~60 writes/min), and no real per-user security.
Supabase's Table Editor already gives the spreadsheet view; if the boss wants the
data literally in Sheets/Excel, we add a one-way **export** (per-table CSV, or a
per-user Excel workbook with one tab per tool, or a scheduled auto-export).

## Data model (how it's stored)

- **NOT** a table per user. **One table per tool**; each user's entries are
  **rows**, tagged with a `user_id` column.
- 7-ish tools + 10 users = ~8 tables (not 70). Each table holds everyone's rows.
- Fill a tool 5 times → 5 rows (history kept). Edit the same item → its row
  updates (a unique key prevents duplicates, e.g. Power Planner = one row per
  week per user).
- **Roles:** `client` / `consultant` / `admin` on each profile.
- **`consultant_assignments`** links a consultant to their clients (admin sets it).
- **Row-Level Security (database-enforced):** client sees own data; consultant
  sees assigned clients (read-only); admin sees all. No SQL needed by anyone —
  the consultant/admin **dashboard** runs the lookups behind a point-and-click UI.

Full table list + the runnable SQL: [`../backend/supabase/schema.sql`](../backend/supabase/schema.sql).

---

## Checklist

### Step 1 — You: create the project (~15 min, one-time)
1. **supabase.com** → Sign up (use a **company/boss-owned** account — it owns the
   production data; not a throwaway).
2. **New project** → Name `productivity-shastra`, set & **save a DB password**,
   Region **Mumbai** or **Singapore**.
3. Wait ~2 min for provisioning.
4. **Project Settings → API** → copy **Project URL** and **anon public** key.
5. Hand both to the dev (paste in chat).

### Step 2 — Dev: connect login (~½–1 day)
- Restore the Supabase client (`@supabase/supabase-js`, real `lib/supabase.js`,
  `isConfigured = Boolean(url && key)`).
- Put keys in `frontend/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` —
  see `frontend/.env.example`).
- App auto-switches from demo/localStorage auth to real Supabase auth.
- **Verify:** sign up in the app → user appears in Supabase → Authentication →
  Users, and a row appears in `profiles`.

### Step 3 — Dev: build tables (~1 day)
- Run [`backend/supabase/schema.sql`](../backend/supabase/schema.sql) in the SQL
  Editor (paste → Run). Creates all tables + security rules.
- **Verify:** Table Editor shows the (empty) tables.
- Make yourself admin:
  `update public.profiles set role='admin' where email='you@company.com';`

### Step 4 — Dev: wire tools to the DB, one at a time (~1–2 weeks)
- Per tool, add a thin data layer that reads/writes Supabase and falls back to
  localStorage (mirrors the existing `isConfigured` pattern).
- Order (lowest-risk first): **Meeting → Time Auditor → Time Finder → Reasons →
  Power Planner** (most complex last).
- Each tool = its own reversible commit; test by using it and watching rows land
  in the Table Editor.

### Step 5 — Dev: client/admin/consultant dashboards
- Admin: list users, assign consultants to clients, view any user's data.
- Consultant: see assigned clients, view their data (read-only), export.
- (The role/assignment plumbing already exists in the frontend; we point it at
  real data.)

### Step 6 — Deploy (~½ day)
- Frontend → **Cloudflare Pages** (free). Set the two `VITE_SUPABASE_*` env vars
  in the host's dashboard. Live URL; database stays Supabase.

---

## Viewing & exporting data (no SQL needed)

- **In Supabase:** Table Editor → open a table → **filter by `user_id`** (like
  Excel) → **Export** to CSV (opens in Excel).
- **In the app:** admin/consultant dashboard shows a user's data assembled across
  all tools; optional per-user Excel export (one tab per tool).
- SQL Editor exists for ad-hoc queries but is **optional** — the dev writes any
  query you ever need.

## Manual Supabase settings (MUST match the frontend) — living checklist

> Rule: the frontend's validation and Supabase's settings must always be
> identical. This list is kept current; do each in the Supabase dashboard.

| Area | Frontend rule | Supabase setting to match | Status |
|---|---|---|---|
| Password | `PASSWORD_RE`: min 8 + upper + lower + digit + special | Auth → Passwords: **Min length 8**, requirements **"lowercase, uppercase, digits, and symbols"** | ✅ done 2026-06-09 |
| Email sign-in | email + password sign up/login | Auth → Providers → **Email provider ON** | ✅ on |
| Custom SMTP (REQUIRED for code emails + production) | code-based signup/reset emails | Connected **Resend** SMTP (free 3k/mo). Host `smtp.resend.com`, port `465`, user `resend`, pass = Resend API key. **Domain VERIFIED** in Resend → now delivers to **any** email (not just the account owner). Sender on the verified domain. | ✅ done 2026-06-10 (Resend + domain verified) |
| Email confirm (**OTP at signup**) | Signup emails a **6-digit code**; user types it to finish (proves the email is real — no fake/typo signups) | **"Confirm email" ON**; **Confirm signup** template uses `{{ .Token }}`; **OTP length 6**. | ✅ done 2026-06-10 (signup OTP working) |
| Change email (**Settings → Profile**, in-tab OTP) | Editing the email in Settings → Profile sends a **6-digit code** to the new address, confirmed in the same tab | **(1)** Auth → **Email Templates → "Change Email Address"**: template MUST include `{{ .Token }}`. **(2)** Auth → **"Secure email change" OFF** (so only the NEW address needs confirming — one code). | ⚠️ **edit "Change Email Address" template to `{{ .Token }}` + turn Secure email change OFF** |
| Schema | tables/RLS | Run `backend/supabase/schema.sql` in SQL Editor | ✅ done 2026-06-09 |
| Duplicate accounts | one account per email & phone | **email** unique index (`profiles_email_unique`, case-insensitive) + **phone** unique index + `signup_availability` RPC (all in schema.sql). Live "already exists" message shows on blur of the email/phone fields; signup re-checks before creating. | ✅ done 2026-06-10 (email index added after a dup slipped past Supabase's built-in check — see note below) |
| Post-signup | return to **login** page; do NOT auto-log-in | none in dashboard — handled in code (`register()` signs out the session that confirm-email-off creates) | ✅ done 2026-06-10 |
| Password reset (email, **code-based**) | Forgot Password → enter email (says **"No account exists with this email"** if unknown) → type the **6-digit code** → `/reset-password` sets a new password | **Reset Password** template uses `{{ .Token }}`; **OTP length 6**, expiry 3600; Redirect URL `http://localhost:3000/reset-password` (live URL later). | ✅ done 2026-06-10 (reset OTP working) |
| Password reset (SMS/phone) | **not wanted** — user declined (it's paid: Twilio + India DLT) | Auth → Providers → **Phone: keep OFF permanently** | ⛔ off — **declined 2026-06-10, email reset only** |
| **Time Auditor data (FIRST TOOL WIRED)** | assessments + challenges save per-user to the DB; Analytics/Reports/Final Summary read them; cross-user leaderboard via `challenge_leaderboard()` RPC | View data: **Table Editor → `time_auditor_entries`** (one row per assessment; `entry` jsonb holds slots/top3/stats) and **`level2_challenges`** (one row per challenge run). Filter by `user_id`; Export → CSV for Excel. | ✅ done 2026-06-11 (incl. leaderboard SQL) |
| **Time Finder data (WIRED)** | every saved assessment (routines, recurrence, time saved) per-user; archive/duplicate/delete/clear + dashboard read the DB | **Table Editor → `time_finder_assessments`** — one row per assessment; `assessment` jsonb = routines + totals; `archived` column = active vs archived. No new SQL needed (table existed in schema.sql). | ✅ done 2026-06-11 |
| **Meeting Success Maximizer data (WIRED)** | every meeting (18 answers, status, experience, reflection, notes, archived) per-user; all actions persist | **Table Editor → `meetings`** — one row per meeting; `meeting` jsonb = full record (`archived` inside it). No new SQL needed. | ✅ done 2026-06-11 |

Add a row here whenever a new validation rule or auth/setting is introduced on
either side, so the two never drift.

> **2026-06-10 — AUTH FULLY WORKING (signup-OTP + reset-OTP + login).** Resend
> SMTP connected with a **verified domain** (emails any address). Both OTP flows
> send a real 6-digit code.
> **Testing gotcha that cost us time:** re-signing-up an **existing** email sends
> NO new email (user already exists), so you keep seeing the OLD link email and
> think the template is broken. Always test signup with a **never-used** address
> (Gmail `+alias` trick, e.g. `you+test1@gmail.com`, hits the same inbox but is a
> new user → forces a fresh email with the current template).
> **Optional polish (not blocking):** Resend flags "don't use no-reply" — can
> switch the SMTP sender to `hello@`/`accounts@` for slightly better deliverability.
> **Before launch:** re-point the sender to the production domain if different;
> keep "Confirm email" ON.

> **2026-06-10 — duplicate-email fix.** Supabase's built-in email check let a
> duplicate through during testing (two `profiles` rows, same Gmail). Root cause:
> we had a DB unique index for **phone** but not for **email** (we trusted
> Auth's built-in). Fix: added `profiles_email_unique` so the DB is the hard
> guarantee for both. **To apply in Supabase:** first delete the existing
> duplicate user(s) (Authentication → Users → delete the extra one → it cascades
> to `profiles`), THEN re-run `schema.sql` (or just the email-index statement) —
> the index can't be created while duplicates still exist.

## First thing to do tomorrow

**Step 1 only.** Create the project, copy the two keys, hand them over. Everything
after that is dev work you review.
