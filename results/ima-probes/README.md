# IMA probes: three black-box vectors

These three probes isolate one behavior each of Google's IMA HTML5 SDK 3.794.0. They are described here only by what was sent to the SDK (the VAST documents) and what the recording server logged in return. IMA is treated as a black box throughout: nothing in this folder, and nothing in the paper or its Online Resources, comes from reading the SDK's code. The probes support findings F70 (PRB3) and F72 (PRB1, PRB2) of the paper (Appendix B, Table B7); Online Resource 4 (section "Black-box evidence for each IMA finding") puts them next to the other IMA evidence.

## Files

| Path | What it is |
|---|---|
| `vectors/p_vne_wrapper_only/start.xml`, `inline.xml` | PRB1: a Wrapper and the InLine it points to |
| `vectors/p_vne_two_inline/start.xml` | PRB2: one InLine document |
| `vectors/p_click_no_clickthrough/start.xml` | PRB3: one InLine document |
| `probe-requirements.mjs` | The three probe definitions (id, vector, playback script, and the one-line test applied to the request log). A copy of the code that was appended to the harness requirement list for this run; not part of the 108-requirement catalog |
| `chromium/results.jsonl` | One line per probe run, and three control runs (W17, A03 and A05 on their catalog vectors): the request log, the events of IMA's public API, and the harness verdict |
| `chromium/matrix.tsv`, `chromium/summary.json` | The verdict table and the run summary |

In the vectors, `{{BASE}}` and `{{CASE}}` are filled in by the recording server (its address and the case id), and `[ERRORCODE]` and `[REASON]` are VAST macros, which a player is expected to fill in.

## How the probes were run

- SDK: IMA HTML5 SDK 3.794.0, served from the pinned archive of 2026-10-16 (Online Resource 4, section 2), with Google's telemetry answered locally.
- Browser: Playwright Chromium 141.0.7390.37 on Linux, one fresh browser context per probe. The page and the recording server were on HTTPS at `localhost`, as for every IMA cell.
- Run time: 2026-10-21T02:14:57Z to 02:16:06Z (the evening of 2026-10-20 in California), after the catalog runs. Case ids `ch0001` to `ch0006` belong to this run only; the same ids in other folders are different cells.
- Playback: the harness requests the tag with IMA's public `AdsLoader`, starts the ad with the public `AdsManager`, and records the events that API raises. For PRB3 it then clicks the ad with the mouse (the click element IMA draws in its own frame), waits 600 ms and stops the ad.

## How to read the request lines

Each line of the logs below is copied from the `requests` field of `chromium/results.jsonl`: the number is the milliseconds since the recording server started, then the kind of request (`doc` a VAST document, `media` a video file, `t` a tracking or error request), then the path and query. Media requests of the content video are left in. `w0` is the Wrapper, `in` the InLine ad.

The harness gives each probe a verdict word, `conforms` or `deviates`. For a probe it only says whether the request named in the probe's test was seen. It is not a conformance judgment about IMA, and PRB1 to PRB3 are not catalog requirements.

## PRB1: a Wrapper carries one unsupported verification, the InLine none

Input (`vectors/p_vne_wrapper_only`): `start.xml` is a Wrapper (`w0`) with one `Verification` in its `AdVerifications`. The verification names the vendor `wrapper.harness.test-unsupported`, offers a `JavaScriptResource` with `apiFramework="vastconf-unsupported"` (a framework no player supports), and has a `verificationNotExecuted` tracking URL `w0/vne?reason=[REASON]`. It points to `inline.xml`, an InLine with no `AdVerifications`.

Observed (case `ch0004`): IMA fetched both documents and requested the Wrapper's `verificationNotExecuted` URL with reason 2, before the ad's impression. It never requested the verification resource itself. The ad then played to the end, and the public API raised LOADED, CONTENT_PAUSE_REQUESTED, IMPRESSION, STARTED, FIRST_QUARTILE, MIDPOINT, THIRD_QUARTILE, COMPLETE, CONTENT_RESUME_REQUESTED and ALL_ADS_COMPLETED, with no AdError.

    35294 media /media/content-40s.webm?case=ch0004&ad=content range=bytes=0-
    35586 doc p_vne_wrapper_only/start.xml
    35604 doc p_vne_wrapper_only/inline.xml
    35652 t w0/vne?reason=2
    35674 media /media/ad-10s.webm?case=ch0004&ad=in range=bytes=0-
    35715 t w0/imp
    35715 t in/imp
    35716 t in/start
    35724 t w0/start
    38353 t in/firstQuartile
    38358 t w0/firstQuartile
    41005 t in/midpoint
    41008 t w0/midpoint
    43400 t in/thirdQuartile
    43403 t w0/thirdQuartile
    45813 t in/complete
    45820 t w0/complete

