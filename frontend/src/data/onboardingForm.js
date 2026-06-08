/**
 * Productivity Shastra onboarding questionnaire.
 *
 * Four sections, shown in this order as wizard steps:
 *   1. Health Check Form  — all profile / business / personal questions
 *   2. ECG (Pre)          — 1–10 self-assessment, "before the program" reading
 *   3. ECG (Post)         — the SAME assessment, "after the program" reading
 *   4. Consent Form       — proprietary agreement + ground rules (accept to finish)
 *
 * Basic identity details (first/last name, email, primary number) are pre-filled
 * from the Registration step (seeded into the `ps_onboarding_draft` draft), so the
 * user never re-types what they already entered.
 *
 * Question types (rendered by src/components/forms/FormField.jsx):
 *   heading  — a non-input sub-section divider
 *   text | email | date | textarea | select | radio | checkbox | scale (1–10) | file
 *   legal    — read-only agreement text
 * Optional flags: required (bool), capitalize: 'words' (Title-Case as typed),
 *   validate: 'email' | 'phone' (format check when a value is present).
 */

// ── Option lists (verbatim) ──────────────────────────────────────────────
export const BUSINESS_CATEGORY_OPTIONS = [
  'Corporate', 'SME', 'MSME', 'Manufacturer', 'B2B Trader', 'Wholesaler', 'Retailer',
  'Agency Business', 'Professional', 'Service Provider', 'Start Up', 'Freelancer',
  'Solopreneur', 'Govt Sec.', 'Student', 'Other',
];

export const INDUSTRY_OPTIONS = [
  '5 Star Hotel', 'Advertising Agency', 'Advocates and Solicitors', 'Architects', 'Artists',
  'Baby Clothing', 'Baby Products', 'Big Data Analytics', 'Builders', 'Building Materials',
  'Business & Home Loans', 'C&F Agents', 'Capital Goods', 'Car Dealers', 'Car Rentals',
  'Celebrity Management', 'CFO Services', 'Chair Manufacturing', 'Chartered Accountants',
  'Chemical', 'Chemicals & API', 'Coaches', 'Company Secretary', 'Computer Hardware',
  'Computer Repairs', 'Construction and Engineering Industry', 'Content Writing', 'Cookware',
  'Corporate Clothing', 'Corporate Gifting', 'Cosmetics', 'Cost Accounting', 'Cotton Traders',
  'Cricket Coaching', 'Dental Lab and Equipment', 'Derivatives Traders', 'Diesel Engines',
  'Digital Marketing', 'Doctors & Surgeons', 'E-Commerce', 'Electrical Contractors',
  'Electronic Security Systems', 'ERP and CRM Softwares', 'Event Management', 'F & O Trading',
  'Film Makers', 'Financial Advisors', 'Financial Planners', 'Fitness Trainers', 'FMCG',
  'Food and Beverages Industry', 'Food Designing', 'Furniture Trading', 'Garments',
  'Government Liaisoning', 'Graphic Designers', 'Hardware', 'Heat Pumps', 'Herbal Products',
  'Holistic Healing', 'Home Automation', 'Hospitals', 'HR Consultants', 'HVAC Solutions',
  'Infra Projects', 'Insurance Advisors', 'Investment Banking', 'IT Networking', 'Jewellery',
  'LED Manufacturing', 'Logistics', 'Lubricants', 'Management Consultants', 'Manufacturing',
  'Marketing Consultants', 'Masterbatches', 'Material Handling & Storage Systems', 'Metal Trading',
  'Mobile and Gaming Apps', 'Modular Kitchen', 'Motors', 'Opticians', 'Parenting Coaching',
  'PET Bottles', 'Photography', 'Plastic Moulds', 'Plastics Granules', 'Plywood', 'Polymers',
  'Portfolio Management', 'Printing & Packaging', 'Private Equity', 'Process Consultants',
  'Psychologists', 'Real Estate Advisor', 'Real Estate Industry', 'Renewable Energy',
  'ROC Compliance', 'Service Sector', 'Signage and Hoardings', 'Tours & Travels', 'Trading',
  'Upholstery & Curtains', 'Vaastu Consultants', 'Warehousing', 'Website Developers', 'Others',
];

export const DESIGNATION_OPTIONS = [
  'Director', 'Partner', 'Owner/Proprietor', 'President/Vice President', 'Head of Department',
  'Senior Manager', 'Manager', 'Associate', 'Employee', 'Student', 'Other',
];

