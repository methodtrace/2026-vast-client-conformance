# Online Resource 4: Google IMA HTML5 SDK, operational setup

Online Resource 4 to "Do Open-Source Video Ad Clients Follow VAST 4.3? An Empirical Study of Player Conformance" (Prashant Chaudhary, October 2026). Google's IMA HTML5 SDK is proprietary and runs in browsers only, so the paper reports it as a comparison in Section 5.1.5, with a short description of how it was pinned and run. This document holds the full operational record behind that section: how the SDK was pinned and archived, the archive manifest (hashes only), how Google telemetry was stubbed (including the ad-traffic-quality hosts), where every request of the reported runs went, the HTTPS server and certificate, the Local Network Access flag, how IMA's own controls were clicked, how the skip API behaved, why Safari did not run IMA, and, for each of the eight IMA findings, the requests the server logged and the errors IMA's public API raised. IMA is reported strictly as a black box: it is graded only from its network requests and the events of its public API, and no verdict, finding or explanation in this document or the paper is taken from the SDK's code (the consistency audit of Online Resource 2, Section 2.3, cites offsets in the archived bridge file; nothing reported rests on them). Paths are relative to the root of the replication repository. The archived Google files are proprietary and are not part of this document or of the public release; this document gives their URLs and hashes, which are in sources/ima-html5/2026-10-16/README.md and index.tsv.

## 1. What was run

- SDK: Google IMA HTML5 SDK 3.794.0, loaded from its real loader URL, https://imasdk.googleapis.com/js/sdkloader/ima3.js, which the harness intercepts (code/harness/browser/ima-adapter.mjs, header comment). The adapter reads the version from `google.ima.VERSION` at run time.
- Browsers: Chromium 141, Google Chrome 156, Firefox 142 and WebKit 26. Not Safari (section 9). Source: paper Section 5.1.5 and Table 5.
- Driving: IMA's public `AdsLoader` and `AdsManager` API (init, start, pause, resume, setVolume, skip, stop) plus mouse clicks on IMA's own controls (sections 7 and 8). Rewind and icon scripts are not drivable: "IMA exposes no seek or icon control to a page" (code/harness/browser/ima-adapter.mjs), so the rewind cells and I02 (a click on the icon) are n/a. I01 and I03 need no click and are graded from the requests: the icon view request against the start request.
- Grading: from the requests the recording server logged and the events and error codes of the public API, as for every client. Nothing is read from the SDK's code (section 10).

## 2. Pinning and the archive

Why pin (sources/ima-html5/2026-10-16/README.md): `ima3.js` is a loader. It loads a versioned bridge frame and fetches a publisher configuration that carries server-assigned experiment state, so live runs can differ from one another. Replaying archived files fixes the SDK version and the configuration.

How it was pinned:

- Recording: on 2026-10-16, every file the SDK loaded while playing the vectors in Chromium 141 (Linux) was recorded once by code/harness/browser/run-browser.mjs with `VASTCONF_EXT_RECORD=1`. Each response is stored under a file named from the first 16 hex digits of its sha256 and listed in index.tsv with its URL, sha256, status and content type (code/harness/browser/run-browser.mjs, `extRoute`).
- Replay: with `VASTCONF_EXT_ARCHIVE` set to the archive folder, every request from the page to a host other than the recording server is intercepted and answered from the archive; a request not in the archive and not telemetry is aborted and logged as "blocked (not in archive)". Without the archive the IMA cells fail closed (adapter header comment). The archive was used in every run, including the Shaka 5.3.0 run, whose command sets `VASTCONF_EXT_ARCHIVE=sources/ima-html5/2026-10-16` (results/shaka-5.3.0/first-run/COMPARE.md).
- Archive key: the URL, except the publisher-config request (`securepubads.g.doubleclick.net/pagead/ima_ppub_config`), whose query carries the test page URL (a random port) and is keyed by origin and path (README; `extKey` in run-browser.mjs).
- Verification of the loader: the sha256 of `ima3.js` is ef9c29bc079af27701174c27d25d1b8f4f4333c7e2579bb471c269c0a18e63db, and "also fetched directly with curl, same hash" (README). The bridge file bridge3.794.0_en.html was downloaded again on 2026-10-20 and has the same hash as the archived copy; only the hash was compared.
- Check that the archive alone suffices: the first cells W01, E01 and T01 conform from the archive with record mode off.
- The archive also keys two OM SDK channel URLs (control and canary). Both map to the same content hash as the live omweb-v1.js URL (rows 10 and 11 against row 3 of the manifest).
- The archive is kept privately for reproduction under the IMA SDK terms and is not part of the public release; the repository contains the hashes and the recording script instead (paper Availability; README, last line: sources/ is excluded from the public export except an IMA index and README). The packaged harness builds and runs without the archive (code/package/README.md): IMA is then left out and reported as skipped.

