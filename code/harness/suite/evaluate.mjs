// Shared grading for the Node runner (suite/run.mjs) and the browser runner (browser/run-browser.mjs), so both
// layers turn a client run into verdicts in exactly the same way.
//
//   observation(res, log, client, config) -> o      what an oracle sees (requirements.mjs documents the fields)
//   grade(req, o, { caps, layer }) -> { verdict, detail }
//
// log entries come from the recording server with the case prefix stripped from the path:
//   t     tracking and error pixels   path 'in/imp', query '?code=403'
//   js    verification resources      path 'in/verif-js'  (served as application/javascript, see server.mjs)
//   doc   VAST documents              path 'w_one/start.xml', query as requested
//   m     media URLs under Node       path 'in.mp4'   (never fetched by the scripted video; logged if a client did)
//   media real media in browsers      path '/media/ad-10s.webm', query '?case=...&ad=in'

const DUTY_CAP = { track: 'tracker', select: 'select', media: 'media', render: 'render', verify: 'verify' };

export function observation(res, log, client, config) {
  const pixels = log.filter(e => e.kind === 't');
  const docReqs = log.filter(e => e.kind === 'doc');
  return {
    res, client, config,
    docs: docReqs.map(e => e.path.split('/').pop()),
    docReqs,
    media: log.filter(e => e.kind === 'media' || e.kind === 'm').map(e => ({ path: e.path, query: e.query || '', status: e.status || null })),
    hits: label => pixels.filter(e => e.path === label.split('?')[0]).map(e => ({ t: e.t, query: e.query || '' })),
    codes: label => pixels.filter(e => e.path === label.split('?')[0]).map(e => new URLSearchParams(e.query || '').get('code')).filter(Boolean),
    scripts: label => log.filter(e => e.kind === 'js' && e.path === label.split('?')[0]).map(e => ({ t: e.t, query: e.query || '', status: e.status || null })),
  };
}

export function grade(req, o, { caps, layer }) {
  const cap = caps[o.client];
  if (!cap) return { verdict: 'harness-error', detail: `no capability entry for client ${o.client}` };
  if (req.layer === 'browser' && layer !== 'browser') return { verdict: 'n/a', detail: 'needs real media decoding (browser layer only)' };
  const capKey = DUTY_CAP[req.duty];
  if (capKey && !cap[capKey]) return { verdict: 'delegated', detail: cap.note };
  if (req.delegatedFor && req.delegatedFor[o.client]) return { verdict: 'delegated', detail: req.delegatedFor[o.client] };
  // a library that determines no VAST error code for a failed load leaves load-time error reporting to its integrator
  // (applies only when the load failed: whether a client wrongly accepts an ad is still graded by the oracle).
  // vastlint-client: the delegation has a limit the detail states (cap.loadErrorsNote): after a mid-chain fetch failure
  // the library throws and drops the intermediate Wrapper hops, so an integrator cannot reach their Error URIs.
  if (cap.loadErrors === false && req.mode === 'load' && !(o.res.resolved || []).length && (req.duty === 'track' || /loadCode\(|expectCode\(/.test(String(req.oracle))))
    return { verdict: 'delegated', detail: cap.loadErrorsNote || 'load-time error reporting: the library fires no Error URI and determines no VAST error code (failure exposed as free text)' };
  // a client that does not follow Wrappers cannot be graded on what happens further down a Wrapper chain (counted
  // once, in W01); a client that follows Wrappers is graded by the oracle even when it fetched only the first document
  if (req.startsWithWrapper && o.docs.length <= 1 && cap.followsWrappers === false) return { verdict: 'n/a', detail: 'the client does not follow Wrappers (see W01)' };
  // a script the client gives the page no means to drive is n/a; I01 and I03 only watch the icon appear (no control
  // is needed), so they are graded even when the icon script cannot be driven (I02, which clicks the icon, stays n/a)
  if (o.res.notDrivable && req.script && (o.res.notDrivableKinds || ['partial', 'click']).includes(req.script.kind) && !(req.script.kind === 'icon' && ['I01', 'I03'].includes(req.id))) return { verdict: 'n/a', detail: o.res.notDrivable };
  try { return req.oracle(o); } catch (e) { return { verdict: 'harness-error', detail: String(e && e.stack || e).slice(0, 300) }; }
}

// The script a configuration runs for a requirement. Full players with no load-only API (Shaka, rmp-vast) cannot
// load an ad without playing it, so every cell of theirs plays; everything else follows the requirement's mode.
export const PLAY_ONLY = new Set(['shaka', 'rmpvast', 'ima']);
export function scriptFor(req, client) {
  if (PLAY_ONLY.has(client)) return req.script || { kind: 'full' };
  return req.mode === 'play' ? (req.script || { kind: 'full' }) : null;
}
