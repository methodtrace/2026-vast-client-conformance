# Full view by duty group

Generated from the reference matrices of the Node.js layer and of Chromium (the references of the paper; Chromium 141 on Linux). For the open-source clients, verdicts in other engines differ only in the cells of Table 6 of the paper; IMA's engine and platform differences are in Section 5.1.5 and Table 6. "Detail" is the oracle's or the grader's own text for a deviating or n/a cell, as stored in results.jsonl. Do not edit by hand.

Each table gives one duty group: one row per requirement, one column per configuration (N = Node.js, C = Chromium). Below each table, the detail of every deviating cell.

## Wrapper resolution (9 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W01 | must | ok | ok | ok | ok | ok | ok | ok | ok | ok | DEV | ok | ok | ok |
| W02 | must | ok | ok | DEV | ok | ok | ok | ok | DEV | ok | DEV | ok | ok | ok |
| W03 | must | ok | ok | ok | ok | DEV | ok | ok | ok | ok | n/a | DEV | DEV | DEV |
| W05 | should | ok | ok | ok | ok | ok | ok | ok | ok | ok | n/a | ok | ok | ok |
| W19 | should | ok | ok | DEV | DEV | DEV | ok | ok | DEV | DEV | n/a | ok | ok | ok |
| W20 | should | ok | DEV | del | del | DEV | ok | DEV | del | del | n/a | DEV | DEV | DEV |
| W21 | should | ok | DEV | del | del | DEV | ok | DEV | del | del | n/a | DEV | DEV | DEV |
| W22 | may | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| W23 | should | del | ok | del | del | DEV | del | ok | del | del | n/a | DEV | DEV | DEV |

Requirements: W01 Follows a Wrapper to its InLine ad.; W02 Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional).; W03 Accepts a chain of five Wrappers before the InLine ad (players are required to accept five).; W05 Terminates a Wrapper that points to itself (stops requesting it).; W19 With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed.; W20 With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped).; W21 Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used.; W22 Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205.; W23 With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used.

Deviating cells (29):

- W01 must, Shaka Player (C): fetched start.xml; resolved 0
- W02 must, iab-vast-loader, defaults (N): fetched start.xml; resolved 0; no ad and no error
- W02 must, iab-vast-loader, defaults (C): fetched start.xml; resolved 0; no ad and no error
- W02 must, Shaka Player (C): fetched start.xml; resolved 0; no ad and no error
- W03 must, vastlint-client (N): stopped after 5 documents; codes none
- W03 must, rmp-vast, defaults (C): stopped after 4 documents; codes 302
- W03 must, rmp-vast, omidSupport (C): stopped after 4 documents; codes 302
- W03 must, Google IMA (C): stopped after 5 documents; codes 302
- W19 should, iab-vast-loader, defaults (N): followed the second wrapper to the InLine
- W19 should, iab-vast-loader, noSingleAdPods (N): followed the second wrapper to the InLine
- W19 should, vastlint-client (N): followed the second wrapper to the InLine
- W19 should, iab-vast-loader, defaults (C): followed the second wrapper to the InLine
- W19 should, iab-vast-loader, noSingleAdPods (C): followed the second wrapper to the InLine
- W20 should, video-ad-sdk (N): resolved none
- W20 should, vastlint-client (N): resolved p1,p2,s1
- W20 should, video-ad-sdk (C): resolved none
- W20 should, rmp-vast, defaults (C): resolved p2,p1,s1
- W20 should, rmp-vast, omidSupport (C): resolved p2,p1,s1
- W20 should, Google IMA (C): resolved none
- W21 should, video-ad-sdk (N): resolved p2
- W21 should, vastlint-client (N): resolved p1,p2,s1
- W21 should, video-ad-sdk (C): resolved p2
- W21 should, rmp-vast, defaults (C): resolved p2,p1,s1
- W21 should, rmp-vast, omidSupport (C): resolved p2,p1,s1
- W21 should, Google IMA (C): resolved none
- W23 should, vastlint-client (N): resolved s1; fetched start.xml; error none
- W23 should, rmp-vast, defaults (C): resolved none; fetched start.xml,noad.xml; error aderror 303: No VAST response after one or more Wrappers.
- W23 should, rmp-vast, omidSupport (C): resolved none; fetched start.xml,noad.xml; error aderror 303: No VAST response after one or more Wrappers.
- W23 should, Google IMA (C): resolved none; fetched start.xml,noad.xml; error AD_ERROR 900: The response does not contain any valid ads.

