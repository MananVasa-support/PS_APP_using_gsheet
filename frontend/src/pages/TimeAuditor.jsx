import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlay, FiArchive, FiArrowLeft, FiArrowRight, FiCheckCircle, FiEdit2,
  FiTrash2, FiEye, FiHome, FiGrid, FiClock, FiCheck, FiX, FiMenu,
  FiAlertTriangle, FiChevronDown, FiTrendingUp, FiAward,
} from 'react-icons/fi';
import { Button, Badge, Modal, BackButton } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { MANDATORY_MSG, isEmptyValue } from '@/utils/validation';
import TimeAuditorSidebar from '@/components/layout/TimeAuditorSidebar.jsx';
import { currentLevel, loadChallengeState } from '@/utils/level';
import {
  listAssessments,
  saveAssessment as saveAssessmentRow,
  deleteAssessment as deleteAssessmentRow,
} from '@/services/taService';
import { cn } from '@/utils/cn';

/**
 * Time Auditor â€” full-screen multi-stage assessment workflow.
 *
 * Stages:
 *   home       â†’ 2 buttons (Start New Assessment, Previous Assessments)
 *   previous   â†’ list of past assessments (View / Edit / Delete)
 *   setup      â†’ pick start time (HH : MM : AM/PM)
 *   collect    â†’ enter activities in 15-minute slots until END
 *   review     â†’ summary of all slots with EDIT, then START ASSESSMENT
 *   classify   â†’ one slot at a time: Planned / Productive / Unproductive / Not Sure
 *   productive â†’ for each PRODUCTIVE slot: type + experience + mood + outcome + notes
 *   top3       â†’ enter Top Thing #1, #2, #3
 *   top3summary→ review & edit the 3 entries, then NEXT
 *   top3review â†’ for each productive slot, mark Top 3? Yes / No
 *   summary    â†’ final stats + insights + GO TO DASHBOARD
 *
 * The sidebar is intentionally hidden for this route (see AppRoutes). It
 * reappears only when the user clicks "Go To Dashboard" at the end and
 * navigates back to /dashboard.
 */

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const AMPM_OPTIONS = ['AM', 'PM'];

const SLOT_MINUTES = 30;
const CLASSIFICATIONS = ['Productive', 'Unproductive', 'Personal', 'Not Sure'];
const PRODUCTIVE_TYPES = ['Planned', 'Accidental', 'Unplanned'];
const OUTCOMES = ['Yes', 'No', "Can't Say"];
const RATING_OPTIONS = [1, 2, 3, 4, 5];
const ACTIVITY_CATEGORIES = [
  'Sales',
  'Collection',
  'Effective, Cheaper & Better Purchasing',
  'Getting Things Done from others',
  'Add your own',
];

// Storage is handled by services/taService.js — every assessment is a row in
// Supabase `time_auditor_entries` tagged with the signed-in user's id (RLS), so
// each user's history follows them and admins/consultants can view it.

// â”€â”€ Time helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toStartMinute({ hour, minute, ampm }) {
  let h = parseInt(hour, 10) % 12;
  if (ampm === 'PM') h += 12;
  return h * 60 + parseInt(minute, 10);
}

