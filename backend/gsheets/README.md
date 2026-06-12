# Google Sheets backend (branch `gsheets-backend`)

One **Google Apps Script web app** ([Code.gs](Code.gs)) is the entire API
server; **Google Drive/Sheets** is the database. No Supabase, no other host,
all free. Built to compare speed against the Supabase version on `master`.

## Deploy (the only manual steps — everything else auto-creates)

1. **Drive**: create ONE folder, e.g. `Productivity-Shastra-Data`. Open it and
   copy the folder id from the URL (`https://drive.google.com/drive/folders/<THIS-ID>`).
2. **script.google.com** → **New project** → delete the default code → paste
   the whole of `Code.gs` → set `ROOT_FOLDER_ID = '<THIS-ID>'` at the top →
   save (Ctrl+S).
3. **Deploy → New deployment** → gear icon → type **Web app** →
   - Description: anything
   - **Execute as: Me**
   - **Who has access: Anyone**
   → Deploy → authorize with your Google account (Advanced → Go to … (unsafe)
   is normal for your own script) → copy the **Web app URL** (ends in `/exec`).
4. Put it in `frontend/.env`:
   `VITE_API_BASE_URL=https://script.google.com/macros/s/…/exec`
   → restart `npm run dev`.
5. **Every time Code.gs changes**: Deploy → **Manage deployments** → pencil →
   Version: **New version** → Deploy. (The URL stays the same — no .env change.)

Sanity check: opening the `/exec` URL in a browser (GET) returns
`{"ok":true,"service":"productivity-shastra-gsheets",…}`.

## What auto-creates

```
<your folder>
├─ _System                       (spreadsheet: users / sessions / _meta)
└─ <user_id> — <email>/          (one folder per user, on first write)
   ├─ Time Auditor               (entries, challenges)
   ├─ Time Finder                (assessments)
   ├─ Meeting                    (meetings)
   ├─ Power Planner              (weeks, reviews, settings)
   └─ Reasons Eliminator         (sessions, grip_tests, grip_history)
```

Row 1 of every worksheet = headers mirroring the old Postgres columns (minus
`user_id` — the folder is the user scope). Cells are JSON-encoded so types
round-trip; `_meta` caches folder/spreadsheet ids so Drive is never searched
per request.

## Notes / limits

- Passwords: SHA-256(salt+password), per-user random salt — never plain.
- Sessions: random token in the `sessions` sheet; the frontend keeps it in
  sessionStorage (F5 stays logged in, fresh launch starts at login).
- Per-user isolation: a token resolves to one user id and data routes can only
  open spreadsheets registered under that id (replaces Postgres RLS).
- Password-reset emails use `MailApp` — **~100 emails/day** on a consumer
  account. Signup email-OTP was deliberately skipped on this branch.
- `/leaderboard` recomputes from every user's Time Auditor spreadsheet,
  cached 60 s.
- Expect ~0.5–3 s per request (Apps Script cold starts + Sheets I/O). The
  frontend logs every request's ms — run `window.apiTimings()` in the browser
  console for the comparison table vs Supabase.