## Error reporting (18 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W04 | should | ok | ok | ok | ok | del | ok | ok | ok | ok | n/a | ok | ok | ok |
| W06 | should | ok | ok | ok | ok | del | ok | ok | ok | ok | n/a | ok | ok | ok |
| W07 | must | ok | DEV | ok | ok | del | ok | DEV | ok | ok | n/a | ok | ok | ok |
| W08 | must | ok | ok | ok | ok | del | ok | ok | ok | ok | n/a | ok | ok | ok |
| W09 | should | ok | ok | ok | ok | del | ok | ok | ok | ok | n/a | ok | ok | ok |
| W10 | must | ok | ok | del | del | del | ok | ok | del | del | n/a | ok | ok | ok |
| W11 | must | DEV | ok | DEV | DEV | DEV | DEV | DEV | ok | ok | n/a | DEV | DEV | ok |
| W12 | must | ok | ok | del | del | del | ok | ok | del | del | n/a | ok | ok | ok |
| W13 | must | ok | n/a | del | del | ok | ok | n/a | del | del | n/a | ok | ok | ok |
| E01 | must | ok | ok | del | del | del | ok | ok | del | del | DEV | ok | ok | ok |
| E02 | must | ok | ok | del | del | del | ok | ok | del | del | DEV | ok | ok | ok |
| E03 | must | del | DEV | del | del | del | del | DEV | del | del | DEV | ok | ok | ok |
| E04 | must | ok | ok | del | del | del | ok | ok | del | del | n/a | ok | ok | ok |
| E05 | must | n/a | n/a | n/a | n/a | n/a | del | DEV | del | del | DEV | ok | ok | ok |
| E06 | must | n/a | n/a | n/a | n/a | n/a | del | DEV | del | del | DEV | DEV | DEV | ok |
| E07 | must | n/a | n/a | n/a | n/a | n/a | del | ok | del | del | DEV | ok | ok | ok |
| E08 | should | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| E09 | must | del | DEV | del | del | del | del | DEV | del | del | ok | ok | ok | ok |

Requirements: W04 With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received).; W06 Reports 302 (wrapper limit) for a self-referencing Wrapper loop.; W07 When the VASTAdTagURI is unavailable (HTTP 404), determines error 301.; W08 When the VASTAdTagURI times out, determines error 301.; W09 When a Wrapper leads to a no-ad response and the player determines a code, the code is 303.; W10 Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]).; W11 When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it).; W12 Requests the Wrapper Error URI when its VASTAdTagURI fails.; W13 An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here).; E01 For a no-ad response, requests the VAST-level Error URI.; E02 Requests every VAST-level Error URI when several are given.; E03 With no supported MediaFile, requests every InLine Error URI with 403.; E04 Replaces [ERRORCODE] in Error URIs with a numeric code.; E05 When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found).; E06 When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405.; E07 When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout).; E08 Does not request the Error URI when the ad plays without a problem.; E09 Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity).

Deviating cells (24):

