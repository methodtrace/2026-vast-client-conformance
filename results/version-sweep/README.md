# Version sweep, regraded

The Node.js version sweep (results/version-sweep/as-run/<client>/<release>/results.jsonl, 36 releases of four clients), regraded with the oracles in code/harness/suite at the working tree by `node suite/regrade.mjs <results.jsonl> --layer node --out <file>`. No release was rerun. The sweep grades A01, A02, R04, R05 and M06 to M09 on their Wrapper-first or FLV-first vector variants. Table 9 of the paper is computed from these files.
