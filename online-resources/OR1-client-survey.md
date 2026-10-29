# Online Resource 1: Client survey and selection record

Online Resource 1 to "Do Open-Source Video Ad Clients Follow VAST 4.3? An Empirical Study of Player Conformance" (Prashant Chaudhary, October 2026). Section 4.1 of the paper states the selection rule and the client set in summary. This document gives the full record behind it: the sixteen registry queries, the package counts at each step, the rule, the decision and reason for every candidate, the four eligible players that were not tested, the derivatives of vast-client-js, and the pattern in npm download counts that led the study not to use them. Paths are relative to the root of the replication repository. Each number is followed by the file it was copied from; a number marked "computed" was calculated for this document from the files named beside it.

## 1. What was surveyed and when

- Survey date: October 16, 2026 (results/survey/npm-sweep-2026-10-16.meta.json, field "date").
- Registry source: registry.npmjs.org search endpoint, `size=250` per query (same file, field "registry"). Download counts: api.npmjs.org `point/last-month` (same file, field "downloads"), taken at survey time.
- Candidate data: results/survey/npm-candidates-2026-10-16.json (267 entries; per package: description, last release date, version, repository, last-month downloads). Metadata and dependency lists for the 25 plausible clients: results/survey/npm-metadata-2026-10-16.json (per package: version, license, repository, dependencies, number of versions, last release date, first release date).
- Second source of names: a catalog of DASH playback pathologies kept by the author (713 rows), used only as a list of client names; its findings belong to a separate study. The names in its "affected" field are almost all closed commercial players (THEOplayer, JW Player, Bitmovin, Brightcove plugins, Google IMA and IMA DAI, Roku RAF). The open-source names it holds are Shaka Player (already in the set), dash.js and Media3/ExoPlayer (no VAST handling of their own; Media3 ads go through the closed IMA extension), videojs-contrib-ads (an ad-state framework with no VAST parser) and videojs-ima (an IMA wrapper). It added Google IMA to the list and nothing else that parses VAST.
- Hand inspection: packages whose classification was not clear from their metadata were unpacked with `npm pack` (install scripts off) and searched for their own handling of `VASTAdTagURI`, `TrackingEvents` and `[ERRORCODE]`, and for loading the IMA SDK. Ten packages were unpacked this way; their names were not kept.
- rmp-vast 17.2.0 was cloned from GitHub. The npm package of the same name stops at 6.0.0 (results/survey/npm-metadata-2026-10-16.json: version 6.0.0, last release 2022-06-24).

## 2. The sixteen queries

Source for every row: results/survey/npm-sweep-2026-10-16.meta.json, field "queries" (value = number of results the registry returned for that query). The request size was 250, so a value of 250 means the returned list was at the requested size; the files do not say whether more results existed.

| # | Query | Results returned |
|---|---|---|
| 1 | vast parser | 250 |
| 2 | vast 4 | 250 |
| 3 | vast wrapper | 250 |
| 4 | vast | 250 |
| 5 | vmap | 91 |
| 6 | vast tracker | 250 |
| 7 | iab vast | 250 |
| 8 | ssai vast | 250 |
| 9 | vast client | 250 |
| 10 | ad pod | 250 |
| 11 | vast xml | 250 |
| 12 | video ad | 250 |
| 13 | vast player | 250 |
| 14 | vpaid | 52 |
| 15 | simid | 13 |
| 16 | videojs vast | 250 |

Computed: the 16 values add up to 3,406 (13 queries at 250, plus 91, 52 and 13). Thirteen queries returned exactly the requested size. Only vmap, vpaid and simid returned fewer than 250, so only those three lists are known to be complete.

Filter applied to the pooled results (same file, field "filter"): a package is kept when its name, description or keywords match the regular expression `\bvast\b|vmap|vpaid|simid|\bima\b`. These are the five terms the paper names in Section 4.1 (VAST, VMAP, VPAID, SIMID, IMA).

## 3. Package counts at each step

