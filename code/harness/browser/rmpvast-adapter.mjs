// Adapter: rmp-vast 17.2.0 (global `RmpVast`, loaded by page.html from vendor/rmp-vast-17.2.0). rmp-vast is a full
// ad player: loadAds(url) requests the tag (through its bundled @dailymotion/vast-client 6.4.2), selects the media,
// plays it in its own <video> over the content player, tracks, reports errors, and resumes content. The harness
// builds the HTML layout its README requires and acts as a user would: it clicks the ad video (rmp-vast's own
// click-through listener), clicks rmp-vast's skip button, and uses the public API for pause, play, mute and volume
// (what an integrator's controls call). A partial view is the integrator calling stopAds() at the given point.
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const client = { id: 'rmpvast', name: 'rmp-vast', version: '17.2.0 (bundles @dailymotion/vast-client 6.4.2)', language: 'JavaScript' };

const EVENTS = ['adtagstartloading', 'adtagloaded', 'adloaded', 'adimpression', 'adcreativeview', 'adstarted', 'adfirstquartile', 'admidpoint',
  'adthirdquartile', 'adcomplete', 'adpaused', 'adresumed', 'advolumemuted', 'advolumeunmuted', 'advolumechanged', 'adskipped',
  'adskippablestatechanged', 'adclick', 'adiconclick', 'adclosed', 'aderror', 'addestroyed', 'adpodcompleted', 'adinitialplayrequestfailed',
  'adinitialplayrequestsucceeded', 'adviewable', 'adviewundetermined'];

