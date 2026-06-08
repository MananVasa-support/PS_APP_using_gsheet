# Project handoff — Productivity Shastra (read me first)

This file is auto-loaded by Claude Code at the start of every session opened in
this folder. It exists so a new session can work smartly **without** re-reading
the whole codebase and without needing `--resume`/`--continue`. Keep it current.

## What this project is

A unified productivity suite: one React frontend bundling a shell app
(login + dashboard hub + "Time Auditor") and several merged tools. Built for the
user's boss; preparing to go live. Frontend-only today (data in `localStorage`);
backend planned but not started.

## Current state (as of 2026-06-08)

- **Monorepo:** `frontend/` (the app), `backend/` (empty scaffold), `documentation/`
  (official docs + PDFs), `.claude/` (memory anchor, never move).
- **Merge DONE & building green.** Five tools live under `frontend/src/features/`:
  `power-planner`, `reason-eliminator`, `meeting`, `time-finder` (+ the shell's own
  Time Auditor). `npm run build` passes (369 modules).
- **Auth:** frontend-only mock (Supabase removed; `lib/supabase.js` →
  `isConfigured=false`). No backend needed to run. Do **not** add backend/auth
  unless asked — the user explicitly deferred it.
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
