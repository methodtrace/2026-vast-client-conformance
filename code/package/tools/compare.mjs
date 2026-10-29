// Compares this machine's results with the reference results shipped in expected/, and checks file hashes.
// Usage: node tools/compare.mjs <pkgRoot> <resultsDir>   -> writes <resultsDir>/compare.json and prints a summary
// (Package-side replacement for code/tools/compare.mjs; make-package.sh installs it as tools/compare.mjs.)
//
// References (any that is missing is reported as 'no reference'):
//   expected/node/matrix.tsv                     Node suite, 5 configurations (Linux, 108 requirements)
//   expected/gate2-summary.json                  IAB samples
//   expected/browser/<engine>-matrix.tsv         chromium, firefox and webkit (Linux), 8 configurations
//   expected/macos/<engine>-matrix.tsv           a reference run on macOS (Apple silicon) in the same engine: chromium,
//                                                chrome, firefox, webkit (8 configurations) and safari (7, without IMA);
//                                                99 requirements (A01, A02, A04, R04, R05 and M06 to M09 are left out)
//   expected/grid/error-grid.tsv, error-grid-graded.jsonl, macro-grid.tsv   Node grids
//   expected/file-hashes.json                    bundles, vectors, media, IMA archive
// Own-engine reference: chromium -> chromium; chrome -> chromium (Playwright's build of the same engine); firefox ->
// firefox; webkit and safari -> webkit. Every engine is also compared with the Chromium reference (where engines differ),
// with the Node reference (graded cells only) and with the macOS reference in the same engine.
//
// Known differences (KNOWN below, each with its reason) are never removed from a comparison: every differing cell is
// counted in 'differing' and listed in 'changed'; a known one carries its reason, and 'unexplained' counts the rest.
// Known cells that did not differ are listed under 'knownNotSeen'. Only configurations present on both sides are
// compared; the others are listed (missingConfigs, newConfigs), as are ids on one side only (idsNotRun, newIds).
import fs from 'node:fs';
import path from 'node:path';
import { hashTree } from './hashes.mjs';

const [pkg, res] = process.argv.slice(2);
const E = path.join(pkg, 'expected');
const META = ['id', 'area', 'strength', 'spec', 'claim', 'depth', 'level', 'failure', 'support'];
// keyCols: how many leading columns identify a row (1 for the matrices, 2 for the macro grid: context + macro)
function readTsv(f, keyCols = 1, norm = v => v) {
  if (!f || !fs.existsSync(f)) return null;
  const rows = fs.readFileSync(f, 'utf8').trim().split('\n').map(l => l.split('\t'));
  const h = rows[0]; const m = {};
  for (const r of rows.slice(1)) {
    const key = r.slice(0, keyCols).join('/');
    for (let i = keyCols; i < h.length; i++) if (!META.includes(h[i])) m[`${key}|${h[i]}`] = norm(r[i]);
  }
  return m;
}
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const readJsonl = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : null);
// the graded error grid as a cell map: case|client -> verdict
const readGraded = f => { const rows = readJsonl(f); return rows ? Object.fromEntries(rows.map(r => [`${r.case}|${r.client}`, r.verdict])) : null; };
// macro grid: a sent value (a timestamp, a cache buster, a URL with a random port) differs on every run; compare its class
const macroNorm = v => (/^value:/.test(v || '') ? 'value' : v);

const rowOf = k => k.slice(0, k.lastIndexOf('|'));
const cfgOf = k => k.slice(k.lastIndexOf('|') + 1);
const configsOf = m => [...new Set(Object.keys(m || {}).map(cfgOf))];

