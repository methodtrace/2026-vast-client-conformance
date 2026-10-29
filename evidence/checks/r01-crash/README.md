# R01 reproduction: vast-client-js timeout kills the Node.js process

Run 2026-10-16, independent of the harness: separate folder, fresh npm installs, a standalone local server (server.mjs), each scenario in its own child process (child.mjs) so a crash shows as the exit code (run.mjs). Raw results: results/*.jsonl.

## Root cause

src/fetcher/url_handler.js, get() (6.5.0, and main at 73c67bd, 2026-09-30):

```js
const timer = setTimeout(() => {
  controller.abort();
  throw new Error(`URLHandler: Request timed out after ${options.timeout || DEFAULT_TIMEOUT} ms (408)`);
}, options.timeout || DEFAULT_TIMEOUT);
```

The throw runs inside a timer callback, outside the async function's try/catch and outside any promise. In Node.js it is an uncaughtException, and the process exits with code 1. The abort alone already makes fetch reject with AbortError, which the existing catch maps to statusCode 408, so the throw is redundant. Removing it (patched copy, vc650p) fixes every scenario below.

## Results (exit code 1 = process died)

vast-client-js 6.5.0, Node.js 22.22.0, 20.20.2 and 24.22.0:

| Scenario | Runs | Outcome |
|---|---|---|
| Controls: InLine, Wrapper to InLine, response slower than usual but under the timeout | 21 | 21 exit 0, ad returned |
| Top-level tag never responds (timeout 500 ms) | 5 | 5 crash at about 0.65 s |
| Wrapper target never responds | 11 | 11 crash |
| Wrapper target responds after 3 s, timeout 500 ms | 5 | 5 crash |
| Same, integrator catches every rejection (try/catch around await, unhandledRejection handler) | 5 | 5 crash |
| No timeout option (library default 120 s) | 1 | crash at 120.2 s |
| 50 concurrent requests, 49 healthy (5 s timeout, 0.6 to 2.1 s responses), 1 hanging Wrapper (500 ms) | 11 | 11 crash; 0 of 49 healthy requests complete |
| HTTP service resolving one tag per incoming request, 20 requests 100 ms apart, request 10 has a hanging Wrapper | 11 | 11 crash; the bad request and the one in flight fail, every later request gets ECONNREFUSED |

49 fault runs, 49 crashes; 21 control runs, 0 crashes. Node 20 and 24 behave the same as Node 22.

Versions (Wrapper hang, plus concurrency and service where listed):

| Version | Outcome |
|---|---|
| 5.0.0 | no crash; returns no ads |
| 6.0.0, 6.0.1, 6.0.2 | Node build unusable: every request fails with "ReferenceError: window is not defined" |
| 6.1.0, 6.2.0, 6.4.0, 6.4.5, 6.5.0 | crash in every run |
| 6.5.0 with the throw removed | no crash; returns no ads; concurrency 50/50; service 20/20 |

So 6.1.0 (the first release whose Node build works after the move to fetch) through 6.5.0 and main are affected.

## Second defect in the same function

The timer is cleared when fetch resolves, which is when the headers arrive. A server that sends 200 headers and then stalls the body leaves get() waiting with no library timeout: with timeout 500 ms, 5 of 5 runs were still waiting at 30 s (body_stall). Only Node's own fetch body timeout ends it. Not a crash, but a stalled ad request.

## Browsers

In a browser the same throw is an uncaught page error (window.onerror); the page survives and the request resolves through the AbortError path (the R01 cells of the browser references). The crash is a Node.js issue, and @dailymotion/vast-client ships a dedicated Node build (main: dist/vast-client-node.min.js).

## Reproduce

```
cd evidence/checks/r01-crash
npm i vc650@npm:@dailymotion/vast-client@6.5.0
node run.mjs vc650 5
```

The patched copy: copy node_modules/vc650 to patched/vc650p, replace `throw r.abort(),new Error("URLHandler: Request timed out after ".concat(t.timeout||q," ms (408)"))` with `r.abort()` in dist/vast-client-node.min.js, symlink it as node_modules/vc650p, then `node run.mjs vc650p 3 control_wrapper,wrapper_hang,concurrent_50_one_slow,service`.

## Disclosure channel

The repository has no SECURITY.md. Dailymotion's security.txt lists security@dailymotion.com and the policy at https://faq.dailymotion.com/hc/en-us/p/vulnerability-disclosure.

## Upstream fix

Pull request https://github.com/dailymotion/vast-client-js/pull/515 (opened 2026-10-28) bounds the response body read by the request timeout and removes the throw from the timer callback, the change also proposed in https://github.com/dailymotion/vast-client-js/pull/514.
