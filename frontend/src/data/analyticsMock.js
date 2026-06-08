/**
 * Generates a full analytics payload sized to a number of days, so the charts
 * visibly change when the user switches the 7D / 14D / 30D / 60D / 90D / All
 * range filters. Call inside a useMemo keyed on `[days, seed]` to keep it stable.
 *
 * When a `seed` is provided (e.g. a user id), the numbers are deterministic so
 * each person's analytics stay the same across re-renders — the admin can flip
 * between two people without the charts re-rolling.
 */

// In-app modules the user actually spends time in (replaces generic OS-app names
// like "VS Code" / "Chrome" that don't fit the Productivity Shastra context).
const MODULES = [
  'Time Auditor',
  'Power Planner',
  'Time Finder',
  'Reason Eliminator',
  'Personal Space',
  'Sales Cultivator',
  'Meeting Framework',
  'Level 2 Challenges',
];

// Onboarding & assessment sections (replaces the generic "websites" list).
const SECTIONS = [
  'Health Check Form',
  'ECG Pre-Assessment',
  'ECG Post-Assessment',
  'Consent',
  'Pre-PS',
  'Post-PS',
  'Final Summary',
];

const PERIODS = ['6–9 AM', '9 AM–12 PM', '12–3 PM', '3–6 PM', '6–9 PM'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Cheap, deterministic 32-bit PRNG (mulberry32) seeded from a string.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed) {
  if (seed == null) return Math.random;
  let a = hashString(String(seed));
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildAnalytics(days = 7, seed = null) {
  const rng = makeRng(seed);
  const rand = (min, max) => Math.round(min + rng() * (max - min));
  const scale = Math.max(1, Math.round(days / 7));

  // Productivity trend — sampled to at most 30 points.
  const points = Math.min(Math.max(days, 1), 30);
  const step = days > 30 ? Math.ceil(days / 30) : 1;
  const trend = Array.from({ length: points }).map((_, i) => ({
    label: `${i * step + 1}`,
    productivity: rand(45, 95),
  }));
  const avgProductivity = Math.round(trend.reduce((s, t) => s + t.productivity, 0) / trend.length);

  const daily = WEEKDAYS.map((d) => ({ label: d, value: rand(40, 95) }));
  const weeks = Math.min(Math.max(Math.ceil(days / 7), 1), 12);
  const weekly = Array.from({ length: weeks }).map((_, i) => ({ label: `W${i + 1}`, value: rand(50, 92) }));

  const categoryBreakdown = [
    { name: 'Focus Modules', value: rand(320, 540) * scale, color: '#22c55e' },
    { name: 'Forms & Onboarding', value: rand(90, 180) * scale, color: '#8b5cf6' },
    { name: 'Personal Space', value: rand(60, 140) * scale, color: '#06b6d4' },
    { name: 'Idle', value: rand(40, 110) * scale, color: '#f59e0b' },
  ];
  const totalTracked = categoryBreakdown.reduce((s, c) => s + c.value, 0);
  const totalProductive = categoryBreakdown[0].value;
  const idleTime = categoryBreakdown[3].value;
  const productivePercent = Math.round((totalProductive / totalTracked) * 100);
  const productivityScore = Math.min(100, Math.round((productivePercent + avgProductivity) / 2));

  // Time-auditor style buckets — planned / productive / unproductive minutes.
  const productiveMin = totalProductive;
  const plannedMin = Math.round(productiveMin * (0.55 + rng() * 0.3));
  const unproductiveMin = idleTime + rand(40, 140) * scale;

  // `apps` is now in-app modules; `websites` is onboarding / assessment sections.
  // Field names are kept so existing consumers still work.
  const apps = MODULES.map((name) => ({ name, minutes: rand(20, 240) * scale })).sort((a, b) => b.minutes - a.minutes);
  const websites = SECTIONS.map((name) => ({ name, minutes: rand(15, 180) * scale })).sort((a, b) => b.minutes - a.minutes);

  const topApps = apps.slice(0, 3).map((a) => ({ name: a.name, pct: rand(72, 96) }));
  const topWebsites = websites.slice(0, 3).map((w) => ({ name: w.name, pct: rand(60, 92) }));

  const topPeriods = PERIODS.map((range) => ({ range, pct: rand(40, 96) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
  const bestHours = topPeriods[0].range;

  const heatmap = WEEKDAYS.map((label) => ({
    label,
    values: Array.from({ length: 24 }).map((_, h) => (h < 6 || h > 22 ? rand(0, 14) : rand(8, 100))),
  }));

  return {
    days,
    trend,
    avgProductivity,
    daily,
    weekly,
    categoryBreakdown,
    totalTracked,
    totalProductive,
    idleTime,
    productivePercent,
    productivityScore,
    plannedMin,
    productiveMin,
    unproductiveMin,
    apps,
    websites,
    topApps,
    topWebsites,
    topPeriods,
    bestHours,
    heatmap,
  };
}
