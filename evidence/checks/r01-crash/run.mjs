// Runs each scenario N times in a fresh process and records exit code, duration and stderr.
// usage: node run.mjs <package-alias> <reps> [scenario,...]  -> results/<alias>.jsonl
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { start } from './server.mjs';

const [pkg = 'vc650', reps = '5', only] = process.argv.slice(2);
const scenarios = only ? only.split(',') : ['control_inline', 'control_wrapper', 'control_slow_under_timeout',
  'top_hang', 'wrapper_hang', 'wrapper_slow_over_timeout', 'wrapper_hang_defensive', 'concurrent_50_one_slow', 'body_stall', 'service'];
fs.mkdirSync('results', { recursive: true });
const outFile = `results/${pkg}${only ? '-' + only.replace(/,/g, '+') : ''}.jsonl`;
fs.writeFileSync(outFile, '');

function runOnce(scenario, port) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const p = spawn(process.execPath, ['child.mjs', pkg, scenario, String(port)]);
    let so = '', se = '';
    p.stdout.on('data', d => {
      so += d;
      // Service scenario: once listening, send 20 requests; request 10 uses a hanging Wrapper.
      const m = /"service-listening","port":(\d+)/.exec(so);
      if (m && !p._fired) { p._fired = true; p._svcP = fireService(+m[1], p).then(s => { p._svc = s; if (p.exitCode === null) setTimeout(() => p.kill('SIGTERM'), 300); }); }
    });
    p.stderr.on('data', d => { se += d; });
    p.on('exit', async (code, signal) => {
      if (p._svcP) await p._svcP;
      const events = so.trim().split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return { raw: l }; } });
      resolve({ pkg, scenario, code, signal, ms: Date.now() - t0, result: events.find(e => e.ev === 'result') || null,
        done: events.filter(e => e.ev === 'done').length, unhandled: events.filter(e => e.ev === 'unhandledRejection').length,
        service: p._svc || null, stderr: (se.match(/^(Error|\w+Error)[^\n]*/m) || [''])[0].slice(0, 200) });
    });
  });
}

async function fireService(svcPort, p) {
  const res = [];
  for (let i = 0; i < 20; i++) {
    const tag = i === 10 ? 'wrapper.xml%3Fto%3Dhang.xml' : 'inline.xml';
    const t0 = Date.now();
    const r = fetch(`http://127.0.0.1:${svcPort}/?tag=${tag}`).then(x => x.text()).then(() => 'ok', e => 'fail:' + (e.cause?.code || e.message));
    res.push(r.then(v => ({ i, v, ms: Date.now() - t0 })));
    await new Promise(r => setTimeout(r, 100));
  }
  const all = await Promise.all(res);
  return { ok: all.filter(x => x.v === 'ok').length, failed: all.filter(x => x.v !== 'ok').map(x => `${x.i}:${x.v}`) };
}

const srv = await start();
for (const sc of scenarios) for (let k = 0; k < +reps; k++) {
  const r = await runOnce(sc, srv.port);
  fs.appendFileSync(outFile, JSON.stringify(r) + '\n');
  console.log([sc, k, 'exit=' + r.code, r.signal || '', r.ms + 'ms', r.result ? JSON.stringify(r.result).slice(0, 120) : '(no result)',
    r.done ? 'done=' + r.done : '', r.service ? JSON.stringify(r.service) : '', r.stderr.slice(0, 110)].filter(Boolean).join('  '));
}
srv.close();
