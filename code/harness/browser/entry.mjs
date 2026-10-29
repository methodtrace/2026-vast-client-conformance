// Browser bundle entry: the same adapters as the Node harness (bundled with module substitutions, see
// build-browser.mjs), plus Shaka, plus instrumentation that records every pixel attempt, fetch, media event and page
// error. window.VASTCONF.run(clientId, url, opts, script) returns the same result shape as adapters/run.mjs.
const T = (globalThis.__VASTCONF_T = { pixels: [], fetches: [], uncaught: [], media: [], notes: [] });
const imgSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
Object.defineProperty(HTMLImageElement.prototype, 'src', {
  configurable: true, get() { return imgSrc.get.call(this); },
  set(v) { T.pixels.push({ url: String(v), via: 'Image', at: performance.now() }); imgSrc.set.call(this, v); },
});
if (navigator.sendBeacon) { const sb = navigator.sendBeacon.bind(navigator); navigator.sendBeacon = (u, d) => { T.pixels.push({ url: String(u), via: 'sendBeacon', at: performance.now() }); return sb(u, d); }; }
const of = window.fetch.bind(window);
window.fetch = (i, o) => { T.fetches.push({ url: String(i && i.url || i), at: performance.now() }); return of(i, o); };
const xo = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (m, u, ...rest) { T.fetches.push({ url: String(u), via: 'xhr', at: performance.now() }); return xo.call(this, m, u, ...rest); };
window.addEventListener('error', e => T.uncaught.push(String(e.message || (e.error && e.error.message) || e)));
window.addEventListener('unhandledrejection', e => T.uncaught.push('unhandled rejection: ' + String(e.reason && e.reason.message || e.reason)));

import * as vastclient from '../adapters/vastclient.mjs';
import * as videoadsdk from '../adapters/videoadsdk.mjs';
import * as iabloader from '../adapters/iabloader.mjs';
import * as shakaAdapter from './shaka-adapter.mjs';
import * as rmpvastAdapter from './rmpvast-adapter.mjs';
import * as imaAdapter from './ima-adapter.mjs';
const ADAPTERS = { vastclient, videoadsdk, iabloader, shaka: shakaAdapter, rmpvast: rmpvastAdapter, ima: imaAdapter };
const sleep = ms => new Promise(r => setTimeout(r, ms));

window.VASTCONF = {
  ready: true,
  async run(clientId, url, opts = {}, script = null) {
    const a = ADAPTERS[clientId];
    const t0 = performance.now();
    let r;
    try {
      r = script ? { mode: 'play', script, ...(await a.play(url, opts, script)) } : { mode: 'load', ...(await a.load(url, opts)) };
    } catch (e) { r = { ok: false, error: 'adapter crash: ' + String(e && e.stack || e).slice(0, 800) }; }
    await sleep(opts.drainMs ?? 600);
    const client = { ...(a.client || { id: clientId }) };
    if (clientId === 'shaka' && globalThis.shaka) client.version = shaka.Player.version;
    if (clientId === 'ima' && r.sdkVersion) client.version = r.sdkVersion;
    return { client, url, opts, ...r, ms: performance.now() - t0, uncaught: T.uncaught.slice(),
      pixels: T.pixels.map(p => p.url),
      telemetry: { pixelLog: T.pixels, fetches: T.fetches, media: T.media, notes: T.notes, userAgent: navigator.userAgent } };
  },
};
