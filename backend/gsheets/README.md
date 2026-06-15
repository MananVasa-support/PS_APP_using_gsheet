# Tool-data server — Google Apps Script Web App

On the `gsheets-backend` branch the app is a **hybrid**:

- **Auth** → Supabase (`backend/supabase-auth/`). Unchanged.
- **Tool data** → this **Apps Script Web App** ([Code.gs](Code.gs)), which writes
  to Google Sheets **server-side** under one Google account (the **Intern**
  account). The browser never touches Google directly, so there is **no
  per-user consent popup**, and saves are reliable, persistent, cross-device
  and multi-user.

## Why this replaced the browser-direct approach

The earlier "browser talks straight to Google" version needed every user to
complete a Google permission popup every session; if it wasn't completed,
saves failed silently and data lived only in the browser (lost on refresh).
A server fixes that — it owns the writes.

## Deploy (with the INTERN Google account)

1. Go to [script.google.com](https://script.google.com) → **New project** → delete
   the stub → paste all of [Code.gs](Code.gs).
2. (Optional) set `ROOT_FOLDER_ID` to an existing Drive folder id; leave `''`
   to auto-create `Productivity-Shastra-Data` in My Drive.
3. **Deploy → New deployment** → gear → **Web app** →
   - **Execute as: Me**
   - **Who has access: Anyone**
   → **Deploy** → authorize (Advanced → Go to… is normal) → copy the **Web app
   URL** (ends in `/exec`).
4. Put that URL in the frontend as **`VITE_API_BASE_URL`**:
   - `frontend/.env` (local), and
   - **Vercel → Settings → Environment Variables** → add `VITE_API_BASE_URL` →
     **Redeploy**.
5. After ANY edit to Code.gs: **Deploy → Manage deployments → edit (pencil) →
   Version: New version → Deploy** (URL stays the same).

Health check: open the `/exec` URL in a browser (GET) → it returns
`{"ok":true,"service":"productivity-shastra-data",…}`.

## What it stores

```
<root folder>
 ├─ _System                      (spreadsheet: _meta id cache)
 └─ "<name> — <email>"           (one folder per user, by Supabase userId)
     ├─ Time Auditor             (entries, challenges)
     ├─ Time Finder              (assessments)
     ├─ Meeting                  (meetings)
     ├─ Power Planner            (weeks, reviews, settings)
     └─ Reasons Eliminator       (sessions, grip_tests, grip_history)
```

Each row keeps the complete record in a JSON column plus human-readable summary
columns (title, date, counts, scores…). Routes: `/list /upsert /delete /clear
/leaderboard`. Every request carries the Supabase `userId`, so data is scoped
per user. The frontend client is `frontend/src/lib/gsApi.js`.

## Notes / limits

- Demo-grade trust: the web app accepts the `userId` from the client (anyone
  with the URL could call it). Fine for an internal tool; for stricter security,
  verify the Supabase session server-side before writing.
- All data lives in the **deployer's** (Intern's) Drive — that's intentional
  (one place, reliable, cross-device).
- Apps Script: ~6 min/request limit (we use ~1–3 s); a write-per-second
  sustained is fine. Timing: `window.apiTimings()` in the browser console.