Harness verdict: `conforms` (`w0/vne ?reason=2`, the request the probe looks for). So a vendor listed only in a Wrapper is reported when nothing is listed in the InLine.

## PRB2: the InLine carries two unsupported verifications

Input (`vectors/p_vne_two_inline`): `start.xml` is a single InLine with two `Verification` elements, vendors `inline-a.harness.test-unsupported` and `inline-b.harness.test-unsupported`, both with `apiFramework="vastconf-unsupported"`. Each has its own `verificationNotExecuted` URL: `in/vneA?reason=[REASON]` for the first, `in/vneB?reason=[REASON]` for the second.

Observed (case `ch0005`): only the first vendor's `verificationNotExecuted` URL was requested, with reason 2. The second vendor's URL (`in/vneB`) was never requested. The ad played to the end with no AdError.

    48710 media /media/content-40s.webm?case=ch0005&ad=content range=bytes=0-
    49026 doc p_vne_two_inline/start.xml
    49083 t in/vneA?reason=2
    49108 media /media/ad-10s.webm?case=ch0005&ad=in range=bytes=0-
    49158 t in/imp
    49162 t in/start
    51781 t in/firstQuartile
    54431 t in/midpoint
    56829 t in/thirdQuartile
    59254 t in/complete

Harness verdict: `deviates` (`vneA 1 vneB 0`: the probe expects both vendors to be reported, and only one was). So IMA sends at most one `verificationNotExecuted` request per ad in this setup.

## PRB3: an InLine with ClickTracking and no ClickThrough

Input (`vectors/p_click_no_clickthrough`): `start.xml` is a single InLine whose `VideoClicks` holds a `ClickTracking` URL (`in/clicktracking`) and no `ClickThrough`. The harness plays the ad, and at 3 seconds of ad time clicks the ad with the mouse.

Observed (case `ch0006`): the harness found the click element IMA draws in its own frame and clicked it. The harness itself never pauses the ad in this script, yet the public API raised PAUSED during the click, so the click paused the ad. No click-tracking request reached the server, and no landing page was opened. After the harness stopped the ad, the API raised CONTENT_RESUME_REQUESTED and ALL_ADS_COMPLETED. The log ends at the first quartile.

    62104 media /media/content-40s.webm?case=ch0006&ad=content range=bytes=0-
    62387 doc p_click_no_clickthrough/start.xml
    62493 media /media/ad-10s.webm?case=ch0006&ad=in range=bytes=0-
    62543 t in/imp
    62544 t in/start
    65156 t in/firstQuartile

Harness verdict: `deviates` (`clicktracking 0`). So a click on an ad that has ClickTracking but no ClickThrough pauses the ad and sends no click-tracking request.

## Control runs

The first three lines of `chromium/results.jsonl` repeat three catalog cells on their normal vectors in the same run, to show that the probe setup reproduces the stored results: W17 on `w_click_wrapper_fallback` (`ch0001`), A03 on `a_verification_js` (`ch0002`) and A05 on `a_verification_404` (`ch0003`). All three deviate, with the same request logs as the stored Chromium reference run (`results/reference/first-run/chromium/results.jsonl`, cases `ch0108`, `ch0324` and `ch0332`).

## What was checked before this folder was written

The vectors, the probe definitions and the results were searched for character offsets into the SDK's files and for names of minified identifiers: none is present. One comment line in `probe-requirements.mjs` was reworded (it named the probes after the working notes they came from). The results contain the URLs of the files the SDK requested (for example the frame page `bridge3.794.0_en.html`) and the CSS class of the click element in the rendered frame, which are what the browser showed, not names from the SDK's code.
