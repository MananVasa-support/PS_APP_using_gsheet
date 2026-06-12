# SUPERSEDED — kept as reference only

> **2026-06-12:** the `gsheets-backend` branch now talks to Google Drive/Sheets
> **DIRECTLY from the browser** (`frontend/src/lib/gsApi.js`) — no Apps Script
> web app is deployed or needed. [Code.gs](Code.gs) is kept only as reference
> for the earlier server-based design (it still works if a server is ever
> wanted again: auth with server-held sessions, per-user isolation enforced
> server-side, emailed password-reset codes, and a server-computed
> leaderboard — none of which the direct mode can do securely).

## Current (direct) design — quick recap

- Only env var: `VITE_GOOGLE_CLIENT_ID` (frontend/.env). Enable **Google
  Sheets API** and **Google Drive API** in the same Cloud project.
- One Google consent popup per ~hour (scopes: `spreadsheets` + `drive.file`);
  everything is stored in the Drive of whoever completes the popup.
- Auto-created structure:

```
Productivity-Shastra-Data/
├─ _System                       (spreadsheet: users / _meta)
└─ "<Name> — <email>"/           (one folder per user, created at signup)
   ├─ Time Auditor               (entries, challenges)
   ├─ Time Finder                (assessments)
   ├─ Meeting                    (meetings)
   ├─ Power Planner              (weeks, reviews, settings)
   └─ Reasons Eliminator         (sessions, grip_tests, grip_history)
```

- Row 1 of every tab = headers mirroring the old Postgres columns (no
  user_id — the folder is the user scope). Cells are JSON-encoded; `_meta`
  caches folder/spreadsheet ids so Drive isn't searched per request.
- App-level login = `users` tab, checked client-side (SHA-256+salt hashes).
  DEMO-GRADE: fine for a demo, never for production. Password reset / email
  change / signup OTP are stubbed (they need an email server).
- Leaderboard is computed client-side from every user's Time Auditor sheets.
- Timing: every Google API call logs its ms; run `window.apiTimings()` in the
  browser console for the comparison table vs Supabase.