### Archive manifest

Source: sources/ima-html5/2026-10-16/index.tsv (11 rows, 9 distinct hashes, which matches the 9 files in files/). Hashes only; no archived content is reproduced here.

| # | URL (archive key) | sha256 | Status | Content type |
|---|---|---|---|---|
| 1 | https://imasdk.googleapis.com/js/sdkloader/ima3.js | ef9c29bc079af27701174c27d25d1b8f4f4333c7e2579bb471c269c0a18e63db | 200 | text/javascript; charset=UTF-8 |
| 2 | https://securepubads.g.doubleclick.net/pagead/ima_ppub_config | 5da8ad7612cba9c31ab4d13841b592c4a2e89f4ba3a867c0b88d1c8703817451 | 200 | application/json; charset=UTF-8 |
| 3 | https://pagead2.googlesyndication.com/omsdk/releases/live/omweb-v1.js | 6edb5275ff2227bece0bf3341bdabb6f2f6d8ff1fb31d726d263eb317996f4b3 | 200 | text/javascript |
| 4 | https://s0.2mdn.net/instream/video/client.js | d0bffc7261df1454c5e05475cda7d9e6647318dc6c3936767e1252bfe8849c54 | 200 | text/javascript |
| 5 | https://imasdk.googleapis.com/js/core/bridge3.794.0_en.html | f5648dc8113229af71c1b97a81dacfd5f8db46771c78f25fe0437caef4fe1fd0 | 200 | text/html |
| 6 | https://pubads.g.doubleclick.net/pagead/managed/dict/m202610150101/ima | 1e04e0a75b28994312783dbadab17aa57e2d91549a803902e76328dcb137e3dd | 200 | text/plain; charset=UTF-8 |
| 7 | https://ep2.adtrafficquality.google/sodar/sodar2.js | 1fced7b2a471cda6a17da299daf9f375bc9755fc3f00cdf2937f87c81ecdc10e | 200 | text/javascript |
| 8 | https://ep2.adtrafficquality.google/sodar/sodar2/255/runner.html | c41f41da455986cf9d074c517db41020baf05e060802c11b45cb0a0a24f2a87e | 200 | text/html |
| 9 | https://pagead2.googlesyndication.com/bg/HEjx3T2vFPNzlAOU_OIXv8rutZFOHemhIBBYy52kE84.js | 1c48f1dd3daf14f373940394fce217bfcaeeb5914e1de9a1201058cb9da413ce | 200 | text/javascript |
| 10 | https://pagead2.googlesyndication.com/omsdk/releases/control/omweb-v1.js | 6edb5275ff2227bece0bf3341bdabb6f2f6d8ff1fb31d726d263eb317996f4b3 | 200 | text/javascript |
| 11 | https://pagead2.googlesyndication.com/omsdk/releases/canary/omweb-v1.js | 6edb5275ff2227bece0bf3341bdabb6f2f6d8ff1fb31d726d263eb317996f4b3 | 200 | text/javascript |

## 3. Telemetry stubbing

Source: sources/ima-html5/2026-10-16/README.md; code/harness/browser/run-browser.mjs (`TELEMETRY`, `extRoute`).

- Google telemetry beacons (gen_204, ping, activeview and similar) and ad-traffic-quality (Sodar) pings are answered locally with HTTP 204 and an `access-control-allow-origin: *` header. They are never sent to Google and never stored. They are therefore not in the archive (README).
- The matching rule in code/harness/browser/run-browser.mjs is:

```
/^https?:\/\/((pagead2\.googlesyndication\.com|securepubads\.g\.doubleclick\.net|googleads\.g\.doubleclick\.net)\/(pagead\/(gen_204|ping|adview|interaction|conversion)|pcs\/view|activeview)|ep\d\.adtrafficquality\.google\/(generate_204|pagead\/sodar|getconfig\/sodar))/
```

