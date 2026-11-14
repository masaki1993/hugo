/*
 * 朱里「今日のカード」ブラウザデモ：画面と状態
 */
(function () {
  'use strict';

  const CFG = window.AKARI_CONFIG;
  const CARDS = window.AKARI_CARDS;
  const GEN = window.AKARI_GEN;
  const VOICE = window.AKARI_VOICE;

  const STORE_KEY = 'akari-daily-card:v1';
  const LOCK_PREFIX = 'akari-daily-card:lock:';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const bind = (name) => $(`[data-bind="${name}"]`);
  const params = new URLSearchParams(location.search);

  /* =========================================================
   * 保存（同じブラウザでは同じデモ用ユーザーIDを維持）
   * ========================================================= */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => { b[i] = Math.random() * 256; });
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  let memoryStore = null; // localStorage が使えない環境（プライベートモード等）用
  function readStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memoryStore;
    }
  }
  function writeStore(s) {
    memoryStore = s;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* メモリだけで続行 */ }
  }
  function freshState() {
    return {
      v: 1,
      userId: 'demo_' + uuid(),
      createdAt: new Date().toISOString(),
      profile: null,
      draft: { step: 0 },
      days: {},
      sent: { onboardingCompleted: false, audioCompleted: {}, paywallPlanTapped: false },
      events: [],
      outbox: [],
      debug: { dayOffset: 0, forceTtsFail: false }
    };
  }

  let S = readStore();
  if (!S || !S.userId || params.get('reset') === '1') {
    S = freshState();
    writeStore(S);
    if (params.get('reset') === '1') history.replaceState(null, '', location.pathname + location.hash);
  }
  function save() { writeStore(S); }

  /* =========================================================
   * 日付（日本時間。デバッグ時は日付を進められる）
   * ========================================================= */
  function nowEff() { return new Date(Date.now() + (S.debug.dayOffset || 0) * 86400000); }
  function todayJst() { return GEN.jstParts(nowEff()).date; }
  function hourJst() { return GEN.jstParts(nowEff()).hour; }
  function greeting() {
    const h = hourJst();
    const h2 = h < 4 ? h + 24 : h;
    const g = CFG.time.greetings.find((x) => h2 >= x.from && h2 < x.to);
    return g ? g.text : 'こんにちは';
  }
  function isNightNow() {
    const h = hourJst();
    return h >= CFG.time.nightFromHour || h < CFG.time.nightUntilHour;
  }
  function audioModeFor(profile) {
    const lt = (profile && profile.listenTime) || 'morning';
    if (lt === 'morning') return 'morning';
    if (lt === 'night') return 'night';
    return isNightNow() ? 'night' : 'morning';
  }

  /* =========================================================
   * 計測（Supabase の events テーブル想定。未設定なら端末内のみ）
   * 呼び名・願望などの本文は、属性に一切含めない
   * ========================================================= */
  function track(eventName, properties) {
    const ev = {
      id: uuid(),
      user_id: S.userId,
      event_name: eventName,
      created_at: new Date().toISOString(),
      properties: Object.assign({
        variant: CFG.variant,
        app_version: CFG.appVersion,
        date_jst: todayJst(),
        ua_mobile: /iPhone|iPad|Android/i.test(navigator.userAgent),
        ua_platform: /iPhone|iPad/i.test(navigator.userAgent) ? 'ios' : /Android/i.test(navigator.userAgent) ? 'android' : 'other'
      }, properties || {})
    };
    S.events.push(ev);
    S.outbox.push(ev);
    save();
    flushOutbox();
    renderDebug();
    return ev;
  }

  let flushing = false;
  async function flushOutbox() {
    const sb = CFG.analytics.supabase;
    if (!sb.url || !sb.anonKey || flushing || !S.outbox.length) return;
    flushing = true;
    try {
      const batch = S.outbox.slice(0, 20);
      const res = await fetch(`${sb.url.replace(/\/$/, '')}/rest/v1/${sb.table}`, {
        method: 'POST',
        headers: {
          apikey: sb.anonKey,
          Authorization: `Bearer ${sb.anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal,resolution=ignore-duplicates'
        },
        body: JSON.stringify(batch),
        keepalive: true
      });
      if (res.ok) {
        const ids = new Set(batch.map((e) => e.id));
        S.outbox = S.outbox.filter((e) => !ids.has(e.id));
        save();
      }
    } catch (e) { /* 次回に再送 */ }
    flushing = false;
    if (S.outbox.length && CFG.analytics.supabase.url) setTimeout(flushOutbox, 5000);
  }

  /* =========================================================
   * 1日分の生成（同日・再読み込み・連打でも重複させない）
   * ========================================================= */
  const inflight = {};
  function previousCardId(date) {
    const prev = S.days[GEN.addDays(date, -1)];
    return prev ? prev.cardId : null;
  }
  function ensureDaily(date) {
    if (S.days[date]) return Promise.resolve(S.days[date]);
    if (inflight[date]) return inflight[date];
    inflight[date] = (async () => {
      // 別タブが生成中なら、少し待って結果を使う
      const lockKey = LOCK_PREFIX + S.userId + ':' + date;
      let lock = null;
      try { lock = JSON.parse(localStorage.getItem(lockKey) || 'null'); } catch (e) { /* noop */ }
      if (lock && Date.now() - lock.at < 8000) {
        for (let t = 0; t < 32; t++) {
          await sleep(250);
          const other = readStore();
          if (other && other.days && other.days[date]) { S.days[date] = other.days[date]; save(); return S.days[date]; }
        }
      }
      try { localStorage.setItem(lockKey, JSON.stringify({ at: Date.now() })); } catch (e) { /* noop */ }

      await sleep(650); // サーバー往復のつもりの待ち（カードをめくる演出と重ねる）
      const out = GEN.generateDaily({ userId: S.userId, dateJst: date, profile: S.profile, previousCardId: previousCardId(date) });
      // 待っている間に別タブが保存していたら、そちらを正とする
      const latest = readStore();
      if (latest && latest.days && latest.days[date]) {
        S.days[date] = latest.days[date];
      } else {
        S.days[date] = Object.assign(out, { audio: { status: 'pending' }, openedAt: null });
      }
      save();
      try { localStorage.removeItem(lockKey); } catch (e) { /* noop */ }
      return S.days[date];
    })();
    inflight[date].finally(() => { delete inflight[date]; });
    return inflight[date];
  }

  /* 音声の準備（＝本番の TTS 生成。失敗したら同じ台本で音声だけ再試行） */
  const audioInflight = {};
  function ensureAudio(date) {
    const day = S.days[date];
    if (!day) return Promise.resolve(null);
    if (audioInflight[date]) return audioInflight[date];
    day.audio = { status: 'pending' };
    save();
    renderAudioStatus();
    audioInflight[date] = VOICE.prepare({ forceFail: S.debug.forceTtsFail }).then((r) => {
      const d = S.days[date];
      if (!d) return null;
      d.audio = r.ok
        ? { status: 'ready', voice: r.voice, preparedAt: new Date().toISOString() }
        : { status: 'failed', reason: r.reason, failedAt: new Date().toISOString() };
      save();
      renderAudioStatus();
      renderDebug();
      return d.audio;
    });
    audioInflight[date].finally(() => { delete audioInflight[date]; });
    return audioInflight[date];
  }

  /* 声のトーンを変えたとき：カードと解釈はそのまま、台本だけ作り直す */
  function rebuildScripts(date) {
    const day = S.days[date];
    if (!day || !S.profile) return;
    const regenerated = GEN.generateDaily({ userId: S.userId, dateJst: date, profile: S.profile, previousCardId: previousCardId(date) });
    if (regenerated.cardId === day.cardId) {
      day.scripts = regenerated.scripts;
      day.tone = regenerated.tone;
      day.estimatedSeconds = regenerated.estimatedSeconds;
      save();
    }
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /* =========================================================
   * 画面遷移（ハッシュでブラウザの戻るにも対応）
   * ========================================================= */
  const SCREENS = ['home', 'onboarding', 'draw', 'result', 'audio', 'paywall'];
  let current = null;

  function go(name, opts) {
    opts = opts || {};
    const hash = '#' + name;
    if (location.hash !== hash) {
      if (opts.replace) history.replaceState(null, '', hash);
      else history.pushState(null, '', hash);
    }
    route();
  }

  function resolveRoute() {
    let name = (location.hash || '#home').slice(1).split('?')[0];
    if (!SCREENS.includes(name)) name = 'home';
    const today = todayJst();
    const day = S.days[today];
    // 不正な遷移はホームへ寄せる
    if (name === 'onboarding' && S.profile) name = day ? 'home' : 'draw';
    if (name === 'draw' && !S.profile) name = 'onboarding';
    if (name === 'draw' && day && day.openedAt) name = 'result';
    if ((name === 'result' || name === 'audio') && !day) name = 'home';
    if (name === 'paywall' && !(day && day.openedAt)) name = 'home';
    return name;
  }

  function route() {
    const name = resolveRoute();
    if (('#' + name) !== location.hash) history.replaceState(null, '', '#' + name);
    if (current === 'audio' && name !== 'audio') teardownPlayer();
    if (current === 'onboarding' && name !== 'onboarding') VOICE.stopAll();
    current = name;

    let screenId = name;
    if (name === 'home') screenId = S.days[todayJst()] && S.days[todayJst()].openedAt ? 'home-return' : 'home-new';
    $$('.screen').forEach((el) => el.classList.toggle('is-active', el.dataset.screen === screenId));
    $('#backBtn').hidden = name === 'home';
    document.body.classList.toggle('is-night', isNightNow());

    const renderers = { home: renderHome, onboarding: renderOnboarding, draw: renderDraw, result: renderResult, audio: renderAudio, paywall: renderPaywall };
    renderers[name]();
    window.scrollTo(0, 0);
    renderDebug();
  }

  window.addEventListener('popstate', route);

  $('#backBtn').addEventListener('click', () => {
    if (current === 'onboarding' && S.draft.step > 0) { S.draft.step--; save(); renderOnboarding(); return; }
    if (current === 'audio') { go('result', { replace: true }); return; }
    go('home', { replace: true });
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (!t) return;
    e.preventDefault();
    go(t.dataset.go);
  });

  /* =========================================================
   * 共通の描画
   * ========================================================= */
  function fillBacks(root) {
    $$('[data-back]', root).forEach((el) => { if (!el.firstChild) el.innerHTML = CARDS.renderCardBack(); });
  }
  function setText(name, text) { $$(`[data-bind="${name}"]`).forEach((el) => { el.textContent = text; }); }
  function relLabel(id) { const r = CFG.onboarding.relationships.find((x) => x.id === id); return r ? r.label : ''; }
  function toneLabel(id) { const r = CFG.onboarding.voiceTones.find((x) => x.id === id); return r ? r.label : ''; }
  function listenLabel(id) { const r = CFG.onboarding.listenTimes.find((x) => x.id === id); return r ? r.label : ''; }
  function fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  function fmtLen(sec) {
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return s ? `約${m}分${s}秒` : `約${m}分`;
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* =========================================================
   * ホーム
   * ========================================================= */
  function openedDates() {
    return Object.keys(S.days).filter((d) => S.days[d].openedAt).sort();
  }
  function dayCount() {
    // 初回の結果を開いた日を1日目。同日の再訪では増やさない
    const today = todayJst();
    return openedDates().filter((d) => d <= today).length;
  }

  function renderHome() {
    fillBacks(document);
    const today = todayJst();
    setText('today', GEN.formatDateJa(today));
    setText('greeting', greeting());
    const day = S.days[today];

    if (day && day.openedAt) {
      const card = CARDS.byId(day.cardId);
      setText('greetingName', `${greeting()}、${GEN.callName(S.profile.name)}`);
      const n = dayCount();
      setText('dayCount', String(n));
      const dots = bind('dayDots');
      dots.innerHTML = '';
      const total = Math.max(7, n);
      for (let i = 1; i <= Math.min(total, 7); i++) {
        const dot = document.createElement('i');
        if (i <= n) dot.className = 'on';
        if (i === n) dot.classList.add('today');
        dots.appendChild(dot);
      }
      bind('todayMini').innerHTML = CARDS.renderCardFace(card);
      setText('todayName', card.name);
      setText('todayKw', card.keywords.join('・'));
      const chip = bind('todayAudioChip');
      const listened = S.sent.audioCompleted[today];
      chip.classList.toggle('done', !!listened);
      chip.lastChild.textContent = listened ? '聴きました' : '音声を聴く';
      setText('tomorrowLine', isNightNow() ? '明日のカードは、明日の朝に。今夜はゆっくり休んでくださいね。' : '明日のカードは、明日の朝に。');
    } else {
      // 2日目以降で、まだ今日を引いていない
      const n = openedDates().length;
      const lead = bind('homeLead');
      const meta = bind('homeMeta');
      if (S.profile) {
        lead.innerHTML = '';
        lead.append(`${greeting()}、${GEN.callName(S.profile.name)}。`, document.createElement('br'),
          n ? `${n + 1}日目のカードが、届いています。` : '今日の一枚を、受け取りましょう。');
        meta.innerHTML = '<span>質問はありません</span><span>すぐにカードへ</span>';
      } else {
        lead.innerHTML = '恋のことを少しだけ教えてください。<br>あなたのための一枚と、今日の言葉、<br>ガイド音声をお届けします。';
        meta.innerHTML = '<span>質問6つ＋音声の設定</span><span>約3分</span>';
      }
    }
  }

  $('#startBtn').addEventListener('click', () => {
    if (!S.profile) go('onboarding');
    else go('draw');
  });
  $('#continueBtn').addEventListener('click', () => go('paywall'));

  /* =========================================================
   * オンボーディング（6問＋音声設定2項目）
   * ========================================================= */
  const EXAMPLES = {
    kataomoi: {
      wish: '例）彼ともっと気軽に話せるようになりたい',
      situation: '例）職場の先輩。挨拶はするけれど、二人で話したことはまだ少ない',
      worry: '例）LINEの返事がいつも遅くて、迷惑かなと気になる',
      idealDay: '例）休みの日に一緒にカフェへ行って、のんびり話したい'
    },
    kosai: {
      wish: '例）喧嘩をしても、すぐ仲直りできる関係でいたい',
      situation: '例）付き合って1年。最近はお互い忙しくて、会う回数が減った',
      worry: '例）会えない日が続いて、気持ちが離れていないか不安',
      idealDay: '例）朝ごはんを一緒に作って、週末の予定をゆっくり話したい'
    },
    fukuen: {
      wish: '例）もう一度、落ち着いて話せる関係に戻りたい',
      situation: '例）半年前に別れて、今はたまに連絡をとる程度',
      worry: '例）連絡していいのか、迷惑にならないか迷っている',
      idealDay: '例）前によく行ったお店に、また二人で行きたい'
    },
    konkatsu: {
      wish: '例）安心して一緒に暮らせる人と出会いたい',
      situation: '例）アプリで何人かと会ったけれど、次につながらない',
      worry: '例）年齢のことを考えると、焦ってしまう',
      idealDay: '例）休日に二人で買い物をして、夜は家でゆっくり過ごしたい'
    },
    kaizen: {
      wish: '例）お互いに「ありがとう」を言い合える関係に戻りたい',
      situation: '例）一緒に暮らして3年。会話が用事の連絡だけになりがち',
      worry: '例）言いたいことを我慢して、すれ違いが増えている',
      idealDay: '例）二人で散歩をして、笑いながら晩ごはんを食べたい'
    }
  };

  const STEPS = [
    { key: 'name', type: 'text', q: 'なんとお呼びしたらいいですか？', help: 'ニックネームで大丈夫です。音声の最初に、一度だけこのお名前でお呼びします。', required: true },
    { key: 'relationship', type: 'choice', q: '今の恋に、いちばん近いものは？', help: 'いちばん近いものを、一つ選んでください。', required: true },
    { key: 'wish', type: 'free', q: 'この恋で、いちばん願っていることは？', help: '思いつかなければ、スキップして大丈夫です。' },
    { key: 'situation', type: 'free', q: '今は、どんな状況ですか？', help: '分かる範囲で、ざっくりで大丈夫です。' },
    { key: 'worry', type: 'free', q: '今、いちばん心に引っかかっていることは？', help: '言葉にしにくければ、スキップして大丈夫です。' },
    { key: 'idealDay', type: 'free', q: '願いが叶ったら、どんな一日を過ごしたいですか？', help: '想像するだけで、少し心がほどけるかもしれません。' },
    { key: 'voice', type: 'voice', q: '最後に、ガイド音声の設定です', help: 'あとから右上のメニューで変えられます。' }
  ];

  function draftVal(k) { return S.draft[k] == null ? '' : S.draft[k]; }

  function renderOnboarding() {
    const step = Math.min(S.draft.step || 0, STEPS.length - 1);
    const st = STEPS[step];
    const body = bind('obBody');
    const isVoice = st.type === 'voice';
    bind('obBar').style.width = `${((step + 1) / STEPS.length) * 100}%`;
    setText('obCount', isVoice ? '音声設定' : `${step + 1} / 6`);
    $('#backBtn').hidden = false;

    body.innerHTML = '';
    const h = document.createElement('h1');
    h.className = 'ob-q';
    h.textContent = st.q;
    const help = document.createElement('p');
    help.className = 'ob-help';
    help.textContent = st.help;
    body.append(h, help);

    const next = $('#obNext');
    const skip = $('#obSkip');
    skip.style.display = st.type === 'free' ? '' : 'none';
    next.textContent = isVoice ? 'カードを引く' : '次へ';

    if (st.type === 'text') {
      const input = document.createElement('input');
      input.className = 'field';
      input.type = 'text';
      input.id = 'f-name';
      input.maxLength = CFG.onboarding.nameMaxLength;
      input.autocomplete = 'nickname';
      input.enterKeyHint = 'next';
      input.placeholder = '例）あかり、みーちゃん';
      input.value = draftVal('name');
      input.setAttribute('aria-label', st.q);
      const meta = document.createElement('div');
      meta.className = 'field-meta';
      meta.innerHTML = `<span>「〇〇さん」とお呼びします</span><span class="count"></span>`;
      const upd = () => {
        S.draft.name = input.value; save();
        meta.querySelector('.count').textContent = `${Array.from(input.value).length} / ${CFG.onboarding.nameMaxLength}`;
        const cn = GEN.callName(input.value);
        meta.firstChild.textContent = cn ? `音声では「${cn}」とお呼びします` : '「〇〇さん」とお呼びします';
        next.disabled = !input.value.trim();
      };
      input.addEventListener('input', upd);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing && input.value.trim()) { e.preventDefault(); obNext(); } });
      body.append(input, meta, notice('お相手の実名や連絡先は、どこにも入力する必要はありません。'));
      upd();
      setTimeout(() => { if (!('ontouchstart' in window)) input.focus(); }, 300);
    }

    if (st.type === 'choice') {
      const wrap = document.createElement('div');
      wrap.className = 'options';
      wrap.setAttribute('role', 'radiogroup');
      wrap.setAttribute('aria-label', st.q);
      CFG.onboarding.relationships.forEach((r) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'option';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(S.draft.relationship === r.id));
        b.innerHTML = '<span class="dot"></span><span><span class="lbl"></span><span class="note"></span></span>';
        b.querySelector('.lbl').textContent = r.label;
        b.querySelector('.note').textContent = r.note;
        b.addEventListener('click', () => {
          S.draft.relationship = r.id; save();
          $$('.option', wrap).forEach((o) => o.setAttribute('aria-checked', String(o === b)));
          next.disabled = false;
        });
        wrap.appendChild(b);
      });
      body.appendChild(wrap);
      next.disabled = !S.draft.relationship;
    }

    if (st.type === 'free') {
      const ta = document.createElement('textarea');
      ta.className = 'field';
      ta.maxLength = CFG.onboarding.freeTextMaxLength;
      ta.rows = 5;
      ta.placeholder = (EXAMPLES[S.draft.relationship] || EXAMPLES.kataomoi)[st.key];
      ta.value = draftVal(st.key);
      ta.setAttribute('aria-label', st.q);
      const meta = document.createElement('div');
      meta.className = 'field-meta';
      meta.innerHTML = `<span>例文は「${relLabel(S.draft.relationship)}」向けです</span><span class="count"></span>`;
      const upd = () => {
        S.draft[st.key] = ta.value; save();
        meta.querySelector('.count').textContent = `${Array.from(ta.value).length} / ${CFG.onboarding.freeTextMaxLength}`;
        next.textContent = ta.value.trim() ? '次へ' : '書かずに次へ';
      };
      ta.addEventListener('input', upd);
      body.append(ta, meta, notice('お相手のお名前や連絡先は、書かなくて大丈夫です。書いた文章は、そのまま表示されることはありません。'));
      upd();
      next.disabled = false;
    }

    if (isVoice) {
      if (!S.draft.listenTime) S.draft.listenTime = CFG.onboarding.defaults.listenTime;
      if (!S.draft.voiceTone) S.draft.voiceTone = CFG.onboarding.defaults.voiceTone;
      save();
      body.appendChild(segGroup('いつ聴きたいですか？', CFG.onboarding.listenTimes, 'listenTime', '「夜」を選んでも、その日のカードが届きます。音声は一日をふり返る言葉で始まります。'));
      const toneGroup = segGroup('どんな声のトーンが心地よいですか？', CFG.onboarding.voiceTones, 'voiceTone', '');
      body.appendChild(toneGroup);
      const sb = document.createElement('button');
      sb.type = 'button';
      sb.className = 'btn btn-soft sample-btn';
      sb.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.8v10.4L13 8z"/></svg>この声のトーンを試聴する';
      sb.addEventListener('click', () => {
        const ok = VOICE.sample(S.draft.voiceTone, S.draft.listenTime === 'night' ? 'こんばんは。今日のカードを、一緒にふり返りましょう。' : 'おはようございます。今日のカードを、一緒に受け取りましょう。');
        if (!ok) toast('この端末では試聴できませんでした');
      });
      body.appendChild(sb);
      const hint = document.createElement('p');
      hint.className = 'seg-hint';
      hint.textContent = '試聴・ガイド音声はデモ用の合成音声です。マナーモードでも音が出る場合があります。';
      body.appendChild(hint);
      next.disabled = false;
    }
  }

  function notice(text) {
    const d = document.createElement('div');
    d.className = 'notice';
    d.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 1.5l5.5 2v4c0 3.4-2.4 5.9-5.5 7-3.1-1.1-5.5-3.6-5.5-7v-4z"/><path d="M5.6 8l1.7 1.7 3.1-3.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
    d.lastChild.textContent = text;
    return d;
  }

  function segGroup(label, items, key, hintText) {
    const g = document.createElement('div');
    g.className = 'seg-group';
    const l = document.createElement('p');
    l.className = 'seg-label';
    l.textContent = label;
    const seg = document.createElement('div');
    seg.className = 'segmented';
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', label);
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(S.draft[key] === it.id));
      b.textContent = it.label;
      if (it.note) { const sm = document.createElement('small'); sm.textContent = it.note; b.appendChild(sm); }
      b.addEventListener('click', () => {
        S.draft[key] = it.id; save();
        $$('.seg', seg).forEach((o) => o.setAttribute('aria-checked', String(o === b)));
      });
      seg.appendChild(b);
    });
    g.append(l, seg);
    if (hintText) { const p = document.createElement('p'); p.className = 'seg-hint'; p.textContent = hintText; g.appendChild(p); }
    return g;
  }

  function obNext() {
    const step = S.draft.step || 0;
    const st = STEPS[step];
    if (st.key === 'name' && !String(S.draft.name || '').trim()) return;
    if (st.key === 'relationship' && !S.draft.relationship) return;
    if (st.type === 'voice') { completeOnboarding(); return; }
    S.draft.step = step + 1;
    save();
    renderOnboarding();
    window.scrollTo(0, 0);
  }
  $('#obNext').addEventListener('click', obNext);
  $('#obSkip').addEventListener('click', () => {
    const st = STEPS[S.draft.step || 0];
    if (st.type === 'free') { S.draft[st.key] = ''; save(); }
    obNext();
  });

  function completeOnboarding() {
    if (S.profile) { go('draw', { replace: true }); return; }
    const d = S.draft;
    const clean = (v) => String(v || '').trim().slice(0, CFG.onboarding.freeTextMaxLength);
    S.profile = {
      name: String(d.name || '').trim().slice(0, CFG.onboarding.nameMaxLength),
      relationship: d.relationship,
      wish: clean(d.wish),
      situation: clean(d.situation),
      worry: clean(d.worry),
      idealDay: clean(d.idealDay),
      listenTime: d.listenTime || CFG.onboarding.defaults.listenTime,
      voiceTone: d.voiceTone || CFG.onboarding.defaults.voiceTone,
      completedAt: new Date().toISOString()
    };
    save();
    if (!S.sent.onboardingCompleted) {
      const p = S.profile;
      const free = ['wish', 'situation', 'worry', 'idealDay'];
      S.sent.onboardingCompleted = true;
      track(CFG.analytics.eventNames.onboardingCompleted, {
        items_total: 8,
        relationship: p.relationship,
        name_provided: !!p.name,
        wish_provided: !!p.wish,
        situation_provided: !!p.situation,
        worry_provided: !!p.worry,
        ideal_day_provided: !!p.idealDay,
        skipped_count: free.filter((k) => !p[k]).length,
        listen_time: p.listenTime,
        voice_tone: p.voiceTone
      });
    }
    VOICE.stopAll();
    go('draw', { replace: true });
  }

  /* =========================================================
   * カードを引く
   * ========================================================= */
  let drawState = { picked: false };
  function renderDraw() {
    const today = todayJst();
    drawState = { picked: false };
    const fan = bind('fan');
    fan.classList.remove('is-picking');
    fan.innerHTML = '';
    bind('drawReveal').classList.remove('show');
    $('#toResultBtn').style.visibility = 'hidden';
    setText('drawSub', '7枚のうち、どれでも大丈夫です');
    bind('drawTitle').innerHTML = isNightNow()
      ? '今日をそっとふり返りながら、<br>心が向いた一枚を選んでください。'
      : '深呼吸をひとつして、<br>心が向いた一枚を選んでください。';

    // 先に生成を始める（めくる演出と並行）。選定はサーバー側のシードで決まる
    const gen = ensureDaily(today);

    const N = 7;
    for (let i = 0; i < N; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fan-card';
      b.setAttribute('aria-label', `${i + 1}枚目のカード`);
      const off = i - (N - 1) / 2;
      b.style.transform = `rotate(${off * 10}deg) translateY(${Math.abs(off) * 4}px)`;
      b.innerHTML = `<div class="flip"><div class="side back">${CARDS.renderCardBack()}</div><div class="side front"></div></div>`;
      b.style.opacity = '0';
      fan.appendChild(b);
      setTimeout(() => { b.style.opacity = '1'; }, 60 * i + 50);
      b.addEventListener('click', () => pick(b, gen));
    }
  }

  async function pick(btn, gen) {
    if (drawState.picked) return;
    drawState.picked = true;
    const fan = bind('fan');
    fan.classList.add('is-picking');
    btn.classList.add('is-picked');
    btn.style.transform = 'translateY(-46px) scale(1.42)';
    setText('drawSub', 'カードをめくっています…');
    const day = await gen;
    const card = CARDS.byId(day.cardId);
    btn.querySelector('.front').innerHTML = CARDS.renderCardFace(card);
    await sleep(520);
    btn.classList.add('is-flipped');
    await sleep(700);
    setText('revealName', card.name);
    setText('revealEn', card.en);
    setText('drawSub', '');
    bind('drawReveal').classList.add('show');
    $('#toResultBtn').style.visibility = 'visible';
  }
  $('#toResultBtn').addEventListener('click', () => go('result', { replace: true }));

  /* =========================================================
   * 結果
   * ========================================================= */
  function renderResult() {
    const today = todayJst();
    const day = S.days[today];
    const card = CARDS.byId(day.cardId);
    if (!day.openedAt) {
      day.openedAt = new Date().toISOString();
      save();
    }
    const mode = audioModeFor(S.profile);
    setText('resultFor', `${GEN.callName(S.profile.name)}の今日のカード`);
    setText('resultDate', GEN.formatDateJa(today));
    bind('resultCard').innerHTML = CARDS.renderCardFace(card);
    setText('resultName', card.name);
    setText('resultEn', card.en);
    const kw = bind('resultKw');
    kw.innerHTML = '';
    card.keywords.forEach((k) => { const s = document.createElement('span'); s.textContent = k; kw.appendChild(s); });
    setText('forYou', `${GEN.callName(S.profile.name)}へ、今日の言葉`);
    setText('interp', day.interpretation[mode] || day.interpretation.morning);
    setText('action', day.action + '。');
    const ul = bind('affirm');
    ul.innerHTML = '';
    day.affirmations.forEach((a) => { const li = document.createElement('li'); li.textContent = a; ul.appendChild(li); });
    setText('audioLen', fmtLen(day.estimatedSeconds[mode] || CFG.audio.targetSeconds));
    setText('cardSymbols', card.symbols);
    setText('cardMeaning', card.meaning);

    // 反映した回答（本文は出さず、カテゴリだけ）
    const r = day.reflected;
    const dl = bind('reflected');
    dl.innerHTML = '';
    const row = (k, v) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); };
    row('恋愛の状況', `${relLabel(r.relationship)}（カードの選ばれやすさと、行動の提案に反映）`);
    row('気持ち', r.worry.from ? `「${r.worry.label}」として読み取り、最初の一文に反映` : `回答がなかったため、「${relLabel(r.relationship)}」から言葉を選びました`);
    row('願い', r.wish ? `「${r.wish.phrase}」として読み取り、行動の前置きに反映` : `回答がなかったため、「${relLabel(r.relationship)}」をもとにしています`);
    row('呼び名', r.nameCalled ? '音声の冒頭で一度だけお呼びします' : '—');
    row('音声', `${listenLabel(S.profile.listenTime)}・${toneLabel(S.profile.voiceTone)}`);

    const rules = bind('rulesList');
    rules.innerHTML = '';
    CFG.method.rules.forEach((t) => { const li = document.createElement('li'); li.textContent = t; rules.appendChild(li); });
    const ch = bind('checkList');
    ch.innerHTML = '';
    const c = day.checks;
    const item = (ok, t) => { const li = document.createElement('li'); if (!ok) li.className = 'ng'; li.textContent = t; ch.appendChild(li); };
    item(c.interpretationLengthOk, `解釈文 ${c.interpretationChars}字（目安 200〜300字）`);
    item(c.affirmationCountOk, `アファメーション ${day.affirmations.length}文（目安 1〜3文）`);
    item(!c.avoidPhraseHits.length, c.avoidPhraseHits.length ? `避けたい言い回しを検出：${c.avoidPhraseHits.join('、')}` : '避けたい言い回し：検出なし');
    item(true, `音声の長さ（推定）：朝 ${fmtTime(day.estimatedSeconds.morning * 1000)}／夜 ${fmtTime(day.estimatedSeconds.night * 1000)}`);

    // カードと文章を先に出し、音声はその場で準備
    renderAudioStatus();
    if (!day.audio || day.audio.status !== 'ready' || !audioReadyThisSession) {
      ensureAudio(today).then((a) => { if (a && a.status === 'ready') audioReadyThisSession = true; });
    }
  }
  let audioReadyThisSession = false;

  function renderAudioStatus() {
    const day = S.days[todayJst()];
    const st = bind('audioStatus');
    if (!st || !day) return;
    const a = day.audio || { status: 'pending' };
    const toAudio = $('#toAudioBtn');
    const retry = $('#retryAudioBtn');
    const capOnly = $('#captionsOnlyBtn');
    st.className = 'status';
    if (a.status === 'pending') {
      st.innerHTML = '<span class="spinner"></span>音声を準備中…　先に言葉を読んでいてくださいね';
      toAudio.disabled = true; retry.style.display = 'none'; capOnly.style.display = 'none';
    } else if (a.status === 'ready') {
      st.classList.add('ok');
      st.textContent = S.sent.audioCompleted[todayJst()] ? '最後まで聴きました。何度でも聴けます' : '音声の準備ができました';
      toAudio.disabled = false; retry.style.display = 'none'; capOnly.style.display = 'none';
    } else {
      st.classList.add('err');
      const why = { 'no-japanese-voice': 'この端末に日本語の音声が見つかりませんでした', 'no-voices': '音声を読み込めませんでした', unsupported: 'このブラウザは音声の再生に対応していません', forced: '音声の準備に失敗しました（テスト）' }[a.reason] || '音声の準備に失敗しました';
      st.textContent = why + '。カードと言葉はそのままです。';
      toAudio.disabled = true; retry.style.display = ''; capOnly.style.display = '';
    }
  }
  $('#toAudioBtn').addEventListener('click', () => { audioCaptionsOnly = false; go('audio'); });
  $('#retryAudioBtn').addEventListener('click', () => {
    ensureAudio(todayJst()).then((a) => { if (a && a.status === 'ready') { audioReadyThisSession = true; toast('音声の準備ができました'); } });
  });
  $('#captionsOnlyBtn').addEventListener('click', () => { audioCaptionsOnly = true; go('audio'); });

  /* =========================================================
   * ガイド音声
   * ========================================================= */
  let player = null;
  let audioMode = 'morning';
  let audioCaptionsOnly = false;
  let captionsOn = true;

  function renderAudio() {
    const today = todayJst();
    const day = S.days[today];
    const card = CARDS.byId(day.cardId);
    audioMode = audioModeFor(S.profile);
    bind('audioMini').innerHTML = CARDS.renderCardFace(card);
    setText('audioDate', `${GEN.formatDateJa(today)}のカード`);
    setText('audioName', card.name);
    $('#audioDone').classList.remove('show');
    const canTts = day.audio && day.audio.status === 'ready' && !audioCaptionsOnly;
    setText('ttsLabel', canTts ? `デモ用の合成音声（${toneLabel(day.tone)}）` : '字幕モード（音声なし）');
    $$('.mode-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === audioMode)));
    setupPlayer();
    // 再読み込み後にホームから直接来た場合も、声の選択だけ済ませておく
    if (canTts && !audioReadyThisSession) {
      VOICE.prepare({}).then((r) => { if (r.ok) audioReadyThisSession = true; });
    }
  }

  function setupPlayer() {
    teardownPlayer();
    const day = S.days[todayJst()];
    const canTts = day.audio && day.audio.status === 'ready' && !audioCaptionsOnly;
    const caption = $('#caption');
    caption.className = 'caption idle';
    caption.innerHTML = audioMode === 'night'
      ? '再生ボタンを押すと、夜のガイド音声が始まります。<br>一日をふり返りながら、楽な姿勢で。'
      : '再生ボタンを押すと、ガイド音声が始まります。<br>イヤホンがあると、より心地よく聴けます。';
    $('#progressBar').style.width = '0%';
    $('#timeNow').textContent = '0:00';
    $('#timeTotal').textContent = '約' + fmtTime((day.estimatedSeconds[audioMode] || CFG.audio.targetSeconds) * 1000);
    setPlayIcon(false);
    $('#audioWrap').classList.remove('is-playing');
    $$('.mode-switch button').forEach((b) => { b.disabled = false; });

    player = VOICE.create({
      segments: day.scripts[audioMode],
      tone: day.tone,
      mode: canTts ? 'tts' : 'captions',
      targetSeconds: CFG.audio.targetSeconds,
      onState: (s) => {
        setPlayIcon(s === 'playing');
        $('#audioWrap').classList.toggle('is-playing', s === 'playing');
        // 再生中は朝／夜の切り替えを止める
        $$('.mode-switch button').forEach((b) => { b.disabled = s === 'playing' || s === 'paused'; });
        if (s === 'paused') { caption.classList.add('dim'); }
      },
      onCaption: ({ text }) => {
        caption.className = 'caption';
        caption.textContent = text;
      },
      onProgress: ({ elapsedMs, totalMs, ratio }) => {
        $('#progressBar').style.width = `${(ratio * 100).toFixed(1)}%`;
        $('#timeNow').textContent = fmtTime(elapsedMs);
        $('#timeTotal').textContent = (player && player.state === 'ended' ? '' : '約') + fmtTime(totalMs);
      },
      onComplete: ({ elapsedSeconds, mode }) => {
        caption.className = 'caption idle';
        caption.textContent = '';
        $('#audioDone').classList.add('show');
        const today = todayJst();
        const d = S.days[today];
        d.audioCompletedAt = d.audioCompletedAt || new Date().toISOString();
        // 自然に最後まで再生したときだけ。同じ日は1回だけ送る
        if (!S.sent.audioCompleted[today]) {
          S.sent.audioCompleted[today] = true;
          save();
          track(CFG.analytics.eventNames.audioCompleted, {
            card_id: d.cardId,
            audio_mode: audioMode,
            voice_tone: d.tone,
            playback: mode,
            elapsed_seconds: elapsedSeconds,
            estimated_seconds: d.estimatedSeconds[audioMode]
          });
        } else {
          save();
        }
      }
    });
  }

  function teardownPlayer() {
    if (player) { player.destroy(); player = null; }
    VOICE.stopAll();
  }

  function setPlayIcon(playing) {
    $('#playIcon').innerHTML = playing ? '<path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/>' : '<path d="M8 5.5v13L18.5 12z"/>';
    $('#playBtn').setAttribute('aria-label', playing ? '一時停止' : '再生');
  }

  $('#playBtn').addEventListener('click', () => {
    if (!player) return;
    if (player.state === 'playing') player.pause();
    else { $('#caption').classList.remove('dim'); $('#audioDone').classList.remove('show'); player.play(); }
  });
  $('#restartBtn').addEventListener('click', () => {
    if (!player) return;
    $('#audioDone').classList.remove('show');
    player.restart();
  });
  $('#captionToggle').addEventListener('click', (e) => {
    captionsOn = !captionsOn;
    e.currentTarget.setAttribute('aria-pressed', String(captionsOn));
    $('#captionBox').classList.toggle('hidden-captions', !captionsOn);
  });
  $$('.mode-switch button').forEach((b) => b.addEventListener('click', () => {
    if (b.disabled || audioMode === b.dataset.mode) return;
    audioMode = b.dataset.mode;
    $$('.mode-switch button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#audioDone').classList.remove('show');
    setupPlayer();
  }));
  // 画面ロックやアプリ切り替えで止まるので、状態を合わせて一時停止にする
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && player && player.state === 'playing') player.pause();
  });
  window.addEventListener('pagehide', () => { if (player) player.pause(); });

  /* =========================================================
   * ペイウォール
   * ========================================================= */
  let planSending = false;
  function renderPaywall() {
    fillBacks(document);
    const day = S.days[todayJst()];
    const face = $('[data-pw-face]');
    face.innerHTML = CARDS.renderCardFace(CARDS.byId(day.cardId));
    const tapped = S.sent.paywallPlanTapped;
    $('#pwThanks').classList.toggle('show', !!tapped);
    $('#planBtn').style.display = tapped ? 'none' : '';
  }
  $('#planBtn').addEventListener('click', () => {
    if (planSending) return;
    planSending = true;
    $('#planBtn').disabled = true;
    if (!S.sent.paywallPlanTapped) {
      S.sent.paywallPlanTapped = true;
      save();
      track(CFG.analytics.eventNames.paywallPlanTapped, {
        plan: 'monthly_1200_trial_7d',
        source: 'home_continue',
        day_count: dayCount(),
        audio_completed_today: !!S.sent.audioCompleted[todayJst()]
      });
    }
    $('#planBtn').style.display = 'none';
    $('#pwThanks').classList.add('show');
    setTimeout(() => { planSending = false; $('#planBtn').disabled = false; }, 800);
  });

  /* =========================================================
   * 設定シート
   * ========================================================= */
  function openSheet(html, after) {
    $('#sheetBody').innerHTML = html;
    $('#sheet').classList.add('show');
    $('#sheetBackdrop').classList.add('show');
    if (after) after($('#sheetBody'));
  }
  function closeSheet() {
    $('#sheet').classList.remove('show');
    $('#sheetBackdrop').classList.remove('show');
  }
  $('#sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  $('#menuBtn').addEventListener('click', () => {
    const p = S.profile;
    openSheet(`
      <h2 id="sheetTitle">設定</h2>
      ${p ? `
      <div class="row"><span>呼び名</span><span class="muted" id="sName"></span></div>
      <div class="row"><span>恋の状況</span><span class="muted">${relLabel(p.relationship)}</span></div>
      <div id="sVoice"></div>` : '<p class="small muted">まだ質問に答えていません。</p>'}
      <div style="margin-top:18px">
        <button class="btn btn-soft" id="sAbout">この体験版について</button>
        <button class="btn btn-ghost" id="sReset" style="color:var(--warn)">入力内容をすべて消す</button>
        <button class="btn btn-ghost" id="sClose">閉じる</button>
      </div>`, (root) => {
      if (p) {
        $('#sName', root).textContent = GEN.callName(p.name);
        const holder = $('#sVoice', root);
        S.draft.listenTime = p.listenTime; S.draft.voiceTone = p.voiceTone;
        holder.appendChild(segGroup('いつ聴きたいですか？', CFG.onboarding.listenTimes, 'listenTime', ''));
        holder.appendChild(segGroup('声のトーン', CFG.onboarding.voiceTones, 'voiceTone', ''));
        holder.style.marginTop = '14px';
        holder.addEventListener('click', () => {
          setTimeout(() => {
            const changedTone = S.draft.voiceTone !== S.profile.voiceTone;
            S.profile.listenTime = S.draft.listenTime;
            S.profile.voiceTone = S.draft.voiceTone;
            save();
            if (changedTone) rebuildScripts(todayJst());
            if (current === 'audio') renderAudio();
            if (current === 'result') renderResult();
          }, 0);
        });
      }
      $('#sClose', root).addEventListener('click', closeSheet);
      $('#sAbout', root).addEventListener('click', () => openSheet(`
        <h2 id="sheetTitle">この体験版について</h2>
        <p class="small">朱里さんのフォロワーが、朝にスマホで恋愛のカードを1枚引き、その日の自分に向けた言葉を受け取る体験を確かめるためのデモです。</p>
        <ul class="small" style="padding-left:1.2em">
          <li>カードの解釈・音声の文言は監修前の仮のものです。</li>
          <li>ガイド音声は端末の合成音声で読み上げています。</li>
          <li>カードは大アルカナの名称・象徴・一般的な意味を使い、カード面はオリジナルの図案です。</li>
          <li>占いの結果は、相手の気持ちや未来を言い当てたり、保証したりするものではありません。</li>
          <li>入力内容はこの端末の中だけに保存されます。お申し込みや請求は発生しません。</li>
        </ul>
        <button class="btn btn-soft" id="sBack">戻る</button>`, (r2) => { $('#sBack', r2).addEventListener('click', () => $('#menuBtn').click()); }));
      $('#sReset', root).addEventListener('click', () => {
        if (!confirm('入力内容とカードの記録を、この端末からすべて消します。よろしいですか？')) return;
        teardownPlayer();
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
        S = freshState(); save();
        closeSheet();
        go('home', { replace: true });
        toast('入力内容を消しました');
      });
    });
  });

  /* =========================================================
   * デバッグ／受け入れ確認パネル（?debug=1 またはロゴを5回タップ）
   * ========================================================= */
  let debugOn = params.get('debug') === '1';
  let brandTaps = [];
  $('#brand').addEventListener('click', () => {
    const now = Date.now();
    brandTaps = brandTaps.filter((t) => now - t < 1500).concat(now);
    if (brandTaps.length >= 5) { debugOn = true; brandTaps = []; renderDebug(); openDebug(); }
  });
  function renderDebug() {
    let pill = $('#debugPill');
    if (!debugOn) { if (pill) pill.remove(); return; }
    if (!pill) {
      pill = document.createElement('button');
      pill.id = 'debugPill';
      pill.className = 'debug-pill';
      pill.addEventListener('click', openDebug);
      document.body.appendChild(pill);
    }
    pill.textContent = `debug · ${S.userId.slice(5, 13)} · ${todayJst()} · ev ${S.events.length}`;
  }
  function openDebug() {
    const names = CFG.analytics.eventNames;
    const has = (n) => S.events.some((e) => e.event_name === n);
    const today = todayJst();
    const day = S.days[today];
    const rows = S.events.slice().reverse().map((e) => `<tr><td>${e.created_at.slice(5, 19).replace('T', ' ')}</td><td>${e.event_name}</td><td><code>${escapeHtml(JSON.stringify(e.properties))}</code></td></tr>`).join('');
    openSheet(`
      <h2 id="sheetTitle">受け入れ確認パネル</h2>
      <div class="debug">
        <div>user_id：<code>${S.userId}</code></div>
        <div>今日（日本時間）：<code>${today}</code>（日付ずらし ${S.debug.dayOffset || 0} 日）・時刻 ${hourJst()}時</div>
        <div>今日のカード：<code>${day ? day.cardId : '—'}</code>・音声：<code>${day && day.audio ? day.audio.status : '—'}</code>・日数：<code>${dayCount()}</code></div>
        <div>日本語音声：<code>${VOICE.supported ? VOICE.listJaVoices().map((v) => v.name).join(', ') || 'なし' : '非対応'}</code></div>
        <div>Supabase：<code>${CFG.analytics.supabase.url ? '送信あり（未送信 ' + S.outbox.length + '件）' : '未設定（端末内のみ）'}</code></div>
        <p style="margin:10px 0 4px"><b>受け入れ条件</b></p>
        <ul class="check-list">
          <li class="${has(names.onboardingCompleted) ? '' : 'ng'}">${names.onboardingCompleted}</li>
          <li class="${has(names.audioCompleted) ? '' : 'ng'}">${names.audioCompleted}（自然に最後まで再生したときだけ）</li>
          <li class="${has(names.paywallPlanTapped) ? '' : 'ng'}">${names.paywallPlanTapped}（連打しても1回）</li>
          <li class="${new Set(S.events.map((e) => e.user_id)).size <= 1 ? '' : 'ng'}">すべて同じ user_id</li>
        </ul>
        <div class="btns">
          <button data-dbg="prev">−1日</button>
          <button data-dbg="next">＋1日（翌日の再訪を試す）</button>
          <button data-dbg="today">今日に戻す</button>
          <button data-dbg="ttsfail">${S.debug.forceTtsFail ? 'TTS失敗テスト：ON' : 'TTS失敗テスト：OFF'}</button>
          <button data-dbg="copy">イベントJSONをコピー</button>
          <button data-dbg="newuser">新規ユーザーでやり直す</button>
        </div>
        <table><thead><tr><th>時刻(UTC)</th><th>イベント</th><th>属性</th></tr></thead><tbody>${rows || '<tr><td colspan="3">まだありません</td></tr>'}</tbody></table>
        <button class="btn btn-ghost" id="dbgClose">閉じる</button>
      </div>`, (root) => {
      $('#dbgClose', root).addEventListener('click', closeSheet);
      $$('[data-dbg]', root).forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.dbg;
        if (a === 'prev') S.debug.dayOffset = (S.debug.dayOffset || 0) - 1;
        if (a === 'next') S.debug.dayOffset = (S.debug.dayOffset || 0) + 1;
        if (a === 'today') S.debug.dayOffset = 0;
        if (a === 'ttsfail') S.debug.forceTtsFail = !S.debug.forceTtsFail;
        if (a === 'copy') {
          const txt = JSON.stringify(S.events, null, 2);
          (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('コピーしました'), () => toast('コピーできませんでした'));
          return;
        }
        if (a === 'newuser') {
          teardownPlayer();
          S = freshState(); save();
          closeSheet(); go('home', { replace: true });
          toast('新規ユーザーになりました');
          return;
        }
        save();
        teardownPlayer();
        route();
        openDebug();
      }));
    });
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* =========================================================
   * 起動
   * ========================================================= */
  // 日付が変わったらホームを描き直す（開きっぱなし対策）
  let lastDate = todayJst();
  setInterval(() => {
    const d = todayJst();
    if (d !== lastDate) { lastDate = d; if (current === 'home') route(); }
  }, 60000);

  fillBacks(document);
  route();
  flushOutbox();
})();
