// Read-only analytics layer for the Dashboard. Everything here is derived from
// data the app already stores — assessment sessions (reasons, categories,
// subcategories, power words, archive flags, dates) and the independent grip
// score store. Nothing in this file mutates state; it only reads and summarizes.

import { CATEGORIES, CATEGORY_DETAILS } from '../constants.js';
import { gripStatus } from '../services/gripTestService.js';
import { isSessionComplete } from './reasonVisibility.js';
import { formatDate } from './formatters.js';

// Flat lookup of every subcategory (reason detail) by id -> { id, label }.
const DETAIL_BY_ID = Object.values(CATEGORY_DETAILS)
  .flat()
  .reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {});

// Display meta + chart colours for the four categories. Theme: red / black /
// white / gray.
export const CATEGORY_META = {
  time: { id: 'time', code: 'T', name: 'Time', label: 'Lack of Time', color: '#E11D2A' },
  focus: { id: 'focus', code: 'F', name: 'Focus', label: 'Lack of Focus', color: '#0B0B0C' },
  clarity: { id: 'clarity', code: 'C', name: 'Clarity', label: 'Lack of Clarity', color: '#71717A' },
  reality: { id: 'reality', code: 'R', name: 'Reality', label: 'Lack of Reality', color: '#B8141F' },
};

// Grip score buckets, keyed by the same status label gripStatus() produces so a
// score maps to exactly one bucket. Colours rise from gray (no grip) to deep
// red (too much grip).
export const GRIP_BUCKETS = [
  { key: 'No Grip', label: 'No Grip (0)', color: '#D1D1D6' },
  { key: 'Very Low Grip', label: 'Very Low Grip (1)', color: '#F7C5CA' },
  { key: 'Low Grip', label: 'Low Grip (2)', color: '#F08A93' },
  { key: 'Moderate Grip', label: 'Moderate Grip (3)', color: '#E8505B' },
  { key: 'High Grip', label: 'High Grip (4)', color: '#E11D2A' },
  { key: 'Too Much Grip', label: 'Too Much Grip (5)', color: '#B8141F' },
];