- The Sodar scripts themselves (sodar2.js, runner.html) are SDK resources, not telemetry, and stay in the archive (README; manifest rows 7 and 8).
- The same rule is copied into the Safari proxy (code/harness/browser/webdriver-proxy.mjs and run-safari.mjs), with a self-test that fails the Safari stage if a copy drifts from run-browser.mjs and that checks the Sodar pings are stubbed while sodar2.js is not (code/harness/browser/webdriver-test.mjs).
- Limit stated in the paper (Section 5.1.5: "Its results describe this one archived configuration"; Section 7, internal validity): if any IMA behavior depends on a telemetry response or on server-assigned state, the archived run cannot show it.

## 4. Network containment

Source: sources/ima-html5/2026-10-16/README.md; code/harness/browser/run-browser.mjs (`extRoute`, `TELEMETRY`); results/reference/first-run/chromium/summary.json and results.jsonl; paper Section 5.1.5 and the Ethics statement.

- In every reported run, all requests went to local servers (the HTTP and HTTPS recording servers on the test machine) or were answered from the archive of section 2 or by the local telemetry stub of section 3. No reported run sent a request to Google.
- Archive: the runs fetched the SDK's files from Google's servers only during the recording of 2026-10-16; every later run replayed it. Outside the runs, ima3.js and the bridge file were fetched directly once more only to compare hashes (section 2). A request to a host other than the recording server that is neither in the archive nor telemetry is aborted and logged as "blocked (not in archive)".
- Telemetry stub: the beacons and the ad-traffic-quality (Sodar) pings of section 3, including the hosts ep1.adtrafficquality.google and ep2.adtrafficquality.google, are answered locally with HTTP 204 and are never sent or stored. In the Chromium reference run (results/reference/first-run/chromium/results.jsonl) the one request IMA made to an ad-traffic-quality host is recorded as "telemetry stub (204, not sent)".
- The manifest in section 2 has no entry for a beacon or a ping.

## 5. HTTPS server and certificate

Source: paper Section 5.1.5; code/harness/browser/run-browser.mjs (comment before `TLS_HOST`); code/harness/browser/tls/README.md.

- Why HTTPS: IMA makes its ad request from a frame on imasdk.googleapis.com (the frame URL is in the request log of every IMA cell). On a plain-HTTP page the recording server receives no request for the tag, and IMA's public API raises AdError 1005 (VAST 900). With the page and the recording server on HTTPS the request is made. Paper Section 5.1.5 summarizes this observation. The reason was not examined in the SDK's code.
- Fix: IMA cells use a second recording server on HTTPS at `https://localhost` (`TLS_HOST = 'localhost'`), which is how a production page and ad server deliver it. All other clients keep the HTTP server, so their references are unaffected. The IMA browser contexts are created with `ignoreHTTPSErrors: true` (run-browser.mjs).
- Certificate: a test-only self-signed certificate, generated with `openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 3650 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"` (code/harness/browser/tls/README.md: "Not a secret"). Files: code/harness/browser/tls/cert.pem and key.pem. For Safari, this certificate (3650 days, no extended key usage, CA:TRUE) would fail Apple's TLS rules if it were trusted, which does not matter under `acceptInsecureCerts`.
- Consequence stated in the paper: the HTTPS transport differs from the plain-HTTP transport used for every other client (Section 7, internal validity).

## 6. Local Network Access flag

Source: code/harness/browser/run-browser.mjs (comment and constant `LNA`); paper Section 7, internal validity ("a browser security check disabled").

- Why: IMA requests the tag from its bridge frame on imasdk.googleapis.com. Chromium's Local Network Access check blocks a public origin from reaching 127.0.0.1, which a real deployment never meets (ad servers are public).
- The flag, as launched:

```
--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults
```

- Scope: it is added to the launch arguments of the `chromium` and `chrome` browser configurations only (the `LAUNCH` table in run-browser.mjs), together with `--autoplay-policy=no-user-gesture-required`. It lifts only that check; same-origin requests of the other clients are unaffected (code comment). Firefox and WebKit are launched without it.

## 7. Click mechanics

Source: code/harness/browser/run-browser.mjs (`vastconfFrameClick`, the popup handler); code/harness/browser/ima-adapter.mjs.

