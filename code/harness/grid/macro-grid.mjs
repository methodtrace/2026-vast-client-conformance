// Macro grid: every macro of the IAB VAST 4.x macro list (sources/iab-vast-spec/vast/vast4macros,
// macros-data.json) in the context the list gives it, through every Node client.
//   pixel:   an InLine with one Impression per macro whose contexts include "All tracking pixels"
//   request: a Wrapper whose VASTAdTagURI carries every macro whose contexts include "VAST request URIs"
// Each value the client sent is classified: literal (the macro left in place), empty, unknown (-1), n/a (-2), or value.
// VAST 4.3 §6.1: a player replaces every macro it receives; one it cannot or will not fill becomes -1 (unknown) or -2
// (not applicable); so 'literal' and 'empty' deviate, whatever the macro's support level.
// Usage: node grid/macro-grid.mjs <outDir> [clients]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../server.mjs';

const pexec = promisify(execFile);
const here = path.dirname(new URL(import.meta.url).pathname);
const outDir = path.resolve(process.argv[2] || 'macro-out');
const CLIENTS = (process.argv[3] || 'vastclient,videoadsdk,iabloader,vastlint').split(',');
const MACROS = JSON.parse(fs.readFileSync(path.join(here, '../../../sources/iab-vast-spec/vast/vast4macros/data/macros-data.json'), 'utf8')).macros;
const support = m => (/^Required$/.test(m.support) ? 'required' : /Deprecated/.test(m.support) ? 'deprecated' : /Required/.test(m.support) ? 'required-if-OM' : 'optional');
const pixelM = MACROS.filter(m => /All tracking pixels/.test(m.contexts));
const reqM = MACROS.filter(m => /VAST request URIs/.test(m.contexts));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vastconf-macro-'));
const vast = b => `<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="4.3" xmlns="http://www.iab.com/VAST">\n${b}\n</VAST>\n`;
const imps = pixelM.map(m => `    <Impression id="${m.name}"><![CDATA[{{BASE}}/t/{{CASE}}/mac/${m.name}?v=[${m.name}]]]></Impression>`).join('\n');
const inline = vast(`  <Ad id="in"><InLine><AdSystem>VASTCONF</AdSystem><AdTitle>macros</AdTitle>
${imps}
    <AdServingId>serving-123</AdServingId>
    <Creatives><Creative id="c1"><UniversalAdId idRegistry="ad-id.org">MACR0001</UniversalAdId><Linear><Duration>00:00:10</Duration>
      <MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="640" height="360"><![CDATA[{{BASE}}/m/{{CASE}}/in.mp4]]></MediaFile></MediaFiles>
    </Linear></Creative></Creatives>
  </InLine></Ad>`);
// two forms of the same VASTAdTagURI: in CDATA with literal '&' (the usual form), and as escaped text with '&amp;'
// (equally valid XML); a client must request the same URL for both
const q = reqM.map(m => `${m.name}=[${m.name}]`).join('&');
const wrapperOf = form => vast(`  <Ad id="w1"><Wrapper><AdSystem>VASTCONF</AdSystem>
    <Impression><![CDATA[{{BASE}}/t/{{CASE}}/w1/imp]]></Impression>
    <VASTAdTagURI>${form === 'cdata' ? `<![CDATA[{{BASE}}/doc/{{CASE}}/macros/inline.xml?${q}]]>` : `{{BASE}}/doc/{{CASE}}/macros/inline.xml?${q.replaceAll('&', '&amp;')}`}</VASTAdTagURI>
  </Wrapper></Ad>`);
fs.mkdirSync(path.join(root, 'macros'), { recursive: true });
fs.writeFileSync(path.join(root, 'macros', 'inline.xml'), inline);
fs.writeFileSync(path.join(root, 'macros', 'start.xml'), wrapperOf('cdata'));
fs.writeFileSync(path.join(root, 'macros', 'start-escaped.xml'), wrapperOf('escaped'));