| Step | Count | Source |
|---|---|---|
| Result rows summed over the 16 queries (with repeats across queries) | 3,406 (computed) | results/survey/npm-sweep-2026-10-16.meta.json |
| Unique packages before the keyword filter | not stored | no file states it |
| Packages after the keyword filter | 267 | results/survey/npm-candidates-2026-10-16.json (267 keys); paper Section 4.1 |
| Plausible clients with metadata and dependency lists | 25 | results/survey/npm-metadata-2026-10-16.json (25 keys) |
| Packages unpacked and searched by hand | 10 | Section 1 above |
| Clients in the set before the survey | 4 (vast-client-js 6.5.0, video-ad-sdk 4.0.1, iab-vast-loader 2.5.1, Shaka Player 5.2.12) | paper Section 4.1 (three established libraries, plus Shaka Player added by hand) |
| New candidates considered for testing | 7: vastlint-client 0.15.0 (passes all four conditions), rmp-vast 17.2.0 (fails condition 2), Google IMA HTML5 (fails condition 1), and four small players that pass all four conditions | paper Section 4.1; sections 5 and 6 below |
| New candidates tested | 3 (vastlint-client, rmp-vast, IMA) | paper Section 4.1 |
| New candidates eligible and not tested | 4 | paper Sections 4.1 and 7 |
| Tested client set | 7 clients: vast-client-js, video-ad-sdk, iab-vast-loader, vastlint-client, rmp-vast, Shaka Player, Google IMA (computed: 4 chosen before the survey plus 3 new). Eight open-source configurations, seven in the browsers and five under Node.js; IMA adds one browser configuration | results/reference/first-run/README.md (configurations); paper Section 4.1 and Table 1 |

Tally of the 25 packages in the metadata file by decision (computed; sections 5 and 6 below list every package):

| Decision | Count | Packages |
|---|---|---|
| Tested, or tested under another distribution | 2 | vastlint-client; rmp-vast (the npm name; the tested code is the GitHub 17.2.0 distribution) |
| Eligible, not tested | 4 | itube-modern-player, streamit-player, ts-video-player, stormcloud-video-player |
| Excluded: wrapper of the IMA SDK (condition 2) | 4 | @glomex/vast-ima-player, artplayer-plugin-vast, xgplayer-ads, @playkit-js/playkit-js-ima |
| Excluded: derivative of vast-client-js (condition 2) | 5 | @openplayerjs/ads, @arte/videojs-vast, ads-manager, videojsx-vast-plugin, @videointelligence/vast-client |
| Excluded: closed or unlicensed (condition 1) | 2 | @dailymotion/ad-sdk-web, @getstoryteller/react-native-storyteller-sdk-vast |
| Excluded: parser only or no release in 24 months (conditions 3 and 4) | 4 | @ygoto3/omap-vast-parser, videojs-vast-vpaid, vastacular, vast-player |
| Not assigned a decision in the survey | 4 | @ygoto3/omap-vmap-parser, @pavloniym/rmp-vast, vjs-vast, @trillboards/ads-sdk |
| Total | 25 | |

The funnel is not strictly nested. Several packages with a decision are not among the 25: video-ad-sdk, iab-vast-loader and @dailymotion/vast-client were already in the set, and videojs-ima, videojs-ima-player, ima-ad-player, ima-wrapper, vast-xml, vast-builder, vastlint, @types/vast-client and react-native-vast-client are in the 267-package file but not in the 25-package file. Shaka Player is in neither file, because the npm queries did not return it. `@ygoto3/omap-iab-client` 0.0.6 is also in neither file (section 5, group G).

## 4. The selection rule

The four conditions are those of paper Section 4.1. A package is a client for this study when all four hold:

1. An OSI-approved license in the published package.
2. Its own VAST implementation, not a wrapper of vast-client-js, video-ad-sdk or the IMA SDK.
3. It does at least one of Wrapper resolution or tracking. A parser that does neither is out of scope.
4. A release on or after October 16, 2024 (24 months before the survey date).

Two further statements go with the rule:

