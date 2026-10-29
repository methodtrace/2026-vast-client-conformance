// Picks the replay test set for a stored campaign: the earliest first-example case of each root cause (results/fuzz/analysis/classes-verified.tsv,
// column first_case_r3) plus 50 other stored cases chosen by a seeded shuffle (mulberry32, default seed 16), so the choice is reproducible.
// Usage: node evidence/checks/fuzz-repros/fuzz-replay-pick.mjs results/fuzz/analysis/classes-verified.tsv results/fuzz/fuzz-r3/cases.jsonl.gz [shuffleSeed] > pick.json   (field "all" is the --only list)
import fs from 'node:fs'; import zlib from 'node:zlib';
const tsv = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(l => l.split('\t'));
const h = tsv[0], iFirst = h.indexOf('first_case_r3'), iRoot = h.indexOf('root_cause');
const cases = zlib.gunzipSync(fs.readFileSync(process.argv[3])).toString().trim().split('\n').map(JSON.parse);
const roots = new Map();
for (const r of tsv.slice(1)) { const c = r[iFirst]; if (c === '-' || !c) continue; const root = r[iRoot]; if (!roots.has(root) || c < roots.get(root)) roots.set(root, c); }
const ex = [...roots.entries()].sort();
const exSet = new Set(ex.map(e => e[1]));
// seeded shuffle (mulberry32 with a fixed seed so the selection is reproducible)
let st = Number(process.argv[4] || 16) >>> 0; const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pool = cases.map(c => c.id).filter(i => !exSet.has(i));
for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
const rnd50 = pool.slice(0, 50).sort();
console.log(JSON.stringify({ rootExamples: Object.fromEntries(ex), random: rnd50, all: [...exSet, ...rnd50].sort() }));
