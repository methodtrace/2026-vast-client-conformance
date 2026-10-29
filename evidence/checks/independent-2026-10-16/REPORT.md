# Independent check of the deviations (2026-10-16)

Run by a separate agent that had not seen the harness author's reasoning, from client source and standalone scripts (this folder: vastlint/ and rmpvast/, each script with its .out; the IMA excerpts are not distributed). The agent could not write files outside its scripts, so this report was written from its returned table, unedited in substance. Inputs: evidence/checks/independent-2026-10-16/inputs/node-vastlint, evidence/checks/independent-2026-10-16/inputs/browser-prelim/rmpvast-chromium, evidence/checks/independent-2026-10-16/inputs/browser-prelim/ima-chromium-run0 (IMA skip and click items from that run excluded; they were driven before real clicks).

Result: 49 items; 39 confirmed; 4 harness artifacts (W04 for rmp-vast and IMA: oracle; IMA A01, A03: vector); 2 borderline (rmp-vast T21, IMA M09); the `&amp;` claim and the "delegated" claim confirmed with corrected wording.

Paths: vl/ = code/harness/node_modules/vastlint-client/dist/; rmp/ = rmp-vast 17.2.0 src/js/ (commit 5975ead); vc/ = @dailymotion/vast-client 6.4.2 src/ (installed under rmpvast/node_modules); @N = character offset in the archived IMA bridge file bridge3.794.0_en.html (sha256 in sources/ima-html5/2026-10-16/index.tsv; not distributed).

