/**
 * Mock dataset for the role-based panels (Admin + Consultant), used whenever no
 * backend is configured so both panels are fully explorable offline.
 *
 * Mutating helpers below let the demo feel "live" within a session (assigning a
 * consultant, changing status, adding/deleting tasks) without a server.
 */

export const mockConsultants = [
  { id: 'con_1', name: 'Priya Nair', email: 'consultant@unleashed.in', title: 'Productivity Consultant', department: 'Coaching', status: 'Approved' },
  { id: 'con_2', name: 'James Okoro', email: 'james.o@unleashed.in', title: 'Senior Consultant', department: 'Coaching', status: 'Approved' },
];

// The consultant the demo "consultant@unleashed.in" login maps to.
export const DEMO_CONSULTANT_ID = 'con_1';

export const mockClients = [
  { id: 'cli_1', name: 'Sarah Johnson', email: 'sarah.j@unleashed.in', clientId: 'CLIENT-00002', dept: 'Marketing', title: 'Marketing Specialist', status: 'Pending', assignedConsultantId: null, date: '2026-05-20' },
  { id: 'cli_2', name: 'Michael Chen', email: 'm.chen@unleashed.in', clientId: 'CLIENT-00003', dept: 'Engineering', title: 'Backend Engineer', status: 'Pending', assignedConsultantId: null, date: '2026-05-20' },
  { id: 'cli_3', name: 'Emily Davis', email: 'emily.d@unleashed.in', clientId: 'CLIENT-00004', dept: 'Finance', title: 'Financial Analyst', status: 'Approved', assignedConsultantId: 'con_1', date: '2026-05-19' },
  { id: 'cli_4', name: 'David Rodriguez', email: 'd.rod@unleashed.in', clientId: 'CLIENT-00005', dept: 'Sales', title: 'Account Executive', status: 'Approved', assignedConsultantId: 'con_1', date: '2026-05-19' },
  { id: 'cli_5', name: 'Lisa Thompson', email: 'lisa.t@unleashed.in', clientId: 'CLIENT-00006', dept: 'HR', title: 'HR Generalist', status: 'Rejected', assignedConsultantId: null, date: '2026-05-18' },
  { id: 'cli_6', name: 'James Wilson', email: 'j.wilson@unleashed.in', clientId: 'CLIENT-00007', dept: 'Design', title: 'UX Researcher', status: 'Approved', assignedConsultantId: 'con_2', date: '2026-05-18' },
  { id: 'cli_7', name: 'Aarti Sharma', email: 'aarti.s@unleashed.in', clientId: 'CLIENT-00008', dept: 'Operations', title: 'Operations Lead', status: 'Pending', assignedConsultantId: 'con_1', date: '2026-05-22' },
  { id: 'cli_8', name: 'Rohan Mehta', email: 'rohan.m@unleashed.in', clientId: 'CLIENT-00009', dept: 'Product', title: 'Product Manager', status: 'Pending', assignedConsultantId: 'con_1', date: '2026-05-23' },
];

// Form submissions keyed by client id.
export const mockForms = {
  cli_3: [
    { id: 'f_1', type: 'health', submittedAt: '2026-05-19', data: { firstName: 'Emily', lastName: 'Davis', email: 'emily.d@unleashed.in', cellNumber: '9876543210', gender: 'Female', businessCategory: 'Professional', designation: 'Manager', city: 'Mumbai' } },
    { id: 'f_2', type: 'ecg-pre', submittedAt: '2026-05-19', data: { goalClarity: 6, businessGoalClarity: 5, savingsGoalClarity: 4, totality: 4, overwhelmed: 7 } },
    { id: 'f_3', type: 'consent', submittedAt: '2026-05-19', data: { agreeProprietary: 'YES', agreeGroundRules: 'YES' } },
  ],
  cli_4: [
    { id: 'f_4', type: 'health', submittedAt: '2026-05-19', data: { firstName: 'David', lastName: 'Rodriguez', email: 'd.rod@unleashed.in', cellNumber: '9988776655', gender: 'Male', businessCategory: 'Corporate', designation: 'Employee', city: 'Bengaluru' } },
    { id: 'f_5', type: 'consent', submittedAt: '2026-05-19', data: { agreeProprietary: 'YES', agreeGroundRules: 'YES' } },
  ],
};

export const mockReports = {
  cli_3: [{ _id: 'r_1', name: 'Weekly Summary', type: 'Weekly Summary', range: 'May 18 – May 24', format: 'PDF', size: '1.1 MB', createdAt: '2026-05-24' }],
  cli_4: [],
};

export let mockTasks = [
  { _id: 't_1', client: 'cli_3', consultant: 'con_1', title: 'Complete weekly time audit', description: 'Log every block for 7 days.', status: 'In Progress', progress: 60, dueDate: '2026-05-30', createdAt: '2026-05-20' },
  { _id: 't_2', client: 'cli_3', consultant: 'con_1', title: 'Review ECG pre-assessment', description: '', status: 'Completed', progress: 100, dueDate: '2026-05-22', createdAt: '2026-05-19' },
  { _id: 't_3', client: 'cli_4', consultant: 'con_1', title: 'Set up daily planning ritual', description: 'Fixed 20-min morning plan.', status: 'Pending', progress: 0, dueDate: '2026-06-01', createdAt: '2026-05-21' },
];

// ── tiny in-memory mutators so the demo behaves believably ────────────────
let taskSeq = 100;

export function mockCreateTask({ clientId, consultantId, title, description, dueDate, status, progress }) {
  const task = {
    _id: `t_${++taskSeq}`,
    client: clientId,
    consultant: consultantId,
    title,
    description: description || '',
    status: status || 'Pending',
    progress: Number(progress) || 0,
    dueDate: dueDate || null,
    createdAt: new Date().toISOString(),
  };
  mockTasks = [task, ...mockTasks];
  return task;
}

export function mockUpdateTask(taskId, patch) {
  mockTasks = mockTasks.map((t) => (t._id === taskId ? { ...t, ...patch } : t));
  return mockTasks.find((t) => t._id === taskId);
}

export function mockDeleteTask(taskId) {
  mockTasks = mockTasks.filter((t) => t._id !== taskId);
}

export function consultantName(id) {
  return mockConsultants.find((c) => c.id === id)?.name || null;
}
