# Shaka Player 5.3.0 vs 5.2.12 (Chromium, shaka configuration)

Run on 2026-10-20. One configuration (`shaka`), one engine (Playwright Chromium 141.0.7390.37), 108 requirements = 108 cells, 68 client runs. Reference: `results/reference/first-run/chromium/results.jsonl`, config `shaka`, Shaka 5.2.12, run on 2026-10-16. `chromium-run2` matches it in every cell.

## Version tested

- shaka-player **5.3.0**, installed with `npm i --save-exact shaka-player@5.3.0`. `node_modules/shaka-player/package.json` gives 5.3.0, and the player reports `v5.3.0` at runtime (`clientVersion` in every row).
- npm registry: published **2026-10-16T13:16:39Z**. Integrity `sha512-bZ5MiKQcs+CBtAHFGUqHW4Q+2U3oXGVmXY+gdrSOoVmHzcilvNp+jEsqhd3/4cGhL4j4+Z66Jisq42U4jOfY1g==`, gitHead `f5fd3ce3`.
- Other releases from the same period:
  - 5.2.13 (2026-10-09) and 5.2.14 (2026-10-16): no `Ads` entries.
  - 5.3.1 (2026-10-19): one Text fix and no ad changes, per the v5.3.x CHANGELOG.

## Harness

- The harness ran from a copy of code/harness on the build machine. The only change was `shaka-player` 5.2.12 -> 5.3.0 in package.json, package-lock.json and node_modules, followed by `node browser/build-browser.mjs`.
- Command: `VASTCONF_EXT_ARCHIVE=sources/ima-html5/2026-10-16 node browser/run-browser.mjs --browsers chromium --clients shaka`, run under `nice -n 5`.
- **The adapter is unchanged, so there is no adapter.diff.**
  - Everything `browser/shaka-adapter.mjs` uses is still exported in 5.3.0: `getAdManager`, `setContainers`, `addAdUrlInterstitial`, the `ad-*` event names, `getAdId`, `getMediaUrl`, `pause`, `play`, `setMuted`, `setVolume`, `skip`, `canSkipNow` and `ad.video`.
  - The externs diff for `externs/shaka/ads.js` adds optional `AdInterstitial` fields and removes the internal `AdTrackingInfo` typedef. Neither affects the adapter.
  - A 4-cell smoke test (T01, T11, T16, T21) drove the user actions with ad-time positions as on 5.2.12: pause at 3.05 s, skip probes at 1.52 s and 6.01 s.
