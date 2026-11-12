/* 英会話 習慣アプリ 共通エンジン（提案用デモ）
   各ページで window.APP を定義してから読み込む。 */
(function () {
  const C = window.APP;
  const KEY = 'eik_' + C.id;
  const $ = (s, el = document) => el.querySelector(s);
  const root = document.getElementById('app');
  document.documentElement.style.setProperty('--accent', C.accent);
  if (C.accentInk) document.documentElement.style.setProperty('--accent-ink', C.accentInk);
  if (C.accentSoft) document.documentElement.style.setProperty('--accent-soft', C.accentSoft);

  /* ---------- state ---------- */
  const blank = { level: null, goal: null, done: [], xp: 0, road: 1, wake: {}, said: 0 };
  let S;
  try { S = Object.assign({}, blank, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = Object.assign({}, blank); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const ymd = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = ymd();
  const doneToday = () => S.done.includes(today);
  function streak() {
    let n = 0; const d = new Date();
    if (!S.done.includes(ymd(d))) d.setDate(d.getDate() - 1);
    while (S.done.includes(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- speech ---------- */
  let voice = null;
  function pickVoice() {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    voice = vs.find(v => /en-US/i.test(v.lang) && /Samantha|Google US|Aria|Jenny|Ava/i.test(v.name)) || vs.find(v => /en-US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, slow) {
    if (!window.speechSynthesis) return toast('この端末は音声再生に対応していません');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; if (voice) u.voice = voice; u.rate = slow ? 0.68 : 0.95;
    speechSynthesis.speak(u);
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const words = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);

  /* ---------- toast ---------- */
  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#1b1b1f;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;z-index:99;max-width:90vw;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
  }

  /* ---------- phrase selection ---------- */
  function pool() {
    const lv = S.level || 1;
    const fit = C.phrases.filter(p => p.lv === lv);
    const rest = C.phrases.filter(p => p.lv !== lv);
    return fit.concat(rest);
  }
  function pickPhrases(n) {
    const P = pool();
    let start;
    if (C.mode === 'roadmap') start = (S.road - 1) * n;
    else { const d = new Date(); start = Math.floor(d.getTime() / 864e5) * n + S.done.length; }
    const out = [];
    for (let i = 0; i < n; i++) out.push(P[(start + i) % P.length]);
    return out;
  }

  /* ---------- shell ---------- */
  function shell(inner) {
    const st = streak();
    root.innerHTML = `
      <div class="demo-bar">${esc(C.demoNote || '提案用デモ（非公式）')}</div>
      <div class="top">
        <div class="brand"><div class="logo">${esc(C.short)}</div>
          <div style="min-width:0"><div class="brand-name">${esc(C.name)}</div><div class="brand-sub">${esc(C.tagline)}</div></div></div>
        <div class="streak ${st ? '' : 'off'}" title="連続日数">🔥 ${st}</div>
      </div>${inner}`;
  }

  /* ---------- onboarding ---------- */
  function onboarding(step = 0, sel = {}) {
    const Q = [
      { k: 'level', t: 'いまの英語レベルは？', o: [[1, '🌱', 'ほぼゼロ', '中学英語もあやしい'], [2, '🌿', '基礎はある', '読めるけど話せない'], [3, '🌳', '日常会話できる', 'もっと自然に話したい']] },
      { k: 'goal', t: '英語を使いたい場面は？', o: [['travel', '✈️', '旅行', '空港・ホテル・レストラン'], ['work', '💼', '仕事', '会議・メール・雑談'], ['daily', '💬', '日常・友だち', 'SNS・海外の友だち']] }
    ];
    const q = Q[step];
    shell(`
      <div class="card">
        <div class="eyebrow">STEP ${step + 1} / ${Q.length}</div>
        <div class="h1">${q.t}</div>
        <p class="muted" style="margin-top:4px">${esc(C.onboardNote || 'あなたに合わせて毎日のフレーズを選びます')}</p>
        ${q.o.map(o => `<button class="opt ${sel[q.k] === o[0] ? 'on' : ''}" data-v="${o[0]}"><span class="ic">${o[1]}</span><span><b>${o[2]}</b><small>${o[3]}</small></span></button>`).join('')}
      </div>
      <div class="spacer"></div>
      <button class="btn" id="next" ${sel[q.k] == null ? 'disabled' : ''}>${step + 1 < Q.length ? '次へ' : 'はじめる'}</button>`);
    root.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const v = b.dataset.v; sel[q.k] = isNaN(v) ? v : +v; onboarding(step, sel);
    });
    $('#next').onclick = () => {
      if (step + 1 < Q.length) return onboarding(step + 1, sel);
      S.level = sel.level; S.goal = sel.goal; save(); home();
    };
  }

  /* ---------- home ---------- */
  function weekCard() {
    const labels = ['日', '月', '火', '水', '木', '金', '土'];
    let h = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = ymd(d), done = S.done.includes(k);
      h += `<div class="day"><div class="dot ${done ? 'done' : ''} ${i === 0 ? 'today' : ''}">${done ? '✓' : ''}</div>${labels[d.getDay()]}</div>`;
    }
    return `<div class="card"><div class="eyebrow">今週の記録</div><div class="week">${h}</div></div>`;
  }
  function stats() {
    return `<div class="stats">
      <div class="stat"><b>${streak()}</b><span>連続日数</span></div>
      <div class="stat"><b>${S.done.length * (C.perLesson || 1)}</b><span>覚えたフレーズ</span></div>
      <div class="stat"><b>${S.xp}</b><span>XP</span></div></div>`;
  }
  function premiumTeaser() {
    return `<div class="card"><div class="row" style="align-items:center"><div class="eyebrow">プレミアム</div><div style="flex:none"><span class="lock">${esc(C.premium.price)}/月</span></div></div>
      ${C.premium.items.map(it => `<div class="list-item"><span style="font-size:22px">${it[0]}</span><div class="t"><b>${esc(it[1])}</b><small>${esc(it[2])}</small></div><span>🔒</span></div>`).join('')}
      <button class="btn ghost" id="prem" style="margin-top:12px">7日間無料で試す</button></div>`;
  }
  function foot() {
    return `<div class="foot">${esc(C.footNote || '')}<br><button id="reset">データをリセット</button></div>`;
  }

  function heroRoadmap() {
    const day = Math.min(S.road, 30);
    let g = '';
    for (let i = 1; i <= 30; i++) g += `<div class="rd ${i < S.road ? 'done' : ''} ${i === day ? 'now' : ''}">${i}</div>`;
    const ms = C.milestones || [];
    return `
      <div class="card hero">
        <div class="eyebrow">${esc(C.heroEyebrow)}</div>
        <div class="h1">Day ${day} / 30</div>
        <p class="muted" style="margin:4px 0 14px">${esc((ms.find(m => day <= m[0]) || ms[ms.length - 1] || [0, ''])[1])}</p>
        <button class="btn" id="start">${doneToday() ? 'もう1レッスン進める' : '今日のレッスンを始める'}</button>
      </div>
      <div class="card"><div class="eyebrow">30日ロードマップ</div><div class="road">${g}</div>
        <div class="milestones">${ms.map(m => `<span>Day${m[0]}<br>${esc(m[2])}</span>`).join('')}</div></div>`;
  }
  function heroMorning() {
    const w = S.wake[today];
    const opts = ['4:00', '4:30', '5:00', '5:30', '6:00', '6:30', '7:00〜'];
    const h = new Date().getHours();
    const greet = h < 11 ? 'おはようございます' : h < 18 ? 'こんにちは' : 'おつかれさまです';
    let bars = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); const k = ymd(d); const v = S.wake[k];
      const idx = v == null ? -1 : opts.indexOf(v);
      const pct = idx < 0 ? 0 : 100 - idx * 12;
      bars += `<div class="bar"><span>${v ? v.replace('〜', '') : ''}</span><i class="${idx < 0 ? 'empty' : ''}" style="height:${idx < 0 ? 4 : pct}%"></i>${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}</div>`;
    }
    return `
      <div class="card hero">
        <div class="eyebrow">${esc(C.heroEyebrow)}</div>
        <div class="h1">${greet} ☀️<br>${w ? `今朝は ${esc(w)} 起き` : '今朝は何時に起きた？'}</div>
        ${w ? `<p class="muted" style="margin:4px 0 14px">朝の5分、英語から始めよう</p><button class="btn" id="start">${doneToday() ? 'もう1フレーズやる' : '朝の5分レッスンへ'}</button>`
        : `<div class="wake-pick">${opts.map(o => `<button class="chip" style="background:rgba(255,255,255,.2);color:#fff" data-w="${o}">${o}</button>`).join('')}</div>`}
      </div>
      <div class="card"><div class="eyebrow">起床ログ（7日）</div><div class="bars">${bars}</div>
        <p class="muted" style="margin-top:8px">${esc(C.together || '')}</p></div>`;
  }
  function next8() {
    const n = new Date(); const t = new Date(); t.setHours(C.dropHour || 8, 0, 0, 0);
    if (n >= t) t.setDate(t.getDate() + 1);
    return t - n;
  }
  function heroThreeMin() {
    const ready = !doneToday();
    return `
      <div class="card hero">
        <div class="eyebrow">${esc(C.heroEyebrow)}</div>
        ${ready
        ? `<div class="h1">今日のレッスンが届いています</div><p class="muted" style="margin:4px 0 14px">⏱ 3分 × 3フレーズ。タイマーが鳴るまでに全部言えるかな？</p><button class="btn" id="start">3分スタート</button>`
        : `<div class="h1">今日の3分、完了！</div><p class="muted" style="margin-top:4px">次のレッスンまで</p><div class="clock" id="cd">--:--:--</div><button class="btn" id="start" style="margin-top:12px">復習でもう一度</button>`}
      </div>`;
  }

  let cdTimer = null;
  function home() {
    clearInterval(cdTimer);
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (!S.level) return onboarding();
    const hero = C.mode === 'roadmap' ? heroRoadmap() : C.mode === 'morning' ? heroMorning() : heroThreeMin();
    shell(hero + weekCard() + stats() + premiumTeaser() + foot());
    const st = $('#start'); if (st) st.onclick = () => lesson();
    root.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { S.wake[today] = b.dataset.w; save(); home(); });
    $('#prem').onclick = premium;
    $('#reset').onclick = () => { if (confirm('記録をすべて消しますか？')) { S = Object.assign({}, blank); save(); home(); } };
    const cd = $('#cd');
    if (cd) { const tick = () => { const ms = next8(); const h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60; cd.textContent = [h, m, s].map(x => String(x).padStart(2, '0')).join(':'); }; tick(); cdTimer = setInterval(tick, 1000); }
    window.scrollTo(0, 0);
  }

  /* ---------- premium sheet ---------- */
  function premium() {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet">
      <div class="eyebrow">${esc(C.name)} プレミアム</div>
      <div class="h1">${esc(C.premium.headline)}</div>
      ${C.premium.features.map(f => `<div class="feat"><span class="ic">${f[0]}</span><span>${esc(f[1])}</span></div>`).join('')}
      <div class="price"><b>${esc(C.premium.price)}</b><span class="muted">/ 月（税込）・いつでも解約OK</span></div>
      <button class="btn" id="trial">7日間無料で試す</button>
      <button class="btn ghost" id="close" style="margin-top:8px">あとで</button></div>`;
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.onclick = e => { if (e.target === bg) close(); };
    $('#close', bg).onclick = close;
    $('#trial', bg).onclick = () => { close(); toast('デモのため課金は発生しません'); };
  }

  /* ---------- lesson ---------- */
  function lesson() {
    clearInterval(cdTimer);
    const n = C.perLesson || 1;
    const items = pickPhrases(n);
    const steps = [];
    items.forEach(p => { steps.push(['learn', p], ['shadow', p], ['order', p]); });
    let i = 0, earned = 0, timeLeft = C.mode === 'threemin' ? 180 : 0, tId = null, ended = false;

    function frame(inner) {
      root.innerHTML = `
        <div class="lesson-top"><button class="x" id="quit" aria-label="やめる">✕</button>
          <div class="prog"><i style="width:${(i / steps.length) * 100}%"></i></div>
          ${C.mode === 'threemin' ? `<div class="timer ${timeLeft <= 30 ? 'low' : ''}" id="tm">${fmt(timeLeft)}</div>` : ''}</div>
        <div class="stage">${inner}</div>`;
      $('#quit').onclick = () => { clearInterval(tId); if (window.speechSynthesis) speechSynthesis.cancel(); home(); };
    }
    const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    if (C.mode === 'threemin') {
      tId = setInterval(() => {
        timeLeft--; const el = $('#tm');
        if (el) { el.textContent = fmt(Math.max(0, timeLeft)); el.classList.toggle('low', timeLeft <= 30); }
        if (timeLeft <= 0) { clearInterval(tId); finish(true); }
      }, 1000);
    }
    const next = () => { i++; if (i >= steps.length) finish(false); else render(); };
    const coachTip = p => `<div class="tip"><div class="av">${esc(C.short)}</div><div>${esc(p.tip)}</div></div>`;

    function render() {
      const [kind, p] = steps[i];
      if (kind === 'learn') {
        frame(`
          <div class="card"><div class="eyebrow">${esc(C.learnLabel || '今日のフレーズ')}${n > 1 ? ` ${Math.floor(i / 3) + 1}/${n}` : ''}</div>
            <div class="phrase-en">${esc(p.en)}</div><div class="phrase-ja">${esc(p.ja)}</div>
            <div class="audio-row"><button class="play" id="p1">🔊 聞く</button><button class="play" id="p2">🐢 ゆっくり</button></div>
            ${coachTip(p)}</div>
          <div class="spacer"></div><button class="btn" id="go">発音してみる</button>`);
        $('#p1').onclick = () => speak(p.en); $('#p2').onclick = () => speak(p.en, true);
        $('#go').onclick = next; setTimeout(() => speak(p.en), 350);
      } else if (kind === 'shadow') shadow(p);
      else order(p);
    }

    function shadow(p) {
      frame(`
        <div class="card center"><div class="eyebrow">シャドーイング</div>
          <div class="phrase-en" style="font-size:22px">${esc(p.en)}</div>
          <button class="play" id="p1" style="margin:12px auto 0;max-width:200px">🔊 お手本</button>
          <button class="mic" id="mic" aria-label="録音">🎙️</button>
          <div class="muted" id="hint">${SR ? 'タップして声に出して読もう' : 'お手本のあとに声に出して読もう'}</div>
          <div class="heard" id="heard"></div></div>
        <div class="spacer"></div>
        <div id="after">${SR ? `<button class="btn ghost" id="skip">あとで（スキップ）</button>` : `<div class="row"><button class="btn ghost" id="again">もう一回</button><button class="btn" id="ok">言えた！</button></div>`}</div>`);
      $('#p1').onclick = () => speak(p.en);
      const mic = $('#mic');
      if (!SR) {
        mic.onclick = () => speak(p.en);
        $('#again').onclick = () => speak(p.en);
        $('#ok').onclick = () => { earned += 10; S.said++; next(); };
        return;
      }
      $('#skip').onclick = next;
      let rec = null, busy = false;
      mic.onclick = () => {
        if (busy) { try { rec.stop(); } catch (e) {} return; }
        if (window.speechSynthesis) speechSynthesis.cancel();
        rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 3;
        busy = true; mic.classList.add('rec'); $('#hint').textContent = '聞いています…';
        rec.onresult = e => {
          const alts = Array.from(e.results[0]).map(a => a.transcript);
          const target = words(p.en);
          let best = { s: -1 };
          alts.forEach(a => { const h = new Set(words(a)); const ok = target.map(w => h.has(w)); const s = ok.filter(Boolean).length / target.length; if (s > best.s) best = { s, ok, a }; });
          const pct = Math.round(best.s * 100);
          const toks = p.en.split(/\s+/);
          $('#heard').innerHTML = `<div class="score">${pct}<small style="font-size:18px">点</small></div>` +
            toks.map((t, k) => `<span class="${best.ok[k] ? 'ok' : 'ng'}">${esc(t)}</span>`).join(' ');
          const good = pct >= 70;
          $('#after').innerHTML = `<div class="feedback ${good ? 'good' : 'bad'}">${good ? esc(C.praise || 'ナイス！その調子') : '赤い単語をもう一度ゆっくり聞いてみよう'}</div>
            <div class="row" style="margin-top:10px"><button class="btn ghost" id="again">もう一回</button><button class="btn" id="ok">${good ? '次へ' : 'とりあえず次へ'}</button></div>`;
          $('#again').onclick = () => { $('#heard').innerHTML = ''; mic.click(); };
          $('#ok').onclick = () => { earned += good ? 15 : 5; S.said++; next(); };
        };
        rec.onerror = ev => {
          $('#hint').textContent = ev.error === 'not-allowed' ? 'マイクが許可されていません。「言えた！」で進めます' : 'うまく聞き取れませんでした。もう一度どうぞ';
          if (ev.error === 'not-allowed') { $('#after').innerHTML = `<button class="btn" id="ok">言えた！</button>`; $('#ok').onclick = () => { earned += 10; next(); }; }
        };
        rec.onend = () => { busy = false; mic.classList.remove('rec'); if ($('#hint') && $('#hint').textContent === '聞いています…') $('#hint').textContent = 'タップしてもう一度'; };
        try { rec.start(); } catch (e) { busy = false; mic.classList.remove('rec'); }
      };
    }

    function order(p) {
      const toks = p.en.replace(/[.!?]$/, '').split(/\s+/);
      const punct = (p.en.match(/[.!?]$/) || [''])[0];
      let bank = toks.map((t, k) => ({ t, k }));
      for (let a = bank.length - 1; a > 0; a--) { const b = Math.floor(Math.random() * (a + 1)); [bank[a], bank[b]] = [bank[b], bank[a]]; }
      if (bank.every((x, k) => x.k === k) && bank.length > 1) bank.reverse();
      const picked = [];
      frame(`
        <div class="card"><div class="eyebrow">${esc(C.orderLabel || '並べかえ')}</div>
          <div class="h1" style="font-size:19px">${esc(p.ja)}</div>
          <div class="answer" id="ans"></div><div class="bank" id="bank"></div></div>
        <div class="spacer"></div><div id="after"><button class="btn" id="check" disabled>チェック</button></div>`);
      function draw() {
        $('#ans').innerHTML = picked.map((x, k) => `<button class="tile" data-a="${k}">${esc(x.t)}</button>`).join('');
        $('#bank').innerHTML = bank.map((x, k) => `<button class="tile ${picked.includes(x) ? 'used' : ''}" data-b="${k}">${esc(x.t)}</button>`).join('');
        root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { picked.splice(+b.dataset.a, 1); draw(); });
        root.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const x = bank[+b.dataset.b]; if (!picked.includes(x)) { picked.push(x); speakWord(x.t); draw(); } });
        $('#check') && ($('#check').disabled = picked.length !== toks.length);
      }
      const speakWord = w => { if (window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w); u.lang = 'en-US'; if (voice) u.voice = voice; u.rate = 1; speechSynthesis.speak(u); } };
      draw();
      $('#check').onclick = () => {
        const ok = picked.map(x => x.t).join(' ') === toks.join(' ');
        earned += ok ? 15 : 5;
        $('#after').innerHTML = `<div class="feedback ${ok ? 'good' : 'bad'}">${ok ? '正解！ ' : '正解は… '}<br><span style="color:var(--ink)">${esc(toks.join(' ') + punct)}</span></div>
          <button class="btn" id="ok" style="margin-top:10px">次へ</button>`;
        speak(p.en);
        $('#ok').onclick = next;
      };
    }

    function finish(timeUp) {
      if (ended) return; ended = true;
      clearInterval(tId);
      const first = !doneToday();
      if (first) S.done.push(today);
      if (C.mode === 'roadmap') S.road = Math.min(S.road + 1, 31);
      const bonus = C.mode === 'threemin' && !timeUp ? Math.round(timeLeft / 6) : 0;
      S.xp += earned + bonus; save();
      const st = streak();
      const share = (C.shareText || '{name}で今日も英語 🔥{streak}日連続').replace('{name}', C.name).replace('{streak}', st).replace('{day}', S.road - 1);
      root.innerHTML = `
        <div class="stage">
          <div class="done-ic">${timeUp ? '⏰' : '🎉'}</div>
          <div class="h1 center">${timeUp ? 'タイムアップ！おつかれさま' : esc(C.doneTitle || '今日のレッスン完了！')}</div>
          <p class="muted center" style="margin-top:4px">${first ? `🔥 ${st}日連続 達成` : '復習もばっちり'}</p>
          <div class="stats">
            <div class="stat"><b>+${earned + bonus}</b><span>XP</span></div>
            <div class="stat"><b>${st}</b><span>連続日数</span></div>
            <div class="stat"><b>${C.mode === 'threemin' ? fmt(Math.max(0, 180 - timeLeft)) : n}</b><span>${C.mode === 'threemin' ? 'かかった時間' : 'フレーズ'}</span></div></div>
          <div class="card"><div class="eyebrow">ストーリーにシェア</div><div class="share" id="sh">${esc(share)}</div>
            <button class="btn ghost small" id="copy" style="margin-top:10px">テキストをコピー</button></div>
          <div class="spacer"></div>
          <button class="btn" id="home">ホームへ</button></div>`;
      $('#home').onclick = home;
      $('#copy').onclick = () => {
        const done = () => toast('コピーしました');
        if (navigator.share) navigator.share({ text: share }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(share).then(done, () => toast('コピーできませんでした'));
      };
    }
    render();
  }

  home();
})();
