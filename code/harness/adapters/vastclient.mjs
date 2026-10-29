// Adapter: @dailymotion/vast-client (vast-client-js), Node build, used through its public VASTClient API.
import { ad, creative } from './normalize.mjs';

// VASTCONF_MODULE (version sweep, sweep/run-sweep.mjs) substitutes another release of the library; the reported
// version then comes from VASTCONF_MODULE_VERSION.
export const client = { id: 'vastclient', name: '@dailymotion/vast-client', version: '6.5.0', language: 'JavaScript' };

let mod;
async function lib() { return (mod ||= await (globalThis.process && process.env && process.env.VASTCONF_MODULE ? import(process.env.VASTCONF_MODULE) : import('@dailymotion/vast-client'))); }

function normAd(a) {
  return ad({
    kind: a.wrapperURL || a.nextWrapperURL ? 'wrapper' : 'inline', id: a.id, sequence: a.sequence,
    adSystem: a.system && a.system.value, title: a.title,
    impressions: (a.impressionURLTemplates || []).map(t => (typeof t === 'string' ? t : t.url)),
    errors: a.errorURLTemplates || [], vastAdTagURI: a.nextWrapperURL || null,
    universalAdIds: [], verifications: (a.adVerifications || []).length,
    creatives: (a.creatives || []).map(c => creative({
      id: c.id, type: c.type, duration: c.duration, skipOffset: c.skipDelay,
      mediaFiles: (c.mediaFiles || []).map(m => ({ url: m.fileURL, type: m.mimeType, width: m.width, height: m.height, delivery: m.deliveryType })),
      tracking: Object.entries(c.trackingEvents || {}).flatMap(([ev, urls]) => urls.map(u => ({ event: ev, url: u }))),
      clickThrough: c.videoClickThroughURLTemplate && (c.videoClickThroughURLTemplate.url || c.videoClickThroughURLTemplate),
      clickTracking: (c.videoClickTrackingURLTemplates || []).map(t => t.url || t),
    })).map((cr, i) => ({ ...cr, universalAdIds: ((a.creatives[i].universalAdIds) || []).map(u => ({ registry: u.idRegistry, value: u.value })) })),
  });
}

// VASTClient.get() resolves the first pod or the first stand-alone ad; the remaining stand-alone ads (the "ad buffet")
// are offered through hasRemainingAds() and getNextAds(), as the README documents. A careful integrator that gets no
// ad back moves on to the next stand-alone ad, so the harness does exactly that (at most five times).
async function getWithBuffet(vc, url, options) {
  let r = await vc.get(url, options);
  let buffetCalls = 0;
  while ((!r.ads || !r.ads.length) && vc.hasRemainingAds() && buffetCalls < 5) {
    buffetCalls++;
    try { r = await vc.getNextAds(); } catch { break; }
  }
  r.buffetCalls = buffetCalls;
  return r;
}

// Fetches and fully resolves the tag through VASTClient.get (wrapper chain, merging), as an integrator would.
export async function load(url, opts = {}) {
  const { VASTClient } = await lib();
  const vc = new VASTClient(0, 0); // no capping
  const warnings = [];
  vc.getParser().on('VAST-warning', w => warnings.push(w.message || String(w)));
  const errorsEmitted = [];
  vc.getParser().on('VAST-error', e => errorsEmitted.push({ code: e.ERRORCODE || e.errorCode || null, message: e.ERRORMESSAGE || null }));
  const options = { timeout: opts.timeout ?? 5000, withCredentials: false };
  if (opts.wrapperLimit !== undefined) options.wrapperLimit = opts.wrapperLimit;
  if (opts.allowMultipleAds !== undefined) options.allowMultipleAds = opts.allowMultipleAds;
  try {
    const r = await getWithBuffet(vc, url, options);
    return {
      ok: true, resolved: (r.ads || []).map(normAd), docErrors: r.errorURLTemplates || [],
      vastErrorCodes: errorsEmitted, warnings, raw: { version: r.version || null, adCount: (r.ads || []).length }, buffetCalls: r.buffetCalls,
    };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e), vastErrorCodes: errorsEmitted, warnings };
  }
}