function fmtClock(totalMinutes) {
  const t = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h24 = Math.floor(t / 60);
  const m = t % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function slotLabel(slot) {
  return `${fmtClock(slot.startMin)} - ${fmtClock(slot.endMin)}`;
}

function newSlot(startMin) {
  return {
    id: `${startMin}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    startMin,
    endMin: startMin + SLOT_MINUTES,
    activity: '',
    classification: '',
    productiveType: '',
    experience: 0,
    mood: 0,
    outcome: '',
    notes: '',
    isTop3: false,
  };
}

// â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function computeStats(slots, top3 = []) {
  const totalCount = slots.length;
  const productive = slots.filter((s) => s.classification === 'Productive');
  const unproductive = slots.filter((s) => s.classification === 'Unproductive');
  const plannedAll = slots.filter((s) => s.classification === 'Planned');
  const notSure = slots.filter((s) => s.classification === 'Not Sure');
  const personal = slots.filter((s) => s.classification === 'Personal');

  const planned = productive.filter((s) => s.productiveType === 'Planned');
  const unplanned = productive.filter((s) => s.productiveType === 'Unplanned');
  const accidental = productive.filter((s) => s.productiveType === 'Accidental');

  const avg = (arr, key) => (arr.length ? +(arr.reduce((sum, s) => sum + (Number(s[key]) || 0), 0) / arr.length).toFixed(2) : 0);

  const outcomeCounts = OUTCOMES.reduce((acc, o) => ({ ...acc, [o]: productive.filter((s) => s.outcome === o).length }), {});

  const topTerms = (top3 || []).map((t) => (t || '').trim().toLowerCase()).filter(Boolean);
  const top3SlotCount = topTerms.length
    ? slots.filter((s) => {
        const a = (s.activity || '').trim().toLowerCase();
        if (!a) return false;
        return topTerms.some((t) => a === t || a.includes(t) || t.includes(a));
      }).length
    : 0;
  const totalMin = totalCount * SLOT_MINUTES;
  const top3Min = top3SlotCount * SLOT_MINUTES;
  const top3Pct = totalMin ? Math.round((top3Min / totalMin) * 100) : 0;

  // Most-frequent activity helper.
  const tally = (list) => {
    const map = new Map();
    for (const s of list) {
      const key = s.activity.trim();
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    let best = null;
    for (const [k, v] of map.entries()) {
      if (!best || v > best.count) best = { activity: k, count: v };
    }
    return best?.activity || 'â€”';
  };

  return {
    totalMin,
    top3Min,
    top3Pct,
    productiveMin: productive.length * SLOT_MINUTES,
    unproductiveMin: unproductive.length * SLOT_MINUTES,
    plannedMin: (plannedAll.length + planned.length) * SLOT_MINUTES,
    unplannedMin: unplanned.length * SLOT_MINUTES,
    accidentalMin: accidental.length * SLOT_MINUTES,
    plannedProductiveMin: planned.length * SLOT_MINUTES,
    notSureMin: notSure.length * SLOT_MINUTES,
    personalMin: personal.length * SLOT_MINUTES,
    productivityPct: totalCount ? Math.round((productive.length / totalCount) * 100) : 0,
    moodAvg: avg(productive, 'mood'),
    experienceAvg: avg(productive, 'experience'),
    outcomeCounts,
    mostProductiveActivity: tally(productive),
    mostTimeConsuming: tally(slots),
    plannedList: planned.map((s) => s.activity).filter(Boolean),
    unplannedList: unplanned.map((s) => s.activity).filter(Boolean),
    accidentalList: accidental.map((s) => s.activity).filter(Boolean),
    productiveList: productive.map((s) => s.activity).filter(Boolean),
    unproductiveList: unproductive.map((s) => s.activity).filter(Boolean),
    top3: (top3 || []).filter(Boolean),
  };
}

function fmtMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TimeAuditor() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin, isConsultant } = useAuth();

  // Role gate — the Start New / Previous Assessments workflow is for clients
  // only. Admins and consultants get a clients-list view (rendered AFTER the
  // hooks block, with no left sidebar) so they can pick a client and jump to
  // that client's dashboard.

  const [stage, setStage] = useState('home'); // see top-of-file enum
  const [assessments, setAssessments] = useState([]);

  // Load this user's saved assessments from the database on mount.
  useEffect(() => {
    let active = true;
    listAssessments()
      .then((list) => active && setAssessments(list))
      .catch(() => active && toast.error('Could not load your saved assessments.'));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active assessment in progress
  const [start, setStart] = useState({ hour: '06', minute: '00', ampm: 'AM' });
  const [slots, setSlots] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [classifyIdx, setClassifyIdx] = useState(0);
  const [productiveIdx, setProductiveIdx] = useState(0);
  const [topInputs, setTopInputs] = useState(['', '', '']);
  const [topCategories, setTopCategories] = useState(['', '', '']);
  const [topStep, setTopStep] = useState(0);
  const [viewingId, setViewingId] = useState(null);
  const [savedAssessmentId, setSavedAssessmentId] = useState(null);

  // Productive slots in original order (computed on demand)
  const productiveSlots = useMemo(
    () => slots.filter((s) => s.classification === 'Productive'),
    [slots]
  );

  // Aggregate overview across all saved assessments — the 3 stat boxes shown on
  // the home screen (Hours logged / Avg productivity / Current level). Level is
  // tied to audits + Challenge participation (see utils/level.js).
  const overview = useMemo(() => {
    const list = assessments || [];
    const count = list.length;
    const totalMin = list.reduce((s, a) => s + (a.stats?.totalMin || (a.slots?.length || 0) * 30), 0);
    const avgProd = count
      ? Math.round(list.reduce((s, a) => s + (a.stats?.productivityPct || 0), 0) / count)
      : 0;
    return {
      count,
      hours: (totalMin / 60).toFixed(1),
      avgProd,
      level: currentLevel(count, loadChallengeState()),
    };
  }, [assessments]);

  // â”€â”€ Stage controls â”€â”€
  function goHome() {
    setStage('home');
  }

  function resetSession() {
    setStart({ hour: '06', minute: '00', ampm: 'AM' });
    setSlots([]);
    setEditingId(null);
    setClassifyIdx(0);
    setProductiveIdx(0);
    setTopInputs(['', '', '']);
    setTopCategories(['', '', '']);
    setTopStep(0);
    setSavedAssessmentId(null);
  }

  function beginAssessment() {
    resetSession();
    setStage('setup');
  }

  function handleStart() {
    const sm = toStartMinute(start);
    setSlots([newSlot(sm)]);
    setStage('collect');
  }

  // Collect activities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function updateSlot(id, patch) {
    setSlots((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function collectNext() {
    const current = slots[slots.length - 1];
    if (
      !current ||
      isEmptyValue(current.activity) ||
      !current.mood ||
      !current.experience
    ) {
      toast.error(MANDATORY_MSG);
      return;
    }
    setSlots((list) => [...list, newSlot(current.endMin)]);
  }

  function collectPrev() {
    if (slots.length <= 1) return;
    setSlots((list) => list.slice(0, -1));
  }

  function collectEnd() {
    // Trim any trailing blank slot, but keep at least one filled slot.
    const filled = slots.filter((s) => !isEmptyValue(s.activity));
    if (filled.length === 0) {
      toast.error(MANDATORY_MSG);
      return;
    }
    if (filled.some((s) => !s.mood || !s.experience)) {
      toast.error(MANDATORY_MSG);
      return;
    }
    setSlots(filled);
    setStage('review');
  }

  // Review / edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function startEdit(id) {
    setEditingId(id);
  }
  function stopEdit() {
    const empty = slots.some((s) => isEmptyValue(s.activity));
    if (empty) {
      toast.error(MANDATORY_MSG);
      return;
    }
    setEditingId(null);
  }

  function startClassification() {
    if (slots.some((s) => isEmptyValue(s.activity))) {
      toast.error(MANDATORY_MSG);
      return;
    }
    setClassifyIdx(0);
    setStage('classify');
  }

  // Classify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function classifySlot(value) {
    const cur = slots[classifyIdx];
    if (!cur) return;
    updateSlot(cur.id, { classification: value });
  }

  function classifyNext() {
    const cur = slots[classifyIdx];
    if (!cur || isEmptyValue(cur.classification)) {
      toast.error(MANDATORY_MSG);
      return;
    }
    if (classifyIdx < slots.length - 1) setClassifyIdx((i) => i + 1);
  }

  function classifyPrev() {
    if (classifyIdx > 0) setClassifyIdx((i) => i - 1);
  }

  function classifyEnd() {
    if (slots.some((s) => isEmptyValue(s.classification))) {
      toast.error(MANDATORY_MSG);
      return;
    }
    if (productiveSlots.length === 0) {
      // No productive slots â†’ skip productive deep-dive AND top3 review,
      // but Top 3 things are still defined per spec.
      setTopStep(0);
      setStage('top3');
      return;
    }
    setProductiveIdx(0);
    setStage('productive');
  }

  // Productive deep-dive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function updateProductive(id, patch) {
    updateSlot(id, patch);
  }

  function productiveNext() {
    const cur = productiveSlots[productiveIdx];
    if (!cur) return;
    if (
      isEmptyValue(cur.productiveType) ||
      !cur.experience ||
      !cur.mood ||
      isEmptyValue(cur.outcome)
    ) {
      toast.error(MANDATORY_MSG);
      return;
    }
    if (productiveIdx < productiveSlots.length - 1) setProductiveIdx((i) => i + 1);
  }

  function productivePrev() {
    if (productiveIdx > 0) setProductiveIdx((i) => i - 1);
  }

  function productiveEnd() {
    const incomplete = productiveSlots.find(
      (s) =>
        isEmptyValue(s.productiveType) ||
        !s.experience ||
        !s.mood ||
        isEmptyValue(s.outcome)
    );
    if (incomplete) {
      toast.error(MANDATORY_MSG);
      // jump to the first incomplete one
      const idx = productiveSlots.findIndex((s) => s.id === incomplete.id);
      setProductiveIdx(Math.max(0, idx));
      return;
    }
    setTopStep(0);
    setStage('top3');
  }

  // Top 3 stage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function top3Next() {
    const cat = topCategories[topStep];
    if (isEmptyValue(cat)) {
      toast.error(MANDATORY_MSG);
      return;
    }
    if (cat === 'Add your own' && isEmptyValue(topInputs[topStep])) {
      toast.error(MANDATORY_MSG);
      return;
    }
    if (topStep < 2) setTopStep((i) => i + 1);
    else {
      // After defining all 3, show a review/edit summary first.
      setStage('top3summary');
    }
  }

  function top3Prev() {
    if (topStep > 0) setTopStep((i) => i - 1);
  }

  // Top 3 summary (review/edit the 3 entries before continuing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function editTop3Entry(idx) {
    setTopStep(idx);
    setStage('top3');
  }

  function top3SummaryNext() {
    // All 3 already validated by top3Next before reaching this stage.
    if (productiveSlots.length === 0) {
      finalizeAndShowSummary();
    } else {
      setStage('top3review');
    }
  }

  function setTopValue(v) {
    setTopInputs((arr) => {
      const next = [...arr];
      next[topStep] = v;
      return next;
    });
  }

  function setTopCategory(v) {
    setTopCategories((arr) => {
      const next = [...arr];
      next[topStep] = v;
      return next;
    });
    // Auto-fill the final value from the category label, except when "Others"
    // â€” in which case we clear the value so the user can type a custom one.
    setTopInputs((arr) => {
      const next = [...arr];
      next[topStep] = v === 'Add your own' ? '' : v;
      return next;
    });
  }

  // Top 3 review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function setIsTop3(id, value) {
    updateSlot(id, { isTop3: value });
  }

  function submitTop3Review() {
    // No mandatory rule â€” Yes/No per slot defaults to false. Spec only
    // requires SUBMIT button. Build summary.
    finalizeAndShowSummary();
  }

  function finalizeAndShowSummary() {
    setStage('summary');
  }

  // Auto-save the moment the user lands on the final summary, so the run
  // shows up in "Previous Assessments" without needing a SAVE button.
  useEffect(() => {
    if (stage !== 'summary' || savedAssessmentId) return;
    saveCurrentAssessment();
    // saveCurrentAssessment captures fresh state via closure; the guard
    // above ensures it only fires once per assessment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, savedAssessmentId]);

  // Save & exit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function saveCurrentAssessment() {
    if (savedAssessmentId) return; // already saved this run
    setSavedAssessmentId('saving'); // guard against the effect re-firing
    const payload = {
      date: new Date().toISOString(),
      startTime: start,
      slots,
      top3: topInputs.map((t) => t.trim()).filter(Boolean),
      stats: computeStats(slots, topInputs),
      active: true,
    };
    try {
      const saved = await saveAssessmentRow(payload); // → row in time_auditor_entries
      setSavedAssessmentId(saved.id);
      setAssessments((list) => [saved, ...list]);
      toast.success('Saved to your account — visible in Previous Assessments.');
    } catch (err) {
      setSavedAssessmentId(null); // allow retry
      toast.error(err?.message || 'Could not save the assessment.');
    }
  }

  // Previous assessments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function viewAssessment(id) {
    setViewingId(id);
  }

  function editAssessment(id) {
    const a = assessments.find((x) => x.id === id);
    if (!a) return;
    // Pull the saved record back into the live workflow at the Review stage
    setStart(a.startTime);
    setSlots(a.slots);
    const restoredInputs = a.top3.concat(['', '', '']).slice(0, 3);
    setTopInputs(restoredInputs);
    // Derive the per-slot category from each saved Top 3 string: an exact match
    // against the preset list means it was picked from the dropdown; anything
    // else (custom text from old records or "Others" entries) maps to 'Add your own'.
    setTopCategories(
      restoredInputs.map((v) => {
        if (!v) return '';
        if (ACTIVITY_CATEGORIES.includes(v) && v !== 'Add your own') return v;
        return 'Add your own';
      })
    );
    setEditingId(null);
    setStage('review');
    // Remove the old record (DB + local list) so finishing the edit saves a
    // fresh row — same "edit = redo from review" behavior as before.
    setAssessments((list) => list.filter((x) => x.id !== id));
    deleteAssessmentRow(id).catch(() => toast.error('Could not remove the old copy — you may see a duplicate.'));
  }

  async function deleteAssessment(id) {
    setAssessments((list) => list.filter((a) => a.id !== id));
    try {
      await deleteAssessmentRow(id);
      toast.success('Assessment deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete the assessment.');
      listAssessments().then(setAssessments).catch(() => {});
    }
  }

  // â”€â”€ Render â”€â”€
  // Role gate (post-hooks): admin gets a blank frame while the effect above
  // redirects them to /admin.
  if (isAdmin) return <AdminClientsView />;
  // Consultants get a clients-list "dashboard" instead of the assessment flow.
  if (isConsultant) return <ConsultantClientsView />;

  return (
    <div className="flex min-h-screen bg-ink-950">
      <TimeAuditorSidebar onHome={goHome} />

      <div className="min-w-0 flex-1">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          {stage === 'home' && (
            <StageHome
              key="home"
              overview={overview}
              onStart={beginAssessment}
              onPrevious={() => setStage('previous')}
              onBack={() => navigate('/dashboard')}
            />
          )}

          {stage === 'previous' && (
            <StagePrevious
              key="prev"
              assessments={assessments}
              onBack={goHome}
              onView={viewAssessment}
              onEdit={editAssessment}
              onDelete={deleteAssessment}
              viewingId={viewingId}
              onCloseView={() => setViewingId(null)}
            />
          )}

          {stage === 'setup' && (
            <StageSetup key="setup" value={start} onChange={setStart} onStart={handleStart} onBack={goHome} />
          )}

          {stage === 'collect' && (
            <StageCollect
              key="collect"
              slots={slots}
              onUpdate={updateSlot}
              onNext={collectNext}
              onPrev={collectPrev}
              onEnd={collectEnd}
              onBack={() => setStage('setup')}
            />
          )}

          {stage === 'review' && (
            <StageReview
              key="review"
              slots={slots}
              editingId={editingId}
              onUpdate={updateSlot}
              onStartEdit={startEdit}
              onStopEdit={stopEdit}
              onStart={startClassification}
              onBack={() => setStage('collect')}
            />
          )}

          {stage === 'classify' && (
            <StageClassify
              key="classify"
              slot={slots[classifyIdx]}
              index={classifyIdx}
              total={slots.length}
              onChoose={classifySlot}
              onNext={classifyNext}
              onPrev={classifyPrev}
              onEnd={classifyEnd}
            />
          )}

          {stage === 'productive' && (
            <StageProductive
              key="productive"
              slot={productiveSlots[productiveIdx]}
              index={productiveIdx}
              total={productiveSlots.length}
              onUpdate={updateProductive}
              onNext={productiveNext}
              onPrev={productivePrev}
              onEnd={productiveEnd}
              onBack={() => setStage('classify')}
            />
          )}

          {stage === 'top3' && (
            <StageTop3
              key="top3"
              step={topStep}
              value={topInputs[topStep]}
              category={topCategories[topStep]}
              onChange={setTopValue}
              onCategoryChange={setTopCategory}
              onNext={top3Next}
              onPrev={top3Prev}
              onBack={() => {
                if (productiveSlots.length > 0) {
                  setProductiveIdx(productiveSlots.length - 1);
                  setStage('productive');
                } else {
                  setClassifyIdx(slots.length - 1);
                  setStage('classify');
                }
              }}
            />
          )}

          {stage === 'top3summary' && (
            <StageTop3Summary
              key="top3summary"
              entries={topInputs}
              categories={topCategories}
              onEdit={editTop3Entry}
              onBack={() => { setTopStep(2); setStage('top3'); }}
              onNext={top3SummaryNext}
            />
          )}

          {stage === 'top3review' && (
            <StageTop3Review
              key="top3review"
              slots={productiveSlots}
              onSet={setIsTop3}
              onSubmit={submitTop3Review}
              onBack={() => setStage('top3summary')}
            />
          )}

          {stage === 'summary' && (
            <StageSummary
              key="summary"
              slots={slots}
              top3={topInputs}
              onGoDashboard={() => navigate('/dashboard')}
            />
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}

// â”€â”€ Top bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TopBar({ onHome, stage, onOpenMobileSidebar }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-900/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-fg-strong lg:hidden"
            aria-label="Open menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>
        )}
        {/* No Logo here — the shared ToolLayout navbar above already shows the
            Productivity Shastra brand. This slim bar just labels the tool and
            holds the Auditor-home action (avoids a duplicate stacked navbar). */}
        <div className="text-sm font-semibold text-fg-muted">Time Auditor</div>
        <div className="ml-auto flex items-center gap-2">
          {stage !== 'home' && stage !== 'summary' && (
            <Button variant="ghost" size="sm" icon={FiHome} onClick={onHome}>
              Auditor home
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// â”€â”€ Stage: Home â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageHome({ onStart, onPrevious, onBack, overview }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="grid gap-5"
    >
      <BackButton onClick={onBack} className="justify-self-start" />

      {/* Overview stat boxes — once the user has at least one saved assessment. */}
      {overview?.count > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <HomeStat icon={FiClock} label="Hours logged" value={`${overview.hours} h`} />
          <HomeStat icon={FiTrendingUp} label="Avg. productivity" value={`${overview.avgProd}%`} />
          <HomeStat icon={FiAward} label="Current level" value={`Lvl ${overview.level}`} />
        </div>
      )}

      <BigActionCard icon={FiPlay} title="Start New Assessment" desc="Begin a fresh time audit." onClick={onStart} />
      <BigActionCard icon={FiArchive} title="Previous Assessments" desc="View saved audits." onClick={onPrevious} />
    </motion.div>
  );
}

function HomeStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink-700 bg-ink-850 p-5">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold text-fg-strong">{value}</p>
        <p className="text-sm text-ink-400">{label}</p>
      </div>
    </div>
  );
}

function BigActionCard({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex h-full flex-col items-start gap-4 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-glow"
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-600/15 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-110">
        <Icon className="h-6 w-6" />
      </span>
      <div className="relative">
        <p className="text-xl font-bold text-fg-strong">{title}</p>
        <p className="mt-1 text-sm text-ink-400">{desc}</p>
      </div>
    </button>
  );
}

// â”€â”€ Stage: Setup (pick start time) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageSetup({ value, onChange, onStart, onBack }) {
  function update(key, v) {
    onChange({ ...value, [key]: v });
  }
  const isComplete = !!value.hour && !!value.minute && !!value.ampm;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-ink-700 bg-ink-850 p-6 sm:p-8"
    >
      <h2 className="font-display text-2xl font-bold text-fg-strong">Select Start Time</h2>
      <p className="mt-1 text-sm text-ink-400">All slots run in 30-minute increments from this time.</p>

      <div className="mt-8 flex flex-wrap items-end gap-3">
        <DropField label="HH" value={value.hour} options={HOUR_OPTIONS} onChange={(v) => update('hour', v)} />
        <span className="pb-3 text-2xl font-bold text-ink-400">:</span>
        <DropField label="MM" value={value.minute} options={MINUTE_OPTIONS} onChange={(v) => update('minute', v)} />
        <DropField label="" value={value.ampm} options={AMPM_OPTIONS} onChange={(v) => update('ampm', v)} />
      </div>

      <div className="mt-10 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" icon={FiArrowLeft} onClick={onBack}>Back</Button>
        <Button size="lg" icon={FiPlay} onClick={onStart} disabled={!isComplete}>START</Button>
      </div>
    </motion.div>
  );
}

function DropField({ label, value, options, onChange }) {
  return (
    <div>
      {label && <p className="mb-1 text-xs uppercase tracking-wider text-ink-500">{label}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base h-12 w-28 text-base font-semibold"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-ink-800">{o}</option>
        ))}
      </select>
    </div>
  );
}

// â”€â”€ Stage: Collect Activities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageCollect({ slots, onUpdate, onNext, onPrev, onEnd, onBack }) {
  const cur = slots[slots.length - 1];
  if (!cur) return null;
  const showPrev = slots.length > 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <BackButton onClick={onBack} />
      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
        <p className="text-xs uppercase tracking-wider text-ink-500">Activity {slots.length}</p>
        <p className="mt-1 font-display text-2xl font-bold text-fg-strong">{slotLabel(cur)}</p>

        <div className="mt-6">
          <label htmlFor="activity" className="mb-1.5 block text-sm font-medium text-fg-muted">
            What did you do, who you were with, where you were, what happened or did not happen?
            Write in as much detail as you can. Do not rush. <span className="text-brand-400">*</span>
          </label>
          <textarea
            id="activity"
            value={cur.activity}
            onChange={(e) => onUpdate(cur.id, { activity: e.target.value })}
            placeholder="e.g. Client meeting with Naresh at the Bandra office - went over the Q3 pipeline, he flagged concerns about the new pricing tier..."
            rows={5}
            required
            className="input-base resize-y min-h-[120px]"
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <MoodEmojiRow value={cur.mood} onChange={(v) => onUpdate(cur.id, { mood: v })} />
          <RatingRow label="Experience Rating" value={cur.experience} onChange={(v) => onUpdate(cur.id, { experience: v })} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {showPrev && <Button variant="danger" size="sm" icon={FiArrowLeft} onClick={onPrev} className="-ml-2">Previous</Button>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEnd}>END</Button>
          <Button icon={FiArrowRight} onClick={onNext}>NEXT</Button>
        </div>
      </div>
    </motion.div>
  );
}

// â”€â”€ Stage: Review summary + EDIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageReview({ slots, editingId, onUpdate, onStartEdit, onStopEdit, onStart, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div>
        <h2 className="font-display text-2xl font-bold text-fg-strong">Activity Summary</h2>
        <p className="mt-1 text-sm text-ink-400">Review and edit your captured activities before classification.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850">
        <ul className="divide-y divide-ink-800">
          {slots.map((s) => {
            const isEditing = editingId === s.id;
            return (
              <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink-800 px-3 py-1.5 text-sm font-medium text-fg">
                  <FiClock className="h-4 w-4 text-brand-400" /> {slotLabel(s)}
                </span>
                {isEditing ? (
                  <input
                    autoFocus
                    value={s.activity}
                    onChange={(e) => onUpdate(s.id, { activity: e.target.value })}
                    placeholder="What did you do, who with, where, what happened?"
                    className="input-base flex-1"
                  />
                ) : (
                  <span className="flex-1 text-sm text-fg">{s.activity || <em className="text-ink-500">â€” empty</em>}</span>
                )}
                <div className="ml-auto flex shrink-0 gap-1">
                  {isEditing ? (
                    <Button size="sm" icon={FiCheck} onClick={onStopEdit}>Done</Button>
                  ) : (
                    <Button size="sm" variant="ghost" icon={FiEdit2} onClick={() => onStartEdit(s.id)}>EDIT</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" icon={FiArrowLeft} onClick={onBack}>Back</Button>
        <Button size="lg" icon={FiPlay} onClick={onStart}>START ASSESSMENT</Button>
      </div>
    </motion.div>
  );
}

// â”€â”€ Stage: Classify each slot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageClassify({ slot, index, total, onChoose, onNext, onPrev, onEnd }) {
  if (!slot) return null;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <ProgressBar label={`Classification ${index + 1} of ${total}`} value={index + 1} max={total} />

      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-wider text-ink-500">Time slot</p>
        <p className="mt-1 font-display text-2xl font-bold text-fg-strong">{slotLabel(slot)}</p>

        <p className="mt-4 text-xs uppercase tracking-wider text-ink-500">Activity</p>
        <p className="mt-1 text-lg font-semibold text-fg">{slot.activity}</p>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-fg-muted">Choose a classification <span className="text-brand-400">*</span></p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CLASSIFICATIONS.map((c) => (
              <ChoiceButton key={c} label={c} active={slot.classification === c} onClick={() => onChoose(c)} />
            ))}
          </div>
        </div>
      </div>

      <NavBar
        showPrev={!isFirst}
        onPrev={onPrev}
        onNext={isLast ? undefined : onNext}
        onEnd={isLast ? onEnd : undefined}
      />
    </motion.div>
  );
}

// â”€â”€ Stage: Productive deep-dive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageProductive({ slot, index, total, onUpdate, onNext, onPrev, onEnd, onBack }) {
  if (!slot) return null;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <BackButton onClick={onBack} />
      <h2 className="font-display text-2xl font-bold text-fg-strong">PRODUCTIVE SLOTS</h2>
      <ProgressBar label={`Productive slot ${index + 1} of ${total}`} value={index + 1} max={total} />

      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-6 sm:p-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-500">Time slot</p>
          <p className="mt-1 font-display text-xl font-bold text-fg-strong">{slotLabel(slot)}</p>
          <p className="mt-2 text-lg font-semibold text-fg">{slot.activity}</p>
        </div>

        {/* Classification */}
        <div>
          <p className="mb-2 text-sm font-medium text-fg-muted">Sub-Classification <span className="text-brand-400">*</span></p>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCTIVE_TYPES.map((p) => (
              <ChoiceButton key={p} label={p} active={slot.productiveType === p} onClick={() => onUpdate(slot.id, { productiveType: p })} />
            ))}
          </div>
        </div>

        {/* Mood */}
        <RatingRow label="Effort Rating" value={slot.mood} onChange={(v) => onUpdate(slot.id, { mood: v })} />

        {/* Outcome */}
        <div>
          <p className="mb-2 text-sm font-medium text-fg-muted">Did you achieve an Outcome <span className="text-brand-400">*</span></p>
          <div className="grid grid-cols-3 gap-2">
            {OUTCOMES.map((o) => (
              <ChoiceButton key={o} label={o} active={slot.outcome === o} onClick={() => onUpdate(slot.id, { outcome: o })} />
            ))}
          </div>
        </div>

        {/* Notes â€” optional */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg-muted">Outcome Notes <span className="text-ink-500">(optional)</span></label>
          <textarea
            value={slot.notes}
            onChange={(e) => onUpdate(slot.id, { notes: e.target.value })}
            placeholder="Anything else worth remembering?"
            rows={3}
            className="input-base resize-y"
          />
        </div>
      </div>

      <NavBar
        showPrev={!isFirst}
        onPrev={onPrev}
        onNext={isLast ? undefined : onNext}
        onEnd={isLast ? onEnd : undefined}
      />
    </motion.div>
  );
}

const MOOD_EMOJIS = [
  { value: 1, emoji: '\u{1F622}', label: 'Very low' },
  { value: 2, emoji: '\u{1F641}', label: 'Low' },
  { value: 3, emoji: '\u{1F610}', label: 'Neutral' },
  { value: 4, emoji: '\u{1F642}', label: 'Good' },
  { value: 5, emoji: '\u{1F604}', label: 'Great' },
];

function MoodEmojiRow({ value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wider text-ink-500">
        How did You Feel <span className="text-brand-400">*</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {MOOD_EMOJIS.map((m) => {
          const active = value === m.value;
          return (
            <button
              key={m.value}
              type="button"
              title={m.label}
              aria-label={m.label}
              onClick={() => onChange(m.value)}
              className={cn(
                'grid h-12 w-12 place-items-center rounded-xl border text-2xl transition',
                active
                  ? 'border-transparent bg-brand-gradient shadow-glow'
                  : 'border-ink-700 bg-ink-800 hover:border-brand-500/50'
              )}
            >
              {m.emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RatingRow({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-fg-muted">{label} <span className="text-brand-400">*</span></p>
      <div className="flex flex-wrap gap-2">
        {RATING_OPTIONS.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                'grid h-11 w-11 place-items-center rounded-xl border text-base font-bold transition',
                active
                  ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                  : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€ Stage: Top 3 (one input at a time) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageTop3({ step, value, category, onChange, onCategoryChange, onNext, onPrev, onBack }) {
  const isOthers = category === 'Add your own';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <BackButton onClick={onBack} className="justify-self-start" />
      <h2 className="font-display text-2xl font-bold text-fg-strong">Top Things You are Paid For</h2>
      <ProgressBar label={`Top #${step + 1}`} value={step + 1} max={3} />

      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-6 sm:p-8">
        <label htmlFor={`top3-category-${step}`} className="mb-1.5 block text-sm font-medium text-fg-muted">
          Activity Category <span className="text-brand-400">*</span>
        </label>
        <div className="relative">
          <select
            id={`top3-category-${step}`}
            value={category || ''}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="input-base appearance-none pr-10"
          >
            <option value="" className="bg-ink-800">Select a Category</option>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-ink-800">{c}</option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        </div>

        {isOthers && (
          <div className="mt-4">
            <label htmlFor={`top3-specify-${step}`} className="mb-1.5 block text-sm font-medium text-fg-muted">
              Specify Activity <span className="text-brand-400">*</span>
            </label>
            <input
              id={`top3-specify-${step}`}
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Your #${step + 1} priority`}
              required
              className="input-base"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {step > 0 ? (
          <Button variant="danger" size="sm" icon={FiArrowLeft} onClick={onPrev} className="-ml-2">Previous</Button>
        ) : <span />}
        <Button icon={FiArrowRight} onClick={onNext}>NEXT</Button>
      </div>
    </motion.div>
  );
}

// â”€â”€ Stage: Top 3 Summary (review + edit the 3 entries) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageTop3Summary({ entries, categories, onEdit, onBack, onNext }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div>
        <h2 className="font-display text-2xl font-bold text-fg-strong">Top Things You are Paid For — Summary</h2>
        <p className="mt-1 text-sm text-ink-400">Review your top 3. Use EDIT to revise an entry before continuing.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850">
        <ul className="divide-y divide-ink-800">
          {entries.map((value, idx) => (
            <li key={idx} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink-800 px-3 py-1.5 text-sm font-semibold text-fg">
                Top #{idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-fg-strong">
                  {value || <em className="text-ink-500">— empty</em>}
                </p>
                {categories[idx] && (
                  <p className="mt-0.5 text-xs text-ink-400">
                    Category: <span className="text-fg-muted">{categories[idx]}</span>
                  </p>
                )}
              </div>
              <div className="ml-auto flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" icon={FiEdit2} onClick={() => onEdit(idx)}>EDIT</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" icon={FiArrowLeft} onClick={onBack}>Back</Button>
        <Button size="lg" icon={FiArrowRight} onClick={onNext}>NEXT</Button>
      </div>
    </motion.div>
  );
}

// â”€â”€ Stage: Top 3 Review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StageTop3Review({ slots, onSet, onSubmit, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div>
        <h2 className="font-display text-2xl font-bold text-fg-strong">Top 3 Review</h2>
        <p className="mt-1 text-sm text-ink-400">For each productive activity, mark whether it belongs to your Top 3.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850">
        <ul className="divide-y divide-ink-800">
          {slots.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink-800 px-3 py-1.5 text-sm font-medium text-fg">
                <FiClock className="h-4 w-4 text-brand-400" /> {slotLabel(s)}
              </span>
              <span className="flex-1 text-sm text-fg">{s.activity}</span>
              <div className="ml-auto flex shrink-0 flex-col items-center gap-2 pt-2 sm:pt-3">
                <span className="text-center text-xs font-semibold uppercase tracking-wider text-ink-500">
                  Is this part of top 3?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSet(s.id, true)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                      s.isTop3
                        ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                        : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50'
                    )}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => onSet(s.id, false)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                      s.isTop3 === false
                        ? 'border-transparent bg-ink-700 text-fg-strong'
                        : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-ink-600'
                    )}
                  >
                    NO
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" icon={FiArrowLeft} onClick={onBack}>Back</Button>
        <Button size="lg" icon={FiCheckCircle} onClick={onSubmit}>SUBMIT</Button>
      </div>
    </motion.div>
  );
}

