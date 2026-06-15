/**
 * Tool-data client → Google Apps Script Web App (the data SERVER).
 *
 * Architecture (hybrid):
 *   • AUTH stays on Supabase (lib/supabaseAuth.js) — unchanged.
 *   • TOOL DATA goes to an Apps Script Web App that writes to Google Sheets
 *     SERVER-SIDE under one Google account (the Intern's). The browser never
 *     touches Google directly, so there is NO per-user consent popup, and
 *     writes are reliable + persistent + cross-device + multi-user.
 *
 * Storage model: ONE spreadsheet per user (named "<Name>_<short-id>") inside a
 * Main Folder, with one TAB per logical tool sheet. The server keeps a
 * userId → spreadsheetId registry and scopes every request by the signed-in
 * user's Supabase id (sent as userId). Surface:
 *   /provision  /list  /upsert  /delete  /clear  /leaderboard
 *
 * Config: VITE_API_BASE_URL = the Web App URL (…/exec). When unset, the app
 * runs in offline/localStorage demo mode (each tool service handles that).
 *
 * Transport: POST as text/plain so the browser skips the CORS preflight that
 * Apps Script can't answer; JSON (incl. userId) rides in the body.
 *
 * The app session itself lives in lib/session.js (set by the Supabase auth
 * layer); this file only reads it — it does not own session state.
 */

import { getSession, getToken, onAuthChange, newId } from '@/lib/session';

// Re-export so the tool services can keep importing these from '@/lib/gsApi'.
export { getToken, onAuthChange, newId };

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const isConfigured = Boolean(API_BASE);

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ── timing log ───────────────────────────────────────────────────────────────
const timings = [];
function logTiming(entry) {
  timings.push(entry);
  // eslint-disable-next-line no-console
  console.log(
    `%c[gs-api]%c ${entry.op} … ${entry.ms}ms${entry.serverMs != null ? ` (server ${entry.serverMs})` : ''}${entry.ok ? '' : ' ✗ FAILED'}`,
    'color:#0a7d32;font-weight:bold',
    entry.ok ? '' : 'color:#c00'
  );
}
if (typeof window !== 'undefined') {
  const prev = window.apiTimings;
  window.apiTimings = () => {
    if (typeof prev === 'function' && prev !== window.apiTimings) prev();
    // eslint-disable-next-line no-console
    console.table(timings);
    return `${timings.length} tool-data request(s) this session`;
  };
}

// Surface save/load failures to the UI (components/GsErrorToaster shows a toast)
// instead of letting the tool services swallow them silently.
let lastErrEmit = 0;
function emitError(message) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastErrEmit < 3000) return; // throttle bursts from one action
  lastErrEmit = now;
  try {
    window.dispatchEvent(new CustomEvent('gs:error', { detail: String(message) }));
  } catch {
    /* ignore */
  }
}

// ── Core call to the Web App ────────────────────────────────────────────────
const RETRYABLE = /quota|rate.?limit|too many|timed?.?out|service invoked too many|429|503/i;
const MAX_RETRIES = 2;

async function call(route, payload = {}) {
  if (!isConfigured) {
    throw new ApiError('Tool backend not configured — set VITE_API_BASE_URL in frontend/.env', 'NOT_CONFIGURED');
  }
  const s = getSession();
  const body = {
    route,
    userId: s?.user?.id || null,
    userName: s?.user?.name || '',
    userEmail: s?.user?.email || '',
    ...payload, // a caller (leaderboard cross-read) may override userId
  };
  const detail = payload.sheet || route;
  const t0 = performance.now();
  let lastErr = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * 2 ** (attempt - 1)));
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow',
      });
      const text = await res.text();
      let out;
      try {
        out = JSON.parse(text);
      } catch {
        throw new ApiError(res.ok ? 'Unexpected non-JSON response from the data server.' : `Server HTTP ${res.status}`, 'BAD_RESPONSE', res.status);
      }
      if (!out.ok) {
        const err = new ApiError(out.error?.message || 'Request failed.', out.error?.code, res.status);
        if (RETRYABLE.test(err.message) && attempt < MAX_RETRIES) {
          lastErr = err;
          continue;
        }
        logTiming({ op: `${route} ${detail}`, ms: Math.round(performance.now() - t0), serverMs: out.ms ?? null, ok: false, at: new Date().toLocaleTimeString() });
        emitError(`Couldn't save to Google Sheets: ${err.message}`);
        throw err;
      }
      logTiming({ op: `${route} ${detail}`, ms: Math.round(performance.now() - t0), serverMs: out.ms ?? null, ok: true, at: new Date().toLocaleTimeString() });
      return out.data;
    } catch (err) {
      if (err instanceof ApiError && err.code && !RETRYABLE.test(err.message) && err.code !== 'BAD_RESPONSE') {
        logTiming({ op: `${route} ${detail}`, ms: Math.round(performance.now() - t0), serverMs: null, ok: false, at: new Date().toLocaleTimeString() });
        throw err;
      }
      lastErr = err; // network/CORS hiccup or retryable — try again
    }
  }
  logTiming({ op: `${route} ${detail}`, ms: Math.round(performance.now() - t0), serverMs: null, ok: false, at: new Date().toLocaleTimeString() });
  const finalErr = lastErr instanceof ApiError ? lastErr : new ApiError(lastErr?.message || 'Could not reach the data server.', 'NETWORK');
  emitError(`Couldn't reach Google Sheets: ${finalErr.message}`);
  throw finalErr;
}

// ── Provisioning ─────────────────────────────────────────────────────────────
/** Create-or-get the signed-in user's spreadsheet (+ all tool tabs) on the
 *  server. Idempotent — safe to call on every login. Returns { spreadsheetId, url }. */
export async function provisionUserSpreadsheet() {
  if (!isConfigured) return null;
  return call('/provision', {});
}

// ── Public data layer (unchanged surface — services don't change) ────────────
function requireUserId() {
  const id = getSession()?.user?.id;
  if (!id) throw new ApiError('Not signed in.', 'AUTH_REQUIRED');
  return id;
}

/** All of the signed-in user's rows for a logical sheet (e.g. 'ta_entries'). */
export async function listRows(sheet) {
  requireUserId();
  return (await call('/list', { sheet })) || [];
}

/** Another user's rows (leaderboard cross-read). */
export async function listRowsForUser(sheet, user) {
  return (await call('/list', { sheet, userId: user.id, userName: user.name, userEmail: user.email })) || [];
}

/** Insert-or-merge rows by the sheet's key columns. Returns the saved rows. */
export async function upsertRows(sheet, rows) {
  requireUserId();
  if (!rows?.length) return [];
  return (await call('/upsert', { sheet, rows })) || [];
}

/** Delete the user's rows whose id column matches one of `ids`. */
export async function deleteRows(sheet, ids) {
  requireUserId();
  if (!ids?.length) return { deleted: 0 };
  return call('/delete', { sheet, ids });
}

/** Delete ALL the user's rows in a sheet (optionally only those matching `where`). */
export async function clearRows(sheet, where = null) {
  requireUserId();
  return call('/clear', { sheet, where });
}

/** Cross-user challenge leaderboard, computed server-side. */
export async function fetchLeaderboard() {
  requireUserId();
  return (await call('/leaderboard', {})) || [];
}
