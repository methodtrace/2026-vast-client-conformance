// Error grid: Wrapper chains of every depth with each kind of failure at each level, run through
// every Node client, graded on which Wrapper Error URIs are requested and with which [ERRORCODE].
//
//   depth d = documents in the chain when nothing fails (d-1 Wrappers, then the InLine); d = 1 to 7
//   level L = the document that fails (2..d); levels 1..L-1 are Wrappers that were received, so every one of them
//             has an Error URI the client must request (VAST 4.3 Error Reporting; §3.19 Wrapper Error)
//
// Failures and the codes the error table gives for them (exact code, the group's general code or 900 conform, as in
// the main suite):
//   http404, http500, timeout, stall (headers then a stalled body), refused (closed port)    301
//   empty (HTTP 200, empty body), malformed (not well-formed), html (an HTML page)           100 (also 303 for empty)
//   novast (well-formed XML whose root is not VAST)                                           101, 100
//   noad (VAST with no Ad), noad_err (VAST with only a VAST-level Error)                      303
//   nouri (Wrapper with no VASTAdTagURI; its own Error URI counts as well)                     101, 100, 301, 303
// Baselines with no failure: d = 1..6 must resolve; d = 7 (six Wrappers) may be rejected, with 302.
//
// Usage: node grid/error-grid.mjs <outDir> [clients=vastclient,videoadsdk,iabloader,vastlint]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../server.mjs';

const pexec = promisify(execFile);
const here = path.dirname(new URL(import.meta.url).pathname);
const outDir = path.resolve(process.argv[2] || 'grid-out');
const CLIENTS = (process.argv[3] || 'vastclient,videoadsdk,iabloader,vastlint').split(',');
const TIMEOUT = 2000;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vastconf-grid-'));

const P = l => `{{BASE}}/t/{{CASE}}/${l}`;
const vast = b => `<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="4.3" xmlns="http://www.iab.com/VAST">\n${b}\n</VAST>\n`;
const wrapper = (k, next) => vast(`  <Ad id="w${k}"><Wrapper><AdSystem>VASTCONF</AdSystem>
    <Error><![CDATA[${P(`w${k}/err?code=[ERRORCODE]`)}]]></Error>
    <Impression><![CDATA[${P(`w${k}/imp`)}]]></Impression>
    ${next === null ? '' : `<VASTAdTagURI><![CDATA[${next}]]></VASTAdTagURI>`}
    <Creatives><Creative><Linear><TrackingEvents><Tracking event="start"><![CDATA[${P(`w${k}/start`)}]]></Tracking></TrackingEvents></Linear></Creative></Creatives>
  </Wrapper></Ad>`);
const inline = vast(`  <Ad id="in"><InLine><AdSystem>VASTCONF</AdSystem><AdTitle>grid</AdTitle>
    <Error><![CDATA[${P('in/err?code=[ERRORCODE]')}]]></Error>
    <Impression><![CDATA[${P('in/imp')}]]></Impression>
    <AdServingId>grid</AdServingId>
    <Creatives><Creative id="c1"><UniversalAdId idRegistry="ad-id.org">GRID0001</UniversalAdId><Linear><Duration>00:00:10</Duration>
      <TrackingEvents><Tracking event="start"><![CDATA[${P('in/start')}]]></Tracking></TrackingEvents>
      <MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="640" height="360"><![CDATA[{{BASE}}/m/{{CASE}}/in.mp4]]></MediaFile></MediaFiles>
    </Linear></Creative></Creatives>
  </InLine></Ad>`);