- Wrappers of IMA are covered by testing IMA itself.
- Derivatives of vast-client-js are listed (section 7) so that a reader can judge the reach of findings that trace to vast-client-js; they are not tested.

Clients in the tested set that do not meet all four conditions, and why they are included:

- video-ad-sdk and iab-vast-loader were chosen before the survey as the established independent libraries. They fail condition 4 today (last releases 2024-04-22 and 2021-02-25 in results/survey/npm-candidates-2026-10-16.json). They are kept because they remain installed in players and their behavior is what those players do (paper Section 4.1).
- rmp-vast 17.2.0 imports `VASTClient` from @dailymotion/vast-client 6.4.2, which it bundles (rmp-vast `src/js/index.js` line 13 and `package-lock.json` at commit 5975ead). It therefore fails condition 2 for fetching, parsing and the Wrapper chain. It is kept as the production player built on vast-client-js, a real integration of that library (paper Section 4.1). The bundling does not show in package metadata or in a search for package names, because a bundled dependency carries no package name in the built file; it shows in the source import and the lockfile. Each of the other new candidates was searched for vast-client-js signatures (`nextWrapperURL`, `VAST-warning`, `VASTClient`), and none carries them.
- Google IMA is proprietary and fails condition 1. It is kept as a closed comparison and was pinned by archiving the served ima3.js with its sha256 (Online Resource 4).
- Shaka Player was not selected through the four conditions. It was added by hand because it is a widely used media player with its own VAST parser that the npm queries did not return under these keywords (paper Section 4.1).

Every tested client is reported in the paper.

## 5. Every candidate, its decision and its reason

Columns: version, last release and last-month downloads are copied from results/survey/npm-candidates-2026-10-16.json; license is copied from results/survey/npm-metadata-2026-10-16.json where the package is in that file. Group I lists the packages in the metadata file that were not assigned a decision, with only the facts in the data files.

### A. In the client set before the survey (4)

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Reason |
|---|---|---|---|---|---|---|---|
| @dailymotion/vast-client | 6.5.0 | not in metadata file | 2026-09-30 | 253,377 | no | tested (vast-client-js) | established independent library, chosen before the survey |
| video-ad-sdk | 4.0.1 | not in metadata file | 2024-04-22 | 379 | no | tested | established independent library, chosen before the survey; fails condition 4 today (last release 2024-04-22, before 2024-10-16); kept because it remains installed in players |
| iab-vast-loader | 2.5.1 | not in metadata file | 2021-02-25 | 276 | no | tested (two configurations) | established independent library, chosen before the survey, and the library behind IAB Tech Lab's VAST tester; fails condition 4 today (last release 2021-02-25); kept because it remains installed in players |
| shaka-player | 5.2.12 (tested release) | not in the survey files | not in the survey files | not in 267-package file | not in file | tested (browser layer only) | added by hand: a widely used media player with its own VAST parser; not selected through the four conditions; the npm queries did not return it |

### B. New, tested (3)

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Reason |
|---|---|---|---|---|---|---|---|
| rmp-vast (GitHub distribution) | 17.2.0 | MIT | 2026-02-26 | not applicable (not on npm at this version) | no | tested, two configurations | MIT, released 2026-02-26; fails condition 2 for fetching, parsing and the Wrapper chain (bundles @dailymotion/vast-client 6.4.2); kept as the production player built on vast-client-js |
| rmp-vast | 6.0.0 | MIT | 2022-06-24 | 183 | yes | not tested at this version | the npm package stops at 6.0.0, released 2022-06-24; the tested code is the GitHub 17.2.0 distribution |
| vastlint-client | 0.15.0 | Apache-2.0 | 2026-10-13 | 2,293 | yes | tested | passes all four conditions: Apache-2.0, released 2026-10-13; a session runtime from the VASTlint project, by Aleksander Sekowski; 52 versions in the metadata file |
| Google IMA HTML5 SDK | 3.794.0 (archived) | proprietary | not applicable | not applicable | no | tested as closed comparison | proprietary, so it fails condition 1; kept as a closed comparison; browser only; pinned by archiving the served ima3.js with its sha256 |