- W07 must, video-ad-sdk (N): code 502
- W07 must, video-ad-sdk (C): code 502
- W11 must, vast-client-js (N): code 301
- W11 must, iab-vast-loader, defaults (N): accepted an ad from non-well-formed XML (x)
- W11 must, iab-vast-loader, noSingleAdPods (N): accepted an ad from non-well-formed XML (x)
- W11 must, vastlint-client (N): accepted an ad from non-well-formed XML (x)
- W11 must, vast-client-js (C): code 303
- W11 must, video-ad-sdk (C): accepted an ad from non-well-formed XML (x)
- W11 must, rmp-vast, defaults (C): code 303
- W11 must, rmp-vast, omidSupport (C): code 303
- E01 must, Shaka Player (C): not requested
- E02 must, Shaka Player (C): err1 0, err2 0
- E03 must, video-ad-sdk (N): err1 401; err2 401
- E03 must, video-ad-sdk (C): err1 401; err2 401
- E03 must, Shaka Player (C): err1 [ERRORCODE]; err2 [ERRORCODE]
- E05 must, video-ad-sdk (C): code undefined,402
- E05 must, Shaka Player (C): code [ERRORCODE]
- E06 must, video-ad-sdk (C): code undefined,402
- E06 must, Shaka Player (C): code [ERRORCODE]
- E06 must, rmp-vast, defaults (C): code 401
- E06 must, rmp-vast, omidSupport (C): code 401
- E07 must, Shaka Player (C): Error URI not requested
- E09 must, video-ad-sdk (N): code 401
- E09 must, video-ad-sdk (C): code 401

## Impressions and tracking (27 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W14 | must | ok | ok | del | del | ok | ok | ok | del | del | n/a | ok | ok | ok |
| W15 | must | ok | ok | del | del | ok | ok | ok | del | del | n/a | ok | ok | ok |
| W16 | must | ok | ok | del | del | ok | ok | ok | del | del | n/a | ok | ok | ok |
| W17 | must | ok | DEV | del | del | ok | ok | DEV | del | del | n/a | ok | ok | DEV |
| W18 | must | ok | ok | del | del | ok | ok | ok | del | del | n/a | ok | ok | ok |
| T01 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| T02 | should | ok | DEV | del | del | ok | ok | DEV | del | del | ok | DEV | DEV | ok |
| T03 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| T04 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| T05 | must | ok | ok | del | del | DEV | ok | ok | del | del | DEV | ok | ok | ok |
| T06 | must | ok | ok | del | del | DEV | ok | ok | del | del | DEV | ok | ok | ok |
| T07 | must | ok | DEV | del | del | DEV | ok | DEV | del | del | DEV | ok | ok | ok |
| T08 | must | ok | ok | del | del | ok | ok | ok | del | del | n/a | ok | ok | ok |
| T10 | should | del | ok | del | del | del | del | ok | del | del | DEV | ok | ok | ok |
| T11 | should | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| T12 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| T13 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | DEV | DEV | ok |
| T14 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| T15 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| T23 | should | del | ok | del | del | ok | del | ok | del | del | DEV | DEV | DEV | ok |
| T20 | should | ok | DEV | del | del | DEV | ok | DEV | del | del | DEV | ok | ok | ok |
| T16 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| T17 | should | ok | ok | del | del | del | ok | ok | del | del | ok | ok | ok | ok |
| T18 | should | ok | DEV | del | del | del | ok | DEV | del | del | DEV | ok | ok | ok |
| T19 | should | ok | ok | del | del | n/a | ok | ok | del | del | n/a | ok | ok | ok |
| T21 | must | ok | ok | del | del | DEV | ok | ok | del | del | DEV | DEV | DEV | n/a |
| T22 | should | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | n/a |

Requirements: W14 At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it.; W15 Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones.; W16 When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used.; W17 When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used.; W18 On a click, requests the ClickTracking URIs of the InLine and of every Wrapper.; T01 Requests every Impression URI of the ad.; T02 Does not dispatch an Impression whose URI is about:blank.; T03 Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order.; T04 Fires every Tracking element for the same event (two start trackers for two parties).; T05 Fires a progress tracker with an HH:MM:SS offset.; T06 Fires a progress tracker with an HH:MM:SS.mmm offset.; T07 Fires progress trackers with percentage offsets (10% and 80%).; T08 Stopping at 60% fires midpoint but neither thirdQuartile nor complete.; T10 Does not request the Impression of an ad whose media never plays (no supported MediaFile).; T11 Requests the Impression exactly once across pause, resume, mute and unmute.; T12 Fires the pause tracker once when the user pauses.; T13 Fires the resume tracker once when the user resumes.; T14 Fires the mute tracker once when the user mutes.; T15 Fires the unmute tracker when the user unmutes.; T23 A volume change that is not an unmute (0.5 while unmuted) does not fire unmute.; T20 Fires the loaded tracker once when the media is ready to play.; T16 Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type).; T17 The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03).; T18 A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip.; T19 Progress offsets passed before the skip (2 s and 5 s) are fired.; T21 Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%).; T22 After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again.