| Client | Item | Verdict | Evidence | Spec reading ok? |
|---|---|---|---|---|
| vastlint | W03 | confirmed | default maxWrapperDepth 5 counts documents (vl/session.js:8); stops with max_depth before the InLine (:670-672); 4 Wrappers accepted | yes (§3.19.1, §2.3.5.1) |
| vastlint | W11 | confirmed | regex ad extraction (vl/resolved.js:106-148) returns ad x from truncated XML; the WASM validator flags VAST-2.0-parse-error (chainValid false) but the ad is returned and no code set | yes (§2.3.2; table 100; should) |
| vastlint | W19 | confirmed | resolve loop (vl/session.js:637-679) never reads followAdditionalWrappers | yes (§3.19) |
| vastlint | W20 | confirmed | every Ad of the last document becomes a resolved ad (vl/resolved.js:457-459) | yes (§3.19) |
| vastlint | W21 | confirmed | same path; attribute never read | yes (default false) |
| vastlint | T05, T06, T07 | confirmed | controller updateProgress fires quartiles only (vl/playback-queue.js:381-389); session.trackAd(i,'progress',{offset}) can fire one if the integrator passes the exact offset (vl/tracking.js:150-163) | yes (§3.14.1, §3.14.3) |
| vastlint | M03 | confirmed | expandTrackingUrl fills CACHEBUSTING and TIMESTAMP only (vl/tracking.js:169-181); controller start() sends the impression with no macros (playback-queue.js:297-301) | yes (required) |
| vastlint | X02 | confirmed | comments not stripped; URL becomes "<!-- ... -->http://.../in/imp<!-- ... -->", fetch fails (vl/tracking.js:72-108) | yes (§2.2, §2.3.2) |
| vastlint | T20 | confirmed | no load hook in the controller; trackAd(i,'loaded') works | yes (should) |
| vastlint | T21 | confirmed | backwards updateProgress fires nothing, no rewind method; trackAd(i,'rewind') works | yes, conditional on a rewind control (§3.14.1) |
| vastlint | M06 | confirmed | eight macros left raw; library never writes -1 or -2 (vl/tracking.js:170-173) | yes (§6.1) |
| vastlint | M07 | confirmed | AdServingId parsed (vl/resolved.js:315), not used for the macro | yes (§3.4.3) |
| vastlint | M12 | confirmed | next Wrapper URL fetched with no macro expansion (vl/session.js:659,674) | yes (macro contexts "VAST request URIs") |
| vastlint | X09 | confirmed | tracking regexes collect Impression and Tracking inside Extensions (vl/tracking.js:100-141) | plausible; should is right |
| vastlint | &amp; in VASTAdTagURI | confirmed, wider than stated | WASM inspectDocument().wrapperUri cuts ?a=1&amp;b=2&amp;c=3 to ?a=1; &#38; likewise; Impressions are decoded by JS correctly; CDATA unaffected (vastlint/adtaguri_amp.out) | yes (§2.3.2, as X03) |
| vastlint | "delegated" load errors | mostly fair; wording corrected | no Error URI and no code in any failure case; but on HTTP 404 or timeout resolve() throws and stoppedReason is null (vl/session.js:512-514, 699-702); after a mid-chain fetch failure the snapshot keeps only the root hop, so an integrator cannot reach intermediate Wrapper Error URIs (a library limitation, not delegation) | n/a |
| rmp-vast | W03 | confirmed | default maxNumRedirects 4 (rmp/helpers/utils.js:223) passed as wrapperLimit (rmp/index.js:591); vast-client increments depth before its >= check (vc/parser/vast_parser.js:362,375), so 4 accepts 3 Wrappers | yes |
| rmp-vast | W04 | harness artifact (oracle) | 302 sent to all 4 Wrappers fetched; oracle also demands it on w4, w5, never fetched | oracle wrong: §2.3.5.1 means Wrappers received |
| rmp-vast | W11 | confirmed | vast-client 6.4.2 reports 303, never 100 (vc/parser/vast_parser.js:455-466); ad correctly not used | yes |
| rmp-vast | W20, W21 | confirmed | rmp-vast passes allowMultipleAds true (rmp/index.js:593), overriding the attribute (vc/parser/vast_parser.js:389-392); vast-client defaults give s1 only | yes |
| rmp-vast | T02 | confirmed | about:blank pushed as a tracker (rmp/index.js:460-466) and sent (rmp/helpers/tracking.js:82-108) | yes (§3.4.4) |
| rmp-vast | M01 | confirmed | cache buster 8 alphanumeric characters (rmp/framework/fw.js:194-201) | yes |
| rmp-vast | M03 | confirmed | replaced only if passed to loadAds(url,{limitAdTracking}) (rmp/index.js:652-655; rmp/helpers/tracking.js:438-442) | yes |
| rmp-vast | W23 | confirmed | vast-client parses fallbackOnNoAd, never uses it, keeps s1 in remainingAds (vc/parser/vast_parser.js:304-315); rmp-vast never calls getNextAds | yes |
| rmp-vast | E06 | confirmed | only MEDIA_ERR_SRC_NOT_SUPPORTED handled, mapped to 401 (rmp/creatives/linear.js:147-176) | yes (table 405) |
| rmp-vast | T13 | confirmed | #onPlay fires resume on every play event including the first (rmp/helpers/tracking.js:176-180); not a driving effect | yes |
| rmp-vast | T23 | confirmed | any non-muted volumechange fires unmute (rmp/helpers/tracking.js:112-123); harness used the public setter | yes (should) |
| rmp-vast | T21 | confirmed, arguably n/a | no seek handler, no seek control by default (showControlsForAdPlayer false); harness seeked the element directly | conditional (§3.14.1) |
| rmp-vast | A01, A03 | confirmed for the default configuration | verificationNotExecuted handling gated by omidSupport (rmp/index.js:527; rmp/verification/omsdk.js:41-54), default false (rmp/helpers/utils.js:245); vast-client merges Wrapper verifications (vc/parser/parser_utils.js:296-299) | yes (§3.17, §2.4.2) |
| rmp-vast | M06 | confirmed | PODSEQUENCE no -1 fallback (rmp/helpers/tracking.js:359-362); IFA, CLIENTUA only via params.macros | yes (§6.1) |
| rmp-vast | M09 | confirmed | condition index!==0 \|\| index!==len-1 always true (leading comma) and whole string encoded, commas become %2C (rmp/helpers/tracking.js:338-351) | yes (§6.1) |
| rmp-vast | M11 | confirmed | error() replaces only ERRORCODE, skips replaceMacros (rmp/helpers/tracking.js:462-482) | yes |
| rmp-vast | M12 | confirmed | macros expanded only in the root tag (rmp/index.js:667); vast-client fetches Wrapper URLs raw (vc/parser/vast_parser.js:383-401) | yes |
| rmp-vast | P05 | confirmed | s1 parked in remainingAds, never fetched (rmp/index.js:364+) | yes |
| rmp-vast | I03 | confirmed | icon appended on first playing event (rmp/creatives/icons.js:186-190); offset and duration never read | yes (§3.11.1) |
| rmp-vast | R01 | confirmed (observation) | vast-client throws inside the timeout callback (vc/fetcher/url_handler.js:57-64); same in 6.5.0 | n/a |
| IMA | W03 | confirmed (medium confidence) | default numRedirects 4 (this.U=4 @205589); check uX(d) >= getNumRedirects() (@935133); w0-w4 fetched, then 302 | yes |
| IMA | W04 | harness artifact (oracle) | 302 to all 5 Wrappers received; w5 never fetched | oracle wrong |
| IMA | W20, W21 | confirmed (low confidence on mechanism) | pod plus stand-alone ads in a Wrapper target treated as an "ad buffet" (@937157), rejected by jda with code 2 "playlist response" (@932998); no ad, no Error URI | yes |
| IMA | W23 | confirmed (low/medium) | fallbackOnNoAd parsed into Zl (@686074), never read | yes |
| IMA | A01, A03 | harness artifact / unclear | IMA fetched both verif-js files but they are served as image/gif, so Chromium would not run them; IMA pings verificationNotExecuted only for non-OMID resources or a null URL (@720071); the vector does not create the not-executed case for an OMID-capable player | partly |
| IMA | M09 | behavior confirmed; deviation questionable | IMA fills one ID, correctly encoded (@440339); the macro list allows several IDs but does not require them | better graded conforms or observation |

