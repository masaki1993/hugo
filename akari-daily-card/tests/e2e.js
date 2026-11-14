// 受け入れ確認の自動テスト（Playwright）。使い方：node tests/e2e.js [ルート] [スクショ出力先]
const { chromium, devices } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = process.argv[2] || path.join(__dirname, '..');
const OUT = process.argv[3] || require('os').tmpdir();
const FAST = 0.02; // 台本の待ち時間を縮めて完走させる

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let p = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  const ext = path.extname(p);
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml' }[ext] || 'text/plain' });
  fs.createReadStream(p).pipe(res);
});

// 日本語音声を持つ端末を模した speechSynthesis（発話は 1文字=4ms）
const fakeSynth = `
(() => {
  const listeners = {};
  let q = null, timer = null;
  window.__spoken = [];
  const fake = {
    getVoices: () => [{ name: 'Kyoko', lang: 'ja-JP', localService: true }],
    speak(u) { window.__spoken.push(u.text); clearTimeout(timer); q = u; timer = setTimeout(() => { q = null; u.onend && u.onend({}); }, Math.max(20, u.text.length * 4)); },
    cancel() { if (q) { const u = q; q = null; clearTimeout(timer); u.onerror && u.onerror({ error: 'interrupted' }); } },
    pause() {}, resume() {},
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    removeEventListener() {}
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function (t) { this.text = t; }, configurable: true, writable: true });
  const _st = window.setTimeout;
  window.setTimeout = (f, ms, ...a) => _st(f, ms > 400 && window.__fast ? ms * ${FAST} : ms, ...a);
})();`;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
  await ctx.addInitScript(fakeSynth);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (n) => { await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); };

  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await shot('01-home');
  await page.click('#startBtn');
  await page.fill('#f-name', 'あかり');
  await shot('02-q1');
  await page.click('#obNext');
  await page.click('.option:nth-child(1)');
  await shot('03-q2');
  await page.click('#obNext');
  await page.fill('textarea', '彼と両想いになりたい');
  await shot('04-q3');
  await page.click('#obNext');
  await page.click('#obSkip');
  await page.fill('textarea', 'LINEの返事が遅くて、気になってしまう');
  await page.click('#obNext');
  await page.click('#obSkip');
  await shot('05-voice');
  await page.click('#obNext');
  await page.waitForSelector('.fan-card');
  await page.waitForTimeout(700);
  await shot('06-draw');
  await page.click('.fan-card:nth-child(4)', { position: { x: 50, y: 14 } });
  await page.waitForSelector('#toResultBtn', { state: 'visible' });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#toResultBtn')).visibility === 'visible');
  await shot('07-reveal');
  await page.click('#toResultBtn');
  await page.waitForTimeout(300);
  await shot('08-result-pending');
  await page.waitForSelector('#toAudioBtn:not([disabled])');
  const interp = await page.textContent('[data-bind="interp"]');
  console.log('INTERP', interp.length, interp);
  await page.click('#toAudioBtn');
  await shot('09-audio');
  await page.evaluate(() => { window.__fast = true; });
  await page.click('#playBtn');
  await page.waitForTimeout(400);
  await shot('10-audio-playing');
  // 一時停止 → 再開
  await page.click('#playBtn');
  const st1 = await page.getAttribute('#playBtn', 'aria-label');
  await page.click('#playBtn');
  await page.waitForSelector('#audioDone.show', { timeout: 30000 });
  await page.evaluate(() => { window.__fast = false; });
  await shot('11-audio-done');
  console.log('pause label', st1, 'spoken', await page.evaluate(() => window.__spoken.length));
  await page.click('#audioDone [data-go="home"]');
  await shot('12-home-return');
  await page.click('#continueBtn');
  await shot('13-paywall');
  await page.click('#planBtn');
  await page.click('#planBtn').catch(() => {});
  await shot('14-paywall-tapped');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('akari-daily-card:v1')));
  console.log('EVENTS', st.events.map((e) => [e.event_name, e.user_id.slice(0, 13), JSON.stringify(e.properties)]));
  // 同日の再読み込み：同じカード、日数は増えない
  const card1 = st.days[Object.keys(st.days)[0]].cardId;
  await page.reload();
  await page.goto(base + '#result');
  await page.waitForTimeout(500);
  const name2 = await page.textContent('[data-bind="resultName"]');
  console.log('same-day card', card1, name2);
  await page.goto(base + '#home');
  console.log('day count', await page.textContent('[data-bind="dayCount"]'));
  // 翌日（デバッグで日付を進める）
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('akari-daily-card:v1')); s.debug.dayOffset = 1; localStorage.setItem('akari-daily-card:v1', JSON.stringify(s)); });
  await page.goto(base + '?debug=1#home');
  await page.waitForTimeout(500);
  await shot('15-day2-home');
  await page.click('#startBtn');
  await page.waitForSelector('.fan-card');
  await page.waitForTimeout(600);
  await page.click('.fan-card:nth-child(7)');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#toResultBtn')).visibility === 'visible');
  await page.click('#toResultBtn');
  await page.goto(base + '?debug=1#home');
  await page.waitForTimeout(400);
  console.log('day2 count', await page.textContent('[data-bind="dayCount"]'));
  await shot('16-day2-return');
  await page.click('#debugPill');
  await shot('17-debug');

  // 途中離脱ユーザー：audio_completed が付かないこと
  const ctx2 = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx2.addInitScript(fakeSynth);
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push('p2 ' + e));
  await p2.goto(base);
  await p2.click('#startBtn');
  await p2.fill('#f-name', 'テスト');
  await p2.click('#obNext');
  await p2.click('.option:nth-child(3)');
  await p2.click('#obNext');
  for (let i = 0; i < 4; i++) await p2.click('#obSkip');
  await p2.click('#obNext');
  await p2.waitForSelector('.fan-card');
  await p2.waitForTimeout(600);
  await p2.click('.fan-card:nth-child(7)');
  await p2.waitForFunction(() => getComputedStyle(document.querySelector('#toResultBtn')).visibility === 'visible');
  await p2.click('#toResultBtn');
  await p2.waitForSelector('#toAudioBtn:not([disabled])');
  console.log('INTERP2', await p2.textContent('[data-bind="interp"]'));
  await p2.screenshot({ path: `${OUT}/18-android-result.png`, fullPage: true });
  await p2.click('#toAudioBtn');
  await p2.click('#playBtn');
  await p2.waitForTimeout(1500);
  await p2.click('#backBtn');
  const s2 = await p2.evaluate(() => JSON.parse(localStorage.getItem('akari-daily-card:v1')));
  console.log('EVENTS2', s2.events.map((e) => e.event_name), 'uid differs', s2.userId !== st.userId);

  console.log('ERRORS', errors);
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