Deviating cells (32):

- W17 must, video-ad-sdk (N): no click-through used
- W17 must, video-ad-sdk (C): no click-through used
- W17 must, Google IMA (C): no click-through used
- T02 should, video-ad-sdk (N): dispatched about:blank
- T02 should, video-ad-sdk (C): dispatched about:blank
- T02 should, rmp-vast, defaults (C): dispatched about:blank
- T02 should, rmp-vast, omidSupport (C): dispatched about:blank
- T05 must, vastlint-client (N): fired 0 times
- T05 must, Shaka Player (C): fired 0 times
- T06 must, vastlint-client (N): fired 0 times
- T06 must, Shaka Player (C): fired 0 times
- T07 must, video-ad-sdk (N): 10%: 0, 80%: 0
- T07 must, vastlint-client (N): 10%: 0, 80%: 0
- T07 must, video-ad-sdk (C): 10%: 0, 80%: 0
- T07 must, Shaka Player (C): 10%: 0, 80%: 0
- T10 should, Shaka Player (C): impression requested for an ad that never played
- T13 must, rmp-vast, defaults (C): 2 times
- T13 must, rmp-vast, omidSupport (C): 2 times
- T23 should, Shaka Player (C): unmute fired 2 times
- T23 should, rmp-vast, defaults (C): unmute fired 2 times
- T23 should, rmp-vast, omidSupport (C): unmute fired 2 times
- T20 should, video-ad-sdk (N): 0 times
- T20 should, vastlint-client (N): 0 times
- T20 should, video-ad-sdk (C): 0 times
- T20 should, Shaka Player (C): 0 times
- T18 should, video-ad-sdk (N): before false, after false, skip 0
- T18 should, video-ad-sdk (C): before false, after false, skip 0
- T18 should, Shaka Player (C): before false, after false, skip 0
- T21 must, vastlint-client (N): not fired
- T21 must, Shaka Player (C): not fired
- T21 must, rmp-vast, defaults (C): not fired
- T21 must, rmp-vast, omidSupport (C): not fired

## Macros (12 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M01 | must | ok | DEV | del | del | ok | ok | DEV | del | del | DEV | DEV | DEV | ok |
| M02 | must | ok | ok | del | del | ok | ok | ok | del | del | DEV | ok | ok | ok |
| M03 | must | ok | DEV | del | del | DEV | ok | DEV | del | del | DEV | DEV | DEV | ok |
| M04 | must | ok | ok | del | del | ok | ok | ok | del | del | n/a | ok | ok | ok |
| M05 | should | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| M06 | must | ok | DEV | del | del | DEV | ok | DEV | del | del | DEV | DEV | DEV | ok |
| M07 | should | ok | DEV | del | del | DEV | ok | DEV | del | del | DEV | ok | ok | ok |
| M08 | should | ok | n/a | del | del | n/a | ok | n/a | del | del | n/a | ok | ok | ok |
| M09 | should | DEV | n/a | del | del | n/a | DEV | n/a | del | del | n/a | DEV | DEV | ok |
| M10 | should | DEV | n/a | del | del | n/a | DEV | n/a | del | del | n/a | ok | ok | ok |
| M11 | must | ok | ok | del | del | ok | ok | ok | del | del | DEV | DEV | DEV | ok |
| M12 | must | DEV | DEV | DEV | DEV | DEV | DEV | DEV | DEV | DEV | n/a | DEV | DEV | ok |

