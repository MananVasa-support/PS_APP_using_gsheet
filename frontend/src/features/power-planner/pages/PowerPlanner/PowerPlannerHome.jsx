import { useEffect, useMemo, useRef, useState } from "react";
import { setNavGuard } from "@/lib/navGuard";
import { syncWeekReviewToReasons } from "@/utils/ppToReasons";
import { FiCalendar, FiEdit2 } from "react-icons/fi";
import {
  CalendarExportModal,
  HistoryWorkspace,
  OtherThingsTable,
  PlannerHeader,
  PlannerLayout,
  PlannerSidebar,
  PlannerStart,
  PlannerTabs,
  ReviewWorkspace,
  ToStopWorkspace,
  UnifiedPlannerTable,
  WeekNavigator,
} from "../../components/PowerPlanner";
import { buildCalendarEvent, toGoogleCalendarUrl } from "../../utils/googleCalendar";
import {
  isGoogleConfigured,
  requestCalendarToken,
  pushEventsToCalendar,
  loadEventIdMap,
  hydrateEventIdMap,
} from "../../utils/googleCalendarApi";
import usePowerPlanner from "../../hooks/usePowerPlanner";
import { computeScheduleConflicts } from "../../utils/powerPlannerUtils";
import {
  addDaysISO,
  daysBetweenISO,
  formatMonthLabel,
  formatWeekRange,
  formatWeekRangeDays,
  todayISO,
  weeksBetweenISO,
} from "../../utils/weekDates";
import { recommendedEndFor } from "../../utils/weekSchedule";
import { describeRecurrence, isRecurring } from "../../utils/recurrence";

const PLANNER_TABS = ["topGoals", "otherThings", "toStop"];
// How far ahead the user may plan (keeps the Next arrow from running forever).
const FORWARD_WEEKS_CAP = 52;

