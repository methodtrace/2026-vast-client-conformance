// Recovers the PRNG seed of a stored fuzz campaign WITHOUT running any client.
// It takes the generation code of code/harness/fuzz/fuzz.mjs unmodified (everything above the "running and classifying" marker:
// corpus loading order, mulberry32, the mutation operators, the skip rule), appends a loop that re-seeds the generator for each
// candidate seed, and compares the generated (corpus seed name, mutation list) sequence with the stored cases.jsonl(.gz) in order.
// Usage: node evidence/checks/fuzz-repros/fuzz-seed-check.mjs <cases.jsonl.gz> [--seeds 0-100,20261017] [--per-round 300]
//   prints, per candidate with at least one matching case, the number of matching leading cases; a seed that matches all stored
//   cases is then also checked for case ids, rounds, the per-round counts and the total number of draws (rounds x per-round).
// Needs the same corpus as the campaign (code/harness/suite/vectors and sources/iab-vast-samples).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const P = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const FUZZ_DIR = path.join(P, 'code/harness/fuzz');
const args = process.argv.slice(2);
const stored = path.resolve(args[0] || '');
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const seeds = opt('seeds', '0-100').split(',').flatMap(t => { const m = t.match(/^(\d+)-(\d+)$/); return m ? Array.from({ length: m[2] - m[1] + 1 }, (_, i) => Number(m[1]) + i) : [Number(t)]; });
const perRound = opt('per-round', '300');

const src = fs.readFileSync(path.join(FUZZ_DIR, 'fuzz.mjs'), 'utf8');
let head = src.slice(0, src.indexOf('// ---- running and classifying'));
head = head.replace("import { startServer } from '../server.mjs';\n", '').replace("import { execFile } from 'node:child_process';\nimport { promisify } from 'node:util';\n", '').replace('const pexec = promisify(execFile);\n', '');
const core = head + `
import zlibX from 'node:zlib';
const storedPath = arg('stored'), seedList = arg('list').split(',').map(Number);
const raw = fs.readFileSync(storedPath);
const cases = (storedPath.endsWith('.gz') ? zlibX.gunzipSync(raw) : raw).toString().trim().split('\\n').map(JSON.parse);
const K = (name, descs) => JSON.stringify([name, descs]);
// st is the generator state of fuzz.mjs ("let st = seed >>> 0"); setting it re-seeds rnd, pick and mutate exactly as --seed would
function prefix(s) {
  st = s >>> 0; let n = 0;
  for (let draws = 0; n < cases.length && draws < 2 * cases.length; draws++) {
    const sd = pick(seeds); const m = mutate(sd); if (!m) continue;
    if (K(sd.name, m.descs) !== K(cases[n].seed, cases[n].mutations)) break;
    n++;
  }
  return n;
}
function fullCheck(s) {
  // same round structure as fuzz.mjs: rounds of PER_ROUND draws, a skipped draw gives no case and no id
  st = s >>> 0; let caseN = 0, bad = 0; const perRoundRan = []; const rounds = Math.max(...cases.map(c => c.round));
  for (let round = 1; round <= rounds; round++) {
    let ran = 0;
    for (let i = 0; i < PER_ROUND; i++) {
      const sd = pick(seeds); const m = mutate(sd); if (!m) continue;
      ran++; const id = 'f' + String(++caseN).padStart(5, '0'); const c = cases[caseN - 1];
      if (!c || c.id !== id || c.round !== round || K(sd.name, m.descs) !== K(c.seed, c.mutations)) bad++;
    }
    perRoundRan.push(ran);
  }
  const stRan = Array.from({ length: rounds }, (_, i) => cases.filter(c => c.round === i + 1).length);
  return { rounds, draws: rounds * PER_ROUND, generatedCases: caseN, storedCases: cases.length, mismatches: bad, perRoundGenerated: perRoundRan, perRoundStored: stRan, perRoundEqual: JSON.stringify(perRoundRan) === JSON.stringify(stRan) };
}
const matches = []; let best = 0;
for (const s of seedList) { const n = prefix(s); best = Math.max(best, n); if (n > 0) matches.push({ seed: s, matchingCases: n }); }
const res = { corpus: seeds.length, stored: cases.length, tried: seedList.length, longestMatch: best, seedsWithAnyMatch: matches, full: {} };
for (const m of matches) if (m.matchingCases === cases.length) res.full[m.seed] = fullCheck(m.seed);
console.log(JSON.stringify(res, null, 1));
`;
const tmp = path.join(FUZZ_DIR, '.fuzz-seed-core.mjs');
fs.writeFileSync(tmp, core);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fuzz-seed-check-')); // fuzz.mjs creates its outDir (argv[2]) as a side effect
try {
  process.stdout.write(execFileSync('node', [tmp, scratch, '--stored', stored, '--list', seeds.join(','), '--per-round', perRound], { encoding: 'utf8', maxBuffer: 64 << 20 }));
} finally { fs.rmSync(tmp, { force: true }); fs.rmSync(scratch, { recursive: true, force: true }); }
