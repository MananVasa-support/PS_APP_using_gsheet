# 04 — App Flow

_Last updated: 2026-06-08_

## 1. Top-level navigation flow

```
                ┌─────────────┐
                │  Landing /  │
                └──────┬──────┘
                       │
                 ┌─────▼─────┐      (mock auth, localStorage)
                 │  /login   │
                 └─────┬─────┘
                       │ success
                 ┌─────▼─────────────────────────┐
                 │  /home  — the HUB (module cards)│
                 └──┬───┬───┬───┬───┬───┬─────────┘
        ┌───────────┘   │   │   │   │   └────────────┐
        ▼               ▼   ▼   ▼   ▼                ▼
   Time Auditor   Time Finder  Power   Reason   Meeting   Pre/Post PS
   /dashboard     /time-finder Planner Eliminator Framework  /pre-ps
                               /power- /reason-  /meeting-    /post-ps
                               planner eliminator framework
        ▲               │       │       │          │
        └───────────────┴───────┴───────┴──────────┘
                  HubLink (bottom-right) → /home
```

- **Auth gate:** every tool route is wrapped in `<ProtectedRoute>`. Unauthenticated
  users are redirected to `/login`. (Auth is a local mock — no server.)
- **Back to hub:** each full-screen tool shows the fixed `HubLink` pill → `/home`.
  Browser back also works (single shared history).

## 2. Per-tool internal flow

### Power Planner (`/power-planner`)
Single screen (`PowerPlannerHome`). Weekly grid of commitments → results →
actions; recurrence + ride-along logic; per-week edits persist. "Hot refresh"
wipes all planner data via a reset flag.

### Reasons Eliminator (`/reason-eliminator/*`)
```
home → new assessment → assess → power-word → summary
   ├→ previous assessments → detail
   ├→ reasons / reasons-master / power-word-master / power-word-missing
   ├→ grip-test → grip-history → detail
   └→ dashboard / deep-review / guidelines
```

### Meeting Success Maximizer (`/meeting-framework/*`)
```
prep (home) → meeting-list → meeting-list/:id (details)
   ├→ edit/:id (reuse prep form)
   └→ dashboard (analytics, lazy-loaded)
```

### Time Finder (`/time-finder/*`)
```
select-routines (home) → add-routine → new-assessment → recurrence
   → align-routines → next-step → saving-time → assessment
   ├→ previous-assessment → assessment/:id
   ├→ session → adjust → table
   └→ dashboard / edit-assessment
```

## 3. Data flow (current — local only)

```
React component ──► tool hook/util ──► localStorage (namespaced key)
        ▲                                      │
        └──────────── re-render ◄──────────────┘
```

No network calls are required for any tool to function today.

## 4. Data flow (future — with backend)

```
React component ──► tool data layer ──► axios ──► /api ──► DB
                          │
                          └─ falls back to localStorage when offline / unconfigured
```

The auth layer already follows this "configured vs. offline" pattern
(`isConfigured` flag), which is the template for wiring the backend per tool — see
[Backend Schema](./05-Backend-Schema.md).
