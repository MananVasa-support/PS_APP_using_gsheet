import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { mapFormSubmission, mapProfile } from '@/utils/mappers';
import { usersByDepartment, registrationsTrend } from '@/data/mockData';
import { mockClients, mockConsultants, mockForms, mockTasks, consultantName } from '@/data/roleMock';

/**
 * Admin-panel data layer — uses Supabase + the SECURITY DEFINER RPCs declared
 * in supabase/migrations/0001_init.sql. RLS guarantees these queries only
 * succeed when the signed-in user is an admin.
 */

// ── Mock shapers (used when Supabase isn't configured) ──────────────────────
const shapeMockClient = (c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  clientId: c.clientId,
  dept: c.dept,
  title: c.title,
  role: 'client',
  date: c.date,
  status: c.status,
  assignedConsultant: c.assignedConsultantId
    ? { id: c.assignedConsultantId, name: consultantName(c.assignedConsultantId) }
    : null,
});

const mockActivity = [
  { id: 1, action: 'Approved client', target: 'Emily Davis', time: '2h ago', tone: 'success' },
  { id: 2, action: 'Assigned consultant', target: 'David Rodriguez', time: '5h ago', tone: 'info' },
  { id: 3, action: 'Rejected client', target: 'Lisa Thompson', time: '1d ago', tone: 'danger' },
];

// ── API ─────────────────────────────────────────────────────────────────────

export async function getAdminOverview() {
  if (!isConfigured) {
    const users = mockClients.map(shapeMockClient);
    const count = (s) => users.filter((u) => u.status === s).length;
    return {
      users,
      usersByDepartment,
      registrationsTrend,
      activityLogs: mockActivity,
      stats: {
        pending: count('Pending'),
        approved: count('Approved'),
        rejected: count('Rejected'),
        active: users.length,
        consultants: mockConsultants.length,
      },
    };
  }

  const { data, error } = await supabase.rpc('get_admin_overview');
  if (error) throw unwrapError(error);
  return {
    users: data?.users || [],
    usersByDepartment: data?.usersByDepartment?.length ? data.usersByDepartment : usersByDepartment,
    registrationsTrend: data?.registrationsTrend?.length ? data.registrationsTrend : registrationsTrend,
    activityLogs: data?.activityLogs || [],
    stats: data?.stats || { pending: 0, approved: 0, rejected: 0, active: 0, consultants: 0 },
  };
}

export async function getClients({ status, q } = {}) {
  if (!isConfigured) {
    let list = mockClients.map(shapeMockClient);
    if (status && status !== 'All') list = list.filter((c) => c.status === status);
    if (q) {
      const t = q.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(t) ||
          c.email.toLowerCase().includes(t) ||
          (c.clientId || '').toLowerCase().includes(t) ||
          (c.dept || '').toLowerCase().includes(t)
      );
    }
    return { clients: list };
  }

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false });
  if (status && status !== 'All') query = query.eq('status', status);
  if (q) {
    const term = `%${q.replace(/[%_]/g, '\\$&')}%`;
    query = query.or(`name.ilike.${term},email.ilike.${term},client_id.ilike.${term},department.ilike.${term}`);
  }
  const { data, error } = await query;
  if (error) throw unwrapError(error);

  // Look up consultant names for the rows that have assignments.
  const consultantIds = [...new Set((data || []).map((r) => r.assigned_consultant).filter(Boolean))];
  let consultantMap = new Map();
  if (consultantIds.length) {
    const { data: cs } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', consultantIds);
    consultantMap = new Map((cs || []).map((c) => [c.id, c]));
  }

  const clients = (data || []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    clientId: r.client_id,
    dept: r.department,
    title: r.title,
    role: r.role,
    date: r.created_at,
    status: r.status,
    assignedConsultant: r.assigned_consultant
      ? { id: r.assigned_consultant, name: consultantMap.get(r.assigned_consultant)?.name || '—' }
      : null,
  }));
  return { clients };
}

export async function getConsultants() {
  if (!isConfigured) {
    return {
      consultants: mockConsultants.map((c) => ({
        ...c,
        assignedCount: mockClients.filter((cl) => cl.assignedConsultantId === c.id).length,
      })),
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'consultant')
    .order('name');
  if (error) throw unwrapError(error);

  // For each consultant, count assigned clients in a single query.
  const ids = (data || []).map((c) => c.id);
  let countsMap = new Map();
  if (ids.length) {
    const { data: clients } = await supabase
      .from('profiles')
      .select('assigned_consultant')
      .in('assigned_consultant', ids);
    countsMap = (clients || []).reduce((acc, r) => {
      acc.set(r.assigned_consultant, (acc.get(r.assigned_consultant) || 0) + 1);
      return acc;
    }, new Map());
  }

  return {
    consultants: (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      title: c.title,
      department: c.department,
      status: c.status,
      assignedCount: countsMap.get(c.id) || 0,
    })),
  };
}