export async function play(url, opts = {}, script = { kind: 'full' }) {
  const steps = [];
  const u = new URL(url);
  const caseId = u.pathname.split('/')[2];
  const webm = document.createElement('video').canPlayType('video/webm; codecs="vp9, opus"') !== '';
  const holder = document.createElement('div');
  holder.innerHTML = `<div class="rmp-container" id="rmp-vast-player" style="width:640px;height:360px;position:relative">
    <div class="rmp-content"><video class="rmp-video" playsinline src="${u.origin}/media/content-40s.${webm ? 'webm' : 'mp4'}?case=${caseId}&ad=content"></video></div></div>`;
  document.body.appendChild(holder);
  const params = { ajaxTimeout: opts.timeout ?? 5000, creativeLoadTimeout: 8000 };
  if (opts.wrapperLimit !== undefined) params.maxNumRedirects = opts.wrapperLimit;
  // configuration 'rmpvast+omid' (run-browser.mjs): rmp-vast's documented OMID switch. rmp-vast expects the integrator
  // to have loaded OM SDK's omweb-v1.js and the session client (it reads the global OmidSessionClient); when it is
  // absent, rmp-vast still applies its verification filter (non-OMID apiFramework or ExecutableResource: ping reason
  // 2) before giving up on the session (src/js/verification/omsdk.js #onOMWebLoaded), which is what A01-A04 grade.
  if (opts.omidSupport !== undefined) params.omidSupport = !!opts.omidSupport;
  const rv = new RmpVast('rmp-vast-player', params);
  const started = [], mediaSrc = [], errors = [];
  let destroyed = 0, podDone = false, startedMuted = null, lastDestroyAt = 0;
  for (const ev of EVENTS) rv.on(ev, () => {
    const s = { step: ev, t: rv.adCurrentTime };
    if (ev === 'aderror') { s.code = rv.adVastErrorCode; s.message = rv.adErrorMessage; s.type = rv.adErrorType; errors.push({ code: rv.adVastErrorCode, message: rv.adErrorMessage }); }
    if (ev === 'adstarted') {
      let id = null; try { id = rv.ad && rv.ad.id != null ? String(rv.ad.id) : null; } catch {}
      s.adId = id; started.push(id); try { mediaSrc.push(String(rv.adMediaUrl)); } catch {}
      if (startedMuted === null) { try { startedMuted = !!(rv.adPlayer && rv.adPlayer.muted); } catch {} }
    }
    if (ev === 'addestroyed') { destroyed++; lastDestroyAt = Date.now(); }
    if (ev === 'adpodcompleted') podDone = true;
    steps.push(s);
  });
  rv.loadAds(url);
  steps.push({ step: 'loadAds' });
  const adTime = () => { try { return rv.adCurrentTime / 1000; } catch { return 0; } }; // rmp-vast reports ms
  const startLimit = Date.now() + (opts.timeout ?? 5000) + 8000;
  while (started.length === 0 && destroyed === 0 && Date.now() < startLimit) await sleep(50);
  const waitAdTime = async (t, limitMs = 20000) => { const end = Date.now() + limitMs; while (destroyed < started.length && adTime() < t && Date.now() < end) await sleep(50); };
  const extra = {};
  if (started.length && script) {
    try {
      const adPlayer = rv.adPlayer;
      if (script.kind === 'click') {
        await waitAdTime(3);
        extra.clickThroughUrl = rv.clickThroughUrl || null;
        if (adPlayer) adPlayer.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        steps.push({ step: adPlayer ? 'click on ad video' : 'no ad video element' });
        await sleep(600);
        // rmp-vast pauses the ad after a click-through (the user is on the advertiser page); the integrator ends the break
        rv.stopAds(); steps.push({ step: 'stopAds after click' });
      } else if (script.kind === 'interact') {
        await waitAdTime(3);
        rv.pause(); steps.push({ step: 'pause', t: adTime() }); await sleep(400);
        rv.play(); steps.push({ step: 'resume' }); await sleep(300);
        rv.muted = true; steps.push({ step: 'mute' }); await sleep(300);
        rv.muted = false; steps.push({ step: 'unmute' }); await sleep(300);
        rv.volume = 0.5; steps.push({ step: 'volume 0.5' }); await sleep(300);
      } else if (script.kind === 'skip') {
        await waitAdTime(script.probeAt);
        extra.skipControlBeforeOffset = !!rv.adSkippableState; steps.push({ step: 'probe', at: adTime(), skippable: extra.skipControlBeforeOffset });
        await waitAdTime(script.at);
        extra.skipControlAfterOffset = !!rv.adSkippableState; steps.push({ step: 'probe', at: adTime(), skippable: extra.skipControlAfterOffset });
        const btn = document.querySelector('.rmp-ad-container-skip');
        if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        steps.push({ step: btn ? 'skip button clicked' : 'no skip button' });
      } else if (script.kind === 'rewind') {
        await waitAdTime(6);
        if (adPlayer) adPlayer.currentTime = 4; steps.push({ step: 'seek', to: 4 });
      } else if (script.kind === 'partial') {
        const dur = (rv.adDuration > 0 ? rv.adDuration / 1000 : 10);
        await waitAdTime(dur * script.fraction);
        rv.stopAds(); steps.push({ step: 'stopAds', at: adTime() });
      } else if (script.kind === 'icon') {
        await waitAdTime(4);
        const icon = document.querySelector('.rmp-ad-container-icons');
        extra.iconRendered = !!icon; steps.push({ step: icon ? 'icon found' : 'no icon element' });
        if (icon) icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      } else if (script.kind === 'error') {
        extra.errorNotDrivable = true; steps.push({ step: 'error', code: script.code, by: 'not drivable' });
      }
    } catch (e) { steps.push({ step: 'script action failed', error: String(e && e.message || e) }); }
  }
  // the run ends when every started ad is destroyed and no further ad starts within 2.5 s (pods play in sequence)
  const endLimit = Date.now() + 60000;
  while (Date.now() < endLimit) {
    if (started.length === 0 && destroyed > 0) break;
    if (started.length > 0 && destroyed >= started.length && (podDone || Date.now() - lastDestroyAt > 2500)) break;
    if (started.length === 0 && Date.now() > startLimit) break;
    await sleep(100);
  }
  if (started.length === 0) steps.push({ step: destroyed ? 'no ad started (destroyed)' : 'no ad started' });
  await sleep(1200); // trailing tracking requests
  try { rv.destroy(); } catch {}
  const last = errors[errors.length - 1];
  return { ok: started.length > 0, steps, resolved: started.map(id => ({ id, kind: 'inline', creatives: [] })), played: started.slice(),
    startedMuted: !!startedMuted, mediaSrc, errors, error: started.length ? null : (last ? `aderror ${last.code}: ${last.message}` : 'no ad'),
    errorCode: last && last.code > 0 ? last.code : null, ...extra };
}
export const load = (url, opts = {}) => play(url, opts, { kind: 'full' });