Requirements: M01 Replaces [CACHEBUSTING] with a random 8-digit integer.; M02 Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05).; M03 Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail).; M04 Percent-encodes macro values (the colons in TIMESTAMP).; M05 Does not write -1 into a macro it does not know ([NOTAREALMACRO]).; M06 Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty.; M07 Fills [ADSERVINGID] with the ad's AdServingId (in-serving).; M08 When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s.; M09 Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma.; M10 When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first).; M11 Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI.; M12 Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it.

Deviating cells (42):

- M01 must, video-ad-sdk (N): "4592845962" (10 chars)
- M01 must, video-ad-sdk (C): "2855248806" (10 chars)
- M01 must, Shaka Player (C): "[CACHEBUSTING]" (14 chars)
- M01 must, rmp-vast, defaults (C): "cvAILwRW" (8 chars)
- M01 must, rmp-vast, omidSupport (C): "Pl0Z4sfx" (8 chars)
- M02 must, Shaka Player (C): "[TIMESTAMP]"
- M03 must, video-ad-sdk (N): "[LIMITADTRACKING]"
- M03 must, vastlint-client (N): "[LIMITADTRACKING]"
- M03 must, video-ad-sdk (C): "[LIMITADTRACKING]"
- M03 must, Shaka Player (C): "[LIMITADTRACKING]"
- M03 must, rmp-vast, defaults (C): "[LIMITADTRACKING]"
- M03 must, rmp-vast, omidSupport (C): "[LIMITADTRACKING]"
- M06 must, video-ad-sdk (N): not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ua="[UNIVERSALADID]", ps="[PODSEQUENCE]", au="[ASSETURI]", bp="[BREAKPOSITION]", ifa="[IFA]", cua="[CLIENTUA]"
- M06 must, vastlint-client (N): not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ua="[UNIVERSALADID]", ps="[PODSEQUENCE]", au="[ASSETURI]", bp="[BREAKPOSITION]", ifa="[IFA]", cua="[CLIENTUA]"
- M06 must, video-ad-sdk (C): not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ua="[UNIVERSALADID]", ps="[PODSEQUENCE]", au="[ASSETURI]", bp="[BREAKPOSITION]", ifa="[IFA]", cua="[CLIENTUA]"
- M06 must, Shaka Player (C): not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ua="[UNIVERSALADID]", ps="[PODSEQUENCE]", au="[ASSETURI]", bp="[BREAKPOSITION]", ifa="[IFA]", cua="[CLIENTUA]"
- M06 must, rmp-vast, defaults (C): not replaced or implausible: ps="[PODSEQUENCE]", ifa="[IFA]", cua="[CLIENTUA]"
- M06 must, rmp-vast, omidSupport (C): not replaced or implausible: ps="[PODSEQUENCE]", ifa="[IFA]", cua="[CLIENTUA]"
- M07 should, video-ad-sdk (N): "[ADSERVINGID]"
- M07 should, vastlint-client (N): "[ADSERVINGID]"
- M07 should, video-ad-sdk (C): "[ADSERVINGID]"
- M07 should, Shaka Player (C): "[ADSERVINGID]"
- M09 should, vast-client-js (N): raw "ad-id.org%20ABCD%201234%2Cclearcast.co.uk%20CC%2FABC%2F123"
- M09 should, vast-client-js (C): raw "ad-id.org%20ABCD%201234%2Cclearcast.co.uk%20CC%2FABC%2F123"
- M09 should, rmp-vast, defaults (C): raw "%2Cad-id.org%20ABCD%201234%2Cclearcast.co.uk%20CC%2FABC%2F123"
- M09 should, rmp-vast, omidSupport (C): raw "%2Cad-id.org%20ABCD%201234%2Cclearcast.co.uk%20CC%2FABC%2F123"
- M10 should, vast-client-js (N): ASSETURI in.flv; played in.mp4
- M10 should, vast-client-js (C): ASSETURI ad-10s.flv?case=ch0349&ad=in; played ad-10s.webm?case=ch0349&ad=in
- M11 must, Shaka Player (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M11 must, rmp-vast, defaults (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M11 must, rmp-vast, omidSupport (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, vast-client-js (N): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, video-ad-sdk (N): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, iab-vast-loader, defaults (N): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, iab-vast-loader, noSingleAdPods (N): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, vastlint-client (N): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, vast-client-js (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, video-ad-sdk (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, iab-vast-loader, defaults (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, iab-vast-loader, noSingleAdPods (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, rmp-vast, defaults (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"
- M12 must, rmp-vast, omidSupport (C): cb "[CACHEBUSTING]", ts "[TIMESTAMP]"

## Ad pods (6 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P01 | must | ok | DEV | ok | ok | ok | ok | DEV | ok | ok | DEV | ok | ok | ok |
| P06 | should | del | DEV | del | del | del | del | DEV | del | del | ok | ok | ok | ok |
| P03 | must | del | n/a | del | del | del | del | n/a | del | del | DEV | ok | ok | ok |
| P02 | should | n/a | n/a | n/a | n/a | n/a | del | n/a | del | del | ok | ok | ok | ok |
| P05 | should | n/a | n/a | n/a | n/a | n/a | del | n/a | del | del | DEV | DEV | DEV | ok |
| P07 | must | DEV | DEV | DEV | DEV | ok | DEV | DEV | DEV | DEV | n/a | DEV | DEV | ok |

Requirements: P01 Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional).; P06 Plays all three ads of a pod.; P03 Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's.; P02 When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad).; P05 The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third.; P07 Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional).

Deviating cells (19):

- P01 must, video-ad-sdk (N): plays p3 first
- P01 must, video-ad-sdk (C): plays p3 first
- P01 must, Shaka Player (C): order p3,p1,p2
- P06 should, video-ad-sdk (N): played p1
- P06 should, video-ad-sdk (C): played p1
- P03 must, Shaka Player (C): misattributed: p1 imp 1 complete 0; p2 imp 1 complete 1; p3 imp 1 complete 2
- P05 should, Shaka Player (C): s1 played after p3
- P05 should, rmp-vast, defaults (C): stand-alone ad not played; moved to p3
- P05 should, rmp-vast, omidSupport (C): stand-alone ad not played; moved to p3
- P07 must, vast-client-js (N): order p3,p1,p2
- P07 must, video-ad-sdk (N): plays p3 first
- P07 must, iab-vast-loader, defaults (N): fetched the pod and reported no ad (303): VAST error 303: No ads VAST response after one or more Wrapp
- P07 must, iab-vast-loader, noSingleAdPods (N): fetched the pod and reported no ad (303): VAST error 303: No ads VAST response after one or more Wrapp
- P07 must, vast-client-js (C): order p3,p1,p2
- P07 must, video-ad-sdk (C): plays p3 first
- P07 must, iab-vast-loader, defaults (C): fetched the pod and reported no ad (303): VAST error 303: No ads VAST response after one or more Wrapp
- P07 must, iab-vast-loader, noSingleAdPods (C): fetched the pod and reported no ad (303): VAST error 303: No ads VAST response after one or more Wrapp
- P07 must, rmp-vast, defaults (C): order p3,p1,p2
- P07 must, rmp-vast, omidSupport (C): order p3,p1,p2

## XML and parsing (17 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| X01 | should | ok | ok | del | del | n/a | ok | ok | del | del | n/a | ok | ok | n/a |
| X02 | must | ok | ok | del | del | DEV | ok | ok | del | del | ok | ok | ok | ok |
| X03 | should | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| X05 | must | ok | ok | DEV | DEV | ok | ok | ok | DEV | DEV | ok | ok | ok | ok |
| X06 | must | ok | ok | DEV | DEV | ok | ok | ok | DEV | DEV | ok | ok | ok | ok |
| X08 | should | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| X09 | should | ok | ok | del | del | DEV | ok | ok | del | del | ok | ok | ok | ok |
| X10 | must | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| X11 | must | ok | DEV | del | del | ok | ok | DEV | del | del | ok | ok | ok | ok |
| X12 | should | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| X13 | must | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |
| X14 | should | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| X15 | should | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| X16 | should | ok | ok | ok | ok | ok | ok | ok | ok | ok | n/a | ok | ok | ok |
| X17 | must | ok | ok | del | del | DEV | ok | ok | del | del | ok | ok | ok | ok |
| X18 | should | ok | ok | ok | ok | DEV | ok | ok | ok | ok | n/a | ok | ok | ok |
| X19 | should | ok | ok | ok | ok | DEV | ok | ok | ok | ok | n/a | ok | ok | ok |

Requirements: X01 Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it).; X02 Ignores XML comments inside an element when reading its URI.; X03 Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do).; X05 Accepts a Creative with two UniversalAdId elements.; X06 Accepts two ClosedCaptionFile elements.; X08 Never requests a Tracking element whose event name is not a VAST event (notARealEvent).; X09 Does not request Impression or Tracking URIs that appear inside an Extension.; X10 Parses a document that starts with a UTF-8 byte order mark.; X11 Reassembles an Impression URI split across two CDATA sections (query s=x]]>x).; X12 Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute.; X13 An empty Impression element does not stop the other Impression from being requested.; X14 Accepts a VAST 3.0 InLine document.; X15 Accepts a VAST 2.0 InLine document.; X16 Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine.; X17 Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression).; X18 Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3).; X19 Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3).