### C. New, pass the rule, not tested (4)

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Reason |
|---|---|---|---|---|---|---|---|
| itube-modern-player | 0.15.1 | MIT | 2026-10-13 | 413 | yes | eligible, not tested | VAST 2 to 4, InLine and Wrapper, quartile pixels; Bitbucket repository |
| streamit-player | 1.1.0 | Apache-2.0 | 2026-10-15 | 255 | yes | eligible, not tested | VAST 2.0 to 4.2, VMAP, SIMID; also an IMA path |
| ts-video-player | 0.1.10 | MIT | 2026-10-15 | 23,336 | yes | eligible, not tested | small VAST module; its download count (23,336) is one of the three near-equal figures in section 8 |
| stormcloud-video-player | 0.8.79 | MIT | 2026-10-13 | 5,055 | yes | eligible, not tested | own VAST path plus IMA; no repository listed |

### D. Excluded: wrappers of the IMA SDK (condition 2)

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Reason |
|---|---|---|---|---|---|---|---|
| videojs-ima | 2.6.0 | not in metadata file | 2026-02-06 | 171,277 | no | excluded | IMA wrapper; covered by testing IMA itself |
| @glomex/vast-ima-player | 1.21.2 | Apache-2.0 | 2024-09-10 | 18,746 | yes | excluded | IMA wrapper; also last release 2024-09-10 (condition 4) |
| artplayer-plugin-vast | 1.0.0 | MIT | 2024-10-12 | 233 | yes | excluded | IMA wrapper, via @glomex/vast-ima-player; also last release 2024-10-12 (condition 4) |
| xgplayer-ads | 3.0.26 | MIT | 2026-07-15 | 527 | yes | excluded | IMA wrapper |
| @playkit-js/playkit-js-ima | 1.7.4 | AGPL-3.0 | 2026-08-06 | 934 | yes | excluded | IMA wrapper |
| videojs-ima-player | 0.6.9 | not in metadata file | 2026-07-20 | 8,536 | no | excluded | IMA wrapper |
| ima-ad-player | 0.5.7 | not in metadata file | 2024-10-27 | 640 | no | excluded | IMA wrapper |
| ima-wrapper | 1.0.8 | not in metadata file | 2023-02-20 | 139 | no | excluded | IMA wrapper |

### E. Excluded: derivatives of vast-client-js (condition 2; listed in section 7)

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Reason |
|---|---|---|---|---|---|---|---|
| @openplayerjs/ads | 3.6.5 | MIT | 2026-09-01 | 1,123 | yes | excluded, listed | depends on @dailymotion/vast-client (metadata file) |
| @arte/videojs-vast | 1.5.4 | Apache-2.0 | 2026-02-06 | 245 | yes | excluded, listed | depends on @dailymotion/vast-client (metadata file) |
| ads-manager | 1.2.16 | Apache-2.0 | 2025-02-16 | 400 | yes | excluded, listed | depends on @dailymotion/vast-client (metadata file) |
| videojsx-vast-plugin | 1.0.4 | MIT | 2022-04-21 | 249 | yes | excluded, listed | depends on the old npm package vast-client (metadata file) |
| @videointelligence/vast-client | 4.0.6 | MIT | 2024-06-21 | 144 | yes | excluded, listed | fork of an old vast-client-js release (repository field points to dailymotion/vast-client-js) |
| react-native-vast-client | 2.5.1 | not in metadata file | 2019-12-16 | 386 | no | excluded, listed | fork of an old release (repository sina-moammar/vast-client-js); not in the 25-package metadata file |

### F. Excluded: closed or unlicensed (condition 1)

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Reason |
|---|---|---|---|---|---|---|---|
| @dailymotion/ad-sdk-web | 2.8.0 | none declared | 2026-09-29 | 968 | yes | excluded | no license field |
| @getstoryteller/react-native-storyteller-sdk-vast | 12.1.1 | custom (see package) | 2026-10-13 | 471 | yes | excluded | license field points to a custom license text, not an OSI license |

