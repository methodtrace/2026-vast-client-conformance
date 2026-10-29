// sha256 of every file under the given roots (skipping node_modules), as { relativePath: sha256 }.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function hashTree(base, roots, skip = /(^|\/)(node_modules|scratch|\.git)(\/|$)/) {
  const out = {};
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const f = path.join(d, e.name); const rel = path.relative(base, f);
    if (skip.test(rel)) continue;
    if (e.isDirectory()) walk(f); else out[rel] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  } };
  for (const r of roots) { const p = path.join(base, r); if (fs.existsSync(p)) { if (fs.statSync(p).isDirectory()) walk(p); else out[r] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [base, out, ...roots] = process.argv.slice(2);
  fs.writeFileSync(out, JSON.stringify(hashTree(base, roots), null, 1));
}
