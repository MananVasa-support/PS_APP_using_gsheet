// "Current level" — tied to the user's Time Auditor progress AND their Challenge
// (Level 2) participation.
//
// NOTE: a TRUE cross-user RANK ("you're #3 of all challenge participants") needs
// every user's challenge data in the backend to compare. Until that lands, this
// is a local, single-user level: it rewards completing audits and — more — joining
// and finishing challenges. It's deliberately small + isolated so the backend
// round can replace `currentLevel` with a real ranking query without touching the
// pages that call it.

export function loadChallengeState() {
  try {
    const raw = localStorage.getItem('ta_challenge');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * @param {number} assessmentsCount  how many audits the user has completed
 * @param {object} challenge         the ta_challenge state (started/status/days)
 * @returns {number} the level (>= 1)
 */
export function currentLevel(assessmentsCount = 0, challenge = {}) {
  let lvl = 1;
  lvl += Math.min(assessmentsCount, 99); // each completed audit moves you up
  if (challenge?.started) lvl += 1; // joined a challenge
  if (challenge?.status === 'Completed Challenge') lvl += 2; // finished one
  // Longer challenges (21/30 days) are worth a bit more once completed.
  if (challenge?.status === 'Completed Challenge' && Number(challenge?.days) >= 21) lvl += 1;
  return lvl;
}
