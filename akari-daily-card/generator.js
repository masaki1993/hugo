/*
 * 生成ロジック（本番ではサーバー側：カード選定 → Claude API → TTS）
 * ------------------------------------------------------------
 * デモでは API キーをブラウザに置けないため、同じ入出力の形を保った
 * ローカル生成器で代替しています。
 *   入力 : { userId, dateJst, profile }
 *   出力 : { cardId, interpretation, action, affirmations, scripts:{morning,night}, reflected, checks }
 * 本番へ移すときは generateDaily() を「サーバーの /api/daily を叩く関数」に
 * 差し替えるだけで、画面側は変更不要です。
 */
(function (global) {
  'use strict';

  const CFG = global.AKARI_CONFIG;
  const { CARDS, REL } = global.AKARI_CARDS;

  /* ---------- 日本時間 ---------- */
  function jstParts(date) {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: CFG.time.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
    });
    const o = {};
    f.formatToParts(date).forEach((p) => { o[p.type] = p.value; });
    return {
      date: `${o.year}-${o.month}-${o.day}`,
      year: +o.year, month: +o.month, day: +o.day,
      hour: +o.hour % 24, minute: +o.minute,
      weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday)
    };
  }
  const WD = ['日', '月', '火', '水', '木', '金', '土'];
  function formatDateJa(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return `${m}月${d}日（${WD[wd]}）`;
  }
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return t.toISOString().slice(0, 10);
  }

  /* ---------- シード付き乱数 ---------- */
  function hash32(str) {
    // FNV-1a
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFor(userId, dateJst) {
    return CFG.draw.seedFormat.replace('{userId}', userId).replace('{dateJst}', dateJst);
  }

  /* ---------- カード選定（恋愛状況で重み付け） ---------- */
  function pickCard(userId, dateJst, relationship, previousCardId) {
    const relIdx = Math.max(0, REL.indexOf(relationship));
    const rnd = mulberry32(hash32(seedFor(userId, dateJst)));
    const weights = CARDS.map((c) => {
      let w = c.weights[relIdx];
      // 前日と同じカードは選ばれにくく（連続で同じだと体験として弱いため）
      if (previousCardId && c.id === previousCardId) w *= 0.15;
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let i = 0; i < CARDS.length; i++) {
      r -= weights[i];
      if (r <= 0) return { card: CARDS[i], rnd };
    }
    return { card: CARDS[CARDS.length - 1], rnd };
  }

  /* ---------- 自由記述の読み取り（文面は引用せず、カテゴリだけ使う） ---------- */
  const WORRY = [
    { id: 'waiting', re: /返事|返信|既読|未読|連絡|LINE|ライン|ﾗｲﾝ|メッセージ|DM|メール|電話/i,
      text: '返事が気になる{tw}は、何度も画面を見てしまうことがあります。', label: '連絡・返事を待つ気持ち' },
    { id: 'jealousy', re: /嫉妬|やきもち|ヤキモチ|浮気|他の(女|男|人)|ライバル|元カノ|元カレの影/,
      text: '誰かと比べてしまう気持ちは、それだけ大切に思っている証でもあります。', label: '比べてしまう気持ち' },
    { id: 'conflict', re: /喧嘩|けんか|ケンカ|すれ違|言い合い|怒|冷た|そっけな|イライラ/,
      text: 'すれ違いのあとは、どちらから歩み寄ればいいのか迷ってしまいますね。', label: 'すれ違い・言い合い' },
    { id: 'past', re: /元彼|元カレ|元恋人|元夫|別れ|振られ|ふられ|フラれ|ブロック|復縁/,
      text: '終わった形を思い出すたびに、胸がぎゅっとなる日もありますね。', label: '過去の別れ' },
    { id: 'distance', re: /会えない|遠距離|距離|忙し|時間がない|すれちがい/,
      text: '会えない時間が続くと、心の距離まで遠く感じることがあります。', label: '会えない・距離' },
    { id: 'feelings', re: /気持ち|本音|脈|どう思|好きなのか|好きかどうか|興味/,
      text: '相手の気持ちが見えないと、小さなしぐさにも意味を探してしまいますね。', label: '相手の気持ちが見えない' },
    { id: 'future', re: /結婚|将来|未来|このまま|先が|年齢|親/,
      text: 'この先がはっきりしないと、今の幸せまで揺らいで感じることがあります。', label: 'この先への迷い' },
    { id: 'meeting', re: /出会い|出会え|いい人|マッチング|アプリ|紹介|お見合い/,
      text: 'なかなか縁が見えないと、焦りが少しずつたまっていきますね。', label: '出会いへの焦り' },
    { id: 'confidence', re: /自信|自分なんて|私なんて|可愛く|かわいく|魅力|容姿|太|ブス/,
      text: '自分に自信が持てない日は、自分のいいところを見落としがちです。', label: '自分への自信' },
    { id: 'anxiety', re: /不安|怖|こわ|心配|モヤモヤ|もやもや|寂し|さみし|つら|辛|苦し/,
      text: '言葉にしにくい不安を抱えたまま、{tw}を迎えることもありますね。', label: '言葉にしにくい不安' }
  ];
  const WORRY_DEFAULT = {
    kataomoi: { text: '想いを胸にしまったまま過ごす{tw}は、少しだけ心が忙しくなりますね。', label: '片思い（回答なし）' },
    kosai: { text: '大切な人がいるからこそ、小さなことで心が揺れる{tw}もありますね。', label: '交際中（回答なし）' },
    fukuen: { text: 'あの人を想う気持ちが、ふと戻ってくる{tw}もありますね。', label: '復縁希望（回答なし）' },
    konkatsu: { text: 'これからの出会いを思うと、期待と迷いが一緒にやってきますね。', label: '婚活中（回答なし）' },
    kaizen: { text: '近くにいるからこそ、伝えきれない思いがたまっていくこともありますね。', label: '関係改善（回答なし）' }
  };

  const WISH = [
    { id: 'marriage', re: /結婚|プロポーズ|入籍|家族|夫婦/, phrase: '一緒に未来を歩ける関係', aff: '私は、大切な人と未来を育てていく力を持っています。' },
    { id: 'reunion', re: /復縁|やり直|戻り|戻れ|もう一度|より戻/, phrase: 'もう一度向き合える関係', aff: '私は、どんな形の未来も受けとめられる私でいます。' },
    { id: 'together', re: /付き合|両想い|両思い|恋人|彼女に|彼氏に|告白/, phrase: '想いが通じ合う関係', aff: '私は、想いを通わせる力を持っています。' },
    { id: 'peace', re: /穏やか|安心|喧嘩しない|仲良く|笑顔|笑い合|大切にされ|優しく/, phrase: '穏やかに笑い合える関係', aff: '私は、穏やかな愛を育てる力を持っています。' },
    { id: 'contact', re: /連絡|LINE|ライン|話したい|会話|電話/i, phrase: '気軽に言葉を交わせる関係', aff: '私の言葉は、やさしく相手に届いていきます。' },
    { id: 'date', re: /デート|旅行|会いたい|一緒に過ご|一緒にいたい|週末/, phrase: '一緒に過ごす時間が増えること', aff: '私は、大切な人と過ごす時間を心から味わえます。' },
    { id: 'meet', re: /出会|運命の人|いい人|素敵な人/, phrase: '心から大切にし合える人との出会い', aff: '私は、大切にし合える縁を迎える準備ができています。' }
  ];
  const WISH_DEFAULT = {
    kataomoi: 'この想いを大切にしながら',
    kosai: '二人の時間を大切にしながら',
    fukuen: '今の自分を大切にしながら',
    konkatsu: '自分らしいご縁を信じながら',
    kaizen: '二人の関係を思うあなただからこそ'
  };

  function classifyWorry(profile) {
    const src = [profile.worry, profile.situation].filter(Boolean).join(' ');
    if (src.trim()) {
      for (const w of WORRY) if (w.re.test(src)) return { ...w, from: profile.worry && w.re.test(profile.worry) ? 'worry' : 'situation' };
    }
    const d = WORRY_DEFAULT[profile.relationship] || WORRY_DEFAULT.kataomoi;
    return { id: 'default', text: d.text, label: d.label, from: null };
  }
  function classifyWish(profile) {
    const src = [profile.wish, profile.idealDay].filter(Boolean).join(' ');
    if (src.trim()) {
      for (const w of WISH) if (w.re.test(src)) return { ...w, from: profile.wish && w.re.test(profile.wish) ? 'wish' : 'idealDay' };
      // キーワードが拾えなくても願いの入力はある → 汎用の言い換え
      return { id: 'generic', phrase: 'あなたが思い描く恋のかたち', from: profile.wish ? 'wish' : 'idealDay' };
    }
    return null;
  }

  /* ---------- 文字数（サロゲートペア対応） ---------- */
  const len = (s) => Array.from(s).length;

  /* ---------- 解釈文の組み立て（200〜300字に収める） ---------- */
  function composeInterpretation(card, profile, mode, rnd) {
    const tw = mode === 'night' ? '夜' : '朝';
    const rel = profile.relationship || 'kataomoi';
    const worry = classifyWorry(profile);
    const wish = classifyWish(profile);
    const action = card.actions[rel];

    const empathy = worry.text.replace('{tw}', tw);
    const cardIntro = `今日のカードは「${card.name}」。`;
    const bridge = wish ? `${wish.phrase}を願う気持ちを大切にしながら、` : `${WISH_DEFAULT[rel]}、`;
    // 夜は「今日のカード」を受け取りつつ、行動は眠る前か明日の朝に置く
    const actionSentence = mode === 'night' ? `眠る前のひとときか明日の朝に、${action}。` : `今日は、${action}。`;
    const fillers = [
      '小さな一歩で、十分です。',
      'できなかった日も、自分を責めなくて大丈夫。',
      'あなたのペースで、ゆっくりいきましょう。'
    ];

    let parts = [empathy, cardIntro + card.love, bridge + actionSentence];
    const extras = [];
    let text = parts.join('');
    const { min, max } = CFG.method.interpretationLength;
    let fi = Math.floor(rnd() * fillers.length);
    let guard = 0;
    // 下限ぎりぎりを避け、220字前後を目安に一文ずつ足す
    while ((len(text) < min + 20 && guard < 2) || (len(text) < min && guard < fillers.length)) {
      guard++;
      const f = fillers[fi % fillers.length];
      parts.push(f);
      extras.push(f);
      fi++;
      text = parts.join('');
    }
    if (len(text) > max) {
      // 橋渡しを短くする → それでも超えるなら共感文を外す
      parts[2] = actionSentence;
      text = parts.join('');
      if (len(text) > max) { parts.shift(); text = parts.join(''); }
    }
    return { text, action, worry, wish, empathy, cardLove: card.love, bridge, actionSentence, extras };
  }

  function pickAffirmations(card, wish, rnd) {
    const idx = [0, 1, 2].sort(() => rnd() - 0.5).slice(0, 2);
    const list = idx.sort().map((i) => card.affirmations[i]);
    if (wish && wish.aff) list.push(wish.aff);
    return list.slice(0, CFG.method.affirmationCount.max);
  }

  /* ---------- 呼び名 ---------- */
  function callName(name) {
    const n = (name || '').trim();
    if (!n) return '';
    if (/(さん|ちゃん|くん|君|様|さま|たん|氏)$/.test(n)) return n;
    return n + 'さん';
  }

  /* ---------- 音声台本（朝／夜 × 3トーン） ----------
   * segments: { text, pause(ms), flex(bool) } の配列
   * flex=true の間（呼吸の時間など）は、実測した発話速度に合わせて伸縮し、
   * 全体を約2分15秒に寄せる。
   */
  function sentences(text) {
    // 古い iOS Safari は後読み正規表現に未対応のため match で分割
    return (text.match(/[^。！？]+[。！？]?/g) || []).map((s) => s.trim()).filter(Boolean);
  }

  function buildScript(card, profile, interp, affirmations, mode, tone) {
    const name = callName(profile.name);
    const night = mode === 'night';
    const S = [];
    const add = (text, pause, flex) => S.push({ text, pause: pause || 700, flex: !!flex });

    // 1. 導入（呼び名は冒頭で一度だけ）
    if (night) {
      add(`${name}、こんばんは。`, 900);
      add(tone === 'strong' ? '今日も一日、本当によく頑張りましたね。' : '今日も一日、おつかれさまでした。', 1100);
      add('少しだけ、今日という日をふり返りながら、今日のカードを、もう一度受け取りましょう。', 1600, true);
    } else {
      add(`${name}、おはようございます。`, 900);
      add(tone === 'strong' ? '新しい一日が始まりますね。' : '新しい朝が、来ましたね。', 1000);
      add('一日が動き出す前に、ほんの少しだけ、自分のために時間を使いましょう。', 1600, true);
    }

    // 2. 呼吸
    add(tone === 'calm' ? '肩の力を、ふっと抜いて。' : '肩の力を抜いて、楽な姿勢になりましょう。', 1500, true);
    add('ゆっくり、鼻から息を吸って。', 3200, true);
    add('細く、長く、口から吐いていきます。', 4200, true);
    add('もう一度。吸って。', 3200, true);
    add('吐いて。', 4200, true);
    add(night ? '今日の出来事が、少しずつ遠ざかっていくのを感じてください。' : '体のすみずみに、新しい空気がめぐっていくのを感じてください。', 2400, true);

    // 3. カード
    add(`今日、あなたのもとに来てくれたカードは、「${card.name}」です。`, 1500, true);
    add(`キーワードは、${card.keywords.join('、')}。`, 1500, true);

    // 4. 解釈（カード名は直前に読んだので省き、行動は 5. でまとめて読む）
    const readBody = [interp.empathy, ...sentences(interp.cardLove)];
    readBody.forEach((s, i, arr) => add(s, i === arr.length - 1 ? 1800 : 900, i === arr.length - 1));

    // 5. 今日の小さな行動
    if (night) {
      add('今日、このカードのように過ごせた瞬間は、ありましたか。', 2600, true);
      add('もし、まだだったら。', 900);
      add(interp.bridge, 350);
      sentences(interp.actionSentence).forEach((t, i, arr) => add(t, i === arr.length - 1 ? 1800 : 700, i === arr.length - 1));
    } else {
      add('今日の、小さな行動です。', 900);
      add(interp.bridge, 350);
      sentences(interp.actionSentence).forEach((t, i, arr) => add(t, i === arr.length - 1 ? 1600 : 700, i === arr.length - 1));
      if (interp.extras.length) add(interp.extras[0], 1200);
      add(tone === 'strong' ? 'できたら、それで十分。自分にマルをつけてあげてください。' : 'できなくても、思い出せただけで十分です。', 1800, true);
    }

    // 6. アファメーション
    add('最後に、アファメーションを、心の中で、一緒に唱えてみましょう。', 1500, true);
    affirmations.forEach((a) => add(a, 3600, true));

    // 7. 締め（監修で最初に差し替える「最後の一言」）
    add(CFG.method.closingLines[night ? 'night' : 'morning'][tone], 1200);
    return S;
  }

  function estimateSeconds(segments, tone) {
    const t = CFG.audio.tones[tone] || CFG.audio.tones.gentle;
    const cps = CFG.audio.charsPerSecond * t.rate;
    let total = 0;
    segments.forEach((s) => { total += len(s.text) / cps + s.pause / 1000; });
    return total;
  }

  /* flex な間を伸縮して targetSeconds に寄せる */
  function fitScript(segments, tone, targetSeconds) {
    const t = CFG.audio.tones[tone] || CFG.audio.tones.gentle;
    const cps = CFG.audio.charsPerSecond * t.rate;
    const speech = segments.reduce((a, s) => a + len(s.text) / cps, 0);
    const fixedPause = segments.filter((s) => !s.flex).reduce((a, s) => a + s.pause / 1000, 0);
    const flexPause = segments.filter((s) => s.flex).reduce((a, s) => a + s.pause / 1000, 0);
    const want = targetSeconds - speech - fixedPause;
    const scale = Math.min(2.2, Math.max(0.45, want / flexPause));
    // 呼吸などの間は短くしすぎない（最低 0.8 秒）
    return segments.map((s) => (s.flex ? { ...s, pause: Math.max(800, Math.round(s.pause * scale)) } : s));
  }

  /* ---------- 監修ルールの自己チェック ---------- */
  function checkRules(interpText, affirmations, scripts) {
    const all = [interpText, ...affirmations, ...scripts.morning.map((s) => s.text), ...scripts.night.map((s) => s.text)].join('\n');
    const hits = CFG.method.avoidPhrases.filter((p) => all.includes(p));
    const n = len(interpText);
    const { min, max } = CFG.method.interpretationLength;
    return {
      avoidPhraseHits: hits,
      interpretationChars: n,
      interpretationLengthOk: n >= min && n <= max,
      affirmationCountOk: affirmations.length >= CFG.method.affirmationCount.min && affirmations.length <= CFG.method.affirmationCount.max
    };
  }

  /* ---------- 1日分の生成 ---------- */
  function generateDaily({ userId, dateJst, profile, previousCardId }) {
    const { card, rnd } = pickCard(userId, dateJst, profile.relationship, previousCardId);
    const tone = profile.voiceTone || CFG.onboarding.defaults.voiceTone;
    const interpMorning = composeInterpretation(card, profile, 'morning', mulberry32(hash32(seedFor(userId, dateJst) + ':text')));
    const interpNight = composeInterpretation(card, profile, 'night', mulberry32(hash32(seedFor(userId, dateJst) + ':text')));
    const affirmations = pickAffirmations(card, interpMorning.wish, rnd);
    const scripts = {};
    ['morning', 'night'].forEach((m) => {
      const interp = m === 'night' ? interpNight : interpMorning;
      const raw = buildScript(card, profile, interp, affirmations, m, tone);
      scripts[m] = fitScript(raw, tone, CFG.audio.targetSeconds);
    });
    const checks = checkRules(interpMorning.text, affirmations, scripts);
    return {
      cardId: card.id,
      interpretation: { morning: interpMorning.text, night: interpNight.text },
      action: interpMorning.action,
      affirmations,
      scripts,
      tone,
      estimatedSeconds: { morning: Math.round(estimateSeconds(scripts.morning, tone)), night: Math.round(estimateSeconds(scripts.night, tone)) },
      reflected: {
        relationship: profile.relationship,
        worry: { category: interpMorning.worry.id, label: interpMorning.worry.label, from: interpMorning.worry.from },
        wish: interpMorning.wish ? { category: interpMorning.wish.id, phrase: interpMorning.wish.phrase, from: interpMorning.wish.from } : null,
        nameCalled: !!profile.name
      },
      checks,
      generatedAt: new Date().toISOString(),
      generator: 'local-template@' + CFG.appVersion
    };
  }

  global.AKARI_GEN = {
    jstParts, formatDateJa, addDays, hash32, mulberry32, seedFor, pickCard,
    classifyWorry, classifyWish, composeInterpretation, buildScript, fitScript,
    estimateSeconds, checkRules, generateDaily, callName, len, sentences,
    WORRY, WISH
  };
})(window);
