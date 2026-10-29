// Adapter: iab-vast-loader + iab-vast-parser + iab-vast-model (Zentrick), the libraries behind IAB Tech Lab's
// VAST-Tester. Bundled without the `esm` loader (build/build.sh). Loader only: it has no tracker of its own.
import { ad, creative, hms } from './normalize.mjs';

// VASTCONF_MODULE (version sweep, sweep/run-sweep.mjs) substitutes another release of the library; the reported
// version then comes from VASTCONF_MODULE_VERSION.
export const client = { id: 'iabloader', name: 'iab-vast-loader', version: '2.5.1 (parser 1.2.1, model 1.0.2)', language: 'JavaScript' };

let mod;
async function lib() { return (mod ||= await (globalThis.process && process.env && process.env.VASTCONF_MODULE ? import(process.env.VASTCONF_MODULE) : import('../build/dist/iab-vast-loader.bundle.mjs'))); }

const list = x => (!x ? [] : Array.isArray(x) ? x : x._contents ? x._contents : typeof x[Symbol.iterator] === 'function' ? [...x] : []);
const uriOf = x => (x == null ? null : typeof x === 'string' ? x : x.uri ?? x._uri ?? null);

function normAd(a) {
  const isInline = a.$type === 'InLine' || (a.constructor && a.constructor.name === 'InLine');
  return ad({
    kind: isInline ? 'inline' : 'wrapper', id: a.id, sequence: a.sequence,
    adSystem: a.adSystem && (a.adSystem.name ?? a.adSystem._name ?? a.adSystem.value ?? String(a.adSystem)), title: a.adTitle,
    impressions: list(a.impressions).map(uriOf), errors: list(a.errors).map(uriOf),
    vastAdTagURI: isInline ? null : uriOf(a.vastAdTagURI),
    verifications: list(a.verifications).length,
    creatives: list(a.creatives).map(c => {
      const lin = c.linear;
      if (!lin) return creative({ id: c.id, type: c.nonLinearAds ? 'nonlinear' : 'companion' });
      const tr = lin.trackingEvents;
      const tracking = tr && tr.types ? [...tr.types].flatMap(ev => list(tr.get(ev)).map(t => ({ event: ev, url: uriOf(t), offset: t.offset && String(t.offset) }))) : [];
      return creative({
        id: c.id, type: 'linear', duration: hms(lin.duration), skipOffset: lin.skipoffset && String(lin.skipoffset),
        mediaFiles: list(lin.mediaFiles).map(m => ({ url: m.uri, type: m.type, width: m.width, height: m.height, delivery: m.delivery })),
        tracking, clickThrough: lin.videoClicks && uriOf(lin.videoClicks.clickThrough),
        clickTracking: lin.videoClicks ? list(lin.videoClicks.clickTrackings).map(uriOf) : [],
      });
    }),
  });
}

const adsOf = v => [...(v.adPod ? list(v.adPod.ads) : []), ...list(v.ads)];

export async function load(url, opts = {}) {
  const { VASTLoader } = await lib();
  const options = { timeout: opts.timeout ?? 5000 };
  if (opts.wrapperLimit !== undefined) options.maxDepth = opts.wrapperLimit + 1; // maxDepth counts documents, not wrappers
  if (opts.noSingleAdPods !== undefined) options.noSingleAdPods = opts.noSingleAdPods;
  const events = [];
  try {
    const loader = new VASTLoader(url, options);
    for (const ev of ['willFetch', 'didFetch', 'willParse', 'didParse', 'error']) loader.on(ev, e => events.push({ ev, uri: e && e.uri, code: e && e.error && e.error.code }));
    const chain = await loader.load();
    const docs = chain.map(v => ({ version: v.version, ads: adsOf(v).map(normAd), vastErrors: list(v.errors).map(uriOf) }));
    const last = docs[docs.length - 1];
    return { ok: true, resolved: last ? last.ads.filter(a => a.kind === 'inline') : [], chain: docs, chainLength: docs.length, events };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e), errorCode: e && e.code ? Number(e.code) : null, events };
  }
}

// iab-vast-loader has no tracker; every playback-time duty (impression, events, error pixels) is the integrator's.
export async function play(url, opts = {}, script = { kind: 'full' }) {
  const r = await load(url, opts);
  return { ok: r.ok, phase: 'load', delegated: true, error: r.error || null, steps: [] };
}
