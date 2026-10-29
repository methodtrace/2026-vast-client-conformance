# Online Resources to "Do Open-Source Video Ad Clients Follow VAST 4.3? An Empirical Study of Player Conformance"

Prashant Chaudhary, October 2026. These Online Resources hold the process and setup material that the paper summarizes (OR1 to OR4) and the full results (OR5). They are assembled from files already in the repository; no result was rerun and no number was recomputed except where a document says "computed". Each document names the source file for every number it copies.

| Resource | File | What it holds | Paper sections it supports |
|---|---|---|---|
| OR1 | OR1-client-survey.md | The 16 npm queries, package counts from 267 down to the tested set, the four-condition selection rule, every candidate with decision and reason, the four eligible but untested players, derivatives of vast-client-js, the npm download-count anomaly | 4.1, 7 |
| OR2 | OR2-validity-log.md | The validity checks of Section 4.6, one by one: for each of the five checks of Table 4 (source tracing, standalone reproduction, driver audits, determinism, access check) and the three automated consistency audits of Table 4b (separate automated reviewers: catalog review, re-derivation for two clients, re-derivation for three clients), the procedure, inputs, scope, outcome counts as the paper gives them and the evidence paths; the mutation-fuzzing method (seed 20261017, rounds and cases, seed check, replay option with commands, saturation) | 4.4, 4.6, 5.2, 5.3, Appendix D |
| OR3 | OR3-shaka-5.3.0.md | Shaka Player 5.3.0 against 5.2.12: version, harness, totals, the 11 verdict changes with causes, same-verdict wire changes, rechecks, which paper findings hold | 4.1, 5.1.3, 7, 8 |
| OR4 | OR4-ima-setup.md | IMA pinning and archive manifest (recorded once from Google's servers on 2026-10-16; URLs and hashes only), telemetry stubbing including the ad-traffic-quality hosts, network containment (in every reported run all requests went to local servers or were answered from the archive or the local stub), HTTPS server and certificate, Local Network Access flag, click mechanics, skip behavior as observed, why Safari did not run IMA, and for each of the eight IMA findings (F79 to F86) the black-box evidence: the requests the server logged, the errors IMA's public API raised and the three probes (IMA is graded only from its requests and public API; no mechanism is taken from its code) | 4.3, 5.1.5, 7 |
| OR5 | OR5-full-results.md; OR5-by-client.md; OR5-by-duty.md | The catalog with the obligation sentence behind every requirement, the full macro grid, every verdict by client and by duty group with the oracle detail of each deviating cell, and the strength-label sensitivity per configuration. The two generated views are online-resources/OR5-by-client.md and online-resources/OR5-by-duty.md in the replication package | Appendix A, Table 7, 5.1, 5.1.6 |

## Conventions

- Paths are relative to the root of the replication repository. The archived IMA SDK files under sources/ima-html5/ are not distributed; only their README and index are.
- Dates are the dates on the cited files.
- ASCII only, no em dashes.
