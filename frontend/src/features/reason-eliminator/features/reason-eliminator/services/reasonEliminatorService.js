import { STORAGE_KEY, SESSION_STATUS } from '../constants.js';
import { generateId } from '../utils/formatters.js';

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeReason(r) {
  if (Array.isArray(r.categories)) return r;
  if (r.category) {
    const { category, ...rest } = r;
    return { ...rest, categories: [category] };
  }
  return { ...r, categories: [] };
}

function normalizeSession(s) {
  if (!s) return s;
  // Renumber reasons sequentially by their position (R1, R2, R3, ...) so a
  // session saved before/around a deletion never shows gaps or stale numbers.
  // The reason object stays in place, so its category, subcategory, power word
  // and archive status all move with it — only the display number is fixed up.
  return {
    ...s,
    reasons: Array.isArray(s.reasons)
      ? s.reasons.map((r, idx) => ({
          ...normalizeReason(r),
          index: idx,
          seq: idx + 1,
        }))
      : [],
  };
}

function readAll() {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return safeParse(raw).map(normalizeSession);
}

function writeAll(sessions) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export const reasonEliminatorService = {
  listSessions() {
    return readAll().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getSession(id) {
    return readAll().find((s) => s.id === id) || null;
  },

  createSession(reasons = []) {
    const now = new Date().toISOString();
    const session = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      status: SESSION_STATUS.DRAFT,
      reasons: reasons.map((text, idx) => ({
        id: generateId(),
        index: idx,
        text: (text || '').trim(),
        categories: [],
        powerWord: '',
        createdAt: now,
      })),
    };
    const next = [session, ...readAll()];
    writeAll(next);
    return session;
  },

  upsertSession(session) {
    if (!session?.id) {
      throw new Error('session.id is required');
    }
    const all = readAll();
    const next = { ...session, updatedAt: new Date().toISOString() };
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx === -1) {
      all.unshift(next);
    } else {
      all[idx] = next;
    }
    writeAll(all);
    return next;
  },

  deleteSession(id) {
    const next = readAll().filter((s) => s.id !== id);
    writeAll(next);
  },

  clearAll() {
    writeAll([]);
  },
};

export default reasonEliminatorService;