// ---- known differences, by comparison kind and engine. On Linux the own-engine comparisons are expected to be identical;
// the entries below are the platform differences expected on macOS (kind 'ownEngine') and the engine differences found
// on every platform (kinds 'chromium' and 'node'); kind 'macos' lists the cells that may differ from the earlier macOS run.
const FLV = 'the Linux WebKit reference (GStreamer) reports video/x-flv as playable, so video-ad-sdk picks the FLV file listed first and deviates; on macOS WebKit and Safari it skips the FLV file and S01 conforms';
const AAC = 'the audio ad is AAC/Opus; Playwright\'s Chromium has no AAC decoder (rmp-vast and IMA pick the .m4a file and report 401/400, graded n/a), engines with AAC play it';
const W11 = 'non-well-formed XML: Chromium and WebKit DOMParser keep the partial tree, Firefox returns a parsererror root, Node (xmldom) differs again; W11 has three runtime behaviors';
const ICON = 'IMA requests the icon view before the ad start request on every engine and platform; how far before varies from run to run and by platform, and the 50 ms tolerance falls inside that spread on some engines, so this cell can conform in one run and deviate in the next';
const PROGRESS = 'macOS WebKit only: rmp-vast builds its progress offsets once, on the first durationchange, and only if the duration is finite; in this engine the list stays empty, so no progress tracker fires (T05 to T07 deviate) and T19 is n/a';
const RMP_PROGRESS = ['T05|rmpvast', 'T05|rmpvast+omid', 'T06|rmpvast', 'T06|rmpvast+omid', 'T07|rmpvast', 'T07|rmpvast+omid', 'T19|rmpvast', 'T19|rmpvast+omid'];
const KNOWN = [
  { kind: 'ownEngine', engines: ['webkit', 'safari'], cells: ['S01|videoadsdk'], reason: FLV },
  { kind: 'ownEngine', engines: ['webkit'], cells: RMP_PROGRESS, reason: PROGRESS },
  { kind: 'ownEngine', engines: ['chrome'], cells: ['S02|rmpvast', 'S02|rmpvast+omid', 'S02|ima'], reason: 'Google Chrome ships AAC, the Chromium reference does not: ' + AAC },
  { kind: 'ownEngine', engines: ['chromium', 'chrome', 'firefox', 'webkit', 'safari'], cells: ['I01|ima'], reason: ICON },
  { kind: 'chromium', engines: ['firefox', 'webkit', 'safari', 'chrome'], cells: ['S02|rmpvast', 'S02|rmpvast+omid', 'S02|ima'], reason: AAC },
  { kind: 'chromium', engines: ['firefox'], cells: ['W11|videoadsdk', 'W11|iabloader', 'W11|iabloader+nsap', 'W11|ima'], reason: W11 },
  { kind: 'chromium', engines: ['webkit'], cells: RMP_PROGRESS, reason: PROGRESS },
  { kind: 'chromium', engines: ['chromium', 'chrome', 'firefox', 'webkit', 'safari'], cells: ['I01|ima'], reason: ICON },
  { kind: 'node', engines: ['chromium', 'chrome', 'webkit', 'safari'], cells: ['W11|videoadsdk', 'W11|iabloader', 'W11|iabloader+nsap'], reason: W11 },
  { kind: 'macos', engines: ['chromium', 'chrome', 'firefox', 'webkit', 'safari'], cells: ['I01|ima'], reason: ICON },
];
const knownFor = (kind, engine) => {
  const m = {};
  for (const k of KNOWN) if (k.kind === kind && (!engine || k.engines.includes(engine))) for (const c of k.cells) m[c] = k.reason;
  return m;
};

function diff(exp, got, { skipExpected = [], known = {}, refName = null } = {}) {
  if (!exp) return { status: 'no reference', reference: refName };
  if (!got) return { status: 'missing result', reference: refName };
  // a partial run (--only) is compared on the ids it contains; only configurations present on both sides are compared
  const gotIds = new Set(Object.keys(got).map(rowOf)), expIds = new Set(Object.keys(exp).map(rowOf));
  const gotCfg = configsOf(got), expCfg = configsOf(exp);
  const shared = expCfg.filter(c => gotCfg.includes(c));
  const keys = Object.keys(exp).filter(k => gotIds.has(rowOf(k)) && gotCfg.includes(cfgOf(k)) && !skipExpected.includes(exp[k]));
  const changed = keys.filter(k => exp[k] !== got[k]).map(k => ({ cell: k, expected: exp[k], got: got[k] ?? null, ...(known[k] ? { known: known[k] } : {}) }));
  const unexplained = changed.filter(c => !c.known).length;
  // per configuration: cells compared and cells differing
  const perConfig = {};
  for (const c of shared) {
    const ks = keys.filter(k => cfgOf(k) === c);
    const ch = changed.filter(x => cfgOf(x.cell) === c);
    perConfig[c] = { cells: ks.length, differing: ch.length, known: ch.filter(x => x.known).length, unexplained: ch.filter(x => !x.known).length };
  }
  const knownNotSeen = Object.keys(known).filter(k => k in exp && keys.includes(k) && !changed.some(c => c.cell === k));
  return {
    reference: refName,
    status: !keys.length ? 'nothing shared' : !changed.length ? 'identical' : unexplained ? 'differs' : 'differs only in known cells',
    cells: keys.length, differing: changed.length, known: changed.length - unexplained, unexplained,
    configs: shared, missingConfigs: expCfg.filter(c => !gotCfg.includes(c)), newConfigs: gotCfg.filter(c => !expCfg.includes(c)),
    idsNotRun: [...expIds].filter(id => !gotIds.has(id)).length, newIds: [...gotIds].filter(id => !expIds.has(id)),
    perConfig, changed, knownNotSeen,
  };
}