const classify = v => (v === undefined ? 'not sent' : v === null ? 'missing' : /\[[A-Z0-9_]+\]|%5B[A-Z0-9_]+%5D/i.test(v) ? 'literal' : v === '' ? 'empty' : v === '-1' ? 'unknown (-1)' : v === '-2' ? 'n/a (-2)' : 'value');
const srv = await startServer({ root });
const rows = [];
let n = 0;
for (const client of CLIENTS) for (const form of ['cdata', 'escaped']) {
  const caseId = `mg${String(++n).padStart(3, '0')}`;
  const url = `${srv.base}/doc/${caseId}/macros/${form === 'cdata' ? 'start.xml' : 'start-escaped.xml'}`;
  const args = ['--no-deprecation', path.join(here, '../adapters/run.mjs'), client, url, JSON.stringify({ timeout: 3000, drainMs: 500 })];
  if (client !== 'iabloader') args.push(JSON.stringify({ kind: 'full' }));
  let res;
  try { const { stdout } = await pexec('node', args, { timeout: 40000, maxBuffer: 64 << 20 }); res = JSON.parse(stdout.trim().split('\n').pop()); }
  catch (e) { res = { ok: false, error: 'harness: ' + String(e.message).split('\n')[0] }; }
  await new Promise(r => setTimeout(r, 50));
  const log = (srv.log.get(caseId) || []);
  const docReq = log.find(e => e.kind === 'doc' && e.path.endsWith('/inline.xml'));
  const rawQ = s => { const o = {}; for (const kv of String(s || '').replace(/^\?/, '').split('&')) { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); } return o; };
  const rq = docReq ? rawQ(docReq.query) : null;
  for (const m of reqM) {
    const raw = rq ? (m.name in rq ? rq[m.name] : null) : undefined;
    let v = raw; try { if (typeof raw === 'string') v = decodeURIComponent(raw); } catch {}
    rows.push({ client, context: form === 'cdata' ? 'request' : 'request (escaped &amp;)', macro: m.name, support: support(m), raw, outcome: classify(raw === undefined ? undefined : v), value: typeof v === 'string' ? v.slice(0, 80) : v });
  }
  if (form === 'escaped') { process.stdout.write(`${client} escaped: request ${docReq ? 'made' : 'not made'}\n`); continue; }
  for (const m of pixelM) {
    const hit = log.find(e => e.kind === 't' && e.path.endsWith(`/mac/${m.name}`));
    const raw = hit ? (rawQ(hit.query).v ?? null) : undefined;
    let v = raw; try { if (typeof raw === 'string') v = decodeURIComponent(raw); } catch {}
    rows.push({ client, context: 'pixel', macro: m.name, support: support(m), raw, outcome: client === 'iabloader' ? 'delegated' : classify(raw === undefined ? undefined : v), value: typeof v === 'string' ? v.slice(0, 80) : v });
  }
  process.stdout.write(`${client}: request ${docReq ? 'made' : 'not made'}; pixels ${log.filter(e => e.kind === 't').length}; ${res.error || ''}\n`);
}
await srv.close();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'macro-grid.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const keys = [...new Set(rows.map(r => r.context + '\t' + r.macro + '\t' + r.support))];
const tsv = ['context\tmacro\tsupport\t' + CLIENTS.join('\t')];
for (const k of keys) { const [ctx, mac] = k.split('\t'); tsv.push([k, ...CLIENTS.map(c => { const r = rows.find(x => x.client === c && x.context === ctx && x.macro === mac); return r.outcome === 'value' ? `value:${String(r.value).slice(0, 24)}` : r.outcome; })].join('\t')); }
fs.writeFileSync(path.join(outDir, 'macro-grid.tsv'), tsv.join('\n') + '\n');
const sum = {};
for (const r of rows) { const k = `${r.client}|${r.context}`; sum[k] ||= {}; sum[k][r.outcome] = (sum[k][r.outcome] || 0) + 1; }
fs.writeFileSync(path.join(outDir, 'macro-grid-summary.json'), JSON.stringify(sum, null, 1));
console.log(JSON.stringify(sum));
fs.rmSync(root, { recursive: true, force: true });
