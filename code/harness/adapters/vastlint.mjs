// Adapter: vastlint-client 0.15.0 (Apache-2.0, by Aleksander Sekowski; validation core in vastlint 0.15.0, WebAssembly).
// A headless runtime: createVastSession() fetches the root tag and follows the Wrapper chain; the playback queue
// controller (createVastPlaybackQueueController, the pod-aware integration its README documents) selects media and
// dispatches tracking when the integrator reports player state. The harness is the careful integrator: it calls
// start(), updateProgress() on each time update, completeCurrent() at the end, next() between pod ads, and pause,
// resume, setMuted, click, skip and signalError for user actions and errors, as the controller's API is laid out.
//
// The library reports a failed chain only as snapshot.resolution.stoppedReason (free text) and fires no Error URI on
// its own; it determines no VAST error code. The harness does not invent one: load-time error reporting is graded
// 'delegated' for this client (CAPS.vastlint.loadErrors = false). Media-file errors are reported the way the API
// offers, signalError({ macros: { ERRORCODE } }) with the code the harness determined, as for vast-client-js.
import { ad, creative, hms } from './normalize.mjs';

// VASTCONF_MODULE (version sweep, sweep/run-sweep.mjs) substitutes another release of the library; the reported
// version then comes from VASTCONF_MODULE_VERSION.
export const client = { id: 'vastlint', name: 'vastlint-client', version: '0.15.0 (vastlint 0.15.0)', language: 'JavaScript (WebAssembly core)' };

let mod;
async function lib() { return (mod ||= await (globalThis.process && process.env && process.env.VASTCONF_MODULE ? import(process.env.VASTCONF_MODULE) : import('vastlint-client'))); }

function normAd(r, i) {
  const ev = Object.entries(r.trackingEvents || {}).flatMap(([event, urls]) => urls.map(url => ({ event, url })));
  return ad({
    kind: r.adType === 'InLine' ? 'inline' : r.adType === 'Wrapper' ? 'wrapper' : 'unknown',
    id: r.adPod && r.adPod.adId != null ? r.adPod.adId : null, sequence: r.adPod ? r.adPod.sequence : null,
    adSystem: r.adSystem, title: r.adTitle, impressions: r.impressionUrls || [], errors: r.errorUrls || [],
    universalAdIds: (r.universalAdIds || []).map(u => ({ registry: u.idRegistry, value: u.idValue ?? u.value })),
    verifications: (r.adVerifications || []).length,
    creatives: [creative({ type: 'linear', duration: hms(r.duration), skipOffset: r.skipOffset,
      mediaFiles: (r.mediaFiles || []).map(m => ({ url: m.url, type: m.mimeType, width: m.width, height: m.height, delivery: m.delivery })),
      tracking: ev, clickThrough: r.clickThroughUrl, clickTracking: r.clickTrackingUrls || [] })],
  });
}

function session(url, opts) {
  return lib().then(({ createVastSession }) => createVastSession({
    source: { kind: 'url', url }, timeoutMs: opts.timeout ?? 5000,
    ...(opts.wrapperLimit !== undefined ? { maxWrapperDepth: opts.wrapperLimit + 1 } : {}), // depth counts documents
  }));
}

const summary = snap => ({
  stoppedReason: snap && snap.resolution ? snap.resolution.stoppedReason : null,
  hops: snap ? (snap.wrapperChain || []).map(h => ({ url: h.url, adType: h.adType, wrapperUri: h.wrapperUri })) : [],
  sessionError: snap && snap.error ? String(snap.error.message || snap.error) : null,
});

export async function load(url, opts = {}) {
  let s, snap;
  try { s = await session(url, opts); snap = await s.resolve(); }
  catch (e) { return { ok: false, error: String(e && e.message || e), ...summary(s && s.getSnapshot()) }; }
  const ads = (snap.resolvedAds && snap.resolvedAds.length ? snap.resolvedAds : snap.resolvedAd ? [snap.resolvedAd] : []).filter(r => r.resolved);
  const sm = summary(snap);
  return { ok: ads.length > 0, resolved: ads.map(normAd), error: ads.length ? null : (sm.sessionError || sm.stoppedReason || 'no ad'), loadErrorsDelegated: true, ...sm };
}

