# Backend (not started)

Reserved for the future API/server. **Intentionally empty.** The backend
technology (Supabase vs. custom Node/Express/Nest vs. other) is undecided, so the
frontend was kept backend-agnostic.

When the backend starts:

1. Pick the tech and scaffold it here.
2. Follow the proposed data model & API in
   [`../documentation/05-Backend-Schema.md`](../documentation/05-Backend-Schema.md).
3. Wire the frontend per tool using the existing "configured vs. offline" pattern
   (see how `frontend/src/context/AuthContext.jsx` gates on `isConfigured`):
   the client talks to the API when configured and falls back to `localStorage`
   otherwise.
4. Update the docs and `../CLAUDE.md` as each tool goes live on the API.