## Missed or wrong in the harness (agent's list)

1. vastlint-client fires an Impression that sits entirely inside an XML comment (vastlint/X02b_commented_out.out); a larger §2.2 failure than X02.
2. vastlint `&amp;` truncation loses everything after the first entity, also `&#38;`; the bug is in the WASM inspectDocument(), not the JS layer.
3. vastlint: a mid-chain fetch failure throws (stoppedReason null) and drops intermediate Wrapper hops; the "delegated" wording for W07, W08, W12 must say so.
4. vastlint W11: "detects but does not act".
5. vastlint T05-T07, T20, T21 are controller gaps (session.trackAd() can fire them); M03, M06, M07 cannot be filled through the controller at all, since start() takes no macros.
6. rmp-vast plays a pod reached through a Wrapper in document order (p2, p1, s1): nested parse() defaults resolveAll true, so the pod is never sorted (vc/parser/vast_parser.js:259,304,403). No oracle checks this; P01's pod is in the root document.
7. rmp-vast reports API code 303 to the integrator while the pixels carry 302 for the same failure.
8. rmp-vast's documented maxNumRedirects (N Wrappers followed) follows N-1.
9. rmp-vast W20, W21 caused by its own allowMultipleAds option; vast-client honors the attribute by default.
10. rmp-vast never removes the icon at its duration.
11. IMA W20, W21 fire no Wrapper Error URI; the error code (2) is not a VAST code.
12. W04 oracle should require 302 only on Wrappers received.
13. A01/A03 vector serves the verification resource as a GIF: it tests a script that fails to load (reason 3), not one never executed. Serve real JS with a non-OMID apiFramework.
14. rmp-vast A01/A03 reflect default omidSupport false; rerun with OMID support on.
