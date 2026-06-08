/**
 * Mock data so every page renders nicely without a live backend.
 * Services fall back to this when VITE_API_URL is unset or the API is unreachable.
 */

export const demoUser = {
  id: 'u_001',
  name: 'Alex Morgan',
  email: 'alex.morgan@unleashed.in',
  role: 'admin',
  clientId: 'CLIENT-00001',
  title: 'Senior Product Designer',
  department: 'Design',
  country: 'United States',
  timezone: 'GMT-08:00 Pacific Time',
  avatar: '',
  joined: '2024-03-14',
  level: 12,
  streak: 12,
};

// Weekly focus-time trend (line chart)
export const focusTrend = [
  { day: 'Mon', focus: 240, distracted: 90 },
  { day: 'Tue', focus: 300, distracted: 70 },
  { day: 'Wed', focus: 280, distracted: 110 },
  { day: 'Thu', focus: 360, distracted: 60 },
  { day: 'Fri', focus: 320, distracted: 80 },
  { day: 'Sat', focus: 180, distracted: 40 },
  { day: 'Sun', focus: 120, distracted: 30 },
];

// Time distribution by category (donut)
export const timeDistribution = [
  { name: 'Productive', value: 650, color: '#22c55e' },
  { name: 'Non-Productive', value: 133, color: '#ef4444' },
  { name: 'Personal', value: 105, color: '#8b5cf6' },
  { name: 'Uncertain', value: 60, color: '#f59e0b' },
];

// Activity by department (admin)
export const usersByDepartment = [
  { name: 'Engineering', value: 420, color: '#f93b48' },
  { name: 'Design', value: 180, color: '#8b5cf6' },
  { name: 'Marketing', value: 240, color: '#22c55e' },
  { name: 'Sales', value: 310, color: '#f59e0b' },
  { name: 'Support', value: 98, color: '#38bdf8' },
];

// Weekly registrations (admin bar chart)
export const registrationsTrend = [
  { label: 'W1', value: 120 },
  { label: 'W2', value: 180 },
  { label: 'W3', value: 150 },
  { label: 'W4', value: 240 },
  { label: 'W5', value: 200 },
  { label: 'W6', value: 280 },
];

// Hours logged per project (reports bar chart)
export const projectHours = [
  { label: 'Apollo', value: 64 },
  { label: 'Helios', value: 48 },
  { label: 'Orion', value: 72 },
  { label: 'Nova', value: 36 },
  { label: 'Atlas', value: 54 },
];

// Time entries (analytics / timeline)
export const timeEntries = [
  { time: '06:00 AM', task: 'Morning review & planning', category: 'Productive' },
  { time: '06:30 AM', task: 'Email triage', category: 'Non-Productive' },
  { time: '07:00 AM', task: 'Breakfast', category: 'Personal' },
  { time: '07:30 AM', task: 'Deep work — design system', category: 'Productive' },
  { time: '08:00 AM', task: 'Stand-up meeting', category: 'Uncertain' },
  { time: '08:30 AM', task: 'Prototype iteration', category: 'Productive' },
];

export const categories = ['Productive', 'Non-Productive', 'Personal', 'Uncertain'];

// AI insights (analytics)
export const aiInsights = [
  { type: 'positive', text: 'Your most focused window is 9:00 AM – 12:00 PM. Protect it.' },
  { type: 'warning', text: 'Email triage is eating 1h 20m/day — try batching it twice daily.' },
  { type: 'positive', text: 'Productive ratio up 14% vs. last week. Great momentum!' },
  { type: 'info', text: 'You logged a 12-day streak. One more for a new personal best.' },
];

// Admin: pending user approvals
export const pendingUsers = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah.j@unleashed.in', dept: 'Marketing', role: 'Marketing Specialist', date: '2026-05-20', status: 'Pending' },
  { id: 2, name: 'Michael Chen', email: 'm.chen@unleashed.in', dept: 'Engineering', role: 'Backend Engineer', date: '2026-05-20', status: 'Pending' },
  { id: 3, name: 'Emily Davis', email: 'emily.d@unleashed.in', dept: 'Finance', role: 'Financial Analyst', date: '2026-05-19', status: 'Approved' },
  { id: 4, name: 'David Rodriguez', email: 'd.rod@unleashed.in', dept: 'Sales', role: 'Account Executive', date: '2026-05-19', status: 'Pending' },
  { id: 5, name: 'Lisa Thompson', email: 'lisa.t@unleashed.in', dept: 'HR', role: 'HR Generalist', date: '2026-05-18', status: 'Rejected' },
  { id: 6, name: 'James Wilson', email: 'j.wilson@unleashed.in', dept: 'Design', role: 'UX Researcher', date: '2026-05-18', status: 'Approved' },
];

// Reports: export history
export const reportHistory = [
  { id: 'R-1042', name: 'Premium Corporate Report', range: 'May 1 – May 31', generated: '2026-05-26', format: 'PDF', size: '2.4 MB' },
  { id: 'R-1041', name: 'Weekly Summary', range: 'May 18 – May 24', generated: '2026-05-24', format: 'CSV', size: '120 KB' },
  { id: 'R-1038', name: 'Monthly Productivity', range: 'Apr 1 – Apr 30', generated: '2026-05-01', format: 'PDF', size: '3.1 MB' },
  { id: 'R-1035', name: 'Team Performance', range: 'Q1 2026', generated: '2026-04-02', format: 'XLSX', size: '1.8 MB' },
];

