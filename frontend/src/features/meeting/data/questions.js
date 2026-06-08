// Shared metadata for the 18 Plan a Meeting questions.
// Used by the Prep form (input), the Review step, and Meeting Details (read-only).
//
// Labels are stored WITHOUT a leading number — the question number is derived
// from the array index (idx + 1) wherever it is displayed, so renumbering is
// automatic and "Question N" headings stay consistent across the app.
//
// Note: the radio question (q7) stores its free-text "Other" value in q7_other.

export const allQuestions = [
  { id: 'q1', label: 'Meeting Name', type: 'text' },
  { id: 'q2', label: 'Identify a meeting you want or need to have.', type: 'textarea' },
  { id: 'q3', label: 'How much time do you think this meeting will take?', type: 'duration' },
  { id: 'q4', label: "What purpose of yours and others will get fulfilled? What's the point of this meeting?", type: 'textarea' },
  { id: 'q5', label: 'If this meeting were a GRAND SUCCESS for everyone involved, what outcomes would you have realized? What would you have accomplished?', type: 'textarea' },
  { id: 'q6', label: 'Whose absence can defeat these outcomes?', type: 'textarea' },
  { id: 'q7', label: 'Have you checked if they have sufficient time for this meeting? Do you need to re-schedule?', type: 'radio' },
  { id: 'q8', label: 'Will you need any presentation, equipment, or brochure for this meeting? Are you ready?', type: 'textarea' },
  { id: 'q9', label: 'What are the roles of all people involved? Will the decision maker be available?', type: 'textarea' },
  { id: 'q10', label: 'What actions are required for you to unquestionably realize the outcomes from Question 5? How will you make the rock talk? Empty your mind with respect to everything about this meeting.', type: 'textarea' },
  { id: 'q11', label: 'What information must you have before or during the meeting? Who, where, and how will you get it?', type: 'textarea' },
  { id: 'q12', label: 'Do others need to do something before or during the meeting? What must you do to ensure they do their part on time?', type: 'textarea' },
  { id: 'q13', label: 'Do others need to contribute in any other way? What can you do to get what you need?', type: 'textarea' },
  { id: 'q14', label: 'What needs to be resolved, agreed to, produced, or aligned with by which person(s) or group?', type: 'textarea' },
  { id: 'q15', label: 'What will need to get recorded during the meeting? Who will do that?', type: 'textarea' },
  { id: 'q16', label: 'What will the agenda say about what is going to happen? What can you send in writing before the meeting?', type: 'textarea' },
  { id: 'q17', label: 'Now, how much time will this meeting take?', type: 'duration' },
  { id: 'q18', label: 'What do you or others need to do after the meeting?', type: 'textarea' }
];

// Total number of questions in the prep flow.
export const TOTAL_QUESTIONS = allQuestions.length; // 18

// Format a stored HH/MM duration value into a human-readable string.
// e.g. "03/30" → "03/30 (3 Hours 30 Minutes)"
const formatDuration = (val) => {
  if (!val || typeof val !== 'string') return val;
  const match = val.match(/^(\d{1,2})\/(\d{2})$/);
  if (!match) return val;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const hLabel = h === 1 ? 'Hour' : 'Hours';
  const mLabel = m === 1 ? 'Minute' : 'Minutes';
  return `${val} (${h} ${hLabel} ${m} ${mLabel})`;
};

// Resolve a human-readable answer for a question from a saved answers snapshot.
// Handles the special-cased radio question (q7 + q7_other) and duration fields.
export const getAnswerText = (question, answers) => {
  if (question.id === 'q7') {
    return answers.q7 === 'Other'
      ? `Other: ${answers.q7_other || ''}`.trim()
      : answers.q7;
  }
  if (question.type === 'duration') {
    return formatDuration(answers[question.id]);
  }
  return answers[question.id];
};
