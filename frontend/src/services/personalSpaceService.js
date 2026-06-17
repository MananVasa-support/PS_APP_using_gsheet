import { listRows, upsertRows, deleteRows, isConfigured } from '@/lib/gsApi';

/**
 * Personal Space / Expectations Crystalliser / Feedback Form — data layer.
 *
 * Every tool stores its entries in ONE generic Sheets tab (`ps_entries`),
 * tagged by `tool`. A row is { id, tool, summary, data, created_at }. The
 * `data` blob holds whatever fields that tool needs, so adding/redesigning a
 * tool never needs a new tab or a Code.gs redeploy.
 *
 * Auto-add option lists (e.g. Expectations "Area" choices) live in `ps_options`
 * — one row per named list.
 *
 * No backend configured (demo mode) → everything falls back to localStorage.
 */

const ENTRY_KEY = (tool) => `ps_log_${tool}`;
const OPT_KEY = (name) => `ps_opt_${name}`;

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const newId = () => `ps_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

// ── Entries ──────────────────────────────────────────────────────────────────
/** All entries for one tool, newest first. Each: { id, data, created_at, updated_at }. */
export async function listEntries(tool) {
  if (!isConfigured) {
    return readLocal(ENTRY_KEY(tool), []);
  }
  const rows = await listRows('ps_entries');
  return rows
    .filter((r) => r.tool === tool)
    .map((r) => ({ id: r.id, data: r.data || {}, created_at: r.created_at, updated_at: r.updated_at }))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

/**
 * Insert or update one entry. `entry` = { id?, data }. `summarize(data)` builds
 * the readable one-line preview shown in the sheet. Returns the saved entry.
 */
export async function saveEntry(tool, entry, summarize) {
  const now = new Date().toISOString();
  const id = entry.id || newId();
  const created_at = entry.created_at || now;
  const summary = (summarize ? summarize(entry.data) : '') || '';

  if (!isConfigured) {
    const list = readLocal(ENTRY_KEY(tool), []);
    const idx = list.findIndex((e) => e.id === id);
    const row = { id, data: entry.data, created_at, updated_at: now };
    if (idx >= 0) list[idx] = row;
    else list.unshift(row);
    writeLocal(ENTRY_KEY(tool), list.slice(0, 1000));
    return row;
  }

  await upsertRows('ps_entries', [
    { id, tool, summary, data: entry.data, created_at, updated_at: now },
  ]);
  return { id, data: entry.data, created_at, updated_at: now };
}

export async function deleteEntry(tool, id) {
  if (!isConfigured) {
    writeLocal(ENTRY_KEY(tool), readLocal(ENTRY_KEY(tool), []).filter((e) => e.id !== id));
    return;
  }
  await deleteRows('ps_entries', [id]);
}

// ── Auto-add option lists ────────────────────────────────────────────────────
export async function getOptionList(name, seed = []) {
  if (!isConfigured) {
    const saved = readLocal(OPT_KEY(name), null);
    return saved && saved.length ? saved : seed;
  }
  const rows = await listRows('ps_options');
  const row = rows.find((r) => r.id === name);
  const stored = (row && row.values) || [];
  // Merge seed defaults with anything the user added, de-duped (case-insensitive).
  const out = [...seed];
  stored.forEach((v) => {
    if (!out.some((x) => x.toLowerCase() === String(v).toLowerCase())) out.push(v);
  });
  return out;
}

/** Add a value to a named list if new (case-insensitive). Returns updated list. */
export async function addToOptionList(name, value, current) {
  const v = String(value || '').trim();
  if (!v) return current || [];
  const list = current || (await getOptionList(name));
  if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return list;
  const next = [...list, v];

  if (!isConfigured) {
    writeLocal(OPT_KEY(name), next);
    return next;
  }
  await upsertRows('ps_options', [{ id: name, values: next, updated_at: new Date().toISOString() }]);
  return next;
}

// ── Shared constants ─────────────────────────────────────────────────────────
export const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

// One canonical recurrence list reused across tools (Time Saver "Instance" etc).
export const INSTANCE_OPTIONS = [
  'Daily',
  'Weekly',
  '2 times a week',
  '3 times a week',
  'Fortnightly',
  'Monthly',
  'Quarterly',
  'Half Yearly',
  'Annually',
  'One Time',
];

export const EXPECTATION_AREAS = [
  'Sales',
  'Business',
  'Profits',
  'Productivity',
  'Time Management',
  'Organising',
  'Habits',
  'Family',
  'Personal Life',
  'Health',
  'Hobbies',
  'Fire Fighting',
  'Stress Management',
];
