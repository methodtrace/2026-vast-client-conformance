# Coverage map: VAST 4.3 player duties and the requirement catalog

Built 2026-10-09. Source: every sentence in sources/iab-vast-spec/VAST4.x/4.3.md that names the media player or player support with must, should, required or may (122 matches), plus the IAB macro list (vast4macros/data/macros-data.json). Each duty is mapped to the requirement ids that test it (code/harness/suite/requirements.mjs), or to a reason it is not tested.

"Required" in the spec's Player Support rows means the element must be understood by a player that supports that ad type. Ad types are declared per player (§2.3.1): Linear, NonLinear, Companion, Skippable Linear, Ad Pods. The catalog tests Linear fully, Skippable Linear and Ad Pods as declared types, and NonLinear and Companion only where they meet a linear player (E09).

## Tested

| Spec area | Duty | Requirements |
|---|---|---|
| §2.3.5, §3.19.1 | Follow Wrappers; accept five; may reject the sixth with 302 | W01, W02, W03, W04 |
| §2.3.5.1 | Terminate loops; 302 | W05, W06 |
| §2.3.5.2 | ClickThrough precedence (InLine, then closest Wrapper) | W16, W17 |
| §3.19 | Wrapper tracking merged with InLine; ClickTracking from every level | W14, W15, W18 |
| §3.19 attributes | followAdditionalWrappers, allowMultipleAds (and its default), fallbackOnNoAd | W19, W20, W21, W23 |
| §3.19.2 | BlockedAdCategories (205; optional) | W22 |
| Error Reporting | Codes 100, 301 (404 and timeout), 302, 303, 401, 402, 403, 405, 200/201; fan-out to every Wrapper; [ERRORCODE] numeric; 900 accepted as the minimum | W06-W13, E03-E07, E09 |
| §3.1 Error (VAST) | No-ad response: every VAST-level Error URI | E01, E02, W10 |
| §3.4.11 | Error only when an ad cannot be served | E08 |
| §2.3.4, §3.4.4 | All Impressions, at the same time; about:blank not dispatched; once; not for an ad that never plays | T01, T02, T09, T10, T11, W14 |
| §3.14.1 Linear metrics | start, quartiles, complete (once, in order, not past a stop point) | T03, T08 |
| §3.14.1, §3.14.3 | progress: HH:MM:SS, HH:MM:SS.mmm, n%; several trackers per event | T04, T05, T06, T07 |
| §3.14.1 Player operation | pause, resume, mute, unmute (and no unmute for a mere volume change), rewind, skip, loaded | T12-T16, T20-T23 |
| §3.8 skipoffset, §2.3.1 Skippable | skip control timing (time and percent), skip ends tracking, progress before skip counts | T16, T17, T18, T19 |
| §3.16, §3.17 | verificationNotExecuted with [REASON]; Wrapper verifications included | A01, A02, A03 |
| MediaFiles | choose by attributes, not order | S01 |
| §1.4 | audio ad (optional) | S02 |
| Ad Pods | sequence order; play all; one impression and complete per ad; continue after a failure; substitute a stand-alone ad | P01, P02, P03, P05, P06 |
| Icons (Industry Icon Support, §3.11) | display after start with IconViewTracking (untimed and with offset/duration); IconClickTracking | I01, I02, I03 |
| Macros §6.1, macro list | Required: CACHEBUSTING, TIMESTAMP, LIMITADTRACKING, ERRORCODE, REASON; encoding; unknown macros left alone; unprovided optional macros as -1/-2; ADSERVINGID, ADPLAYHEAD, UNIVERSALADID (array encoding), ASSETURI; contexts: Error URIs and VAST request URIs | M01-M12, E04, A02 |
| §2.3.2, §2.3.3 XML | CDATA whitespace, comments, entities, CDATA split around "]]>", BOM, whitespace around VASTAdTagURI | X01, X02, X03, X07, X10, X11 |
| §3.7.1, §3.9.5 | repeated UniversalAdId and ClosedCaptionFile; 4.0 idValue attribute tolerated | X05, X06, X12 |
| §3.14.3, §3.18 | unknown event names and Extension content are not VAST | X08, X09 |
| §4.3 Media Players | older versions: 3.0, 2.0, mixed chain | X14, X15, X16 |
| Robustness (not clauses) | no-namespace document, uncaught errors, HTTP redirect, gzip, text/plain, failing pixel, empty Impression | X04, X13, R01-R06 |

## Not tested, and why

| Spec area | Reason |
|---|---|
| §1.1.2, §1.1.3 Server-side stitching, headers | Server-side duties; the clients are client-side libraries. |
| CORS headers (VAST Implementation) | An ad-server duty; the harness serves everything from one origin. |
| §3.5 ViewableImpression | Player support is optional and the viewability decision belongs to the integrator, which the harness would have to invent. |
| §3.9.2 Mezzanine, 406, 407, 411 | Ad-stitching duties. |
| §3.9.3 InteractiveCreativeFile, 409, 901, 902, VPAID, SIMID | Executing interactive code is out of scope; a VPAID unit would run arbitrary script in the harness. |
| §3.8.2 AdParameters | Consumed by interactive units only. |
| §3.10.3 CustomClick, otherAdInteraction, interactiveStart | Fired by creatives, not by the player alone. |
| §3.12 NonLinear display, §3.13 Companion display, 500-503, 600-604, creativeView, acceptInvitation, adExpand, adCollapse, minimize, close, overlayViewDuration | Optional ad types; none of the three libraries renders companions, and only Shaka displays NonLinear. E09 records what a linear player does with a NonLinear-only ad. |
| playerExpand, playerCollapse, closeLinear | Need fullscreen or close controls that headless browsers do not give the libraries; closeLinear is defined for SDK end cards. |
| notUsed | Optional, best effort. |
| §2.3.5.1 304 (ad framework timeout) | VPAID-era duty. |
| 202, 203, 204, 206 | Depend on the integrator's declared expectations (duration, size, category, break length). W20 records one 203. |
| IconClickFallbackImages, icon positioning | Need pixel-level rendering checks. |
| Optional macros not listed in M06 (CONTENTPLAYHEAD and the request-context macros) | M06 samples eight optional tracking macros, including all that the player can know from the document; the rest repeat the same rule. |
| Request-side macros (BLOCKEDADCATEGORIES, VASTVERSIONS, etc. in the first request) | The first request is made by the integrator; M12 covers macros in Wrapper requests. |

## Layers

- Node.js layer (jsdom, scripted video): every requirement except those marked `layer: 'browser'` (E05, E06, E07, S02, P02, P05, I01, I02, I03), which need real media decoding or rendering.
- Browser layer (Playwright: Chromium, Firefox, WebKit, Google Chrome): every requirement, plus Shaka Player.

## Grading rules that keep one fault from being counted many times

- A client that never requests a Wrapper's target gets one deviation (W01); every other requirement whose vector starts with a Wrapper is n/a for it ("the client does not follow Wrappers"). W02 keeps its own verdict because it tests one particular Wrapper shape.
- Requirements that read a value another requirement already failed (a macro left unreplaced, progress events not supported, a pod not continued) return n/a with a pointer to that requirement.
- Error codes: the exact code conforms; the group's general code (100, 200, 300, 400) and 900 also conform, because the error table defines them and the text names 900 as the minimum.
