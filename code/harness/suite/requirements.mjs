// Requirement catalog: each entry maps one VAST 4.3 player requirement to a vector, a run mode and an oracle.
//
//   id        stable requirement id
//   area      wrappers | errors | tracking | macros | xml | pods
//   spec      VAST 4.3 section (sources/iab-vast-spec/VAST4.x/4.3.md) or the IAB macro list
//   strength  'must' | 'should' | 'may' | 'observation'   (as the spec words the player obligation)
//   duty      'load' (the library resolves and reports while loading), 'track' (needs a tracker), 'parse', 'select'
//             (chooses which ads to play), 'media' (chooses and plays the media file itself), 'render' (draws
//             overlays such as Icons), or 'verify' (handles AdVerifications)
//   layer     'all' (default) or 'browser': the requirement needs real media decoding, so the Node layer grades n/a
//   claim     the requirement in our words (paraphrase, not a quotation)
//   vector    suite/vectors/<vector>/start.xml is the entry document
//   entryQuery  optional query string on the entry document's URL (server options such as ?gzip=1, see server.mjs)
//   mode      'load' or 'play';  script: the playback script for 'play'
//   oracle    (o) => { verdict: 'conforms' | 'deviates' | 'n/a', detail }   where o is the observation
//
// Verdicts for a library that does not take on a duty at all are set by the grader (suite/evaluate.mjs), not the
// oracle: a requirement whose duty the library leaves to its integrator is 'delegated' (see CAPS below).
//
// Observation o: { res (adapter JSON), hits(label) -> [{t, query}], codes(label) -> [code], docs -> [file],
//                  client, config }

export const CAPS = {
  vastclient: { tracker: true, select: true, media: false, render: false, verify: true,
    note: 'parser + VASTTracker; VASTClient.get() applies the ad-selection rules; media selection, playback, error detection and overlay rendering are the integrator\'s (reported through tracker.error() and the tracker\'s event methods)' },
  videoadsdk: { tracker: true, select: true, media: true, render: true, verify: true,
    note: 'runWaterfall(): requests, selects the ad, plays it on a <video> element, tracks and reports errors' },
  iabloader: { tracker: false, select: false, media: false, render: false, verify: false,
    note: 'loader only: returns the parsed chain; no tracker, no pixel firing, no ad selection, no playback (attributes are exposed in the model); errors surface as VASTLoaderError codes' },
  shaka: { followsWrappers: false, tracker: true, select: true, media: true, render: true, verify: true,
    note: 'Shaka Player interstitial ad manager (addAdUrlInterstitial): requests, plays and tracks the ad itself' },
  vastlint: { tracker: true, select: true, media: false, render: false, verify: true, loadErrors: false,
    note: 'headless session and playback queue controller: resolves the chain, selects media and dispatches tracking when the integrator reports player state; playback, error detection and rendering are the integrator\'s',
    // why load-time error cells are graded 'delegated' for this client, and the limit of that delegation
    loadErrorsNote: 'load-time error reporting: the library fires no Error URI and determines no VAST error code (a failure is exposed only as free text in resolution.stoppedReason); after a mid-chain fetch failure (HTTP error or timeout) resolve() throws (stoppedReason null) and the snapshot keeps only the root hop, dropping the intermediate Wrapper hops, so an integrator cannot reach their Error URIs (a library limitation, not only delegation)' },
  ima: { tracker: true, select: true, media: true, render: true, verify: true,
    note: 'Google IMA HTML5 SDK AdsLoader/AdsManager: requests, follows Wrappers, selects media, plays, tracks and reports errors itself (closed source)' },
  rmpvast: { tracker: true, select: true, media: true, render: true, verify: true,
    note: 'rmp-vast loadAds(): requests and resolves the tag through its bundled vast-client-js 6.4.2, selects media, plays the ad in its own <video>, tracks, reports errors and resumes content' },
};

const yes = d => ({ verdict: 'conforms', detail: d });
const no = d => ({ verdict: 'deviates', detail: d });
const na = d => ({ verdict: 'n/a', detail: d });
const fmt = a => (a.length ? a.join(',') : 'none');
const resolvedCount = o => (o.res.resolved || []).length;
// The ClickThrough a client opened: what the adapter or the runner observed (a URL handed to the integrator, or the
// window a browser opened), or else the ClickThrough URL the recording server saw loaded (a client may open the window
// in a way the runner does not capture, as Google Chrome 155 does for IMA's frame).
const clickThroughUsed = o => o.res.clickThroughUrl ||
  (['in', 'w0', 'w1', 'w2'].map(l => o.hits(`${l}/clickthrough`).length ? `/t/x/${l}/clickthrough (loaded)` : null).find(Boolean) || '');

// For load-time error reporting: what error code(s) the library determined, from pixels or from its error object.
const loadCode = (o, label) => {
  const c = o.codes(label);
  if (c.length) return c;
  if (o.res.errorCode) return [String(o.res.errorCode)];
  const emitted = (o.res.vastErrorCodes || []).map(e => e.code).filter(Boolean).map(String);
  return [...new Set(emitted)];
};