// ---- IMA is optional. It is included only when the run asked for it (options.txt: with_ima=1) and the package holds the
// archive. Otherwise its cells are absent by design, never a failure: report 'IMA skipped (...)' once and leave 'ima'
// out of the lists of missing configurations and out of the archive hash check.
const optsTxt = fs.existsSync(path.join(res, 'options.txt')) ? fs.readFileSync(path.join(res, 'options.txt'), 'utf8') : null;
const imaArchivePresent = fs.existsSync(path.join(pkg, 'sources/ima-html5/2026-10-16/index.tsv'));
const imaRequested = optsTxt === null ? true : /(^|\s)with_ima=1(\s|$)/.test(optsTxt);
const imaSkipped = !(imaRequested && imaArchivePresent);
const imaSkipReason = imaSkipped ? (imaArchivePresent ? 'not requested' : 'archive not supplied') : null;
const imaSkipText = imaSkipped ? `IMA skipped (${imaSkipReason})` : null;

const out = { comparedAt: new Date().toISOString(), knownDifferences: KNOWN, node: {}, browsers: {}, grids: {} };
// ---- Node: against the reference, and run 2 against run 1 (determinism on this machine)
const nodeRef = readTsv(path.join(E, 'node/matrix.tsv'));
const node1 = readTsv(path.join(res, 'node/matrix.tsv')), node2 = readTsv(path.join(res, 'node-run2/matrix.tsv'));
out.node.run1VsReference = diff(nodeRef, node1, { refName: 'expected/node/matrix.tsv' });
out.node.run2VsReference = diff(nodeRef, node2, { refName: 'expected/node/matrix.tsv' });
out.node.run2VsRun1 = diff(node1, node2, { refName: 'node/matrix.tsv (this run)' });
// ---- gate 2
const g2a = readJson(path.join(E, 'gate2-summary.json')), g2b = readJson(path.join(res, 'gate2/summary.json'));
if (g2a && g2b) out.gate2 = Object.fromEntries(Object.keys(g2a.clients).map(k => [k, { expected: g2a.clients[k].parsed, got: g2b.clients[k] ? g2b.clients[k].parsed : null, samples: g2a.clients[k].samples, same: !!g2b.clients[k] && g2b.clients[k].parsed === g2a.clients[k].parsed }]));
// ---- browsers
const engines = ['chromium', 'chrome', 'firefox', 'webkit', 'safari'];
const OWN = { chromium: 'chromium', chrome: 'chromium', firefox: 'firefox', webkit: 'webkit', safari: 'webkit' };
const bref = e => readTsv(path.join(E, `browser/${e}-matrix.tsv`));
const chromiumRef = bref('chromium');
for (const b of engines) {
  const got = readTsv(path.join(res, `browser/${b}/matrix.tsv`));
  out.browsers[b] = {
    // the reference from the same engine (Linux; WebKit from a Linux VM)
    againstOwnEngineReference: diff(bref(OWN[b]), got, { known: knownFor('ownEngine', b), refName: `expected/browser/${OWN[b]}-matrix.tsv` }),
    // the Chromium reference, to show where engines differ
    againstChromiumReference: diff(chromiumRef, got, { known: knownFor('chromium', b), refName: 'expected/browser/chromium-matrix.tsv' }),
    // cells graded n/a under Node.js (browser-only requirements and their kin) are left out of the cross-layer check
    againstNodeReference: diff(nodeRef, got, { skipExpected: ['n/a'], known: knownFor('node', b), refName: 'expected/node/matrix.tsv (graded cells)' }),
    // the macOS reference run in the same engine (99 requirements; see the header)
    againstMacosReference: diff(readTsv(path.join(E, `macos/${b}-matrix.tsv`)), got, { known: knownFor('macos', b), refName: `expected/macos/${b}-matrix.tsv` }),
  };
}
// browser run summaries: Playwright engines in browser/summary.json, Safari in browser/safari/summary.json
if (imaSkipped) {
  out.ima = { status: 'skipped', reason: imaSkipReason, text: imaSkipText };
  const strip = d => { if (d && Array.isArray(d.missingConfigs)) { const had = d.missingConfigs.includes('ima'); d.missingConfigs = d.missingConfigs.filter(c => c !== 'ima'); if (had) d.imaSkipped = imaSkipText; } };
  for (const d of Object.values(out.node)) strip(d);
  for (const b of Object.values(out.browsers)) for (const d of Object.values(b)) strip(d);
}
const pwSum = readJson(path.join(res, 'browser/summary.json')), saSum = readJson(path.join(res, 'browser/safari/summary.json'));
out.engineRuns = {};
for (const [k, v] of Object.entries((pwSum && pwSum.browsers) || {})) out.engineRuns[k] = { launched: v.launched, version: v.version || null, cells: v.cells ?? null, runs: v.runs ?? null, startedAt: v.startedAt || null, finishedAt: v.finishedAt || null, error: v.error || null };
if (saSum && saSum.browsers && saSum.browsers.safari) {
  const s = saSum.browsers.safari;
  out.engineRuns.safari = { launched: s.launched, version: s.version || null, cells: s.cells ?? null, runs: s.runs ?? null, startedAt: s.startedAt || null, finishedAt: s.finishedAt || null,
    error: s.error || null, hint: s.hint || null, isolation: s.isolation, configs: s.configs || null, capabilities: s.capabilities || null,
    ima: s.ima && !imaSkipped ? { enabled: s.ima.enabled, reason: s.ima.reason || null, capabilities: s.ima.capabilities || null, canary: s.ima.canary || null, tlsPageReady: s.ima.tlsPageReady ?? null } : null,
    startedMutedRuns: s.startedMuted ?? null };
}
// per engine and configuration: client runs, harness errors, muted starts; external requests by how they were served
// (IMA must be served only from the archive or the telemetry stub: 'blocked (not in archive)' means a missing file)
for (const b of engines) {
  const rows = readJsonl(path.join(res, `browser/${b}/results.jsonl`));
  if (!rows) continue;
  const runs = new Map();
  for (const r of rows) if (!runs.has(r.caseId)) runs.set(r.caseId, r);
  const ext = {}, perConfig = {};
  let harness = 0, muted = 0;
  for (const r of runs.values()) {
    const pc = (perConfig[r.config] ||= { clientRuns: 0, harnessErrors: 0, mutedStarts: 0, wallSeconds: 0 });
    pc.clientRuns++; pc.wallSeconds += Math.round((r.result.wallMs || 0) / 1000);
    if (/^harness:/.test(r.result.error || '')) { harness++; pc.harnessErrors++; }
    if (r.result.startedMuted || ((r.result.telemetry || {}).media || []).some(m => m.ev === 'muted-retry')) { muted++; pc.mutedStarts++; }
    for (const e of r.result.external || []) ext[e.served] = (ext[e.served] || 0) + 1;
  }
  out.browsers[b].runs = { clientRuns: runs.size, harnessErrors: harness, mutedStarts: muted, external: ext, perConfig,
    harnessErrorCases: [...runs.values()].filter(r => /^harness:/.test(r.result.error || '')).slice(0, 50).map(r => ({ caseId: r.caseId, config: r.config, id: r.id, error: String(r.result.error).slice(0, 160) })) };
}
// ---- grids (Node layer)
const errRef = readTsv(path.join(E, 'grid/error-grid.tsv'));
out.grids.errorGrid = diff(errRef, readTsv(path.join(res, 'grid/error-grid.tsv')), { refName: 'expected/grid/error-grid.tsv' });
out.grids.errorGridGraded = diff(readGraded(path.join(E, 'grid/error-grid-graded.jsonl')), readGraded(path.join(res, 'grid/error-grid-graded.jsonl')), { refName: 'expected/grid/error-grid-graded.jsonl' });
out.grids.macroGrid = diff(readTsv(path.join(E, 'grid/macro-grid.tsv'), 2, macroNorm), readTsv(path.join(res, 'grid/macro-grid.tsv'), 2, macroNorm), { refName: 'expected/grid/macro-grid.tsv (sent values compared by class)' });
const gridRows = readJsonl(path.join(res, 'grid/error-grid.jsonl'));
if (gridRows) out.grids.errorGridHarnessErrors = gridRows.filter(r => r.verdict === 'harness-error' || /^harness:/.test(r.error || '')).map(r => `${r.case}|${r.client}`);
// ---- hashes
const envF = path.join(res, 'env.json'), hashE = path.join(E, 'file-hashes.json');
if (fs.existsSync(hashE)) {
  const ref = JSON.parse(fs.readFileSync(hashE, 'utf8'));
  const env = fs.existsSync(envF) ? JSON.parse(fs.readFileSync(envF, 'utf8')).hashes || {} : {};
  // the IMA archive is not in env.json (collect-env.mjs predates it): hashed here, from the package
  if (ref.imaArchive && imaArchivePresent) env.imaArchive = hashTree(pkg, ['sources/ima-html5']);
  out.hashes = {};
  for (const group of Object.keys(ref)) {
    if (group === 'imaArchive' && imaSkipped && !imaArchivePresent) { out.hashes[group] = { skipped: imaSkipText }; continue; }
    const a = ref[group], b = env[group] || {};
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    out.hashes[group] = { files: keys.length, mismatched: keys.filter(k => a[k] !== b[k]).map(k => ({ file: k, expected: a[k] || null, got: b[k] || null })) };
  }
}
fs.writeFileSync(path.join(res, 'compare.json'), JSON.stringify(out, null, 1));

