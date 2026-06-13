# Project handoff — Productivity Shastra (read me first)

## ⚠️ THIS BRANCH: `gsheets-backend` — Supabase REMOVED, DIRECT Google Sheets

A demo/experiment branch (2026-06-12) to compare against the Supabase version
on `master`. Everything below this section describes `master`; on THIS branch:

- **NO SERVER AT ALL** (user dropped the earlier Apps Script middle step —
  `backend/gsheets/Code.gs` is kept only as reference, superseded). The browser
  talks DIRECTLY to the Drive API v3 + Sheets API v4 via `lib/gsApi.js`.
  Only env var: `VITE_GOOGLE_CLIENT_ID` (same OAuth client as Calendar) —
  `isConfigured` = its presence; empty = offline/localStorage demo mode.
  Cloud project needs **Google Sheets API + Google Drive API enabled**. Scope
  `spreadsheets + drive.file`; one consent popup per ~hour (token cached in
  sessionStorage), popup only ever opens from user-gesture paths
  (interactive:false at app boot).
- **Drive structure (all auto-created, ids cached in _meta + memory):**
  root folder `Productivity-Shastra-Data` → `_System` spreadsheet (tabs:
  `users`, `_meta`) → ONE FOLDER PER USER `"<Name> — <email>"` created at
  SIGNUP, containing 5 spreadsheets: Time Auditor (entries, challenges),
  Time Finder (assessments), Meeting (meetings), Power Planner (weeks,
  reviews, settings), Reasons Eliminator (sessions, grip_tests, grip_history).
  Tab row 1 = headers mirroring old Postgres columns (no user_id — the folder
  is the scope); cells JSON-encoded. Everything lives in the Drive of whoever
  completes the consent popup (demo-grade single-account model).
