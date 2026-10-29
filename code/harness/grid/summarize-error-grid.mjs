// Re-grades the error grid from its stored request logs (grid/error-grid.mjs output) with the suite's rules:
//  - accepted codes per failure, where the error table is ambiguous accepting every code it can be read to give
//    (empty, html: 100 or 303; novast: 101, 100 or 303), plus the group's general code and 900
//  - iab-vast-loader fires no pixels (no tracker; CAPS): its pixel duty is delegated, and the code it determines
//    (VASTLoaderError) is graded instead
//  - vastlint-client determines no code for a failed load: delegated, unless it resolved an ad it should not
// Usage: node grid/summarize-error-grid.mjs <error-grid.jsonl> <outDir>
import fs from 'node:fs';
import path from 'node:path';

const [, , inFile, outDir] = process.argv;
const rows = fs.readFileSync(inFile, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const ACCEPT = { http404: ['301'], http500: ['301'], timeout: ['301'], stall: ['301'], refused: ['301'], empty: ['100', '303'], html: ['100', '303'],
  malformed: ['100'], novast: ['101', '100', '303'], noad: ['303'], noad_err: ['303'], nouri: ['101', '100', '301', '303'] };
const ok = (f, c) => !!c && (ACCEPT[f].includes(c) || ACCEPT[f].some(w => c === w[0] + '00') || c === '900');
const out = [];
for (const r of rows) {
  const px = r.requests.map(s => s.split(' ')).filter(a => a[1] === 't').map(a => ({ path: a[2].split('?')[0], code: new URLSearchParams((a[2].split('?')[1] || '').split(' ')[0]).get('code') }));
  const at = l => px.filter(p => p.path === `${l}/err`).map(p => p.code);
  let verdict, detail;
  if (r.verdict === 'harness-error') { verdict = 'harness-error'; detail = r.detail; }
  else if (r.failure === null) { verdict = r.verdict; detail = r.detail; }
  else {
    const n = r.failure === 'nouri' ? r.level : r.level - 1;
    const levels = Array.from({ length: n }, (_, i) => at(`w${i + 1}`));
    const clientCode = (String(r.detail).match(/client code ([\d+]*)/) || [])[1] || '';
    if (r.resolved > 0 && r.failure !== 'nouri') { verdict = 'deviates'; detail = 'resolved an ad despite the failure'; }
    else if (r.client === 'vastlint') { verdict = 'delegated'; detail = `no code determined (${r.stoppedReason || r.error || ''})`.slice(0, 120); }
    else if (r.client === 'iabloader') {
      const codes = clientCode.split('+').filter(Boolean);
      verdict = !codes.length ? 'no-code' : codes.every(c => ok(r.failure, c)) ? 'conforms' : 'wrong-code';
      detail = `determined ${clientCode || 'none'}; ${String(r.error || '').slice(0, 80)}`;
    } else {
      const reached = levels.filter(a => a.length).length;
      const bad = levels.some(a => a.some(c => !ok(r.failure, c)));
      const dup = levels.some(a => a.length > 1);
      const vastOk = r.failure !== 'noad_err' || at('vast').length > 0;
      verdict = reached === 0 ? 'deviates' : reached < levels.length || !vastOk ? 'partial' : bad ? 'wrong-code' : dup ? 'repeated' : 'conforms';
      detail = levels.map((a, i) => `w${i + 1}:${a.join('+') || '-'}`).join(' ') + (r.failure === 'noad_err' ? ` vast:${at('vast').join('+') || '-'}` : '');
    }
  }
  const internal = /Cannot read propert|is not a function|undefined is not|null is not/.test(String(r.error || ''));
  out.push({ case: r.case, depth: r.depth, level: r.level, failure: r.failure, client: r.client, verdict, detail, uncaught: r.uncaught.length > 0, internalError: internal });
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'error-grid-graded.jsonl'), out.map(o => JSON.stringify(o)).join('\n') + '\n');
const clients = [...new Set(out.map(o => o.client))].sort();
const fails = ['(none)', ...Object.keys(ACCEPT)];
const lines = ['failure\taccepted codes\t' + clients.join('\t')];
for (const f of fails) {
  const cell = c => { const rs = out.filter(o => o.client === c && (f === '(none)' ? o.failure === null : o.failure === f)); const cnt = {}; for (const o of rs) cnt[o.verdict] = (cnt[o.verdict] || 0) + 1;
    const typical = [...new Set(rs.map(o => o.detail.replace(/w\d:/g, '').split(' ')[0]))].slice(0, 2).join(' / ');
    return Object.entries(cnt).map(([k, v]) => `${k} ${v}`).join(', ') + (f === '(none)' ? '' : ` [${typical.slice(0, 40)}]`) + (rs.some(o => o.uncaught) ? ' +uncaught' : '') + (rs.some(o => o.internalError) ? ' +internal' : ''); };
  lines.push([f, f === '(none)' ? 'resolve d<=6; d=7 may 302' : ACCEPT[f].join('/'), ...clients.map(cell)].join('\t'));
}
fs.writeFileSync(path.join(outDir, 'error-grid-summary.tsv'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
