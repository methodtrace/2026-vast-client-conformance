// Browser-like globals for running client libraries under Node.
// Pixels (new Image().src, navigator.sendBeacon) become real HTTP GETs so the recording server sees them.
import { JSDOM } from 'jsdom';

export const pending = new Set();
export const pixels = []; // every pixel URL the client attempted, in order (client-side view)
export const fetches = []; // every URL passed to fetch() by client code (client-side view, before URL parsing)

function fire(url, via) {
  pixels.push({ url: String(url), via, t: Date.now() });
  const p = fetch(String(url)).then(r => r.arrayBuffer()).catch(() => {}).finally(() => pending.delete(p));
  pending.add(p);
}

export function installEnv() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1/', pretendToBeVisual: true });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  // DOM interface classes (Text, CDATASection, Element, DOMParser, ...) that client code references as globals
  for (const k of Object.getOwnPropertyNames(w)) {
    if (/^[A-Z]/.test(k) && !(k in globalThis)) { try { globalThis[k] = w[k]; } catch {} }
  }
  class PixelImage {
    constructor() { this._src = ''; this.onload = null; this.onerror = null; }
    set src(v) { this._src = v; fire(v, 'Image'); }
    get src() { return this._src; }
    addEventListener() {}
    removeEventListener() {}
  }
  globalThis.Image = PixelImage;
  const nodeFetch = globalThis.fetch.bind(globalThis);
  w.fetch = (input, init) => { fetches.push(String(input && input.url || input)); return nodeFetch(input, init); };
  w.Image = PixelImage;
  const nav = { userAgent: 'vastconf-harness', sendBeacon: (u) => { fire(u, 'sendBeacon'); return true; } };
  try { Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true }); } catch {}
  try { Object.defineProperty(w, 'navigator', { value: nav, configurable: true }); } catch {}
  return w;
}

export async function drain(ms = 300) {
  await new Promise(r => setTimeout(r, ms));
  await Promise.allSettled([...pending]);
}
