# IMA I01 repeats, Linux (2026-10-23 PT)

What: the icon cell I01 for Google IMA (3.794.0, replayed from the 2026-10-16 archive), run alone 20 times in each
Linux engine with `../repeat-i01.sh` (run from code/harness), nothing else running. Linux x64, 2 cores, nice -n 5; Playwright 1.56.1 (Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0). About 2.5 min
per isolated run. WebKit runs 8 to 20 came from a second job after the first stopped at a time limit; they
are renumbered here (8 to 20). Column view_minus_start_ms: arrival of the IconViewTracking request minus the start
request, from the server log; the oracle (code/harness/suite/requirements.mjs I01) conforms when it is -50 or later.

| Engine | Runs | Beyond 50 ms (deviates) | View before start, range (median) |
|---|---|---|---|
| Chromium | 20 | 6 | 36 to 68 ms (48) |
| Firefox | 20 | 20 | 54 to 111 ms (72) |
| WebKit | 20 | 20 | 165 to 237 ms (193.5) |

In all 60 runs the view request came before the start request. Earlier single values: Chromium references 122 and 90
(both deviate), scrub full runs Chromium 34, Firefox 43, WebKit 161; isolated Chromium x10 on 2026-10-23 UTC 31 to 70.
