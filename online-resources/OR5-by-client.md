# Full view by client

Generated from the reference matrices of the Node.js layer and of Chromium (the references of the paper; Chromium 141 on Linux). For the open-source clients, verdicts in other engines differ only in the cells of Table 6 of the paper; IMA's engine and platform differences are in Section 5.1.5 and Table 6. "Detail" is the oracle's or the grader's own text for a deviating or n/a cell, as stored in results.jsonl. Do not edit by hand.

## vast-client-js 6.5.0, Node.js layer

conforms 79, deviates 6, delegated 12, n/a 11.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | conforms |  |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | conforms |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | DEVIATES | code 301 |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | conforms |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | conforms |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | conforms |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | conforms |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | conforms |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | conforms |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | conforms |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | conforms |  |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | conforms |  |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | conforms |  |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | conforms |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | conforms |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | delegated |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | conforms |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | conforms |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | conforms |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | conforms |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | conforms |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | conforms |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | 22 ms |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | conforms |  |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | conforms |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | conforms |  |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | conforms |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | conforms |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | conforms |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | DEVIATES | uncaught: URLHandler: Request timed out after 2000 ms (408) |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | delegated |  |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | n/a | needs real media decoding (browser layer only) |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | n/a | needs real media decoding (browser layer only) |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | n/a | needs real media decoding (browser layer only) |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | delegated |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | delegated |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | conforms |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | delegated |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | conforms |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | conforms |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | conforms |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | conforms |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | conforms |  |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | conforms |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | delegated |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | delegated |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | conforms |  |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | delegated |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | delegated |  |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | delegated |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | n/a | needs real media decoding (browser layer only) |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | conforms |  |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | conforms |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | conforms |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | DEVIATES | raw "ad-id.org%20ABCD%201234%2Cclearcast.co.uk%20CC%2FABC%2F123" |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | DEVIATES | ASSETURI in.flv; played in.mp4 |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | conforms |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | delegated |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | delegated |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | n/a | needs real media decoding (browser layer only) |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | n/a | needs real media decoding (browser layer only) |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | n/a | needs real media decoding (browser layer only) |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | conforms |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | conforms |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | conforms |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | order p3,p1,p2 |

## video-ad-sdk 4.0.1, Node.js layer

conforms 68, deviates 21, delegated 0, n/a 19.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | conforms |  |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | DEVIATES | code 502 |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | conforms |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | conforms |  |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | conforms |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | n/a | fanned out 401 to inline and both wrappers; the code is graded by E03 (G2) |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | conforms |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | conforms |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | conforms |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | DEVIATES | no click-through used |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | conforms |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | conforms |  |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | DEVIATES | resolved none |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | DEVIATES | resolved p2 |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | conforms |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | conforms |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | DEVIATES | err1 401; err2 401 |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | conforms |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | DEVIATES | dispatched about:blank |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | conforms |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | conforms |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | DEVIATES | 10%: 0, 80%: 0 |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | conforms |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | 3 ms |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | DEVIATES | "4592845962" (10 chars) |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | conforms |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | DEVIATES | "[LIMITADTRACKING]" |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | conforms |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | conforms |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | conforms |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | plays p3 first |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | conforms |  |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | conforms |  |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | n/a | needs real media decoding (browser layer only) |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | n/a | needs real media decoding (browser layer only) |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | n/a | needs real media decoding (browser layer only) |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | DEVIATES | code 401 |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | conforms |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | conforms |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | conforms |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | DEVIATES | 0 times |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | conforms |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | DEVIATES | before false, after false, skip 0 |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | conforms |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | conforms |  |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | conforms |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | DEVIATES | not requested |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | n/a | not requested (see A01) |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | DEVIATES | not requested |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | n/a | not requested (see A01) |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | n/a | resource neither fetched nor reported (see A01) |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | conforms |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | n/a | needs real media decoding (browser layer only) |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | DEVIATES | not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ua="[UNIVERSALADID]", ps="[PODSEQUENCE]", au="[ASSETURI]", bp="[BREAKPOSITION]", ifa="[IFA]", cua="[CLIENTUA]" |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | DEVIATES | "[ADSERVINGID]" |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | n/a | left as macro (see M06) |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | n/a | left as macro (see M06) |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | n/a | left as macro (see M06) |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | conforms |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | DEVIATES | played p1 |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | n/a | plays 1 of 3 pod ads (see P06) |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | n/a | needs real media decoding (browser layer only) |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | n/a | needs real media decoding (browser layer only) |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | n/a | needs real media decoding (browser layer only) |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | conforms |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | DEVIATES | s="x]]" |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | conforms |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | plays p3 first |

## iab-vast-loader 2.5.1, defaults, Node.js layer

