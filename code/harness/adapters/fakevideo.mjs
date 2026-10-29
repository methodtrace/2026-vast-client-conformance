// A jsdom <video> element whose media clock the harness drives. It reports the duration it is given, accepts
// MP4 and WebM in canPlayType, and fires the media events a real element fires on load, play, timeupdate and end.
export function createFakeVideo(document, { duration = 10, playable = /mp4|webm/i } = {}) {
  const v = document.createElement('video');
  let t = 0, dur = NaN, paused = true, src = '', ended = false, muted = false, volume = 1;
  v.srcLog = []; // every media URL the client assigned, in order (which MediaFile it chose)
  const fire = name => v.dispatchEvent(new document.defaultView.Event(name));
  Object.defineProperties(v, {
    currentTime: { get: () => t, set: x => { t = Number(x); }, configurable: true },
    duration: { get: () => dur, configurable: true },
    paused: { get: () => paused, configurable: true },
    ended: { get: () => ended, configurable: true },
    muted: { get: () => muted, set: x => { muted = Boolean(x); fire('volumechange'); }, configurable: true },
    volume: { get: () => volume, set: x => { volume = Number(x); fire('volumechange'); }, configurable: true },
    readyState: { get: () => (Number.isNaN(dur) ? 0 : 4), configurable: true },
    src: {
      get: () => src, configurable: true,
      set: x => { src = String(x); v.srcLog.push(src); t = 0; ended = false; dur = NaN;
        setTimeout(() => { dur = typeof duration === 'function' ? duration() : duration; ['loadstart', 'durationchange', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach(fire); }, 0); },
    },
  });
  v.canPlayType = type => (playable.test(String(type)) ? 'probably' : '');
  v.load = () => {};
  v.play = () => { if (paused) { paused = false; fire('play'); fire('playing'); } return Promise.resolve(); };
  v.pause = () => { if (!paused) { paused = true; fire('pause'); } };
  // Seek (a user scrubbing backwards or forwards): moves the clock and fires seeking, seeked and timeupdate.
  v.seek = async to => { fire('seeking'); t = Number(to); ended = false; fire('seeked'); fire('timeupdate'); await new Promise(r => setTimeout(r, 2)); };
  // Advance the clock to `to` seconds in `steps` timeupdate events; fires 'ended' when reaching the duration.
  v.startedMuted = false;
  v.advance = async (to, steps = 20, gapMs = 2, _opts = {}) => {
    // media time cannot move before metadata is known, as on a real element
    for (let i = 0; i < 500 && Number.isNaN(dur); i++) await new Promise(r => setTimeout(r, 2));
    const from = t;
    for (let i = 1; i <= steps; i++) {
      t = Math.min(dur, from + ((to - from) * i) / steps);
      fire('timeupdate');
      await new Promise(r => setTimeout(r, gapMs));
    }
    if (t >= dur) { ended = true; paused = true; fire('ended'); }
  };
  return v;
}
