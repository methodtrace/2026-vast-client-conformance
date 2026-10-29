// Adapter: video-ad-sdk (Rambler Digital Solutions), bundled with esbuild (build/build.sh), public requestAd API.
import { ad, creative, hms } from './normalize.mjs';

// VASTCONF_MODULE (version sweep, sweep/run-sweep.mjs) substitutes another release of the library; the reported
// version then comes from VASTCONF_MODULE_VERSION.
export const client = { id: 'videoadsdk', name: 'video-ad-sdk', version: '4.0.1', language: 'TypeScript' };

let mod;
async function lib() { return (mod ||= await (globalThis.process && process.env && process.env.VASTCONF_MODULE ? import(process.env.VASTCONF_MODULE) : import('../build/dist/video-ad-sdk.bundle.mjs'))); }

const text = node => {
  if (!node) return null;
  if (node.type === 'text' || node.type === 'cdata') return node.text;
  return (node.elements || []).map(text).filter(v => v !== null).join('').trim() || null;
};
const kids = (node, name) => (node && node.elements ? node.elements.filter(e => e.name === name) : []);
const kid = (node, name) => kids(node, name)[0];
const deep = (node, ...path) => path.reduce((acc, p) => acc.flatMap(x => kids(x, p)), node ? [node] : []);

function normAd(adNode, S) {
  const inline = S.isInline(adNode);
  const body = kid(adNode, inline ? 'InLine' : 'Wrapper');
  const creatives = deep(body, 'Creatives', 'Creative').map(c => {
    const lin = kid(c, 'Linear');
    if (!lin) return creative({ id: c.attributes && c.attributes.id, type: kid(c, 'NonLinearAds') ? 'nonlinear' : 'companion' });
    return creative({
      id: c.attributes && c.attributes.id, type: 'linear', duration: hms(text(kid(lin, 'Duration'))), skipOffset: lin.attributes && lin.attributes.skipoffset,
      mediaFiles: deep(lin, 'MediaFiles', 'MediaFile').map(m => ({ url: text(m), type: m.attributes.type, width: m.attributes.width, height: m.attributes.height, delivery: m.attributes.delivery })),
      tracking: deep(lin, 'TrackingEvents', 'Tracking').map(t => ({ event: t.attributes.event, url: text(t), offset: t.attributes.offset })),
      clickThrough: text(deep(lin, 'VideoClicks', 'ClickThrough')[0]),
      clickTracking: deep(lin, 'VideoClicks', 'ClickTracking').map(text),
    });
  });
  const imp = S.getImpression(adNode);
  return ad({
    kind: inline ? 'inline' : 'wrapper', id: adNode.attributes && adNode.attributes.id, sequence: adNode.attributes && adNode.attributes.sequence,
    adSystem: text(kid(body, 'AdSystem')), title: text(kid(body, 'AdTitle')),
    impressions: Array.isArray(imp) ? imp.map(i => (i == null ? null : typeof i === 'string' ? i : i.uri || i.url)).filter(Boolean) : [],
    errors: [].concat(S.getAdErrorURI(adNode) || []), vastAdTagURI: inline ? null : S.getVASTAdTagURI(adNode),
    verifications: deep(body, 'AdVerifications', 'Verification').length, creatives,
  });
}

// The adapter drives the library through runWaterfall(), its documented integration (README "Usage"): it requests
// the tag, resolves the chain, starts the ad on a <video> element, reports errors to the chain's Error URIs and
// falls back to the next ad on failure. The harness supplies a fake <video> whose clock it controls.
import { createFakeVideo } from './fakevideo.mjs';