conforms 23, deviates 7, delegated 68, n/a 10.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | DEVIATES | fetched start.xml; resolved 0; no ad and no error |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | conforms |  |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | delegated |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | DEVIATES | accepted an ad from non-well-formed XML (x) |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | delegated |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | delegated |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | delegated |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | delegated |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | delegated |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | delegated |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | delegated |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | DEVIATES | followed the second wrapper to the InLine |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | delegated |  |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | delegated |  |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | delegated |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | delegated |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | delegated |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | delegated |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | delegated |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | delegated |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | delegated |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | delegated |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | delegated |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | delegated |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | delegated |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | delegated |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | delegated |  |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | delegated |  |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | delegated |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | delegated |  |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | delegated |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | delegated |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | delegated |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | delegated |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | delegated |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | DEVIATES | rejected: Multiple values for Creative.UniversalAdId |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | DEVIATES | rejected: Multiple values for ClosedCaptionFiles.ClosedCaptionFile |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | conforms |  |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | delegated |  |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | n/a | needs real media decoding (browser layer only) |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | n/a | needs real media decoding (browser layer only) |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | n/a | needs real media decoding (browser layer only) |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | delegated |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | delegated |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | delegated |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | delegated |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | delegated |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | delegated |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | delegated |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | delegated |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | delegated |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | delegated |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | delegated |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | delegated |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | delegated |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | delegated |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | delegated |  |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | delegated |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | delegated |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | delegated |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | delegated |  |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | delegated |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | delegated |  |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | delegated |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | n/a | needs real media decoding (browser layer only) |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | delegated |  |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | delegated |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | delegated |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | delegated |  |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | delegated |  |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | delegated |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | delegated |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | delegated |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | n/a | needs real media decoding (browser layer only) |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | n/a | needs real media decoding (browser layer only) |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | n/a | needs real media decoding (browser layer only) |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | delegated |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | delegated |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | delegated |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | delegated |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | delegated |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | delegated |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | fetched the pod and reported no ad (303): VAST error 303: No ads VAST response after one or more Wrapp |

## iab-vast-loader 2.5.1, noSingleAdPods, Node.js layer

conforms 24, deviates 6, delegated 68, n/a 10.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | conforms |  |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | delegated |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | DEVIATES | accepted an ad from non-well-formed XML (x) |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | delegated |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | delegated |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | delegated |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | delegated |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | delegated |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | delegated |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | delegated |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | DEVIATES | followed the second wrapper to the InLine |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | delegated |  |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | delegated |  |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | delegated |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | delegated |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | delegated |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | delegated |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | delegated |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | delegated |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | delegated |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | delegated |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | delegated |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | delegated |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | delegated |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | delegated |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | delegated |  |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | delegated |  |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | delegated |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | delegated |  |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | delegated |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | delegated |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | delegated |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | delegated |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | delegated |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | DEVIATES | rejected: Multiple values for Creative.UniversalAdId |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | DEVIATES | rejected: Multiple values for ClosedCaptionFiles.ClosedCaptionFile |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | conforms |  |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | delegated |  |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | n/a | needs real media decoding (browser layer only) |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | n/a | needs real media decoding (browser layer only) |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | n/a | needs real media decoding (browser layer only) |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | delegated |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | delegated |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | delegated |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | delegated |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | delegated |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | delegated |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | delegated |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | delegated |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | delegated |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | delegated |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | delegated |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | delegated |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | delegated |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | delegated |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | delegated |  |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | delegated |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | delegated |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | delegated |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | delegated |  |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | delegated |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | delegated |  |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | delegated |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | n/a | needs real media decoding (browser layer only) |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | delegated |  |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | delegated |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | delegated |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | delegated |  |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | delegated |  |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | delegated |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | delegated |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | delegated |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | n/a | needs real media decoding (browser layer only) |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | n/a | needs real media decoding (browser layer only) |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | n/a | needs real media decoding (browser layer only) |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | delegated |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | delegated |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | delegated |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | delegated |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | delegated |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | delegated |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | fetched the pod and reported no ad (303): VAST error 303: No ads VAST response after one or more Wrapp |

## vastlint-client 0.15.0, Node.js layer

conforms 50, deviates 20, delegated 22, n/a 16.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | DEVIATES | stopped after 5 documents; codes none |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | delegated |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | delegated |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | delegated |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | delegated |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | delegated |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | delegated |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | DEVIATES | accepted an ad from non-well-formed XML (x) |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | delegated |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | conforms |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | conforms |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | conforms |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | conforms |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | conforms |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | conforms |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | DEVIATES | followed the second wrapper to the InLine |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | DEVIATES | resolved p1,p2,s1 |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | DEVIATES | resolved p1,p2,s1 |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | delegated |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | delegated |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | delegated |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | delegated |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | conforms |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | DEVIATES | fired 0 times |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | DEVIATES | fired 0 times |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | DEVIATES | 10%: 0, 80%: 0 |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | conforms |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | 2 ms |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | conforms |  |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | conforms |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | DEVIATES | "[LIMITADTRACKING]" |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | conforms |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | n/a | requested, but the client-side URL was not observable |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | DEVIATES | impression not requested |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | conforms |  |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | DEVIATES | resolved s1; fetched start.xml; error none |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | n/a | needs real media decoding (browser layer only) |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | n/a | needs real media decoding (browser layer only) |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | n/a | needs real media decoding (browser layer only) |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | delegated |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | delegated |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | conforms |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | conforms |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | DEVIATES | 0 times |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | delegated |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | delegated |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | n/a | no progress tracker fired (see T05) |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | DEVIATES | not fired |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | conforms |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | delegated |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | delegated |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | conforms |  |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | delegated |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | delegated |  |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | delegated |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | n/a | needs real media decoding (browser layer only) |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | DEVIATES | not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ua="[UNIVERSALADID]", ps="[PODSEQUENCE]", au="[ASSETURI]", bp="[BREAKPOSITION]", ifa="[IFA]", cua="[CLIENTUA]" |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | DEVIATES | "[ADSERVINGID]" |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | n/a | left as macro (see M06) |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | n/a | left as macro (see M06) |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | n/a | left as macro (see M06) |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | conforms |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | delegated |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | delegated |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | n/a | needs real media decoding (browser layer only) |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | n/a | needs real media decoding (browser layer only) |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | n/a | needs real media decoding (browser layer only) |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | n/a | needs real media decoding (browser layer only) |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | DEVIATES | requested ext/imp,ext/start |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | conforms |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | DEVIATES | requested the commented-out Impression |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | DEVIATES | requested with "?a=1" |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | DEVIATES | requested with "?a=1" |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |

