// Rebuilds the full IAB VAST_Samples tree (all paths in MANIFEST.tsv) from the stored copies in sources/,
// which keep one file per distinct content hash.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function materializeSamples(storedRoot, outRoot) {
  const manifest = fs.readFileSync(path.join(storedRoot, 'MANIFEST.tsv'), 'utf8').trim().split('\n').slice(1)
    .map(l => { const [sha256, p] = l.split('\t'); return { sha256, path: p }; });
  const byHash = new Map();
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f); else if (f.endsWith('.xml')) byHash.set(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'), f);
  } };
  walk(storedRoot);
  for (const m of manifest) {
    const src = byHash.get(m.sha256);
    if (!src) throw new Error(`no stored copy for ${m.path} (${m.sha256})`);
    const dst = path.join(outRoot, m.path);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  return manifest;
}

export const versionOf = p => { const m = p.match(/^VAST ([\d.]+)/); return m ? m[1] : (p.startsWith('VAST 1-2.0') ? '2.0' : null); };