export const PEOPLE_COUNT_OPTIONS = ['1', '2-5', '6-15', '16-30', '31-50', '51-100', '100-250', '251-500', 'More than 500'];

export const EVENT_OPTIONS = [
  'KCF Productivity Shastra Webinar',
  'Million Dollar Habits',
  'Colloquium',
  'Other Workshops Led by Manan Vasa',
  'No',
];

export const PLANNING_TOOL_OPTIONS = ['Nothing', 'Loose Paper/Notepad', 'Diary/Organizer', 'Calendar App or Software'];
export const HOURS_OPTIONS = ['0-1 Hour', '1-2 Hours', '2-3 Hours', '3-4 Hours'];

// Helpers
const scale = (id, label) => ({ id, label, type: 'scale' });
const heading = (id, label) => ({ id, label, type: 'heading' });

// ── 1. HEALTH CHECK FORM ──────────────────────────────────────────────────
// Field ids firstName / lastName / email / cellNumber are pre-filled from the
// Registration step (see src/pages/auth/Register.jsx) — not asked from scratch.
const healthCheckForm = {
  id: 'health-check',
  title: 'Health Check Form',
  description: 'Your profile, business and personal details.',
  questions: [
    heading('h_personal', 'Personal Details'),
    { id: 'firstName', label: 'Your First Name', type: 'text', required: true, capitalize: 'words' },
    { id: 'lastName', label: 'Your Last Name', type: 'text', required: true, capitalize: 'words' },
    { id: 'cellNumber', label: 'Cell Number (For us to call you)', type: 'text', required: true, validate: 'phone' },
    { id: 'whatsapp', label: 'Your WhatsApp Number (if different from primary number)', type: 'text', validate: 'phone' },
    { id: 'altNumber', label: 'Alternate Number', type: 'text', validate: 'phone' },
    { id: 'email', label: 'Your Email', type: 'email', required: true, validate: 'email' },
    { id: 'googleEmail', label: 'Your Google Based Email', type: 'email', validate: 'email' },
    { id: 'dob', label: 'Your Date of Birth', type: 'date' },
    { id: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female', 'Others'] },
    { id: 'address', label: 'Postal Address', type: 'textarea' },
    { id: 'city', label: 'City', type: 'text', capitalize: 'words' },
    { id: 'pincode', label: 'Pincode', type: 'text' },

    heading('h_bizprofile', 'Business Profile'),
    { id: 'businessCategory', label: 'Business Category', type: 'select', options: BUSINESS_CATEGORY_OPTIONS },
    { id: 'natureOfBusiness', label: 'Nature of Business/Profession/Job', type: 'text' },
    { id: 'industrySector', label: 'Industry Sector', type: 'select', options: INDUSTRY_OPTIONS },

    heading('h_bizdetails', 'Business Details'),
    { id: 'startYear', label: 'In which year did you start your Business/Profession/Job?', type: 'text' },
    { id: 'orgName', label: 'Name of Your Organisation', type: 'text', capitalize: 'words' },
    { id: 'gstNumber', label: 'GST Number', type: 'text' },
    { id: 'websiteUrl', label: 'Website URL', type: 'text' },
    { id: 'designation', label: 'Designation', type: 'select', options: DESIGNATION_OPTIONS },
    { id: 'peopleCount', label: 'Number of People in Organisation', type: 'select', options: PEOPLE_COUNT_OPTIONS },
    { id: 'kcfMember', label: 'KCF Member', type: 'radio', options: ['Yes', 'No'] },
    { id: 'attendedEvents', label: 'Events attended before', type: 'checkbox', options: EVENT_OPTIONS },

    heading('h_uploads', 'Uploads'),
    { id: 'profilePicture', label: 'Your Profile Picture', type: 'file' },
    { id: 'companyLogo', label: 'Your Company Logo', type: 'file' },
    { id: 'companyBrochure', label: 'Your Company Brochure', type: 'file' },

    heading('h_programme', 'Programme'),
    // NOTE: turn into a `select` with your real batches once known.
    { id: 'batch', label: 'Batch Selection', type: 'text' },

    heading('h_goals', 'Goals'),
    { id: 'achieve', label: 'What do you want to achieve out of your participation in Productivity Shastra?', type: 'textarea' },
    { id: 'losses', label: 'Kindly share any significant losses in your business life or personal life.', type: 'textarea' },

    heading('h_bizinfo', 'Business Information'),
    { id: 'lastQTurnover', label: 'Last Quarter Turnover', type: 'text' },
    { id: 'lastQNetProfit', label: 'Last Quarter Net Profit', type: 'text' },
    { id: 'annualTurnover', label: 'Annual Turnover FY24-25', type: 'text' },
    { id: 'annualNetProfit', label: 'Annual Net Profit FY24-25', type: 'text' },
    { id: 'highestTurnover', label: 'Highest Annual Turnover Ever', type: 'text' },
    { id: 'highestNetProfit', label: 'Highest Annual Net Profit Ever', type: 'text' },
    { id: 'employeesBelow', label: 'Employees directly below you', type: 'text' },
    { id: 'salesPeople', label: 'How many are sales people', type: 'text' },
    { id: 'revenuePerCustomer', label: 'Revenue or Margin from one new customer', type: 'text' },
    { id: 'goals1yr', label: 'Business Goals next 1 year', type: 'textarea' },
    { id: 'change1yr', label: 'What would you like to change in next 1 year', type: 'textarea' },
    { id: 'biggestChallenge', label: 'Biggest Challenge in achieving this goal', type: 'textarea' },
    { id: 'dislikeTasks', label: 'Things you dislike doing at work but still do', type: 'textarea' },
    { id: 'stepsTaken', label: 'Steps already taken previously', type: 'textarea' },

    heading('h_personallife', 'Personal Life'),
    { id: 'familyTime', label: 'Family Time each week', type: 'text' },
    { id: 'annualSavings', label: 'Annual Savings', type: 'text' },
    { id: 'personalDebt', label: 'Personal Debt', type: 'text' },
    { id: 'biggestPersonalGoal', label: 'Biggest Personal Goal', type: 'textarea' },
    { id: 'biggestPersonalChallenge', label: 'Biggest Personal Challenge', type: 'textarea' },
    { id: 'personalSteps', label: 'Steps already taken toward personal goal', type: 'textarea' },

    heading('h_habits', 'Habits'),
    { id: 'unproductiveHabits', label: 'Top 3 Unproductive Habits', type: 'textarea' },
    { id: 'whyUnable', label: 'Why unable to change these habits', type: 'textarea' },
    { id: 'trainingPrograms', label: 'Training programs attended', type: 'textarea' },
    { id: 'networking', label: 'Networking Groups/NGOs', type: 'textarea' },
    { id: 'googleDrive', label: 'Comfortable using Google Drive?', type: 'radio', options: ['Yes', 'No'] },
    { id: 'additional', label: 'Additional things to add', type: 'textarea' },
  ],
};

// ── 2 & 3. ECG (Pre / Post) ───────────────────────────────────────────────
// One shared question set. ECG Pre uses the ids as-is; ECG Post mirrors every
// question with a `post_` prefix so the two readings are stored separately.
const ecgGroups = [
  {
    key: 'goals',
    heading: 'Goals',
    items: [
      scale('goalClarity', 'Goal clarity'),
      scale('businessGoalClarity', 'Business goal clarity'),
      scale('savingsGoalClarity', 'Savings goal clarity'),
      scale('familyGoalClarity', 'Family goal clarity'),
      scale('hobbyGoalClarity', 'Hobby/Dream goal clarity'),
    ],
  },
  {
    key: 'clarity',
    heading: 'How clear are you',
    items: [
      scale('dontKnowHow', 'Don’t know how to do this thing'),
      scale('lackOfData', 'Lack of data'),
      scale('postponing', 'Postponing due to lack of information'),
      scale('meetingClarity', 'Clarity in meetings'),
      scale('actionExpectations', 'Action expectations'),
      scale('teamQuality', 'Team quality'),
    ],
  },
  {
    key: 'focus',
    heading: 'How focused are you',
    items: [
      scale('totality', 'Totality of all things'),
      scale('interrupted', 'Interrupted during day'),
      scale('overwhelmed', 'Overwhelmed by work'),
      scale('taskSwitching', 'Task switching'),
      scale('sayingYes', 'Saying yes to people'),
    ],
  },
  {
    key: 'plan',
    heading: 'How you plan',
    items: [
      scale('writeGoals', 'Write goals'),
      scale('detailedPlans', 'Detailed plans'),
      scale('deadlines', 'Deadlines'),
      scale('breakdownHandling', 'Breakdown handling'),
      scale('externalPlanning', 'External factor planning'),
      scale('weeklyPlanning', 'Weekly planning'),
      scale('dailyActionPlanning', 'Daily action planning'),
      scale('fixedPlanningTime', 'Fixed planning time'),
      scale('calendarScheduling', 'Calendar scheduling'),
      scale('reflectionHabit', 'Reflection habit'),
      scale('weeklyReview', 'Weekly review'),
      { id: 'planningTool', label: 'Which tool do you use for planning?', type: 'select', options: PLANNING_TOOL_OPTIONS },
    ],
  },
  {
    key: 'time',
    heading: 'How you spend time',
    items: [
      scale('timeTowardGoals', 'Time toward goals'),
      scale('doingWhatYouLove', 'Doing what you love'),
      scale('familyFriendsTime', 'Family/friends time'),
      scale('hobbyTime', 'Hobby time'),
      scale('newSkillsTime', 'New skills time'),
      scale('phoneScheduling', 'Phone response scheduling'),
      scale('emailScheduling', 'Email scheduling'),
      scale('socialMediaScheduling', 'Social media scheduling'),
      { id: 'salesTime', label: 'Time spent on sales per day', type: 'select', options: HOURS_OPTIONS },
      { id: 'wastedTime', label: 'Time wasted per day', type: 'select', options: HOURS_OPTIONS },
    ],
  },
  {
    key: 'day',
    heading: 'How your day goes',
    items: [
      scale('thingsTakeMoreTime', 'Things take more time'),
      scale('finishDailyTasks', 'Finish daily tasks'),
      scale('forgetUrgent', 'Forget urgent things'),
      scale('avoidUrgent', 'Avoid urgent things'),
      scale('emergencyHandling', 'Emergency handling'),
      scale('negativeSelfTalk', 'Negative self-talk awareness'),
      scale('motivationDisappearing', 'Motivation disappearing'),
      scale('enjoyedWorking', 'Enjoyed working today'),
    ],
  },
];

// Flatten ECG groups into wizard questions, with a `prefix` for the Post copy.
const buildEcgQuestions = (prefix = '') =>
  ecgGroups.flatMap((g) => [
    heading(`${prefix}ecg_h_${g.key}`, g.heading),
    ...g.items.map((q) => ({ ...q, id: `${prefix}${q.id}` })),
  ]);

const ecgPre = {
  id: 'ecg-pre',
  title: 'ECG Pre',
  description: 'Rate each statement from 1 (low) to 10 (high) — your reading before the program.',
  questions: buildEcgQuestions(''),
};

const ecgPost = {
  id: 'ecg-post',
  title: 'ECG Post',
  description: 'Rate each statement from 1 (low) to 10 (high) — your reading after the program.',
  questions: buildEcgQuestions('post_'),
};

// ── 4. CONSENT FORM ───────────────────────────────────────────────────────
// Name / cell number are NOT re-asked here — they were captured at registration
// and in the Health Check Form (no repeated questions). Only the legal approvals.
const consentForm = {
  id: 'consent',
  title: 'Consent Form',
  description: 'Please review and accept to complete your onboarding.',
  questions: [
    {
      id: 'proprietaryText',
      type: 'legal',
      // NOTE: paste the full proprietary agreement text from your form here.
      text: 'PROPRIETARY AGREEMENT\n\n[Full proprietary agreement text goes here — paste the exact legal text from your form and it will appear in this scrollable panel.]',
    },
    { id: 'agreeProprietary', label: 'Do you agree to fully abide by the proprietary agreement?', type: 'radio', options: ['YES', 'NO'], required: true },
    {
      id: 'groundRulesText',
      type: 'legal',
      // NOTE: paste the full Ground Rules & Operative Practices text from your form here.
      text: 'GROUND RULES & OPERATIVE PRACTICES\n\n[Full Ground Rules & Operative Practices text goes here — paste the exact text from your form and it will appear in this scrollable panel.]',
    },
    {
      id: 'agreeGroundRules',
      label: 'Do you agree to follow all Ground Rules & Operative Practices till end of Productivity Shastra?',
      type: 'radio',
      options: ['YES', 'NO'],
      required: true,
    },
  ],
};

// Per requirements EVERY question is compulsory. Mark all input questions as
// required (sub-section `heading`s and read-only `legal` text are skipped).
export const onboardingSections = [healthCheckForm, ecgPre, ecgPost, consentForm].map((section) => ({
  ...section,
  questions: section.questions.map((q) =>
    q.type === 'heading' || q.type === 'legal' ? q : { ...q, required: true }
  ),
}));