const PowerPlannerHome = () => {
  const {
    summary,
    focusTab,
    setFocusTab,

    startDate,
    setStartDate,
    hasStartDate,
    currentWeekStart,
    selectedWeek,
    setSelectedWeek,
    selectedWeekEnd,
    weekEndOf,
    nextWeekStartOf,
    prevWeekStartOf,
    isWeekLocked,
    savedWeekKeys,
    deleteSeriesMaster,
    deleteRecurringCopy,

    commitments,
    commitmentIds,
    actions,
    addCommitment,
    updateCommitment,
    deleteCommitment,
    moveCommitment,
    toggleCommitmentCollapse,
    addAction,
    updateAction,
    deleteAction,
    moveAction,
    toggleActionCollapse,
    getActionsByParent,

    otherCommitments,
    otherCommitmentIds,
    addOtherCommitment,
    updateOtherCommitment,
    deleteOtherCommitment,
    moveOtherCommitment,

    savedCommitments,
    savedActions,
    savedOtherCommitments,
    savedStopDoingNow,

    stopDoingNow,
    addStopDoingRow,
    updateStopDoingRow,
    removeStopDoingRow,

    watchoutReasons,
    addWatchoutReason,
    updateWatchoutReason,
    removeWatchoutReason,

    lastWeekInsights,
    setLastWeekInsights,

    savePlannerData,
    pendingRepeatEdits,
    saveRepeatScope,
    editingSection,
    isDirty,
    beginEdit,
    cancelEdit,
    carryForwardOptions,
    carrySelectedSubIds,
    setCarrySelectedSubIds,
    carrySelectedOtherIds,
    setCarrySelectedOtherIds,
    carryForwardTag,
    setCarryForwardTag,
    carryForwardChoice,
    setCarryForwardChoice,
    getSavedWeekDataByKey,
    getWeekDataByKey,
    categoryOptions,
    purposeOptions,
    assigneeOptions,
    customOptions,
    removeCustomOption,
  } = usePowerPlanner();

  const conflictIds = useMemo(
    () => computeScheduleConflicts([...actions, ...otherCommitments]),
    [actions, otherCommitments]
  );

  // Required-field check mirroring the table validation, so saving via the
  // "Save changes" dialog (or any guarded navigation) can't bypass it the way
  // it used to. Repeat copies and blank placeholder goals are exempt.
  const delegateMissing = (row) => {
    const a = (row.assignedTo || "").trim();
    if (!a) return true;
    return a === "Other" && !row.customDoneBy?.trim();
  };
  const planHasMissing = useMemo(() => {
    for (const c of commitments) {
      if (c.isRepeat || c.isPlaceholder) continue;
      if (!c.result?.trim() || !c.targetDate) return true;
      for (const sub of getActionsByParent(c.id)) {
        if (sub.isRepeat) continue;
        if (
          !sub.description?.trim() ||
          !sub.executionDate ||
          !sub.duration ||
          !sub.startTime ||
          delegateMissing(sub)
        )
          return true;
      }
    }
    for (const it of otherCommitments) {
      if (it.isRepeat) continue;
      if (
        !it.result?.trim() ||
        !it.targetDate ||
        !it.duration ||
        !it.startTime ||
        delegateMissing(it)
      )
        return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitments, actions, otherCommitments, getActionsByParent]);

  // Landing screen shown first; the four options lead into the planner.
  const [showLanding, setShowLanding] = useState(true);
  // Re-open the start-date picker to re-anchor the weeks later on.
  const [editingStart, setEditingStart] = useState(false);
  // A queued navigation, held back while there are unsaved edits (#1).
  const [pendingNav, setPendingNav] = useState(null);
  // Error shown in the unsaved-changes dialog when Save is blocked by missing
  // required fields.
  const [navSaveError, setNavSaveError] = useState("");
  // Generic confirm dialog (used for deleting a goal with sub-tasks, #4).
  const [confirm, setConfirm] = useState(null);

  // Run a navigation now, or — if there are unsaved edits — hold it and ask the
  // user to Save / Discard first.
  const guardedNav = (fn) => {
    if (isDirty) setPendingNav(() => fn);
    else fn();
  };

  // Register the SAME ask with the global guard, so leaving the tool entirely
  // (PS logo, Back button, navbar Settings, logout) also goes through the
  // Save / Discard dialog — not just in-tool tab/week switches. The ref keeps
  // the registered callback reading the CURRENT isDirty on every trigger.
  const shellGuardRef = useRef(guardedNav);
  shellGuardRef.current = guardedNav;
  useEffect(() => setNavGuard((proceed) => shellGuardRef.current(proceed)), []);

  // Cancelling an edit discards unsaved changes — so ask first when there are
  // any. With nothing changed, just exit edit mode silently.
  const requestCancelEdit = () => {
    if (isDirty) {
      setConfirm({
        title: "Discard changes?",
        message:
          "Your unsaved changes on this section will be discarded. Do you want to continue?",
        confirmLabel: "Yes, discard",
        onConfirm: cancelEdit,
      });
    } else {
      cancelEdit();
    }
  };

  const handleStartSelect = (id) => {
    if (id === "start") {
      setFocusTab("topGoals");
      setShowLanding(false);
    } else if (id === "review") {
      setFocusTab("review");
      setShowLanding(false);
    } else if (id === "history") {
      setFocusTab("history");
      setShowLanding(false);
    }
    // "totality" — placeholder for now, stays on the landing screen.
  };

  // Export this week's tasks to Google Calendar. Clicking the button opens each
  // SELF action as its own pre-filled create-event tab right away (you add colour
  // + Save in each tab; you never return here). We export MASTER rows only (skip
  // the generated weekly repeat copies) so a recurring task becomes ONE recurring
  // event via its RRULE. Delegated (Other) work is skipped — it isn't yours to do.
  // A small helper modal only appears if the browser blocked the pop-ups, or if
  // there's nothing dated to export.
  const [calendarHelp, setCalendarHelp] = useState(null); // { events, mode }
  const isSelfRow = (r) => {
    const a = String(r.assignedTo || "").trim().toLowerCase();
    return a === "" || a === "self";
  };
  // Open each event in its own tab. NOTE: no "noopener" — that makes window.open
  // return null even on success, which would break the blocked-tab detection
  // below. Browsers allow only the FIRST pop-up per click until the user allows
  // pop-ups for the site; the rest come back as null and we offer them again.
  const openCalendarTabs = (events) => {
    const blocked = [];
    events.forEach((ev) => {
      const win = window.open(toGoogleCalendarUrl(ev), "_blank");
      if (!win) blocked.push(ev);
    });
    return blocked;
  };
  const buildSelfEvents = () => {
    const rows =
      focusTab === "otherThings"
        ? otherCommitments.filter((o) => !o.isRepeat)
        : actions.filter((a) => !a.isRepeat);
    return rows
      .filter(isSelfRow)
      .map((r) =>
        buildCalendarEvent(
          r,
          r.parentCommitmentId !== undefined
            ? commitments.find((c) => c.id === r.parentCommitmentId)
            : null
        )
      )
      .filter((ev) => ev.date); // needs at least a date to be schedulable
  };
  // The FULL set of planner row ids that should currently own a calendar event,
  // gathered across EVERY week and both lists (sub-actions + Other Things): a row
  // that is Self, dated, and not an auto-generated repeat copy. Passed to the API
  // push so any previously-exported event NOT in this set (delegated away from
  // Self, un-dated, deleted, or now a repeat) is removed — while every other
  // week's still-valid events stay put. Reads live (draft) week data so unsaved
  // changes like Self → Other are honoured immediately.
  const exportableRowIds = () => {
    const hasDate = (r) => !!String(r.executionDate || r.targetDate || "").trim();
    const ids = new Set();
    const keys = new Set([...(savedWeekKeys || []), selectedWeek]);
    keys.forEach((k) => {
      const w = getWeekDataByKey(k) || {};
      (w.actions || []).forEach((a) => {
        if (!a.isRepeat && isSelfRow(a) && hasDate(a)) ids.add(a.id);
      });
      (w.otherCommitments || []).forEach((o) => {
        if (!o.isRepeat && isSelfRow(o) && hasDate(o)) ids.add(o.id);
      });
    });
    return ids;
  };
  const handleExportToCalendar = async () => {
    // Backstop (the button is also disabled): never export while the plan has
    // missing required fields or a same-person/same-time conflict.
    if (planHasMissing || (conflictIds && conflictIds.size > 0)) return;
    const events = buildSelfEvents();
    const configured = isGoogleConfigured();
    // Stale events to prune (only meaningful on the API path, which can delete).
    // Pull the latest event map from the user's account first (cross-device).
    if (configured) await hydrateEventIdMap();
    const keepRowIds = configured ? exportableRowIds() : null;
    const staleCount = configured
      ? Object.keys(loadEventIdMap()).filter((id) => !keepRowIds.has(id)).length
      : 0;
    // Nothing to add AND nothing to clean up → genuinely empty.
    if (events.length === 0 && staleCount === 0) {
      setCalendarHelp({ events: [], mode: "empty", context: focusTab });
      return;
    }
    // When a Google OAuth Client ID is configured, push events DIRECTLY into the
    // user's calendar (sign-in popup → create/update events with colour, and
    // remove ones that no longer belong). Otherwise fall back to opening
    // pre-filled create-event tabs (which can't delete — link-only).
    if (configured) {
      setCalendarHelp({ mode: "pushing", total: events.length });
      try {
        const token = await requestCalendarToken();
        const { created, updated, removed, failed } = await pushEventsToCalendar(
          events,
          token,
          undefined,
          { keepRowIds: [...keepRowIds] }
        );
        setCalendarHelp({
          mode: "pushed",
          created,
          updated,
          removed,
          failed,
          total: events.length,
        });
      } catch (e) {
        setCalendarHelp({
          mode: "error",
          message: e?.message || "Couldn't connect to Google Calendar.",
        });
      }
      return;
    }
    const blocked = openCalendarTabs(events);
    if (blocked.length > 0) {
      setCalendarHelp({ events: blocked, mode: "blocked" });
    }
    // else: every tab opened directly — no modal needed.
  };

  const isPlannerTab = PLANNER_TABS.includes(focusTab);
  const isReview = focusTab === "review";
  const isHistory = focusTab === "history";

  // Keep the selected week valid for the active mode: Plan never shows past
  // weeks (those live in Review); Review never shows future weeks. Runs only
  // when the mode or "today" changes — not on every manual week step.
  useEffect(() => {
    if (!hasStartDate) return;
    if (isReview && selectedWeek > currentWeekStart) {
      setSelectedWeek(currentWeekStart);
    } else if (isPlannerTab && selectedWeek < currentWeekStart) {
      setSelectedWeek(currentWeekStart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTab, hasStartDate, currentWeekStart]);

  // Navigation rules.
  const canGoPrev = isReview
    ? selectedWeek > startDate // can't review before the plan started
    : selectedWeek > currentWeekStart; // Plan: no stepping into the past
  const canGoNext = isReview
    ? selectedWeek < currentWeekStart // can't review the future
    : weeksBetweenISO(currentWeekStart, selectedWeek) < FORWARD_WEEKS_CAP;

  const goPrevWeek = () => {
    const prev = prevWeekStartOf(selectedWeek);
    if (canGoPrev && prev) guardedNav(() => setSelectedWeek(prev));
  };
  const goNextWeek = () => {
    if (canGoNext) guardedNav(() => setSelectedWeek(nextWeekStartOf(selectedWeek)));
  };

  const isCurrentWeek = selectedWeek === currentWeekStart;
  const isFutureWeek = selectedWeek > currentWeekStart;
  const isPastWeek = isWeekLocked(selectedWeek);

  // A section is editable when the user clicked Edit, OR nothing is saved yet.
  const isEditingTopGoals =
    editingSection === "topGoals" || savedCommitments.length === 0;
  const isEditingOtherThings =
    editingSection === "otherThings" || savedOtherCommitments.length === 0;
  const isEditingToStop =
    editingSection === "toStop" || savedStopDoingNow.length === 0;

  const toggleCarrySub = (subId) => {
    setCarrySelectedSubIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };
  const toggleCarryOther = (itemId) => {
    setCarrySelectedOtherIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // When the user renamed a repeated copy, ask whether the change applies to
  // just that occurrence or the whole series before saving.
  const [repeatScope, setRepeatScope] = useState(null);
  const handleSavePlanner = () => {
    // Don't allow a save (from the table OR the unsaved-changes dialog) while
    // required fields are still empty.
    if (planHasMissing) return { invalid: true };
    // Editing a recurring master now MIRRORS to every future-week copy on save
    // (schedule, name, details), so there's no "this one vs all" question.
    return savePlannerData({ includeCarryForward: false });
  };
  const handleSaveReview = () => {
    const res = savePlannerData({ includeCarryForward: true });
    // Mirror this week's TFCR reasons into the Reasons Eliminator (one session
    // per week, marked "From Power Planner") so the user assigns Power Words
    // there. Power Words already assigned survive re-saves.
    syncWeekReviewToReasons(selectedWeek, {
      commitments,
      actions,
      otherCommitments,
    });
    return res;
  };

  // Series-aware deletes. A generated repeat is removed on its own (and won't
  // come back); deleting a recurring original asks whether to drop its repeats.
  const [pendingDelete, setPendingDelete] = useState(null);

  const handleDeleteCommitment = (id) => {
    const c = commitments.find((x) => x.id === id);
    if (c?.isRepeat) return deleteRecurringCopy(id);
    if (c && isRecurring(c.frequency)) {
      return setPendingDelete({
        id,
        label: c.result?.trim() || "this goal",
        recurrence: describeRecurrence(c.frequency, c.recurEnd),
      });
    }
    const subCount = getActionsByParent(id).length;
    if (subCount > 0) {
      return setConfirm({
        title: "Delete this goal?",
        message: `This goal has ${subCount} action${
          subCount > 1 ? "s" : ""
        }. Deleting it removes ${
          subCount > 1 ? "them" : "it"
        } too. This can't be undone.`,
        confirmLabel: "Delete",
        onConfirm: () => deleteCommitment(id),
      });
    }
    deleteCommitment(id);
  };

  // A repeated sub-action copy deletes as a one-week skip; a normal sub-action
  // is removed outright.
  const handleDeleteAction = (id) => {
    const a = actions.find((x) => x.id === id);
    if (a?.isRepeat) return deleteRecurringCopy(id);
    deleteAction(id);
  };

  const handleDeleteItem = (id) => {
    const o = otherCommitments.find((x) => x.id === id);
    if (o?.isRepeat) return deleteRecurringCopy(id);
    if (o && isRecurring(o.frequency)) {
      return setPendingDelete({
        id,
        label: o.result?.trim() || "this item",
        recurrence: describeRecurrence(o.frequency, o.recurEnd),
      });
    }
    deleteOtherCommitment(id);
  };

  if (showLanding) {
    return (
      <PlannerLayout>
        <PlannerStart heading={summary.heading} onSelect={handleStartSelect} />
      </PlannerLayout>
    );
  }

  // The setup interface — opened on first run, and reused (via the pen next to
  // "Change Start Date") to re-anchor Week 1's start + end later.
  if (!hasStartDate || editingStart) {
    return (
      <PlannerLayout>
        <PlannerHeader
          heading={summary.heading}
          description="Professional Execution and Accountability System for Weekly Outcomes and Scheduled Actions."
          periodLabel={summary.periodLabel}
          showNav={false}
          onHeadingClick={() => setShowLanding(true)}
        />
        <StartDateGate
          initialValue={hasStartDate ? startDate : undefined}
          canCancel={hasStartDate}
          onCancel={() => setEditingStart(false)}
          onConfirm={(start, end) => {
            setStartDate(start, end);
            setEditingStart(false);
          }}
        />
      </PlannerLayout>
    );
  }

  const monthLabel = formatMonthLabel(selectedWeek, selectedWeekEnd);
  const rangeLabel = formatWeekRange(selectedWeek, selectedWeekEnd);
  const rangeLabelDays = formatWeekRangeDays(selectedWeek, selectedWeekEnd);

  return (
    <div className="flex min-h-full">
      {/* Left nav column — Plan / Review / History / Totality, relocated here
          from the old top row in PlannerHeader (showNav=false below). Same
          handlers, same tab logic; this is purely the layout moving to a side
          column to match the other tools. Remove this wrapper + PlannerSidebar
          and set showNav back to default to restore the original top row. */}
      <PlannerSidebar
        onPlan={() => guardedNav(() => setFocusTab("topGoals"))}
        onReview={() => guardedNav(() => setFocusTab("review"))}
        onHistory={() => guardedNav(() => setFocusTab("history"))}
        onTotality={() => {
          // Placeholder: a Totality form/link will be wired up here later.
        }}
        planActive={isPlannerTab}
        reviewActive={isReview}
        historyActive={isHistory}
      />
      <div className="min-w-0 flex-1">
        <PlannerLayout>
          <PlannerHeader
            heading={summary.heading}
            description="Professional Execution and Accountability System for Weekly Outcomes and Scheduled Actions."
            periodLabel={summary.periodLabel}
            showNav={false}
            onHeadingClick={() => guardedNav(() => setShowLanding(true))}
          />

      {!isHistory ? (
        <div className="space-y-1">
          <WeekNavigator
            monthLabel={monthLabel}
            rangeLabel={rangeLabelDays}
            onPrev={goPrevWeek}
            onNext={goNextWeek}
            canPrev={canGoPrev}
            canNext={canGoNext}
            isCurrentWeek={isCurrentWeek}
            onJumpToCurrent={() => guardedNav(() => setSelectedWeek(currentWeekStart))}
            isPast={isReview && isPastWeek}
            isFuture={isFutureWeek}
          />
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[11px] font-semibold text-black">
              Change Start Date
            </span>
            <button
              type="button"
              onClick={() => guardedNav(() => setEditingStart(true))}
              aria-label="Change start date"
              title="Change start date"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-black bg-white text-black transition hover:border-red-600 hover:bg-red-600 hover:text-white"
            >
              <FiEdit2 className="text-xs" />
            </button>
          </div>
        </div>
      ) : null}

      {isPlannerTab ? (
        <PlannerTabs
          activeTab={focusTab}
          onChange={(t) => guardedNav(() => setFocusTab(t))}
        />
      ) : null}

      {focusTab === "topGoals" ? (
        <UnifiedPlannerTable
          title="Top Goals"
          description="Top Goals and Their Actions for the Week. Click Save to Update."
          addCommitmentLabel="Add Goal"
          saveLabel="Save Top Goals"
          commitments={commitments}
          commitmentIds={commitmentIds}
          getActionsByParent={getActionsByParent}
          onAddCommitment={addCommitment}
          onUpdateCommitment={updateCommitment}
          onDeleteCommitment={handleDeleteCommitment}
          onMoveCommitment={moveCommitment}
          onToggleCommitmentCollapse={toggleCommitmentCollapse}
          onAddAction={addAction}
          onUpdateAction={updateAction}
          onDeleteAction={handleDeleteAction}
          onMoveAction={moveAction}
          onToggleActionCollapse={toggleActionCollapse}
          onSave={handleSavePlanner}
          isEditing={isEditingTopGoals}
          onEdit={() => beginEdit("topGoals")}
          onCancel={requestCancelEdit}
          onExportToCalendar={handleExportToCalendar}
          conflictIds={conflictIds}
          weekStart={selectedWeek}
          weekEnd={selectedWeekEnd}
          categoryOptions={categoryOptions}
          purposeOptions={purposeOptions}
          assigneeOptions={assigneeOptions}
          removableCategories={customOptions.category}
          removablePurposes={customOptions.purpose}
          removableDelegates={customOptions.delegate}
          onRemoveOption={removeCustomOption}
        />
      ) : null}

      {focusTab === "otherThings" ? (
        <OtherThingsTable
          items={otherCommitments}
          itemIds={otherCommitmentIds}
          weekStart={selectedWeek}
          weekEnd={selectedWeekEnd}
          onAddItem={addOtherCommitment}
          onUpdateItem={updateOtherCommitment}
          onDeleteItem={handleDeleteItem}
          onMoveItem={moveOtherCommitment}
          onSave={handleSavePlanner}
          isEditing={isEditingOtherThings}
          onEdit={() => beginEdit("otherThings")}
          onCancel={requestCancelEdit}
          onExportToCalendar={handleExportToCalendar}
          conflictIds={conflictIds}
          categoryOptions={categoryOptions}
          purposeOptions={purposeOptions}
          assigneeOptions={assigneeOptions}
          removableCategories={customOptions.category}
          removablePurposes={customOptions.purpose}
          removableDelegates={customOptions.delegate}
          onRemoveOption={removeCustomOption}
        />
      ) : null}

      {focusTab === "toStop" ? (
        <ToStopWorkspace
          stopDoingNow={stopDoingNow}
          onAddRow={addStopDoingRow}
          onUpdateRow={updateStopDoingRow}
          onRemoveRow={removeStopDoingRow}
          onSave={handleSavePlanner}
          isEditing={isEditingToStop}
          onEdit={() => beginEdit("toStop")}
          onCancel={requestCancelEdit}
        />
      ) : null}

      {isReview ? (
        <ReviewWorkspace
          weekLabel={`Week of ${rangeLabel}`}
          savedCommitments={savedCommitments}
          savedActions={savedActions}
          savedOtherCommitments={savedOtherCommitments}
          savedStopDoingNow={savedStopDoingNow}
          draftCommitments={commitments}
          draftActions={actions}
          draftOtherCommitments={otherCommitments}
          draftStopDoingNow={stopDoingNow}
          lastWeekInsights={lastWeekInsights}
          watchoutReasons={watchoutReasons}
          onUpdateInsights={(field, value) =>
            setLastWeekInsights((prev) => ({ ...prev, [field]: value }))
          }
          onAddWatchout={addWatchoutReason}
          onUpdateWatchout={updateWatchoutReason}
          onRemoveWatchout={removeWatchoutReason}
          carryForwardOptions={carryForwardOptions}
          carrySelectedSubIds={carrySelectedSubIds}
          carrySelectedOtherIds={carrySelectedOtherIds}
          carryForwardTag={carryForwardTag}
          carryForwardChoice={carryForwardChoice}
          onUpdateCommitment={updateCommitment}
          onUpdateAction={updateAction}
          onUpdateOtherCommitment={updateOtherCommitment}
          onUpdateStopDoingRow={updateStopDoingRow}
          onToggleCarrySub={toggleCarrySub}
          onToggleCarryOther={toggleCarryOther}
          onUpdateCarryForwardTag={setCarryForwardTag}
          onUpdateCarryForwardChoice={setCarryForwardChoice}
          onSave={handleSaveReview}
        />
      ) : null}

      {isHistory ? (
        <HistoryWorkspace
          weekKeys={savedWeekKeys}
          getWeekDataByKey={getSavedWeekDataByKey}
          formatLabel={(k) => formatWeekRange(k, weekEndOf(k))}
        />
      ) : null}

      {pendingDelete ? (
        <DeleteSeriesModal
          info={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onDeleteAll={() => {
            deleteSeriesMaster(pendingDelete.id, true);
            setPendingDelete(null);
          }}
          onKeepOthers={() => {
            deleteSeriesMaster(pendingDelete.id, false);
            setPendingDelete(null);
          }}
        />
      ) : null}

      {pendingNav ? (
        <UnsavedChangesModal
          error={navSaveError}
          onSave={() => {
            const res = (isReview ? handleSaveReview : handleSavePlanner)();
            if (res?.invalid) {
              // Required fields still empty — keep the user here to fix them.
              setNavSaveError(
                "Can't save — some required fields are still empty. Go back and fill the highlighted boxes (name, date, duration, start time, delegate) first."
              );
              return;
            }
            const go = pendingNav;
            setPendingNav(null);
            setNavSaveError("");
            go();
          }}
          onDiscard={() => {
            cancelEdit();
            const go = pendingNav;
            setPendingNav(null);
            setNavSaveError("");
            go();
          }}
          onCancel={() => {
            setPendingNav(null);
            setNavSaveError("");
          }}
        />
      ) : null}

      {confirm ? (
        <ConfirmModal
          info={confirm}
          onConfirm={() => {
            confirm.onConfirm?.();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      ) : null}

      {calendarHelp ? (
        <CalendarExportModal
          events={calendarHelp.events}
          mode={calendarHelp.mode}
          context={calendarHelp.context}
          total={calendarHelp.total}
          created={calendarHelp.created}
          updated={calendarHelp.updated}
          removed={calendarHelp.removed}
          failed={calendarHelp.failed}
          message={calendarHelp.message}
          onClose={() => setCalendarHelp(null)}
        />
      ) : null}

      {repeatScope ? (
        <RepeatScopeModal
          count={repeatScope.count}
          onThis={() => {
            saveRepeatScope("this");
            setRepeatScope(null);
          }}
          onAll={() => {
            saveRepeatScope("all");
            setRepeatScope(null);
          }}
          onCancel={() => setRepeatScope(null)}
        />
      ) : null}
        </PlannerLayout>
      </div>
    </div>
  );
};

// Asked on Save when the user renamed a repeated task — apply the rename to just
// this occurrence (detach it) or to every task in the series.
const RepeatScopeModal = ({ count, onThis, onAll, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-2xl border border-black bg-white p-6">
      <h3 className="text-lg font-bold text-black">Update a repeating goal</h3>
      <p className="mt-2 text-sm text-black">
        You changed {count > 1 ? `${count} repeating goals` : "a repeating goal"}.
        Apply the change to this one only, or to every task in the series?
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onAll}
          className="w-full rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black hover:border-black"
        >
          All repeated goals
        </button>
        <button
          type="button"
          onClick={onThis}
          className="w-full rounded-xl border border-black bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
        >
          This goal only
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-black/60 hover:text-black"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// Shown when navigating away with unsaved edits.
const UnsavedChangesModal = ({ onSave, onDiscard, onCancel, error }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-2xl border border-black bg-white p-6">
      <h3 className="text-lg font-bold text-black">Save your changes?</h3>
      <p className="mt-2 text-sm text-black">
        You have unsaved edits on this page. Do you want to save them before
        leaving?
      </p>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-600 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onSave}
          className="w-full rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black hover:border-black"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="w-full rounded-xl border border-black bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
        >
          Discard changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-black/60 hover:text-black"
        >
          Stay on this page
        </button>
      </div>
    </div>
  </div>
);

// Generic yes/no confirmation (used for deleting a goal with sub-tasks).
const ConfirmModal = ({ info, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-2xl border border-black bg-white p-6">
      <h3 className="text-lg font-bold text-black">{info.title}</h3>
      {info.message ? (
        <p className="mt-2 text-sm text-black">{info.message}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-black bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
        >
          No, keep it
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black hover:border-black"
        >
          {info.confirmLabel || "Yes, delete"}
        </button>
      </div>
    </div>
  </div>
);

// Asked when deleting a recurring original — keep the generated repeats as
// standalone tasks, or delete them all too.
const DeleteSeriesModal = ({ info, onCancel, onDeleteAll, onKeepOthers }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-2xl border border-black bg-white p-6">
      <h3 className="text-lg font-bold text-black">Delete a repeating task</h3>
      <p className="mt-2 text-sm text-black">
        <span className="font-semibold">{info.label}</span> repeats
        {info.recurrence ? ` (${info.recurrence.toLowerCase()})` : ""}. What should
        happen to the copies in other weeks?
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onDeleteAll}
          className="w-full rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black hover:border-black"
        >
          Delete this and all its repeats
        </button>
        <button
          type="button"
          onClick={onKeepOthers}
          className="w-full rounded-xl border border-black bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
        >
          Delete only this — keep the others as standalone
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-black/60 hover:text-black"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// Set up the plan. Week 1 can be any length (pick its start AND end); every
// week after defaults to a recommended 7-day Mon–Sun block but stays editable.
//   • Monday – Sunday — a clean 7-day week starting the next Monday.
//   • Custom start    — pick any start day and choose Week 1's end date.
// Reused to re-anchor later. Calls onConfirm(startISO, endISO).
const StartDateGate = ({ onConfirm, onCancel, canCancel = false, initialValue }) => {
  const today = todayISO();
  const [mode, setMode] = useState("today"); // "today" | "custom"
  const [customStart, setCustomStart] = useState(initialValue || today);

  // Recommended: start TODAY and run to the upcoming Sunday, so you can plan the
  // current (possibly partial) week right away; weeks then continue Mon–Sun.
  const start = mode === "today" ? today : customStart;
  const recommendedEnd = recommendedEndFor(start);

  // The end follows the recommended Sunday automatically until the user picks a
  // different end on purpose (then we respect their choice).
  const [endTouched, setEndTouched] = useState(false);
  const [endValue, setEndValue] = useState(recommendedEnd);
  useEffect(() => {
    if (!endTouched) setEndValue(recommendedEndFor(start));
  }, [start, endTouched]);
  // "Today" mode always uses the recommended Sunday end; custom uses the choice.
  const end =
    mode === "today"
      ? recommendedEnd
      : endValue && endValue >= start
      ? endValue
      : recommendedEnd;

  const lengthDays = daysBetweenISO(start, end) + 1;
  const week2Start = addDaysISO(end, 1);
  const week2End = recommendedEndFor(week2Start);
  const canConfirm = !!start && !!end && end >= start;

  const ModeButton = ({ id, title, sub, recommended }) => (
    <button
      type="button"
      onClick={() => {
        setMode(id);
        setEndTouched(false);
      }}
      className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
        mode === id
          ? "border-red-600 bg-red-600 text-white"
          : "border-black bg-white text-black hover:bg-zinc-50"
      }`}
    >
      <span className="block text-sm font-bold">{title}</span>
      {sub ? (
        <span
          className={`block text-[11px] ${
            mode === id ? "text-white/80" : "text-black/60"
          }`}
        >
          {sub}
        </span>
      ) : null}
      {recommended ? (
        <span
          className={`mt-1 block text-[11px] font-bold ${
            mode === id ? "text-white" : "text-red-600"
          }`}
        >
          (Recommended)
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 md:py-24">
      <span className="mb-6 inline-flex items-center justify-center rounded-2xl border border-red-600 bg-red-600 p-4 text-white">
        <FiCalendar className="text-3xl" />
      </span>

      <h2 className="text-center text-3xl font-bold tracking-tight text-black md:text-4xl">
        {canCancel ? "Change Your Week Setup" : "When Does Your Plan Start?"}
      </h2>
      <p className="mt-3 max-w-none whitespace-nowrap text-center text-sm font-semibold text-black">
        Week&nbsp;1 can be any length. Every week after is a 7-day Mon–Sun week.
      </p>

      <div className="mt-8 w-full max-w-md rounded-2xl border border-black bg-white p-6 md:p-8">
        <div className="flex gap-3">
          <ModeButton id="today" title="Start Today" recommended />
          <ModeButton id="custom" title="Custom Start" sub="Pick Start & End" />
        </div>

        {mode === "custom" ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-black/60">
                Week 1 start
              </label>
              <input
                type="date"
                value={customStart}
                min={todayISO()}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setEndTouched(false);
                }}
                className="w-full rounded-xl border border-black bg-white px-3 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-black/60">
                Week 1 end
              </label>
              <input
                type="date"
                value={end}
                min={start}
                onChange={(e) => {
                  setEndTouched(true);
                  setEndValue(e.target.value);
                }}
                className="w-full rounded-xl border border-black bg-white px-3 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-2 rounded-xl border border-black bg-zinc-50 p-4">
          <p className="text-sm font-medium text-black">
            Week&nbsp;1:{" "}
            <span className="font-bold text-red-600">
              {formatWeekRangeDays(start, end)}
            </span>{" "}
            ({lengthDays} {lengthDays === 1 ? "day" : "days"})
          </p>
          <p className="text-sm font-medium text-black">
            Week&nbsp;2:{" "}
            <span className="font-bold text-black">
              {formatWeekRangeDays(week2Start, week2End)}
            </span>{" "}
            (7 days)
          </p>
        </div>

        {canCancel ? (
          <p className="mt-3 text-xs text-black/60">
            Changing this re-anchors the week grid and rebuilds repeating tasks.
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          {canCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-black bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(start, end)}
            className="flex-1 rounded-xl border border-red-600 bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-black hover:border-black disabled:opacity-50"
          >
            {canCancel ? "Save Week Setup" : "Start Planning"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PowerPlannerHome;
