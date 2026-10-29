// Compares this machine's results with the reference results shipped in expected/, and checks file hashes.
// Usage: node tools/compare.mjs <pkgRoot> <resultsDir>   -> writes <resultsDir>/compare.json and prints a summary
import fs from 'node:fs';
import path from 'node:path';
const [pkg, res] = process.argv.slice(2);
const E = path.join(pkg, 'expected');
const readTsv = f => { if (!fs.existsSync(f)) return null; const rows = fs.readFileSync(f, 'utf8').trim().split('\n').map(l => l.split('\t')); const h = rows[0]; const m = {}; for (const r of rows.slice(1)) for (let i = 0; i < h.length; i++) if (!['id', 'area', 'strength', 'spec', 'claim'].includes(h[i])) m[`${r[0]}|${h[i]}`] = r[i]; return m; };
const diff = (exp, got, { skipExpected = [] } = {}) => {
  if (!exp) return { status: 'no reference' };
  if (!got) return { status: 'missing result' };
  // a partial run (--only) is compared on the requirement ids it contains
  const gotIds = new Set(Object.keys(got).map(k => k.split('|')[0]));
  const keys = Object.keys(exp).filter(k => gotIds.has(k.split('|')[0]) && !skipExpected.includes(exp[k]));
  const missingIds = [...new Set(Object.keys(exp).map(k => k.split('|')[0]))].filter(id => !gotIds.has(id));
  const changed = keys.filter(k => exp[k] !== got[k]).map(k => ({ cell: k, expected: exp[k], got: got[k] ?? null }));
  return { status: changed.length ? 'differs' : 'identical', cells: keys.length, differing: changed.length, idsNotRun: missingIds.length, changed };
};
const out = { comparedAt: new Date().toISOString(), node: diff(readTsv(path.join(E, 'node-matrix.tsv')), readTsv(path.join(res, 'node/matrix.tsv'))), browsers: {} };
const g2e = path.join(E, 'gate2-summary.json'), g2r = path.join(res, 'gate2/summary.json');
if (fs.existsSync(g2e) && fs.existsSync(g2r)) {
  const a = JSON.parse(fs.readFileSync(g2e, 'utf8')).clients, b = JSON.parse(fs.readFileSync(g2r, 'utf8')).clients;
  out.gate2 = Object.fromEntries(Object.keys(a).map(k => [k, { expected: a[k].parsed, got: b[k] ? b[k].parsed : null, samples: a[k].samples }]));
}
for (const b of ['chromium', 'firefox', 'webkit', 'chrome']) {
  const got = readTsv(path.join(res, `browser/${b}/matrix.tsv`));
  // the shipped browser reference was produced in Chromium; firefox and webkit are compared against it to show where engines differ
  out.browsers[b] = { againstChromiumReference: diff(readTsv(path.join(E, 'browser-chromium-matrix.tsv')), got),
    // cells graded n/a under Node.js (browser-only requirements and their kin) are left out of the cross-layer check
    againstNodeReference: diff(readTsv(path.join(E, 'node-matrix.tsv')), got, { skipExpected: ['n/a'] }) };
}
const envF = path.join(res, 'env.json'), hashE = path.join(E, 'file-hashes.json');
if (fs.existsSync(envF) && fs.existsSync(hashE)) {
  const env = JSON.parse(fs.readFileSync(envF, 'utf8')).hashes, ref = JSON.parse(fs.readFileSync(hashE, 'utf8'));
  out.hashes = {};
  for (const group of Object.keys(ref)) {
    const a = ref[group], b = env[group] || {};
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    out.hashes[group] = { files: keys.length, mismatched: keys.filter(k => a[k] !== b[k]).map(k => ({ file: k, expected: a[k] || null, got: b[k] || null })) };
  }
}
fs.writeFileSync(path.join(res, 'compare.json'), JSON.stringify(out, null, 1));
const line = (name, d) => console.log(`${name.padEnd(34)} ${d.status}${d.differing ? ` (${d.differing}/${d.cells} cells differ)` : d.cells ? ` (${d.cells} cells)` : ''}`);
line('Node suite vs reference', out.node);
for (const [b, d] of Object.entries(out.browsers)) { line(`${b} vs Chromium reference`, d.againstChromiumReference); line(`${b} vs Node reference (graded cells)`, d.againstNodeReference); }
if (out.gate2) console.log('gate 2 parsed (expected/got):', Object.entries(out.gate2).map(([k, v]) => `${k} ${v.expected}/${v.got}`).join(', '));
if (out.hashes) for (const [g, h] of Object.entries(out.hashes)) console.log(`hashes ${g.padEnd(14)} ${h.mismatched.length ? h.mismatched.length + ' of ' + h.files + ' differ' : 'all ' + h.files + ' match'}`);
