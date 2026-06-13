# Auth on Supabase — `_System` users only

On the `gsheets-backend` branch, **only the `_System` users data lives in
Supabase**; every tool's data (Time Auditor, Time Finder, Meeting, Power
Planner, Reasons Eliminator) and the `_meta` Drive id-cache **stay in Google
Sheets**. This folder holds the two things you run in Supabase.

## Files

| File | What it is | Where it runs |
|---|---|---|
| `schema.sql` | the `app_users` table + RLS + auth/CRUD functions | Supabase → SQL Editor |
| `sync-users.gs` | one-time migration of existing sheet users → Supabase | Apps Script on `_System` |

## How it works

- `app_users` mirrors the old sheet columns exactly (incl. `password_hash` +
  `salt`). Passwords keep the same **SHA-256(salt + password)** scheme, so
  migrated users keep their passwords (lossless).
- The table has **RLS on with no policies** → the public anon key can't read it
  at all. All access is through **SECURITY DEFINER functions** (`app_login`,
  `app_signup`, `app_list_users`, …) that return only safe columns. The hash
  and salt never leave the database.
- The frontend calls these functions over PostgREST (`/rest/v1/rpc/...`) from
  `frontend/src/lib/supabaseAuth.js`. The app session is still a
  `sess-<uuid>` token in `sessionStorage` (F5 keeps login; fresh launch logs
  out), so the tool services are unaffected.

## Frontend config (`frontend/.env`)

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
VITE_GOOGLE_CLIENT_ID=<existing — still needed for the tools' Sheets data>
```

When the two Supabase vars are present, auth runs on Supabase; when absent, the
app falls back to its offline demo login. The Google client id is unchanged and
still drives all tool data in Sheets.

## Quotas / security notes

- Demo-grade trust model (same as before): `app_list_users` returns every
  user's public profile (no hashes) to anyone with the anon key — equivalent to
  what the shared sheet exposed. The real improvement: password hashes are now
  private (server-only).
- The `service_role` key (used only by `sync-users.gs`) bypasses RLS — keep it
  in Apps Script Script-properties, never in the frontend.

See `../../documentation` and the repo `CLAUDE.md` for the full picture.
