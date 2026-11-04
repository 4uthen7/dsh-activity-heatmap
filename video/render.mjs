/**
 * Render video/index.html frame by frame through Chrome's DevTools Protocol.
 *
 * Usage:
 *   node video/render.mjs
 *
 * Requirements:
 *   - Google Chrome at CHROME_BIN (defaults to the macOS install path)
 *   - python3 for the temporary static server
 *   - ffmpeg for encoding (see video/README.md)
 *
 * The page is deterministic: window.renderAt(t) sets every property from t, so
 * screenshots can be taken in any order and re-rendered without dropped frames.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.RENDER_PORT ?? 9334);
const HTTP_PORT = Number(process.env.HTTP_PORT ?? 8740);
const FPS = 30;
const DURATION = 66.0;
const OUT = process.env.FRAMES_DIR ?? '/tmp/dsh-activity-heatmap-frames';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=/tmp/dsh-activity-heatmap-chrome`,
  '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1920,1080',
  `http://127.0.0.1:${HTTP_PORT}/video/index.html`,
], { stdio: 'ignore' });

const cleanup = () => {
  try { chrome.kill(); } catch {}
  try { server.kill(); } catch {}
};
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('error', cleanup);

try {
  let ready = false;
  for (let attempt = 0; attempt < 60 && !ready; attempt += 1) {
    try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); ready = true; }
    catch { await sleep(200); }
  }
  if (!ready) throw new Error('Chrome did not expose a DevTools endpoint');

  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('No page target');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = (nextId += 1);
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const prepared = await send('Runtime.evaluate', {
    expression: `new Promise(r => { const start=Date.now(); const tick=()=>{ if (document.readyState==='complete' && window.__video && window.__video.frameReady() && document.fonts.status==='loaded') r(true); else if (Date.now()-start>20000) r(false); else setTimeout(tick,100); }; tick(); })`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (!prepared.result.result.value) console.warn('warning: demo iframe or fonts were not ready');

  const total = Math.round(DURATION * FPS);
  const started = Date.now();
  for (let index = 0; index < total; index += 1) {
    await send('Runtime.evaluate', { expression: `window.renderAt(${index / FPS}); true` });
    await sleep(26);
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT, `f${String(index).padStart(5, '0')}.png`), Buffer.from(shot.result.data, 'base64'));
    if (index % 120 === 0) {
      const rate = (index + 1) / ((Date.now() - started) / 1000);
      console.log(`frame ${index}/${total} · ${rate.toFixed(1)} fps · eta ${Math.round((total - index) / rate)}s`);
    }
  }
  socket.close();
  console.log(`done: ${total} frames in ${Math.round((Date.now() - started) / 1000)}s → ${OUT}`);
} finally {
  cleanup();
}
