# Reference results

The package compares a run with these files (tools/compare.mjs). Each matrix has one row per requirement and one
column per client configuration; a cell is conforms, deviates, delegated, observation or n/a.

| File | Layer | Machine | Configurations |
|---|---|---|---|
| node/matrix.tsv, node-run2/matrix.tsv | Node.js 22.22.0 | Linux x64 | vastclient, videoadsdk, iabloader, iabloader+nsap, vastlint (108 requirements; two runs, identical) |
| browser/chromium-matrix.tsv | Playwright Chromium 141.0.7390.37 | Linux x64 | the four browser-capable configurations above plus shaka, rmpvast, rmpvast+omid, ima |
| browser/firefox-matrix.tsv | Playwright Firefox 142.0.1 | Linux x64 | as Chromium |
| browser/webkit-matrix.tsv | Playwright WebKit 26.0 (GStreamer) | Linux x64 | as Chromium |
| macos/<engine>-matrix.tsv | Chromium, Google Chrome, Firefox, WebKit, Safari | macOS on Apple silicon | as Chromium; Safari without IMA (safaridriver did not honor the proxy capability). 99 requirements: A01, A02, A04, R04, R05 and M06 to M09 are left out |
| grid/error-grid.tsv, grid/error-grid-graded.jsonl | Node.js error grid | Linux x64 | Wrapper chains of depth 1 to 7, each failure at each level (748 cells) |
| grid/macro-grid.tsv | Node.js macro grid | Linux x64 | every IAB macro, both request-URI forms (sent values compared by class) |
| gate2-summary.json | Node.js | Linux x64 | IAB VAST 4.x samples parsed per client |

Toolchain for every reference: Node.js 22.22.0, npm 10.9.4, Playwright 1.56.1, esbuild 0.25.10, jsdom 26.1.0;
@dailymotion/vast-client 6.5.0, video-ad-sdk 4.0.1, iab-vast-loader 2.5.1 (parser 1.2.1, model 1.0.2),
vastlint-client 0.15.0, shaka-player 5.2.12, rmp-vast 17.2.0 (vendored), Google IMA HTML5 SDK 3.794.0 (archived).

SOURCES.tsv lists the sha256 of every reference file; file-hashes.json the hashes of the built bundles, the test
vectors, the media files and, in a package with IMA, the IMA archive.
