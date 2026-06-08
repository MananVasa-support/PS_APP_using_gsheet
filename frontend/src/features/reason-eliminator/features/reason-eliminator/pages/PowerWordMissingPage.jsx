import { useMemo, useState } from 'react';
import { FiZap } from 'react-icons/fi';
import PageHeader from '@/features/reason-eliminator/components/common/PageHeader.jsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import EmptyState from '@/features/reason-eliminator/components/common/EmptyState.jsx';
import { Table, THead, TBody, TR, TH, TD } from '@/features/reason-eliminator/components/common/Table.jsx';
import PowerWordPicker from '../components/PowerWordPicker.jsx';
import RecentFilterBar from '../components/RecentFilterBar.jsx';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';
import reasonEliminatorService from '../services/reasonEliminatorService.js';
import { formatDate } from '../utils/formatters.js';
import { filterRecent } from '../utils/recentFilter.js';
import { POWER_WORDS } from '../constants.js';

// Power Word Missing: every active (non-archived) Reason anywhere that still has
// no Power Word, shown with its date and the Reason. Pick a Power Word for one
// and it disappears from this list and shows up in the Power Word Master. This
// reuses the exact same "missing Power Word" rule the Previous Assessments page
// uses — nothing here changes that logic, it just surfaces it on its own page.
export default function PowerWordMissingPage() {
  // Read data the SAME way the master sheets do — storage merged with the live
  // in-progress session — so a Power Word assigned here is reflected instantly
  // and is never clobbered by the active session re-persisting later.
  const {
    reasons: rawReasons,
    sessionId,
    createdAt,
    hasActiveSession,
    setPowerWord,
    persist,
  } = useAssessmentFlow();

  // Bumped after a write to a past (storage-only) session to force a re-read.
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  // Recent filter (Latest / Last 3 / Last 5 / Last 10 / All / From–To) — the
  // exact same control the Previous Assessments page uses. Only shapes which
  // missing-Power-Word rows are displayed; the stored reasons are untouched.
  const [recent, setRecent] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Merge storage (source of truth) with the live current session so a freshly
  // assigned Power Word shows immediately (and a deleted reason drops off).
  const sessions = useMemo(() => {
    const stored = reasonEliminatorService.listSessions();
    if (!hasActiveSession || !sessionId) return stored;
    const exists = stored.some((s) => s.id === sessionId);
    if (exists) {
      return stored.map((s) =>
        s.id === sessionId ? { ...s, reasons: rawReasons } : s
      );
    }
    return [{ id: sessionId, createdAt, reasons: rawReasons }, ...stored];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawReasons, sessionId, createdAt, hasActiveSession, version]);

  // Active (non-archived) reasons anywhere that still have no Power Word.
  const missingReasons = useMemo(
    () =>
      sessions.flatMap((s) =>
        (s.reasons || [])
          .filter((r) => !r.archived && !(r.powerWord || '').trim())
          .map((r) => ({ reason: r, sessionId: s.id }))
      ),
    [sessions]
  );

  // Apply the recent filter by each reason's creation date.
  const visibleMissing = useMemo(
    () =>
      filterRecent(missingReasons, recent, (m) => m.reason.createdAt, {
        from: customFrom,
        to: customTo,
      }),
    [missingReasons, recent, customFrom, customTo]
  );

  // Power Word choices for the picker — the Power Word Exercise list plus any
  // custom Power Words already used anywhere. Deduped, exercise words first.
  const powerWordOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    const add = (w) => {
      const word = (w || '').trim();
      if (!word || seen.has(word.toLowerCase())) return;
      seen.add(word.toLowerCase());
      out.push(word);
    };
    POWER_WORDS.forEach(add);
    sessions.forEach((s) =>
      (s.reasons || []).forEach((r) => add(r.powerWord))
    );
    return out;
  }, [sessions]);

  // Map every reason id to its owning session so a Power Word pick routes to the
  // right place (the live flow for the current session, storage for a past one).
  const ownerById = useMemo(() => {
    const m = {};
    sessions.forEach((s) =>
      (s.reasons || []).forEach((r) => {
        m[r.id] = s.id;
      })
    );
    return m;
  }, [sessions]);

  const isCurrent = (sid) => hasActiveSession && sid === sessionId;

  const editStorage = (sid, updater) => {
    const s = reasonEliminatorService.getSession(sid);
    if (!s) return;
    reasonEliminatorService.upsertSession({
      ...s,
      reasons: updater(Array.isArray(s.reasons) ? s.reasons : []),
    });
  };

  // Assign a Power Word to one reason and save it for good. Routed exactly like
  // the master sheets: to the live flow (memory + storage) for the current
  // session, or straight to storage for a past one. Once saved, the reason has a
  // Power Word so it drops off this list and never resurfaces.
  const setPowerWordFor = (id, word) => {
    const sid = ownerById[id];
    if (!sid) return;
    if (isCurrent(sid)) {
      setPowerWord(id, word);
      persist({
        reasons: rawReasons.map((r) =>
          r.id === id ? { ...r, powerWord: word } : r
        ),
      });
    } else {
      editStorage(sid, (rs) =>
        rs.map((r) => (r.id === id ? { ...r, powerWord: word } : r))
      );
    }
    bump();
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Power Words"
        title="Power Word Missing"
        description="Reasons that still need a Power Word. Assign one to each and it moves into the Power Word Master."
      />

      {missingReasons.length === 0 ? (
        <EmptyState
          icon={<FiZap size={20} />}
          title="No missing Power Words"
          description="Every Reason already has a Power Word. Any Reason without one will appear here with its date."
        />
      ) : (
        <>
          <RecentFilterBar
            value={recent}
            onChange={setRecent}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />

          {visibleMissing.length === 0 ? (
            <p className="py-10 text-center text-sm text-brand-gray-900">
              No matching records found.
            </p>
          ) : (
            <div className="surface-card p-4 md:p-5">
              <p className="mb-3 text-sm font-semibold text-brand-black">
                Missing Power Words
                {visibleMissing.length ? ` (${visibleMissing.length})` : ''}
              </p>
              <Table>
                <THead>
                  <TR>
                    <TH className="w-36">Date</TH>
                    <TH>Reason</TH>
                    <TH className="w-64 whitespace-nowrap">Power Word</TH>
                  </TR>
                </THead>
                <TBody>
                  {visibleMissing.map(({ reason: r }) => (
                    <TR key={r.id} className="border-t border-brand-gray-100">
                      <TD className="text-brand-gray-900 whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </TD>
                      <TD className="text-brand-ink">{r.text}</TD>
                      <TD>
                        <PowerWordPicker
                          options={powerWordOptions}
                          onPick={(w) => setPowerWordFor(r.id, w)}
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
