# References (2026-10-21)

108 requirements. Each folder holds results.jsonl (one row per requirement and configuration, with the request log and the adapter result), matrix.tsv (verdict per requirement and configuration) and summary.json (cell counts, verdict totals, the stored reference it was built from, and the run summary of the rerun).

| Folder | Layer | Configurations | Cells | Built from |
|---|---|---|---|---|
| node/, node-run2/ | Node.js 22.22.0 | vastclient, videoadsdk, iabloader, iabloader+nsap, vastlint | 540 each | results/reference/first-run/node, node-run2 |
| chromium/, chromium-run2/ | Playwright Chromium 141.0.7390.37 | the five above plus shaka, rmpvast, rmpvast+omid, ima | 864 each | results/reference/first-run/chromium, chromium-run2 |
| firefox/ | Playwright Firefox 142.0.1 (Linux) | eight, as Chromium | 864 | results/reference/first-run/firefox |
| webkit/ | Playwright WebKit 26.0 (Linux, GStreamer) | eight, as Chromium | 864 | results/reference/first-run/webkit-local |

## How each folder was built

1. Every stored cell of the first reference runs (first-run/) was regraded with the working-tree oracles (code/harness/suite/requirements.mjs and evaluate.mjs, through suite/regrade.mjs). Regrading the stored cells with the previous oracles reproduces every stored verdict, so a changed verdict comes from the oracle, not from the regrade.
2. The requirements whose vectors changed were run again in the same layer and engine: A01, A02, A04 (a_verification_inline), R04 (r_gzip_root, entry document sent gzip-compressed), R05 (r_text_plain_root, entry document sent as text/plain) and M06 to M09 (m_optional_noflv), for every configuration. Command, from code/harness: `node suite/run.mjs <out> '^(A01|A02|A04|R04|R05|M06|M07|M08|M09)$'` for the Node.js layer; `VASTCONF_EXT_ARCHIVE=../../sources/ima-html5/2026-10-16 node browser/run-browser.mjs --browsers <engine> --with-ima --only '^(A01|A02|A04|R04|R05|M06|M07|M08|M09)$'` for the browsers (Google IMA 3.794.0 replayed from the archive).
3. `node suite/merge-rerun.mjs --base <first-run results.jsonl> --rerun <rerun results.jsonl> --out <folder>` replaces each rerun cell and keeps the regraded cell otherwise. Each row carries `source` (the first-run file or the rerun); a regraded row whose verdict changed carries `regraded: { from, fromDetail }`.

Reruns: Node.js and Chromium (runs 1 and 2) and Firefox and WebKit on 2026-10-21, Linux x64, 2 cores, under `nice -n 10`. Toolchain: Node.js 22.22.0, npm 10.9.4, Playwright 1.56.1, esbuild 0.25.10, jsdom 26.1.0; clients @dailymotion/vast-client 6.5.0, video-ad-sdk 4.0.1, iab-vast-loader 2.5.1 (parser 1.2.1, model 1.0.2), vastlint-client 0.15.0, shaka-player 5.2.12, rmp-vast 17.2.0 (vendored), IMA HTML5 SDK 3.794.0 (archived). Bundles (code/harness/build/dist) sha256: iab-vast-loader.bundle.mjs a43ad105..., video-ad-sdk.bundle.mjs 69c8a0a5..., as in the first runs.

## Strength

The strength column of every matrix.tsv, and the strength field of every row, come from the current suite/requirements.mjs (W05 should; W11, E09, X13 must; I03 should).

## Checks

- Run 1 and run 2 give the same verdict in every cell, Node.js (540) and Chromium (864); on the rerun cells the details differ only in three M08 ADPLAYHEAD values (Chromium, within a few milliseconds).
- Every row regraded with the current code gives its stored verdict.
- Firefox differs from Chromium in the same 7 cells as in the first runs (S02 for rmpvast, rmpvast+omid, ima; W11 for videoadsdk, iabloader, iabloader+nsap, ima). WebKit differs from Chromium in 4 cells (S01 videoadsdk; S02 rmpvast, rmpvast+omid, ima); video-ad-sdk M06 and M07 deviate in WebKit as in Chromium now that the vector has no FLV file.

Shaka Player 5.3.0 in Chromium: ../shaka-5.3.0/.
