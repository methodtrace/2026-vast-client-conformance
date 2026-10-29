// Mutation fuzzer. Seeds: every document of the crafted vectors (suite/vectors) and of the IAB
// samples (sources/iab-vast-samples). Each round draws N seed chains, applies 1 to 3 random mutations to one of the
// chain's documents (structure, attributes, text, raw bytes, or the network behavior of a Wrapper target), serves the
// result from the recording server, and runs every Node client on it in its own process (load + play, as the suite).
//
// Failure classes (robustness, not VAST verdicts): crash (process died or printed no result), hang (no result within
// the wall limit), uncaught (an error thrown outside any promise: fatal for a Node service, R01), unhandled (an
// unhandled rejection), adapter (the client's documented API threw), slow (load took longer than the client's own
// timeout plus 5 s), internal (a JavaScript TypeError or similar returned as the client's error). A class is (client, kind, normalized message). Stop rule: stop after a round that adds no
// new class, once at least MIN_ROUNDS rounds have run, or at the time limit.
// Usage: node fuzz/fuzz.mjs <outDir> [--rounds-min 3] [--per-round 150] [--hours 4] [--seed 1] [--clients a,b]
// Replay: node fuzz/fuzz.mjs <outDir> --replay <cases.jsonl|cases.jsonl.gz> [--seed 20261017] [--only f00155,f00093] [--first N] [--clients a,b]
//   Re-runs the stored cases in order and writes the same per-case records to <outDir>/cases.jsonl. The stored file keeps only each
//   case's corpus seed name and mutation descriptions, which do not determine the mutated document (a descriptor such as
//   "delete <Tracking>" does not say which element). So the documents are rebuilt by running the generator with the campaign's
//   PRNG seed and checking every rebuilt case against the stored descriptor; any difference stops the replay (exit 2).
//   The paper's campaign used seed 20261017, the replay default.
//   --only runs just the listed case ids, --first N just the first N cases; the draws before and between them are still made, to keep the stream.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { JSDOM } from 'jsdom';
import { startServer } from '../server.mjs';

const pexec = promisify(execFile);
const here = path.dirname(new URL(import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const outDir = path.resolve(process.argv[2] || 'fuzz-out');
const MIN_ROUNDS = Number(arg('rounds-min', 3)), PER_ROUND = Number(arg('per-round', 150)), HOURS = Number(arg('hours', 4));
const REPLAY = arg('replay', null);
const CLIENTS = arg('clients', 'vastclient,videoadsdk,iabloader,vastlint').split(',');
const TIMEOUT = 2000, WALL = 30000;
let seed = Number(arg('seed', REPLAY ? 20261017 : 1));
// mulberry32: 32-bit integer arithmetic (Math.imul), period 2^32.
let st = seed >>> 0;
const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
fs.mkdirSync(outDir, { recursive: true });

// ---- seeds: a seed is a chain directory (start.xml plus the documents it references)
const W = new JSDOM('').window;
const seeds = [];
const VEC = path.join(here, '../suite/vectors');
for (const v of fs.readdirSync(VEC)) {
  const d = path.join(VEC, v); if (!fs.statSync(d).isDirectory() || v.startsWith('_')) continue;
  const files = fs.readdirSync(d).filter(f => f.endsWith('.xml'));
  if (files.includes('start.xml')) seeds.push({ name: `vec:${v}`, files: Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(d, f), 'utf8')])) });
}
const IAB = path.join(here, '../../../sources/iab-vast-samples');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.xml') ? [path.join(d, e.name)] : []));
if (fs.existsSync(IAB)) for (const f of walk(IAB)) {
  let x = fs.readFileSync(f, 'utf8');
  // IAB samples point at external hosts; the server maps unknown hosts to /x/ (404), which is a valid behavior to fuzz
  seeds.push({ name: `iab:${path.relative(IAB, f)}`, files: { 'start.xml': x } });
}

