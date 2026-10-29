# Online Resource 3: Shaka Player 5.3.0 compared with 5.2.12

Online Resource 3 to "Do Open-Source Video Ad Clients Follow VAST 4.3? An Empirical Study of Player Conformance" (Prashant Chaudhary, October 2026). Shaka Player 5.3.0 was published on 2026-10-16, the day of the reference runs, and rewrites the library's ad tracking. The paper's tables report Shaka Player 5.2.12, the release graded in every engine and on both platforms; Section 5.1.3 adds a short passage on 5.3.0. This document is the full record of the 5.3.0 run: the version tested, how it was run, the verdict totals, every verdict change with its cause in the 5.3.0 source, the verdicts that stayed the same but changed on the wire, the rechecks, and which findings of the paper still hold. Paths are relative to the root of the replication repository. The verdicts and counts below are computed from results/shaka-5.3.0/results.jsonl (the 5.3.0 run) against results/reference/chromium/results.jsonl (5.2.12); the causes in the 5.3.0 source and the version record are copied from results/shaka-5.3.0/first-run/COMPARE.md unless another file is named. results/shaka-5.3.0/README.md, summary.json and matrix.tsv describe the run.

## 1. Version tested and how it was run

- Version: shaka-player 5.3.0, installed with `npm i --save-exact shaka-player@5.3.0`; the player reports `v5.3.0` at runtime (`clientVersion` in every row). Source: COMPARE.md, "Version tested".
- npm registry publication: 2026-10-16T13:16:39Z (COMPARE.md; summary.json field `npmPublished` gives 2026-10-16T13:16:39.051Z). Integrity `sha512-bZ5MiKQcs+CBtAHFGUqHW4Q+2U3oXGVmXY+gdrSOoVmHzcilvNp+jEsqhd3/4cGhL4j4+Z66Jisq42U4jOfY1g==`, gitHead `f5fd3ce3` (summary.json gives the full hash f5fd3ce3d29d4674777280994d375802e5b7ede5).
- Other releases from the same period (COMPARE.md): 5.2.13 (2026-10-09) and 5.2.14 (2026-10-16) have no `Ads` entries; 5.3.1 (2026-10-19) has one Text fix and no ad changes, per the v5.3.x CHANGELOG. Neither 5.2.13, 5.2.14 nor 5.3.1 was run.
- Run: one configuration (`shaka`), one engine (Playwright Chromium 141.0.7390.37), 108 requirements = 108 cells, 70 client runs (results/shaka-5.3.0/summary.json, fields `cells` 108 and `runs` 70). summary.json records the start as 2026-10-22T03:05:09.525Z and the finish as 2026-10-22T03:20:44.924Z (UTC; 2026-10-21 in Pacific time), under `nice -n 10`. Host: Linux x64, 2 CPUs.
- Reference for the comparison: results/reference/chromium/results.jsonl, configuration `shaka`, Shaka 5.2.12. The second Chromium run, results/reference/chromium-run2, matches it in every cell (results/reference/README.md).
- Harness: a copy of code/harness in which only `shaka-player` changed from 5.2.12 to 5.3.0 in package.json, package-lock.json and node_modules, followed by `node browser/build-browser.mjs`. Command: `node browser/run-browser.mjs --browsers chromium --clients shaka`, with the IMA archive variable set as in every browser run (results/shaka-5.3.0/README.md).
- The adapter, code/harness/browser/shaka-adapter.mjs, is unchanged, so there is no adapter diff. Everything the adapter uses is still exported in 5.3.0 (`getAdManager`, `setContainers`, `addAdUrlInterstitial`, the `ad-*` event names, `getAdId`, `getMediaUrl`, `pause`, `play`, `setMuted`, `setVolume`, `skip`, `canSkipNow` and `ad.video`). The externs diff for `externs/shaka/ads.js` adds optional `AdInterstitial` fields and removes the internal `AdTrackingInfo` typedef; neither affects the adapter. A 4-cell smoke test (T01, T11, T16, T21) drove the user actions with ad-time positions as on 5.2.12: pause at 3.05 s, skip probes at 1.52 s and 6.01 s (COMPARE.md).
- What 5.3.0 changed in the library: it rewrites the `lib/ads` measurement. New files `interstitial_ad_session.js` (an ad-time clock and tracking state for each ad, plus VAST macro expansion) and `interstitial_tracker.js` replace `Utils.fireTrackingEvents` keyed on `lastPlayedAd_`. The 5.3.0 CHANGELOG does not name the macro expansion or the session tracking. Its other ad fixes (#10566, #10546, #10521, #10469, #10447, #10412) were already backported to 5.2.12 (5.2.5 to 5.2.11). Every cause below was checked in the 5.3.0 `lib/ads` source shipped in the npm package (COMPARE.md).

## 2. Verdict totals (108 cells)

Computed from the two results.jsonl files; strengths from code/harness/suite/requirements.mjs.

| Release | conforms | deviates | n/a |
|---|---|---|---|
| 5.2.12 | 35 | 29 (21 must, 8 should) | 44 |
| 5.3.0 | 44 | 22 (15 must, 7 should) | 42 |

11 verdict changes (7 must, 4 should); 97 cells unchanged. By direction: eight cells go from deviates to conforms (M01, M02, M03, M06, M11, P03 must; T10, T23 should), two from n/a to conforms (M04 must, M08 should), and one from conforms to deviates (M05 should). No cell goes to n/a and none from conforms to n/a. That gives 29 - 8 + 1 = 22 deviating cells, 35 + 8 + 2 - 1 = 44 conforming cells and 44 - 2 = 42 n/a cells, as in the totals. These are the totals of paper Table 5.

## 3. Every verdict change, with its cause

Line numbers refer to `node_modules/shaka-player/lib/ads/` in 5.3.0: S = `interstitial_ad_session.js`, M = `interstitial_ad_manager.js` (COMPARE.md). Details are the oracle's text in the two runs.

| Req | Strength | 5.2.12 | 5.3.0 | Cause | Class |
|---|---|---|---|---|---|
| M01 | must | deviates: `"[CACHEBUSTING]" (14 chars)` | conforms: `67359395` | Tracking URIs pass through `session.expandUri()` (M 716, S 274-299). `CACHEBUSTING` is 8 random digits with leading zeros kept (S 283-285). | fix |
| M02 | must | deviates: `"[TIMESTAMP]"` | conforms: `2026-10-22T03:08:59.600Z` | `TIMESTAMP` = `new Date().toISOString()` (S 287) | fix |
| M03 | must | deviates: `"[LIMITADTRACKING]"` | conforms: `-1 (unknown/withheld; outside the 0/1 definition)` | `LIMITADTRACKING` is not in the macro table, so the fallback writes `-1` (S 298). This conforms only under the harness's lenient -1/-2 acceptance. It is not a 0/1 value. | fix (lenient) |
| M04 | must | n/a: `TIMESTAMP left unreplaced (see M02)` | conforms: `2026-10-22T03%3A08%3A59.600Z` | Values are passed through `encodeURIComponent` (S 297-298). The cell becomes gradable once M02 conforms. | fix |
| M05 | should | conforms: `"[NOTAREALMACRO]"` | deviates: `replaced with -1` | Every bracketed token that is not in the table is replaced with `-1`: the pattern is `/\[([A-Z0-9_]+)\]\|%5B...%5D/gi` with `\|\| '-1'` (S 296-298). Section 6.1 of the specification says to leave unknown macros alone. The same fallback writes `-1` for `[ERRORCODE]` (see E03, E05, E06 in section 4). | regression |
| M06 | must | deviates: `not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ...` | conforms: `all replaced` | The optional macros of the vector are filled or set to `-1` by the same macro table and fallback (S 284-298). | fix |
| M08 | should | n/a: `left as macro (see M06)` | conforms: `00:00:05.235` | `ADPLAYHEAD` is filled from the session's ad-time clock (S 274-299). The cell becomes gradable once M06 conforms. | fix |
| M11 | must | deviates: `cb "[CACHEBUSTING]", ts "[TIMESTAMP]"` | conforms: `cb 21397432, ts 2026-10-22T03:15:22.608Z` | Error URIs go through the same `sendBeacon` and `expandUri` path (M 716-722) | fix |
| P03 | must | deviates: `misattributed: p1 imp 1 complete 0; p2 imp 1 complete 1; p3 imp 1 complete 2` | conforms: `one impression and one complete per ad (3 ads)` | `complete()` sends `AD_COMPLETE` for its own `interstitial` before `basicTask()` sets up the next ad (M 1455-1466). Each ad also gets its own session and tracker (M 710-725; the header of S reads: "a callback from an earlier ad cannot track the next ad in a pod"). In 5.2.12, complete fired after the next ad became `lastPlayedAd_`. On the wire, each pod ad gets its own complete. | fix |
| T10 | should | deviates: `impression requested for an ad that never played` | conforms: `no impression` | Impression, start and loaded beacons are held back until the session sees real playback: `readyState >= 2` and a timeupdate (S 149-167). `notify()` drops anything other than loaded or error before that point (S 225). In 5.2.12 they fired at ad setup, before media load. | fix |
| T23 | should | deviates: `unmute fired 2 times` | conforms: `unmute once` | A `volumechange` that does not change the muted state is tagged `muteChanged=false` (M 1581-1587) and not tracked (M 2335-2337, S 235-239). In 5.2.12, every non-muted volumechange fired unmute (5.2.12 `ad_utils.js` 161). | fix |

Counting check: the 10 fixes are M01, M02, M03, M04, M06, M08, M11, P03, T10 and T23 (7 must: M01, M02, M03, M04, M06, M11, P03; 3 should: M08, T10, T23). The regression is M05 (should).

## 4. Same verdict, different wire

Source: COMPARE.md, "Same verdict, different wire".

- E03, E05, E06 still deviate. The detail changes from `[ERRORCODE]` to `-1`: in 5.3.0 the Error URIs are requested with `code=-1` instead of the literal macro, because `ERRORCODE` is not in the table. Impression and start no longer fire before the error, because of the T10 mechanism.
- S01 (deviates) and M10 (n/a): impression and start are gone for the failed FLV ad, and the Error URI carries `code=-1`; M10's detail becomes `impression not fired`.
- M07 still deviates. The detail changes from `"[ADSERVINGID]"` to `"-1"`: `ADSERVINGID` is not in the macro table (S 284-295).
- M09 stays n/a. The detail changes from `left as macro (see M06)` to `not provided (-1)`: `UNIVERSALADID` is not provided.
- E07 still deviates: the Error URI is never requested. In 5.3.0, impression and start fire about 30 s late, when the delayed media arrives, followed by first quartile, midpoint and third quartile. Before that, the ad slot was announced and nothing was tracked. A media timeout is still not reported as 402.
- T15 still conforms. The detail changes from `2 time(s)` to `1 time(s)` (T23 fix). T11 to T14 and T20 lose the same extra unmute request.
- P01, P02, P05, P06: verdicts and details are unchanged. The complete requests move to the right ad (P03 fix). In `p_pod_fail`, the failed p2 no longer gets imp, start or complete before its Error URI.
- Content-media byte ranges differ in about 20 n/a cells (buffering noise). There are no tracking differences there.

## 5. Findings that did not change in 5.3.0

Source: COMPARE.md, "Unchanged findings (5.3.0 source)". All of these still hold, each with the same verdict as 5.2.12; the 97 unchanged cells include them (W01, W02, E01, E02, E07, T05 to T07, T18, T20, T21, S01, P01, P05, I01, I03, A01).

- Wrappers ignored (W01, W02): `vast_interstitial_parser.js` line 31 still skips ads without InLine.
- No VAST-level Error for a no-ad response (E01, E02).
- Media timeout not reported (E07).
- Progress, offset and percentage events (T05 to T07): `Utils.createTracking()` (`ad_utils.js` line 23) still has no `progress` entry. The new tracker's offset support (`InterstitialTracker.onProgress`) is fed only by SVTA, not by VAST.
- No loaded tracking (T20): `loaded` is not a `createTracking` key.
- Percentage skipoffset (T18).
- No rewind (T21).
- FLV-first media selection (S01).
- Pod order (P01) and stand-alone substitution (P05).
- Icons (I01, I03).
- No AdVerifications handling (A01): the VAST parser still reads no AdVerifications (`vast_interstitial_parser.js` 29-45; `ad_utils.js` `createTrackingFromInline`, line 120, reads Error and Impression only), so no verificationNotExecuted request is sent.

## 6. Rechecks

Source: COMPARE.md, "Rechecks", for the independent run (results/shaka-5.3.0/first-run), and results/shaka-5.3.0/README.md.

- An independent run of 5.3.0 with the same adapter, regraded with the current oracles, gives the same verdict as this run in every cell outside the nine requirements whose vectors differ between the two runs (A01, A02, A04, R04, R05, M06 to M09).
- In the independent run, the full 108-cell run was repeated on an idle machine with identical verdicts; details differed only in random cachebusters, timestamps and server ports (M01, M02, M04, M11, S01).
- None of the changes is timing-dependent. Each one traces to a deterministic code-path change listed in section 3.

## 7. Which findings of the paper hold on 5.3.0

Source: COMPARE.md, "Do the paper's Shaka findings hold on 5.3.0?". Section 5.1.3 and the conclusion (Section 8) describe 5.2.12 correctly. On 5.3.0:

- No longer hold: "No macros are replaced" (M01 to M03, M06 and M11 conform). 5.3.0 has the opposite flaw: it writes `-1` into unknown macros (M05) and into `[ERRORCODE]`, and it does not fill `[ADSERVINGID]`. "Each ad's complete pixel is sent to the next ad" (P03). "A volume change fires the unmute tracker" (T23). "Impression and start fire before a media error" (T10, E03, E05, E06).
- Still hold: Wrappers ignored; no VAST-level Error for no-ad; error codes never determined (`-1` instead of the literal macro); media timeout not reported; no progress, loaded or rewind events; percentage skipoffset not parsed; FLV-first selection; pod order and substitution; no icons; no AdVerifications handling.
- On the paper's conclusion: "ignores Wrappers" still holds on 5.3.0; "replaces no macro" and "credits each pod ad's completion to the next ad" do not.
- Counts: 6 must deviations go away (M01, M02, M03, M06, M11, P03) and none are added, so must-level deviations fall from 21 to 15. Should deviations: 2 fixed (T10, T23) and 1 added (M05), from 8 to 7; M07 still deviates.

## 8. How the paper treats the run

- Paper Section 5.1.3 keeps 5.2.12 as the graded release (every engine, both platforms) and adds the 5.3.0 passage; Table 5 has a 5.3.0 row; Section 5.1.3 and the caption of Table 5 note that 5.3.0 was released on the day of the reference runs.
- The 5.3.0 cells were not run in Firefox, WebKit, Chrome or Safari, and not on macOS.
