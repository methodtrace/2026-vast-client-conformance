// Writes MANIFEST.sha256 over every file in the results directory (to detect truncation or edits in transit).
// Usage: node tools/seal.mjs <resultsDir>
import fs from 'node:fs';
import path from 'node:path';
import { hashTree } from './hashes.mjs';
const dir = process.argv[2];
// run.log, stages.tsv and the seal stage's own log are still being written while the seal runs, so they are listed
// as unsealed rather than given a hash that cannot match.
const LIVE = ['logs/run.log', 'logs/11-seal.log', 'stages.tsv'];
const h = hashTree(dir, ['.'], /(^|\/)(MANIFEST\.sha256)$/);
for (const f of LIVE) delete h[f];
const lines = Object.entries(h).filter(([f]) => f !== 'MANIFEST.sha256').map(([f, s]) => `${s}  ${f.replace(/^\.\//, '')}`).sort((a, b) => a.slice(66).localeCompare(b.slice(66)));
fs.writeFileSync(path.join(dir, 'MANIFEST.sha256'), lines.join('\n') + '\n' + LIVE.map(f => `# unsealed (written during sealing): ${f}`).join('\n') + '\n');
console.log(`sealed ${lines.length} files`);
