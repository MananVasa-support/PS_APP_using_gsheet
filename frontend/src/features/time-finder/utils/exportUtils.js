import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const fmtTime = (t) => (t ? `${t.hours || 0}h ${t.minutes || 0}m` : '0h 0m');
export const toMin = (t) => (t ? (t.hours || 0) * 60 + (t.minutes || 0) : 0);
export const fmtMins = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

const fmtMinsRounded = (m) => {
  const r = Math.round(m);
  return `${Math.floor(r / 60)}h ${r % 60}m`;
};
const normKey = (s) => (s || '').toLowerCase().replace(/\s+/g, '_');

const calcWeeklyMinutes = (time, recurrence, days) => {
  const per = toMin(time);
  switch (normKey(recurrence)) {
    case 'daily':
      return per * 7;
    case 'weekly':
      return per * (days?.length || 0);
    case '10_days':
      return (per / 10) * 7;
    case '15_days':
      return (per / 15) * 7;
    case 'monthly':
      return (per / 30) * 7;
    case 'quarterly':
      return (per / 90) * 7;
    case 'annually':
      return (per / 365) * 7;
    default:
      return per;
  }
};

const recurrenceLabel = (r) =>
  r.recurrence === 'Weekly' && r.days?.length > 0
    ? `Weekly (${r.days.join(', ')})`
    : r.recurrence || '-';

const buildRows = (a) =>
  (a.routines || []).map((r) => ({
    Routine: r.name,
    Recurrence: recurrenceLabel(r),
    'Time Per Instance': fmtTime(r.time),
    'Time Per Day': fmtMinsRounded(calcWeeklyMinutes(r.time, r.recurrence, r.days) / 7),
    'Saving Type': r.action || '-',
    'Time Saved (per instance)': fmtTime(r.timeSaving),
  }));

// Auto-download a Blob without any "Save As" prompt.
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportExcel = (a) => {
  const dateStr = new Date(a.createdAt).toLocaleDateString().replace(/\//g, '-');
  const worksheet = XLSX.utils.json_to_sheet(buildRows(a));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment');
  const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `assessment-${dateStr}.xlsx`);
};

export const exportPdf = (a) => {
  const dateObj = new Date(a.createdAt);
  const dateStr = dateObj.toLocaleDateString();
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fileDate = dateStr.replace(/\//g, '-');
  const totalSaved = fmtMins((a.routines || []).reduce((acc, r) => acc + toMin(r.timeSaving), 0));
  const rows = buildRows(a);

  const doc = new jsPDF();
  const RED = [239, 68, 68];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title (big bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text(`Assessment - ${dateStr}`, 14, 20);

  // Sub info: Date | Status | Estimated time
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${dateStr} ${timeStr}   |   Status: Completed   |   Total Time Saved: ${totalSaved}`,
    14,
    28
  );

  // Section heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text('Routine Details', 14, 40);

  // Table — red header, clean borders, alternating rows
  autoTable(doc, {
    startY: 45,
    head: [
      [
        '#',
        'Routine',
        'Recurrence',
        'Time Per Instance',
        'Time Per Day',
        'Saving Type',
        'Time Saved (per instance)',
      ],
    ],
    body: rows.map((r, i) => [
      i + 1,
      r.Routine,
      r.Recurrence,
      r['Time Per Instance'],
      r['Time Per Day'],
      r['Saving Type'],
      r['Time Saved (per instance)'],
    ]),
    headStyles: { fillColor: RED, textColor: 255, fontStyle: 'bold', halign: 'left' },
    styles: { fontSize: 9, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' } },
  });

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Total Time Saved: ${totalSaved}`, 14, doc.lastAutoTable.finalY + 10);

  // Pagination footer: "Page X of Y" on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }

  downloadBlob(doc.output('blob'), `assessment-${fileDate}.pdf`);
};