function chainView(chain, S) {
  if (!chain) return { resolved: [], chain: [] };
  const docs = chain.map(r => ({ requestTag: r.requestTag, errorCode: r.errorCode ?? null, error: r.error ? String(r.error.message || r.error) : null,
    ads: r.parsedXML ? S.getAds(r.parsedXML).map(a => normAd(a, S)) : [], vastErrors: r.parsedXML ? [].concat(S.getVastErrorURI(r.parsedXML) || []) : [] }));
  const head = chain[0] || {};
  return { resolved: head.ad && !head.error ? [normAd(head.ad, S)] : [], chain: docs, chainLength: chain.length, errorCode: head.errorCode ?? null };
}

async function waterfall(url, opts, script) {
  const { runWaterfall, vastSelectors: S } = await lib();
  const steps = [];
  let dur = 10;
  // the ad slot an integrator gives the library: a sized, positioned element (icons are only drawn when they fit)
  const placeholder = document.createElement('div');
  placeholder.style.cssText = 'position:relative;width:640px;height:360px';
  document.body.appendChild(placeholder);
  const video = createFakeVideo(document, { duration: () => dur });
  const errors = [];
  let ready = null, chainSeen = null, finished = false;
  let settle;
  const settled = new Promise(r => { settle = r; });
  const hooks = {}; // per-script listeners for later ads of the same run (pods)
  const options = {
    videoElement: video, timeout: opts.timeout ?? 5000,
    onAdReady: u => { ready = u; chainSeen = u.vastChain; const h = normAd(u.vastChain[0].ad, S); const l = h.creatives.find(c => c.type === 'linear'); dur = (l && l.duration) || 10; steps.push({ step: 'ready', ad: h.id }); settle('ready'); if (hooks.ready) hooks.ready(u); },
    onAdStart: () => steps.push({ step: 'started' }),
    onError: (e, ctx) => { errors.push({ message: String(e && e.message || e), code: e && e.code ? Number(e.code) : null }); if (ctx && ctx.vastChain) chainSeen = ctx.vastChain; steps.push({ step: 'error', message: String(e && e.message || e), code: e && e.code }); },
    onRunFinish: () => { finished = true; steps.push({ step: 'finished' }); settle('finished'); if (hooks.finish) hooks.finish(); },
  };
  if (opts.wrapperLimit !== undefined) options.wrapperLimit = opts.wrapperLimit;
  runWaterfall(url, placeholder, options);
  const first = await Promise.race([settled, new Promise(r => setTimeout(() => r('limit'), (opts.timeout ?? 5000) + 4000))]);
  const view = chainView(chainSeen, S);
  const base = { ok: first === 'ready', error: errors.length ? errors[errors.length - 1].message : (first === 'limit' ? 'no outcome' : null),
    errorCode: errors.length ? errors[errors.length - 1].code : view.errorCode, errors, ...view, steps };
  if (first !== 'ready' || script.kind === 'load') return base;
  // playback: advance the clock; the library fires start/impression on the first timeupdate
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const media = () => ({ mediaSrc: video.srcLog.slice() });
  if (script.kind === 'click') {
    await video.advance(dur * 0.3, 6, 2);
    const anchor = placeholder.querySelector('a.mol-vast-clickthrough') || document.querySelector('a.mol-vast-clickthrough');
    const clickThroughUrl = anchor ? anchor.getAttribute('href') || null : null;
    // a user clicks a playing ad; video-ad-sdk treats a click on a paused ad as 'resume' (onClickThrough.js)
    if (video.paused) { try { await video.play(); } catch {} }
    if (anchor) anchor.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    steps.push({ step: anchor ? 'click' : 'no click control found' });
    await sleep(20);
    return { ...base, clickThroughUrl, duration: dur, ...media() };
  }
  if (script.kind === 'error') { steps.push({ step: 'error', code: script.code, by: 'not drivable' }); return { ...base, errorNotDrivable: true }; }
  // user interactions go through the ad unit's public API (pause, resume, setVolume), as an integrator's controls would
  const KP = { keepPlaying: true };
  if (script.kind === 'interact') {
    await video.advance(dur * 0.3, 6, 2, KP);
    ready.pause(); steps.push({ step: 'pause', t: video.currentTime }); await sleep(50);
    ready.resume(); steps.push({ step: 'resume' }); await sleep(20);
    video.muted = true; steps.push({ step: 'mute' }); await sleep(20);
    video.muted = false; steps.push({ step: 'unmute' }); await sleep(20);
    ready.setVolume(0.5); steps.push({ step: 'volume 0.5' }); await sleep(20);
    await video.advance(dur, 14, 2);
    steps.push({ step: 'progress', to: dur }); await sleep(20);
    return { ...base, duration: dur, finished, startedMuted: !!video.startedMuted, ...media() };
  }
  if (script.kind === 'skip') {
    // probe for a skip control before the offset, then after it; skip with the control if one exists, else ad unit skip()
    const probe = () => !!(placeholder.querySelector('.mol-vast-skip-control') || document.querySelector('.mol-vast-skip-control'));
    await video.advance(script.probeAt, 4, 2, KP);
    const before = probe(); steps.push({ step: 'probe', at: script.probeAt, skipControl: before });
    await video.advance(script.at, 8, 2, KP);
    const ctl = placeholder.querySelector('.mol-vast-skip-control') || document.querySelector('.mol-vast-skip-control');
    steps.push({ step: 'probe', at: script.at, skipControl: !!ctl });
    if (ctl) ctl.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); else ready.skip();
    steps.push({ step: ctl ? 'skip control clicked' : 'adUnit.skip()' }); await sleep(50);
    return { ...base, duration: dur, finished, skipControlBeforeOffset: before, skipControlAfterOffset: !!ctl, ...media() };
  }
  if (script.kind === 'rewind') {
    await video.advance(dur * 0.6, 12, 2, KP);
    // a 2 s rewind (60% to 40%): video-ad-sdk reverts any jump over 3 s (preventManualProgress), so a longer seek
    // would never reach its rewind handler
    await video.seek(dur * 0.4); steps.push({ step: 'seek', to: dur * 0.4, after: video.currentTime });
    await video.advance(dur, 18, 2);
    steps.push({ step: 'progress', to: dur }); await sleep(20);
    return { ...base, duration: dur, finished, ...media() };
  }
  if (script.kind === 'icon') {
    await video.advance(dur * 0.4, 8, 2, KP);
    const icon = placeholder.querySelector('a img, a iframe') ? placeholder.querySelector('a img, a iframe').closest('a') : null;
    steps.push({ step: icon ? 'icon found' : 'no icon element', iconsDefined: ready.icons ? ready.icons.length : 0 });
    if (icon) icon.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await video.advance(dur, 12, 2); await sleep(20);
    return { ...base, duration: dur, finished, iconRendered: !!icon, ...media() };
  }
  if (script.kind === 'pod') {
    // play every ad the waterfall offers, in the order it offers them, until it reports the run finished
    const played = [];
    for (let k = 0; k < 6 && ready; k++) {
      const id = normAd(ready.vastChain[0].ad, S).id; played.push(id); steps.push({ step: 'play', ad: id });
      let next; const nextReady = new Promise(r => { next = r; });
      hooks.ready = () => next('ready'); hooks.finish = () => next('finished');
      const cur = ready;
      await video.advance(dur, 20, 2);
      const r = await Promise.race([nextReady, sleep((opts.timeout ?? 5000) + 4000).then(() => 'limit')]);
      if (r !== 'ready' || ready === cur) break;
    }
    await sleep(20);
    return { ...base, duration: dur, finished, played, ...media() };
  }
  const to = script.kind === 'partial' ? dur * script.fraction : dur;
  await video.advance(to, 20, 2);
  steps.push({ step: 'progress', to });
  await sleep(20);
  return { ...base, duration: dur, finished, ...media() };
}

export const load = (url, opts = {}) => waterfall(url, opts, { kind: 'load' });
export const play = (url, opts = {}, script = { kind: 'full' }) => waterfall(url, opts, script);