// 'YYYY-MM-DD' day key in the viewer's LOCAL calendar day. The date-range picker
// (<input type="date">) yields local 'YYYY-MM-DD' values, so the stored ISO
// timestamp must be bucketed by the same local day — otherwise a reason created
// in local early hours lands on the previous UTC day and falls outside a range
// like "4 to 5". Already date-only strings are returned unchanged.
function dayKey(iso) {
  const s = String(iso || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Inclusive date-range test against 'YYYY-MM-DD' bounds (either may be empty).
function inRange(iso, from, to) {
  if (!iso) return true;
  const day = dayKey(iso);
  if (!day) return true;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const round = (n, p = 1) => (n == null ? null : Math.round(n * 10 ** p) / 10 ** p);

// Build the full dashboard model from sessions + a reasonId->gripRecord map,
// scoped to an optional { from, to } date range.
export function computeDashboard(sessions = [], gripByReason = {}, range = {}) {
  const { from = '', to = '' } = range || {};

  // Flatten every reason across every session, joining its grip score and
  // keeping only those inside the selected date range.
  const records = [];
  for (const s of sessions) {
    for (const r of s.reasons || []) {
      const createdAt = r.createdAt || s.createdAt;
      if (!inRange(createdAt, from, to)) continue;
      const grip = gripByReason[r.id];
      const score = grip && typeof grip.score === 'number' ? grip.score : null;
      records.push({
        reasonId: r.id,
        sessionId: s.id,
        text: r.text,
        createdAt,
        categories: Array.isArray(r.categories)
          ? r.categories
          : r.category
          ? [r.category]
          : [],
        details: Array.isArray(r.details) ? r.details : [],
        powerWord: (r.powerWord || '').trim(),
        archived: !!r.archived,
        score,
        status: score === null ? '' : gripStatus(score),
      });
    }
  }

  const sessionsInRange = sessions.filter((s) => inRange(s.createdAt, from, to));

  // ---- Grip scores -------------------------------------------------------
  const scored = records.filter((r) => r.score !== null);
  const scores = scored.map((r) => r.score);
  const avgGrip = round(mean(scores));
  const highestGrip = scores.length ? Math.max(...scores) : null;
  const lowestGrip = scores.length ? Math.min(...scores) : null;

  // ---- Categories --------------------------------------------------------
  const categoryCounts = {};
  for (const r of records) {
    for (const c of r.categories) categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }
  const totalCategorySelections = Object.values(categoryCounts).reduce(
    (a, b) => a + b,
    0
  );
  const categorySummary = CATEGORIES.map((c) => {
    const count = categoryCounts[c.id] || 0;
    return {
      ...CATEGORY_META[c.id],
      count,
      pct: totalCategorySelections
        ? round((count / totalCategorySelections) * 100)
        : 0,
    };
  });
  const categoryRanking = [...categorySummary]
    .sort((a, b) => b.count - a.count)
    .map((c, i) => ({ ...c, rank: i + 1 }));
  const mostSelectedCategory =
    categoryRanking[0] && categoryRanking[0].count > 0
      ? categoryRanking[0]
      : null;

  // Average grip per category (for the "lowest/highest grip category" insights).
  const catScores = {};
  for (const r of scored) {
    for (const c of r.categories) (catScores[c] = catScores[c] || []).push(r.score);
  }
  const categoryAvgGrip = CATEGORIES.map((c) => ({
    ...CATEGORY_META[c.id],
    avg: round(mean(catScores[c.id] || [])),
    n: (catScores[c.id] || []).length,
  }));
  const gripCats = categoryAvgGrip.filter((c) => c.avg !== null);
  const lowestGripCategory = gripCats.length
    ? gripCats.reduce((m, c) => (c.avg < m.avg ? c : m))
    : null;
  const highestGripCategory = gripCats.length
    ? gripCats.reduce((m, c) => (c.avg > m.avg ? c : m))
    : null;

  // ---- Subcategories -----------------------------------------------------
  const detailCounts = {};
  for (const r of records) {
    for (const d of r.details) detailCounts[d] = (detailCounts[d] || 0) + 1;
  }
  const totalDetailSelections = Object.values(detailCounts).reduce(
    (a, b) => a + b,
    0
  );
  const subcategoryAnalysis = Object.entries(detailCounts)
    .map(([id, count]) => ({
      id,
      label: DETAIL_BY_ID[id]?.label || id,
      count,
      pct: totalDetailSelections ? round((count / totalDetailSelections) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
  const mostRepeatedSubcategory = subcategoryAnalysis[0] || null;

  // ---- Grip distribution -------------------------------------------------
  const gripDistribution = GRIP_BUCKETS.map((b) => ({
    ...b,
    count: scored.filter((r) => r.status === b.key).length,
  }));

  // ---- Grip trend over time ---------------------------------------------
  const byDate = {};
  for (const r of scored) {
    const day = dayKey(r.createdAt);
    if (!day) continue;
    (byDate[day] = byDate[day] || []).push(r.score);
  }
  const gripTrend = Object.entries(byDate)
    .map(([day, arr]) => ({ day, date: formatDate(day), avg: round(mean(arr)) }))
    .sort((a, b) => a.day.localeCompare(b.day));
  let gripChangePct = null;
  if (gripTrend.length >= 2) {
    const first = gripTrend[0].avg;
    const last = gripTrend[gripTrend.length - 1].avg;
    if (first) gripChangePct = round(((last - first) / first) * 100);
  }

  // ---- High grip reasons (>= 4 on the 0-5 scale) ------------------------
  const highGripReasons = scored
    .filter((r) => r.score >= 4)
    .map((r) => ({
      ...r,
      categoryLabels: r.categories.map((c) => CATEGORY_META[c]?.label || c),
      detailLabels: r.details.map((d) => DETAIL_BY_ID[d]?.label || d),
    }))
    .sort((a, b) => b.score - a.score);

  // ---- Power words -------------------------------------------------------
  const pwCounts = {};
  for (const r of records) {
    if (r.powerWord) pwCounts[r.powerWord] = (pwCounts[r.powerWord] || 0) + 1;
  }
  const powerWordRanking = Object.entries(pwCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
  const topPowerWords = powerWordRanking.slice(0, 10);
  const mostUsedPowerWord = powerWordRanking[0] || null;

  // ---- Reason recovery counters -----------------------------------------
  const totalReasons = records.length;
  const archivedReasons = records.filter((r) => r.archived).length;
  const activeReasons = totalReasons - archivedReasons;
  // The data model does not record unarchive events, so recovered reasons are
  // not derivable from stored data.
  const recoveredReasons = 0;

  // ---- Assessment activity (per session) --------------------------------
  const activity = sessionsInRange
    .map((s) => {
      const rs = s.reasons || [];
      return {
        id: s.id,
        createdAt: s.createdAt,
        date: formatDate(s.createdAt),
        reasonsCount: rs.length,
        categoriesCount: rs.filter((r) => (r.categories || []).length > 0).length,
        powerWordsCount: rs.filter((r) => (r.powerWord || '').trim()).length,
        gripCount: rs.filter((r) => {
          const g = gripByReason[r.id];
          return g && typeof g.score === 'number';
        }).length,
        completed: isSessionComplete(s),
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completedAssessments = sessionsInRange.filter(isSessionComplete).length;

  // ---- Deep review insights (only those backed by data) -----------------
  const insights = [];
  if (mostSelectedCategory) {
    insights.push(`Most common category is ${mostSelectedCategory.name}.`);
  }
  if (mostRepeatedSubcategory) {
    insights.push(
      `Most repeated subcategory is ${mostRepeatedSubcategory.label}.`
    );
  }
  if (mostUsedPowerWord) {
    insights.push(
      `${mostUsedPowerWord.word} is the most used Power Word (${mostUsedPowerWord.count}×).`
    );
  }
  if (gripChangePct !== null) {
    const dir =
      gripChangePct < 0 ? 'improved' : gripChangePct > 0 ? 'increased' : 'held steady';
    insights.push(
      `Average Grip Score ${dir} by ${Math.abs(gripChangePct)}% across the period.`
    );
  }
  if (lowestGripCategory) {
    insights.push(
      `${lowestGripCategory.name}-related reasons have the lowest average grip score (${lowestGripCategory.avg}).`
    );
  }
  if (highestGripCategory && highestGripCategory.id !== lowestGripCategory?.id) {
    insights.push(
      `${highestGripCategory.name}-related reasons have the highest average grip score (${highestGripCategory.avg}).`
    );
  }

  return {
    hasData: records.length > 0 || sessionsInRange.length > 0,
    kpis: {
      totalReasons,
      archivedReasons,
      activeReasons,
      completedAssessments,
      avgGrip,
      highestGrip,
      lowestGrip,
      mostUsedPowerWord,
      mostSelectedCategory,
    },
    categorySummary,
    categoryRanking,
    categoryAvgGrip,
    subcategoryAnalysis,
    gripDistribution,
    gripTrend,
    gripChangePct,
    highGripReasons,
    powerWordRanking,
    topPowerWords,
    mostUsedPowerWord,
    recovery: {
      created: totalReasons,
      archived: archivedReasons,
      active: activeReasons,
      recovered: recoveredReasons,
    },
    activity,
    insights,
  };
}
