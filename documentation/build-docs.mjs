// Converts each Markdown doc into a print-ready, styled HTML file.
// A companion step (build-pdf, run via the shell) then uses headless Chrome to
// turn each HTML into an official PDF. Re-run after editing any .md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { marked } from 'marked';

const DOCS = [
  { md: 'README.md', title: 'Productivity Shastra — Documentation Index' },
  { md: '01-Architecture.md', title: 'Architecture' },
  { md: '02-PRD.md', title: 'Product Requirements Document' },
  { md: '03-TRD.md', title: 'Technical Requirements Document' },
  { md: '04-App-Flow.md', title: 'App Flow' },
  { md: '05-Backend-Schema.md', title: 'Backend Schema (Proposed)' },
];

const CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1d; line-height: 1.55;
         font-size: 12px; margin: 0; }
  .doc-head { border-bottom: 3px solid #e51d2b; padding-bottom: 10px; margin-bottom: 18px; }
  .doc-head .brand { color: #e51d2b; font-weight: 800; letter-spacing: .06em;
         text-transform: uppercase; font-size: 11px; }
  .doc-head h1 { margin: 4px 0 0; font-size: 24px; }
  h1, h2, h3, h4 { color: #0b0b0c; line-height: 1.25; }
  h2 { font-size: 17px; margin-top: 22px; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; }
  h3 { font-size: 14px; margin-top: 16px; }
  h4 { font-size: 12.5px; margin-top: 12px; }
  p, li { font-size: 12px; }
  code { font-family: 'Consolas', monospace; background: #f4f4f5; padding: 1px 4px;
         border-radius: 3px; font-size: 11px; }
  pre { background: #f7f7f8; border: 1px solid #e4e4e7; border-radius: 6px; padding: 10px 12px;
        overflow-x: auto; page-break-inside: avoid; }
  pre code { background: none; padding: 0; font-size: 10.5px; line-height: 1.4; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; page-break-inside: avoid; }
  th, td { border: 1px solid #d1d1d6; padding: 5px 8px; text-align: left; font-size: 11px; vertical-align: top; }
  th { background: #fae9eb; color: #0b0b0c; }
  tr:nth-child(even) td { background: #fafafa; }
  a { color: #c11420; text-decoration: none; }
  blockquote { border-left: 3px solid #e51d2b; margin: 10px 0; padding: 2px 12px; color: #3f3f46;
        background: #fcf6f6; }
  .doc-foot { margin-top: 26px; border-top: 1px solid #e4e4e7; padding-top: 8px; color: #71717a;
        font-size: 10px; }
`;

mkdirSync('.build', { recursive: true });
for (const { md, title } of DOCS) {
  const body = marked.parse(readFileSync(md, 'utf8'));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>${CSS}</style></head><body>
<div class="doc-head"><div class="brand">Productivity Shastra</div><h1>${title}</h1></div>
${body}
<div class="doc-foot">Productivity Shastra — official project documentation. Source: documentation/${md}</div>
</body></html>`;
  const out = `.build/${md.replace(/\.md$/, '.html')}`;
  writeFileSync(out, html);
  console.log('wrote', out);
}
console.log('HTML generated. Now run the Chrome print step to produce PDFs.');
