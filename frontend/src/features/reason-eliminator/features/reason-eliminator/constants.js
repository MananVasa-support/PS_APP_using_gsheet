export const STORAGE_KEY = 'altus.reasonEliminator.sessions.v1';

export const CATEGORIES = [
  {
    id: 'time',
    label: 'Lack of Time',
    code: 'T',
    description: 'You feel there is not enough time available.',
  },
  {
    id: 'focus',
    label: 'Lack of Focus',
    code: 'F',
    description: 'Your attention drifts before you finish.',
  },
  {
    id: 'clarity',
    label: 'Lack of Clarity',
    code: 'C',
    description: "You are unsure of what 'done' even looks like.",
  },
  {
    id: 'reality',
    label: 'Lack of Reality',
    code: 'R',
    description: 'The goal feels disconnected from your situation.',
  },
];

export const CATEGORY_BY_ID = CATEGORIES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

// Sub-options ("reason details") shown as checkboxes once a category is
// selected in the Assessment step. The user may tick one or more per category.
export const CATEGORY_DETAILS = {
  time: [
    { id: 'time-1', label: 'Started Late' },
    { id: 'time-2', label: 'Inaccurate Time Estimate' },
    { id: 'time-3', label: "Don't have Sufficient Time (2 ltr in 500 ml bottle)" },
    { id: 'time-4', label: "Don't have Totality (people fill 200 ml in your bottle)" },
  ],
  focus: [
    { id: 'focus-1', label: "Interrupted (something you don't like)" },
    { id: 'focus-2', label: 'Distracted (something you like)' },
    { id: 'focus-3', label: 'No Reminders (you forgot)' },
    { id: 'focus-4', label: 'Involved in Things other than What is Most Important' },
  ],
  clarity: [
    { id: 'clarity-1', label: 'Who will do it?' },
    { id: 'clarity-2', label: 'Lack of Purpose or Motivation (Why?)' },
    { id: 'clarity-3', label: 'Lack of Knowledge (How?)' },
    { id: 'clarity-4', label: 'Lack of Skills/Competency/Talent (How?)' },
    { id: 'clarity-5', label: 'Lack of Information' },
  ],
  reality: [
    { id: 'reality-1', label: 'What does it look like if your Goal was alive?' },
    { id: 'reality-2', label: 'Do the Numbers Add Up?' },
    { id: 'reality-3', label: 'Does the Timeline Match?' },
    { id: 'reality-4', label: 'Is it Actionable? (65 steps to make tea)' },
    { id: 'reality-5', label: 'Are there External Factors at Play?' },
  ],
};

export const SESSION_STATUS = {
  DRAFT: 'draft',
  ASSESSED: 'assessed',
  COMPLETED: 'completed',
};

export const FLOW_STEPS = [
  'Capture',
  'Review',
  'Assess',
  'Power Words',
  'Summary',
];

// Predefined power-word suggestions for the Power Word Exercise.
// Add new words here — the autocomplete picks them up automatically.
export const POWER_WORDS = [
  'Set Deadline',
  'Take Control',
  'Execute',
  'Face It',
  'Time Block',
  'Delegate',
  'Self Focus',
  'Prepare',
  'Finish',
  'Review',
  'Deep Work',
  'Systemize',
  'Start Now',
  'Own Up',
  'Align Fully',
  'Recover',
  'Correct',
  'Optimize',
  'Channel',
  'Detach',
  'Lock-in',
  'Filter',
  'Own-Up',
];