// â”€â”€ Stage: Final Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function StageSummary({ slots, top3, onGoDashboard }) {
  const stats = useMemo(() => computeStats(slots, top3), [slots, top3]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-display text-2xl font-bold text-fg-strong">TIME AUDITOR FINAL SUMMARY</h2>
        <p className="mt-1 text-sm text-ink-400">A complete picture of your audit.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryStat label="Time Logged" value={fmtMin(stats.totalMin)} />
        <SummaryStat label="Top#3 time" value={fmtMin(stats.top3Min)} tone="brand" />
        <SummaryStat label="Top#3 % of total time" value={`${stats.top3Pct}%`} tone="brand" />
        <SummaryStat label="Planned Productive" value={fmtMin(stats.plannedProductiveMin)} tone="success" />
        <SummaryStat label="Unplanned Productive" value={fmtMin(stats.unplannedMin)} tone="warning" />
        <SummaryStat label="Accidental Productive" value={fmtMin(stats.accidentalMin)} tone="info" />
        <SummaryStat label="Not Sure" value={fmtMin(stats.notSureMin)} tone="default" />
        <SummaryStat label="Not productive" value={fmtMin(stats.unproductiveMin)} tone="danger" />
        <SummaryStat label="Personal" value={fmtMin(stats.personalMin)} tone="info" />
      </div>

      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
        <p className="text-xs uppercase tracking-wider text-ink-500">Outcome Summary</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {OUTCOMES.map((o) => (
            <div key={o} className="rounded-xl border border-ink-700 bg-ink-900/40 p-3 text-center">
              <p className="text-xs text-ink-400">{o}</p>
              <p className="mt-1 text-2xl font-bold text-fg-strong">{stats.outcomeCounts[o] || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KEY INSIGHTS */}
      <div>
        <h3 className="font-display text-xl font-bold text-fg-strong">KEY INSIGHTS</h3>
      </div>

      <InsightBlock title="TOP 3 THINGS">
        {stats.top3.length > 0 ? (
          <ol className="list-decimal space-y-1 pl-5 text-fg">
            {stats.top3.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        ) : <p className="text-sm text-ink-400">No top 3 captured.</p>}
      </InsightBlock>

      <div className="grid gap-3 sm:grid-cols-2">
        <InsightBlock title="Most Productive Activity">
          <p className="text-fg">{stats.mostProductiveActivity}</p>
        </InsightBlock>
        <InsightBlock title="Most Time Consuming Activity">
          <p className="text-fg">{stats.mostTimeConsuming}</p>
        </InsightBlock>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InsightBlock title="Planned Activities" tone="info">
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            <span>Number of Slots: <span className="font-semibold text-fg-strong">{stats.plannedMin / SLOT_MINUTES}</span></span>
            <span>Total Duration: <span className="font-semibold text-fg-strong">{fmtMin(stats.plannedMin)}</span></span>
          </div>
          <ChipList items={stats.plannedList} />
        </InsightBlock>
        <InsightBlock title="Unplanned Activities" tone="warning">
          <ChipList items={stats.unplannedList} />
        </InsightBlock>
        <InsightBlock title="Accidental Activities">
          <ChipList items={stats.accidentalList} />
        </InsightBlock>
        <InsightBlock title="Productive Activities" tone="success">
          <ChipList items={stats.productiveList} />
        </InsightBlock>
        <InsightBlock title="Unproductive Activities" tone="danger">
          <ChipList items={stats.unproductiveList} />
        </InsightBlock>
      </div>

      <div className="flex justify-end pt-2">
        <Button size="lg" icon={FiGrid} onClick={onGoDashboard}>GO TO DASHBOARD</Button>
      </div>
    </motion.div>
  );
}

function SummaryStat({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-fg-strong',
    brand: 'text-brand-300',
    success: 'text-emerald-300',
    danger: 'text-red-300',
    info: 'text-sky-300',
    warning: 'text-amber-300',
  };
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850 p-4">
      <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function InsightBlock({ title, children, tone = 'default' }) {
  const ring = {
    default: 'border-ink-700',
    info: 'border-sky-500/30',
    warning: 'border-amber-500/30',
    success: 'border-emerald-500/30',
    danger: 'border-red-500/30',
  };
  return (
    <div className={`rounded-2xl border bg-ink-850 p-5 ${ring[tone]}`}>
      <p className="text-xs uppercase tracking-wider text-ink-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ChipList({ items }) {
  if (!items.length) return <p className="text-sm text-ink-400">None.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span key={`${t}-${i}`} className="rounded-lg bg-ink-900/60 px-2.5 py-1 text-xs text-fg ring-1 ring-ink-700">
          {t}
        </span>
      ))}
    </div>
  );
}

// â”€â”€ Stage: Previous Assessments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StagePrevious({ assessments, onBack, onView, onEdit, onDelete, viewingId, onCloseView }) {
  const viewing = assessments.find((a) => a.id === viewingId);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const confirming = assessments.find((a) => a.id === confirmDeleteId) || null;

  if (viewing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="space-y-5"
      >
        <Button variant="ghost" icon={FiArrowLeft} onClick={onCloseView}>Back to list</Button>
        <StageSummary slots={viewing.slots} top3={viewing.top3} onGoDashboard={onCloseView} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-fg-strong">Previous Assessments</h2>
          <p className="mt-1 text-sm text-ink-400">{assessments.length} saved.</p>
        </div>
        <Button variant="ghost" icon={FiArrowLeft} onClick={onBack}>Back</Button>
      </div>

      {assessments.length === 0 ? (
        <div className="rounded-2xl border border-ink-700 bg-ink-850 p-10 text-center text-sm text-ink-400">
          No assessments yet. Start a new one to see it here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-850">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Productivity %</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const d = new Date(a.date);
                return (
                  <tr key={a.id} className="border-b border-ink-800 last:border-0">
                    <td className="px-4 py-3 text-fg">
                      {d.toLocaleDateString()} <span className="text-ink-500">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3 text-fg">{fmtMin(a.stats?.totalMin || 0)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="brand">{a.stats?.productivityPct ?? 0}%</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" icon={FiEye} onClick={() => onView(a.id)}>View</Button>
                        <Button size="sm" variant="ghost" icon={FiEdit2} onClick={() => onEdit(a.id)}>Edit</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={FiTrash2}
                          onClick={() => setConfirmDeleteId(a.id)}
                          className="!text-ink-400 hover:!bg-unproductive/10 hover:!text-unproductive"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(confirming)}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete assessment?"
        icon={FiAlertTriangle}
        tone="danger"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button
              variant="danger"
              icon={FiTrash2}
              onClick={() => {
                if (confirming) onDelete(confirming.id);
                setConfirmDeleteId(null);
              }}
            >
              Yes, Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-300">Are you sure you want to delete this assessment?</p>
      </Modal>
    </motion.div>
  );
}

// â”€â”€ Shared little pieces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ChoiceButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-4 py-2.5 text-sm font-medium transition',
        active
          ? 'border-transparent bg-brand-gradient text-white shadow-glow'
          : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
      )}
    >
      {label}
    </button>
  );
}

