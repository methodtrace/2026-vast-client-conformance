// Regrades stored results with the current oracles, without rerunning any client: each row's observation is rebuilt
// from its stored request log and result fields, then graded exactly as the runners grade (suite/evaluate.mjs).
// Usage: node suite/regrade.mjs <results.jsonl> [--layer node|browser] [--only REGEX] [--out <regraded.jsonl>]
// Prints every cell whose verdict changes, and a count. Rows whose requirement no longer exists are reported.
// Output rows carry the current verdict, detail and strength; a row whose verdict changed also carries
// regraded: { from, fromDetail }.
//
// Rows written by older runners store less of the adapter result than the oracles read; rebuild() restores it:
//   resolved          stored as ad ID strings: each becomes { id } (the oracles read only the IDs); rows that store
//                     resolvedAds (the adapter's resolved objects) use those
//   notDrivableKinds  not stored for IMA: restored to the list the IMA adapter returns (browser/ima-adapter.mjs)
//   iconRendered      not stored: restored from the adapter step 'icon found' or 'no icon element' (video-ad-sdk,
//                     rmp-vast); left undefined for clients that record neither
//   skip              stored as { before, after, skipDelay }: restored to the skipControl* fields
// Rows from the current runners store these fields directly and are used as stored.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { REQUIREMENTS, CAPS } from './requirements.mjs';
import { observation, grade } from './evaluate.mjs';

// the kinds of script the IMA adapter cannot drive (browser/ima-adapter.mjs returns the same list)
const IMA_NOT_DRIVABLE_KINDS = ['click', 'rewind', 'icon'];

// a stored request line is "<t> <kind> <path><query>[ range=...][ [status]]"
export function parseLog(lines) {
  return (lines || []).map(line => {
    const m = line.match(/^(\d+) (\S+) (\S+)(.*)$/);
    if (!m) return null;
    const [, t, kind, pq, rest] = m;
    const qi = pq.indexOf('?');
    const st = rest.match(/\[(\d+)\]/);
    return { t: Number(t), kind, path: qi >= 0 ? pq.slice(0, qi) : pq, query: qi >= 0 ? pq.slice(qi) : '', status: st ? Number(st[1]) : null };
  }).filter(Boolean);
}

// the adapter result an oracle sees, rebuilt from a stored row
export function rebuild(row) {
  const res = { ...row.result };
  if (res.skip) { res.skipControlBeforeOffset = res.skip.before; res.skipControlAfterOffset = res.skip.after; res.skipDelay = res.skip.skipDelay; }
  if (res.notDrivable === undefined) res.notDrivable = null;
  res.resolved = res.resolvedAds || (res.resolved || []).map(a => (typeof a === 'string' || a === null ? { id: a } : a));
  if (row.client === 'ima' && res.notDrivableKinds == null) res.notDrivableKinds = IMA_NOT_DRIVABLE_KINDS;
  if (res.iconRendered == null) {
    delete res.iconRendered;
    const st = res.steps || [];
    if (st.some(x => x && x.step === 'icon found')) res.iconRendered = true;
    else if (st.some(x => x && x.step === 'no icon element')) res.iconRendered = false;
  }
  return { res, log: parseLog(row.requests) };
}

const byId = new Map(REQUIREMENTS.map(r => [r.id, r]));
// grades one stored row with the current oracles: { verdict, detail, req } (req undefined for an unknown requirement)
export function regradeRow(row, layer = row.browser ? 'browser' : 'node') {
  const req = byId.get(row.id);
  if (!req) return { req };
  const { res, log } = rebuild(row);
  const v = grade(req, observation(res, log, row.client, row.config), { caps: CAPS, layer });
  return { ...v, req };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const file = process.argv[2];
  const only = arg('only') ? new RegExp(arg('only')) : null;
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const layer = arg('layer', rows[0] && rows[0].browser ? 'browser' : 'node');
  const out = [];
  let changed = 0, missing = 0, n = 0;
  for (const row of rows) {
    if (only && !only.test(row.id)) { out.push(row); continue; }
    const v = regradeRow(row, layer);
    if (!v.req) { missing++; out.push(row); continue; }
    n++;
    if (v.verdict !== row.verdict) {
      changed++;
      console.log(`${(row.browser || 'node').padEnd(9)} ${row.id.padEnd(4)} ${row.config.padEnd(15)} ${row.verdict} -> ${v.verdict}  ${String(v.detail).slice(0, 90)}`);
    }
    out.push({ ...row, strength: v.req.strength, verdict: v.verdict, detail: v.detail, regraded: v.verdict !== row.verdict ? { from: row.verdict, fromDetail: row.detail } : undefined });
  }
  console.log(`${file}: ${n} cells regraded, ${changed} changed${missing ? `, ${missing} rows with unknown requirement` : ''}`);
  if (arg('out')) fs.writeFileSync(arg('out'), out.map(r => JSON.stringify(r)).join('\n') + '\n');
}
