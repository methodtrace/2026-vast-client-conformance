# Remote WebKit reference run

- Date: 2026-10-16 23:16 UTC to 2026-10-17 00:30 UTC
- Commit run: daf6515 (private development repository)
- Command: `VASTCONF_EXT_ARCHIVE=$PWD/../../sources/ima-html5/2026-10-16 node browser/run-browser.mjs --out /tmp/ref-webkit --browsers webkit` (VASTCONF_EXT_RECORD not set)
- Machine: `Linux vm 6.18.44-fc-v139 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux`; nproc 2; CPU Intel(R) Xeon(R) Processor @ 2.80GHz (cloud VM, Ubuntu 24.04 userland)
- Node: v22.22.0
- Playwright: 1.56.1
- WebKit: 26.0 (from summary.json)
- Wall time: 75 min 49 s for the run command (browser phase 73 min 52 s per summary.json)

## Results

864 cells, 548 client runs, not parallel. Verdicts: conforms 482, deviates 117, n/a 90, delegated 175.

| config | conforms | deviates | n/a | delegated |
|---|---|---|---|---|
| vastclient | 78 | 6 | 3 | 21 |
| videoadsdk | 69 | 25 | 14 | 0 |
| iabloader | 23 | 5 | 3 | 77 |
| iabloader+nsap | 24 | 4 | 3 | 77 |
| shaka | 32 | 28 | 48 | 0 |
| rmpvast | 80 | 22 | 6 | 0 |
| rmpvast+omid | 84 | 20 | 4 | 0 |
| ima | 92 | 7 | 9 | 0 |

No harness errors. External requests: 540 served from the archive, 555 answered by the telemetry stub (204, not sent); none blocked as not in archive. Not-drivable notes: shaka click/partial (we0097, we0105, we0113, we0177), ima rewind/icon (we0316, we0396, we0404).
