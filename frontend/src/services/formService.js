import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { mapFormSubmission } from '@/utils/mappers';
import { onboardingSections } from '@/data/onboardingForm';

/**
 * Onboarding form persistence + client-side task fetch.
 *
 * The onboarding wizard collects a flat { questionId: value } map across four
 * sections. `buildSubmissions` splits it into one record per form type so each
 * type goes to its own row (unique on client_id + type).
 */

const SECTION_TYPE = {
  'health-check': 'health',
  'ecg-pre': 'ecg-pre',
  'ecg-post': 'ecg-post',
  consent: 'consent',
};

export function buildSubmissions(values = {}) {
  return onboardingSections
    .map((section) => {
      const data = {};
      for (const q of section.questions) {
        if (q.type === 'heading' || q.type === 'legal') continue;
        const v = values[q.id];
        if (v !== undefined && v !== '' && v !== null) data[q.id] = v;
      }
      return { type: SECTION_TYPE[section.id], data };
    })
    .filter((s) => s.type);
}

/** Submit onboarding answers. The user must already have a Supabase session
 *  (created in the Register flow) — RLS requires it. */
export async function submitOnboarding(email, values) {
  const submissions = buildSubmissions(values);

  if (!isConfigured) {
    await wait();
    return { persisted: false, saved: 0, demo: true };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) {
    throw new Error(
      'You need to be logged in to submit onboarding. Please log in and try again.'
    );
  }

  const rows = submissions
    .filter((s) => Object.keys(s.data).length > 0)
    .map((s) => ({ client_id: uid, type: s.type, data: s.data }));

  if (!rows.length) return { persisted: true, saved: 0 };

  const { error } = await supabase
    .from('form_submissions')
    .upsert(rows, { onConflict: 'client_id,type' });
  if (error) throw unwrapError(error);

  return { persisted: true, saved: rows.length };
}

/** All onboarding form submissions for the signed-in client. */
export async function getMyForms() {
  if (!isConfigured) return { forms: [] };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { forms: [] };
  const { data, error } = await supabase
    .from('form_submissions')
    .select('*')
    .eq('client_id', uid)
    .order('type');
  if (error) throw unwrapError(error);
  return { forms: (data || []).map(mapFormSubmission) };
}

/** Tasks assigned to the signed-in client (read-only). */
export async function getMyTasks() {
  if (!isConfigured) {
    return {
      tasks: [
        { _id: 'mt_1', title: 'Complete weekly time audit', status: 'In Progress', progress: 60, dueDate: null, consultant: { name: 'Priya Nair' } },
        { _id: 'mt_2', title: 'Review ECG pre-assessment', status: 'Completed', progress: 100, dueDate: null, consultant: { name: 'Priya Nair' } },
      ],
    };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { tasks: [] };

  const { data: rows, error } = await supabase
    .from('assigned_tasks')
    .select('*')
    .eq('client_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw unwrapError(error);

  // Populate consultant info in a single follow-up query.
  const consultantIds = [...new Set((rows || []).map((r) => r.consultant_id).filter(Boolean))];
  let consultantMap = new Map();
  if (consultantIds.length) {
    const { data: cs } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', consultantIds);
    consultantMap = new Map((cs || []).map((c) => [c.id, c]));
  }

  return {
    tasks: (rows || []).map((r) => ({
      _id: r.id,
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      progress: r.progress,
      dueDate: r.due_date,
      consultant: consultantMap.get(r.consultant_id) || null,
    })),
  };
}

function wait(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}
