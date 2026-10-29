// Browser replacement for adapters/fakevideo.mjs (swapped in at bundle time by build-browser.mjs).
// Same interface, but the element is a real <video> playing real media in real time; advance(to) plays until the
// media clock reaches `to` seconds (or the media ends), then pauses if it stopped short of the end, unless
// keepPlaying is set (scripts that perform their own user actions next). The element starts unmuted (the runner
// launches browsers with autoplay allowed); if a browser refuses unmuted playback, the driver mutes and retries and
// records startedMuted, so oracles that depend on mute state can tell.
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function createFakeVideo(document) {
  const v = document.createElement('video');
  v.muted = false; v.playsInline = true; v.setAttribute('playsinline', '');
  v.startedMuted = null;
  v.addEventListener('playing', () => { if (v.startedMuted === null) v.startedMuted = v.muted; });
  v.preload = 'auto'; v.style.width = '320px'; v.style.height = '180px';
  document.body.appendChild(v);
  const log = (globalThis.__VASTCONF_T && globalThis.__VASTCONF_T.media) || [];
  v.srcLog = [];
  const srcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  Object.defineProperty(v, 'src', { configurable: true, get() { return srcDesc.get.call(v); }, set(x) { v.srcLog.push(String(x)); srcDesc.set.call(v, x); } });
  for (const ev of ['loadedmetadata', 'canplay', 'play', 'playing', 'pause', 'ended', 'error', 'stalled', 'waiting', 'seeked', 'volumechange'])
    v.addEventListener(ev, () => log.push({ ev, t: v.currentTime, src: v.currentSrc, err: v.error ? v.error.code : null, at: performance.now() }));
  v.advance = async (to, _steps, _gap, { keepPlaying = false } = {}) => {
    const deadline = Date.now() + (to + 25) * 1000;
    while (!v.currentSrc && Date.now() < deadline) await sleep(20); // the library sets src
    if (v.paused && !v.ended) {
      try { await v.play(); }
      catch (e) {
        log.push({ ev: 'play-rejected', msg: String(e), at: performance.now() });
        if (!v.muted) { v.muted = true; log.push({ ev: 'muted-retry', at: performance.now() }); try { await v.play(); } catch (e2) { log.push({ ev: 'play-rejected-muted', msg: String(e2), at: performance.now() }); } }
      }
    }
    const target = Number.isFinite(v.duration) ? Math.min(to, v.duration) : to;
    while (!(v.currentTime >= target - 0.05 || v.ended) && Date.now() < deadline) {
      if (v.error) break;
      await sleep(25);
    }
    if (Number.isFinite(v.duration) && target < v.duration - 0.15) { if (!keepPlaying) v.pause(); }
    else { const end = Date.now() + 3000; while (!v.ended && Date.now() < end) await sleep(25); }
  };
  v.seek = async to => {
    const done = new Promise(r => v.addEventListener('seeked', r, { once: true }));
    v.currentTime = Number(to);
    await Promise.race([done, sleep(3000)]);
  };
  return v;
}