- Where 5.3.0 changed: 5.3.0 rewrites the `lib/ads` measurement.
  - New files: `interstitial_ad_session.js` (an ad-time clock and tracking state for each ad, plus VAST macro expansion) and `interstitial_tracker.js`. They replace `Utils.fireTrackingEvents` keyed on `lastPlayedAd_`.
  - The 5.3.0 CHANGELOG does not name the macro expansion or the session tracking. Its other ad fixes (#10566, #10546, #10521, #10469, #10447, #10412) were already backported to 5.2.12 (5.2.5 to 5.2.11).
  - Every cause below was checked in the 5.3.0 `lib/ads` source shipped in the npm package.

## Verdict totals (108 cells)

| | conforms | deviates | n/a |
|---|---|---|---|
| 5.2.12 | 32 | 28 (21 must, 7 should) | 48 |
| 5.3.0 | 39 | 20 (15 must, 5 should) | 49 |

**11 verdict changes (7 must, 4 should). 97 cells unchanged.** They break down as 8 fixes (6 must, 2 should), 1 regression (should) and 2 harness or vector effects (1 must, 1 should).

## Every verdict change

Line numbers refer to `node_modules/shaka-player/lib/ads/` in 5.3.0: `S` = `interstitial_ad_session.js`, `M` = `interstitial_ad_manager.js`.

| Req | Strength | 5.2.12 | 5.3.0 | Cause | Class |
|---|---|---|---|---|---|
| M01 | must | deviates: `"[CACHEBUSTING]" (14 chars)` | conforms: `53097872` | Tracking URIs now pass through `session.expandUri()` (M 716, S 274-299). `CACHEBUSTING` is 8 random digits with leading zeros kept (S 283-285). | **fix** |
| M02 | must | deviates: `"[TIMESTAMP]"` | conforms: `2026-10-21T02:01:00.602Z` | `TIMESTAMP` = `new Date().toISOString()` (S 287) | **fix** |
| M03 | must | deviates: `"[LIMITADTRACKING]"` | conforms: `-1 (unknown/withheld; outside the 0/1 definition)` | `LIMITADTRACKING` is not in the macro table, so the fallback writes `-1` (S 298). This conforms only under the harness's lenient -1/-2 acceptance. It is not a 0/1 value. | **fix** (lenient) |
| M04 | must | n/a: `TIMESTAMP left unreplaced (see M02)` | conforms: `2026-10-21T02%3A01%3A00.602Z` | Values are passed through `encodeURIComponent` (S 297-298). The cell becomes gradable once M02 is fixed. | **fix** |
| M05 | should | conforms: `"[NOTAREALMACRO]"` | deviates: `replaced with -1` | Every bracketed token that is not in the table is replaced with `-1`: the pattern is `/\[([A-Z0-9_]+)\]\|%5B…%5D/gi` with `|| '-1'` (S 296-298). §6.1 says to leave unknown macros alone. The same fallback writes `-1` for `[ERRORCODE]` (see E03/E05/E06 below). | **regression** |
| M11 | must | deviates: `cb "[CACHEBUSTING]", ts "[TIMESTAMP]"` | conforms: `cb 58387679, ts 2026-10-21T02:07:05.240Z` | Error URIs go through the same `sendBeacon` and `expandUri` path (M 716-722) | **fix** |
| P03 | must | deviates: `misattributed: p1 imp 1 complete 0; p2 imp 1 complete 1; p3 imp 1 complete 2` | conforms: `one impression and one complete per ad (3 ads)` | `complete()` now sends `AD_COMPLETE` for its own `interstitial` before `basicTask()` sets up the next ad (M 1455-1466). Each ad also gets its own session and tracker (M 710-725; S header: "a callback from an earlier ad cannot track the next ad in a pod"). In 5.2.12, complete fired after the next ad became `lastPlayedAd_`. On the wire, each pod ad now gets its own complete. | **fix** |
| T10 | should | deviates: `impression requested for an ad that never played` | conforms: `no impression` | Impression, start and loaded beacons are held back until the session sees real playback: `readyState >= 2` and a timeupdate (S 149-167). `notify()` drops anything other than loaded or error before that point (S 225). In 5.2.12 they fired at ad setup, before media load. | **fix** |
| T23 | should | deviates: `unmute fired 2 times` | conforms: `unmute once` | A `volumechange` that does not change the muted state is tagged `muteChanged=false` (M 1581-1587) and not tracked (M 2335-2337, S 235-239). In 5.2.12, every non-muted volumechange fired unmute (5.2.12 `ad_utils.js` 161). | **fix** |
| M06 | must | deviates: `not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", …` | n/a: `impression not fired` | The `m_optional` vector lists an FLV first. Shaka still picks it (S01 unchanged, sort at `vast_interstitial_parser.js` 126) and fails with 4000. Because of the T10 fix, no impression fires for that ad, so the oracle has nothing to grade. The paper notes the same mechanism for Linux WebKit. Probe without the FLV (below): **conforms**, all replaced. | **harness effect** (vector + T10 fix) |
| M07 | should | deviates: `"[ADSERVINGID]"` | n/a: `impression not fired` | Same mechanism as M06. Probe without the FLV: **deviates `"-1"`**, because `ADSERVINGID` is not in the macro table (S 284-295). The finding still holds in substance. | **harness effect** (vector + T10 fix) |

## Same verdict, different wire

- **E03, E05, E06** still deviate. The detail changes from `[ERRORCODE]` to `-1`:
  - The Error URIs are now requested with `code=-1` instead of the literal macro, because `ERRORCODE` is not in the table.
  - Impression and start no longer fire before the error, because of the T10 mechanism.
- **S01** (deviates) and **M08, M09, M10** (n/a): impression and start are gone for the failed FLV ad, and the Error URI now carries `code=-1`.
- **E07** still deviates: the Error URI is never requested.
  - In 5.3.0, impression and start fire about 30 s late, when the delayed media arrives, followed by first quartile, midpoint and third quartile.
  - Before that, the ad slot was announced and nothing was tracked. A media timeout is still not reported as 402.
- **T15** still conforms. The detail changes from `2 time(s)` to `1 time(s)` (T23 fix). T11 to T14 and T20 lose the same extra unmute request.
- **P01, P02, P05, P06**: verdicts and details are unchanged. The complete requests move to the right ad (P03 fix). In `p_pod_fail`, the failed p2 no longer gets imp, start or complete before its Error URI.
- Content-media byte ranges differ in about 20 n/a cells (buffering noise). There are no tracking differences there.

## Unchanged findings (5.3.0 source)

These all still hold, each with the same detail as 5.2.12:

- **Wrappers ignored (W01, W02):** `vast_interstitial_parser.js` 31 still skips ads without InLine.
- **No-ad VAST-level Error (E01, E02).**
- **Media timeout not reported (E07).**
- **Progress, offset and percentage events (T05 to T07):**
  - `Utils.createTracking()` (`ad_utils.js` 23) still has no `progress` entry.
  - The new tracker's offset support (`InterstitialTracker.onProgress`) is fed only by SVTA, not by VAST.
- **No loaded tracking (T20):** `loaded` is not a `createTracking` key.
- **Percentage skipoffset (T18).**
- **No rewind (T21).**
- **FLV-first media selection (S01).**
- **Pod order (P01) and stand-alone substitution (P05).**
- **Icons (I01, I03).**

## Rechecks

- **5.2.12, original harness:** the 11 changed cells plus T15 were rerun from `code/harness` (read-only, `--out <scratch folder>`). Verdicts and details match the reference in all 12.
- **5.3.0:** the same 12 cells were rerun with 5.3.0. The verdicts match the main run in all 12.
- **Load caveat and full repeat:**
  - A separate gate2 job (rmp-vast in Chromium, output in `results/iab-samples/more-clients/`, not part of this task) ran from 18:54 to 19:19 PDT. It overlapped the main 5.3.0 run (18:57 to 19:12 PDT) and the rechecks.
  - The full 108-cell 5.3.0 run was therefore repeated on an idle machine (19:30 to 19:45 PDT).
  - Result: identical verdicts in all 108 cells. Details differ only in random cachebusters, timestamps and server ports (M01, M02, M04, M11, S01).
- None of the changes is timing-dependent. Each one traces to a deterministic code-path change listed above.
- **Probe (not part of results.jsonl):**
  - What changed: the work copy only. `m_optional` was copied without its FLV `MediaFile`, and M06 to M10 were re-pointed at the copy.
  - Results on 5.3.0:
    - M06 conforms. The impression query was `ah=00:00:00.000, asi=-1, ua=-1, ps=-1, au=<webm URL>, bp=-1, ifa=-1, cua=-1`.
    - M07 deviates with `-1`.
    - M08 conforms with `00:00:05.213`.
    - M09 is n/a (`-1`).
    - M10 conforms.

## Do the paper's Shaka findings hold on 5.3.0?

Only partly. §4.7 and the conclusion describe 5.2.12 correctly. On 5.3.0:

- **No longer hold:**
  - "No macros are replaced" (M01 to M03, M11 now conform; M06 conforms in the probe). 5.3.0 now has the opposite flaw: it writes `-1` into unknown macros (M05) and into `[ERRORCODE]`, and it does not fill `[ADSERVINGID]`.
  - "Each ad's complete pixel is sent to the next ad" (P03).
  - "A volume change fires the unmute tracker" (T23).
  - "Impression and start fire before a media error" (T10, E03, E05, E06).
- **Still hold:** Wrappers ignored; no VAST-level Error for no-ad; error codes never determined (now `-1` instead of the literal macro); media timeout not reported; no progress, loaded or rewind events; percentage skipoffset not parsed; FLV-first selection; pod order and substitution; no icons.
- On the conclusion's sentence: "ignores Wrappers" still holds on 5.3.0. "Replaces no macro" and "credits each pod ad's completion to the next ad" do not.
- Counts: 6 must deviations go away (M01, M02, M03, M11, P03, plus M06 to n/a) and none are added. Should deviations: 2 fixed (T10, T23), 1 added (M05), and M07 goes to n/a.
