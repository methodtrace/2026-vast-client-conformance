// Builds the browser assets into browser/dist/: vastconf-browser.js (adapters + instrumentation) and a copy of
// shaka-player's compiled build. The Node adapters are reused unchanged; three imports are substituted:
//   ./fakevideo.mjs                         -> browser/realvideo.mjs        (real <video>, real time)
//   ../build/dist/video-ad-sdk.bundle.mjs   -> video-ad-sdk                 (bundled for the browser)
//   ../build/dist/iab-vast-loader.bundle.mjs -> browser/iab-browser-entry.mjs (the library's own browser entry)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'dist');
fs.mkdirSync(out, { recursive: true });
const subst = {
  './fakevideo.mjs': path.join(here, 'realvideo.mjs'),
  '../build/dist/iab-vast-loader.bundle.mjs': path.join(here, 'iab-browser-entry.mjs'),
};
const plugin = { name: 'vastconf-subst', setup(b) {
  b.onResolve({ filter: /fakevideo\.mjs$|iab-vast-loader\.bundle\.mjs$/ }, a => ({ path: subst[a.path] }));
  b.onResolve({ filter: /video-ad-sdk\.bundle\.mjs$/ }, async a => b.resolve('video-ad-sdk', { resolveDir: here, kind: 'import-statement' }));
} };
await build({ entryPoints: [path.join(here, 'entry.mjs')], bundle: true, format: 'esm', platform: 'browser', target: ['chrome100', 'firefox100', 'safari15'],
  mainFields: ['browser', 'module', 'main'], outfile: path.join(out, 'vastconf-browser.js'), plugins: [plugin], logLevel: 'warning', sourcemap: true,
  define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' } });
fs.copyFileSync(path.join(here, '../node_modules/shaka-player/dist/shaka-player.compiled.js'), path.join(out, 'shaka-player.compiled.js'));
fs.copyFileSync(path.join(here, '../vendor/rmp-vast-17.2.0/rmp-vast.js'), path.join(out, 'rmp-vast.js'));
fs.copyFileSync(path.join(here, 'page.html'), path.join(out, 'page.html'));
for (const f of fs.readdirSync(out)) console.log(f, fs.statSync(path.join(out, f)).size);
