# Shaka Player 5.3.0 (Chromium)

One configuration (`shaka`), Playwright Chromium 141.0.7390.37, 108 requirements, 70 client runs, 2026-10-22 (UTC; 2026-10-21 Pacific). Built as results/shaka-5.3.0/first-run was (its COMPARE.md, "Harness"): a copy of code/harness with only shaka-player changed to 5.3.0 (`npm i --save-exact shaka-player@5.3.0`, integrity sha512-bZ5MiKQc..., reported `v5.3.0`), then `node browser/build-browser.mjs`; the adapter is unchanged. The copy's suite/ and browser/ are the working-tree files of code/harness. Command: `VASTCONF_EXT_ARCHIVE=../../sources/ima-html5/2026-10-16 node browser/run-browser.mjs --browsers chromium --clients shaka`, under `nice -n 10`.

Files: results.jsonl (one row per requirement), matrix.tsv (strength from the current suite/requirements.mjs), summary.json.

Against results/shaka-5.3.0/first-run (same release, previous oracles and vectors), 7 cells differ: X04 n/a to conforms (X04 graded); A01 n/a to deviates (InLine-only verification vector, no verificationNotExecuted request); R04, R05 n/a to conforms (root-level gzip and text/plain vectors); M06 n/a to conforms, M07 n/a to deviates (`-1`), M08 n/a to conforms (vector without FLV). M09 stays n/a (UNIVERSALADID not provided, `-1`).

Totals: conforms 44, deviates 22 (15 must, 7 should), n/a 42.
