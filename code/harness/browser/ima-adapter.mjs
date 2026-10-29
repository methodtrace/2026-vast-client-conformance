// Adapter: Google IMA HTML5 SDK (closed source; global `google.ima`). The page loads the SDK from its real URL; the
// runner intercepts every request to a host other than the recording server and answers it from a pinned archive
// (VASTCONF_EXT_ARCHIVE, e.g. sources/ima-html5/2026-10-16), recording any missing response first when
// VASTCONF_EXT_RECORD=1 (browser/run-browser.mjs, extRoute). A run without the archive or record mode fails closed.
// IMA requests the tag, follows Wrappers, selects media, plays the ad in its own <video> inside the ad container,
// tracks and reports errors. The harness uses only the public API: AdDisplayContainer, AdsLoader, AdsManager
// (init, start, pause, resume, setVolume, skip, stop). IMA's click-through and skip controls are drawn inside its
// own cross-origin frame; the runner clicks them with the mouse (vastconfFrameClick in run-browser.mjs), as a user
// would. Rewind and icons are not drivable.
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const client = { id: 'ima', name: 'Google IMA HTML5 SDK', version: 'unknown', language: 'JavaScript (closed source)' };

async function sdk() {
  if (globalThis.google && google.ima) return google.ima;
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'; s.onload = res; s.onerror = () => rej(new Error('ima3.js failed to load')); document.head.appendChild(s); });
  const end = Date.now() + 10000; while (!(globalThis.google && google.ima) && Date.now() < end) await sleep(50);
  if (!(globalThis.google && google.ima)) throw new Error('google.ima not defined');
  return google.ima;
}