// Playback driver. The harness acts as a careful integrator: it calls the tracker the way vast-client-js
// documents (trackImpression at start, setDuration, setProgress on each time update, complete at the end; setPaused,
// setMuted, skip and click for user actions; verificationNotExecuted with REASON 2 for each verification vendor,
// since this integration executes no OMID code) and, when it finds no playable MediaFile, reports error 403 through
// tracker.error, which is the library's API for it. Media selection and playback are the integrator's in this
// library, so cells that test them are graded 'delegated' for vast-client-js (requirements.mjs, duty 'media').
export async function play(url, opts = {}, script = { kind: 'full' }) {
  const { VASTClient, VASTTracker } = await lib();
  const vc = new VASTClient(0, 0);
  const options = { timeout: opts.timeout ?? 5000 };
  if (opts.wrapperLimit !== undefined) options.wrapperLimit = opts.wrapperLimit;
  const steps = [];
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  let r;
  try { r = await getWithBuffet(vc, url, options); } catch (e) { return { ok: false, phase: 'load', error: String(e && e.message || e), steps }; }
  const a = (r.ads || [])[0];
  if (!a) return { ok: false, phase: 'load', error: 'no ad', steps, resolved: [] };
  const resolved = (r.ads || []).map(normAd);
  const creative = (a.creatives || []).find(c => c.type === 'linear');
  if (!creative) return { ok: false, phase: 'load', error: 'no linear creative', steps, resolved };
  const tracker = new VASTTracker(vc, a, creative);
  const trackerErrors = [];
  tracker.on('TRACKER-error', e => trackerErrors.push(e && e.message));
  // verification: this integration runs no verification code, so it reports every vendor as not executed (reason 2)
  for (const v of a.adVerifications || []) {
    try { tracker.verificationNotExecuted(v.vendor, { REASON: 2 }); steps.push({ step: 'verificationNotExecuted', vendor: v.vendor }); }
    catch (e) { steps.push({ step: 'verificationNotExecuted failed', vendor: v.vendor, error: String(e && e.message || e) }); }
  }
  const playable = (creative.mediaFiles || []).find(m => /mp4|webm/i.test(m.mimeType || ''));
  if (script.kind === 'error' || !playable) {
    const code = script.kind === 'error' ? script.code : 403;
    steps.push({ step: 'error', code, by: script.kind === 'error' ? 'script' : 'harness: no playable MediaFile' });
    tracker.error({ ERRORCODE: code });
    return { ok: true, steps, resolved, trackerErrors };
  }
  const mediaSrc = [playable.fileURL];
  const dur = creative.duration || 10;
  tracker.load(); steps.push({ step: 'load' });
  tracker.trackImpression(); steps.push({ step: 'impression' });
  tracker.setDuration(dur);
  let t = 0;
  const advance = async (to, n = 20) => { const from = t; for (let i = 1; i <= n; i++) { t = from + ((to - from) * i) / n; tracker.setProgress(t); await sleep(2); } };
  const out = extra => ({ ok: true, steps, duration: dur, resolved, mediaSrc, trackerErrors, ...extra });
  if (script.kind === 'click') {
    // play to 30%, then click as the documented integration does (tracker.click(); open the 'clickthrough' URL)
    await advance(dur * 0.3, 6);
    let clickThroughUrl = null;
    tracker.on('clickthrough', u => { clickThroughUrl = u; });
    tracker.click();
    steps.push({ step: 'click' });
    return out({ clickThroughUrl });
  }
  if (script.kind === 'interact') {
    await advance(dur * 0.3, 6);
    tracker.setPaused(true); steps.push({ step: 'pause' }); await sleep(20);
    tracker.setPaused(false); steps.push({ step: 'resume' }); await sleep(20);
    tracker.setMuted(true); steps.push({ step: 'mute' }); await sleep(20);
    tracker.setMuted(false); steps.push({ step: 'unmute' }); await sleep(20);
    steps.push({ step: 'volume 0.5 (no tracker call: not a mute state change)' });
    await advance(dur, 14);
    tracker.complete(); steps.push({ step: 'complete' });
    return out({});
  }
  if (script.kind === 'skip') {
    // the integrator shows its skip control when the library's skip-countdown reaches 0
    let skippableAt = null;
    tracker.on('skip-countdown', left => { if (left <= 0 && skippableAt === null) skippableAt = t; });
    await advance(script.probeAt, 4);
    const before = skippableAt !== null;
    await advance(script.at, 8);
    const after = skippableAt !== null;
    steps.push({ step: 'probe', before, after, skipDelay: tracker.skipDelay });
    if (after) { tracker.skip(); steps.push({ step: 'skip' }); }
    await sleep(20);
    return out({ skipControlBeforeOffset: before, skipControlAfterOffset: after, skipDelay: tracker.skipDelay });
  }
  if (script.kind === 'rewind') {
    await advance(dur * 0.6, 12);
    t = dur * 0.4; tracker.setProgress(t); steps.push({ step: 'seek', to: t }); await sleep(10);
    await advance(dur, 18);
    tracker.complete(); steps.push({ step: 'complete' });
    return out({});
  }
  const to = script.kind === 'partial' ? dur * script.fraction : dur;
  await advance(to, 20);
  steps.push({ step: 'progress', to });
  if (script.kind !== 'partial') { tracker.complete(); steps.push({ step: 'complete' }); }
  return out({});
}