## vast-client-js 6.5.0, Chromium layer

conforms 79, deviates 6, delegated 21, n/a 2.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | conforms |  |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | conforms |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | DEVIATES | code 303 |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | conforms |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | conforms |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | conforms |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | conforms |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | conforms |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | conforms |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | conforms |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | conforms |  |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | conforms |  |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | conforms |  |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | conforms |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | conforms |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | delegated |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | conforms |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | conforms |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | conforms |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | conforms |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | conforms |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | conforms |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | 5 ms |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | conforms |  |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | conforms |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | conforms |  |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | conforms |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | conforms |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | conforms |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | DEVIATES | uncaught: Uncaught Error: URLHandler: Request timed out after 2000 ms (408) \| URLHandler: Request timed out after 2000 ms (408) |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | delegated |  |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | delegated |  |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | delegated |  |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | delegated |  |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | delegated |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | delegated |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | conforms |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | delegated |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | conforms |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | conforms |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | conforms |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | conforms |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | conforms |  |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | conforms |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | delegated |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | delegated |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | conforms |  |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | delegated |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | delegated |  |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | delegated |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | delegated |  |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | conforms |  |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | conforms |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | conforms |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | DEVIATES | raw "ad-id.org%20ABCD%201234%2Cclearcast.co.uk%20CC%2FABC%2F123" |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | DEVIATES | ASSETURI ad-10s.flv?case=ch0349&ad=in; played ad-10s.webm?case=ch0349&ad=in |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | conforms |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | delegated |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | delegated |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | delegated |  |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | delegated |  |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | delegated |  |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | delegated |  |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | delegated |  |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | conforms |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | conforms |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | conforms |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | order p3,p1,p2 |

## video-ad-sdk 4.0.1, Chromium layer

conforms 71, deviates 25, delegated 0, n/a 12.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | conforms |  |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | DEVIATES | code 502 |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | conforms |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | DEVIATES | accepted an ad from non-well-formed XML (x) |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | conforms |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | n/a | fanned out 401 to inline and both wrappers; the code is graded by E03 (G2) |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | conforms |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | conforms |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | conforms |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | DEVIATES | no click-through used |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | conforms |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | conforms |  |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | DEVIATES | resolved none |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | DEVIATES | resolved p2 |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | conforms |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | conforms |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | DEVIATES | err1 401; err2 401 |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | conforms |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | DEVIATES | dispatched about:blank |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | conforms |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | conforms |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | DEVIATES | 10%: 0, 80%: 0 |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | conforms |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | 7 ms |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | DEVIATES | "2855248806" (10 chars) |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | conforms |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | DEVIATES | "[LIMITADTRACKING]" |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | conforms |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | conforms |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | conforms |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | plays p3 first |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | conforms |  |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | conforms |  |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | DEVIATES | code undefined,402 |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | DEVIATES | code undefined,402 |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | conforms |  |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | DEVIATES | code 401 |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | conforms |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | conforms |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | conforms |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | DEVIATES | 0 times |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | conforms |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | DEVIATES | before false, after false, skip 0 |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | conforms |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | conforms |  |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | conforms |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | DEVIATES | not requested |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | n/a | not requested (see A01) |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | DEVIATES | not requested |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | n/a | not requested (see A01) |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | n/a | resource neither fetched nor reported (see A01) |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | conforms |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | conforms |  |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | DEVIATES | not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ua="[UNIVERSALADID]", ps="[PODSEQUENCE]", au="[ASSETURI]", bp="[BREAKPOSITION]", ifa="[IFA]", cua="[CLIENTUA]" |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | DEVIATES | "[ADSERVINGID]" |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | n/a | left as macro (see M06) |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | n/a | left as macro (see M06) |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | n/a | left as macro (see M06) |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | conforms |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | DEVIATES | played p1 |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | n/a | plays 1 of 3 pod ads (see P06) |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | n/a | the pod was not continued past its first ad (see P06) |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | n/a | the pod was not continued past its first ad (see P06) |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | conforms |  |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | DEVIATES | not requested |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | conforms |  |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | conforms |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | DEVIATES | s="x]]" |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | conforms |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | plays p3 first |

## iab-vast-loader 2.5.1, defaults, Chromium layer

conforms 24, deviates 6, delegated 77, n/a 1.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | DEVIATES | fetched start.xml; resolved 0; no ad and no error |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | conforms |  |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | delegated |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | conforms |  |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | delegated |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | delegated |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | delegated |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | delegated |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | delegated |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | delegated |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | delegated |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | DEVIATES | followed the second wrapper to the InLine |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | delegated |  |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | delegated |  |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | delegated |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | delegated |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | delegated |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | delegated |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | delegated |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | delegated |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | delegated |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | delegated |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | delegated |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | delegated |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | delegated |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | delegated |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | delegated |  |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | delegated |  |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | delegated |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | delegated |  |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | delegated |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | delegated |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | delegated |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | delegated |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | delegated |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | DEVIATES | rejected: Multiple values for Creative.UniversalAdId |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | DEVIATES | rejected: Multiple values for ClosedCaptionFiles.ClosedCaptionFile |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | conforms |  |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | delegated |  |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | delegated |  |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | delegated |  |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | delegated |  |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | delegated |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | delegated |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | delegated |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | delegated |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | delegated |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | delegated |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | delegated |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | delegated |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | delegated |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | delegated |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | delegated |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | delegated |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | delegated |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | delegated |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | delegated |  |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | delegated |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | delegated |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | delegated |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | delegated |  |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | delegated |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | delegated |  |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | delegated |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | delegated |  |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | delegated |  |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | delegated |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | delegated |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | delegated |  |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | delegated |  |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | delegated |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | delegated |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | delegated |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | delegated |  |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | delegated |  |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | delegated |  |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | delegated |  |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | delegated |  |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | delegated |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | delegated |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | delegated |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | delegated |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | delegated |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | delegated |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | fetched the pod and reported no ad (303): VAST error 303: No ads VAST response after one or more Wrapp |

