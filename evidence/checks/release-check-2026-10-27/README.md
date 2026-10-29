# Release check of the tested clients (2026-10-27)

Latest releases against the tested ones (npm registry and upstream git, 2026-10-27):

| Client | Tested | Current on 2026-10-27 | Note |
|---|---|---|---|
| @dailymotion/vast-client | 6.5.0 | 6.5.0 | master 73c67bd and pull request #514 head 0b3246e unchanged |
| video-ad-sdk | 4.0.1 | 4.0.1 | |
| iab-vast-loader / iab-vast-parser | 2.5.1 / 1.2.1 | same | |
| vastlint-client (core vastlint) | 0.15.0 (0.15.0) | 0.15.3 and 0.16.2 (last patch of each later minor), core pinned to the same release | |
| Shaka Player | 5.2.12 (5.3.0 in Chromium) | 5.2.15 and 5.3.2, both 2026-10-23 | |
| rmp-vast | 17.2.0 at 5975ead | upstream HEAD 5975ead | |

Method: the harness with only the client changed. vastlint-client: `node code/harness/sweep/run-sweep.mjs <out> vastlint@<release>` with the release added to the sweep list in a scratch copy (Node.js layer, current vectors). Shaka: a copy of code/harness with `npm i --save-exact shaka-player@<release>`, browser bundle rebuilt, `node browser/run-browser.mjs --browsers <engine> --clients shaka` (Playwright 1.56.1: Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0; 70 client runs per engine). Linux x64.

Results (108 requirements each):

| Release | Layer or engine | Compared with | Cells identical |
|---|---|---|---|
| vastlint-client 0.15.3 | Node.js | 0.15.0 reference | 108 of 108 |
| vastlint-client 0.16.2 | Node.js | 0.15.0 reference | 108 of 108 |
| Shaka 5.2.15 | Chromium, Firefox, WebKit | 5.2.12 reference in the same engine | 108 of 108 in each |
| Shaka 5.3.2 | Chromium | 5.3.0 (Chromium) | 108 of 108 |
| Shaka 5.3.2 | Firefox, WebKit | 5.2.12 reference in the same engine | 97 of 108 in each; the 11 others (M01 to M06, M08, M11, P03, T10, T23) are exactly the cells where 5.3.0 differs from 5.2.12 in Chromium, each with the 5.3.0 verdict |

Every finding of the tested releases is present in the releases current on 2026-10-27, and the 5.3 changes reproduce in Firefox and WebKit.
