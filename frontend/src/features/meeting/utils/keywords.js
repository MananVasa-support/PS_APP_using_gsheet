// Lightweight keyword extraction for the Dashboard "AI Insights" — no external
// libraries. It blends two signals:
//   1) Theme matching: maps known stems (e.g. "confiden…") to clean tag labels.
//   2) Frequency: surfaces the most common meaningful words not already covered.
// Returns [{ label, count }] sorted by frequency.

const STOPWORDS = new Set(
  ('the a an and or but if then else of to in on for with at by from up out as is are was were be been being it ' +
    'its this that these those i me my we our you your he she they them their will would can could should do does ' +
    'did have has had not no yes so just very more most much many about into over under again once here there all ' +
    'any each few other some such only own same than too then them was meeting meetings actual planning plan also ' +
    'got get really felt feel feeling able make made need needed want help helped lot able during before after ' +
    'which what when where who how why been being were are').split(/\s+/)
);

// stem regex → display label
const THEMES = [
  [/confiden/, 'Confidence'],
  [/prepar/, 'Preparation'],
  [/clar(it|if)/, 'Clarity'],
  [/decision|decisi|decide|decid/, 'Decision Making'],
  [/communicat/, 'Communication'],
  [/lead(er|ership|ing)?/, 'Leadership'],
  [/aware/, 'Awareness'],
  [/align/, 'Alignment'],
  [/goal|objective|outcome/, 'Outcomes'],
  [/team|collaborat/, 'Collaboration'],
  [/time|schedul|deadline/, 'Time Management'],
  [/focus/, 'Focus'],
  [/strateg/, 'Strategy'],
  [/trust/, 'Trust'],
  [/listen/, 'Listening'],
  [/learn/, 'Learning'],
  [/challeng/, 'Challenges'],
  [/insight|realis|realiz/, 'Insights'],
  [/structur|organiz|organis/, 'Structure'],
  [/agenda/, 'Agenda'],
  [/follow.?up|action/, 'Action Items'],
  [/risk/, 'Risk'],
  [/budget|cost|price/, 'Budget'],
];

export const extractKeywords = (texts, limit = 12) => {
  const joined = (texts || []).filter(Boolean).join(' ').toLowerCase();
  if (!joined.trim()) return [];

  const counts = new Map();

  // 1) Theme matches
  for (const [re, label] of THEMES) {
    const matches = joined.match(new RegExp(re.source, 'gi'));
    if (matches) counts.set(label, (counts.get(label) || 0) + matches.length);
  }

  // 2) Frequency of meaningful words not already represented as a theme
  const words = joined.match(/[a-z]{4,}/g) || [];
  const freq = new Map();
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const topWords = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  for (const [w, c] of topWords) {
    const label = w.charAt(0).toUpperCase() + w.slice(1);
    if (!counts.has(label)) counts.set(label, c);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
};