function NavBar({ showPrev, onPrev, onNext, onEnd }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2">
        {showPrev && <Button variant="danger" size="sm" icon={FiArrowLeft} onClick={onPrev} className="-ml-2">Previous</Button>}
      </div>
      <div className="flex gap-2">
        {onEnd && <Button variant="outline" icon={FiCheckCircle} onClick={onEnd}>END</Button>}
        {onNext && <Button icon={FiArrowRight} onClick={onNext}>NEXT</Button>}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, max }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-700">
        <motion.div
          className="h-full rounded-full bg-brand-gradient"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/*  Consultant view of /time-auditor — a "dashboard" listing the consultant's */
/*  clients. Clicking a client jumps to the Participants page with that       */
/*  client preselected, where the consultant can open that client's full      */
/*  dashboard (tasks / forms / reports / analytics).                          */
/* -------------------------------------------------------------------------- */
function ConsultantClientsView() {
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);

  useEffect(() => {
    import('@/services/consultantService').then((mod) => {
      mod.getMyClients().then((d) => setClients(d.clients || []));
    });
  }, []);

  return (
    <div className="min-h-screen bg-ink-950">
      <TopBar onHome={() => navigate('/participants')} stage="home" onOpenMobileSidebar={null} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="space-y-6">
          <BackButton to="/participants" />
          <div>
            <h1 className="font-display text-2xl font-bold text-fg-strong">Time Auditor — Consultant View</h1>
            <p className="mt-1 text-sm text-ink-400">
              Pick a client below to open their dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Your clients</p>
            {clients === null ? (
              <p className="py-6 text-center text-sm text-ink-400">Loading clients…</p>
            ) : clients.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">No clients assigned to you yet.</p>
            ) : (
              <ul className="space-y-2">
                {clients.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => navigate(`/dashboard?client=${encodeURIComponent(c.id)}`)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3 text-left transition-colors hover:border-brand-500/40 hover:bg-ink-800"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-sm font-semibold text-white">
                        {(c.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                        <p className="truncate text-xs text-ink-500">
                          {c.clientId || '—'} · {c.tasks?.done ?? 0}/{c.tasks?.total ?? 0} tasks · {c.progress ?? 0}%
                        </p>
                      </div>
                      <FiArrowRight className="h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-brand-400" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Admin view of /time-auditor — same "clients list" shape as the consultant */
/*  view, but sourced from the admin API so it shows every client in the org. */
/*  Clicking a client jumps to that client's dashboard (/dashboard?client=…). */
/* -------------------------------------------------------------------------- */
const ADMIN_TAB_BUTTONS = [
  { id: 'approvals', label: 'Approvals' },
  { id: 'consultants', label: 'Consultants' },
  { id: 'clients', label: 'Clients' },
];

function AdminClientsView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('approvals');
  const [clients, setClients] = useState(null);
  const [consultants, setConsultants] = useState(null);

  useEffect(() => {
    import('@/services/adminService').then((mod) => {
      mod.getClients({ status: 'All' }).then((d) => setClients(d.clients || []));
      mod.getConsultants().then((d) => setConsultants(d.consultants || []));
    });
  }, []);

  const pending = (clients || []).filter((c) => c.status === 'Pending');

  return (
    <div className="min-h-screen bg-ink-950">
      <TopBar onHome={() => navigate('/admin')} stage="home" onOpenMobileSidebar={null} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="space-y-6">
          <BackButton to="/admin" />
          <div>
            <h1 className="font-display text-2xl font-bold text-fg-strong">Time Auditor — Admin View</h1>
            <p className="mt-1 text-sm text-ink-400">Approvals, consultants, and clients — all in one place.</p>
          </div>

          {/* Three big buttons — same layout as the Admin Panel */}
          <div className="inline-flex flex-wrap gap-2 rounded-xl bg-ink-800 p-1">
            {ADMIN_TAB_BUTTONS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-brand-gradient text-white shadow' : 'text-ink-400 hover:text-fg'
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* 1. Approvals */}
          {tab === 'approvals' && (
            <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Pending approvals</p>
              {clients === null ? (
                <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
              ) : pending.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">No pending approvals.</p>
              ) : (
                <ul className="space-y-2">
                  {pending.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-sm font-semibold text-white">
                        {(c.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                        <p className="truncate text-xs text-ink-500">{c.clientId || '—'} · {c.email}</p>
                      </div>
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">Pending</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-ink-500">
                Tip: full approve / reject controls live in the Admin Panel.
              </p>
            </div>
          )}

          {/* 2. Consultants */}
          {tab === 'consultants' && (
            <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">All consultants</p>
              {consultants === null ? (
                <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
              ) : consultants.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">No consultants in the system yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {consultants.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/40 p-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-sm font-semibold text-white">
                        {(c.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">{c.name}</p>
                        <p className="truncate text-xs text-ink-500">{c.email || c.title || '—'}</p>
                        <p className="mt-1 text-xs text-ink-400">{c.assignedCount} client{c.assignedCount === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Clients — clickable, redirects to that client's dashboard */}
          {tab === 'clients' && (
            <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">All clients</p>
              {clients === null ? (
                <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
              ) : clients.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">No clients in the system yet.</p>
              ) : (
                <ul className="space-y-2">
                  {clients.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => navigate(`/dashboard?client=${encodeURIComponent(c.id)}`)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3 text-left transition-colors hover:border-brand-500/40 hover:bg-ink-800"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-sm font-semibold text-white">
                          {(c.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                          <p className="truncate text-xs text-ink-500">{c.clientId || '—'} · {c.email} · {c.status}</p>
                        </div>
                        <FiArrowRight className="h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-brand-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
