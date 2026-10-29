// Minimal W3C WebDriver client (plain HTTP, no dependency) for Safari's safaridriver, used by browser/run-safari.mjs.
// Only the commands the Safari runner needs: sessions, timeouts, navigation, script execution, elements, frames,
// windows and pointer actions. Every failure is a WebDriverError carrying the W3C error code ('session not created',
// 'javascript error', 'no such element', ...), the HTTP status and the driver's message.
// Spec: https://www.w3.org/TR/webdriver2/ ; Safari's driver: https://developer.apple.com/documentation/webkit/about-webdriver-for-safari
import net from 'node:net';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

export const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export class WebDriverError extends Error {
  constructor(error, message, { status = null, command = null, data = null } = {}) {
    super(`${error}: ${message}`);
    this.error = error; this.driverMessage = message; this.status = status; this.command = command; this.data = data;
  }
}

export class WebDriver {
  // base: http://127.0.0.1:<port> (safaridriver serves the W3C endpoints at the root)
  constructor(base, { commandTimeoutMs = 60000 } = {}) { this.base = base.replace(/\/$/, ''); this.commandTimeoutMs = commandTimeoutMs; }

  async req(method, path, body, { timeoutMs } = {}) {
    const command = `${method} ${path}`;
    let res, text;
    try {
      res = await fetch(this.base + path, {
        method, headers: { 'content-type': 'application/json; charset=utf-8' },
        body: method === 'POST' ? JSON.stringify(body === undefined ? {} : body) : undefined,
        signal: AbortSignal.timeout(timeoutMs ?? this.commandTimeoutMs),
      });
      text = await res.text();
    } catch (e) {
      const timedOut = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
      throw new WebDriverError(timedOut ? 'harness timeout' : 'connection failed', `${command}: ${String(e && e.message || e)}`, { command });
    }
    let json = null;
    try { json = text ? JSON.parse(text) : {}; } catch { throw new WebDriverError('invalid response', `${command}: HTTP ${res.status}, not JSON: ${text.slice(0, 200)}`, { status: res.status, command }); }
    const v = json && json.value;
    if (!res.ok || (v && typeof v === 'object' && typeof v.error === 'string')) {
      throw new WebDriverError(v && v.error || `http ${res.status}`, v && v.message || text.slice(0, 300), { status: res.status, command, data: v && v.data });
    }
    return v === undefined ? null : v;
  }

  status() { return this.req('GET', '/status', undefined, { timeoutMs: 5000 }); }

  // capabilities: { alwaysMatch, firstMatch }. Returns a Session.
  async newSession(capabilities = { alwaysMatch: { browserName: 'safari' } }, { timeoutMs = 60000 } = {}) {
    const v = await this.req('POST', '/session', { capabilities }, { timeoutMs });
    if (!v || !v.sessionId) throw new WebDriverError('session not created', `no sessionId in response: ${JSON.stringify(v).slice(0, 200)}`);
    return new Session(this, v.sessionId, v.capabilities || {});
  }

  // Safari allows one session at a time; a new session right after a delete can find the browser still paired.
  async newSessionRetry(capabilities, { attempts = 4, waitMs = 1500, onRetry = () => {} } = {}) {
    let last;
    for (let i = 1; i <= attempts; i++) {
      try { return await this.newSession(capabilities); }
      catch (e) {
        last = e;
        // a refused capability or a disabled driver does not get better by retrying
        if (/could not be honored|Allow Remote Automation|remote automation|invalid argument/i.test(e.message)) throw e;
        if (i < attempts) { onRetry(e, i); await sleep(waitMs * i); }
      }
    }
    throw last;
  }
}

export class Session {
  constructor(wd, id, capabilities) { this.wd = wd; this.id = id; this.capabilities = capabilities; }
  cmd(method, sub, body, opts) { return this.wd.req(method, `/session/${this.id}${sub}`, body, opts); }
  delete() { return this.cmd('DELETE', ''); }
  setTimeouts(t) { return this.cmd('POST', '/timeouts', t); }
  navigate(url, opts) { return this.cmd('POST', '/url', { url }, opts); }
  currentUrl() { return this.cmd('GET', '/url'); }
  title() { return this.cmd('GET', '/title'); }
  // script is a function body; arguments[i] are the args. Returns the JSON value the driver sends back.
  execute(script, args = [], opts) { return this.cmd('POST', '/execute/sync', { script, args }, opts); }
  executeAsync(script, args = [], opts) { return this.cmd('POST', '/execute/async', { script, args }, opts); }
  findElements(css) { return this.cmd('POST', '/elements', { using: 'css selector', value: css }).then(a => (a || []).map(e => e[ELEMENT_KEY])); }
  isDisplayed(el) { return this.cmd('GET', `/element/${el}/displayed`); }
  click(el) { return this.cmd('POST', `/element/${el}/click`); }
  // id: a frame index, an element id, or null for the top-level browsing context
  switchToFrame(id) { return this.cmd('POST', '/frame', { id: typeof id === 'string' ? { [ELEMENT_KEY]: id } : id }); }
  switchToParentFrame() { return this.cmd('POST', '/frame/parent'); }
  windowHandle() { return this.cmd('GET', '/window'); }
  windowHandles() { return this.cmd('GET', '/window/handles'); }
  switchToWindow(handle) { return this.cmd('POST', '/window', { handle }); }
  closeWindow() { return this.cmd('DELETE', '/window'); }
  newWindow(type = 'tab') { return this.cmd('POST', '/window/new', { type }); }
  setWindowRect(r) { return this.cmd('POST', '/window/rect', r); }
  performActions(actions) { return this.cmd('POST', '/actions', { actions }); }
  releaseActions() { return this.cmd('DELETE', '/actions'); }
  // A trusted mouse click at viewport coordinates (a user gesture as far as the page can tell).
  async clickAt(x, y) {
    await this.performActions([{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: [
      { type: 'pointerMove', duration: 0, origin: 'viewport', x, y }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }] }]);
    try { await this.releaseActions(); } catch {}
  }
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

// Starts safaridriver on a free port and waits until it answers /status. Returns { url, proc, stop }.
export async function startSafariDriver({ bin = '/usr/bin/safaridriver', port = null, diagnose = false, readyTimeoutMs = 20000 } = {}) {
  if (!fs.existsSync(bin)) throw new WebDriverError('driver missing', `${bin} not found (Safari's driver ships with macOS)`);
  const p = port || await freePort();
  const args = ['--port', String(p), ...(diagnose ? ['--diagnose'] : [])];
  const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  proc.stdout.on('data', d => { out += d; }); proc.stderr.on('data', d => { out += d; });
  let exited = null; proc.on('exit', c => { exited = c; });
  const wd = new WebDriver(`http://127.0.0.1:${p}`);
  const end = Date.now() + readyTimeoutMs;
  while (Date.now() < end) {
    if (exited !== null) throw new WebDriverError('driver exited', `safaridriver exited with code ${exited}: ${out.trim().slice(0, 400)}`);
    try { const s = await wd.status(); if (s && s.ready !== false) break; } catch {}
    await sleep(200);
  }
  if (Date.now() >= end) { proc.kill(); throw new WebDriverError('driver not ready', `safaridriver did not answer /status within ${readyTimeoutMs} ms: ${out.trim().slice(0, 400)}`); }
  return { url: wd.base, proc, output: () => out, stop: () => new Promise(r => { if (exited !== null) return r(); proc.once('exit', () => r()); proc.kill('SIGTERM'); setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} r(); }, 3000); }) };
}