- **Auth = Supabase (2026-06-13).** Only the `_System` users data moved to
  Supabase; ALL tool data + the `_meta` Drive cache stay in Sheets. Table
  `app_users` (mirrors the old users columns incl. password_hash+salt) is
  reached via SECURITY DEFINER RPCs (`app_login/app_signup/app_availability/
  app_get_user/app_list_users/app_update_profile/app_delete_user`); RLS on +
  no policies so the anon key can't read the table directly (hash/salt stay
  server-only). Same SHA-256(salt+password) scheme → lossless migration from
  the sheet (Apps Script `sync-users.gs`). Frontend: `lib/supabaseAuth.js`
  (PostgREST fetch, no SDK) + authService/userService rewritten;
  admin/consultant/level2 user lists + leaderboard read `app_list_users`
  (leaderboard still joins each user's Sheets tool data by id). Session token
  stays a `sess-<uuid>` in sessionStorage (F5 keeps login). Env:
  VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (auth), VITE_GOOGLE_CLIENT_ID
  (tools). SQL+migration: `backend/supabase-auth/`. The user's Drive tool
  folder now auto-provisions LAZILY on first tool use (no Google popup at
  signup). **Password reset, email change, signup OTP: still stubbed.**
  Deleted app_users row → next app boot signs out.
- **Services**: exports IDENTICAL to master (pages untouched). gsApi surface =
  listRows/upsertRows(merge)/deleteRows/clearRows + listRowsForUser.
  ppService keeps debounced+diffed sync; reService keeps in-memory cache +
  fire-and-forget. **Leaderboard computed CLIENT-SIDE** in level2Service
  (reads every user's Time Auditor sheets via _meta; same 50/50 formula).
  `lib/supabase.js` is a SHIM (auth.* works off gsApi; .from/.rpc throw) so
  the ~12 legacy services compile untouched. Timing: every Google API call
  logs ms; `window.apiTimings()` console.tables the session.
- **Google Calendar**: Edge-Function path stubbed OFF; classic GIS popup
  fallback works. Avatar upload throws "not available".
- `@supabase/supabase-js` uninstalled. Build green. Do NOT merge into master.

---

This file is auto-loaded by Claude Code at the start of every session opened in
this folder. It exists so a new session can work smartly **without** re-reading
the whole codebase and without needing `--resume`/`--continue`. Keep it current.

## What this project is

A unified productivity suite: one React frontend bundling a shell app
(login + dashboard hub + "Time Auditor") and several merged tools. Built for the
user's boss; preparing to go live. Frontend-only today (data in `localStorage`);
backend planned but not started.

## Current state (as of 2026-06-08)

- **Monorepo (clean root):** `frontend/` (the app), `backend/` (empty scaffold),
  `documentation/` (official docs + PDFs), `README.md`, `CLAUDE.md`, `.claude/`
  (memory anchor, never move). The pre-merge source folders were **removed** (code
  is safe under `frontend/src/features/`; originals re-obtainable from teammate
  zips if ever needed).
- **Under git** since 2026-06-08 (branch `master`, root `.gitignore` excludes
  node_modules/dist/.env/local Claude settings). No remote yet. Commit/push only
  when the user asks. Root `package.json` has convenience scripts
  (`npm run dev|build` proxy to frontend). `frontend/STRUCTURE.md` explains
  base-vs-tools; `frontend/.env.example` holds the future `VITE_API_BASE_URL`.
- **Merge DONE & building green.** Five tools live under `frontend/src/features/`:
  `power-planner`, `reason-eliminator`, `meeting`, `time-finder` (+ the shell's own
  Time Auditor). `npm run build` passes (369 modules).
- **Auth:** frontend-only mock (Supabase removed; `lib/supabase.js` →
  `isConfigured=false`). No backend needed to run. Do **not** add backend/auth
  unless asked — the user explicitly deferred it.
- **Backend = Supabase (AUTH FULLY WORKING), hosting = Cloudflare Pages** — free at
  our scale. Project ref `cotcaijxuyxbhodxpxrs`; keys in `frontend/.env` (git-ignored;
  `isConfigured` TRUE → real auth, demo path off). `@supabase/supabase-js`
  installed; real `lib/supabase.js` restored; `backend/supabase/schema.sql` run in
  Supabase (tables + RLS + signup trigger). **Auth complete (2026-06-10):** signup
  with **email-OTP confirmation** (6-digit code), login, **forgot-password via OTP
  code** → `/reset-password`, duplicate email+phone blocked (DB unique indexes +
  live "already exists" check), phone capped at 10 digits, post-signup returns to
  login (no auto-login), orphaned/deleted sessions auto-sign-out. **Email:** Resend
  SMTP with a **verified domain** (sends to any address); "Confirm email" ON;
  Confirm-signup + Reset-password templates use `{{ .Token }}`. SMS/phone reset
  **declined** (paid). See `documentation/06-Backend-Setup.md` for the full
  Supabase-settings checklist + the "+alias" testing gotcha.
  **Tool data wiring (2026-06-11): Time Auditor suite + Time Finder + Meeting
  = DONE.** Time Auditor: assessments → `time_auditor_entries` (taService),
  challenge runs → `level2_challenges` (level2Service + DB-hydrated
  ChallengeContext); Analytics/Reports/Final Summary compute from REAL
  assessments (`utils/taAnalytics.js`); **cross-user leaderboard** via
  SECURITY-DEFINER RPC `challenge_leaderboard()` (score = 50% daily-audit
  consistency + 50% avg productivity; only real participants; same list for
  all). Time Finder: → `time_finder_assessments` rows (tfService; archived
  column; draft `currentAssessment` stays local). Meeting: → `meetings` rows
  (meetingService; MeetingContext hydrates + persists every mutation; meeting
  id = row uuid; localStorage only in demo mode). All required SQL is run.
  **Power Planner WIRED too (2026-06-11):** weeks → `power_planner_weeks` (one
  row per user-week, full plan jsonb), NEW `power_planner_reviews` (auto-computed
  scoreboard: completion %, productivity score, totals in real columns —
  recomputed on every sync by `services/ppService.js`, debounced + diffed),
  settings + NEW `gcal_event_ids` column → `power_planner_settings`.
  Carry-forward = flagged rows, no table. usePowerPlanner hydrates from DB;
  localStorage demo-only. ⚠️ schema.sql must be re-run (adds reviews + column).
  **Google Calendar = DONE & WORKING (2026-06-11).** OAuth Client ID created
  (in frontend/.env as VITE_GOOGLE_CLIENT_ID); Edge Function `gcal` DEPLOYED
  (Verify JWT off; secrets GOOGLE_CLIENT_ID/SECRET in Supabase vault; tables
  google_tokens + gcal_oauth_states; repo copy:
  backend/supabase/functions/gcal/index.ts). Sign-in-ONCE works: token row
  saved, silent exports + meeting Schedule confirmed, UPDATE-not-duplicate
  confirmed. Meeting "Schedule" button: date+time modal, duration from q17
  (boxes UI, no 0-duration), event "Meeting: <name>", per-meeting gcalEventId;
  delete = manual calendar cleanup w/ link (auto later). ⚠️ PENDING (user,
  tomorrow): RE-PASTE index.ts into the dashboard editor + Deploy to pick up 3
  fixes (callback 302→calendar.google.com instead of raw-HTML page; account
  chooser always; utf-8). Launch checklist: publish consent screen +
  verification (removes 'do you trust supabase.co' warning), add live domain
  origins.
  **REASONS ELIMINATOR WIRED (2026-06-12) — ALL 5 TOOLS NOW HAVE BACKEND.**
  Three redesigned tables (schema.sql has a safe one-time migration off the
  old `payload` placeholders): `reasons_sessions` (1 row/session, (user_id,id)
  text PK — fits the `pp:<week>` bridge ids; reasons jsonb + status/source/
  week_start), `reasons_grip_tests` (1 row per reason's LATEST grip score —
  real score/status columns for admin queries), `reasons_grip_history` (1 row
  per completed run, append-only). Pattern: RE pages read SYNCHRONOUSLY, so
  `services/reService.js` holds an in-memory cache hydrated once when the
  tool opens (RE App gates rendering with a loader); every write updates the
  cache + fire-and-forgets the row upsert/delete; cache resets on auth change;
  localStorage demo-only. PP→RE bridge awaits `ensureReasonsHydrated()` so a
  review save never overwrites unseen Power Words. ⚠️ schema.sql must be
  RE-RUN once (drops empty placeholder tables, creates real shapes).
  Same week also shipped: PP review TFCR compulsory (+sub each), only TYPED
  reasons flow to RE (badge 'From Power Planner'), RE discard/continue guard +
  pre-PowerWord visibility + live badge, unsaved-changes guard across ALL
  tools' shell exits (lib/navGuard.js), MSM schedule toast, dashboard audit
  (MSM dedup, TF Efficiency Score removed).
  **Next:** admin/consultant data views (UNPARK when user says) → deploy.
  Keep frontend↔Supabase in sync + end-of-session checklist.
- **Browser QA still pending** — the build is green but the merged app hasn't been
  click-tested in a browser yet.

## How the merge works (so you don't relearn it)

- Shell owns the only `<BrowserRouter>` (`frontend/src/main.jsx`) and routing
  (`src/routes/AppRoutes.jsx`). Tools are mounted full-screen (outside HomeLayout)
  at `/power-planner`, `/reason-eliminator/*`, `/time-finder/*`,
  `/meeting-framework/*`.
- Each tool's `features/<tool>/App.jsx` is a router-free component with **relative**
  `<Route>` paths; internal `navigate()`/`<Link>` use absolute paths prefixed with
  the tool's mount. Shell page wrappers (`src/pages/<Tool>Page.jsx`) mount each tool
  in its own light-theme container + a `<HubLink/>` back to `/home`.
- **One** Tailwind config (`frontend/tailwind.config.js`): brand palettes merged;
  Meeting `ink`→`mkink`, Time Finder `ink-*`→`tfink-*`. Never globally import a
  tool's `index.css` (it has a `body` reset that fights the dark shell); use
  `features/<tool>/scoped.css` for component classes.
- `localStorage` keys are namespaced per tool (`power-planner-*`,
  `altus.reasonEliminator.*`, `msm_*`; Time Finder uses generic keys — namespace
  before reuse).

Full detail: `documentation/01-Architecture.md` and `03-TRD.md`.

## Conventions when adding/merging another tool

1. Copy its `src` → `frontend/src/features/<name>/`.
2. Remove its `<BrowserRouter>`; make `<Route>` paths relative; prefix internal
   nav with the mount path.
3. Merge its deps into `frontend/package.json`; merge unique Tailwind tokens
   (namespace clashes); add fonts to `index.html`.
4. Add a `src/pages/<Tool>Page.jsx` wrapper (themed container + `HubLink`) and a
   route in `AppRoutes.jsx`; enable its card in `src/pages/Home.jsx`.
5. `npm run build` until green. Update the docs in `documentation/` + this file.

## Working agreement with this user

- Clarify if risky/ambiguous; back up files before editing; summarize and ask
  yes/no/chat after changes.
- Keep each tool's own logic intact during merges.
- Keep `documentation/` and this handoff updated as things change (the user asked
  for this explicitly).

## Continuity note

You do **not** need `--resume` each day: the saved memory (under
`~/.claude/projects/.../memory/`) and this `CLAUDE.md` auto-load by folder. Use
`--resume` only to recover the full verbatim chat transcript.