- IMA draws its skip button (`button.videoAdUiSkipButton`) and click element (`div.videoAdUiClickElement`) inside its own cross-origin frame, so a page script cannot click them. The harness selects them by these CSS classes in the rendered frame.
- The runner exposes a function, `vastconfFrameClick(selectors)`, that walks every frame of the page and, for each selector in order, clicks the first visible matching element with the mouse (Playwright `click`, 3000 ms timeout), returning the selector and the frame URL. This is how a user clicks.
- The click script clicks `div.videoAdUiClickElement` at 3 seconds of ad time, waits 600 ms and stops the ad. If no click element is found the cell is recorded as not drivable.
- Popups: the runner records every popup, waits for `domcontentloaded` (3000 ms), and stores its URL. If the adapter has no click-through URL, the first non-blank popup URL becomes `clickThroughUrl` (marked `clickThroughFrom: 'popup'`), so a click-through that IMA opens from its frame is visible to the oracle.
- Grading of the click-through: the W16 and W17 oracles accept either a popup window the runner captured or the ClickThrough URL the recording server saw loaded (`clickThroughUsed` in code/harness/suite/requirements.mjs). In Google Chrome 156 on macOS the runner captures no window for IMA's click-through, and the server log is what shows the InLine ClickThrough loaded.
- Result: T16, T17, T18, W16 and W18 conform for IMA; W17 (ClickThrough only in the Wrappers) deviates: after the click the ad is paused, no click-tracking request is sent and no landing page is opened. A probe, PRB3, shows the same loss of the click and of the InLine's ClickTracking when an ad has ClickTracking and no ClickThrough at all (results/ima-probes/README.md).

## 8. Skip API behavior

Source: code/harness/browser/ima-adapter.mjs. The paper does not report this observation.

- `AdsManager.skip()` has no effect in this setup, although `getAdSkippableState()` returns true: in T16 and T18 the ad plays to complete if only the API is used.
- The skip script therefore probes `getAdSkippableState()` twice (at the probe time, then at the skip time), then clicks IMA's skip button with the mouse. Only if no skip button is found does the adapter call `mgr.skip()` (adapter, skip branch).
- The ineffective `skip()` is recorded here as an API observation, not as a VAST finding. Skipping is graded from the click on IMA's own skip button.

## 9. Why Safari did not run IMA

Source: results/macos/logs/08b-safari.log and 09-compare.log; paper Section 4.3.

- Design: Safari has no request interception like Playwright's `page.route`, so the Safari runner used a local forward proxy (code/harness/browser/webdriver-proxy.mjs) that answers from the archive, answers telemetry with 204, and blocks everything else (it never fetches live, so a misroute fails closed). Before any IMA cell the runner opens a session with `acceptInsecureCerts` and a manual `proxy`, and loads a canary page on `*.vastconf.invalid`, names that cannot resolve, so the page loads only through the proxy. The canary has to load a script, a cross-origin secure-context frame, a fetch from the page, a credentialed fetch from inside the frame and the archived ima3.js from its real, HSTS-preloaded host, and has to reach the HTTPS recording server. If any of this fails, IMA is skipped in Safari only.
- Result on the author's Mac mini (Safari 27.0.1), 2026-10-17 and again 2026-10-27: "IMA in Safari: SKIPPED: IMA session refused: session not created: Could not create a session: Capability 'proxy' could not be honored." (results/macos/logs/08b-safari.log; the same text in 09-compare.log line 93.) safaridriver refused the proxy capability, so the pinned files could not be served to Safari.
- Consequence: Safari ran 756 cells (the seven open-source configurations x 108), not 864; IMA ran in the four Playwright browsers (results/macos/compare.json).
- The canary also covers a safaridriver that accepts the proxy capability and does not use it: in that case too IMA is skipped in Safari only.

## 10. Black-box evidence for each IMA finding

The paper reports eight findings for IMA (Appendix B, Table B7: F79 to F86). Each is stated here only through what can be observed from outside: the vector that was sent, the requests the recording server logged, and the events and errors of IMA's public API (the `steps` field of the stored result). This section gives no explanation of why IMA behaves as it does, because no explanation was taken from the SDK's code, and none is needed for the deviation: each is visible in the request log.

