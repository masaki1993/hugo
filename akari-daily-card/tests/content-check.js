// 文言チェック：22枚 × 5状況 × 7回答パターン × 朝夜 × 3トーン（4,620通り）を検査する。使い方：node tests/content-check.js
global.window = global;
const d = process.argv[2] || require('path').join(__dirname, '..');
require(d + '/config.js'); require(d + '/cards.js'); require(d + '/generator.js');
const G = window.AKARI_GEN, { CARDS, REL } = window.AKARI_CARDS, CFG = window.AKARI_CONFIG;
const profiles = [
  { name: 'みき', worry: '', wish: '' },
  { name: 'みき', worry: '返事が来なくて不安', wish: '両想いになりたい' },
  { name: 'あや', worry: '元彼のことが忘れられない', wish: '復縁したい', situation: '別れて3ヶ月' },
  { name: 'ゆう', worry: '結婚の話が進まない', wish: 'プロポーズされたい' },
  { name: 'ゆう', worry: '', wish: '週末デートしたい' },
  { name: 'ゆうちゃん', worry: '自分に自信がない', wish: '大切にされたい', idealDay: '一緒に旅行' },
  { name: 'Ri', worry: 'なんとなくモヤモヤ', wish: 'よく分からない' }
];
const issues = [];
let n = 0, minL = 999, maxL = 0, minD = 999, maxD = 0;
const risky = [/十分(だけ|間)/, /一枚/, /\d+日目/];
for (const c of CARDS) for (const r of REL) for (const p of profiles) for (const tone of ['gentle', 'strong', 'calm']) for (const mode of ['morning', 'night']) {
  n++;
  const prof = { ...p, relationship: r, voiceTone: tone };
  const it = G.composeInterpretation(c, prof, mode, G.mulberry32(n));
  const L = G.len(it.text); minL = Math.min(minL, L); maxL = Math.max(maxL, L);
  if (L < 200 || L > 300) issues.push(['length', c.id, r, L]);
  const affs = c.affirmations.slice(0, 2);
  const raw = G.buildScript(c, prof, it, affs, mode, tone);
  const fit = G.fitScript(raw, tone, CFG.audio.targetSeconds);
  const dur = G.estimateSeconds(fit, tone); minD = Math.min(minD, dur); maxD = Math.max(maxD, dur);
  const all = [it.text, ...affs, ...fit.map((s) => s.text)].join('\n');
  CFG.method.avoidPhrases.forEach((ph) => { if (all.includes(ph)) issues.push(['avoid', ph, c.id, r]); });
  if (/今日は、[^。]*今日/.test(it.text)) issues.push(['double-today', c.id, r]);
  if (mode === 'night' && /今日は、/.test(it.actionSentence)) issues.push(['night-today', c.id]);
  // 共感文と前置きで同じ言い回しが繰り返されていないか（8文字以上の共通部分）
  for (let i = 0; i + 8 <= it.empathy.length; i++) { const sub = it.empathy.slice(i, i + 8); if (it.bridge.includes(sub)) { issues.push(['repeat', c.id, r, sub]); break; } }
  fit.forEach((s) => risky.forEach((re) => { if (re.test(s.text)) issues.push(['tts-reading', s.text]); }));
  if (!fit[0].text.includes(G.callName(p.name))) issues.push(['name-call', c.id]);
  if (fit.filter((s) => s.text.includes(G.callName(p.name))).length !== 1) issues.push(['name-once', c.id]);
  fit.forEach((s) => { if (G.len(s.text) > 80) issues.push(['long-seg', G.len(s.text), s.text]); });
}
const uniq = {};
issues.forEach((i) => { const k = i[0]; uniq[k] = (uniq[k] || 0) + 1; });
console.log(`combos ${n}  len ${minL}-${maxL}  est ${minD.toFixed(0)}-${maxD.toFixed(0)}s`);
console.log('issues', uniq, issues.filter(i=>i[0]==='repeat').slice(0,4), issues.filter(i=>i[0]==='long-seg').slice(0,3));
