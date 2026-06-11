// Supabase Edge Function: "gcal" — Google Calendar sign-in-once token service.
//
// Routes (mounted at  {SUPABASE_URL}/functions/v1/gcal/… ):
//   POST /authorize   (signed-in user)  → returns the Google consent URL
//   GET  /callback    (public, Google)  → stores the user's refresh token
//   POST /token       (signed-in user)  → silent access token for Calendar API
//   POST /disconnect  (signed-in user)  → forget the Google connection
//
// The user consents to Google ONCE; the refresh token is stored server-side in
// `google_tokens` (RLS: service-role only — the browser never sees it). Every
// later export mints a fresh access token here silently, on any device.
//
// DASHBOARD SETUP (one-time):
//   1. Deploy this as a function named exactly:  gcal
//      and TURN OFF "Verify JWT" for it (the /callback route is opened by
//      Google, which has no Supabase JWT — user routes verify auth manually).
//   2. Edge Function secrets:  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   3. Google Cloud OAuth client → Authorized redirect URIs →
//      {SUPABASE_URL}/functions/v1/gcal/callback

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/gcal/callback`;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Resolve the signed-in Supabase user from the request's Authorization header.
async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop();

  // ── POST /authorize — hand the frontend a Google consent URL ───────────────
  if (route === "authorize" && req.method === "POST") {
    const user = await getUser(req);
    if (!user) return json({ error: "Not signed in." }, 401);

    const { data: state, error } = await admin
      .from("gcal_oauth_states")
      .insert({ user_id: user.id })
      .select("state")
      .single();
    if (error) return json({ error: "Could not start the Google connection." }, 500);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events",
      access_type: "offline", // ← gives us the refresh token
      // select_account → ALWAYS show the account chooser on connect (a user
      // with 5 Gmails picks which one); consent → guarantees a refresh token.
      prompt: "select_account consent",
      state: state.state,
    });
    return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  }

  // ── GET /callback — Google redirects here after consent ────────────────────
  if (route === "callback" && req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const fail = (msg: string) =>
      new Response(
        `<html><body style="font-family:sans-serif;text-align:center;padding:48px">
           <h2>Connection failed</h2><p>${msg}</p><p>You can close this window.</p>
         </body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } },
      );
    if (!code || !state) return fail("Missing code/state.");

    // State → user (must be recent), then burn the nonce.
    const { data: row } = await admin
      .from("gcal_oauth_states")
      .select("user_id, created_at")
      .eq("state", state)
      .maybeSingle();
    if (!row) return fail("Unknown or expired request — try connecting again.");
    await admin.from("gcal_oauth_states").delete().eq("state", state);
    if (Date.now() - new Date(row.created_at).getTime() > 10 * 60 * 1000) {
      return fail("The request expired — try connecting again.");
    }

    // Exchange the code for tokens.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.refresh_token) {
      return fail("Google did not return a token — try connecting again.");
    }

    await admin.from("google_tokens").upsert({
      user_id: row.user_id,
      refresh_token: tokens.refresh_token,
      updated_at: new Date().toISOString(),
    });

    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:48px">
         <h2>✅ Google Calendar connected</h2>
         <p>You can close this window and return to Productivity Shastra.</p>
         <script>
           try { window.opener && window.opener.postMessage('gcal-connected', '*'); } catch (e) {}
           setTimeout(() => window.close(), 1200);
         </script>
       </body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  // ── POST /token — silent access token from the stored refresh token ────────
  if (route === "token" && req.method === "POST") {
    const user = await getUser(req);
    if (!user) return json({ error: "Not signed in." }, 401);

    const { data: row } = await admin
      .from("google_tokens")
      .select("refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) return json({ error: "Google not connected." }, 404);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: row.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      // Revoked / expired (e.g. consent screen still in Testing) → forget it so
      // the frontend re-runs the connect flow cleanly.
      await admin.from("google_tokens").delete().eq("user_id", user.id);
      return json({ error: "Reconnect required." }, 404);
    }
    return json({ access_token: data.access_token, expires_in: data.expires_in });
  }

  // ── POST /disconnect — forget the Google connection (switch account) ───────
  if (route === "disconnect" && req.method === "POST") {
    const user = await getUser(req);
    if (!user) return json({ error: "Not signed in." }, 401);
    await admin.from("google_tokens").delete().eq("user_id", user.id);
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
});