Sources: the Chromium, Firefox and WebKit reference runs on Linux (results.jsonl, fields `requests` and `result.steps`; Chromium 141, Firefox 142 and WebKit 26) and the macOS run (results/macos/browser/), and the three probes of results/ima-probes/ (README.md there has the full request logs). Case ids are those of the stored runs: `ch` Chromium, `fi` Firefox, `we` WebKit, `gc` Google Chrome. In the request column, `doc` is a VAST document the server served, `t` a tracking or error request and `media` a video file; `w0`, `w1` and so on are the Wrappers of the chain, `in` the InLine ad. Content-video requests are left out. In the API column, "no AdError" means the ad played from LOADED to ALL_ADS_COMPLETED (or to the harness's stop) without an AD_ERROR event.

| Finding | Requirement, vector, cases | Requests the server logged | Events of IMA's public API | Probes |
|---|---|---|---|---|
| F79 | W03, `w_five` (a chain of five Wrappers, then an InLine). Chromium `ch0024`, Firefox `fi0024` | `doc` start.xml, w1.xml, w2.xml, w3.xml, w4.xml (five Wrapper documents fetched); then `t` w4/err?code=302, w3/err?code=302, w2/err?code=302, w1/err?code=302, w0/err?code=302 (the Error URIs of all five). The InLine document inline.xml is never requested; no impression, no media | AD_ERROR, code 302 (IMA code 302), message "The maximum number of VAST wrappers (4) has been reached."; no ad started. Same in Firefox | none |
| F80 | W17, `w_click_wrapper_fallback` (two Wrappers that carry ClickTracking and ClickThrough, an InLine that carries neither). Chromium `ch0108`, Firefox `fi0108`; same result in the probe run's control `ch0001` | `doc` start.xml, w1.xml, inline.xml; `media` ad-10s.webm; `t` w0/imp, w1/imp, in/imp; `t` start for in, w1, w0; `t` firstQuartile for in, w1, w0. After the click, nothing: no clicktracking request for w0, w1 or in, no clickthrough request, and the stored result has no click-through URL | LOADED, CONTENT_PAUSE_REQUESTED, IMPRESSION, STARTED, FIRST_QUARTILE, PAUSED (raised during the harness's mouse click on IMA's click element, in IMA's frame), then, after the harness stops the ad, CONTENT_RESUME_REQUESTED and ALL_ADS_COMPLETED; no AdError | PRB3 (`ch0006`): an InLine with ClickTracking and no ClickThrough. Same events up to PAUSED after the click; the log ends at `t` in/firstQuartile; no `t` in/clicktracking |
| F81 | W20, `w_allow_multiple_false` (a Wrapper with allowMultipleAds="false" whose target holds a pod and a stand-alone ad): Chromium `ch0132`, Firefox `fi0132`. W21, `w_allow_multiple_default` (the same without the attribute): Chromium `ch0140`, Firefox `fi0140`. | `doc` start.xml, pod.xml; no `t` request at all (no Error URI, no impression), no ad media | AD_ERROR, code 2 (IMA code 2), message "Ad source cannot contain playlist response."; no ad started. Same in Firefox | none |
| F82 | W23, `w_fallback_noad` (a Wrapper with fallbackOnNoAd="true" whose target holds no ad, plus a second, stand-alone ad s1 in the same document): Chromium `ch0252`, Firefox `fi0252` | `doc` start.xml, noad.xml; `t` noad/err?code=303, w0/err?code=303; no s1/imp, no ad media | AD_ERROR, code 900 (IMA code 1009), message "The response does not contain any valid ads."; no ad started. Same in Firefox | none |
| F83 | A03, `a_verification_js` (a Wrapper and an InLine that each carry one unsupported verification with a verificationNotExecuted URL). Chromium `ch0324`, Firefox `fi0324`; same result in the probe run's control `ch0002` | `doc` start.xml, inline.xml; `t` in/vne?reason=2 (the InLine's report, with reason 2); w0/vne is never requested. The ad then plays to the end (impression, start, quartiles, complete for in and w0). | no AdError; LOADED to COMPLETE, then CONTENT_RESUME_REQUESTED and ALL_ADS_COMPLETED | PRB1 (`ch0004`): the Wrapper carries one unsupported verification, the InLine none: `t` w0/vne?reason=2 is requested. PRB2 (`ch0005`): the InLine carries two: `t` in/vneA?reason=2 is requested, in/vneB never. In A03 both levels carry a vendor and only the InLine's is reported; the probes show the Wrapper's is reported when the InLine has none, and one report per ad |
| F84 | A05, `a_verification_404` (an InLine whose OMID verification resource answers 404). Chromium `ch0332`, Firefox `fi0332`; control `ch0003` | `js` in/verif-js?status=404 [404] (the resource was fetched and the server answered 404); the ad plays to the end (imp, start, quartiles, complete for in); in/vne is never requested | no AdError; LOADED to COMPLETE, then CONTENT_RESUME_REQUESTED and ALL_ADS_COMPLETED | none |
| F85 | I01, `i_icon` (an InLine with one icon, no offset). Chromium `ch0396`, Firefox `fi0396`, WebKit `we0396`; macOS: the same vector in Chromium, Chrome, Firefox and WebKit | Chromium: `doc` start.xml; `t` in/icon-view at 2927020 ms, in/icon-img, in/imp, in/start at 2927142 ms (view 122 ms before start). Firefox: in/icon-view 88 ms before in/start. WebKit (Linux): in/icon-view 367 ms before in/start. Repeated runs, 20 per Linux engine, the icon cell alone: the view always precedes start, by 36 to 68 ms in Chromium (beyond the 50 ms tolerance in 6 of 20), 54 to 111 ms in Firefox and 165 to 237 ms in WebKit (beyond it in all). macOS run: the view precedes start by 9 to 27 ms (within the tolerance); 10 repeats per browser on macOS: 11 to 12 ms in Chromium, 10 to 13 ms in Chrome and 13 to 50 ms in Firefox (never beyond), 51 to 58 ms in WebKit (beyond in all 10) | no AdError; LOADED to COMPLETE | none. For comparison, I03 (`i_icon_timed`, an icon with a 1 s offset) conforms in all three Linux engines: the view is requested 1297, 1153 and 929 ms after start |
| F86 | W11, `w_malformed` (a Wrapper whose target is not well-formed XML). Firefox `fi0072` (the finding). For comparison: Chromium `ch0072`, WebKit `we0072` (results/webkit-second-machine/results.jsonl), Google Chrome `gc0289` (results/macos/browser/chrome/results.jsonl) | Firefox: `doc` start.xml, bad.xml; `t` w0/err?code=303. Chromium, WebKit, Chrome: `doc` start.xml, bad.xml; `t` w0/err?code=100 | Firefox: AD_ERROR, code 303 (IMA code 303), message "No Ads VAST response after one or more Wrappers". Chromium, WebKit, Chrome: AD_ERROR, code 100 (IMA code 100), message "VAST response was malformed and could not be parsed." | none |

