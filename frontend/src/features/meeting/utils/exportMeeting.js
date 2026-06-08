// Export helpers for a single meeting record.
//   exportMeetingToPdf(meeting)   -> downloads MeetingName_YYYY-MM-DD.pdf
//   exportMeetingToExcel(meeting) -> downloads MeetingName_YYYY-MM-DD.xlsx
//
// Both pull the canonical 18 questions/answers from the shared questions module
// so they stay in sync with the rest of the app.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { allQuestions, TOTAL_QUESTIONS, getAnswerText } from '../data/questions';
import { formatDate, formatEstTime } from './meetingFormat';

// Brand palette (kept literal so the utility has no styling dependencies).
const RED = [220, 38, 38];   // #DC2626
const BLACK = [0, 0, 0];     // #000000
const GRAY = [107, 114, 128]; // #6B7280

// ---- shared helpers ----------------------------------------------------

// YYYY-MM-DD in local time (for the file name).
const isoDay = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Strip characters that are illegal in file names; collapse spaces to underscores.
const safeName = (name) =>
  (name || 'Meeting')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')   // illegal filename chars
    .replace(/\s+/g, '_')            // spaces -> underscores
    .replace(/_+/g, '_')             // collapse repeats
    .replace(/^_|_$/g, '') || 'Meeting';

const buildFileName = (meeting, ext) =>
  `${safeName(meeting.title)}_${isoDay(meeting.createdDate)}.${ext}`;

// Returns [{ number, question, answer }] for all 18 questions.
const buildRows = (meeting) =>
  allQuestions.map((q, idx) => ({
    number: idx + 1,
    question: q.label,
    answer: getAnswerText(q, meeting.answers) || '—',
  }));

// Flatten notes into a single readable block (one note per line).
const notesText = (meeting) =>
  meeting.notes && meeting.notes.length
    ? meeting.notes
        .map((n, i) => `${i + 1}. ${n.text} (${formatDate(n.createdDate)})`)
        .join('\n')
    : 'No notes recorded.';

// ---- PDF ---------------------------------------------------------------

export function exportMeetingToPdf(meeting) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 46;

  // Red header band
  doc.setFillColor(...RED);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Small brand label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...RED);
  doc.text('MEETING SUCCESS MAXIMIZER', margin, y);
  y += 24;

  // Meeting name (title)
  doc.setFontSize(20);
  doc.setTextColor(...BLACK);
  const titleLines = doc.splitTextToSize(meeting.title || 'Untitled Meeting', pageWidth - margin * 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 6;

  // Meta line: date | status | estimated time
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  const meta = [
    `Date: ${formatDate(meeting.createdDate)}`,
    `Status: ${meeting.status || '—'}`,
    `Estimated time: ${formatEstTime(meeting.estTime)}`,
  ].join('     |     ');
  doc.text(meta, margin, y);
  y += 22;

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  // Meeting Notes section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...BLACK);
  doc.text('Meeting Notes', margin, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  const noteLines = doc.splitTextToSize(notesText(meeting), pageWidth - margin * 2);
  doc.text(noteLines, margin, y);
  y += noteLines.length * 13 + 18;

  // Actual Meeting Reflection section (only when captured)
  if (meeting.reflection) {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 46;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BLACK);
    doc.text('Actual Meeting Reflection', margin, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    const rating =
      typeof meeting.reflection.planningHelpfulness === 'number'
        ? `${meeting.reflection.planningHelpfulness}/5`
        : '—';
    doc.text(`Planning Experience Rating: ${rating}`, margin, y);
    y += 15;
    const learnLines = doc.splitTextToSize(
      `Your Learnings (Planned Meeting vs Actual Meeting): ${meeting.reflection.learnings || 'No learnings recorded.'}`,
      pageWidth - margin * 2
    );
    doc.text(learnLines, margin, y);
    y += learnLines.length * 13 + 18;
  }

  // Meeting Plan Details heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...BLACK);
  doc.text(`Meeting Plan Details (${TOTAL_QUESTIONS} Questions)`, margin, y);
  y += 10;

  // Questions & Answers table (autoTable handles page breaks)
  autoTable(doc, {
    startY: y + 6,
    margin: { left: margin, right: margin },
    head: [['#', 'Question', 'Answer']],
    body: buildRows(meeting).map((r) => [r.number, r.question, r.answer]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      valign: 'top',
      textColor: BLACK,
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: RED,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 230 },
      2: { cellWidth: 'auto' },
    },
  });

  // Footer page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 16,
      { align: 'right' }
    );
  }

  doc.save(buildFileName(meeting, 'pdf'));
}

// ---- Excel -------------------------------------------------------------

export function exportMeetingToExcel(meeting) {
  // Top meta block + blank row + Q/A table header + 18 rows.
  const reflectionRating =
    meeting.reflection && typeof meeting.reflection.planningHelpfulness === 'number'
      ? `${meeting.reflection.planningHelpfulness}/5`
      : '—';
  const reflectionLearnings =
    (meeting.reflection && meeting.reflection.learnings) || 'No learnings recorded.';

  const aoa = [
    ['Meeting Name', meeting.title || 'Untitled Meeting'],
    ['Meeting Date', formatDate(meeting.createdDate)],
    ['Meeting Status', meeting.status || '—'],
    ['Estimated Time', formatEstTime(meeting.estTime)],
    ['Meeting Notes', notesText(meeting)],
    [],
    ['Actual Meeting Reflection', ''],
    ['Planning Experience Rating', reflectionRating],
    ['Your Learnings: Planned Meeting vs Actual Meeting', reflectionLearnings],
    [],
    ['Question Number', 'Question', 'Answer'],
    ...buildRows(meeting).map((r) => [r.number, r.question, r.answer]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths for readability.
  ws['!cols'] = [
    { wch: 16 },  // label / question number
    { wch: 70 },  // question
    { wch: 60 },  // answer
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Meeting Details');

  // writeFile triggers an automatic browser download.
  XLSX.writeFile(wb, buildFileName(meeting, 'xlsx'));
}