Deviating cells (15):

- X02 must, vastlint-client (N): impression not requested
- X05 must, iab-vast-loader, defaults (N): rejected: Multiple values for Creative.UniversalAdId
- X05 must, iab-vast-loader, noSingleAdPods (N): rejected: Multiple values for Creative.UniversalAdId
- X05 must, iab-vast-loader, defaults (C): rejected: Multiple values for Creative.UniversalAdId
- X05 must, iab-vast-loader, noSingleAdPods (C): rejected: Multiple values for Creative.UniversalAdId
- X06 must, iab-vast-loader, defaults (N): rejected: Multiple values for ClosedCaptionFiles.ClosedCaptionFile
- X06 must, iab-vast-loader, noSingleAdPods (N): rejected: Multiple values for ClosedCaptionFiles.ClosedCaptionFile
- X06 must, iab-vast-loader, defaults (C): rejected: Multiple values for ClosedCaptionFiles.ClosedCaptionFile
- X06 must, iab-vast-loader, noSingleAdPods (C): rejected: Multiple values for ClosedCaptionFiles.ClosedCaptionFile
- X09 should, vastlint-client (N): requested ext/imp,ext/start
- X11 must, video-ad-sdk (N): s="x]]"
- X11 must, video-ad-sdk (C): s="x]]"
- X17 must, vastlint-client (N): requested the commented-out Impression
- X18 should, vastlint-client (N): requested with "?a=1"
- X19 should, vastlint-client (N): requested with "?a=1"

