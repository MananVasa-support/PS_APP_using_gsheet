/**
 * Client-side export helpers — no backend or extra dependency required.
 */

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download an array of flat objects as a CSV file. */
export function downloadCsv(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

/**
 * Open a print-friendly window and trigger the browser's "Save as PDF" dialog.
 * `sections` is an array of { heading, rows } where rows are flat objects.
 */
export function exportPdf(title, sections = []) {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;

  const tables = sections
    .map((s) => {
      if (!s.rows?.length) return `<h2>${s.heading}</h2><p>No data.</p>`;
      const headers = Object.keys(s.rows[0]);
      const head = headers.map((h) => `<th>${h}</th>`).join('');
      const body = s.rows
        .map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`)
        .join('');
      return `<h2>${s.heading}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; color: #0f172a; padding: 32px; }
          h1 { color: #e51d2b; margin-bottom: 4px; }
          .sub { color: #64748b; margin-top: 0; font-size: 13px; }
          h2 { margin-top: 28px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
          th { background: #f8fafc; text-transform: capitalize; }
        </style>
      </head>
      <body>
        <h1>Productivity Shastra</h1>
        <p class="sub">${title} · generated ${new Date().toLocaleString()}</p>
        ${tables}
        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>
  `);
  win.document.close();
}
