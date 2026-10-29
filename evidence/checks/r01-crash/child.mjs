// One scenario in its own process, so a crash shows up as the process exit code.
// usage: node child.mjs <package-alias> <scenario> <port>
import http from 'node:http';
const [pkg, scenario, port] = process.argv.slice(2);
const { VASTClient } = await import(pkg);
const base = `http://127.0.0.1:${port}`;
const out = o => process.stdout.write(JSON.stringify({ t: Date.now(), ...o }) + '\n');

// Defensive integrator: catch everything a well-behaved app would catch, except uncaughtException.
const defensive = () => process.on('unhandledRejection', e => out({ ev: 'unhandledRejection', msg: String(e) }));

async function getOne(url, opts) {
  try {
    const r = await new VASTClient().get(url, opts);
    return { ok: true, ads: r.ads.length, errorURLTemplates: r.errorURLTemplates.length };
  } catch (e) { return { ok: false, caught: String(e && e.message || e) }; }
}

const S = {
  // Controls: nothing slow, so no timer should fire.
  control_inline: () => getOne(`${base}/inline.xml`, { timeout: 500 }),
  control_wrapper: () => getOne(`${base}/wrapper.xml?to=inline.xml`, { timeout: 500 }),
  control_slow_under_timeout: () => getOne(`${base}/slow.xml?ms=200`, { timeout: 1000 }),
  // Faults.
  top_hang: () => getOne(`${base}/hang.xml`, { timeout: 500 }),
  wrapper_hang: () => getOne(`${base}/wrapper.xml?to=hang.xml`, { timeout: 500 }),
  wrapper_slow_over_timeout: () => getOne(`${base}/wrapper.xml?to=slow.xml%3Fms%3D3000`, { timeout: 500 }),
  wrapper_hang_defensive: () => { defensive(); return getOne(`${base}/wrapper.xml?to=hang.xml`, { timeout: 500 }); },
  // Default settings: no timeout option, so the library's 120 s default applies.
  wrapper_hang_default_timeout: () => getOne(`${base}/wrapper.xml?to=hang.xml`, {}),
  // 50 concurrent requests, one of them slow: how many finish before the process dies?
  concurrent_50_one_slow: async () => {
    defensive();
    const jobs = [];
    for (let i = 0; i < 50; i++) {
      // Request 25 hits a hanging Wrapper with a 500 ms timeout; the other 49 are healthy, take 600-2070 ms
      // and have a 5 s timeout, so none of them should ever time out on its own.
      const slow = i === 25;
      const url = slow ? `${base}/wrapper.xml?to=hang.xml` : `${base}/slow.xml?ms=${600 + i * 30}`;
      jobs.push(getOne(url, { timeout: slow ? 500 : 5000 }).then(r => { out({ ev: 'done', i, ...r }); return r; }));
    }
    return Promise.all(jobs).then(rs => ({ finished: rs.length }));
  },
  // Body stall: headers in time, body never completes. The timer is cleared when headers arrive.
  body_stall: async () => {
    const t0 = Date.now();
    const r = await Promise.race([getOne(`${base}/stall.xml`, { timeout: 500 }), new Promise(res => setTimeout(() => res({ hung: true }), 30000))]);
    return { ...r, waitedMs: Date.now() - t0 };
  },
  // Server-side use: an HTTP service that resolves a tag per request.
  service: async () => {
    defensive();
    const svc = http.createServer(async (req, res) => {
      const tag = new URL(req.url, 'http://x').searchParams.get('tag');
      const r = await getOne(`${base}/${tag}`, { timeout: 500 });
      res.end(JSON.stringify(r));
    });
    await new Promise(r => svc.listen(0, '127.0.0.1', r));
    out({ ev: 'service-listening', port: svc.address().port });
    await new Promise(() => {}); // run until killed
  },
};

out({ ev: 'start', scenario, node: process.version });
const r = await S[scenario]();
out({ ev: 'result', ...r });
process.exit(0);
