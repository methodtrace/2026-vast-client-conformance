// video-ad-sdk 4.0.1 driven directly (runWaterfall on a jsdom page with the harness fake <video>), outside the adapter.
// Prints the stack of every unhandled rejection, mapped to node_modules/video-ad-sdk/src via the sourcemapped bundle.
// Usage: node --enable-source-maps evidence/checks/fuzz-repros/videoadsdk-stack.mjs <dir with start.xml> [mode]
//   mode "env-as-is"   : globals exactly as the harness installs them (Node 22's own Event/CustomEvent kept)
//   mode "jsdom-events": Event and CustomEvent replaced by jsdom's, as in a browser where there is only one realm
//   mode "no-handler"  : as env-as-is but with no unhandledRejection listener: shows Node's default (process exit)
import path from 'node:path';
import { startServer } from '../../../code/harness/server.mjs';
import { installEnv } from '../../../code/harness/adapters/env.mjs';
import { createFakeVideo } from '../../../code/harness/adapters/fakevideo.mjs';

const [, , dirArg, mode = 'env-as-is'] = process.argv;
const here = path.dirname(new URL(import.meta.url).pathname);
const w = installEnv();
if (mode === 'jsdom-events') { globalThis.Event = w.Event; globalThis.CustomEvent = w.CustomEvent; }
if (mode !== 'no-handler') process.on('unhandledRejection', e => console.log('UNHANDLED REJECTION:', String(e && e.stack || e).split('\n').slice(0, 9).join('\n')));
const { runWaterfall } = await import(process.env.BUNDLE || path.join(here, 'build/vas-sm.bundle.mjs'));
const dir = path.resolve(dirArg);
const srv = await startServer({ root: path.dirname(dir) });
const url = `${srv.base}/doc/x/${path.basename(dir)}/start.xml`;
const slot = document.createElement('div'); slot.style.cssText = 'position:relative;width:640px;height:360px'; document.body.appendChild(slot);
const video = createFakeVideo(document, { duration: 16 });
const outcome = await new Promise(resolve => {
  runWaterfall(url, slot, {
    videoElement: video, timeout: 2000,
    onAdReady: u => { console.log('onAdReady: ad unit type', u.type); if (u.type === 'VAST') video.advance(2, 4, 2, { keepPlaying: true }); }, // the library fires start on the first timeupdate
    onAdStart: () => { console.log('onAdStart'); resolve('started'); },
    onError: e => console.log('onError:', e && e.message, e && e.code),
    onRunFinish: () => resolve('finished'),
  });
  setTimeout(() => resolve('limit'), 6000);
});
if (outcome === 'started') await video.advance(8, 8, 2, { keepPlaying: true });
console.log('outcome:', outcome);
await new Promise(r => setTimeout(r, 300));
await srv.close();
process.exit(0);