## iab-vast-loader 2.5.1, noSingleAdPods, Chromium layer

conforms 25, deviates 5, delegated 77, n/a 1.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | conforms |  |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | delegated |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | conforms |  |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | delegated |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | delegated |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | delegated |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | delegated |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | delegated |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | delegated |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | delegated |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | DEVIATES | followed the second wrapper to the InLine |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | delegated |  |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | delegated |  |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | delegated |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | delegated |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | delegated |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | delegated |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | delegated |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | delegated |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | delegated |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | delegated |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | delegated |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | delegated |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | delegated |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | delegated |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | delegated |  |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | delegated |  |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | delegated |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | delegated |  |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | delegated |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | delegated |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | delegated |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | delegated |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | delegated |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | DEVIATES | rejected: Multiple values for Creative.UniversalAdId |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | DEVIATES | rejected: Multiple values for ClosedCaptionFiles.ClosedCaptionFile |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | conforms |  |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | delegated |  |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | delegated |  |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | delegated |  |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | delegated |  |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | delegated |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | delegated |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | delegated |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | delegated |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | delegated |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | delegated |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | delegated |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | delegated |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | delegated |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | delegated |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | delegated |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | delegated |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | delegated |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | delegated |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | delegated |  |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | delegated |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | delegated |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | delegated |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | delegated |  |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | delegated |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | delegated |  |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | delegated |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | delegated |  |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | delegated |  |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | delegated |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | delegated |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | delegated |  |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | delegated |  |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | delegated |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | delegated |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | delegated |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | delegated |  |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | delegated |  |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | delegated |  |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | delegated |  |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | delegated |  |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | delegated |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | delegated |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | delegated |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | delegated |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | delegated |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | delegated |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | fetched the pod and reported no ad (303): VAST error 303: No ads VAST response after one or more Wrapp |

## Shaka Player 5.2.12, Chromium layer

conforms 35, deviates 29, delegated 0, n/a 44.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | DEVIATES | fetched start.xml; resolved 0 |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | DEVIATES | fetched start.xml; resolved 0; no ad and no error |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | n/a | the client does not follow Wrappers (see W01) |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | n/a | the client does not follow Wrappers (see W01) |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | n/a | the client does not follow Wrappers (see W01) |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | n/a | the client does not follow Wrappers (see W01) |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | n/a | the client does not follow Wrappers (see W01) |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | n/a | the client does not follow Wrappers (see W01) |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | n/a | the client does not follow Wrappers (see W01) |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | n/a | the client does not follow Wrappers (see W01) |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | n/a | the client does not follow Wrappers (see W01) |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | n/a | the client does not follow Wrappers (see W01) |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | n/a | the client does not follow Wrappers (see W01) |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | n/a | the client does not follow Wrappers (see W01) |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | n/a | the client does not follow Wrappers (see W01) |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | n/a | the client does not follow Wrappers (see W01) |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | n/a | the client does not follow Wrappers (see W01) |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | n/a | the client does not follow Wrappers (see W01) |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | n/a | the client does not follow Wrappers (see W01) |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | n/a | the client does not follow Wrappers (see W01) |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | n/a | the client does not follow Wrappers (see W01) |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | the client does not follow Wrappers (see W01) |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | DEVIATES | not requested |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | DEVIATES | err1 0, err2 0 |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | DEVIATES | err1 [ERRORCODE]; err2 [ERRORCODE] |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | n/a | the client does not follow Wrappers (see W01) |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | conforms |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | DEVIATES | fired 0 times |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | DEVIATES | fired 0 times |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | DEVIATES | 10%: 0, 80%: 0 |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | n/a | Shaka exposes no API to stop an interstitial at a given point or to click it (partial) |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | the client does not follow Wrappers (see W01) |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | DEVIATES | "[CACHEBUSTING]" (14 chars) |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | DEVIATES | "[TIMESTAMP]" |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | DEVIATES | "[LIMITADTRACKING]" |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | n/a | TIMESTAMP left unreplaced (see M02) |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | n/a | requested, but the client-side URL was not observable |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | conforms |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | order p3,p1,p2 |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | n/a | the client does not follow Wrappers (see W01) |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | n/a | the client does not follow Wrappers (see W01) |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | n/a | the client does not follow Wrappers (see W01) |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | DEVIATES | code [ERRORCODE] |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | DEVIATES | code [ERRORCODE] |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | DEVIATES | Error URI not requested |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | conforms |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | DEVIATES | impression requested for an ad that never played |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | conforms |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | DEVIATES | unmute fired 2 times |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | DEVIATES | 0 times |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | conforms |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | DEVIATES | before false, after false, skip 0 |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | n/a | no progress tracker fired (see T05) |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | DEVIATES | not fired |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | conforms |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | DEVIATES | not requested |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | n/a | not requested (see A01) |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | n/a | the client does not follow Wrappers (see W01) |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | n/a | not requested (see A01) |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | n/a | resource neither fetched nor reported (see A01) |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | DEVIATES | chose http://127.0.0.1:41045/media/ad-10s.flv?case=ch0337&ad=in |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | conforms |  |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | DEVIATES | not replaced or implausible: ah="[ADPLAYHEAD]", asi="[ADSERVINGID]", ua="[UNIVERSALADID]", ps="[PODSEQUENCE]", au="[ASSETURI]", bp="[BREAKPOSITION]", ifa="[IFA]", cua="[CLIENTUA]" |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | DEVIATES | "[ADSERVINGID]" |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | n/a | left as macro (see M06) |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | n/a | left as macro (see M06) |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | n/a | left as macro (see M06) |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | n/a | the client does not follow Wrappers (see W01) |
| P06 | should | Ad pods | Plays all three ads of a pod. | conforms |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | DEVIATES | misattributed: p1 imp 1 complete 0; p2 imp 1 complete 1; p3 imp 1 complete 2 |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | conforms |  |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | DEVIATES | s1 played after p3 |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | DEVIATES | not requested |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | DEVIATES | not requested |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | n/a | icon not displayed (see I01) |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | n/a | the client does not follow Wrappers (see W01) |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | conforms |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | conforms |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | n/a | the client does not follow Wrappers (see W01) |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | n/a | the client does not follow Wrappers (see W01) |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | conforms |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | n/a | the client does not follow Wrappers (see W01) |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | n/a | the client does not follow Wrappers (see W01) |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | n/a | the client does not follow Wrappers (see W01) |

