import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import { SESSION_STATUS } from '../constants.js';
import reasonEliminatorService from '../services/reasonEliminatorService.js';
import { generateId, reasonsSignature } from '../utils/formatters.js';

const AssessmentFlowContext = createContext(null);

const initialState = {
  sessionId: null,
  createdAt: null,
  status: SESSION_STATUS.DRAFT,
  reasons: [],
  // Records the flow step the user left via "Previous" and a snapshot of the
  // reasons at that moment, so we can resume the exact step if nothing changed.
  flowReturn: null,
};

function newReason(index, seq) {
  return {
    id: generateId(),
    index,
    seq,
    text: '',
    categories: [],
    details: [],
    powerWord: '',
    createdAt: new Date().toISOString(),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return { ...initialState };

    case 'HYDRATE':
      return {
        ...initialState,
        ...action.payload,
      };

    case 'START_SESSION': {
      const now = new Date().toISOString();
      return {
        sessionId: generateId(),
        createdAt: now,
        status: SESSION_STATUS.DRAFT,
        reasons: [],
        flowReturn: null,
      };
    }

    case 'SET_FLOW_RETURN':
      // Capture the signature from current state so it always reflects the
      // exact reasons the user is leaving behind.
      return {
        ...state,
        flowReturn: {
          step: action.step,
          signature: reasonsSignature(state.reasons),
        },
      };

    case 'CLEAR_FLOW_RETURN':
      return { ...state, flowReturn: null };

    case 'ADD_REASON': {
      const text = (action.text || '').trim();
      if (!text) return state;
      const idx = state.reasons.length;
      // Sequential numbering: a new reason continues from the latest number.
      const seq = idx + 1;
      return {
        ...state,
        reasons: [...state.reasons, { ...newReason(idx, seq), text }],
      };
    }

    case 'UPDATE_REASON_TEXT': {
      return {
        ...state,
        reasons: state.reasons.map((r) =>
          r.id === action.id ? { ...r, text: action.text } : r
        ),
      };
    }

    case 'REMOVE_REASON': {
      const filtered = state.reasons.filter((r) => r.id !== action.id);
      // Renumber sequentially after deletion (R1, R2, R3, ...). Each reason
      // keeps its id/text/categories/powerWord, so all connected data moves
      // with it — only the display number (seq) is updated.
      return {
        ...state,
        reasons: filtered.map((r, i) => ({ ...r, index: i, seq: i + 1 })),
      };
    }

    case 'TOGGLE_CATEGORY': {
      return {
        ...state,
        reasons: state.reasons.map((r) => {
          if (r.id !== action.id) return r;
          const current = Array.isArray(r.categories) ? r.categories : [];
          const has = current.includes(action.category);
          return {
            ...r,
            categories: has
              ? current.filter((c) => c !== action.category)
              : [...current, action.category],
          };
        }),
      };
    }

    case 'TOGGLE_DETAIL': {
      // Subcategory selections, stored per reason so they persist exactly like
      // categories — kept when other categories are added or reasons are edited.
      return {
        ...state,
        reasons: state.reasons.map((r) => {
          if (r.id !== action.id) return r;
          const current = Array.isArray(r.details) ? r.details : [];
          const has = current.includes(action.detail);
          return {
            ...r,
            details: has
              ? current.filter((d) => d !== action.detail)
              : [...current, action.detail],
          };
        }),
      };
    }

    case 'SET_POWER_WORD': {
      return {
        ...state,
        reasons: state.reasons.map((r) =>
          r.id === action.id ? { ...r, powerWord: action.powerWord } : r
        ),
      };
    }

    case 'ARCHIVE_REASON': {
      // Flag-only change — text, categories and power word are preserved.
      return {
        ...state,
        reasons: state.reasons.map((r) =>
          r.id === action.id ? { ...r, archived: true } : r
        ),
      };
    }

    case 'UNARCHIVE_REASON': {
      // Restore to the END of the list (not its old position) so the existing
      // active reasons keep their numbers — the restored one simply becomes the
      // next R-number. All of its saved data (categories, subcategory, power
      // word, grip score) is preserved; only its position changes.
      const target = state.reasons.find((r) => r.id === action.id);
      if (!target) return state;
      const rest = state.reasons.filter((r) => r.id !== action.id);
      return {
        ...state,
        reasons: [...rest, { ...target, archived: false }],
      };
    }

    case 'SET_STATUS':
      return { ...state, status: action.status };

    default:
      return state;
  }
}

