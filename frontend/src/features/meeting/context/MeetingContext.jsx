import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { makeId } from '../utils/id';
import { isConfigured } from '@/lib/supabase';
import { listMeetings, persistMeeting, deleteMeetingRow } from '@/services/meetingService';

const MeetingContext = createContext(null);

// Meeting ids double as the database row uuid when Supabase is connected
// (generated client-side so addMeeting can stay synchronous for navigation).
const newMeetingId = () =>
  isConfigured && typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : makeId('meeting');

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
};

const STORAGE_KEY = 'msm_meetings';

// Initial state for the Plan a Meeting form (18 questions, q1 = Meeting Name).
const initialFormState = {
  q1: '',        // Meeting Name (required)
  q2: '',        // Identify a meeting you want or need to have
  q3: '00/30',   // How much time will this meeting take? (default 00/30 = 30 mins)
  q4: '',
  q5: '',
  q6: '',
  q7: 'Yes',     // special radio: Yes, No, Other
  q7_other: '',
  q8: '',
  q9: '',
  q10: '',
  q11: '',
  q12: '',
  q13: '',
  q14: '',
  q15: '',
  q16: '',
  q17: '00/30',  // Now, how much time will this meeting take? (default 00/30 = 30 mins)
  q18: ''
};

// ----- Duplicate naming -----------------------------------------------------
// Strip a trailing "(Copy)" / "(Copy-N)" suffix to recover the base meeting name,
// so duplicating a copy never produces "Name (Copy) (Copy)".
const COPY_SUFFIX_RE = /^(.*?)\s*\(Copy(?:-(\d+))?\)\s*$/i;
const baseMeetingName = (name) => {
  const trimmed = (name || '').trim();
  const m = trimmed.match(COPY_SUFFIX_RE);
  return m ? m[1].trim() : trimmed;
};

