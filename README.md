# Productivity Shastra

A unified productivity-suite web app: one login, one dashboard ("hub"), and
several tools merged into a single React frontend. Built for the boss; preparing
to go live.

> **Status:** Frontend merge complete and building green. Backend not started yet
> (deliberate — see below). Auth currently runs as a local mock, no server needed.

## Monorepo layout

```
APPPP/
├── frontend/        # the merged React app — everything users see
├── backend/         # reserved for the future API/server (empty scaffold)
├── documentation/   # official docs (Markdown source + generated PDFs)
├── README.md        # this file
├── CLAUDE.md        # project handoff (auto-loaded by Claude Code each session)
└── .claude/         # Claude memory anchor — do not move
```

The original standalone tool folders (`Power Planner/`, `Reasons Eliminator/`,
`Meeting Success Maximizer/`, `Time Finder/`, `Base+Time Auditor/`) are the
**pre-merge sources**, kept only until the merged app is verified in the browser,
then removed.

## The app

| Area | Route | What it is |
|------|-------|-----------|
| Hub / dashboard | `/home` | Module picker — links to every tool |
| Time Auditor | `/dashboard`, `/time-auditor` | Shell-native time tracking & analytics |
| Power Planner | `/power-planner` | Weekly planner with recurrence engine |
| Reasons Eliminator | `/reason-eliminator` | Excuse-elimination assessment + grip test |
| Meeting Success Maximizer | `/meeting-framework` | Plan / run / review meetings |
| Time Finder | `/time-finder` | Routine assessment & time-saving flow |

Each tool keeps its own logic, layout, theme, and `localStorage` data. The shell
owns one router and one Tailwind theme; tools render full-screen in their own
light theme with a fixed **Hub** button back to `/home`. See
[`documentation/01-Architecture.md`](documentation/01-Architecture.md).

## Run it

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # → frontend/dist  (static SPA, deploy anywhere)
```

No backend or env vars are required to run today.

## Documentation

Official docs live in [`documentation/`](documentation/) as Markdown (the editable
master) with generated PDFs in `documentation/pdf/`:

- **01 Architecture** · **02 PRD** · **03 TRD** · **04 App Flow** · **05 Backend Schema**

Regenerate the PDFs after editing any doc:

```powershell
cd documentation
./build-pdfs.ps1      # Markdown -> styled HTML -> PDF (uses Chrome)
```

## Backend (planned)

Intentionally not built yet — the technology (Supabase vs. custom Node API vs.
other) is undecided, so the frontend was kept backend-agnostic. The proposed data
model and API are in
[`documentation/05-Backend-Schema.md`](documentation/05-Backend-Schema.md). When
it starts, it lives under `backend/` and is wired per tool (localStorage →
API fallback pattern).