export function AssessmentFlowProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startSession = useCallback(() => dispatch({ type: 'START_SESSION' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const addReason = useCallback(
    (text) => dispatch({ type: 'ADD_REASON', text }),
    []
  );
  const updateReasonText = useCallback(
    (id, text) => dispatch({ type: 'UPDATE_REASON_TEXT', id, text }),
    []
  );
  const removeReason = useCallback(
    (id) => dispatch({ type: 'REMOVE_REASON', id }),
    []
  );
  const toggleCategory = useCallback(
    (id, category) => dispatch({ type: 'TOGGLE_CATEGORY', id, category }),
    []
  );
  const toggleDetail = useCallback(
    (id, detail) => dispatch({ type: 'TOGGLE_DETAIL', id, detail }),
    []
  );
  const setPowerWord = useCallback(
    (id, powerWord) => dispatch({ type: 'SET_POWER_WORD', id, powerWord }),
    []
  );
  const archiveReason = useCallback(
    (id) => dispatch({ type: 'ARCHIVE_REASON', id }),
    []
  );
  const unarchiveReason = useCallback(
    (id) => dispatch({ type: 'UNARCHIVE_REASON', id }),
    []
  );
  const setStatus = useCallback(
    (status) => dispatch({ type: 'SET_STATUS', status }),
    []
  );
  const recordFlowReturn = useCallback(
    (step) => dispatch({ type: 'SET_FLOW_RETURN', step }),
    []
  );
  const clearFlowReturn = useCallback(
    () => dispatch({ type: 'CLEAR_FLOW_RETURN' }),
    []
  );

  const persist = useCallback(
    (overrides = {}) => {
      const payload = {
        id: state.sessionId,
        createdAt: state.createdAt || new Date().toISOString(),
        status: state.status,
        reasons: state.reasons,
        ...overrides,
      };
      const saved = reasonEliminatorService.upsertSession(payload);
      return saved;
    },
    [state.sessionId, state.createdAt, state.status, state.reasons]
  );

  const hasActiveSession = Boolean(state.sessionId);
  const reasonCount = state.reasons.length;
  const allCategorized =
    reasonCount > 0 &&
    state.reasons.every(
      (r) => Array.isArray(r.categories) && r.categories.length > 0
    );
  const allPowerWords =
    reasonCount > 0 && state.reasons.every((r) => (r.powerWord || '').trim() !== '');

  const value = useMemo(
    () => ({
      ...state,
      hasActiveSession,
      reasonCount,
      allCategorized,
      allPowerWords,
      startSession,
      reset,
      addReason,
      updateReasonText,
      removeReason,
      toggleCategory,
      toggleDetail,
      setPowerWord,
      archiveReason,
      unarchiveReason,
      setStatus,
      recordFlowReturn,
      clearFlowReturn,
      persist,
    }),
    [
      state,
      hasActiveSession,
      reasonCount,
      allCategorized,
      allPowerWords,
      startSession,
      reset,
      addReason,
      updateReasonText,
      removeReason,
      toggleCategory,
      toggleDetail,
      setPowerWord,
      archiveReason,
      unarchiveReason,
      setStatus,
      recordFlowReturn,
      clearFlowReturn,
      persist,
    ]
  );

  return (
    <AssessmentFlowContext.Provider value={value}>
      {children}
    </AssessmentFlowContext.Provider>
  );
}

export function useAssessmentFlow() {
  const ctx = useContext(AssessmentFlowContext);
  if (!ctx) {
    throw new Error(
      'useAssessmentFlow must be used within AssessmentFlowProvider'
    );
  }
  return ctx;
}