// Next unique copy name for `base`, given every existing meeting name.
// "(Copy)" counts as copy #1 and "(Copy-N)" as #N; the smallest unused number is
// chosen so a duplicate title can never collide (gaps are filled too).
const nextCopyName = (base, existingNames) => {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}\\s*\\(Copy(?:-(\\d+))?\\)\\s*$`, 'i');
  const used = new Set();
  existingNames.forEach((name) => {
    const m = (name || '').trim().match(re);
    if (m) used.add(m[1] ? parseInt(m[1], 10) : 1);
  });
  let n = 1;
  while (used.has(n)) n += 1;
  return n === 1 ? `${base} (Copy)` : `${base} (Copy-${n})`;
};

// Normalise one collection: guarantee unique meeting ids + note ids (across a
// shared `seen` set so NO id is ever duplicated, even between the two
// collections), strip the legacy `archived` flag (the collection now defines
// active vs archived), and ensure `notes` is always an array.
const normalizeList = (list, seen) => {
  if (!Array.isArray(list)) return [];
  return list.map((m) => {
    const meeting = m || {};
    let id = meeting.id;
    if (!id || seen.has(id)) id = makeId('meeting');
    seen.add(id);

    const seenNotes = new Set();
    const notes = Array.isArray(meeting.notes)
      ? meeting.notes.map((n) => {
          const note = n || {};
          let nid = note.id;
          if (!nid || seenNotes.has(nid)) nid = makeId('note');
          seenNotes.add(nid);
          return { ...note, id: nid };
        })
      : [];

    // Drop the legacy `archived` flag — the collection is the source of truth.
    const { archived: _legacyArchived, ...rest } = meeting;
    return { ...rest, id, notes };
  });
};

// Load + migrate persisted state. Supports BOTH the new shape
// `{ meetings, archivedMeetings }` and the legacy single-array shape
// (`[{...archived:true}]`), which is split by the old `archived` flag.
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { meetings: [], archivedMeetings: [] };
    const parsed = JSON.parse(raw);

    let active;
    let archived;
    if (Array.isArray(parsed)) {
      // Legacy format → split by the old archived flag.
      active = parsed.filter((m) => !m.archived);
      archived = parsed.filter((m) => m.archived);
    } else {
      active = parsed.meetings;
      archived = parsed.archivedMeetings;
    }

    // Normalise with a SHARED seen-set so ids are globally unique.
    const seen = new Set();
    return {
      meetings: normalizeList(active, seen),
      archivedMeetings: normalizeList(archived, seen),
    };
  } catch {
    return { meetings: [], archivedMeetings: [] };
  }
};

export const MeetingProvider = ({ children }) => {
  const [formData, setFormData] = useState(initialFormState);

  // Two completely independent collections. In demo mode they come from
  // localStorage (parsed exactly once); with Supabase connected they hydrate
  // from the `meetings` table below.
  const initialRef = useRef(null);
  if (initialRef.current === null) {
    initialRef.current = isConfigured ? { meetings: [], archivedMeetings: [] } : loadState();
  }

  const [meetings, setMeetings] = useState(initialRef.current.meetings);
  const [archivedMeetings, setArchivedMeetings] = useState(initialRef.current.archivedMeetings);

  // Hydrate from the database (one row per meeting; `archived` lives in the
  // jsonb). Each user only ever receives their own rows (RLS).
  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    listMeetings()
      .then((all) => {
        if (!active || !all) return;
        const seen = new Set();
        setMeetings(normalizeList(all.filter((m) => !m.archived), seen));
        setArchivedMeetings(normalizeList(all.filter((m) => m.archived), seen));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Demo mode only: persist both collections together to localStorage. With
  // Supabase connected we DON'T mirror locally — two users sharing one device
  // must never see each other's meetings.
  useEffect(() => {
    if (isConfigured) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ meetings, archivedMeetings })
      );
    } catch {
      // ignore write errors (e.g. storage disabled / full)
    }
  }, [meetings, archivedMeetings]);

  // ----- Prep form -----
  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetPlanning = () => setFormData(initialFormState);

  // Update a meeting in whichever collection holds it. The collection that does
  // NOT contain the id returns its previous reference unchanged (`prev`), so it
  // is never re-rendered or re-persisted — guaranteeing independence. The
  // updated record is also pushed to the database (fire-and-forget).
  const updateById = (id, updater) => {
    setMeetings((prev) =>
      prev.some((m) => m.id === id) ? prev.map((m) => (m.id === id ? updater(m) : m)) : prev
    );
    setArchivedMeetings((prev) =>
      prev.some((m) => m.id === id) ? prev.map((m) => (m.id === id ? updater(m) : m)) : prev
    );
    // Persist: compute the same updated record from the current snapshot.
    const inArchived = archivedMeetings.some((m) => m.id === id);
    const source = inArchived
      ? archivedMeetings.find((m) => m.id === id)
      : meetings.find((m) => m.id === id);
    if (source) persistMeeting(updater(source), inArchived).catch(() => {});
  };

  // ----- Create -----
  // `experience` (optional) = { awareness, confidence, success, realisation }.
  const addMeeting = (answers, experience = null) => {
    const id = newMeetingId();
    const record = {
      id,
      answers: { ...answers },
      title: (answers.q1 || '').trim() || 'Untitled Meeting', // q1 = Meeting Name
      estTime: answers.q3 || '',
      createdDate: new Date().toISOString(),
      status: 'Upcoming',
      experience: experience ? { ...experience } : null,
      notes: [],
    };
    setMeetings((prev) => [record, ...prev]); // new meetings are always active
    persistMeeting(record, false).catch(() => {});
    return id;
  };

  // Look in both collections.
  const getMeeting = (id) =>
    meetings.find((m) => m.id === id) || archivedMeetings.find((m) => m.id === id) || null;

  const updateMeetingStatus = (id, status) => updateById(id, (m) => ({ ...m, status }));

  // Shallow-merge arbitrary fields into a meeting (e.g. gcalEventId /
  // scheduledFor after scheduling on Google Calendar). Persists like any update.
  const patchMeeting = (id, patch) => updateById(id, (m) => ({ ...m, ...patch }));

  // Mark a meeting Completed together with its post-meeting reflection.
  // `reflection` = { planningHelpfulness, learnings }.
  const completeMeetingWithReflection = (id, reflection) =>
    updateById(id, (m) => ({
      ...m,
      status: 'Completed',
      reflection: { ...reflection },
    }));

  // ----- Archive / Restore (move between collections) -----

  // Active → Archived. Removes from `meetings`, adds to `archivedMeetings`.
  // `meetings` (closure) supplies the moved object; both setters use functional
  // updates, so this is StrictMode-safe (no setState inside an updater).
  const archiveMeeting = (id) => {
    const found = meetings.find((m) => m.id === id);
    if (!found) return;
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setArchivedMeetings((prev) => (prev.some((m) => m.id === id) ? prev : [found, ...prev]));
    persistMeeting(found, true).catch(() => {});
  };

  // Archived → Active. Removes from `archivedMeetings`, adds to `meetings`.
  const unarchiveMeeting = (id) => {
    const found = archivedMeetings.find((m) => m.id === id);
    if (!found) return;
    setArchivedMeetings((prev) => prev.filter((m) => m.id !== id));
    setMeetings((prev) => (prev.some((m) => m.id === id) ? prev : [found, ...prev]));
    persistMeeting(found, false).catch(() => {});
  };

  // ----- Duplicate -----
  // A copy is always ACTIVE. Source may be in either collection.
  // The copy name is auto-incremented: "Name (Copy)", "Name (Copy-2)", … The
  // next free number is computed against EVERY existing name (active + archived)
  // so titles never collide. Both `title` and `answers.q1` are set, so the new
  // name shows up everywhere (List, Dashboard, dropdown, exports, Edit, Archive).
  const duplicateMeeting = (id) => {
    const original =
      meetings.find((m) => m.id === id) || archivedMeetings.find((m) => m.id === id);
    if (!original) return null;

    const base = baseMeetingName(original.answers?.q1 || original.title || 'Untitled Meeting');
    // Impure bits generated once, outside the updater (keeps the updater pure).
    const newId = newMeetingId();
    const createdDate = new Date().toISOString();
    const notes = (original.notes || []).map((n) => ({ ...n, id: makeId('note') }));

    // Compute the copy ONCE from the current snapshot (keeps the updater pure —
    // StrictMode double-invokes updaters, which would double-persist otherwise).
    const existingNames = [...meetings, ...archivedMeetings].map(
      (m) => m.title || m.answers?.q1 || ''
    );
    const copiedName = nextCopyName(base, existingNames);
    const copy = {
      ...original,
      id: newId,
      isDuplicate: true,
      title: copiedName,
      createdDate,
      answers: { ...original.answers, q1: copiedName },
      notes,
    };
    setMeetings((prev) => (prev.some((m) => m.id === newId) ? prev : [copy, ...prev]));
    persistMeeting(copy, false).catch(() => {}); // copies are always active
    return newId;
  };

  // ----- Delete -----
  // Removes from whichever collection holds the id. The other collection's
  // setter receives `prev` unchanged, so it is NEVER affected.
  const deleteMeeting = (id) => {
    setMeetings((prev) => (prev.some((m) => m.id === id) ? prev.filter((m) => m.id !== id) : prev));
    setArchivedMeetings((prev) =>
      prev.some((m) => m.id === id) ? prev.filter((m) => m.id !== id) : prev
    );
    deleteMeetingRow(id).catch(() => {});
  };

  // ----- Editing (duplicates only) -----
  const startEditMeeting = (meeting) => {
    setFormData({ ...initialFormState, ...meeting.answers });
  };

  const updateMeeting = (id, answers, notes) =>
    updateById(id, (m) => ({
      ...m,
      answers: { ...answers },
      title: (answers.q1 || '').trim() || 'Untitled Meeting',
      estTime: answers.q3 || '',
      ...(notes ? { notes } : {}),
    }));

  // ----- Notes CRUD (scoped to a meeting in either collection) -----
  const addNote = (meetingId, text) => {
    const note = { id: makeId('note'), text, createdDate: new Date().toISOString() };
    updateById(meetingId, (m) => ({ ...m, notes: [...m.notes, note] }));
  };

  const updateNote = (meetingId, noteId, text) =>
    updateById(meetingId, (m) => ({
      ...m,
      notes: m.notes.map((n) => (n.id === noteId ? { ...n, text } : n)),
    }));

  const deleteNote = (meetingId, noteId) =>
    updateById(meetingId, (m) => ({
      ...m,
      notes: m.notes.filter((n) => n.id !== noteId),
    }));

  return (
    <MeetingContext.Provider
      value={{
        formData,
        updateFormField,
        resetPlanning,
        meetings,
        archivedMeetings,
        addMeeting,
        getMeeting,
        updateMeetingStatus,
        patchMeeting,
        completeMeetingWithReflection,
        archiveMeeting,
        unarchiveMeeting,
        duplicateMeeting,
        deleteMeeting,
        startEditMeeting,
        updateMeeting,
        addNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
};