export async function getConsultantClients() {
  if (!isConfigured) {
    const groups = mockConsultants.map((c) => ({
      consultant: { id: c.id, name: c.name, email: c.email },
      clients: mockClients.filter((cl) => cl.assignedConsultantId === c.id).map(shapeMockClient),
    }));
    return {
      groups,
      unassignedCount: mockClients.filter((cl) => !cl.assignedConsultantId).length,
      orphaned: [],
    };
  }

  const { data: consultants, error: cErr } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'consultant')
    .order('name');
  if (cErr) throw unwrapError(cErr);

  const { data: clients, error: clErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client');
  if (clErr) throw unwrapError(clErr);

  const byConsultant = new Map();
  let unassignedCount = 0;
  for (const r of clients || []) {
    if (!r.assigned_consultant) {
      unassignedCount += 1;
      continue;
    }
    if (!byConsultant.has(r.assigned_consultant)) byConsultant.set(r.assigned_consultant, []);
    byConsultant.get(r.assigned_consultant).push({
      id: r.id,
      name: r.name,
      email: r.email,
      clientId: r.client_id,
      dept: r.department,
      title: r.title,
      role: r.role,
      status: r.status,
      date: r.created_at,
    });
  }

  const groups = (consultants || []).map((c) => ({
    consultant: { id: c.id, name: c.name, email: c.email },
    clients: byConsultant.get(c.id) || [],
  }));

  return { groups, unassignedCount, orphaned: [] };
}

export async function createConsultant(payload) {
  if (!isConfigured) {
    const consultant = {
      id: `con_${Date.now()}`,
      assignedCount: 0,
      status: 'Approved',
      title: payload.title || 'Consultant',
      department: payload.department || '—',
      ...payload,
    };
    mockConsultants.push({
      id: consultant.id,
      name: payload.name,
      email: payload.email,
      title: consultant.title,
      department: consultant.department,
      status: 'Approved',
    });
    return consultant;
  }

  // Supabase password hashing is not exposed to SQL, so admins create the
  // account by inviting the user — they'll set a password via the magic-link
  // email and the trigger on auth.users creates the profile row. We then
  // promote that row to consultant in a follow-up update.
  //
  // For now the admin UI exposes this path with a clear instruction: ask the
  // user to sign up, then run the SQL snippet in supabase/seed.sql. This stub
  // keeps the API contract intact so the page button still works in demo mode.
  throw new Error(
    'To create a consultant: ask them to sign up via /register, then run the ' +
      'promotion snippet in supabase/seed.sql. (Self-service consultant creation ' +
      'requires the Supabase service-role key and an Edge Function.)'
  );
}

export async function setUserStatus(id, status) {
  if (!isConfigured) {
    const c = mockClients.find((x) => x.id === id);
    if (c) c.status = status;
    return { id, status };
  }
  const { data, error } = await supabase.rpc('admin_set_user_status', { p_user: id, p_status: status });
  if (error) throw unwrapError(error);
  return data || { id, status };
}

export async function assignClient(clientId, consultantId) {
  if (!isConfigured) {
    const c = mockClients.find((x) => x.id === clientId);
    if (c) c.assignedConsultantId = consultantId || null;
    return {
      id: clientId,
      assignedConsultant: consultantId
        ? { id: consultantId, name: consultantName(consultantId) }
        : null,
    };
  }
  const { data, error } = await supabase.rpc('admin_assign_consultant', {
    p_client: clientId,
    p_consultant: consultantId || null,
  });
  if (error) throw unwrapError(error);
  return data || { id: clientId, assignedConsultant: null };
}

export async function deleteClient(clientId) {
  if (!isConfigured) {
    const i = mockClients.findIndex((x) => x.id === clientId);
    if (i >= 0) mockClients.splice(i, 1);
    return { id: clientId, deleted: true };
  }
  // Cascade is on the FK, so deleting the profile removes its time entries,
  // forms, tasks and reports. Cannot delete auth.users from the client SDK —
  // that requires the service-role key (do it from an Edge Function if needed).
  const { error } = await supabase.from('profiles').delete().eq('id', clientId);
  if (error) throw unwrapError(error);
  return { id: clientId, deleted: true };
}

