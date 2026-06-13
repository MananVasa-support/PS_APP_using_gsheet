import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { isSupabaseConfigured, appListUsers } from '@/lib/supabaseAuth';
import { mapFormSubmission, mapReport } from '@/utils/mappers';
import {
  mockClients,
  mockForms,
  mockReports,
  mockTasks,
  mockCreateTask,
  mockUpdateTask,
  mockDeleteTask,
  DEMO_CONSULTANT_ID,
} from '@/data/roleMock';

/**
 * Consultant-panel data layer. With Supabase + RLS, the consultant_id is
 * implicit (auth.uid()) — queries on `assigned_tasks` filtered by
 * `consultant_id = auth.uid()` are enforced by policy, and `profiles` queries
 * already restrict to that consultant's assigned clients via RLS.
 */

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

const myMockClients = () => mockClients.filter((c) => c.assignedConsultantId === DEMO_CONSULTANT_ID);
const mockClientTasks = (clientId) =>
  mockTasks.filter((t) => t.client === clientId && t.consultant === DEMO_CONSULTANT_ID);

const shapeMock = (c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  clientId: c.clientId,
  dept: c.dept,
  title: c.title,
  status: c.status,
  date: c.date,
});

async function getMyId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function getMyClients() {
  if (!isSupabaseConfigured) {
    return {
      clients: myMockClients().map((c) => {
        const tasks = mockClientTasks(c.id);
        const done = tasks.filter((t) => t.status === 'Completed').length;
        const progress = tasks.length
          ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
          : 0;
        return { ...shapeMock(c), tasks: { total: tasks.length, done }, progress };
      }),
    };
  }

  // Consultant↔client ASSIGNMENTS aren't modeled in the demo, so a consultant
  // sees ALL client accounts from Supabase (task counts stay 0 — the
  // assigned-tasks system never existed on master either).
  const users = await appListUsers();
  return {
    clients: users
      .filter((u) => (u.role || 'client') === 'client')
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        clientId: '',
        dept: c.department,
        title: c.title,
        status: c.status,
        date: c.created_at,
        tasks: { total: 0, done: 0 },
        progress: 0,
      })),
  };
}

export async function getAnalytics() {
  if (!isConfigured) {
    const clients = myMockClients();
    const tasks = mockTasks.filter((t) => t.consultant === DEMO_CONSULTANT_ID);
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const pending = tasks.filter((t) => t.status === 'Pending').length;
    return {
      stats: {
        clients: clients.length,
        tasks: tasks.length,
        completed,
        completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
        avgProgress: tasks.length
          ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
          : 0,
      },
      taskBreakdown: [
        { name: 'Completed', value: completed },
        { name: 'In Progress', value: inProgress },
        { name: 'Pending', value: pending },
      ],
    };
  }

  const { data, error } = await supabase.rpc('get_consultant_analytics');
  if (error) throw unwrapError(error);
  return {
    stats: data?.stats || { clients: 0, tasks: 0, completed: 0, completionRate: 0, avgProgress: 0 },
    taskBreakdown: data?.taskBreakdown || [],
  };
}

export async function getClientForms(clientId) {
  if (!isConfigured) return { forms: mockForms[clientId] || [] };
  const { data, error } = await supabase
    .from('form_submissions')
    .select('*')
    .eq('client_id', clientId)
    .order('type');
  if (error) throw unwrapError(error);
  return { forms: (data || []).map(mapFormSubmission) };
}

export async function getClientReports(clientId) {
  if (!isConfigured) return { reports: mockReports[clientId] || [] };
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw unwrapError(error);
  return { reports: (data || []).map(mapReport) };
}