### G. Excluded: parser only, or no release in 24 months (conditions 3 and 4)

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Reason |
|---|---|---|---|---|---|---|---|
| @ygoto3/omap-vast-parser | 0.0.3 | MIT | 2024-03-28 | 23,042 | yes | excluded | parser only; last release 2024-03-28; a dash.js ad player parser |
| @ygoto3/omap-iab-client | 0.0.6 | not in the survey files | 2024-03-28 | not in the survey files | no | excluded | last release 2024-03-28 (condition 4); this package is not in results/survey/npm-candidates-2026-10-16.json or the metadata file |
| videojs-vast-vpaid | 3.0.0-beta.8 | MIT | 2017-03-31 | 1,264 | yes | excluded | last release 2017; video-ad-sdk predecessor |
| vastacular | 0.2.0 | MIT | 2016-02-11 | 558 | yes | excluded | last release 2016 |
| vast-player | 0.2.10 | MIT | 2017-09-05 | 632 | yes | excluded | last release 2017 |
| vast-xml | 1.3.0 | not in metadata file | 2015-02-02 | 618 | no | excluded | writer, not a client |
| vast-builder | 4.0.1 | not in metadata file | 2019-03-20 | 3,182 | no | excluded | writer, not a client |

### H. Excluded: not clients

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Reason |
|---|---|---|---|---|---|---|---|
| vastlint | 0.15.0 | not in metadata file | 2026-10-13 | 2,908 | no | excluded | validator, not a client (vastlint-client is the client) |
| @types/vast-client | 3.0.4 | not in metadata file | 2023-11-07 | 25,721 | no | excluded | type definitions |
| vast | 2.0.18 | not in metadata file | 2026-10-03 | 85,042 | no | excluded | the English word "vast" (a state container library) |

### I. In the 25-package metadata file, not assigned a decision

| Package | Version in file | License | Last release | Downloads, last month | In 25-package metadata file | Decision | Facts in the data files |
|---|---|---|---|---|---|---|---|
| @ygoto3/omap-vmap-parser | 0.0.1 | MIT | 2023-12-13 | 23,077 | yes | none | release 2023-12-13, before 2024-10-16, so it fails condition 4; description says VMAP parser |
| @pavloniym/rmp-vast | 17.0.1-esm-v3 | MIT | 2025-08-07 | 530 | yes | none | 4 versions, repository pavloniym/rmp-vast; the name and description match rmp-vast, which suggests a repackaging of it; not inspected |
| vjs-vast | 0.0.1 | MIT | 2020-06-14 | 137 | yes | none | release 2020-06-14 (fails condition 4); repository MailOnline/videojs-vast-vpaid |
| @trillboards/ads-sdk | 2.4.9 | MIT | 2026-09-01 | 2,256 | yes | none | MIT, release 2026-09-01; description says a digital signage (DOOH) advertising SDK; dependencies are react, react-dom, react-native and react-native-webview; not inspected |

Outside the JavaScript harness: native SDKs (the Media3 IMA extension, Kaltura native, Roku RAF) and Go or Python struct libraries, which neither resolve Wrappers nor track. A Go parser, haxqer/vast, is excluded because it is a data-binding library with no player duties to test.

## 6. The four eligible players that were not tested

Source: section 5, group C; paper Sections 4.1 and 7. They pass the four conditions: they are recent small players with embedded VAST engines.

| Client | Version | License | Last release | Notes | Last-month downloads (npm-candidates file) |
|---|---|---|---|---|---|
| itube-modern-player | 0.15.1 | MIT | 2026-10-13 | VAST 2 to 4, InLine and Wrapper, quartile pixels; Bitbucket repository | 413 |
| streamit-player | 1.1.0 | Apache-2.0 | 2026-10-15 | VAST 2.0 to 4.2, VMAP, SIMID; also an IMA path | 255 |
| ts-video-player | 0.1.10 | MIT | 2026-10-15 | small VAST module | 23,336 |
| stormcloud-video-player | 0.8.79 | MIT | 2026-10-13 | own VAST path plus IMA; no repository listed | 5,055 |

