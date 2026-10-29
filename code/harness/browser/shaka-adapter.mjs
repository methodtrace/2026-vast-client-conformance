// Adapter: Shaka Player (global `shaka`, loaded by page.html from shaka-player's compiled dist). Shaka has no
// standalone VAST loader: an interstitial is added with adManager.addAdUrlInterstitial(url) while a content stream
// plays, and Shaka requests, parses, plays and tracks it. Every script therefore plays the content and lets the ad
// run; partial and click scripts are not drivable through Shaka's public API and are reported as such.
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const client = { id: 'shaka', name: 'shaka-player', version: (globalThis.shaka && shaka.Player.version) || 'unknown', language: 'JavaScript' };

const EVENTS = ['ad-started', 'ad-loaded', 'ad-impression', 'ad-first-quartile', 'ad-midpoint', 'ad-third-quartile', 'ad-complete',
  'ad-stopped', 'ad-skipped', 'ad-error', 'ad-recoverable-error', 'ad-break-started', 'ad-break-ended', 'ad-progress', 'ad-clicked'];

export async function play(url, opts = {}, script = { kind: 'full' }) {
  const steps = [];
  const u = new URL(url);
  const caseId = u.pathname.split('/')[2];
  const video = document.createElement('video');
  video.muted = false; video.playsInline = true; video.setAttribute('playsinline', ''); video.style.width = '320px';
  document.body.appendChild(video);
  const container = document.createElement('div'); container.style.position = 'relative';
  document.body.appendChild(container);
  shaka.polyfill.installAll();
  const player = new shaka.Player();
  await player.attach(video);
  const am = player.getAdManager();
  try { am.setContainers(container, container); } catch (e) { steps.push({ step: 'setContainers failed', error: String(e) }); }
  const started = [];
  let done = false, currentAd = null, startedMuted = null;
  const mediaSrc = [];
  for (const ev of EVENTS) am.addEventListener(ev, e => {
    const ad = e.ad || null;
    let id = null; try { id = ad && ad.getAdId ? ad.getAdId() : null; } catch {}
    if (ev !== 'ad-progress') steps.push({ step: ev, adId: id, t: video.currentTime, error: e.originalEvent ? String(e.originalEvent) : undefined });
    if (ev === 'ad-started' && id !== null) started.push(id);
    if (ev === 'ad-started' && ad) { try { if (ad.getMediaUrl) mediaSrc.push(String(ad.getMediaUrl())); } catch {} currentAd = ad; if (startedMuted === null) startedMuted = !!(ad.video && ad.video.muted); }
    // a break may hold several ads (a pod): the run ends when the break ends, not when the first ad stops
    if (ev === 'ad-break-ended' || (ev === 'ad-error' && started.length === 0)) done = true;
  });
  player.addEventListener('error', e => steps.push({ step: 'player-error', code: e.detail && e.detail.code, data: e.detail && JSON.stringify(e.detail.data).slice(0, 300) }));
  const webm = video.canPlayType('video/webm; codecs="vp9, opus"') !== '';
  const content = `${u.origin}/media/content-40s.${webm ? 'webm' : 'mp4'}?case=${caseId}&ad=content`;
  try { await player.load(content, 0, webm ? 'video/webm' : 'video/mp4'); steps.push({ step: 'content-loaded', webm }); }
  catch (e) { return { ok: false, error: 'content load failed: ' + (e && (e.code || e.message)), steps, resolved: [] }; }
  let interstitials = null;
  try { interstitials = await am.addAdUrlInterstitial(url); steps.push({ step: 'interstitial-added', n: Array.isArray(interstitials) ? interstitials.length : null }); }
  catch (e) { steps.push({ step: 'addAdUrlInterstitial-rejected', code: e && e.code, message: String(e && e.message || e) }); }
  try { await video.play(); } catch (e) { steps.push({ step: 'play-rejected; retrying muted', error: String(e) }); video.muted = true; try { await video.play(); } catch (e2) { steps.push({ step: 'muted play rejected', error: String(e2) }); } }
  // an ad that will play starts within a few seconds of content start; once started, run the script's user actions
  // through the ad object's public API (pause, play, setMuted, setVolume, skip; seeking on its media element), then
  // wait for the break to end (three 10 s pod ads fit in the 60 s limit)
  const startLimit = Date.now() + 8000;
  while (!done && started.length === 0 && Date.now() < startLimit) await sleep(100);
  const adTime = () => (currentAd && currentAd.video ? currentAd.video.currentTime : 0);
  const waitAdTime = async (t, limitMs = 20000) => { const end = Date.now() + limitMs; while (!done && adTime() < t && Date.now() < end) await sleep(50); };
  const extra = {};
  if (started.length && currentAd && script) {
    try {
      if (script.kind === 'interact') {
        await waitAdTime(3);
        currentAd.pause(); steps.push({ step: 'pause', t: adTime() }); await sleep(400);
        currentAd.play(); steps.push({ step: 'resume' }); await sleep(300);
        currentAd.setMuted(true); steps.push({ step: 'mute' }); await sleep(300);
        currentAd.setMuted(false); steps.push({ step: 'unmute' }); await sleep(300);
        currentAd.setVolume(0.5); steps.push({ step: 'volume 0.5' }); await sleep(300);
      } else if (script.kind === 'skip') {
        await waitAdTime(script.probeAt);
        extra.skipControlBeforeOffset = !!currentAd.canSkipNow(); steps.push({ step: 'probe', at: adTime(), canSkipNow: extra.skipControlBeforeOffset });
        await waitAdTime(script.at);
        extra.skipControlAfterOffset = !!currentAd.canSkipNow(); steps.push({ step: 'probe', at: adTime(), canSkipNow: extra.skipControlAfterOffset });
        currentAd.skip(); steps.push({ step: 'skip()' });
      } else if (script.kind === 'rewind') {
        await waitAdTime(6);
        currentAd.video.currentTime = 4; steps.push({ step: 'seek', to: 4 });
      }
    } catch (e) { steps.push({ step: 'script action failed', error: String(e && e.message || e) }); }
  }
  const endLimit = Date.now() + 60000;
  while (!done && started.length > 0 && Date.now() < endLimit) await sleep(100);
  if (started.length === 0) steps.push({ step: 'no ad started within 8 s of content play' });
  else if (!done) steps.push({ step: 'ad break did not end within 60 s' });
  await sleep(1500); // let trailing tracking requests (Shaka sends complete after the break ends) reach the server
  steps.push({ step: 'destroy' });
  player.destroy().catch(() => {});
  const notDrivable = script && (script.kind === 'partial' || script.kind === 'click');
  return { ok: started.length > 0, steps, resolved: started.map(id => ({ id, kind: 'inline', creatives: [] })), played: started.slice(), startedMuted: !!startedMuted, mediaSrc, ...extra,
    notDrivable: notDrivable ? `Shaka exposes no API to stop an interstitial at a given point or to click it (${script.kind})` : null };
}
export const load = (url, opts = {}) => play(url, opts, { kind: 'full' });
