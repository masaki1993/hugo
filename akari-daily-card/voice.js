/*
 * ガイド音声プレイヤー（デモ用の合成音声：Web Speech API）
 * ------------------------------------------------------------
 * 本番では TTS で音声ファイルを生成して <audio> で再生する想定。
 * デモでは端末の日本語音声で台本を一文ずつ読み上げます。
 *
 * - 再生は本人のボタン操作で開始（iOS の自動再生制限にも合う）
 * - 一時停止は「今の一文を止め、再開時にその一文の頭から読む」方式。
 *   speechSynthesis.pause() は Android Chrome で効かないことがあるため使わない
 * - 実際に読み上げた時間を測り、残りの「間」を伸縮して約2分15秒に寄せる
 * - シーク（末尾への移動）は提供しない。自然に最後まで再生したときだけ onComplete
 * - 日本語音声がない端末では「字幕モード」（無音で字幕だけ進む）にフォールバック
 */
(function (global) {
  'use strict';

  const CFG = global.AKARI_CONFIG;
  const len = (s) => Array.from(s).length;
  const synth = 'speechSynthesis' in global ? global.speechSynthesis : null;

  let cachedVoice = null;

  function listJaVoices() {
    if (!synth) return [];
    return synth.getVoices().filter((v) => /^ja(-|_|$)/i.test(v.lang));
  }

  function chooseVoice(voices) {
    if (!voices.length) return null;
    for (const name of CFG.audio.preferredVoiceNames) {
      const v = voices.find((x) => x.name.indexOf(name) !== -1);
      if (v) return v;
    }
    return voices.find((v) => v.localService) || voices[0];
  }

  /* 音声の準備（＝本番の「TTS 生成」に相当するステップ） */
  function prepare(opts) {
    opts = opts || {};
    const timeoutMs = opts.timeoutMs || 3000;
    return new Promise((resolve) => {
      if (opts.forceFail) {
        setTimeout(() => resolve({ ok: false, reason: 'forced' }), 1400);
        return;
      }
      if (!synth || typeof global.SpeechSynthesisUtterance === 'undefined') {
        setTimeout(() => resolve({ ok: false, reason: 'unsupported' }), 600);
        return;
      }
      const started = Date.now();
      const done = () => {
        const voices = listJaVoices();
        if (voices.length) {
          cachedVoice = chooseVoice(voices);
          // 「準備中」が一瞬で消えないよう最低 1.2 秒は見せる
          const wait = Math.max(0, 1200 - (Date.now() - started));
          setTimeout(() => resolve({ ok: true, voice: cachedVoice.name, voiceCount: voices.length }), wait);
          return true;
        }
        return false;
      };
      if (done()) return;
      const onChange = () => { if (done()) cleanup(); };
      const timer = setInterval(() => { if (done()) cleanup(); }, 250);
      const to = setTimeout(() => {
        cleanup();
        const any = synth.getVoices().length;
        resolve({ ok: false, reason: any ? 'no-japanese-voice' : 'no-voices' });
      }, timeoutMs);
      function cleanup() {
        clearInterval(timer); clearTimeout(to);
        if (synth.removeEventListener) synth.removeEventListener('voiceschanged', onChange);
      }
      if (synth.addEventListener) synth.addEventListener('voiceschanged', onChange);
      synth.getVoices();
    });
  }

  function toneParams(tone) {
    return CFG.audio.tones[tone] || CFG.audio.tones.gentle;
  }

  function makeUtterance(text, tone) {
    const u = new SpeechSynthesisUtterance(text);
    const t = toneParams(tone);
    u.lang = 'ja-JP';
    if (cachedVoice) u.voice = cachedVoice;
    u.rate = t.rate;
    u.pitch = t.pitch;
    u.volume = 1;
    return u;
  }

  /* 声のトーンのサンプル（オンボーディング用） */
  function sample(tone, text) {
    if (!synth) return false;
    synth.cancel();
    const u = makeUtterance(text || 'おはようございます。今日のカードを、一緒に受け取りましょう。', tone);
    synth.speak(u);
    return true;
  }
  function stopAll() { if (synth) synth.cancel(); }

  /* ---------------- プレイヤー本体 ---------------- */
  function create(opts) {
    const segs = opts.segments.map((s) => ({ ...s }));
    const tone = opts.tone || 'gentle';
    const mode = opts.mode === 'captions' || !synth ? 'captions' : 'tts';
    const target = opts.targetSeconds || CFG.audio.targetSeconds;
    const t = toneParams(tone);
    const baseCps = CFG.audio.charsPerSecond * t.rate;
    const on = {
      state: opts.onState || function () {},
      progress: opts.onProgress || function () {},
      caption: opts.onCaption || function () {},
      complete: opts.onComplete || function () {}
    };

    let state = 'idle';            // idle | playing | paused | ended
    let i = 0;                     // 今の一文
    let phase = 'speak';           // speak | gap
    let token = 0;                 // キャンセル済みコールバックを無視するための世代番号
    let gapTimer = null, gapEndsAt = 0, gapRemain = 0;
    let watchdog = null;
    let speakStart = 0;
    let elapsedMs = 0, lastTick = 0, ticker = null;
    let k = 1;                     // 実測 / 推定 の比（発話速度の補正）
    let measuredEst = 0, measuredReal = 0;
    let flexScale = 1;

    const estSpeech = (s) => (len(s.text) / baseCps) * 1000;

    function remainingMs(fromIdx, includeCurrentPartial) {
      let ms = 0;
      for (let j = fromIdx; j < segs.length; j++) {
        if (!(includeCurrentPartial && j === fromIdx && phase === 'gap')) ms += estSpeech(segs[j]) * k;
        ms += segs[j].flex ? segs[j].pause * flexScale : segs[j].pause;
      }
      if (includeCurrentPartial && phase === 'gap') {
        ms -= (segs[fromIdx].flex ? segs[fromIdx].pause * flexScale : segs[fromIdx].pause);
        ms += Math.max(0, gapEndsAt - Date.now());
      }
      return ms;
    }

    // 実測に合わせて、残りの flex な間を伸縮して合計を target に寄せる
    function recalibrate() {
      if (measuredEst > 0) k = Math.min(1.8, Math.max(0.55, measuredReal / measuredEst));
      let restSpeech = 0, restFixed = 0, restFlex = 0;
      for (let j = i + 1; j < segs.length; j++) {
        restSpeech += estSpeech(segs[j]) * k;
        if (segs[j].flex) restFlex += segs[j].pause; else restFixed += segs[j].pause;
      }
      const curGap = segs[i] ? segs[i].pause : 0;
      const want = target * 1000 - elapsedMs - restSpeech - restFixed - (segs[i] && !segs[i].flex ? curGap : 0);
      const flexTotal = restFlex + (segs[i] && segs[i].flex ? curGap : 0);
      if (flexTotal > 0) flexScale = Math.min(2.0, Math.max(0.5, want / flexTotal));
    }

    function gapFor(idx) {
      const s = segs[idx];
      return s.flex ? Math.max(700, s.pause * flexScale) : s.pause;
    }

    function emitProgress() {
      const remain = state === 'ended' ? 0 : remainingMs(i, true);
      const total = elapsedMs + remain;
      on.progress({ elapsedMs, totalMs: total, ratio: total > 0 ? Math.min(1, elapsedMs / total) : 0, index: i, count: segs.length });
    }

    function startTicker() {
      lastTick = Date.now();
      stopTicker();
      ticker = setInterval(() => {
        const now = Date.now();
        elapsedMs += now - lastTick;
        lastTick = now;
        emitProgress();
      }, 250);
    }
    function stopTicker() {
      if (ticker) {
        clearInterval(ticker);
        ticker = null;
        if (lastTick) elapsedMs += Date.now() - lastTick;
        lastTick = 0;
      }
    }

    function setState(s) { state = s; on.state(s); }

    function speak() {
      if (i >= segs.length) return finish();
      phase = 'speak';
      const seg = segs[i];
      on.caption({ index: i, text: seg.text });
      const my = ++token;
      speakStart = Date.now();
      const est = estSpeech(seg) * k;

      const afterSpeak = (natural) => {
        if (my !== token || state !== 'playing') return;
        clearTimeout(watchdog);
        if (natural) {
          measuredEst += estSpeech(seg);
          measuredReal += Date.now() - speakStart;
        }
        recalibrate();
        gap(gapFor(i));
      };

      if (mode === 'captions') {
        // 字幕モード：推定時間だけ待つ
        gapTimer = setTimeout(() => afterSpeak(false), Math.max(900, est));
        return;
      }
      const u = makeUtterance(seg.text, tone);
      u.onend = () => afterSpeak(true);
      u.onerror = (e) => {
        if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
        afterSpeak(false);
      };
      opts._current = u; // Safari で GC されて onend が来ない問題の回避（参照を保持）
      synth.speak(u);
      // onend が来ない端末向けの保険
      clearTimeout(watchdog);
      watchdog = setTimeout(() => afterSpeak(false), est * 3 + 6000);
    }

    function gap(ms) {
      phase = 'gap';
      gapEndsAt = Date.now() + ms;
      const my = token;
      gapTimer = setTimeout(() => {
        if (my !== token || state !== 'playing') return;
        i++;
        speak();
      }, ms);
    }

    function finish() {
      stopTicker();
      setState('ended');
      on.caption({ index: segs.length, text: '' });
      emitProgress();
      on.complete({ elapsedSeconds: Math.round(elapsedMs / 1000), mode });
    }

    function play() {
      if (state === 'playing') return;
      if (state === 'ended') { restart(); return; }
      const resuming = state === 'paused';
      setState('playing');
      startTicker();
      if (resuming && phase === 'gap') {
        gap(gapRemain);
      } else {
        if (synth && mode === 'tts') synth.cancel();
        speak();
      }
    }

    function pause() {
      if (state !== 'playing') return;
      token++;
      clearTimeout(gapTimer);
      clearTimeout(watchdog);
      if (phase === 'gap') gapRemain = Math.max(0, gapEndsAt - Date.now());
      if (synth && mode === 'tts') synth.cancel();
      stopTicker();
      setState('paused');
      emitProgress();
    }

    function restart() {
      token++;
      clearTimeout(gapTimer);
      clearTimeout(watchdog);
      if (synth && mode === 'tts') synth.cancel();
      stopTicker();
      i = 0; phase = 'speak'; elapsedMs = 0; flexScale = 1; k = 1; measuredEst = 0; measuredReal = 0;
      setState('idle');
      emitProgress();
      play();
    }

    function destroy() {
      token++;
      clearTimeout(gapTimer);
      clearTimeout(watchdog);
      stopTicker();
      if (synth && mode === 'tts') synth.cancel();
      state = 'idle';
    }

    // 初期表示用
    setTimeout(emitProgress, 0);

    return {
      play, pause, restart, destroy,
      get state() { return state; },
      get mode() { return mode; },
      estimatedTotalMs: () => remainingMs(0, false)
    };
  }

  global.AKARI_VOICE = { prepare, create, sample, stopAll, supported: !!synth, listJaVoices };
})(window);
