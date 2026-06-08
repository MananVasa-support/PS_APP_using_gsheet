// Reusable validation utilities for the Reason Eliminator.
//
// Goal: only accept specific, actionable, root-cause reasons. Reject random,
// vague, emotional, blame-shifting, deferral, and self-defeating statements.
// The pattern lists below are intentionally strict and easy to extend — add a
// phrase to the relevant list to catch a new family of weak reasons.

const MIN_REASON_WORDS = 3;
const MIN_REASON_CHARS = 12;
const MAX_POWER_WORD_WORDS = 4;

// Collapse whitespace and trim — also "trim unnecessary spaces".
export function normalizeText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

// Lowercased, punctuation-stripped form (apostrophes removed too, so "don't"
// becomes "dont" and "i'll" becomes "ill") for matching against patterns.
function canonical(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}

function words(value) {
  const n = normalizeText(value);
  return n ? n.split(' ') : [];
}

// Whole-input phrases that carry no actionable content.
const VAGUE_EXACT = new Set([
  'nothing',
  'none',
  'na',
  'okay',
  'ok',
  'k',
  'fine',
  'whatever',
  'life',
  'meh',
  'idk',
  'dunno',
  'stuff',
  'things',
  'everything',
  'anything',
  'no idea',
  'not sure',
  'no clue',
  'i dont know',
  'i do not know',
  'dont know',
  'i have no idea',
  'no reason',
  'because',
  'just because',
]);

// Strong leading patterns that indicate the text isn't a reason at all.
const UNRELATED_PREFIXES = [
  'my name is',
  'this is a test',
  'i am a ',
  'hello',
  'hi ',
];

// Emotion / feeling statements — rejected as too vague to act on.
const EMOTION_PATTERNS = [
  /\bfeel/, // feel, feels, feeling
  /\bfelt\b/,
  /\btired\b/,
  /\blazy\b/,
  /\bbored\b/,
  /\bstress/, // stress, stressed, stressted (typo)
  /\banxious\b/,
  /\banxiety\b/,
  /\boverwhelmed\b/,
  /\bdrained\b/,
  /\bdiscourag/,
  /\bstuck\b/,
  /\bscared\b/,
  /\bafraid\b/,
  /\bsad\b/,
  /\bmoody\b/,
  /\bunmotivated\b/,
  /\bdemotivated\b/,
  /\bnot motivated\b/,
  /\bno motivation\b/,
  /\bexhausted\b/,
  /\bfrustrated\b/,
  /\bdepressed\b/,
  /\bemotionally\b/,
  /\blost interest\b/,
  /\bmind says no\b/,
];

// Excuse / blame / deferral / self-defeating / prerequisite statements.
const EXCUSE_PATTERNS = [
  // Contentless / contradictory / meaningless
  /\bstuff happens\b/,
  /\bits complicated\b/,
  /\blife is in the way\b/,
  /\bno( clear)? reason\b/,
  /\bi forgot\b/,
  /\bwhats wrong\b/,
  /\bdo not know\b/,
  /\bdont know\b/,
  /\bi just do not do it\b/,
  /\bdo not do it\b/,
  /\bbusy\b/,
  // Deferral / waiting
  /\blater\b/,
  /\bwaiting for\b/,
  /\bkeep waiting\b/,
  /\bright time\b/,
  // Self-defeating beliefs
  /\bnot (smart|good) enough\b/,
  /\balways fail\b/,
  /\bbetter than me\b/,
  /\bdo not deserve\b/,
  /\bdont deserve\b/,
  /\bembarrass/,
  /\bdo not trust\b/,
  /\bdont trust\b/,
  /\bdo not see myself\b/,
  /\bdont see myself\b/,
  /\bcomfort zone\b/,
  /\boverthink/,
  // Avoidance
  /\bdo not want\b/,
  /\bdont want\b/,
  /\bavoid\b/, // standalone only — "avoided" (past, specific) is allowed
  /\bhide behind\b/,
  /\bafraid of\b/,
  // Prerequisite / "I need X first" / "I don't have X"
  /\bdo not have\b/,
  /\bdont have\b/,
  /\bi need\b/,
  /\black (skills?|confidence|clarity|time|motivation|support|focus)\b/,
  /\bperfect first\b/,
  /\bbe perfect\b/,
  // Blame external
  /\bdistracts? me\b/, // "distract me" — but "I got distracted ..." is allowed
  /\binterrupts? me\b/,
  /\bdemanding\b/,
  /\bchaotic\b/,
  /\bnot supportive\b/,
  /\bmy (family|job|environment|schedule|boss)\b/,
];

// Common keyboard-adjacency runs — a strong signal of random mashing without
// false-positiving on short real words like "Sprint" or "Crush".
const KEYBOARD_RUNS = [
  'asdf',
  'sdfg',
  'dfgh',
  'fghj',
  'ghjk',
  'hjkl',
  'qwer',
  'wert',
  'erty',
  'rtyu',
  'tyui',
  'uiop',
  'zxcv',
  'xcvb',
  'cvbn',
  'vbnm',
  'lkjh',
  'mnbv',
  'poiu',
];

function looksLikeGibberish(value) {
  const collapsed = canonical(value).replace(/\s+/g, '');
  if (KEYBOARD_RUNS.some((run) => collapsed.includes(run))) return true;
  // Long token with no vowels at all (e.g. "qwrtz", "bcdfg").
  return words(value).some((w) => {
    const letters = w.replace(/[^a-zA-Z]/g, '');
    return letters.length >= 5 && !/[aeiouy]/i.test(letters);
  });
}

// Same token repeated ("test test test", "a a a a").
function isRepetitive(value) {
  const w = words(value).map((t) => t.toLowerCase());
  if (w.length < 2) return false;
  const unique = new Set(w);
  if (unique.size === 1) return true;
  const counts = {};
  for (const t of w) {
    counts[t] = (counts[t] || 0) + 1;
    if (counts[t] >= 3) return true;
  }
  return false;
}

/**
 * Validate a reason.
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateReason(value) {
  const norm = normalizeText(value);

  // No content restrictions: whatever reason the user enters is accepted.
  // The only requirement is that the field isn't empty/whitespace-only.
  if (!norm) {
    return { valid: false, message: 'Please add a reason.' };
  }

  return { valid: true, message: null };
}

/**
 * Validate a power word — short, action-oriented, meaningful.
 * @param {string} value
 * @param {string[]} [knownWords] predefined list; an exact match is always valid.
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validatePowerWord(value, knownWords = []) {
  const norm = normalizeText(value);
  const canon = canonical(value);
  const invalid = { valid: false, message: 'Please enter a valid power word.' };

  if (!norm) return invalid;

  // Predefined suggestions are always acceptable.
  if (knownWords.some((w) => canonical(w) === canon)) {
    return { valid: true, message: null };
  }

  // Must contain real letters.
  if ((norm.match(/[a-zA-Z]/g) || []).length < 2) return invalid;

  // Short and action-oriented — not a long explanation or a sentence.
  if (words(norm).length > MAX_POWER_WORD_WORDS) return invalid;

  if (looksLikeGibberish(norm) || isRepetitive(norm)) return invalid;

  // Reject vague or emotional entries.
  if (VAGUE_EXACT.has(canon)) return invalid;
  if (EMOTION_PATTERNS.some((re) => re.test(canon))) return invalid;

  return { valid: true, message: null };
}