// ---- mutation operators
const POOL = ['', ' ', '-1', '0', '1e309', '99999999999999999999', 'NaN', '00:00:99', '99:99:99.999', '00:00:10.5', '-00:00:05', '150%', '0%', '%',
  'javascript:alert(1)', 'http://', '//no-scheme', 'http://[::1', 'a'.repeat(10000), '\u0000', '￾', '😀', '<![CDATA[x]]>', ']]>', '&amp;', '&unknown;',
  '{{BASE}}/t/{{CASE}}/fz/x?e=[ERRORCODE]&c=[CACHEBUSTING]', 'true', 'false', 'TRUE', 'yes', 'linear', 'video/mp4', 'audio/mp4', 'application/javascript'];
const NETQ = ['?status=404', '?status=500', '?status=204', '?status=302', `?delay=${TIMEOUT + 2500}`, `?stall=${TIMEOUT + 4000}`, '?ctype=text/html', '?gzip=1', '?ctype=application/json'];
function domMut(xml) {
  let doc; try { doc = new W.DOMParser().parseFromString(xml, 'application/xml'); } catch { return null; }
  if (doc.getElementsByTagName('parsererror').length) return null;
  const els = [...doc.getElementsByTagName('*')];
  if (els.length < 2) return null;
  const e = pick(els.slice(1));
  const ops = [
    () => { e.parentNode.removeChild(e); return `delete <${e.tagName}>`; },
    () => { e.parentNode.insertBefore(e.cloneNode(true), e.nextSibling); return `duplicate <${e.tagName}>`; },
    () => { const p = e.parentNode; const sibs = [...p.children]; if (sibs.length < 2) return null; const o = pick(sibs); if (o === e) return null; p.insertBefore(e, o); return `move <${e.tagName}> before <${o.tagName}>`; },
    () => { const t = pick(els); if (t === e || t.contains(e) || e.contains(t)) return null; t.appendChild(e.cloneNode(true)); return `copy <${e.tagName}> into <${t.tagName}>`; },
    () => { const a = [...e.attributes]; if (!a.length) return null; const at = pick(a); const v = pick(POOL); e.setAttribute(at.name, v); return `attr ${e.tagName}@${at.name}=${JSON.stringify(v.slice(0, 30))}`; },
    () => { const a = [...e.attributes]; if (!a.length) return null; const at = pick(a); e.removeAttribute(at.name); return `remove ${e.tagName}@${at.name}`; },
    () => { const names = ['sequence', 'skipoffset', 'offset', 'followAdditionalWrappers', 'allowMultipleAds', 'fallbackOnNoAd', 'version', 'event', 'type', 'delivery', 'width', 'height', 'apiFramework', 'id', 'conditionalAd']; const n = pick(names); const v = pick(POOL); e.setAttribute(n, v); return `add ${e.tagName}@${n}=${JSON.stringify(v.slice(0, 30))}`; },
    () => { if (e.children.length) return null; const v = pick(POOL); while (e.firstChild) e.removeChild(e.firstChild); e.appendChild(rnd() < 0.5 ? doc.createTextNode(v) : doc.createCDATASection(v.replace(/]]>/g, ''))); return `text <${e.tagName}>=${JSON.stringify(v.slice(0, 30))}`; },
    () => { if (e.children.length) return null; const t = e.textContent; while (e.firstChild) e.removeChild(e.firstChild); e.appendChild(doc.createTextNode(t)); return `cdata->text <${e.tagName}>`; }, // URIs with & become &amp;
    () => { e.appendChild(doc.createComment(' fuzz ')); return `comment in <${e.tagName}>`; },
    () => { const r = doc.createElement(e.tagName.toLowerCase() === e.tagName ? e.tagName.toUpperCase() : e.tagName.toLowerCase()); while (e.firstChild) r.appendChild(e.firstChild); e.parentNode.replaceChild(r, e); return `rename <${e.tagName}> case`; },
  ];
  for (let i = 0; i < 8; i++) { const op = pick(ops); let d = null; try { d = op(); } catch { d = null; } if (d) return { xml: new W.XMLSerializer().serializeToString(doc), desc: d }; }
  return null;
}
function rawMut(xml) {
  const ops = [
    () => { const i = Math.floor(rnd() * xml.length); return { xml: xml.slice(0, i), desc: `truncate at ${i}/${xml.length}` }; },
    () => ({ xml: '﻿' + xml, desc: 'BOM' }),
    () => ({ xml: xml.replace(/encoding="UTF-8"/i, `encoding="${pick(['UTF-16', 'ISO-8859-1', 'bogus'])}"`), desc: 'encoding decl' }),
    () => ({ xml: xml.replace(/<\?xml[^>]*\?>\s*/, ''), desc: 'no XML declaration' }),
    () => ({ xml: '<?xml version="1.0"?><!DOCTYPE VAST [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">]>' + xml.replace(/<\?xml[^>]*\?>/, '').replace(/<AdTitle>[^<]*<\/AdTitle>/, '<AdTitle>&c;</AdTitle>'), desc: 'DTD entity expansion (1,000x)' }),
    () => ({ xml: xml.replace(/<VAST /, '<VAST xmlns:x="urn:x" ').replace(/<Ad /, '<x:Ad '), desc: 'namespace prefix on Ad' }),
    () => { const i = Math.floor(rnd() * xml.length); return { xml: xml.slice(0, i) + pick(['<', '>', '&', '"', '\u0000', ']]>', '<!--', '</Ad>']) + xml.slice(i), desc: `insert char at ${i}` }; },
    () => ({ xml: xml.replace(/\n\s*/g, ''), desc: 'whitespace removed' }),
    () => ({ xml: xml.replace(/version="[^"]*"/, `version="${pick(['2.0', '3.0', '4.0', '4.4', '5.0', '', 'x'])}"`), desc: 'VAST version' }),
  ];
  return pick(ops)();
}
function netMut(files) {
  // change the network behavior of one Wrapper target by appending a query to its VASTAdTagURI
  const cands = Object.keys(files).filter(f => /VASTAdTagURI/.test(files[f]));
  if (!cands.length) return null;
  const f = pick(cands); const qv = pick(NETQ);
  const x = files[f].replace(/(<VASTAdTagURI>\s*(?:<!\[CDATA\[)?)([^\]<\s]+)/, (m, a, u) => a + u + (u.includes('?') ? '&' + qv.slice(1) : qv));
  return x === files[f] ? null : { file: f, xml: x, desc: `net ${f} ${qv}` };
}
function mutate(sd) {
  const files = { ...sd.files }; const descs = [];
  const k = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < k; i++) {
    const r = rnd();
    if (r < 0.15) { const m = netMut(files); if (m) { files[m.file] = m.xml; descs.push(m.desc); } continue; }
    const f = pick(Object.keys(files));
    const m = r < 0.75 ? domMut(files[f]) : rawMut(files[f]);
    if (m) { files[f] = m.xml; descs.push(`${f}: ${m.desc}`); }
  }
  return descs.length ? { files, descs } : null;
}

// ---- running and classifying
const norm = s => String(s).replace(/https?:\/\/[^\s'")]+/g, '<url>').replace(/\b\d+(\.\d+)?\b/g, 'N').replace(/\s+/g, ' ').slice(0, 160);
async function runOne(client, url) {
  const args = ['--no-deprecation', path.join(here, '../adapters/run.mjs'), client, url, JSON.stringify({ timeout: TIMEOUT, drainMs: 200 })];
  if (client !== 'iabloader') args.push(JSON.stringify({ kind: 'full' }));
  const t0 = Date.now();
  try {
    const { stdout } = await pexec('node', args, { timeout: WALL, maxBuffer: 64 << 20 });
    const line = stdout.trim().split('\n').pop();
    try { return { res: JSON.parse(line), wall: Date.now() - t0 }; } catch { return { crash: 'no result: ' + line.slice(0, 120), wall: Date.now() - t0 }; }
  } catch (e) { return e.killed ? { hang: true, wall: Date.now() - t0 } : { crash: `exit ${e.code ?? ''} ${e.signal ?? ''}: ` + String(e.stderr || e.message).split('\n').filter(Boolean).slice(-1)[0], wall: Date.now() - t0 }; }
}
function classes(client, r) {
  const out = [];
  if (r.hang) out.push(['hang', 'no result within ' + WALL / 1000 + ' s']);
  if (r.crash) out.push(['crash', norm(r.crash)]);
  const res = r.res;
  if (res) {
    for (const u of res.uncaught || []) out.push([u.startsWith('unhandled rejection') ? 'unhandled' : 'uncaught', norm(u)]);
    if (String(res.error || '').startsWith('adapter crash')) out.push(['adapter', norm(res.error.split('\n')[0])]);
    // an internal JavaScript error surfacing as the client's error (not a VAST or network error it determined)
    else if (/Cannot read propert|is not a function|is not iterable|undefined is not|null is not|Maximum call stack|Invalid array length|is not defined/.test(String(res.error || ''))) out.push(['internal', norm(res.error)]);
    if ((res.ms || 0) > TIMEOUT * 3 + 5000) out.push(['slow', `run took more than ${(TIMEOUT * 3 + 5000) / 1000} s`]);
  }
  return out.map(([kind, msg]) => ({ client, kind, msg, key: `${client}|${kind}|${msg}` }));
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vastconf-fuzz-'));
const srv = await startServer({ root });
const known = new Map(); // key -> first example
const roundsLog = [];
const t0 = Date.now();
let caseN = 0;
if (REPLAY) {
  // Replay mode (see Usage). The default path below is not touched; the per-case block repeats it and must stay in step with it.
  const rawIn = fs.readFileSync(REPLAY);
  const stored = (REPLAY.endsWith('.gz') ? zlib.gunzipSync(rawIn) : rawIn).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const onlyIds = arg('only', null) ? new Set(arg('only', '').split(',')) : null, firstN = Number(arg('first', 0));
  const selected = stored.map((c, n) => (onlyIds ? onlyIds.has(c.id) : firstN ? n < firstN : true));
  const last = selected.lastIndexOf(true);
  const out = fs.createWriteStream(path.join(outDir, 'cases.jsonl'), { flags: 'w' });
  let nRun = 0, status = 0;
  for (let n = 0; n <= last; n++) {
    const sc = stored[n];
    let sd, m;
    for (let guard = 0; !m; guard++) { if (guard > 100000) break; sd = pick(seeds); m = mutate(sd); }
    if (!m || sd.name !== sc.seed || JSON.stringify(m.descs) !== JSON.stringify(sc.mutations)) {
      console.error(`replay: stored case ${sc.id} (#${n + 1}) does not regenerate from seed ${seed}. stored: ${JSON.stringify([sc.seed, sc.mutations])} generated: ${m ? JSON.stringify([sd.name, m.descs]) : 'none'}`);
      status = 2; break;
    }
    if (!selected[n]) continue;
    const id = sc.id, round = sc.round;
    const dir = path.join(root, id); fs.mkdirSync(dir, { recursive: true });
    for (const [f, x] of Object.entries(m.files)) fs.writeFileSync(path.join(dir, f), x.replaceAll(`/doc/{{CASE}}/${sd.name.slice(4)}/`, `/doc/{{CASE}}/${id}/`));
    const results = await Promise.all(CLIENTS.map(async c => ({ c, r: await runOne(c, `${srv.base}/doc/${id}c${c}/${id}/start.xml`) })));
    nRun++;
    const found = [];
    for (const { c, r } of results) for (const k of classes(c, r)) {
      if (!known.has(k.key)) { known.set(k.key, { ...k, firstCase: id, round, seed: sd.name, mutations: m.descs }); found.push(k.key);
        fs.mkdirSync(path.join(outDir, 'examples', id), { recursive: true });
        for (const [f, x] of Object.entries(m.files)) fs.writeFileSync(path.join(outDir, 'examples', id, f), x.replaceAll(`/doc/{{CASE}}/${sd.name.slice(4)}/`, `/doc/{{CASE}}/${id}/`));
      }
    }
    out.write(JSON.stringify({ id, round, seed: sd.name, mutations: m.descs, outcomes: results.map(({ c, r }) => ({ client: c, hang: !!r.hang, crash: r.crash || null, ok: r.res ? r.res.ok : null,
      resolved: r.res ? (r.res.resolved || []).length : null, error: r.res ? String(r.res.error || '').slice(0, 160) : null, uncaught: r.res ? r.res.uncaught : null, wall: r.wall })), newClasses: found }) + '\n');
    fs.rmSync(dir, { recursive: true, force: true });
    srv.log.clear();
  }
  await new Promise(r => out.end(r));
  fs.writeFileSync(path.join(outDir, 'classes.json'), JSON.stringify([...known.values()], null, 1));
  console.log(`replay: ${nRun} of ${stored.length} stored cases run, ${known.size} classes${status ? ', STOPPED: stream mismatch' : ''}`);
  await srv.close();
  fs.rmSync(root, { recursive: true, force: true });
  process.exit(status);
}
const casesOut = fs.createWriteStream(path.join(outDir, 'cases.jsonl'), { flags: 'a' });
for (let round = 1; ; round++) {
  let newInRound = 0, ran = 0;
  for (let i = 0; i < PER_ROUND; i++) {
    const sd = pick(seeds); const m = mutate(sd); if (!m) continue;
    const id = `f${String(++caseN).padStart(5, '0')}`;
    const dir = path.join(root, id); fs.mkdirSync(dir, { recursive: true });
    // the vectors' URIs carry their own vector name; point them at this case's directory
    for (const [f, x] of Object.entries(m.files)) fs.writeFileSync(path.join(dir, f), x.replaceAll(`/doc/{{CASE}}/${sd.name.slice(4)}/`, `/doc/{{CASE}}/${id}/`));
    const results = await Promise.all(CLIENTS.map(async c => ({ c, r: await runOne(c, `${srv.base}/doc/${id}c${c}/${id}/start.xml`) })));
    ran++;
    const found = [];
    for (const { c, r } of results) for (const k of classes(c, r)) {
      if (!known.has(k.key)) { known.set(k.key, { ...k, firstCase: id, round, seed: sd.name, mutations: m.descs }); newInRound++; found.push(k.key);
        fs.mkdirSync(path.join(outDir, 'examples', id), { recursive: true });
        // stored as served (paths pointing at this example's own folder), so it replays from examples/ as root
        for (const [f, x] of Object.entries(m.files)) fs.writeFileSync(path.join(outDir, 'examples', id, f), x.replaceAll(`/doc/{{CASE}}/${sd.name.slice(4)}/`, `/doc/{{CASE}}/${id}/`));
      }
    }
    casesOut.write(JSON.stringify({ id, round, seed: sd.name, mutations: m.descs, outcomes: results.map(({ c, r }) => ({ client: c, hang: !!r.hang, crash: r.crash || null, ok: r.res ? r.res.ok : null,
      resolved: r.res ? (r.res.resolved || []).length : null, error: r.res ? String(r.res.error || '').slice(0, 160) : null, uncaught: r.res ? r.res.uncaught : null, wall: r.wall })), newClasses: found }) + '\n');
    fs.rmSync(dir, { recursive: true, force: true });
    srv.log.clear();
    if ((Date.now() - t0) / 3600000 > HOURS) break;
  }
  roundsLog.push({ round, ran, newClasses: newInRound, totalClasses: known.size, minutes: Math.round((Date.now() - t0) / 60000) });
  fs.writeFileSync(path.join(outDir, 'classes.json'), JSON.stringify([...known.values()], null, 1));
  fs.writeFileSync(path.join(outDir, 'rounds.json'), JSON.stringify({ seeds: seeds.length, perRound: PER_ROUND, minRounds: MIN_ROUNDS, hours: HOURS, clients: CLIENTS, rounds: roundsLog }, null, 1));
  console.log(`round ${round}: ${ran} cases, ${newInRound} new classes, ${known.size} total, ${roundsLog.at(-1).minutes} min`);
  if ((round >= MIN_ROUNDS && newInRound === 0) || (Date.now() - t0) / 3600000 > HOURS) break;
}
casesOut.end();
await srv.close();
fs.rmSync(root, { recursive: true, force: true });
