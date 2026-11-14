/*
 * 朱里バリアント設定（本番の config.ts に相当）
 * ------------------------------------------------------------
 * 色・表示名・カードの解釈軸・恋愛アファメーションのルールを
 * ここに集約します。本番では Next.js 等の config.ts に移植し、
 * Claude API へ渡すメソッドプロンプトもここから組み立てます。
 *
 * ※ SPEC.md 本文は未確認です。データモデル・認証・イベント必須属性・
 *   TTS の対応範囲は着手時に照合してください（README.md 参照）。
 */
(function (global) {
  'use strict';

  const AKARI_CONFIG = {
    variant: 'akari',
    appVersion: 'demo-0.1.0',

    /* ---------- ブランド ---------- */
    brand: {
      displayName: '朱里',
      experienceName: '今日のカード',          // 仮名称
      tagline: '今日の恋に、そっと目を向ける。',
      draftBadge: '体験版・文言は監修前',
      ttsBadge: 'デモ用の合成音声',
      // 淡い藤色 × 生成り。朱色は名前にちなんだ「点」としてだけ使う
      colors: {
        fuji50: '#F7F3FB',
        fuji100: '#EEE6F6',
        fuji200: '#DCCDEC',
        fuji300: '#C4AEDD',
        fuji500: '#9478B8',
        fuji700: '#6A4F8F',
        ink: '#3D3350',
        inkSoft: '#6F6584',
        kinari: '#FBF7EF',
        kinari2: '#F4EDDF',
        gold: '#B7975A',
        shu: '#D0563E'
      }
    },

    /* ---------- 日付・時間帯（すべて日本時間で判定） ---------- */
    time: {
      timeZone: 'Asia/Tokyo',
      // 「両方」を選んだ人の音声導入を夜に切り替える時刻（16時〜翌4時）
      nightFromHour: 16,
      nightUntilHour: 4,
      // ホームのあいさつ
      greetings: [
        { from: 4, to: 10, text: 'おはようございます' },
        { from: 10, to: 17, text: 'こんにちは' },
        { from: 17, to: 28, text: 'こんばんは' }
      ]
    },

    /* ---------- オンボーディング ---------- */
    onboarding: {
      nameMaxLength: 12,
      freeTextMaxLength: 120,
      relationships: [
        { id: 'kataomoi', label: '片思い', note: '想いを伝える前、気になる人がいる' },
        { id: 'kosai', label: '交際中', note: 'お付き合いしている人がいる' },
        { id: 'fukuen', label: '復縁希望', note: 'もう一度、あの人と向き合いたい' },
        { id: 'konkatsu', label: '婚活中', note: '結婚を見すえた出会いを探している' },
        { id: 'kaizen', label: 'パートナーとの関係改善', note: '今の関係を、もっと心地よくしたい' }
      ],
      listenTimes: [
        { id: 'morning', label: '朝' },
        { id: 'night', label: '夜' },
        { id: 'both', label: '両方' }
      ],
      voiceTones: [
        { id: 'gentle', label: '優しい', note: 'ふんわり、包みこむように' },
        { id: 'strong', label: '力強い', note: '背中をそっと押すように' },
        { id: 'calm', label: '落ち着いた', note: 'ゆっくり、静かに' }
      ],
      defaults: { listenTime: 'morning', voiceTone: 'gentle' }
    },

    /* ---------- メソッド（監修前の仮ルール） ---------- */
    method: {
      // カードの解釈軸：恋愛 × 「今日、本人が選べる小さな行動」
      interpretationAxes: [
        '回答にあった気持ちに、まず一度だけ触れる（言い当てない）',
        'カードの象徴を恋愛の文脈でやわらかく言い換える',
        '願いがあれば、願いを大切にする姿勢に結びつける',
        '最後は「今日、本人が選べる小さな行動」を一つだけ添える'
      ],
      rules: [
        '相手の気持ちや行動を決めつけない',
        '復縁や成就、結婚などの結果を保証しない',
        '本人が今日とれる行動に落とす（相手を動かす行動にしない）',
        '不安をあおる言葉、「〜しないと不幸になる」型の表現を使わない',
        '自由記述の文面をそのまま引用しない（気持ちのカテゴリだけ反映する）'
      ],
      // 生成文に含まれていたら差し替え対象にする言い回し（監修で追加・修正）
      avoidPhrases: [
        '必ず', '絶対に', '間違いなく', '運命の人です', '復縁できます', '叶います',
        '結婚できます', '彼はあなたを', '彼女はあなたを', 'あの人はあなたを',
        '本当は好き', '脈あり', '脈なし', '別れるべき', '諦めるべき', '不幸'
      ],
      interpretationLength: { min: 200, max: 300 },
      affirmationCount: { min: 1, max: 3 },
      // 音声の最後の一言（監修で最初に差し替える箇所）
      closingLines: {
        morning: {
          gentle: '今日のあなたが、あなたにやさしくいられますように。いってらっしゃい。',
          strong: '大丈夫。今日のあなたなら、ちゃんと一歩を選べます。いってらっしゃい。',
          calm: 'ゆっくりで、かまいません。あなたのペースで、今日を始めましょう。'
        },
        night: {
          gentle: '今日もよく頑張りましたね。ここまでの自分を、そっと抱きしめて。おやすみなさい。',
          strong: '今日のあなたも、ちゃんと前に進んでいました。胸を張って、おやすみなさい。',
          calm: '静かに目を閉じて、今日の自分に、ありがとうと伝えましょう。おやすみなさい。'
        }
      }
    },

    /* ---------- カード選定 ---------- */
    draw: {
      deck: 'major-arcana',   // 大アルカナ22枚（名称・象徴・一般的な意味）。正位置のみ
      // シード：ユーザーID + 日本時間の日付。カード面はオリジナル図案
      seedFormat: '{userId}:{dateJst}:akari'
    },

    /* ---------- ガイド音声 ---------- */
    audio: {
      targetSeconds: 135,        // 2分15秒前後を狙う
      minSeconds: 120,
      maxSeconds: 180,
      // 声のトーン → Web Speech API の話速・高さ（本番TTSでは voice / speakingRate に読み替え）
      tones: {
        gentle: { rate: 0.94, pitch: 1.08 },
        strong: { rate: 1.02, pitch: 1.0 },
        calm: { rate: 0.86, pitch: 0.92 }
      },
      // 日本語の推定発話速度（文字/秒、rate=1.0）。再生中の実測で補正する
      charsPerSecond: 6.4,
      preferredVoiceNames: ['Kyoko', 'O-Ren', 'Google 日本語', 'Nanami', 'Haruka', 'Ayumi', 'Sayaka', 'Mizuki']
    },

    /* ---------- ペイウォール ---------- */
    paywall: {
      heading: '毎朝、今日のカードを',
      body: '恋愛の状況に合わせた、毎日のカードとガイド音声',
      price: '7日間無料、その後は月額1,200円（想定）',
      cta: '7日間無料で試す',
      afterTap: '体験版です。申し込みや請求は発生しません'
    },

    /* ---------- 計測 ---------- */
    analytics: {
      // Supabase の events テーブルに送る場合は url / anonKey を入れる。
      // 空のままなら、この端末の localStorage にだけ記録します。
      supabase: { url: '', anonKey: '', table: 'events' },
      // 属性名は SPEC.md に合わせて差し替える（ここでは仮名）
      eventNames: {
        onboardingCompleted: 'onboarding_completed',
        audioCompleted: 'audio_completed',
        paywallPlanTapped: 'paywall_plan_tapped'
      }
    },

    /* ---------- 本番用：Claude API に渡す生成指示（参考） ---------- */
    claude: {
      // 本番ではサーバー側で、選定済みカードと回答を渡して構造化出力させる
      outputSchema: {
        type: 'object',
        required: ['interpretation', 'affirmations', 'audioScript'],
        properties: {
          interpretation: { type: 'string', description: '解釈文 200〜300字' },
          affirmations: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
          audioScript: {
            type: 'array',
            description: '音声台本。読み上げ単位ごとに区切り、間（ミリ秒）を付ける',
            items: {
              type: 'object',
              required: ['text', 'pauseMs'],
              properties: { text: { type: 'string' }, pauseMs: { type: 'integer' } }
            }
          }
        }
      }
    }
  };

  global.AKARI_CONFIG = AKARI_CONFIG;
})(window);
