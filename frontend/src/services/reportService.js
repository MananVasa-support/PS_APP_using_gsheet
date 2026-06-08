import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { mapReport } from '@/utils/mappers';
import { reportHistory, reportStats, projectHours, focusTrend } from '@/data/mockData';

/** Reports — history, stats, builder, and storage. */

async function getMyId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function getReports() {
  if (!isConfigured) return { history: reportHistory, stats: reportStats, projectHours, trend: focusTrend };

  const id = await getMyId();
  if (!id) return { history: [], stats: reportStats, projectHours, trend: focusTrend };

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });
  if (error) throw unwrapError(error);

  const history = (data || []).map(mapReport);
  return {
    history,
    stats: reportStats, // computed top-line numbers — keep illustrative until aggregated server-side
    projectHours,
    trend: focusTrend,
  };
}

export async function generateReport(config) {
  if (!isConfigured) {
    return { id: `R-${Math.floor(1000 + Math.random() * 9000)}`, ...config };
  }
  const id = await getMyId();
  if (!id) throw new Error('Not authenticated');

  const row = {
    user_id: id,
    name: `${config.type} Report`,
    type: config.type || 'Summary',
    range: config.range || '',
    format: config.format || 'PDF',
    size: '1.0 MB',
  };
  const { data, error } = await supabase.from('reports').insert(row).select('*').single();
  if (error) throw unwrapError(error);
  return mapReport(data);
}

export async function deleteReport(reportId) {
  if (!isConfigured) return { id: reportId };
  // If the report has a storage_path, remove the file too.
  const { data: row } = await supabase
    .from('reports')
    .select('storage_path')
    .eq('id', reportId)
    .maybeSingle();
  if (row?.storage_path) {
    await supabase.storage.from('reports').remove([row.storage_path]);
  }
  const { error } = await supabase.from('reports').delete().eq('id', reportId);
  if (error) throw unwrapError(error);
  return { id: reportId };
}

/** Upload a generated report file to the `reports` bucket and record its path. */
export async function uploadReportFile(reportId, file) {
  if (!isConfigured) return { path: '', url: '' };
  const id = await getMyId();
  if (!id) throw new Error('Not authenticated');
  if (!file) throw new Error('No file provided');

  const ext = (file.name?.split('.').pop() || 'pdf').toLowerCase();
  const path = `${id}/${reportId}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('reports')
    .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
  if (upErr) throw unwrapError(upErr);

  const sizeKb = Math.max(1, Math.round((file.size || 0) / 1024));
  const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

  const { error: updErr } = await supabase
    .from('reports')
    .update({ storage_path: path, size: sizeStr })
    .eq('id', reportId);
  if (updErr) throw unwrapError(updErr);

  return { path, size: sizeStr };
}

/** Get a short-lived signed URL to download a private report file. */
export async function getReportDownloadUrl(reportId, expiresIn = 60) {
  if (!isConfigured) return null;
  const { data: row, error } = await supabase
    .from('reports')
    .select('storage_path')
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw unwrapError(error);
  if (!row?.storage_path) return null;
  const { data, error: signErr } = await supabase.storage
    .from('reports')
    .createSignedUrl(row.storage_path, expiresIn);
  if (signErr) throw unwrapError(signErr);
  return data?.signedUrl || null;
}
