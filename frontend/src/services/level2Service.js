import { listRows, listRowsForUser, upsertRows, newId, getToken, isConfigured } from '@/lib/gsApi';

/**
 * Level-2 challenge runs — one row per run in the user's "Time Auditor"
 * spreadsheet, `challenges` tab:
 *   id | days | status | started_at | completed_at | created_at
 * History is kept (every run a user ever did stays as a row). Demo mode
 * (no Google client id) is handled by ChallengeContext's localStorage state.
 */

/** The signed-in user's challenge history, newest first. */
export async function listMyRuns() {
  if (!isConfigured) return [];
  const rows = await listRows('ta_challenges');
  return rows.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
}

export async function startRun(days) {
  if (!isConfigured) return null;
  if (!getToken()) throw new Error('Not signed in.');
  const now = new Date().toISOString();
  const row = { id: newId(), days, status: 'Active Challenge', started_at: now, completed_at: null, created_at: now };
  const [saved] = await upsertRows('ta_challenges', [row]);
  return saved || row;
}

export async function setRunStatus(id, status) {
  if (!isConfigured || !id) return null;
  const patch = { id, status };
  if (status === 'Completed Challenge') patch.completed_at = new Date().toISOString();
  // upsertRows MERGES: only the provided columns change; returns the full row.
  const [saved] = await upsertRows('ta_challenges', [patch]);
  return saved || null;
}

/**
 * The cross-user leaderboard — computed CLIENT-SIDE in the demo (with no
 * server, the browser reads every user's Time Auditor spreadsheet via the
 * _meta id cache). Same formula as the old SQL RPC:
 *   score = 50% consistency (share of elapsed challenge days with ≥1 audit)
 *         + 50% quality (avg productivity % of audits inside the window)
 * Participant = each user's most recent non-abandoned run. Returns ALL
 * participants ranked (rank, user_id, name, days, status, days_elapsed,
 * coverage_pct, avg_productivity, score); callers slice the top N.
 */
export async function getLeaderboard() {
  if (!isConfigured) return [];

  const users = await listRows('users');
  const perUser = await Promise.all(
    users.map(async (u) => {
      const runs = (await listRowsForUser('ta_challenges', u))
        .filter((c) => c.status === 'Active Challenge' || c.status === 'Completed Challenge')
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
      if (!runs.length) return null;
      const run = runs[0];

      const started = new Date(run.started_at);
      const ended = run.completed_at ? new Date(run.completed_at) : new Date();
      const days = Number(run.days) || 1;
      const daysElapsed = Math.min(days, Math.max(1, Math.floor((ended - started) / 86400000) + 1));

      const startDay = Date.UTC(started.getUTCFullYear(), started.getUTCMonth(), started.getUTCDate());
      const windowEnd = startDay + days * 86400000;

      const audits = await listRowsForUser('ta_entries', u);
      const auditDays = new Set();
      let pctSum = 0;
      let pctCount = 0;
      audits.forEach((a) => {
        const entry = a.entry || {};
        if (!entry.date) return;
        const d = new Date(entry.date);
        if (Number.isNaN(d.getTime())) return;
        const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        if (day < startDay || day >= windowEnd) return;
        auditDays.add(day);
        pctSum += Number(entry.stats?.productivityPct || 0);
        pctCount++;
      });

      const coverageRaw = (100 * Math.min(auditDays.size, daysElapsed)) / daysElapsed;
      const avgPct = pctCount ? pctSum / pctCount : 0;

      return {
        user_id: u.id,
        name: u.name || 'Anonymous',
        days,
        status: run.status,
        days_elapsed: daysElapsed,
        coverage_pct: Math.round(coverageRaw),
        avg_productivity: Math.round(avgPct),
        score: Math.round(0.5 * coverageRaw + 0.5 * avgPct),
      };
    })
  );

  const scored = perUser.filter(Boolean);
  scored.sort(
    (a, b) =>
      b.score - a.score || b.days_elapsed - a.days_elapsed || String(a.name).localeCompare(String(b.name))
  );
  scored.forEach((s, i) => {
    s.rank = i + 1;
  });
  return scored;
}