Reading the table:

- Each deviation can be seen without any explanation. F79: a chain of five is rejected, which the request log and the error message show. F80: the log has no click-tracking request after a click, although both Wrappers listed a ClickTracking URI (and a ClickThrough); the InLine listed neither. F81: the log has no Error URI for W20 and W21. F82: no request for the second ad in W23. F83: the report for the Wrapper's vendor is absent in A03. F84: the report for the 404 resource is absent in A05. F85: in every run the icon view request arrives before the start request; the gap exceeds the tolerance in the Linux reference runs and in repeated runs in Linux Chromium (6 of 20), Firefox and WebKit (20 of 20 each) and macOS WebKit (10 of 10). F86: Firefox's code is 303 where the other three browsers give 100.
- The probes narrow F80 and F83 by changing the input, not by reading the SDK. PRB3 uses a single InLine with a ClickTracking and no ClickThrough: the click still pauses the ad and sends no click-tracking request, so the loss of the click tracking is seen without any Wrapper in the chain. PRB1 and PRB2 show that a vendor listed only in the Wrapper is reported and that of two vendors in the InLine only the first is, so IMA sends at most one verificationNotExecuted request per ad in this setup. These are observations about this archived configuration (section 3, last bullet), not statements about how IMA is built.
- Two observations have no catalog requirement: the one-report-per-ad limit (PRB2) and the loss of the InLine's ClickTracking when there is no ClickThrough (PRB3).
- The W11 difference between browsers is a difference in what IMA reported in each browser; the stored results do not show whether it comes from the browser's XML parser or from IMA, and the paper does not claim either.