## rmp-vast 17.2.0, defaults, Chromium layer

conforms 80, deviates 22, delegated 0, n/a 6.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | DEVIATES | stopped after 4 documents; codes 302 |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | conforms |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | DEVIATES | code 303 |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | conforms |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | conforms |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | conforms |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | conforms |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | conforms |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | conforms |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | conforms |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | conforms |  |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | DEVIATES | resolved p2,p1,s1 |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | DEVIATES | resolved p2,p1,s1 |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | conforms |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | conforms |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | conforms |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | conforms |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | DEVIATES | dispatched about:blank |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | conforms |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | conforms |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | conforms |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | conforms |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | 0 ms |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | DEVIATES | "cvAILwRW" (8 chars) |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | conforms |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | DEVIATES | "[LIMITADTRACKING]" |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | conforms |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | conforms |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | conforms |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | DEVIATES | uncaught: Uncaught Error: URLHandler: Request timed out after 2000 ms (408) \| URLHandler: Request timed out after 2000 ms (408) |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | DEVIATES | resolved none; fetched start.xml,noad.xml; error aderror 303: No VAST response after one or more Wrappers. |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | conforms |  |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | DEVIATES | code 401 |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | conforms |  |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | conforms |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | conforms |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | DEVIATES | 2 times |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | DEVIATES | unmute fired 2 times |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | conforms |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | conforms |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | conforms |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | conforms |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | DEVIATES | not fired |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | conforms |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | DEVIATES | not requested |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | n/a | not requested (see A01) |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | DEVIATES | not requested |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | n/a | not requested (see A01) |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | n/a | resource neither fetched nor reported (see A01) |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | conforms |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | n/a | not supported (optional); reported 401 |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | DEVIATES | not replaced or implausible: ps="[PODSEQUENCE]", ifa="[IFA]", cua="[CLIENTUA]" |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | conforms |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | conforms |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | DEVIATES | raw "%2Cad-id.org%20ABCD%201234%2Cclearcast.co.uk%20CC%2FABC%2F123" |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | conforms |  |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | conforms |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | conforms |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | conforms |  |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | DEVIATES | stand-alone ad not played; moved to p3 |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | conforms |  |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | DEVIATES | requested 15 ms after start, before the 1 s offset |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | conforms |  |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | conforms |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | conforms |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | conforms |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | order p3,p1,p2 |

## rmp-vast 17.2.0, omidSupport, Chromium layer

conforms 84, deviates 20, delegated 0, n/a 4.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | DEVIATES | stopped after 4 documents; codes 302 |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | conforms |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | DEVIATES | code 303 |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | conforms |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | conforms |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | conforms |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | conforms |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | conforms |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | conforms |  |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | conforms |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | conforms |  |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | DEVIATES | resolved p2,p1,s1 |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | DEVIATES | resolved p2,p1,s1 |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | conforms |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | conforms |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | conforms |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | conforms |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | DEVIATES | dispatched about:blank |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | conforms |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | conforms |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | conforms |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | conforms |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | 1 ms |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | DEVIATES | "Pl0Z4sfx" (8 chars) |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | conforms |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | DEVIATES | "[LIMITADTRACKING]" |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | conforms |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | conforms |  |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | conforms |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | DEVIATES | uncaught: Uncaught Error: URLHandler: Request timed out after 2000 ms (408) \| URLHandler: Request timed out after 2000 ms (408) |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | DEVIATES | resolved none; fetched start.xml,noad.xml; error aderror 303: No VAST response after one or more Wrappers. |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | conforms |  |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | DEVIATES | code 401 |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | conforms |  |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | conforms |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | conforms |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | DEVIATES | 2 times |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | DEVIATES | unmute fired 2 times |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | conforms |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | conforms |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | conforms |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | conforms |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | DEVIATES | not fired |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | conforms |  |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | conforms |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | conforms |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | conforms |  |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | conforms |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | n/a | resource neither fetched nor reported (see A01) |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | conforms |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | n/a | not supported (optional); reported 401 |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | DEVIATES | not replaced or implausible: ps="[PODSEQUENCE]", ifa="[IFA]", cua="[CLIENTUA]" |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | conforms |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | conforms |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | DEVIATES | raw "%2Cad-id.org%20ABCD%201234%2Cclearcast.co.uk%20CC%2FABC%2F123" |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | conforms |  |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | DEVIATES | cb "[CACHEBUSTING]", ts "[TIMESTAMP]" |
| P06 | should | Ad pods | Plays all three ads of a pod. | conforms |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | conforms |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | conforms |  |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | DEVIATES | stand-alone ad not played; moved to p3 |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | conforms |  |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | DEVIATES | requested 19 ms after start, before the 1 s offset |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | conforms |  |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | conforms |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | conforms |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | conforms |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | DEVIATES | order p3,p1,p2 |