Why they were not tested: they embed VAST code in a larger player instead of offering it as a library (paper Section 4.1), and testing them is left to future work. The harness has no adapter for any of them: code/harness/adapters/ holds env, fakevideo, iabloader, normalize, run, vastclient, vastlint and videoadsdk, and code/harness/browser/ holds the browser entry points and adapters for the tested clients only. Whether the results generalize to these four players is not known (paper Section 7, External validity).

## 7. Derivatives of vast-client-js

Dependency facts come from results/survey/npm-metadata-2026-10-16.json, and repository facts for react-native-vast-client from results/survey/npm-candidates-2026-10-16.json.

| Package | Version | Last release | Relationship to vast-client-js |
|---|---|---|---|
| @openplayerjs/ads | 3.6.5 | 2026-09-01 | depends on @dailymotion/vast-client and @dailymotion/vmap |
| @arte/videojs-vast | 1.5.4 | 2026-02-06 | depends on @dailymotion/vast-client and @dailymotion/vmap |
| ads-manager | 1.2.16 | 2025-02-16 | depends on @dailymotion/vast-client |
| videojsx-vast-plugin | 1.0.4 | 2022-04-21 | depends on the old npm package `vast-client` |
| @videointelligence/vast-client | 4.0.6 | 2024-06-21 | repository field points to dailymotion/vast-client-js; a fork of an old release |
| react-native-vast-client | 2.5.1 | 2019-12-16 | not in the metadata file; repository sina-moammar/vast-client-js; a fork of an old release |

In addition, rmp-vast 17.2.0 bundles vast-client-js 6.4.2 and is tested (section 4). None of the six derivatives was run, so whether each inherits the timeout defect of vast-client-js (paper Section 5.1.3) is not tested. The version history in paper Section 5.4 shows that vast-client-js 5.0.0 does not crash, that 6.0.0 to 6.0.2 fail every plain Node.js request on an undefined `window`, and that 6.1.0 to 6.5.0 crash. A derivative that forks an old release or depends on the old `vast-client` package may therefore not be affected. The paper (Section 7, External validity) states that findings that trace to vast-client-js apply to players that bundle an affected release, and lists the derivatives as not tested.

## 8. npm download counts

What the paper says (Section 4.1, Sampling): download counts were not used to select clients, because three small packages in the survey show nearly equal monthly counts (about 23,000 each) that look like a mirror or an automated client.

The three packages (results/survey/npm-candidates-2026-10-16.json, last-month downloads at survey time; versions and first release from the metadata file):

| Package | Last-month downloads | Last release | Versions | First release |
|---|---|---|---|---|
| @ygoto3/omap-vast-parser | 23,042 | 2024-03-28 | 4 | 2023-12-13 |
| @ygoto3/omap-vmap-parser | 23,077 | 2023-12-13 | 2 | 2023-12-13 |
| ts-video-player | 23,336 | 2026-10-15 | 11 | 2026-07-22 |

Computed from the table: the three figures lie within 294 downloads of each other (23,336 minus 23,042), about 1.3 percent. Two of the three come from one author (repository ygoto3/omap). No other package in the 267-package file has a count between 22,000 and 24,500.

Reading of the pattern: two of the packages have had no release for more than 30 months (last releases 2024-03-28 and 2023-12-13, against a survey date of 2026-10-16) and still report about 23,000 downloads a month, and ts-video-player is under four months old. This is consistent with a mirror or automated downloads, but that explanation was not tested.

How counts are used: not as a selection criterion. A separate context file, results/survey/npm-downloads-2026-09.json (retrieved 2026-10-09 from api.npmjs.org, September 2026), holds the counts shaka-player 1,562,574; @dailymotion/vast-client 237,487; iab-vast-parser 12,554; video-ad-sdk 388; iab-vast-loader 224. The paper's introduction uses the first two (about 1.6 million and about 237,000) as context for how widely the libraries are used.