const DOC = (vec, f, q = '') => `{{BASE}}/doc/{{CASE}}/${vec}/${f}${q}`;
const FAIL = {
  http404: { q: '?status=404', codes: ['301'] }, http500: { q: '?status=500', codes: ['301'] },
  timeout: { q: `?delay=${TIMEOUT + 2500}`, codes: ['301'] }, stall: { q: `?stall=${TIMEOUT + 4000}`, codes: ['301'] },
  refused: { url: 'http://127.0.0.1:9/refused.xml', codes: ['301'] },
  empty: { body: '', codes: ['100', '303'] }, malformed: { body: '<VAST version="4.3"><Ad id="x"><InLine><AdSystem>x</AdSystem></InLine>', codes: ['100'] },
  html: { body: '<!doctype html><html><body>not an ad</body></html>', q: '?ctype=text/html', codes: ['100'] },
  novast: { body: '<?xml version="1.0"?><Response><Status>none</Status></Response>', codes: ['101', '100'] },
  noad: { body: vast(''), codes: ['303'] }, noad_err: { body: vast(`  <Error><![CDATA[${P('vast/err?code=[ERRORCODE]')}]]></Error>`), codes: ['303'] },
  nouri: { nouri: true, codes: ['101', '100', '301', '303'] },
};

const cases = [];
for (let d = 1; d <= 7; d++) cases.push({ id: `base_d${d}`, d, L: null, f: null });
for (let d = 2; d <= 6; d++) for (let L = 2; L <= d; L++) for (const f of Object.keys(FAIL)) cases.push({ id: `${f}_d${d}_L${L}`, d, L, f });

// write each case's documents: doc1.xml (start) .. doc<d>.xml; the doc at level L is replaced by the failure
for (const c of cases) {
  const dir = path.join(root, c.id); fs.mkdirSync(dir, { recursive: true });
  for (let k = 1; k <= c.d; k++) {
    if (c.L !== null && k > c.L) break;
    const failNext = c.L !== null && k + 1 === c.L ? FAIL[c.f] : null;
    if (c.L === k) { // the failing document itself (only for body-type failures; network failures are in the URI)
      const F = FAIL[c.f];
      if (F.body !== undefined) fs.writeFileSync(path.join(dir, `doc${k}.xml`), F.body);
      // network failures live in the URI's query; the document itself exists (a stall needs a body to stall)
      else if (!F.nouri) fs.writeFileSync(path.join(dir, `doc${k}.xml`), k === c.d ? inline : wrapper(k, DOC(c.id, `doc${k + 1}.xml`)));
      continue;
    }
    if (k === c.d) { fs.writeFileSync(path.join(dir, `doc${k}.xml`), inline); continue; }
    let next = DOC(c.id, `doc${k + 1}.xml`);
    if (failNext) {
      if (failNext.url) next = failNext.url;
      else next = DOC(c.id, `doc${k + 1}.xml`, failNext.q || '');
    }
    fs.writeFileSync(path.join(dir, `doc${k}.xml`), wrapper(k, next));
  }
  // nouri: the failing level is a Wrapper without VASTAdTagURI, i.e. doc L is that Wrapper
  if (c.f === 'nouri') fs.writeFileSync(path.join(dir, `doc${c.L}.xml`), wrapper(c.L, null));
}