## Google IMA HTML5 3.794.0, Chromium layer

conforms 93, deviates 8, delegated 0, n/a 7.

| Req. | Strength | Duty group | Requirement | Verdict | Detail |
|---|---|---|---|---|---|
| W01 | must | Wrapper resolution | Follows a Wrapper to its InLine ad. | conforms |  |
| W02 | must | Wrapper resolution | Follows a lone Wrapper that carries sequence="1" (a one-ad pod) to its InLine ad, or declines it with an error (pod support is optional). | conforms |  |
| W03 | must | Wrapper resolution | Accepts a chain of five Wrappers before the InLine ad (players are required to accept five). | DEVIATES | stopped after 5 documents; codes 302 |
| W04 | should | Error reporting | With six Wrappers the player may reject; if it does, it determines 302 (and, with a tracker, reports it to the Error URI of every Wrapper it received). | conforms |  |
| W05 | should | Wrapper resolution | Terminates a Wrapper that points to itself (stops requesting it). | conforms |  |
| W06 | should | Error reporting | Reports 302 (wrapper limit) for a self-referencing Wrapper loop. | conforms |  |
| W07 | must | Error reporting | When the VASTAdTagURI is unavailable (HTTP 404), determines error 301. | conforms |  |
| W08 | must | Error reporting | When the VASTAdTagURI times out, determines error 301. | conforms |  |
| W09 | should | Error reporting | When a Wrapper leads to a no-ad response and the player determines a code, the code is 303. | conforms |  |
| W10 | must | Error reporting | Requests the VAST-level Error URI of a no-ad response reached through a Wrapper (with 303 for [ERRORCODE]). | conforms |  |
| W11 | must | Error reporting | When the Wrapper target is not well-formed XML, determines error 100 (and does not use an ad from it). | conforms |  |
| W12 | must | Error reporting | Requests the Wrapper Error URI when its VASTAdTagURI fails. | conforms |  |
| W13 | must | Error reporting | An InLine error after a chain of Wrappers is reported to the InLine and to every Wrapper Error URI, with the same code (403 here). | conforms |  |
| W14 | must | Impressions and tracking | At impression time, requests the Impression URIs of the InLine ad and of every Wrapper before it. | conforms |  |
| W15 | must | Impressions and tracking | Fires the Wrapper's Linear tracking events (start, quartiles, complete) together with the InLine ones. | conforms |  |
| W16 | must | Impressions and tracking | When both the InLine and a Wrapper carry a ClickThrough, the InLine one is used. | conforms |  |
| W17 | must | Impressions and tracking | When the InLine has no ClickThrough (no VideoClicks), the ClickThrough of the Wrapper closest to the InLine is used. | DEVIATES | no click-through used |
| W18 | must | Impressions and tracking | On a click, requests the ClickTracking URIs of the InLine and of every Wrapper. | conforms |  |
| W19 | should | Wrapper resolution | With followAdditionalWrappers="false", a Wrapper received next is ignored rather than followed. | conforms |  |
| W20 | should | Wrapper resolution | With allowMultipleAds="false", only the first stand-alone Ad of the response is used (pod ads are dropped). | DEVIATES | resolved none |
| W21 | should | Wrapper resolution | Without the attribute, allowMultipleAds defaults to false, so only the first stand-alone Ad is used. | DEVIATES | resolved none |
| W22 | may | Wrapper resolution | Optional: rejects an InLine whose Category is blocked upstream; a player that does reject it must report 205. | n/a | not implemented (optional): ad accepted |
| E01 | must | Error reporting | For a no-ad response, requests the VAST-level Error URI. | conforms |  |
| E02 | must | Error reporting | Requests every VAST-level Error URI when several are given. | conforms |  |
| E03 | must | Error reporting | With no supported MediaFile, requests every InLine Error URI with 403. | conforms |  |
| E04 | must | Error reporting | Replaces [ERRORCODE] in Error URIs with a numeric code. | conforms |  |
| T01 | must | Impressions and tracking | Requests every Impression URI of the ad. | conforms |  |
| T02 | should | Impressions and tracking | Does not dispatch an Impression whose URI is about:blank. | conforms |  |
| T03 | must | Impressions and tracking | Fires start, firstQuartile, midpoint, thirdQuartile and complete exactly once each, in that order. | conforms |  |
| T04 | must | Impressions and tracking | Fires every Tracking element for the same event (two start trackers for two parties). | conforms |  |
| T05 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS offset. | conforms |  |
| T06 | must | Impressions and tracking | Fires a progress tracker with an HH:MM:SS.mmm offset. | conforms |  |
| T07 | must | Impressions and tracking | Fires progress trackers with percentage offsets (10% and 80%). | conforms |  |
| T08 | must | Impressions and tracking | Stopping at 60% fires midpoint but neither thirdQuartile nor complete. | conforms |  |
| T09 | observation | Robustness observations | Spread between the first and last Impression request at impression time (ms, measured at the server). | n/a | 4 ms |
| M01 | must | Macros | Replaces [CACHEBUSTING] with a random 8-digit integer. | conforms |  |
| M02 | must | Macros | Replaces [TIMESTAMP] with an ISO 8601 date-time (milliseconds and zone as in the macro list example 2016-01-17T8:15:07.127-05). | conforms |  |
| M03 | must | Macros | Replaces [LIMITADTRACKING] with 0 or 1 (the harness also accepts -1/-2, since a browser has no device advertising ID; see detail). | conforms |  |
| M04 | must | Macros | Percent-encodes macro values (the colons in TIMESTAMP). | conforms |  |
| M05 | should | Macros | Does not write -1 into a macro it does not know ([NOTAREALMACRO]). | conforms |  |
| X01 | should | XML and parsing | Trims the whitespace around a CDATA-wrapped Impression URI before handing it to the network (checked on the client side, since URL parsers also strip it). | n/a | requested, but the client-side URL was not observable |
| X02 | must | XML and parsing | Ignores XML comments inside an element when reading its URI. | conforms |  |
| X03 | should | XML and parsing | Decodes character entities (&amp;) in a URI given as plain text (a document that breaks §2.3.3's CDATA rule, which real tags still do). | conforms |  |
| X04 | observation | Robustness observations | Parses a document that omits xmlns="http://www.iab.com/VAST". | conforms |  |
| X05 | must | XML and parsing | Accepts a Creative with two UniversalAdId elements. | conforms |  |
| X06 | must | XML and parsing | Accepts two ClosedCaptionFile elements. | conforms |  |
| P01 | must | Ad pods | Orders pod ads by their sequence attribute (document order is 3, 1, 2): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
| R01 | observation | Robustness observations | A timed-out Wrapper request does not escape as an uncaught exception (which terminates a Node process). | conforms |  |
| R02 | observation | Robustness observations | A failed Wrapper request does not escape as an uncaught exception. | conforms |  |
| W23 | should | Wrapper resolution | With fallbackOnNoAd="true", when the Wrapper's target returns no ad, a stand-alone ad from the response is used. | DEVIATES | resolved none; fetched start.xml,noad.xml; error AD_ERROR 900: The response does not contain any valid ads. |
| E05 | must | Error reporting | When the MediaFile URI returns HTTP 404, requests the InLine Error URI with 401 (file not found). | conforms |  |
| E06 | must | Error reporting | When a MediaFile of a supported type cannot be decoded, requests the InLine Error URI with 405. | conforms |  |
| E07 | must | Error reporting | When the MediaFile URI answers only after 30 s, requests the InLine Error URI with 402 (media timeout). | conforms |  |
| E08 | should | Error reporting | Does not request the Error URI when the ad plays without a problem. | conforms |  |
| E09 | must | Error reporting | Given a NonLinear-only ad, either displays it (impression or creativeView) or reports 200/201 (unexpected ad type or linearity). | conforms |  |
| T10 | should | Impressions and tracking | Does not request the Impression of an ad whose media never plays (no supported MediaFile). | conforms |  |
| T11 | should | Impressions and tracking | Requests the Impression exactly once across pause, resume, mute and unmute. | conforms |  |
| T12 | must | Impressions and tracking | Fires the pause tracker once when the user pauses. | conforms |  |
| T13 | must | Impressions and tracking | Fires the resume tracker once when the user resumes. | conforms |  |
| T14 | must | Impressions and tracking | Fires the mute tracker once when the user mutes. | conforms |  |
| T15 | must | Impressions and tracking | Fires the unmute tracker when the user unmutes. | conforms |  |
| T23 | should | Impressions and tracking | A volume change that is not an unmute (0.5 while unmuted) does not fire unmute. | conforms |  |
| T20 | should | Impressions and tracking | Fires the loaded tracker once when the media is ready to play. | conforms |  |
| T16 | must | Impressions and tracking | Skipping at 6 s (skipoffset 00:00:03) fires skip and neither thirdQuartile nor complete (skippable support is an optional ad type). | conforms |  |
| T17 | should | Impressions and tracking | The skip control is not available at 1.5 s and is available at 6 s (skipoffset 00:00:03). | conforms |  |
| T18 | should | Impressions and tracking | A percentage skipoffset (30% of 10 s) makes skip available at 3 s, and skipping fires skip. | conforms |  |
| T19 | should | Impressions and tracking | Progress offsets passed before the skip (2 s and 5 s) are fired. | conforms |  |
| T21 | must | Impressions and tracking | Fires the rewind tracker when the user seeks back 2 s (from 60% to 40%). | n/a | IMA exposes no seek or icon control to a page; rewind is not drivable |
| T22 | should | Impressions and tracking | After rewinding from 6 s to 4 s, midpoint and the 5 s progress tracker are not fired a second time when playback passes them again. | n/a | IMA exposes no seek or icon control to a page; rewind is not drivable |
| A01 | must | Verification and icons | When it does not execute the InLine's verification resource (a JavaScript resource with an apiFramework it does not implement), requests its verificationNotExecuted URI. | conforms |  |
| A02 | must | Verification and icons | Fills [REASON] in verificationNotExecuted with a reason code (1, 2 or 3). | conforms |  |
| A03 | should | Verification and icons | Handles the Wrapper's verification too: requests its verificationNotExecuted URI. | DEVIATES | not requested |
| A04 | must | Verification and icons | Reports a verification resource whose apiFramework it does not implement with reason 2 (verification not supported). | conforms |  |
| A05 | must | Verification and icons | When an OMID verification resource fails to load (HTTP 404), requests its verificationNotExecuted URI with reason 3 (error during resource load). | DEVIATES | resource fetched (404); verificationNotExecuted not requested |
| S01 | should | Media selection | Skips a MediaFile of an unsupported type listed first (video/x-flv) and plays a supported one. | conforms |  |
| S02 | may | Media selection | Optional: plays an audio ad (adType="audio", Opus WebM and AAC files). | n/a | not supported (optional); reported 400 |
| M06 | must | Macros | Replaces each of eight listed optional macros ([ADPLAYHEAD], [ADSERVINGID], [UNIVERSALADID], [PODSEQUENCE], [ASSETURI], [BREAKPOSITION], [IFA], [CLIENTUA]) with a plausible value or -1/-2; none left as macro or empty. | conforms |  |
| M07 | should | Macros | Fills [ADSERVINGID] with the ad's AdServingId (in-serving). | conforms |  |
| M08 | should | Macros | When it fills [ADPLAYHEAD], the midpoint value is HH:MM:SS.mmm and about 5 s. | conforms |  |
| M09 | should | Macros | Fills [UNIVERSALADID] with one or more of the Creative's IDs as "registry value" pairs, each percent-encoded; several IDs are joined by a raw comma. | conforms |  |
| M10 | should | Macros | When it fills [ASSETURI], the value is the MediaFile actually chosen (an unsupported FLV is listed first). | conforms |  |
| M11 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in an Error URI as in any other tracking URI. | conforms |  |
| M12 | must | Macros | Replaces [CACHEBUSTING] and [TIMESTAMP] in a Wrapper's VASTAdTagURI before requesting it. | conforms |  |
| P06 | should | Ad pods | Plays all three ads of a pod. | conforms |  |
| P03 | must | Ad pods | Playing a three-ad pod, each ad gets one impression and one complete, fired between its own impression and the next ad's. | conforms |  |
| P02 | should | Ad pods | When the second pod ad cannot play, playback continues with another ad (the stand-alone ad or the third pod ad). | conforms |  |
| P05 | should | Ad pods | The failed pod ad is replaced by the stand-alone ad from the response, after the first pod ad and before the third. | conforms |  |
| I01 | must | Verification and icons | Displays the Icon after the ad starts and requests its IconViewTracking URI. | DEVIATES | requested before the ad started |
| I03 | should | Verification and icons | Displays an Icon with offset 00:00:01 and duration 00:00:08 once playback passes 1 s, requesting its IconViewTracking URI. | conforms |  |
| I02 | must | Verification and icons | On a click on the Icon, requests its IconClickTracking URI. | n/a | IMA exposes no seek or icon control to a page; icon is not drivable |
| X07 | observation | Robustness observations | Follows a VASTAdTagURI whose CDATA is surrounded by whitespace and line breaks (on the wire; URL parsers also strip the whitespace). | conforms |  |
| X08 | should | XML and parsing | Never requests a Tracking element whose event name is not a VAST event (notARealEvent). | conforms |  |
| X09 | should | XML and parsing | Does not request Impression or Tracking URIs that appear inside an Extension. | conforms |  |
| X10 | must | XML and parsing | Parses a document that starts with a UTF-8 byte order mark. | conforms |  |
| X11 | must | XML and parsing | Reassembles an Impression URI split across two CDATA sections (query s=x]]>x). | conforms |  |
| X12 | should | XML and parsing | Accepts a UniversalAdId that still carries the VAST 4.0 idValue attribute. | conforms |  |
| X13 | must | XML and parsing | An empty Impression element does not stop the other Impression from being requested. | conforms |  |
| X14 | should | XML and parsing | Accepts a VAST 3.0 InLine document. | conforms |  |
| X15 | should | XML and parsing | Accepts a VAST 2.0 InLine document. | conforms |  |
| X16 | should | XML and parsing | Follows a VAST 3.0 Wrapper to a VAST 4.3 InLine. | conforms |  |
| R03 | observation | Robustness observations | Follows an HTTP 302 redirect on a VASTAdTagURI. | conforms |  |
| R04 | observation | Robustness observations | Parses a VAST response sent with Content-Encoding: gzip. | conforms |  |
| R05 | observation | Robustness observations | Parses a VAST response served as text/plain rather than an XML media type. | conforms |  |
| R06 | observation | Robustness observations | A tracking URI that answers HTTP 500 does not stop later trackers (quartiles, complete). | conforms |  |
| X17 | must | XML and parsing | Does not request an Impression element that sits entirely inside an XML comment (next to a real Impression). | conforms |  |
| X18 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with &amp; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| X19 | should | XML and parsing | Requests a VASTAdTagURI written as escaped text, with the character reference &#38; between query parameters, with all parameters intact (a=1, b=2, c=3). | conforms |  |
| P07 | must | Ad pods | Orders the pod ads of a Wrapper's target by their sequence attribute (document order 3, 1, 2; the Wrapper sets allowMultipleAds="true"): the ad with sequence 1 comes first (or the pod is declined with an error; pod support is optional). | conforms |  |
