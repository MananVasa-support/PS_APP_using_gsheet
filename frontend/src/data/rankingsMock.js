/**
 * Demo leaderboard for the Level 2 challenge pages. Replace with live data from
 * the rankings API in the backend round. `isMe` flags the logged-in user's row.
 */
export const rankings = [
  { rank: 1, name: 'Aarav Sharma', dept: 'Engineering', points: 980, productivity: 94, streak: 21, completion: 100 },
  { rank: 2, name: 'Diya Patel', dept: 'Marketing', points: 935, productivity: 91, streak: 19, completion: 96 },
  { rank: 3, name: 'Vivaan Mehta', dept: 'Sales', points: 902, productivity: 89, streak: 18, completion: 92 },
  { rank: 4, name: 'Alex Morgan', dept: 'Product', points: 868, productivity: 87, streak: 16, completion: 88, isMe: true },
  { rank: 5, name: 'Ananya Rao', dept: 'Finance', points: 814, productivity: 84, streak: 14, completion: 83 },
  { rank: 6, name: 'Kabir Singh', dept: 'Design', points: 786, productivity: 82, streak: 12, completion: 79 },
  { rank: 7, name: 'Ishaan Gupta', dept: 'Operations', points: 742, productivity: 79, streak: 10, completion: 74 },
  { rank: 8, name: 'Saanvi Iyer', dept: 'HR', points: 705, productivity: 77, streak: 9, completion: 70 },
];

/** Weekly productivity % for the current user — used by the Analysis page. */
export const weeklyProductivity = [
  { label: 'Mon', value: 78 },
  { label: 'Tue', value: 85 },
  { label: 'Wed', value: 72 },
  { label: 'Thu', value: 90 },
  { label: 'Fri', value: 88 },
  { label: 'Sat', value: 64 },
  { label: 'Sun', value: 81 },
];