// ---- summary
const line = (name, d) => {
  const n = d.differing ? ` (${d.differing}/${d.cells} cells differ: ${d.known} known, ${d.unexplained} unexplained)` : d.cells ? ` (${d.cells} cells)` : '';
  const extra = [d.missingConfigs && d.missingConfigs.length ? `not in this result: ${d.missingConfigs.join(', ')}` : '', d.newConfigs && d.newConfigs.length ? `not in reference: ${d.newConfigs.join(', ')}` : ''].filter(Boolean).join('; ');
  console.log(`${name.padEnd(46)} ${d.status}${n}${extra ? ` [${extra}]` : ''}`);
  if (d.perConfig && d.differing) console.log(`${''.padEnd(6)}per configuration: ${Object.entries(d.perConfig).map(([c, p]) => `${c} ${p.differing}/${p.cells}`).join(', ')}`);
  for (const c of (d.changed || []).slice(0, 25)) console.log(`${''.padEnd(6)}${c.cell.padEnd(26)} expected ${String(c.expected).padEnd(10)} got ${String(c.got).padEnd(10)}${c.known ? ' (known)' : ' UNEXPLAINED'}`);
  if ((d.changed || []).length > 25) console.log(`${''.padEnd(6)}... ${d.changed.length - 25} more in compare.json`);
};
line('Node suite run 1 vs reference', out.node.run1VsReference);
if (node2) { line('Node suite run 2 vs reference', out.node.run2VsReference); line('Node suite run 2 vs run 1 (determinism)', out.node.run2VsRun1); }
if (out.ima) console.log(out.ima.text);
if (out.gate2) console.log('gate 2 parsed (expected/got):', Object.entries(out.gate2).map(([k, v]) => `${k} ${v.expected}/${v.got}`).join(', '));
for (const [b, d] of Object.entries(out.browsers)) {
  if (d.againstOwnEngineReference.status === 'missing result') { console.log(`${(b + ' browser').padEnd(46)} not run`); continue; }
  console.log(`-- ${b}`);
  line(`${b} vs ${OWN[b]} reference`, d.againstOwnEngineReference);
  if (OWN[b] !== 'chromium') line(`${b} vs Chromium reference`, d.againstChromiumReference);
  line(`${b} vs Node reference (graded cells)`, d.againstNodeReference);
  line(`${b} vs macOS reference (same engine)`, d.againstMacosReference);
  if (d.runs) console.log(`${''.padEnd(4)}${b}: ${d.runs.clientRuns} client runs, ${d.runs.harnessErrors} harness errors, ${d.runs.mutedStarts} muted starts, external ${JSON.stringify(d.runs.external)}`);
}
if (out.engineRuns.safari) { const s = out.engineRuns.safari; console.log(`safari: ${s.launched ? 'ran ' + s.version : 'NOT RUN: ' + (s.error || '') + (s.hint ? ' (' + s.hint + ')' : '')}${s.ima ? `; IMA ${s.ima.enabled ? 'included' : 'skipped: ' + s.ima.reason}` : ''}`); }
else console.log('safari: no summary (stage not run)');
line('error grid vs reference', out.grids.errorGrid);
line('error grid, graded, vs reference', out.grids.errorGridGraded);
line('macro grid vs reference', out.grids.macroGrid);
if (out.grids.errorGridHarnessErrors && out.grids.errorGridHarnessErrors.length) console.log(`error grid: ${out.grids.errorGridHarnessErrors.length} cells failed in the harness (void): ${out.grids.errorGridHarnessErrors.slice(0, 10).join(', ')}`);
if (out.hashes) for (const [g, h] of Object.entries(out.hashes)) h.skipped ? console.log(`hashes ${g.padEnd(14)} ${h.skipped}`) : console.log(`hashes ${g.padEnd(14)} ${h.mismatched.length ? h.mismatched.length + ' of ' + h.files + ' differ' : 'all ' + h.files + ' match'}`);