// The error table's code, or a less specific code the table also defines: the general code of the same group (300
// for 30x, 400 for 40x, 200 for 20x, 100 for 10x) or 900 ("At a minimum, error code 900 (Unidentified error) can be
// used, but a more specific error code benefits all parties"). Both conform and are reported as such; a different
// specific code deviates.
const expectCode = (codes, want) => {
  const w = [].concat(want).map(String);
  const general = [...new Set(w.map(c => c[0] + '00'))];
  if (codes.length && codes.every(c => w.includes(c))) return yes(`code ${fmt(codes)}`);
  if (codes.length && codes.every(c => w.includes(c) || general.includes(c) || c === '900')) return yes(`code ${fmt(codes)} (less specific than ${w.join('/')}, permitted)`);
  return no(`code ${fmt(codes)}`);
};
const q = (o, label, k) => { const h = o.hits(label)[0]; return h ? new URLSearchParams(h.query || '').get(k) : undefined; };
const rawQ = (o, label, k) => { const h = o.hits(label)[0]; if (!h) return undefined; const m = (h.query || '').match(new RegExp(`[?&]${k}=([^&]*)`)); return m ? m[1] : null; };
const isMacro = v => v !== null && v !== undefined && /\[|%5B/i.test(v);
const unknownValue = v => v === '-1' || v === '-2';
// media the client chose for the ad (content media that a player such as Shaka plays around the ad is excluded)
const chosenMedia = o => [...(o.res.mediaSrc || []), ...o.media.map(m => m.path + (m.query || ''))].filter(u => !/[?&]ad=content(&|$)/.test(u));
// vastlint-client has no verification API and runs no verification code: the harness, as integrator, dispatches the
// Verification's verificationNotExecuted event by name through session.trackAd() and chooses REASON itself, so whether
// to report and which reason are the integrator's (as for vast-client-js); A03 (the Wrapper's verification reaches the
// resolved ad) stays graded, as it is for vast-client-js
const VASTLINT_VERIFY = 'whether to execute the resource, and so whether to report it, is the integrator\'s (no verification API; the harness dispatches verificationNotExecuted by name through session.trackAd())';
const VASTLINT_REASON = 'the REASON value is passed in by the integrator (session.trackAd(i, \'verificationNotExecuted\', { macros: { REASON } }))';
// X18, X19: the InLine request made from an entity-escaped VASTAdTagURI keeps every query parameter
const adTagQuery = o => {
  const d = o.docReqs.find(e => /inline\.xml$/.test(e.path));
  if (!d) return no(`InLine not requested; fetched ${fmt(o.docs)}`);
  const p = new URLSearchParams(d.query || '');
  return p.get('a') === '1' && p.get('b') === '2' && p.get('c') === '3' && [...p.keys()].length === 3 ? yes(d.query) : no(`requested with "${d.query || ''}"`);
};

export const REQUIREMENTS = [
  // ------------------------------------------------------------------ wrappers
  { id: 'W01', area: 'wrappers', spec: '§2.2; §2.3.5', strength: 'must', duty: 'load', vector: 'w_one', mode: 'load',
    claim: 'Follows a Wrapper to its InLine ad.',
    oracle: o => (resolvedCount(o) > 0 && o.docs.includes('inline.xml') ? yes('resolved') : no(`fetched ${fmt(o.docs)}; resolved ${resolvedCount(o)}`)) },
  { id: 'W02', area: 'wrappers', spec: '§2.2; The Ad Element (sequence); Ad Pods', strength: 'must', duty: 'load', vector: 'w_one_seq', mode: 'load',
    claim: 'Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional).',
    oracle: o => { if (resolvedCount(o) > 0 && o.docs.includes('inline.xml')) return yes('resolved'); const c = loadCode(o, 'w0/err'); if (c.length || o.res.error) return na(`declined: ${o.res.error || 'code ' + fmt(c)}`); return no(`fetched ${fmt(o.docs)}; resolved ${resolvedCount(o)}; no ad and no error`); } },
  { id: 'W03', area: 'wrappers', spec: '§3.19.1', strength: 'must', duty: 'load', vector: 'w_five', mode: 'load',
    claim: 'Accepts a chain of five Wrappers before the InLine ad (players are required to accept five).',
    oracle: o => (resolvedCount(o) > 0 ? yes('resolved through 5 wrappers') : no(`stopped after ${o.docs.length} documents; codes ${fmt(o.codes('w0/err'))}`)) },
  { id: 'W04', area: 'wrappers', spec: '§2.3.5.1; §3.19.1', strength: 'should', duty: 'load', vector: 'w_six', mode: 'load',
    claim: 'With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received).',
    // §2.3.5.1 concerns the Wrappers received: a Wrapper whose document was never requested cannot be reported to.
    oracle: o => {
      if (resolvedCount(o) > 0) return yes('accepted 6 (permitted)');
      const received = [0, 1, 2, 3, 4, 5].filter(i => o.docs.includes(i === 0 ? 'start.xml' : `w${i}.xml`));
      const per = received.map(i => o.codes(`w${i}/err`));
      if ([0, 1, 2, 3, 4, 5].some(i => o.codes(`w${i}/err`).length)) {
        const bad = per.map((c, k) => [received[k], expectCode(c, '302')]).filter(([, v]) => v.verdict !== 'conforms');
        return bad.length ? no(`rejected; codes per wrapper received (${received.map(i => 'w' + i).join(',')}) ${per.map(fmt).join(' | ')}`) : yes(`rejected; 302 to all ${received.length} wrappers received`);
      }
      return expectCode(loadCode(o, 'w0/err'), '302');
    } },
  { id: 'W05', area: 'wrappers', spec: '§2.3.5.1', strength: 'should', duty: 'load', vector: 'w_loop', mode: 'load', selfReferencing: true,
    claim: 'Terminates a Wrapper that points to itself (stops requesting it).',
    oracle: o => (o.docs.length <= 12 && !String(o.res.error || '').startsWith('harness') ? yes(`ended after ${o.docs.length} fetches`) : no(`${o.docs.length} fetches; ${o.res.error || ''}`)) },
  { id: 'W06', area: 'wrappers', spec: '§2.3.5.1; Error Reporting table (302)', strength: 'should', duty: 'load', vector: 'w_loop', mode: 'load', selfReferencing: true,
    claim: 'Reports 302 (wrapper limit) for a self-referencing Wrapper loop.',
    oracle: o => expectCode(loadCode(o, 'w0/err'), '302') },
  { id: 'W07', area: 'wrappers', spec: 'Error Reporting (Media Player Details; table 301)', strength: 'must', duty: 'load', vector: 'w_http404', mode: 'load',
    claim: 'When the VASTAdTagURI is unavailable (HTTP 404), determines error 301.',
    oracle: o => expectCode(loadCode(o, 'w0/err'), '301') },
  { id: 'W08', area: 'wrappers', spec: 'Error Reporting (table 301)', strength: 'must', duty: 'load', vector: 'w_timeout', mode: 'load', opts: { timeout: 2000 },
    claim: 'When the VASTAdTagURI times out, determines error 301.',
    oracle: o => expectCode(loadCode(o, 'w0/err'), '301') },
  { id: 'W09', area: 'wrappers', spec: 'Error Reporting (No Ad Response); Error (VAST)', strength: 'should', duty: 'load', vector: 'w_noad', mode: 'load',
    claim: 'When a Wrapper leads to a no-ad response and the player determines a code, the code is 303.',
    oracle: o => { const c = loadCode(o, 'w0/err'); return c.length ? expectCode(c, '303') : na('no code determined (Wrapper Error URIs are not required in a no-ad response)'); } },
  { id: 'W10', area: 'wrappers', spec: '§3.2.1 Error (VAST); Error Reporting (No Ad Response)', strength: 'must', duty: 'track', vector: 'w_noad', mode: 'load',
    claim: 'Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]).',
    oracle: o => { const c = o.codes('noad/err'); return c.length ? (c.includes('303') ? yes('requested with 303') : yes(`requested with ${fmt(c)} (should be 303)`)) : no('not requested'); } },
  { id: 'W11', area: 'wrappers', spec: 'Error Reporting (table 100); §2.3.2 (well-formed XML)', strength: 'must', duty: 'load', vector: 'w_malformed', mode: 'load',
    claim: 'When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it).',
    oracle: o => { const c = loadCode(o, 'w0/err'); if (resolvedCount(o) > 0) return no(`accepted an ad from non-well-formed XML (${(o.res.resolved || []).map(a => a.id).join(',')})`); return expectCode(c, '100'); } },
  { id: 'W12', area: 'wrappers', spec: 'Error Reporting (Media Player Details)', strength: 'must', duty: 'track', vector: 'w_http404', mode: 'load',
    claim: 'Requests the Wrapper Error URI when its VASTAdTagURI fails.',
    oracle: o => (o.hits('w0/err').length ? yes(`requested (${fmt(o.codes('w0/err'))})`) : no('Wrapper Error URI not requested')) },
  { id: 'W13', area: 'wrappers', spec: 'Error Reporting (Media Player Details); §3.4.11', strength: 'must', duty: 'track', vector: 'w_two_wrappers_inline_error', mode: 'play', script: { kind: 'full' },
    claim: 'An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here).',
    oracle: o => {
      const per = { in: o.codes('in/err'), w0: o.codes('w0/err'), w1: o.codes('w1/err') };
      const all = Object.values(per), same = all.every(c => c.length && fmt([...new Set(c)].sort()) === fmt([...new Set(all[0])].sort()));
      const ok = all.every(c => expectCode(c, '403').verdict === 'conforms');
      if (!ok && same) return na(`fanned out ${fmt([...new Set(all[0])])} to inline and both wrappers; the code is graded by E03 (G2)`);
      const any = Object.values(per).some(c => c.length);
      if (!any && o.res.steps && o.res.steps.some(s => s.step === 'run-rejected')) return no(`no error pixel at all; ${o.res.steps.map(s => s.error || s.step).join('; ')}`);
      const note = o.client === 'vastclient' ? ' (code chosen by the integrator through tracker.error; library did the fan-out)' : '';
      return ok ? yes('403 to inline and both wrappers' + note) : no(`inline ${fmt(per.in)}; w0 ${fmt(per.w0)}; w1 ${fmt(per.w1)}`);
    } },
  { id: 'W14', area: 'wrappers', spec: '§3.4.4; §2.3.4', strength: 'must', duty: 'track', vector: 'w_one', mode: 'play', script: { kind: 'full' },
    claim: 'At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it.',
    oracle: o => (o.hits('in/imp').length === 1 && o.hits('w0/imp').length === 1 ? yes('inline and wrapper impressions') : no(`inline ${o.hits('in/imp').length}, wrapper ${o.hits('w0/imp').length}`)) },
  { id: 'W15', area: 'wrappers', spec: '§3.19 (tracking elements in Wrappers)', strength: 'must', duty: 'track', vector: 't_wrapper_events', mode: 'play', script: { kind: 'full' },
    claim: 'Fires the Wrapper\'s Linear tracking events (start, quartiles, complete) together with the InLine ones.',
    oracle: o => {
      const ev = ['start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete'];
      const miss = ev.filter(e => o.hits(`w0/${e}`).length !== 1);
      return miss.length ? no(`wrapper events not fired: ${miss.join(',')}`) : yes(`all wrapper events fired${o.hits('w0/p-5s').length ? ' (and progress)' : ''}`);
    } },
  { id: 'W16', area: 'wrappers', spec: '§2.3.5.2', strength: 'must', duty: 'track', vector: 'w_click_inline_wins', mode: 'play', script: { kind: 'click' },
    claim: 'When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used.',
    oracle: o => { const u = clickThroughUsed(o); return /\/in\/clickthrough/.test(u) ? yes('inline ClickThrough') : no(u ? `used ${u.replace(/^.*\/t\/[^/]+\//, '')}` : 'no click-through used'); } },
  { id: 'W17', area: 'wrappers', spec: '§2.3.5.2', strength: 'must', duty: 'track', vector: 'w_click_wrapper_fallback', mode: 'play', script: { kind: 'click' },
    claim: 'When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used.',
    oracle: o => { const u = clickThroughUsed(o); return /\/w1\/clickthrough/.test(u) ? yes('closest wrapper ClickThrough') : no(u ? `used ${u.replace(/^.*\/t\/[^/]+\//, '')}` : 'no click-through used'); } },
  { id: 'W18', area: 'wrappers', spec: '§3.10.2 ClickTracking; §3.19', strength: 'must', duty: 'track', vector: 'w_click_tracking', mode: 'play', script: { kind: 'click' },
    claim: 'On a click, requests the ClickTracking URIs of the InLine and of every Wrapper.',
    oracle: o => {
      const got = ['in', 'w0', 'w1'].filter(p => o.hits(`${p}/clicktracking`).length === 1);
      return got.length === 3 ? yes('all ClickTracking') : no(`fired: ${fmt(got)}`);
    } },
  { id: 'W19', area: 'wrappers', spec: '§3.19 (followAdditionalWrappers)', strength: 'should', duty: 'load', vector: 'w_follow_false', mode: 'load',
    claim: 'With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed.',
    oracle: o => (o.docs.includes('inline.xml') ? no('followed the second wrapper to the InLine') : yes(`stopped; fetched ${fmt(o.docs)}`)) },
  { id: 'W20', area: 'wrappers', spec: '§3.19 (allowMultipleAds)', strength: 'should', duty: 'select', vector: 'w_allow_multiple_false', mode: 'load',
    claim: 'With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped).',
    oracle: o => { const ids = (o.res.resolved || []).map(a => a.id); return ids.length === 1 && ids[0] === 's1' ? yes('only s1') : no(`resolved ${fmt(ids)}`); } },
  { id: 'W21', area: 'wrappers', spec: '§3.19 (allowMultipleAds default false)', strength: 'should', duty: 'select', vector: 'w_allow_multiple_default', mode: 'load',
    claim: 'Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used.',
    oracle: o => { const ids = (o.res.resolved || []).map(a => a.id); return ids.length === 1 && ids[0] === 's1' ? yes('only s1') : no(`resolved ${fmt(ids)}`); } },
  { id: 'W22', area: 'wrappers', spec: '§3.19.2 BlockedAdCategories', strength: 'may', duty: 'load', vector: 'w_blocked_category', mode: 'load',
    claim: 'Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205.',
    oracle: o => { const c = loadCode(o, 'w0/err').concat(o.codes('in/err')); if (c.includes('205')) return yes('rejected with 205'); if (resolvedCount(o) > 0) return na('not implemented (optional): ad accepted'); return no(`rejected without 205 (codes ${fmt(c)}; ${o.res.error || 'no error'})`); } },
  // ------------------------------------------------------------------ errors
  { id: 'E01', area: 'errors', spec: '§3.2.1 Error (VAST)', strength: 'must', duty: 'track', vector: 'e_noad_root', mode: 'load',
    claim: 'For a no-ad response, requests the VAST-level Error URI.',
    oracle: o => (o.hits('root/err1').length ? yes(`requested (code ${fmt(o.codes('root/err1'))})`) : no('not requested')) },
  { id: 'E02', area: 'errors', spec: '§3.2.1 Error (VAST), bounded 0+', strength: 'must', duty: 'track', vector: 'e_noad_root', mode: 'load',
    claim: 'Requests every VAST-level Error URI when several are given.',
    oracle: o => (o.hits('root/err1').length && o.hits('root/err2').length ? yes('both') : no(`err1 ${o.hits('root/err1').length}, err2 ${o.hits('root/err2').length}`)) },
  { id: 'E03', area: 'errors', spec: '§3.4.11; Error Reporting (table 403)', strength: 'must', duty: 'media', vector: 'e_inline_unplayable', mode: 'play', script: { kind: 'full' },
    claim: 'With no supported MediaFile, requests every InLine Error URI with 403.',
    oracle: o => { const a = o.codes('in/err1'), b = o.codes('in/err2'); if (!a.length || !b.length) return no(`err1 ${fmt(a)}; err2 ${fmt(b)}`); const va = expectCode(a, '403'), vb = expectCode(b, '403'); return va.verdict === 'conforms' && vb.verdict === 'conforms' ? yes(`err1 ${va.detail}; err2 ${vb.detail}`) : no(`err1 ${fmt(a)}; err2 ${fmt(b)}`); } },
  { id: 'E04', area: 'errors', spec: 'Error Reporting (Media Player Details); macro list ERRORCODE', strength: 'must', duty: 'track', vector: 'w_http404', mode: 'load',
    claim: 'Replaces [ERRORCODE] in Error URIs with a numeric code.',
    oracle: o => { const q = o.hits('w0/err').map(h => h.query); if (!q.length) return na('no error request'); return q.every(x => /code=\d{3}(&|$)/.test(x)) ? yes(q.join(' ')) : no(q.join(' ')); } },
  // ------------------------------------------------------------------ tracking
  { id: 'T01', area: 'tracking', spec: '§2.3.4; §3.4.4', strength: 'must', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'full' },
    claim: 'Requests every Impression URI of the ad.',
    oracle: o => (o.hits('in/imp-a').length === 1 && o.hits('in/imp-b').length === 1 ? yes('both impressions') : no(`a ${o.hits('in/imp-a').length}, b ${o.hits('in/imp-b').length}`)) },
  { id: 'T02', area: 'tracking', spec: '§3.4.4 (about:blank)', strength: 'should', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'full' },
    claim: 'Does not dispatch an Impression whose URI is about:blank.',
    oracle: o => { const all = [...(o.res.pixels || []), ...(o.res.fetches || []), ...((o.res.telemetry && o.res.telemetry.fetches) || []).map(f => f.url)]; return all.some(u => /about:blank/.test(u)) ? no('dispatched about:blank') : yes('not dispatched'); } },
  { id: 'T03', area: 'tracking', spec: '§3.14.1 (Linear metrics)', strength: 'must', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'full' },
    claim: 'Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order.',
    oracle: o => {
      const ev = ['start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete'];
      const n = ev.map(e => o.hits(`in/${e}`).length);
      const t = ev.map(e => (o.hits(`in/${e}`)[0] || {}).t ?? null);
      const once = n.every(x => x === 1);
      const ordered = t.every((x, i) => x !== null && (i === 0 || x >= t[i - 1]));
      return once && ordered ? yes('each once, in order') : no(`counts ${n.join('/')}`);
    } },
  { id: 'T04', area: 'tracking', spec: '§3.14.3 (multiple Tracking elements per event)', strength: 'must', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'full' },
    claim: 'Fires every Tracking element for the same event (two start trackers for two parties).',
    oracle: o => (o.hits('in/start').length === 1 && o.hits('in/start-2').length === 1 ? yes('both start trackers') : no(`start ${o.hits('in/start').length}, start-2 ${o.hits('in/start-2').length}`)) },
  { id: 'T05', area: 'tracking', spec: '§3.14.1 (progress, HH:MM:SS offset)', strength: 'must', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'full' },
    claim: 'Fires a progress tracker with an HH:MM:SS offset.',
    oracle: o => (o.hits('in/p-5s').length === 1 ? yes('fired once') : no(`fired ${o.hits('in/p-5s').length} times`)) },
  { id: 'T06', area: 'tracking', spec: '§3.14.1 (progress, HH:MM:SS.mmm offset)', strength: 'must', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'full' },
    claim: 'Fires a progress tracker with an HH:MM:SS.mmm offset.',
    oracle: o => (o.hits('in/p-2.5s').length === 1 ? yes('fired once') : no(`fired ${o.hits('in/p-2.5s').length} times`)) },
  { id: 'T07', area: 'tracking', spec: '§3.14.1 (progress, n% offset)', strength: 'must', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'full' },
    claim: 'Fires progress trackers with percentage offsets (10% and 80%).',
    oracle: o => { const a = o.hits('in/p-10pct').length, b = o.hits('in/p-80pct').length; return a === 1 && b === 1 ? yes('both fired once') : no(`10%: ${a}, 80%: ${b}`); } },
  { id: 'T08', area: 'tracking', spec: '§3.14.1 (thirdQuartile, complete definitions)', strength: 'must', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'partial', fraction: 0.6 },
    claim: 'Stopping at 60% fires midpoint but neither thirdQuartile nor complete.',
    oracle: o => {
      const mid = o.hits('in/midpoint').length, q3 = o.hits('in/thirdQuartile').length, c = o.hits('in/complete').length;
      return mid === 1 && q3 === 0 && c === 0 ? yes('midpoint only') : no(`midpoint ${mid}, thirdQuartile ${q3}, complete ${c}`);
    } },
  { id: 'T09', area: 'tracking', spec: '§2.3.4; §3.4.4 (same time)', strength: 'observation', duty: 'track', vector: 'w_one', mode: 'play', script: { kind: 'full' },
    claim: 'Spread between the first and last Impression request at impression time (ms, measured at the server).',
    oracle: o => { const t = ['in/imp', 'w0/imp'].flatMap(l => o.hits(l).map(h => h.t)); return t.length === 2 ? na(`${Math.max(...t) - Math.min(...t)} ms`) : na('not both fired'); } },
  // ------------------------------------------------------------------ macros
  { id: 'M01', area: 'macros', spec: 'IAB macro list: CACHEBUSTING (required)', strength: 'must', duty: 'track', vector: 'm_macros', mode: 'play', script: { kind: 'full' },
    claim: 'Replaces [CACHEBUSTING] with a random 8-digit integer.',
    oracle: o => { const q = new URLSearchParams((o.hits('in/imp')[0] || {}).query || ''); const v = q.get('cb'); if (v === null) return na('impression not fired'); return /^\d{8}$/.test(v) ? yes(v) : no(`"${v}" (${v.length} chars)`); } },
  { id: 'M02', area: 'macros', spec: 'IAB macro list: TIMESTAMP (required)', strength: 'must', duty: 'track', vector: 'm_macros', mode: 'play', script: { kind: 'full' },
    claim: 'Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05).',
    oracle: o => { const v = q(o, 'in/imp', 'ts'); if (v === undefined || v === null) return na('impression not fired'); return /^\d{4}-\d\d-\d\dT\d{1,2}:\d\d:\d\d(\.\d{1,3})?(Z|[+-]\d\d(:?\d\d)?)?$/.test(v) ? yes(v) : no(`"${v}"`); } },
  { id: 'M03', area: 'macros', spec: 'IAB macro list: LIMITADTRACKING (required)', strength: 'must', duty: 'track', vector: 'm_macros', mode: 'play', script: { kind: 'full' },
    claim: 'Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail).',
    oracle: o => { const v = q(o, 'in/imp', 'lat'); if (v === undefined || v === null) return na('impression not fired'); if (/^(0|1)$/.test(v)) return yes(v); return /^(-1|-2)$/.test(v) ? yes(`${v} (unknown/withheld; outside the 0/1 definition)`) : no(`"${v}"`); } },
  { id: 'M04', area: 'macros', spec: '§6.1 (encodeURIComponent on values)', strength: 'must', duty: 'track', vector: 'm_macros', mode: 'play', script: { kind: 'full' },
    claim: 'Percent-encodes macro values (the colons in TIMESTAMP).',
    oracle: o => { const raw = rawQ(o, 'in/imp', 'ts'); if (raw === undefined || raw === null) return na('impression not fired'); if (isMacro(raw)) return na('TIMESTAMP left unreplaced (see M02)'); let dec; try { dec = decodeURIComponent(raw); } catch { return no(`raw "${raw}" (malformed escape)`); } if (!dec.includes(':')) return na(`value "${dec}" has no reserved character`); return raw.includes(':') ? no(`raw "${raw}"`) : yes(raw); } },
  { id: 'M05', area: 'macros', spec: '§6.1 (do not replace unknown macros with -1)', strength: 'should', duty: 'track', vector: 'm_macros', mode: 'play', script: { kind: 'full' },
    claim: 'Does not write -1 into a macro it does not know ([NOTAREALMACRO]).',
    oracle: o => { const h = o.hits('in/imp')[0]; if (!h) return na('impression not fired'); const raw = (h.query.match(/[?&]unk=([^&]*)/) || [])[1]; if (raw === '-1') return no('replaced with -1'); let dec = raw; try { dec = decodeURIComponent(raw ?? ''); } catch {} return yes(`"${dec}"`); } },
  // ------------------------------------------------------------------ XML handling
  { id: 'X01', area: 'xml', spec: '§2.3.3 (whitespace around a CDATA-wrapped URI)', strength: 'should', duty: 'track', vector: 'x_whitespace', mode: 'play', script: { kind: 'full' },
    claim: 'Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it).',
    oracle: o => {
      const cand = [...(o.res.pixels || []), ...(o.res.fetches || []), ...((o.res.telemetry && o.res.telemetry.fetches) || []).map(f => f.url)].filter(u => /\/in\/imp/.test(u));
      if (!cand.length) return o.hits('in/imp').length ? na('requested, but the client-side URL was not observable') : no('impression not requested');
      const untrimmed = cand.filter(u => u !== u.trim());
      return untrimmed.length ? no(`handed untrimmed URL to the network: ${JSON.stringify(untrimmed[0]).slice(0, 80)}`) : yes('trimmed');
    } },
  { id: 'X02', area: 'xml', spec: '§2.2 (XML comments)', strength: 'must', duty: 'track', vector: 'x_comment', mode: 'play', script: { kind: 'full' },
    claim: 'Ignores XML comments inside an element when reading its URI.',
    oracle: o => (o.hits('in/imp').length ? yes('requested') : no('impression not requested')) },
  { id: 'X03', area: 'xml', spec: '§2.3.2 (character entities should be honored)', strength: 'should', duty: 'track', vector: 'x_entities', mode: 'play', script: { kind: 'full' },
    claim: 'Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3\'s CDATA rule, which real tags still do).',
    oracle: o => { const h = o.hits('in/imp')[0]; return h ? (h.query === '?a=1&b=2' ? yes(h.query) : no(h.query)) : no('impression not requested'); } },
  { id: 'X04', area: 'xml', spec: '(robustness; a 4.x document without the VAST namespace is not schema-valid)', strength: 'observation', duty: 'parse', vector: 'x_no_namespace', mode: 'load',
    claim: 'Parses a document that omits xmlns="http://www.iab.com/VAST".',
    oracle: o => (resolvedCount(o) > 0 ? yes('parsed') : no(`not parsed: ${o.res.error || 'no ad'}`)) },
  { id: 'X05', area: 'xml', spec: '§3.7.1 (UniversalAdId 1+; 4.2 XSD unbounded)', strength: 'must', duty: 'parse', vector: 'x_multi_uaid', mode: 'load',
    claim: 'Accepts a Creative with two UniversalAdId elements.',
    oracle: o => (resolvedCount(o) > 0 ? yes('accepted') : no(`rejected: ${o.res.error || 'no ad'}`)) },
  { id: 'X06', area: 'xml', spec: '§2.2 (play the ad in a VAST response); §3.9.5 (ClosedCaptionFile 0+)', strength: 'must', duty: 'parse', vector: 'x_multi_cc', mode: 'load',
    claim: 'Accepts two ClosedCaptionFile elements.',
    oracle: o => (resolvedCount(o) > 0 ? yes('accepted') : no(`rejected: ${o.res.error || 'no ad'}`)) },
  // ------------------------------------------------------------------ pods
  { id: 'P01', area: 'pods', spec: 'Ad Pods and Stand-Alone Ads', strength: 'must', duty: 'parse', vector: 'p_pod_order', mode: 'load',
    claim: 'Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional).',
    oracle: o => {
      const ids = (o.res.resolved || []).map(a => a.id);
      if (!ids.length) return o.res.error || o.res.errorCode ? na(`declined: ${o.res.error || o.res.errorCode}`) : no('no ad resolved and no error');
      if (ids.length === 1) return ids[0] === 'p1' ? yes('plays p1 first') : no(`plays ${ids[0]} first`);
      return ids.join(',') === 'p1,p2,p3' ? yes('p1,p2,p3') : no(`order ${ids.join(',')}`);
    } },
  // ------------------------------------------------------------------ robustness (not a VAST clause)
  { id: 'R01', area: 'robustness', spec: '(engineering; not a VAST clause)', strength: 'observation', duty: 'load', vector: 'w_timeout', mode: 'load', opts: { timeout: 2000 },
    claim: 'A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process).',
    oracle: o => ((o.res.uncaught || []).length ? no(`uncaught: ${o.res.uncaught.join(' | ')}`) : yes('none')) },
  { id: 'R02', area: 'robustness', spec: '(engineering; not a VAST clause)', strength: 'observation', duty: 'load', vector: 'w_http404', mode: 'load',
    claim: 'A failed Wrapper request does not escape as an uncaught exception.',
    oracle: o => ((o.res.uncaught || []).length ? no(`uncaught: ${o.res.uncaught.join(' | ')}`) : yes('none')) },
  // ==================================================================
  // ------------------------------------------------------------------ wrappers
  { id: 'W23', area: 'wrappers', spec: '§3.19 (fallbackOnNoAd)', strength: 'should', duty: 'select', vector: 'w_fallback_noad', mode: 'load',
    delegatedFor: { vastclient: 'the fallback is the integrator\'s, through hasRemainingAds() and getNextAds() (the harness integration does it)' },
    claim: 'With fallbackOnNoAd="true", when the Wrapper\'s target returns no ad, a stand-alone ad from the response is used.',
    oracle: o => { const ids = (o.res.resolved || []).map(a => a.id).concat(o.res.played || []); return ids.includes('s1') && o.docs.includes('noad.xml') ? yes(`used s1 (${fmt([...new Set(ids)])})`) : no(`resolved ${fmt(ids)}; fetched ${fmt(o.docs)}; error ${o.res.error || 'none'}`); } },
  // ------------------------------------------------------------------ errors
  { id: 'E05', area: 'errors', spec: 'Error Reporting (table 401)', strength: 'must', duty: 'media', layer: 'browser', vector: 'e_media_404', mode: 'play', script: { kind: 'full' },
    claim: 'When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found).',
    oracle: o => { const c = o.codes('in/err'); return c.length ? expectCode(c, '401') : no('Error URI not requested'); } },
  { id: 'E06', area: 'errors', spec: 'Error Reporting (table 405)', strength: 'must', duty: 'media', layer: 'browser', vector: 'e_media_corrupt', mode: 'play', script: { kind: 'full' },
    claim: 'When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405.',
    oracle: o => { const c = o.codes('in/err'); return c.length ? expectCode(c, '405') : no('Error URI not requested'); } },
  { id: 'E07', area: 'errors', spec: 'Error Reporting (table 402)', strength: 'must', duty: 'media', layer: 'browser', vector: 'e_media_timeout', mode: 'play', script: { kind: 'full' },
    claim: 'When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout).',
    oracle: o => { const c = o.codes('in/err'); return c.length ? expectCode(c, '402') : no('Error URI not requested'); } },
  { id: 'E08', area: 'errors', spec: '§3.4.11 (Error is for ads that cannot be served)', strength: 'should', duty: 'track', vector: 't_inline_full', mode: 'play', script: { kind: 'full' },
    claim: 'Does not request the Error URI when the ad plays without a problem.',
    oracle: o => (o.hits('in/err').length ? no(`Error URI requested (${fmt(o.codes('in/err'))})`) : yes('no error request')) },
  { id: 'E09', area: 'errors', spec: '§2.3.1; Error Reporting (table 200, 201)', strength: 'must', duty: 'media', vector: 'e_nonlinear_only', mode: 'play', script: { kind: 'full' },
    claim: 'Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity).',
    oracle: o => {
      if (o.hits('in/nl-view').length || o.hits('in/imp').length) return yes('displayed the NonLinear creative');
      const c = o.codes('in/err');
      return c.length ? expectCode(c, ['200', '201']) : no('neither displayed nor reported');
    } },
  // ------------------------------------------------------------------ tracking: impressions and user actions
  { id: 'T10', area: 'tracking', spec: '§2.3.4 (IAB Digital Video Measurement Guidelines); §3.4.4', strength: 'should', duty: 'media', vector: 'e_inline_unplayable', mode: 'play', script: { kind: 'full' },
    claim: 'Does not request the Impression of an ad whose media never plays (no supported MediaFile).',
    oracle: o => (o.hits('in/imp').length ? no('impression requested for an ad that never played') : yes('no impression')) },
  { id: 'T11', area: 'tracking', spec: '§3.4.4 (notify when the impression occurs); §2.3.4', strength: 'should', duty: 'track', vector: 't_interact', mode: 'play', script: { kind: 'interact' },
    claim: 'Requests the Impression exactly once across pause, resume, mute and unmute.',
    oracle: o => (o.hits('in/imp').length === 1 ? yes('once') : no(`${o.hits('in/imp').length} times`)) },
  { id: 'T12', area: 'tracking', spec: '§3.14.1 (pause)', strength: 'must', duty: 'track', vector: 't_interact', mode: 'play', script: { kind: 'interact' },
    claim: 'Fires the pause tracker once when the user pauses.',
    oracle: o => (o.hits('in/pause').length === 1 ? yes('once') : no(`${o.hits('in/pause').length} times`)) },
  { id: 'T13', area: 'tracking', spec: '§3.14.1 (resume)', strength: 'must', duty: 'track', vector: 't_interact', mode: 'play', script: { kind: 'interact' },
    claim: 'Fires the resume tracker once when the user resumes.',
    oracle: o => (o.hits('in/resume').length === 1 ? yes('once') : no(`${o.hits('in/resume').length} times`)) },
  { id: 'T14', area: 'tracking', spec: '§3.14.1 (mute)', strength: 'must', duty: 'track', vector: 't_interact', mode: 'play', script: { kind: 'interact' },
    claim: 'Fires the mute tracker once when the user mutes.',
    oracle: o => (o.res.startedMuted ? na('media started muted (autoplay policy)') : o.hits('in/mute').length === 1 ? yes('once') : no(`${o.hits('in/mute').length} times`)) },
  { id: 'T15', area: 'tracking', spec: '§3.14.1 (unmute)', strength: 'must', duty: 'track', vector: 't_interact', mode: 'play', script: { kind: 'interact' },
    claim: 'Fires the unmute tracker when the user unmutes.',
    oracle: o => (o.res.startedMuted ? na('media started muted (autoplay policy)') : o.hits('in/unmute').length >= 1 ? yes(`${o.hits('in/unmute').length} time(s)${o.hits('in/unmute').length > 1 ? ' (extra unmute graded by T23)' : ''}`) : no('not fired')) },
  { id: 'T23', area: 'tracking', spec: '§3.14.1 (unmute: the user unmuted)', strength: 'should', duty: 'track', vector: 't_interact', mode: 'play', script: { kind: 'interact' },
    delegatedFor: { vastclient: 'volume changes are reported by the integrator (setMuted); the library sees none' },
    claim: 'A volume change that is not an unmute (0.5 while unmuted) does not fire unmute.',
    oracle: o => { if (o.res.startedMuted) return na('media started muted (autoplay policy)'); const n = o.hits('in/unmute').length; return n === 1 ? yes('unmute once') : n === 0 ? na('no unmute at all (see T15)') : no(`unmute fired ${n} times`); } },
  { id: 'T20', area: 'tracking', spec: '§3.14.1 (loaded)', strength: 'should', duty: 'track', vector: 't_interact', mode: 'play', script: { kind: 'interact' },
    claim: 'Fires the loaded tracker once when the media is ready to play.',
    oracle: o => (o.hits('in/loaded').length === 1 ? yes('once') : no(`${o.hits('in/loaded').length} times`)) },
  { id: 'T16', area: 'tracking', spec: '§2.3.1 (Skippable Linear); §3.8 skipoffset; §3.14.1 (skip)', strength: 'must', duty: 'track', vector: 't_skip', mode: 'play', script: { kind: 'skip', probeAt: 1.5, at: 6 },
    claim: 'Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type).',
    oracle: o => { if (o.res.skipControlAfterOffset === false && !o.hits('in/skip').length) return na('no skip control offered (skippable ads not supported)'); const sk = o.hits('in/skip').length, q3 = o.hits('in/thirdQuartile').length, c = o.hits('in/complete').length; return sk === 1 && q3 === 0 && c === 0 ? yes('skip only') : no(`skip ${sk}, thirdQuartile ${q3}, complete ${c}`); } },
  { id: 'T17', area: 'tracking', spec: '§3.8 (skipoffset: when skip controls are made available)', strength: 'should', duty: 'track', vector: 't_skip', mode: 'play', script: { kind: 'skip', probeAt: 1.5, at: 6 },
    delegatedFor: { vastlint: 'skip availability is the integrator\'s: the library exposes skipOffset as raw text and no availability API (the harness computes it)' },
    claim: 'The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03).',
    oracle: o => { const b = o.res.skipControlBeforeOffset, a = o.res.skipControlAfterOffset; if (b === undefined || a === undefined) return na('not observable'); return !b && a ? yes('offered after the offset only') : no(`before offset ${b}, after offset ${a}`); } },
  { id: 'T18', area: 'tracking', spec: '§3.8 skipoffset; VAST 4.2 XSD (skipoffset pattern allows n%)', strength: 'should', duty: 'track', vector: 't_skip_pct', mode: 'play', script: { kind: 'skip', probeAt: 1.5, at: 6 },
    delegatedFor: { vastlint: 'skip availability is the integrator\'s: the library exposes skipOffset as raw text and no availability API (the harness computes it)' },
    claim: 'A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip.',
    oracle: o => { const b = o.res.skipControlBeforeOffset, a = o.res.skipControlAfterOffset, sk = o.hits('in/skip').length; if (b === undefined) return na('not observable'); return !b && a && sk >= 1 ? yes('available after 30%; skip fired') : no(`before ${b}, after ${a}, skip ${sk}`); } },
  { id: 'T19', area: 'tracking', spec: '§3.14.3 (progress counts a view even if the ad is skipped)', strength: 'should', duty: 'track', vector: 't_skip', mode: 'play', script: { kind: 'skip', probeAt: 1.5, at: 6 },
    claim: 'Progress offsets passed before the skip (2 s and 5 s) are fired.',
    oracle: o => { const a = o.hits('in/p-2s').length, b = o.hits('in/p-5s').length; if (!a && !b) return na('no progress tracker fired (see T05)'); return a === 1 && b === 1 ? yes('both fired once') : no(`2 s: ${a}, 5 s: ${b}`); } },
  { id: 'T21', area: 'tracking', spec: '§3.14.1 (rewind)', strength: 'must', duty: 'track', vector: 't_rewind', mode: 'play', script: { kind: 'rewind' },
    claim: 'Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%).',
    oracle: o => (o.hits('in/rewind').length === 1 ? yes(`${o.hits('in/rewind').length} time(s)`) : no('not fired')) },
  { id: 'T22', area: 'tracking', spec: '§3.14.1 (quartiles: played continuously)', strength: 'should', duty: 'track', vector: 't_rewind', mode: 'play', script: { kind: 'rewind' },
    claim: 'After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again.',
    oracle: o => { if (!o.hits('in/complete').length) return na('ad did not play to the end'); const n = ['midpoint', 'p-5s'].map(e => o.hits(`in/${e}`).length); if (n.some(x => x > 1)) return no(`midpoint ${n[0]}, p-5s ${n[1]}`); return n[0] === 1 ? yes(`not repeated (midpoint ${n[0]}, p-5s ${n[1]}${n[1] === 0 ? '; progress unsupported, see T05' : ''})`) : na(`midpoint ${n[0]}`); } },
  // ------------------------------------------------------------------ verification
  // A01, A02 and A04 use a_verification_inline (one InLine, no Wrapper); A03 uses a_verification_js, a Wrapper with its
  // own verification in front of that InLine. Both resources are real JavaScript (application/javascript) with an
  // apiFramework no player implements. A resource that fails to load (reason 3) is tested separately by A05.
  { id: 'A01', area: 'verification', spec: '§3.17; §3.17.4 (verificationNotExecuted)', strength: 'must', duty: 'verify', vector: 'a_verification_inline', mode: 'play', script: { kind: 'full' },
    delegatedFor: { vastclient: 'whether to execute the resource, and so whether to report it, is the integrator\'s (tracker.verificationNotExecuted)',
      vastlint: VASTLINT_VERIFY },
    claim: 'When it does not execute the InLine\'s verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI.',
    oracle: o => (o.hits('in/vne').length ? yes(`requested (reason ${fmt(o.hits('in/vne').map(h => new URLSearchParams(h.query).get('reason')))})`) : no(`not requested${o.scripts('in/verif-js').length ? ' (resource was fetched)' : ''}`)) },
  { id: 'A02', area: 'verification', spec: '§3.17.4 [REASON]; IAB macro list: REASON (required)', strength: 'must', duty: 'verify', vector: 'a_verification_inline', mode: 'play', script: { kind: 'full' },
    delegatedFor: { vastclient: 'the REASON value is passed in by the integrator (tracker.verificationNotExecuted(vendor, { REASON }))', vastlint: VASTLINT_REASON },
    claim: 'Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3).',
    oracle: o => { const v = q(o, 'in/vne', 'reason'); if (v === undefined) return na('not requested (see A01)'); return /^[123]$/.test(v) ? yes(v) : no(`"${v}"`); } },
  { id: 'A03', area: 'verification', spec: 'Viewability with Ad Verification Services (resources from intermediary Wrappers)', strength: 'should', duty: 'verify', vector: 'a_verification_js', mode: 'play', script: { kind: 'full' },
    claim: 'Handles the Wrapper\'s verification too: requests its verificationNotExecuted URI.',
    oracle: o => (o.hits('w0/vne').length ? yes('requested') : no('not requested')) },
  { id: 'A04', area: 'verification', spec: '§3.17.4 (reason code 2); §3.17.1; Viewability with Ad Verification Services', strength: 'must', duty: 'verify', vector: 'a_verification_inline', mode: 'play', script: { kind: 'full' },
    delegatedFor: { vastclient: 'the REASON value is passed in by the integrator (tracker.verificationNotExecuted(vendor, { REASON }))', vastlint: VASTLINT_REASON },
    claim: 'Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported).',
    oracle: o => { const r = o.hits('in/vne').map(h => new URLSearchParams(h.query).get('reason')); if (!r.length) return na('not requested (see A01)'); return r.every(v => v === '2') ? yes('reason 2') : no(`reason ${fmt(r)}`); } },
  { id: 'A05', area: 'verification', spec: '§3.17.4 (reason code 3: 404 or other failed response codes); Viewability with Ad Verification Services', strength: 'must', duty: 'verify', vector: 'a_verification_404', mode: 'play', script: { kind: 'full' },
    delegatedFor: { vastclient: 'the REASON value is passed in by the integrator (tracker.verificationNotExecuted(vendor, { REASON }))', vastlint: VASTLINT_REASON },
    claim: 'When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load).',
    oracle: o => {
      const r = o.hits('in/vne').map(h => new URLSearchParams(h.query).get('reason')), fetched = o.scripts('in/verif-js').length > 0;
      if (r.includes('3')) return yes(`reason 3${fetched ? ' (resource fetched, 404)' : ''}`);
      if (r.length && r.every(v => v === '1' || v === '2')) return na(`declined before loading (reason ${fmt(r)}); the load failure did not arise`);
      if (r.length) return no(`reason ${fmt(r)}`);
      return fetched ? no('resource fetched (404); verificationNotExecuted not requested') : na('resource neither fetched nor reported (see A01)');
    } },
  // ------------------------------------------------------------------ media selection and ad types
  { id: 'S01', area: 'media', spec: 'MediaFiles (choose by attributes, not document order)', strength: 'should', duty: 'media', vector: 's_flv_first', mode: 'play', script: { kind: 'full' },
    claim: 'Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one.',
    oracle: o => { const m = chosenMedia(o); if (!m.length) return no('no media chosen'); return m.some(u => /\.flv/.test(u)) ? no(`chose ${fmt(m.filter(u => /\.flv/.test(u)))}`) : yes(`chose ${m[0].replace(/^.*\//, '')}`); } },
  { id: 'S02', area: 'media', spec: '§1.4; §3.4 (adType="audio")', strength: 'may', duty: 'media', layer: 'browser', vector: 's_audio', mode: 'play', script: { kind: 'full' },
    claim: 'Optional: plays an audio ad (adType="audio", Opus WebM and AAC files).',
    oracle: o => (o.hits('in/start').length ? yes('played (start fired)') : na(`not supported (optional)${o.codes('in/err').length ? '; reported ' + fmt(o.codes('in/err')) : ''}`)) },
  // ------------------------------------------------------------------ macros
  { id: 'M06', area: 'macros', spec: '§6.1 (unprovided optional macros must become -1 or -2)', strength: 'must', duty: 'track', vector: 'm_optional_noflv', mode: 'play', script: { kind: 'full' },
    claim: 'Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty.',
    oracle: o => {
      if (!o.hits('in/imp').length) return na('impression not fired');
      const ok = { ah: v => /^\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(v), asi: v => v === 'in-serving', ua: v => /ad-id\.org/.test(v), ps: v => /^\d+$/.test(v), au: v => /^https?:\/\//.test(v), bp: v => /^\d+$/.test(v), ifa: v => v.length > 0, cua: v => v.length > 0 };
      const bad = Object.keys(ok).filter(k => { const r = rawQ(o, 'in/imp', k); if (r === null || r === undefined || isMacro(r)) return true; let v; try { v = decodeURIComponent(r); } catch { return true; } return !(unknownValue(v) || ok[k](v)); });
      return bad.length ? no(`not replaced or implausible: ${bad.map(k => `${k}="${rawQ(o, 'in/imp', k)}"`).join(', ')}`) : yes('all replaced');
    } },
  { id: 'M07', area: 'macros', spec: '§3.4.3 (player fills [ADSERVINGID] from AdServingId)', strength: 'should', duty: 'track', vector: 'm_optional_noflv', mode: 'play', script: { kind: 'full' },
    claim: 'Fills [ADSERVINGID] with the ad\'s AdServingId (in-serving).',
    oracle: o => { const v = q(o, 'in/imp', 'asi'); if (v === undefined) return na('impression not fired'); return v === 'in-serving' ? yes(v) : no(`"${v}"`); } },
  { id: 'M08', area: 'macros', spec: 'IAB macro list: ADPLAYHEAD (HH:MM:SS.mmm)', strength: 'should', duty: 'track', vector: 'm_optional_noflv', mode: 'play', script: { kind: 'full' },
    claim: 'When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s.',
    oracle: o => { const v = q(o, 'in/midpoint', 'ah'); if (v === undefined) return na('midpoint not fired'); if (v === null || isMacro(v)) return na('left as macro (see M06)'); if (unknownValue(v)) return na(`not provided (${v})`); const m = v.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/); if (!m) return no(`"${v}"`); const sec = m[1] * 3600 + m[2] * 60 + Number(m[3]) + m[4] / 1000; return sec >= 4 && sec <= 6.5 ? yes(v) : no(`${v} at midpoint`); } },
  { id: 'M09', area: 'macros', spec: '§6.1 (Array values: encode each value, commas unencoded); IAB macro list: UNIVERSALADID', strength: 'should', duty: 'track', vector: 'm_optional_noflv', mode: 'play', script: { kind: 'full' },
    // The macro list ("Multiple UniversalAdIds can be supported with a comma-separating them") permits but does not
    // require several IDs.
    claim: 'Fills [UNIVERSALADID] with one or more of the Creative\'s IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma.',
    oracle: o => { const r = rawQ(o, 'in/imp', 'ua'); if (r === undefined) return na('impression not fired'); if (r === null || isMacro(r)) return na('left as macro (see M06)'); if (unknownValue(r)) return na(`not provided (${r})`); const ok = [encodeURIComponent('ad-id.org ABCD 1234'), encodeURIComponent('clearcast.co.uk CC/ABC/123')]; const parts = r.split(','); return parts.every(p => ok.includes(p)) && new Set(parts).size === parts.length ? yes(`${r}${parts.length === 1 ? ' (1 of 2 IDs; several IDs are optional)' : ''}`) : no(`raw "${r}"`); } },
  { id: 'M10', area: 'macros', spec: 'IAB macro list: ASSETURI (the media file being played)', strength: 'should', duty: 'track', vector: 'm_optional', mode: 'play', script: { kind: 'full' },
    claim: 'When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first).',
    oracle: o => { const v = q(o, 'in/imp', 'au'); if (v === undefined) return na('impression not fired'); if (v === null || isMacro(v)) return na('left as macro (see M06)'); if (unknownValue(v)) return na(`not provided (${v})`); const m = chosenMedia(o); if (!m.length) return na(`no played media observed; ASSETURI ${v.replace(/^.*\//, '')}`); const match = m.some(u => u === v || v.endsWith(u) || u.endsWith(v.replace(/^https?:\/\/[^/]+/, ''))); return match ? yes(v.replace(/^.*\//, '')) : no(`ASSETURI ${v.replace(/^.*\//, '')}; played ${fmt(m.map(u => u.replace(/^.*\//, '')))}`); } },
  { id: 'M11', area: 'macros', spec: 'IAB macro list: CACHEBUSTING, TIMESTAMP (contexts: all tracking pixels, including Error)', strength: 'must', duty: 'track', vector: 'm_error_context', mode: 'play', script: { kind: 'full' },
    claim: 'Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI.',
    oracle: o => { const cb = q(o, 'in/err', 'cb'), ts = q(o, 'in/err', 'ts'); if (cb === undefined) return na('no error request'); return cb && ts && !isMacro(cb) && !isMacro(ts) && /^\d+$/.test(cb) ? yes(`cb ${cb}, ts ${ts}`) : no(`cb "${cb}", ts "${ts}"`); } },
  { id: 'M12', area: 'macros', spec: 'IAB macro list: CACHEBUSTING, TIMESTAMP (contexts: VAST request URIs)', strength: 'must', duty: 'load', vector: 'm_request_context', mode: 'load',
    claim: 'Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper\'s VASTAdTagURI before requesting it.',
    oracle: o => { const d = o.docReqs.find(e => /inline\.xml$/.test(e.path)); if (!d) return no('InLine not requested'); const p = new URLSearchParams(d.query || ''); const cb = p.get('cb'), ts = p.get('ts'); return cb && ts && !isMacro(cb) && !isMacro(ts) && /^\d+$/.test(cb) ? yes(`cb ${cb}, ts ${ts}`) : no(`cb "${cb}", ts "${ts}"`); } },
  // ------------------------------------------------------------------ pods
  { id: 'P06', area: 'pods', spec: 'Ad Pods (play the pod in sequence; play as many ads as possible)', strength: 'should', duty: 'media', vector: 'p_pod_play', mode: 'play', script: { kind: 'pod' },
    claim: 'Plays all three ads of a pod.',
    oracle: o => { const got = ['p1', 'p2', 'p3'].filter(a => o.hits(`${a}/imp`).length); return got.length === 3 ? yes('p1,p2,p3') : no(`played ${fmt(got)}`); } },
  { id: 'P03', area: 'pods', spec: '§2.3.4 (fire each tracker at the appropriate time); Ad Pods', strength: 'must', duty: 'media', vector: 'p_pod_play', mode: 'play', script: { kind: 'pod' },
    claim: 'Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad\'s.',
    oracle: o => {
      const ads = ['p1', 'p2', 'p3'], imp = ads.map(a => o.hits(`${a}/imp`)), cmp = ads.map(a => o.hits(`${a}/complete`));
      const played = imp.filter(h => h.length).length;
      if (played < 2) return na(`plays ${played} of 3 pod ads (see P06)`);
      const bad = ads.filter((a, i) => imp[i].length && (imp[i].length !== 1 || cmp[i].length !== 1 || cmp[i][0].t < imp[i][0].t || (i < 2 && imp[i + 1].length && cmp[i][0].t > imp[i + 1][0].t + 50)));
      return bad.length ? no(`misattributed: ${ads.map((a, i) => `${a} imp ${imp[i].length} complete ${cmp[i].length}`).join('; ')}`) : yes(`one impression and one complete per ad (${played} ads)`);
    } },
  { id: 'P02', area: 'pods', spec: 'Ad Pods (an ad fails: move on)', strength: 'should', duty: 'media', layer: 'browser', vector: 'p_pod_fail', mode: 'play', script: { kind: 'pod' },
    claim: 'When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad).',
    oracle: o => {
      if (!o.hits('p1/imp').length) return no('first pod ad did not play');
      const triedP2 = o.media.some(m => /[?&]ad=p2(&|$)/.test(m.query)) || o.hits('p2/err').length || o.hits('p2/imp').length;
      if (!triedP2) return na('the pod was not continued past its first ad (see P06)');
      const after = ['s1', 'p3'].filter(p => o.hits(`${p}/imp`).length);
      return after.length ? yes(`continued with ${after.join(',')}`) : no('stopped after the failed ad');
    } },
  { id: 'P05', area: 'pods', spec: 'Ad Pods (substitute an un-played stand-alone ad)', strength: 'should', duty: 'media', layer: 'browser', vector: 'p_pod_fail', mode: 'play', script: { kind: 'pod' },
    claim: 'The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third.',
    oracle: o => {
      const triedP2 = o.media.some(m => /[?&]ad=p2(&|$)/.test(m.query)) || o.hits('p2/err').length || o.hits('p2/imp').length;
      if (!triedP2) return na('the pod was not continued past its first ad (see P06)');
      const s = (o.hits('s1/imp')[0] || {}).t, p1 = (o.hits('p1/imp')[0] || {}).t, p3 = (o.hits('p3/imp')[0] || {}).t;
      if (s === undefined) return no(`stand-alone ad not played${p3 !== undefined ? '; moved to p3' : ''}`);
      if (p1 !== undefined && s < p1) return no('s1 played before the pod');
      return p3 === undefined || s <= p3 ? yes('s1 substituted') : no('s1 played after p3');
    } },
  // ------------------------------------------------------------------ icons
  { id: 'I01', area: 'icons', spec: 'Industry Icon Support; §3.11.2 IconViewTracking', strength: 'must', duty: 'render', layer: 'browser', vector: 'i_icon', mode: 'play', script: { kind: 'icon' },
    claim: 'Displays the Icon after the ad starts and requests its IconViewTracking URI.',
    oracle: o => { const v = o.hits('in/icon-view'), st = (o.hits('in/start')[0] || {}).t; if (!v.length) return no(`not requested${o.hits('in/icon-img').length ? ' (icon image fetched)' : ''}`); if (o.res.iconRendered === false) return no('view requested but no icon rendered'); if (st === undefined) return no('view requested, ad never started'); return v[0].t >= st - 50 ? yes(`requested ${st === undefined ? '' : (v[0].t - st) + ' ms '}after start`) : no('requested before the ad started'); } },
  { id: 'I03', area: 'icons', spec: '§3.11.1 Icon (offset, duration)', strength: 'should', duty: 'render', layer: 'browser', vector: 'i_icon_timed', mode: 'play', script: { kind: 'icon' },
    claim: 'Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI.',
    oracle: o => { const v = o.hits('in/icon-view'), st = (o.hits('in/start')[0] || {}).t; if (!v.length) return no(`not requested${o.hits('in/icon-img').length ? ' (icon image fetched)' : ''}`); if (o.res.iconRendered === false) return no('view requested but no icon rendered'); if (st === undefined) return no('view requested, ad never started'); return v[0].t >= st + 800 ? yes(`requested ${st === undefined ? '' : (v[0].t - st) + ' ms '}after start`) : no(`requested ${v[0].t - st} ms after start, before the 1 s offset`); } },
  { id: 'I02', area: 'icons', spec: '§3.11.5 IconClickTracking', strength: 'must', duty: 'render', layer: 'browser', vector: 'i_icon', mode: 'play', script: { kind: 'icon' },
    claim: 'On a click on the Icon, requests its IconClickTracking URI.',
    oracle: o => { if (o.res.iconRendered === false || (!o.hits('in/icon-view').length && o.res.iconRendered !== true)) return na('icon not displayed (see I01)'); return o.hits('in/icon-click').length ? yes('requested') : no('not requested'); } },
  // ------------------------------------------------------------------ XML and versions
  { id: 'X07', area: 'xml', spec: '§2.3.3; §3.19.1 VASTAdTagURI', strength: 'observation', duty: 'load', vector: 'x_adtaguri_ws', mode: 'load',
    claim: 'Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace).',
    oracle: o => (resolvedCount(o) > 0 && o.docs.includes('inline.xml') ? yes('followed') : no(`fetched ${fmt(o.docs)}; resolved ${resolvedCount(o)}`)) },
  { id: 'X08', area: 'xml', spec: '§3.14.3 (event values are an enumeration)', strength: 'should', duty: 'track', vector: 'x_unknown_event', mode: 'play', script: { kind: 'full' },
    claim: 'Never requests a Tracking element whose event name is not a VAST event (notARealEvent).',
    oracle: o => (o.hits('in/unknown-event').length ? no('requested') : yes('ignored')) },
  { id: 'X09', area: 'xml', spec: '§3.18 Extensions (custom XML for the publisher, not VAST elements)', strength: 'should', duty: 'track', vector: 'x_extension_impression', mode: 'play', script: { kind: 'full' },
    claim: 'Does not request Impression or Tracking URIs that appear inside an Extension.',
    oracle: o => { if (!o.hits('in/imp').length) return na('the real Impression was not requested (see T01)'); const ext = ['ext/imp', 'ext/start', 'ext/err'].filter(l => o.hits(l).length); return ext.length ? no(`requested ${ext.join(',')}`) : yes('ignored'); } },
  { id: 'X10', area: 'xml', spec: '§2.3.2 (XML 1.0: a UTF-8 byte order mark is allowed)', strength: 'must', duty: 'load', vector: 'x_bom', mode: 'load',
    claim: 'Parses a document that starts with a UTF-8 byte order mark.',
    oracle: o => (resolvedCount(o) > 0 ? yes('parsed') : no(`not parsed: ${o.res.error || 'no ad'}`)) },
  { id: 'X11', area: 'xml', spec: '§2.3.3 (a URI containing "]]>" split across CDATA sections)', strength: 'must', duty: 'track', vector: 'x_cdata_split', mode: 'play', script: { kind: 'full' },
    claim: 'Reassembles an Impression URI split across two CDATA sections (query s=x]]>x).',
    oracle: o => { const v = q(o, 'in/imp', 's'); if (v === undefined) return no('impression not requested'); return v === 'x]]>x' ? yes(v) : no(`s="${v}"`); } },
  { id: 'X12', area: 'xml', spec: '§3.7.1 (VAST 4.0 idValue attribute: players should not fail)', strength: 'should', duty: 'load', vector: 'x_uaid_idvalue', mode: 'load',
    claim: 'Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute.',
    oracle: o => (resolvedCount(o) > 0 ? yes('accepted') : no(`rejected: ${o.res.error || 'no ad'}`)) },
  { id: 'X13', area: 'xml', spec: '§3.4.4 (Impression)', strength: 'must', duty: 'track', vector: 'x_empty_impression', mode: 'play', script: { kind: 'full' },
    claim: 'An empty Impression element does not stop the other Impression from being requested.',
    oracle: o => (o.hits('in/imp').length ? yes('requested') : no('not requested')) },
  { id: 'X14', area: 'xml', spec: '§4.3 Media Players (accept older VAST versions)', strength: 'should', duty: 'load', vector: 'v_30', mode: 'load',
    claim: 'Accepts a VAST 3.0 InLine document.',
    oracle: o => (resolvedCount(o) > 0 ? yes('accepted') : no(`rejected: ${o.res.error || 'no ad'}`)) },
  { id: 'X15', area: 'xml', spec: '§4.3 Media Players (accept older VAST versions)', strength: 'should', duty: 'load', vector: 'v_20', mode: 'load',
    claim: 'Accepts a VAST 2.0 InLine document.',
    oracle: o => (resolvedCount(o) > 0 ? yes('accepted') : no(`rejected: ${o.res.error || 'no ad'}`)) },
  { id: 'X16', area: 'xml', spec: '§4.3 Media Players (accept older VAST versions)', strength: 'should', duty: 'load', vector: 'v_mixed_chain', mode: 'load',
    claim: 'Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine.',
    oracle: o => (resolvedCount(o) > 0 && o.docs.includes('inline.xml') ? yes('resolved') : no(`fetched ${fmt(o.docs)}; resolved ${resolvedCount(o)}`)) },
  // ------------------------------------------------------------------ robustness (HTTP)
  { id: 'R03', area: 'robustness', spec: '(HTTP; not a VAST clause)', strength: 'observation', duty: 'load', vector: 'r_redirect', mode: 'load',
    claim: 'Follows an HTTP 302 redirect on a VASTAdTagURI.',
    oracle: o => (resolvedCount(o) > 0 && o.docs.includes('inline2.xml') ? yes('followed') : no(`fetched ${fmt(o.docs)}; resolved ${resolvedCount(o)}`)) },
  { id: 'R04', area: 'robustness', spec: '(HTTP; not a VAST clause)', strength: 'observation', duty: 'load', vector: 'r_gzip_root', entryQuery: '?gzip=1', mode: 'load',
    claim: 'Parses a VAST response sent with Content-Encoding: gzip.',
    oracle: o => (resolvedCount(o) > 0 ? yes('parsed') : no(`not parsed: ${o.res.error || 'no ad'}`)) },
  { id: 'R05', area: 'robustness', spec: '(HTTP; not a VAST clause)', strength: 'observation', duty: 'load', vector: 'r_text_plain_root', entryQuery: '?ctype=text/plain', mode: 'load',
    claim: 'Parses a VAST response served as text/plain rather than an XML media type.',
    oracle: o => (resolvedCount(o) > 0 ? yes('parsed') : no(`not parsed: ${o.res.error || 'no ad'}`)) },
  { id: 'R06', area: 'robustness', spec: '(HTTP; not a VAST clause)', strength: 'observation', duty: 'track', vector: 'r_pixel_500', mode: 'play', script: { kind: 'full' },
    claim: 'A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete).',
    oracle: o => { const n = ['firstQuartile', 'midpoint', 'thirdQuartile', 'complete'].filter(e => o.hits(`in/${e}`).length); return n.length === 4 ? yes('all later trackers fired') : no(`fired ${fmt(n)}`); } },
  // ==================================================================
  { id: 'X17', area: 'xml', spec: '§2.2 (acknowledge XML comments); §2.3.2', strength: 'must', duty: 'track', vector: 'x_comment_impression', mode: 'play', script: { kind: 'full' },
    claim: 'Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression).',
    oracle: o => { if (!o.hits('in/imp').length) return na('the real Impression was not requested (see T01)'); return o.hits('cmt/imp').length ? no('requested the commented-out Impression') : yes('ignored'); } },
  { id: 'X18', area: 'xml', spec: '§2.3.2 (character entities should be honored); §3.19.1 VASTAdTagURI', strength: 'should', duty: 'load', vector: 'x_adtaguri_amp', mode: 'load',
    claim: 'Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3).',
    oracle: o => adTagQuery(o) },
  { id: 'X19', area: 'xml', spec: '§2.3.2 (character entities should be honored); §3.19.1 VASTAdTagURI', strength: 'should', duty: 'load', vector: 'x_adtaguri_ncr', mode: 'load',
    claim: 'Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3).',
    oracle: o => adTagQuery(o) },
  { id: 'P07', area: 'pods', spec: 'Ad Pods and Stand-Alone Ads (play the pod in the prescribed sequence); §3.19', strength: 'must', duty: 'parse', vector: 'p_pod_wrapper', mode: 'load',
    claim: 'Orders the pod ads of a Wrapper\'s target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional).',
    oracle: o => {
      const ids = (o.res.resolved || []).map(a => a.id);
      if (!ids.length && o.docs.includes('pod.xml') && (String(o.res.errorCode) === '303' || /\b303\b/.test(String(o.res.error || '')))) return no(`fetched the pod and reported no ad (303): ${String(o.res.error || o.res.errorCode).slice(0, 60)}`);
      if (!ids.length) return o.res.error || o.res.errorCode ? na(`declined: ${o.res.error || o.res.errorCode}`) : no('no ad resolved and no error');
      if (ids.length === 1) return ids[0] === 'p1' ? yes('plays p1 first') : no(`plays ${ids[0]} first`);
      return ids.join(',') === 'p1,p2,p3' ? yes('p1,p2,p3') : no(`order ${ids.join(',')}`);
    } },
];

// Vectors whose entry document is a Wrapper. A client that never requests a Wrapper's target cannot be graded on
// what it does further down the chain; evaluate.mjs grades those cells n/a and the failure is counted once, in W01
// (W02 tests whether a particular Wrapper is followed, so it keeps its own verdict).
export const WRAPPER_START_VECTORS = new Set(['a_verification_js', 'p_pod_wrapper', 'x_adtaguri_amp', 'x_adtaguri_ncr', 'm_request_context', 'r_redirect', 't_wrapper_events',
  'v_mixed_chain', 'w_allow_multiple_default', 'w_allow_multiple_false', 'w_blocked_category', 'w_click_inline_wins', 'w_click_tracking',
  'w_click_wrapper_fallback', 'w_fallback_noad', 'w_five', 'w_follow_false', 'w_http404', 'w_loop', 'w_malformed', 'w_noad', 'w_one', 'w_one_seq',
  'w_six', 'w_timeout', 'w_two_wrappers_inline_error', 'x_adtaguri_ws']);
for (const r of REQUIREMENTS) r.startsWithWrapper = WRAPPER_START_VECTORS.has(r.vector) && !['W01', 'W02'].includes(r.id);
