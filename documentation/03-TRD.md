# 03 — Technical Requirements Document (TRD)

_Last updated: 2026-06-08_

## 1. Stack

| Concern | Choice |
|--------|--------|
| Language | JavaScript (JSX), ES modules |
| UI | React 18 |
| Build | Vite 5 |
| Routing | react-router-dom v6 |
| Styling | Tailwind CSS 3 (+ PostCSS, Autoprefixer) |
| Animation | framer-motion |
| Charts | recharts |
| Icons | react-icons |
| HTTP (future API) | axios |
| Exports | jspdf, jspdf-autotable, xlsx |

All five tools shipped on this **same** stack, which is what made the merge clean.

## 2. Project structure (frontend)

```
frontend/
├── index.html              # loads Inter, Plus Jakarta Sans, Outfit fonts
├── vite.config.js          # @ → ./src alias, dev port 3000
├── tailwind.config.js      # ONE merged theme (see §4)
├── package.json            # ONE merged dependency set
└── src/
    ├── main.jsx            # providers + BrowserRouter (the single router)
    ├── App.jsx → routes/AppRoutes.jsx
    ├── index.css           # global dark theme + Tailwind directives
    ├── pages/              # shell pages incl. <Tool>Page.jsx mount wrappers
    ├── components/ui/HubLink.jsx   # back-to-hub pill used by every tool
    ├── context/, hooks/, layouts/, services/, lib/   # shell internals
    └── features/
        ├── power-planner/
        ├── reason-eliminator/
        ├── meeting/
        └── time-finder/
```

## 3. Routing conventions

- The shell owns the **only** `<BrowserRouter>` (in `src/main.jsx`).
- A tool with internal routes is mounted with a **splat**:
  `<Route path="/time-finder/*" element={<TimeFinderPage/>}/>`.
- Inside a tool, `<Route>` paths are **relative** (no leading `/`); `path=""` is
  the tool's home.
- Inside a tool, `navigate()`/`<Link to>` use **absolute app paths** that include
  the tool's mount prefix (e.g. `/meeting-framework/meeting-list`). This is why
  bare-path tools (Meeting, Time Finder) had their nav prefixed during the merge.
- Returning to the hub: `<HubLink/>` → `/home`.

## 4. Styling conventions

- **One** Tailwind config and **one** global CSS. The app shell is dark; tools
  render light inside their own full-screen wrapper.
- Token collisions were resolved by **namespacing**, not by overriding:
  - `brand` = shell numeric scale **+** tools' named keys (merged).
  - Meeting `ink`/`ink-soft` → `mkink`/`mkink-soft`.
  - Time Finder `ink-900/500/200` → `tfink-900/500/200`.
  - Time Finder `bg-neutral-50` → `bg-[#fafafa]` (shell repurposes `neutral` as a
    flat category color, which removes the default `neutral-*` scale).
- A tool needing component-level CSS classes ships `features/<tool>/scoped.css`
  (plain rules + `@apply`, **no** `@layer` wrapper — each file compiles alone).
- **Rule of thumb for adding a tool:** never globally import a tool's `index.css`
  (it carries a `body` reset). Wrap the tool and namespace any custom color tokens
  that clash with the shell or another tool.

## 5. Aliases

- `@` → `frontend/src` (Vite + jsconfig).
- Reasons Eliminator originally used `@/` for its own root; during the merge those
  were rewritten to `@/features/reason-eliminator/…`. Other tools use relative
  imports.

## 6. Build, run, deploy

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # → frontend/dist
npm run preview  # serve the production build
```

- Deploy `frontend/dist` to any static host with SPA fallback to `index.html`.
- Build currently emits a chunk-size warning (jspdf/recharts are large). Optional
  follow-up: `manualChunks` to split vendor bundles. Not blocking.

## 7. Known technical risks / follow-ups

| Risk | Note | Severity |
|------|------|----------|
| Time Finder generic `localStorage` keys | `assessments`, `currentAssessment`, etc. are not namespaced. No clash today, but namespace them (`timefinder.*`) before adding any tool that could reuse those names. | low |
| Meeting font | Tool components use `font-sans` (now Inter); the wrapper sets `font-meeting` (Outfit). Most text renders Inter. Cosmetic only. | low |
| Light/dark theme toggle | The shell can switch to a light theme; tools assume the default dark `html` for namespaced `ink` resolution. Tools set their own surfaces, so impact is minor, but verify if the theme toggle is exposed to users. | low |
| Bundle size | jspdf + recharts inflate the largest chunks. | low |

## 8. Quality gates

- ✅ `npm run build` passes (369 modules, all tool chunks emitted).
- ◑ Browser QA per tool (navigate hub → each tool → back; create/edit/persist).
- ☐ Lint pass (no shared eslint config yet across features).
