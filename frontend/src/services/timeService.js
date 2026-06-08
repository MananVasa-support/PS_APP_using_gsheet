import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { mapTimeEntry } from '@/utils/mappers';
import { timeEntries as mockEntries, focusTrend, dashboardStats } from '@/data/mockData';

/** Time-entry CRUD + dashboard aggregates. */

async function getMyId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function getEntries(params = {}) {
  if (!isConfigured) return [...mockEntries];
  const id = await getMyId();
  if (!id) return [];

  let q = supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', id)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (params.from) q = q.gte('entry_date', params.from);
  if (params.to) q = q.lte('entry_date', params.to);
  if (params.category) q = q.eq('category', params.category);
  if (params.limit) q = q.limit(params.limit);

  const { data, error } = await q;
  if (error) throw unwrapError(error);
  return (data || []).map(mapTimeEntry);
}

export async function createEntry(entry) {
  if (!isConfigured) return { ...entry, id: `e_${Date.now()}` };
  const id = await getMyId();
  if (!id) throw new Error('Not authenticated');

  if (!entry?.task?.trim()) throw new Error('Task is required');

  const row = {
    user_id: id,
    task: entry.task.trim(),
    category: entry.category || 'Productive',
    time_label: entry.time || entry.timeLabel || entry.time_label || '',
    minutes: Number.isFinite(entry.minutes) ? entry.minutes : 30,
    ...(entry.date ? { entry_date: new Date(entry.date).toISOString().slice(0, 10) } : {}),
  };
  const { data, error } = await supabase.from('time_entries').insert(row).select('*').single();
  if (error) throw unwrapError(error);
  return mapTimeEntry(data);
}

export async function updateEntry(entryId, patch = {}) {
  if (!isConfigured) return { ...patch, id: entryId };
  const update = {};
  if (patch.task !== undefined) update.task = patch.task;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.time !== undefined) update.time_label = patch.time;
  if (patch.minutes !== undefined) update.minutes = patch.minutes;
  if (patch.date !== undefined) update.entry_date = new Date(patch.date).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('time_entries')
    .update(update)
    .eq('id', entryId)
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return mapTimeEntry(data);
}

export async function deleteEntry(entryId) {
  if (!isConfigured) return { id: entryId };
  const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
  if (error) throw unwrapError(error);
  return { id: entryId };
}

/** Insert many entries in one go (used by CreateEntry's "save day" flow). */
export async function bulkCreateEntries(entries = []) {
  if (!isConfigured) return entries.map((e, i) => ({ ...e, id: `e_${Date.now()}_${i}` }));
  const id = await getMyId();
  if (!id) throw new Error('Not authenticated');
  if (entries.length === 0) return [];

  const rows = entries.map((entry) => ({
    user_id: id,
    task: entry.task,
    category: entry.category || 'Productive',
    time_label: entry.time || entry.timeLabel || '',
    minutes: Number.isFinite(entry.minutes) ? entry.minutes : 30,
    ...(entry.date ? { entry_date: new Date(entry.date).toISOString().slice(0, 10) } : {}),
  }));

  const { data, error } = await supabase.from('time_entries').insert(rows).select('*');
  if (error) throw unwrapError(error);
  return (data || []).map(mapTimeEntry);
}

export async function getDashboard() {
  if (!isConfigured) return { stats: dashboardStats, focusTrend };
  const { data, error } = await supabase.rpc('get_dashboard');
  if (error) throw unwrapError(error);

  const stats = data?.stats || {};
  return {
    stats: {
      dailyScore: stats.dailyScore ?? 0,
      focusTime: stats.focusTime ?? 0,
      tasksDone: stats.tasksDone ?? 0,
      productiveRatio: stats.productiveRatio ?? 0,
      streak: stats.streak ?? 0,
    },
    focusTrend: Array.isArray(data?.focusTrend) && data.focusTrend.length ? data.focusTrend : focusTrend,
  };
}
