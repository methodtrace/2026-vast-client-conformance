# IMA I01 repeats, macOS (2026-10-27)

The icon cell I01 for Google IMA (3.794.0, replayed from the 2026-10-16 archive), run alone 10 times in each engine
with `../repeat-i01.sh` from the release package's code/harness, after the package run, nothing else running.
Apple silicon Mac mini (M5 Pro, 15 cores), macOS; package Node 22.22.0, Playwright 1.56.1 (Chromium 141, Firefox 142,
WebKit 26) and the installed Google Chrome. Column view_minus_start_ms: IconViewTracking request minus start request,
from the server log; the oracle conforms when it is -50 or later.

| Engine | Runs | Beyond 50 ms (deviates) | View before start, range (median) |
|---|---|---|---|
| Chromium | 10 | 0 | 11 to 12 ms (11) |
| Google Chrome | 10 | 0 | 10 to 13 ms (12) |
| Firefox | 10 | 0 | 13 to 50 ms (49) |
| WebKit | 10 | 10 | 51 to 58 ms (53) |

In all 40 runs the view request came before the start request.