export async function getTasks(clientId) {
  if (!isConfigured) return { tasks: mockClientTasks(clientId) };
  const uid = await getMyId();
  if (!uid) return { tasks: [] };
  const { data, error } = await supabase
    .from('assigned_tasks')
    .select('*')
    .eq('client_id', clientId)
    .eq('consultant_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw unwrapError(error);
  return {
    tasks: (data || []).map((t) => ({
      _id: t.id,
      id: t.id,
      client: t.client_id,
      consultant: t.consultant_id,
      title: t.title,
      description: t.description,
      status: t.status,
      progress: t.progress,
      dueDate: t.due_date,
      createdAt: t.created_at,
    })),
  };
}

export async function createTask(clientId, payload) {
  if (!isConfigured) {
    return {
      task: mockCreateTask({ clientId, consultantId: DEMO_CONSULTANT_ID, ...payload }),
    };
  }
  const uid = await getMyId();
  if (!uid) throw new Error('Not authenticated');
  const row = {
    client_id: clientId,
    consultant_id: uid,
    title: payload.title,
    description: payload.description || '',
    status: payload.status || 'Pending',
    progress: Number.isFinite(payload.progress) ? payload.progress : 0,
    due_date: payload.dueDate || null,
  };
  const { data, error } = await supabase.from('assigned_tasks').insert(row).select('*').single();
  if (error) throw unwrapError(error);
  return {
    task: {
      _id: data.id,
      client: data.client_id,
      consultant: data.consultant_id,
      title: data.title,
      description: data.description,
      status: data.status,
      progress: data.progress,
      dueDate: data.due_date,
      createdAt: data.created_at,
    },
  };
}

export async function updateTask(taskId, patch) {
  if (!isConfigured) {
    const next = { ...patch };
    if (next.status === 'Completed') next.progress = 100;
    else if (next.progress === 100) next.status = 'Completed';
    return { task: mockUpdateTask(taskId, next) };
  }
  const update = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.status !== undefined && TASK_STATUSES.includes(patch.status)) update.status = patch.status;
  if (patch.progress !== undefined) update.progress = Math.max(0, Math.min(100, patch.progress));
  if (patch.dueDate !== undefined) update.due_date = patch.dueDate || null;

  const { data, error } = await supabase
    .from('assigned_tasks')
    .update(update)
    .eq('id', taskId)
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return {
    task: {
      _id: data.id,
      client: data.client_id,
      consultant: data.consultant_id,
      title: data.title,
      description: data.description,
      status: data.status,
      progress: data.progress,
      dueDate: data.due_date,
    },
  };
}

export async function deleteTask(taskId) {
  if (!isConfigured) {
    mockDeleteTask(taskId);
    return { id: taskId, deleted: true };
  }
  const { error } = await supabase.from('assigned_tasks').delete().eq('id', taskId);
  if (error) throw unwrapError(error);
  return { id: taskId, deleted: true };
}

export async function getProgress(clientId) {
  if (!isConfigured) {
    const tasks = mockClientTasks(clientId);
    return {
      total: tasks.length,
      overall: tasks.length
        ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
        : 0,
      byStatus: TASK_STATUSES.map((st) => ({
        name: st,
        value: tasks.filter((t) => t.status === st).length,
      })),
    };
  }
  const uid = await getMyId();
  if (!uid) return { total: 0, overall: 0, byStatus: [] };
  const { data, error } = await supabase
    .from('assigned_tasks')
    .select('status, progress')
    .eq('client_id', clientId)
    .eq('consultant_id', uid);
  if (error) throw unwrapError(error);
  const t = data || [];
  return {
    total: t.length,
    overall: t.length ? Math.round(t.reduce((s, x) => s + (x.progress || 0), 0) / t.length) : 0,
    byStatus: TASK_STATUSES.map((st) => ({ name: st, value: t.filter((x) => x.status === st).length })),
  };
}

export async function setClientStatus(clientId, status) {
  if (!['Approved', 'Rejected'].includes(status)) {
    throw new Error('Invalid status');
  }
  if (!isConfigured) {
    const c = mockClients.find((x) => x.id === clientId);
    if (c) c.status = status;
    return { id: clientId, status };
  }
  const { data, error } = await supabase.rpc('consultant_set_client_status', {
    p_client: clientId,
    p_status: status,
  });
  if (error) throw unwrapError(error);
  return data;
}

export async function deleteClient(clientId) {
  if (!isConfigured) {
    const i = mockClients.findIndex((c) => c.id === clientId);
    if (i >= 0) mockClients.splice(i, 1);
    return { id: clientId, deleted: true };
  }
  // Consultants can detach themselves from a client; only admins may hard-delete.
  // Here we unassign rather than delete — surfaced through the same UI verb.
  const { error } = await supabase
    .from('profiles')
    .update({ assigned_consultant: null })
    .eq('id', clientId);
  if (error) throw unwrapError(error);
  return { id: clientId, deleted: true };
}