export async function getClientForms(clientId) {
  if (!isConfigured) {
    const c = mockClients.find((x) => x.id === clientId);
    return {
      client: c
        ? { id: c.id, name: c.name, email: c.email, clientId: c.clientId, status: c.status }
        : null,
      forms: mockForms[clientId] || [],
    };
  }

  const [{ data: clientRow, error: cErr }, { data: formRows, error: fErr }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', clientId).maybeSingle(),
    supabase
      .from('form_submissions')
      .select('*')
      .eq('client_id', clientId)
      .order('type'),
  ]);
  if (cErr) throw unwrapError(cErr);
  if (fErr) throw unwrapError(fErr);

  const profile = mapProfile(clientRow);
  return {
    client: profile
      ? {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          clientId: profile.clientId,
          status: profile.status,
        }
      : null,
    forms: (formRows || []).map(mapFormSubmission),
  };
}

/**
 * Admin-scoped overview for a single consultant — mirrors what the consultant
 * sees on their own panel (stats, task breakdown, assigned-client list with
 * per-client task counts and progress), but for any consultant the admin picks
 * from the Analytics drill-down.
 */
export async function getConsultantOverview(consultantId) {
  if (!isConfigured) {
    const consultant = mockConsultants.find((c) => c.id === consultantId);
    const clients = mockClients.filter((c) => c.assignedConsultantId === consultantId);
    const tasks = mockTasks.filter((t) => t.consultant === consultantId);
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const pending = tasks.filter((t) => t.status === 'Pending').length;

    const clientRows = clients.map((c) => {
      const t = tasks.filter((x) => x.client === c.id);
      const done = t.filter((x) => x.status === 'Completed').length;
      const progress = t.length ? Math.round(t.reduce((s, x) => s + (x.progress || 0), 0) / t.length) : 0;
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        clientId: c.clientId,
        dept: c.dept,
        title: c.title,
        status: c.status,
        tasks: { total: t.length, done },
        progress,
      };
    });

    return {
      consultant: consultant
        ? { id: consultant.id, name: consultant.name, email: consultant.email, title: consultant.title, department: consultant.department }
        : null,
      stats: {
        clients: clients.length,
        tasks: tasks.length,
        completed,
        completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
        avgProgress: tasks.length ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length) : 0,
      },
      taskBreakdown: [
        { name: 'Completed', value: completed },
        { name: 'In Progress', value: inProgress },
        { name: 'Pending', value: pending },
      ],
      clients: clientRows,
    };
  }

  const [{ data: consultantRow, error: ucErr }, { data: clients, error: cErr }, { data: tasks, error: tErr }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', consultantId).maybeSingle(),
    supabase.from('profiles').select('*').eq('role', 'client').eq('assigned_consultant', consultantId).order('name'),
    supabase.from('assigned_tasks').select('client_id, status, progress').eq('consultant_id', consultantId),
  ]);
  if (ucErr) throw unwrapError(ucErr);
  if (cErr) throw unwrapError(cErr);
  if (tErr) throw unwrapError(tErr);

  const tList = tasks || [];
  const completed = tList.filter((t) => t.status === 'Completed').length;
  const inProgress = tList.filter((t) => t.status === 'In Progress').length;
  const pending = tList.filter((t) => t.status === 'Pending').length;

  const clientRows = (clients || []).map((c) => {
    const t = tList.filter((x) => x.client_id === c.id);
    const done = t.filter((x) => x.status === 'Completed').length;
    const progress = t.length ? Math.round(t.reduce((s, x) => s + (x.progress || 0), 0) / t.length) : 0;
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      clientId: c.client_id,
      dept: c.department,
      title: c.title,
      status: c.status,
      tasks: { total: t.length, done },
      progress,
    };
  });

  return {
    consultant: consultantRow
      ? {
          id: consultantRow.id,
          name: consultantRow.name,
          email: consultantRow.email,
          title: consultantRow.title,
          department: consultantRow.department,
        }
      : null,
    stats: {
      clients: (clients || []).length,
      tasks: tList.length,
      completed,
      completionRate: tList.length ? Math.round((completed / tList.length) * 100) : 0,
      avgProgress: tList.length ? Math.round(tList.reduce((s, x) => s + (x.progress || 0), 0) / tList.length) : 0,
    },
    taskBreakdown: [
      { name: 'Completed', value: completed },
      { name: 'In Progress', value: inProgress },
      { name: 'Pending', value: pending },
    ],
    clients: clientRows,
  };
}