## Media selection (2 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S01 | should | del | ok | del | del | del | del | ok | del | del | DEV | ok | ok | ok |
| S02 | may | n/a | n/a | n/a | n/a | n/a | del | ok | del | del | ok | n/a | n/a | n/a |

Requirements: S01 Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one.; S02 Optional: plays an audio ad (adType="audio", Opus WebM and AAC files).

Deviating cells (1):

- S01 should, Shaka Player (C): chose http://127.0.0.1:41045/media/ad-10s.flv?case=ch0337&ad=in

## Verification and icons (8 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A01 | must | del | DEV | del | del | del | del | DEV | del | del | DEV | DEV | ok | ok |
| A02 | must | del | n/a | del | del | del | del | n/a | del | del | n/a | n/a | ok | ok |
| A03 | should | ok | DEV | del | del | ok | ok | DEV | del | del | n/a | DEV | ok | DEV |
| A04 | must | del | n/a | del | del | del | del | n/a | del | del | n/a | n/a | ok | ok |
| A05 | must | del | n/a | del | del | del | del | n/a | del | del | n/a | n/a | n/a | DEV |
| I01 | must | n/a | n/a | n/a | n/a | n/a | del | ok | del | del | DEV | ok | ok | DEV |
| I03 | should | n/a | n/a | n/a | n/a | n/a | del | DEV | del | del | DEV | DEV | DEV | ok |
| I02 | must | n/a | n/a | n/a | n/a | n/a | del | ok | del | del | n/a | ok | ok | n/a |