export async function play(url, opts = {}, script = { kind: 'full' }) {
  const { createVastPlaybackQueueController } = await lib();
  const steps = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let s, q, snap;
  try {
    s = await session(url, opts);
    q = createVastPlaybackQueueController({ session: s, autoResolve: true, mediaSelection: { supportedMimeTypes: ['video/mp4', 'video/webm'] } });
    snap = await q.initialize();
  } catch (e) { return { ok: false, phase: 'load', error: String(e && e.message || e), steps, loadErrorsDelegated: true, ...summary(s && s.getSnapshot()) }; }
  const resolved = (snap.resolvedAds || []).filter(r => r.resolved).map(normAd);
  if (!snap.currentItem) return { ok: false, phase: 'load', error: snap.error || 'no ad', steps, resolved, loadErrorsDelegated: true, ...summary(s.getSnapshot()) };
  const out = extra => ({ ok: true, steps, resolved, loadErrorsDelegated: true, ...summary(s.getSnapshot()), ...extra });
  const item = () => q.getSnapshot().currentItem;
  const playItem = async (to, n = 20) => {
    const it = item(); const dur = it.durationSec || hms(it.resolvedAd.duration) || 10;
    let t = it.currentTimeSec || 0; const from = t;
    for (let i = 1; i <= n; i++) { t = from + ((to - from) * i) / n; await q.updateProgress(t, dur); await sleep(2); }
    return dur;
  };
  // media: the controller's selection; nothing playable is a 403 the integrator reports through signalError
  const sel = item().mediaSelection && item().mediaSelection.selected;
  const mediaSrc = sel ? [sel.url] : [];
  if (script.kind === 'error' || !sel) {
    const code = script.kind === 'error' ? script.code : 403;
    await q.signalError({ macros: { ERRORCODE: code } });
    steps.push({ step: 'signalError', code, by: script.kind === 'error' ? 'script' : 'harness: no playable MediaFile' });
    await sleep(20);
    return out({ mediaSrc });
  }
  // verification: no OMID code runs here; the library has no verificationNotExecuted API, so the integrator would
  // dispatch the Verification's tracking event by name through the session, which is what the harness does
  for (const [k, v] of (item().resolvedAd.adVerifications || []).entries()) {
    try { const r = await s.trackAd(q.getSnapshot().currentAdIndex, 'verificationNotExecuted', { macros: { REASON: 2 } }); steps.push({ step: 'verificationNotExecuted', vendor: v.vendor, dispatched: r.length }); }
    catch (e) { steps.push({ step: 'verificationNotExecuted failed', k, error: String(e && e.message || e) }); }
  }
  await q.start(); steps.push({ step: 'start' });
  const dur0 = item().durationSec || hms(item().resolvedAd.duration) || 10;
  if (script.kind === 'click') {
    await playItem(dur0 * 0.3, 6);
    const r = await q.click(); steps.push({ step: 'click', dispatched: r.tracking.length });
    return out({ clickThroughUrl: r.clickThroughUrl, mediaSrc, duration: dur0 });
  }
  if (script.kind === 'interact') {
    await playItem(dur0 * 0.3, 6);
    await q.pause(); steps.push({ step: 'pause' }); await sleep(20);
    await q.resume(); steps.push({ step: 'resume' }); await sleep(20);
    await q.setMuted(true); steps.push({ step: 'mute' }); await sleep(20);
    await q.setMuted(false); steps.push({ step: 'unmute' }); await sleep(20);
    steps.push({ step: 'volume 0.5 (no controller call: not a mute state change)' });
    await playItem(dur0, 14); await q.completeCurrent(); steps.push({ step: 'complete' });
    return out({ mediaSrc, duration: dur0 });
  }
  if (script.kind === 'skip') {
    // the skip control is the integrator's: shown once media time reaches the creative's skipoffset
    const off = item().resolvedAd.skipOffset; const offSec = off ? (String(off).endsWith('%') ? dur0 * parseFloat(off) / 100 : hms(off)) : null;
    await playItem(script.probeAt, 4);
    const before = offSec !== null && script.probeAt >= offSec;
    await playItem(script.at, 8);
    const after = offSec !== null && script.at >= offSec;
    steps.push({ step: 'probe', before, after, skipOffset: off });
    if (after) { await q.skip(); steps.push({ step: 'skip' }); }
    await sleep(20);
    return out({ mediaSrc, duration: dur0, skipControlBeforeOffset: before, skipControlAfterOffset: after, skipDelay: offSec });
  }
  if (script.kind === 'rewind') {
    await playItem(dur0 * 0.6, 12);
    await q.updateProgress(dur0 * 0.4, dur0); steps.push({ step: 'seek', to: dur0 * 0.4 });
    await playItem(dur0, 18); await q.completeCurrent(); steps.push({ step: 'complete' });
    return out({ mediaSrc, duration: dur0 });
  }
  if (script.kind === 'pod') {
    const played = [];
    for (let k = 0; k < 6; k++) {
      const it = item(); if (!it) break;
      played.push(it.resolvedAd.adPod && it.resolvedAd.adPod.adId != null ? String(it.resolvedAd.adPod.adId) : null);
      const pm = it.mediaSelection && it.mediaSelection.selected; if (pm) mediaSrc.push(pm.url);
      if (k > 0) await q.start();
      await playItem(it.durationSec || hms(it.resolvedAd.duration) || 10, 20); await q.completeCurrent();
      steps.push({ step: 'played', ad: played[played.length - 1] });
      if (!q.getSnapshot().hasNext) break;
      await q.next();
    }
    await sleep(20);
    return out({ mediaSrc, played });
  }
  const to = script.kind === 'partial' ? dur0 * script.fraction : dur0;
  await playItem(to, 20); steps.push({ step: 'progress', to });
  if (script.kind !== 'partial') { await q.completeCurrent(); steps.push({ step: 'complete' }); }
  await sleep(20);
  return out({ mediaSrc, duration: dur0 });
}