const srv = await startServer({ root });
const rows = [];
let n = 0;
const script = c => (c === 'iabloader' ? null : JSON.stringify({ kind: 'full' }));
for (const c of cases) for (const client of CLIENTS) {
  const caseId = `g${String(++n).padStart(4, '0')}`;
  const url = `${srv.base}/doc/${caseId}/${c.id}/doc1.xml`;
  const args = ['--no-deprecation', path.join(here, '../adapters/run.mjs'), client, url, JSON.stringify({ timeout: TIMEOUT, drainMs: 400 })];
  if (script(client)) args.push(script(client));
  let res; const t0 = Date.now();
  try { const { stdout } = await pexec('node', args, { timeout: 40000, maxBuffer: 64 << 20 }); res = JSON.parse(stdout.trim().split('\n').pop()); }
  catch (e) { res = { ok: false, error: 'harness: ' + String(e.message).split('\n')[0].slice(0, 200), killed: !!e.killed }; }
  const wall = Date.now() - t0;
  await new Promise(r => setTimeout(r, 30));
  const log = (srv.log.get(caseId) || []).map(e => ({ ...e, path: e.path.replace(`/${e.kind}/${caseId}/`, '') }));
  const px = log.filter(e => e.kind === 't');
  const codesAt = lbl => px.filter(e => e.path === `${lbl}/err`).map(e => new URLSearchParams(e.query || '').get('code'));
  // a Wrapper without VASTAdTagURI was itself received, so its own Error URI counts too
  const wrappersReceived = c.L === null ? 0 : c.f === 'nouri' ? c.L : c.L - 1;
  const perLevel = []; for (let k = 1; k <= wrappersReceived; k++) perLevel.push(codesAt(`w${k}`));
  const vastLevel = codesAt('vast');
  const resolved = (res.resolved || []).length;
  const imp = px.filter(e => e.path === 'in/imp').length;
  let verdict, detail;
  const F = c.f ? FAIL[c.f] : null;
  const okCode = code => code && (F.codes.includes(code) || F.codes.some(w => code === w[0] + '00') || code === '900');
  if (String(res.error || '').startsWith('harness:') && !log.length) { verdict = 'harness-error'; detail = String(res.error).slice(0, 160); }
  else if (c.L === null) {
    if (c.d <= 6) { verdict = resolved > 0 ? 'conforms' : 'deviates'; detail = resolved ? 'resolved' : `not resolved: ${res.error || ''}`.slice(0, 120); }
    else { const codes = [1, 2, 3, 4, 5, 6].map(k => codesAt(`w${k}`)); verdict = resolved ? 'conforms' : (codes.flat().length && codes.flat().every(x => ['302', '300', '900'].includes(x)) ? 'conforms' : 'deviates'); detail = resolved ? 'accepted 6 Wrappers (permitted)' : `rejected; codes ${JSON.stringify(codes)}`; }
  } else if (resolved > 0 && !['nouri'].includes(c.f)) { verdict = 'deviates'; detail = 'resolved an ad despite the failure'; }
  else {
    const reached = perLevel.filter(a => a.length).length;
    const allOk = perLevel.every(a => a.length && a.every(okCode));
    const anyBad = perLevel.some(a => a.some(x => !okCode(x)));
    const dup = perLevel.some(a => a.length > 1);
    if (c.f === 'noad_err' && !vastLevel.length) detail = 'VAST-level Error URI not requested; ';
    else detail = '';
    // conforms: every received Wrapper's Error URI requested once with an accepted code; wrong-code: every level
    // requested, some with a code the table does not give for this failure; partial: some levels not requested;
    // deviates: none requested (or an ad resolved despite the failure, above)
    const vastOk = c.f !== 'noad_err' || vastLevel.length > 0;
    verdict = reached === 0 ? 'deviates' : reached < perLevel.length || !vastOk ? 'partial' : anyBad ? 'wrong-code' : dup ? 'repeated' : 'conforms';
    detail += `levels ${perLevel.map((a, i) => `w${i + 1}:${a.join('+') || '-'}`).join(' ')}${anyBad ? ' (wrong code)' : ''}${dup ? ' (repeated)' : ''}; client code ${res.errorCode ?? (res.vastErrorCodes || []).map(x => x.code).join('+') ?? ''}`;
  }
  const row = { case: c.id, depth: c.d, level: c.L, failure: c.f, client, caseId, verdict, detail, resolved, impressions: imp, wall, ms: res.ms, error: res.error || null,
    uncaught: res.uncaught || [], harnessKilled: !!res.killed, stoppedReason: res.stoppedReason || null, requests: log.map(e => `${e.t} ${e.kind} ${e.path}${e.query || ''}${e.status ? ' [' + e.status + ']' : ''}`) };
  rows.push(row);
  process.stdout.write(`${c.id.padEnd(20)} ${client.padEnd(11)} ${verdict.padEnd(9)} ${String(detail).slice(0, 90)}\n`);
}
await srv.close();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'error-grid.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const tsv = ['case\tdepth\tlevel\tfailure\t' + CLIENTS.join('\t')];
for (const c of cases) tsv.push([c.id, c.d, c.L ?? '', c.f ?? '', ...CLIENTS.map(cl => rows.find(r => r.case === c.id && r.client === cl).verdict)].join('\t'));
fs.writeFileSync(path.join(outDir, 'error-grid.tsv'), tsv.join('\n') + '\n');
fs.rmSync(root, { recursive: true, force: true });