Requirements: A01 When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI.; A02 Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3).; A03 Handles the Wrapper's verification too: requests its verificationNotExecuted URI.; A04 Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported).; A05 When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load).; I01 Displays the Icon after the ad starts and requests its IconViewTracking URI.; I03 Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI.; I02 On a click on the Icon, requests its IconClickTracking URI.

Deviating cells (15):

- A01 must, video-ad-sdk (N): not requested
- A01 must, video-ad-sdk (C): not requested
- A01 must, Shaka Player (C): not requested
- A01 must, rmp-vast, defaults (C): not requested
- A03 should, video-ad-sdk (N): not requested
- A03 should, video-ad-sdk (C): not requested
- A03 should, rmp-vast, defaults (C): not requested
- A03 should, Google IMA (C): not requested
- A05 must, Google IMA (C): resource fetched (404); verificationNotExecuted not requested
- I01 must, Shaka Player (C): not requested
- I01 must, Google IMA (C): requested before the ad started
- I03 should, video-ad-sdk (C): not requested
- I03 should, Shaka Player (C): not requested
- I03 should, rmp-vast, defaults (C): requested 15 ms after start, before the 1 s offset
- I03 should, rmp-vast, omidSupport (C): requested 19 ms after start, before the 1 s offset

## Robustness observations (9 requirements)

| Req. | Strength | vast-client-js (N) | video-ad-sdk (N) | iab-vast-loader, defaults (N) | iab-vast-loader, noSingleAdPods (N) | vastlint-client (N) | vast-client-js (C) | video-ad-sdk (C) | iab-vast-loader, defaults (C) | iab-vast-loader, noSingleAdPods (C) | Shaka Player (C) | rmp-vast, defaults (C) | rmp-vast, omidSupport (C) | Google IMA (C) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T09 | observation | n/a | n/a | del | del | n/a | n/a | n/a | del | del | n/a | n/a | n/a | n/a |
| X04 | observation | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| R01 | observation | DEV | ok | ok | ok | ok | DEV | ok | ok | ok | n/a | DEV | DEV | ok |
| R02 | observation | ok | ok | ok | ok | ok | ok | ok | ok | ok | n/a | ok | ok | ok |
| X07 | observation | ok | ok | ok | ok | ok | ok | ok | ok | ok | n/a | ok | ok | ok |
| R03 | observation | ok | ok | ok | ok | ok | ok | ok | ok | ok | n/a | ok | ok | ok |
| R04 | observation | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| R05 | observation | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| R06 | observation | ok | ok | del | del | ok | ok | ok | del | del | ok | ok | ok | ok |

Requirements: T09 Spread between the first and last Impression request at impression time (ms, measured at the server).; X04 Parses a document that omits xmlns="http://www.iab.com/VAST".; R01 A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process).; R02 A failed Wrapper request does not escape as an uncaught exception.; X07 Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace).; R03 Follows an HTTP 302 redirect on a VASTAdTagURI.; R04 Parses a VAST response sent with Content-Encoding: gzip.; R05 Parses a VAST response served as text/plain rather than an XML media type.; R06 A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete).

Deviating cells (4):

- R01 observation, vast-client-js (N): uncaught: URLHandler: Request timed out after 2000 ms (408)
- R01 observation, vast-client-js (C): uncaught: Uncaught Error: URLHandler: Request timed out after 2000 ms (408) | URLHandler: Request timed out after 2000 ms (408)
- R01 observation, rmp-vast, defaults (C): uncaught: Uncaught Error: URLHandler: Request timed out after 2000 ms (408) | URLHandler: Request timed out after 2000 ms (408)
- R01 observation, rmp-vast, omidSupport (C): uncaught: Uncaught Error: URLHandler: Request timed out after 2000 ms (408) | URLHandler: Request timed out after 2000 ms (408)