export async function play(url, opts = {}, script = { kind: 'full' }) {
  const steps = [];
  let ima;
  try { ima = await sdk(); } catch (e) { return { ok: false, error: String(e.message || e), steps, resolved: [] }; }
  const version = ima.VERSION || null;
  steps.push({ step: 'sdk', version });
  const u = new URL(url);
  const caseId = u.pathname.split('/')[2];
  const webm = document.createElement('video').canPlayType('video/webm; codecs="vp9, opus"') !== '';
  const wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;width:640px;height:360px';
  const video = document.createElement('video'); video.playsInline = true; video.style.cssText = 'width:640px;height:360px';
  video.src = `${u.origin}/media/content-40s.${webm ? 'webm' : 'mp4'}?case=${caseId}&ad=content`;
  const adc = document.createElement('div'); adc.style.cssText = 'position:absolute;top:0;left:0;width:640px;height:360px';
  wrap.appendChild(video); wrap.appendChild(adc); document.body.appendChild(wrap);
  if (opts.wrapperLimit !== undefined) ima.settings.setNumRedirects(opts.wrapperLimit);
  ima.settings.setVpaidMode(ima.ImaSdkSettings.VpaidMode.DISABLED);
  const display = new ima.AdDisplayContainer(adc, video);
  display.initialize();
  const loader = new ima.AdsLoader(display);
  const started = [], mediaSrc = [], errors = [];
  let mgr = null, allDone = false, currentAd = null, startedMuted = null;
  const E = ima.AdEvent.Type;
  const evNames = ['LOADED', 'STARTED', 'IMPRESSION', 'FIRST_QUARTILE', 'MIDPOINT', 'THIRD_QUARTILE', 'COMPLETE', 'PAUSED', 'RESUMED', 'SKIPPED',
    'SKIPPABLE_STATE_CHANGED', 'VOLUME_CHANGED', 'VOLUME_MUTED', 'CLICK', 'ALL_ADS_COMPLETED', 'CONTENT_PAUSE_REQUESTED', 'CONTENT_RESUME_REQUESTED', 'LOG', 'USER_CLOSE'];
  const onAdError = e => {
    const er = e.getError();
    const rec = { code: er.getVastErrorCode ? er.getVastErrorCode() : null, imaCode: er.getErrorCode ? er.getErrorCode() : null, message: er.getMessage ? er.getMessage() : String(er) };
    errors.push(rec); steps.push({ step: 'AD_ERROR', ...rec });
    if (!started.length) allDone = true;
  };
  loader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, e => {
    const rs = new ima.AdsRenderingSettings(); rs.restoreCustomPlaybackStateOnAdBreakComplete = true;
    mgr = e.getAdsManager(video, rs);
    mgr.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, onAdError);
    for (const n of evNames) if (E[n]) mgr.addEventListener(E[n], ev => {
      const ad = ev.getAd && ev.getAd();
      const s = { step: n };
      if (n === 'LOG') { const d = ev.getAdData && ev.getAdData(); s.log = d && d.adError ? { code: d.adError.getVastErrorCode(), message: d.adError.getMessage() } : null; }
      if (ad) { try { s.adId = ad.getAdId(); } catch {} }
      if (n === 'STARTED') { started.push(s.adId ?? null); currentAd = ad; try { mediaSrc.push(ad.getMediaUrl ? String(ad.getMediaUrl()) : null); } catch {} if (startedMuted === null) startedMuted = mgr.getVolume() === 0; }
      if (n === 'ALL_ADS_COMPLETED') allDone = true;
      steps.push(s);
    });
    try { mgr.init(640, 360, ima.ViewMode.NORMAL); mgr.start(); steps.push({ step: 'start' }); } catch (err) { steps.push({ step: 'start failed', error: String(err) }); allDone = true; }
  });
  loader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, onAdError);
  const req = new ima.AdsRequest();
  req.adTagUrl = url; req.linearAdSlotWidth = 640; req.linearAdSlotHeight = 360; req.vastLoadTimeout = opts.timeout ?? 5000;
  req.setAdWillAutoPlay(true); req.setAdWillPlayMuted(false);
  loader.requestAds(req); steps.push({ step: 'requestAds' });
  const startLimit = Date.now() + (opts.timeout ?? 5000) + 10000;
  while (!allDone && started.length === 0 && Date.now() < startLimit) await sleep(100);
  const adTime = () => { try { return mgr && currentAd ? currentAd.getDuration() - mgr.getRemainingTime() : 0; } catch { return 0; } };
  const waitAdTime = async (t, limitMs = 20000) => { const end = Date.now() + limitMs; while (!allDone && adTime() < t && Date.now() < end) await sleep(50); };
  const extra = {};
  let notDrivable = null;
  if (started.length && mgr && script) {
    try {
      if (script.kind === 'interact') {
        await waitAdTime(3);
        mgr.pause(); steps.push({ step: 'pause', t: adTime() }); await sleep(400);
        mgr.resume(); steps.push({ step: 'resume' }); await sleep(300);
        mgr.setVolume(0); steps.push({ step: 'mute (setVolume 0)' }); await sleep(300);
        mgr.setVolume(1); steps.push({ step: 'unmute (setVolume 1)' }); await sleep(300);
        mgr.setVolume(0.5); steps.push({ step: 'volume 0.5' }); await sleep(300);
      } else if (script.kind === 'skip') {
        await waitAdTime(script.probeAt);
        extra.skipControlBeforeOffset = !!mgr.getAdSkippableState(); steps.push({ step: 'probe', at: adTime(), skippable: extra.skipControlBeforeOffset });
        await waitAdTime(script.at);
        extra.skipControlAfterOffset = !!mgr.getAdSkippableState(); steps.push({ step: 'probe', at: adTime(), skippable: extra.skipControlAfterOffset });
        if (globalThis.vastconfFrameDump && opts.dumpFrames) steps.push({ step: 'frames', dump: await globalThis.vastconfFrameDump() });
        // a user clicks IMA's own skip button (in its frame); AdsManager.skip() has no effect in this setup
        const c = globalThis.vastconfFrameClick ? await globalThis.vastconfFrameClick(['button.videoAdUiSkipButton']) : { clicked: null };
        if (c.clicked) steps.push({ step: 'skip button clicked', ...c }); else { mgr.skip(); steps.push({ step: 'skip() (no skip button found)' }); }
      } else if (script.kind === 'partial') {
        await waitAdTime((currentAd ? currentAd.getDuration() : 10) * script.fraction);
        mgr.stop(); steps.push({ step: 'stop', at: adTime() });
      } else if (script.kind === 'click') {
        await waitAdTime(3);
        const c = globalThis.vastconfFrameClick ? await globalThis.vastconfFrameClick(['div.videoAdUiClickElement']) : { clicked: null };
        steps.push(c.clicked ? { step: 'click on IMA click element', ...c } : { step: 'no click element found' });
        if (!c.clicked) notDrivable = 'IMA click element not found in its frame';
        await sleep(600); try { mgr.stop(); steps.push({ step: 'stop after click' }); } catch {}
      } else if (script.kind === 'rewind' || script.kind === 'icon') {
        notDrivable = `IMA exposes no seek or icon control to a page; ${script.kind} is not drivable`;
      } else if (script.kind === 'error') {
        extra.errorNotDrivable = true;
      }
    } catch (e) { steps.push({ step: 'script action failed', error: String(e && e.message || e) }); }
  }
  const endLimit = Date.now() + 60000;
  while (!allDone && started.length > 0 && Date.now() < endLimit) await sleep(100);
  if (started.length === 0) steps.push({ step: 'no ad started' });
  await sleep(1500);
  try { mgr && mgr.destroy(); } catch {}
  const last = errors[errors.length - 1];
  return { ok: started.length > 0, steps, resolved: started.map(id => ({ id, kind: 'inline', creatives: [] })), played: started.slice(), startedMuted: !!startedMuted,
    mediaSrc, errors, error: started.length ? null : (last ? `AD_ERROR ${last.code}: ${last.message}` : 'no ad'), errorCode: last && last.code > 0 ? last.code : null,
    sdkVersion: version, notDrivable, notDrivableKinds: ['click', 'rewind', 'icon'], ...extra };
}
export const load = (url, opts = {}) => play(url, opts, { kind: 'full' });
