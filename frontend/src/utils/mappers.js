/**
 * Translate snake_case rows coming back from Supabase / Postgres into the
 * camelCase shape the frontend components already expect.
 *
 * Every domain service uses these so individual pages don't have to know that
 * the underlying API now speaks SQL conventions.
 */

export function mapProfile(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name || '',
    email: p.email,
    role: p.role,
    status: p.status,
    clientId: p.client_id || '',
    title: p.title || '',
    department: p.department || '',
    phone: p.phone || '',
    country: p.country || '',
    timezone: p.timezone || '',
    avatar: p.avatar || '',
    level: p.level ?? 1,
    streak: p.streak ?? 0,
    preferences: p.preferences || {},
    assignedConsultant: p.assigned_consultant || null,
    joined: p.created_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function mapTimeEntry(e) {
  if (!e) return null;
  return {
    id: e.id,
    userId: e.user_id,
    task: e.task,
    category: e.category,
    time: e.time_label || '',
    minutes: e.minutes ?? 30,
    date: e.entry_date,
    createdAt: e.created_at,
  };
}

export function mapFormSubmission(f) {
  if (!f) return null;
  return {
    id: f.id,
    clientId: f.client_id,
    type: f.type,
    data: f.data || {},
    submittedAt: f.created_at,
    updatedAt: f.updated_at,
  };
}

export function mapAssignedTask(t) {
  if (!t) return null;
  return {
    _id: t.id,
    id: t.id,
    client: t.client_id,
    consultant: t.consultant_id,
    consultantProfile: t.consultant ? mapProfile(t.consultant) : null,
    clientProfile: t.client ? mapProfile(t.client) : null,
    title: t.title,
    description: t.description || '',
    status: t.status,
    progress: t.progress ?? 0,
    dueDate: t.due_date,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export function mapReport(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    range: r.range,
    format: r.format,
    size: r.size,
    storagePath: r.storage_path || null,
    generated: r.created_at,
    createdAt: r.created_at,
  };
}

export function mapApproval(a) {
  if (!a) return null;
  return {
    id: a.id,
    action: a.action,
    target: a.target || null,
    by: a.by_admin || null,
    previousStatus: a.previous_status,
    newStatus: a.new_status,
    consultantId: a.consultant_id || null,
    note: a.note || '',
    time: a.created_at,
    tone: a.tone || 'default',
  };
}
