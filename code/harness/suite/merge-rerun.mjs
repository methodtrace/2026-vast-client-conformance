// Builds one reference results folder from a stored reference and a rerun of some requirements: every stored cell is
// regraded with the current oracles (suite/regrade.mjs), then each cell the rerun covers (same requirement and
// configuration) is replaced by the rerun's cell. Writes results.jsonl, matrix.tsv and summary.json in the formats
// the runners write (matrix.tsv takes strength, spec and claim from the current suite/requirements.mjs).
// Usage: node suite/merge-rerun.mjs --base <results.jsonl> --rerun <results.jsonl> --out <dir>
//          [--base-label <text>] [--rerun-label <text>] [--rerun-summary <summary.json>]
// Every output row carries source: the base label or the rerun label. A regraded row whose verdict changed carries
// regraded: { from, fromDetail }.
import fs from 'node:fs';
import path from 'node:path';
import { REQUIREMENTS } from './requirements.mjs';
import { regradeRow } from './regrade.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const read = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const base = read(arg('base')), rerun = read(arg('rerun'));
const out = arg('out'), baseLabel = arg('base-label', arg('base')), rerunLabel = arg('rerun-label', arg('rerun'));
const byId = new Map(REQUIREMENTS.map(r => [r.id, r]));
const key = r => `${r.id}\t${r.config}`;
const fresh = new Map(rerun.map(r => [key(r), r]));
const layer = base[0].browser ? 'browser' : 'node';

const rows = [];
let regradedChanged = 0, replaced = 0, replacedChanged = 0;
for (const row of base) {
  const req = byId.get(row.id);
  if (!req) throw new Error(`unknown requirement ${row.id}`);
  const current = { ...row, strength: req.strength, vector: req.vector, ...('spec' in row ? { spec: req.spec } : {}), ...('claim' in row ? { claim: req.claim } : {}) };
  const re = fresh.get(key(row));
  if (re) {
    replaced++;
    if (re.verdict !== row.verdict) replacedChanged++;
    rows.push({ ...re, source: rerunLabel });
    fresh.delete(key(row));
    continue;
  }
  const v = regradeRow(row, layer);
  if (v.verdict !== row.verdict) regradedChanged++;
  rows.push({ ...current, verdict: v.verdict, detail: v.detail, source: baseLabel,
    ...(v.verdict !== row.verdict ? { regraded: { from: row.verdict, fromDetail: row.detail } } : {}) });
}
if (fresh.size) throw new Error(`rerun cells with no stored cell: ${[...fresh.keys()].join(', ')}`);

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'results.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const cfgs = [...new Set(rows.map(r => r.config))];
const ids = [...new Set(rows.map(r => r.id))];
const cell = new Map(rows.map(r => [key(r), r]));
const tsv = [layer === 'node' ? 'id\tarea\tstrength\tspec\tclaim\t' + cfgs.join('\t') : 'id\tarea\tstrength\t' + cfgs.join('\t')];
for (const id of ids) {
  const req = byId.get(id);
  const head = layer === 'node' ? [id, req.area, req.strength, req.spec, req.claim] : [id, req.area, req.strength];
  tsv.push([...head, ...cfgs.map(c => (cell.get(`${id}\t${c}`) || {}).verdict)].join('\t'));
}
fs.writeFileSync(path.join(out, 'matrix.tsv'), tsv.join('\n') + '\n');
const verdicts = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
const summary = { built: new Date().toISOString(), layer, cells: rows.length, configurations: cfgs, verdicts,
  base: { file: baseLabel, cells: base.length, regraded: base.length - replaced, regradedChanged },
  rerun: { file: rerunLabel, cells: replaced, verdictChangedFromBase: replacedChanged, requirements: [...new Set(rerun.map(r => r.id))] } };
if (layer === 'browser') { summary.browser = rows[0].browser; summary.browserVersion = rows[0].browserVersion; }
if (arg('rerun-summary')) summary.rerun.runSummary = JSON.parse(fs.readFileSync(arg('rerun-summary'), 'utf8'));
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
console.log(`${out}: ${rows.length} cells; ${base.length - replaced} regraded (${regradedChanged} changed), ${replaced} from the rerun (${replacedChanged} differ from the stored cell)`);