// Dashboard top stats
export const dashboardStats = {
  dailyScore: 86,
  focusTime: 145, // minutes
  tasksDone: 32,
  productiveRatio: 78.4,
  streak: 12,
};

// Reports top stats
export const reportStats = [
  { label: 'Total Hours', value: '1,245.7', delta: '+8.2%' },
  { label: 'Total Projects', value: '24', delta: '+3' },
  { label: 'Reports Generated', value: '16', delta: '+5' },
  { label: 'Billable Amount', value: '$98,765', delta: '+12.4%' },
];

// Skill / performance radar (analytics round 2)
export const performanceRadar = [
  { metric: 'Focus', value: 92 },
  { metric: 'Consistency', value: 85 },
  { metric: 'Output', value: 78 },
  { metric: 'Planning', value: 88 },
  { metric: 'Balance', value: 70 },
];

// Round 1 — AI-powered daily productivity analysis
export const round1 = {
  summary: [
    { label: 'Productive Hours', value: '5h 42m', tone: 'success' },
    { label: 'Non-Productive', value: '2h 13m', tone: 'danger' },
    { label: 'Personal Time', value: '1h 45m', tone: 'personal' },
    { label: 'Uncertain', value: '1h 10m', tone: 'warning' },
    { label: 'Total Tracked', value: '10h 50m', tone: 'brand' },
  ],
  productivityOverview: [
    { label: 'Productive', pct: 72, color: '#22c55e' },
    { label: 'Non-Productive', pct: 18, color: '#ef4444' },
    { label: 'Personal', pct: 6, color: '#8b5cf6' },
    { label: 'Uncertain', pct: 4, color: '#f59e0b' },
  ],
  dailyScore: 78,
  bestPeriod: { range: '9:00 AM – 12:00 PM', note: 'Peak focus — 96% productive.' },
  worstPeriod: { range: '2:00 PM – 4:00 PM', note: 'Most distractions logged here.' },
};

// Round 2 — per-task deep analysis
export const round2 = {
  tasks: [
    { name: 'Task 1', type: 'Focus', planned: 90, actual: 82, completion: 92, status: 'Completed' },
    { name: 'Task 2', type: 'Deep Work', planned: 120, actual: 95, completion: 79, status: 'Partial' },
    { name: 'Task 3', type: 'Review', planned: 60, actual: 66, completion: 88, status: 'Completed' },
  ],
  performance: [
    { label: 'Focus', value: 92 },
    { label: 'Pace', value: 85 },
    { label: 'Quality', value: 88 },
    { label: 'Consistency', value: 78 },
  ],
  taskCompletion: [
    { label: 'Planning', value: 95 },
    { label: 'Execution', value: 82 },
    { label: 'Review', value: 70 },
    { label: 'Delivery', value: 88 },
  ],
};

// Challenges — "Codename Challenge" gamification
export const challenge = {
  name: 'Codename Challenge',
  tagline: 'Build unstoppable consistency — hit your daily target every day for two weeks.',
  difficulty: 'Hard',
  participants: 1240,
  durationDays: 14,
  daysLeft: 5,
  reward: '2,500 XP',
  overallProgress: 68,
  currentStreak: 5,
  level: 12,
  levelProgress: 64,
  dailyTargets: [
    { label: 'Mon', value: 80 },
    { label: 'Tue', value: 100 },
    { label: 'Wed', value: 65 },
    { label: 'Thu', value: 90 },
    { label: 'Fri', value: 100 },
    { label: 'Sat', value: 40 },
    { label: 'Sun', value: 75 },
  ],
};

export const leaderboard = [
  { rank: 1, name: 'Sophia Bennett', points: 3820, dept: 'Engineering' },
  { rank: 2, name: 'Ethan Clarke', points: 3610, dept: 'Design' },
  { rank: 3, name: 'Mia Rodriguez', points: 3480, dept: 'Product' },
  { rank: 4, name: 'Liam Walker', points: 3200, dept: 'Sales' },
  { rank: 5, name: 'Alex Morgan', points: 3015, dept: 'Design', isMe: true },
  { rank: 6, name: 'Noah Patel', points: 2890, dept: 'Engineering' },
  { rank: 7, name: 'Olivia Kim', points: 2740, dept: 'Marketing' },
];

export const achievements = [
  { name: 'Early Bird', desc: 'Log before 7 AM', unlocked: true, icon: 'sunrise' },
  { name: 'Focus Streak', desc: '5-day streak', unlocked: true, icon: 'flame' },
  { name: 'Time Sculptor', desc: '100h tracked', unlocked: true, icon: 'clock' },
  { name: 'Unstoppable', desc: '30-day streak', unlocked: false, icon: 'zap' },
  { name: 'Deep Worker', desc: '8h deep work', unlocked: false, icon: 'target' },
  { name: 'Champion', desc: 'Win a challenge', unlocked: false, icon: 'trophy' },
];
