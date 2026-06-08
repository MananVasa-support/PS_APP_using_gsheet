# Frontend structure — base vs. tools

One merged React app. **One** `package.json`, **one** Vite build, **one** router,
**one** Tailwind theme. The "base" (app shell) lives at the `src` root; each
merged **tool** is a folder under `src/features/`.

```
frontend/
├── index.html              # entry; loads fonts
├── package.json            # the one dependency set for the whole app
├── vite.config.js          # @ → ./src
├── tailwind.config.js      # the one merged theme (brand palettes + namespaced tokens)
├── .env.example            # future backend API URL (optional today)
└── src/
    ├── main.jsx            # ← BASE: app entry, providers, the single <BrowserRouter>
    ├── App.jsx             # ← BASE
    ├── index.css           # ← BASE: global dark theme + Tailwind directives
    ├── routes/             # ← BASE: AppRoutes + ProtectedRoute
    ├── layouts/            # ← BASE: HomeLayout (hub), DashboardLayout, AuthLayout
    ├── pages/              # ← BASE: login, hub (Home.jsx), Time Auditor, + tool mount wrappers
    ├── context/ hooks/ services/ lib/ data/ constants/ utils/   # ← BASE: shell internals
    ├── components/         # ← SHARED UI + shell components (ui/, charts/, layout/, …)
    │   └── ui/HubLink.jsx  #     back-to-hub pill used by every tool
    └── features/           # ← THE TOOLS (each self-contained, own logic/theme/storage)
        ├── power-planner/
        ├── reason-eliminator/
        ├── meeting/
        └── time-finder/
```

## What is "base"?

Everything in `src/` that is **not** `features/` is the base/shell: the login,
the dashboard hub, routing, layouts, auth, and the shell-native Time Auditor.
The base is the application frame the tools plug into — it is intentionally **not**
a `features/` folder, because it is the app itself, not a peer tool.

## What is a "tool"?

A self-contained product under `src/features/<tool>/`. Each tool keeps its own
components, layout, theme, and `localStorage` data. The shell mounts it at a route
and wraps it in a themed full-screen container (see `src/pages/<Tool>Page.jsx`).

## Adding another tool (recipe)

1. Copy its `src` → `src/features/<name>/`.
2. Remove its `<BrowserRouter>`; make its `<Route>` paths **relative**; prefix its
   internal `navigate()`/`<Link>` with the mount path (`/<name>/...`).
3. Merge its deps into `package.json`; merge unique Tailwind tokens (namespace any
   that clash); add any fonts to `index.html`.
4. Add `src/pages/<Name>Page.jsx` (themed wrapper + `<HubLink/>`), a route in
   `src/routes/AppRoutes.jsx`, and enable its card in `src/pages/Home.jsx`.
5. `npm run build` until green; update `documentation/` and `../CLAUDE.md`.

See `../documentation/01-Architecture.md` and `03-TRD.md` for the full rationale.
