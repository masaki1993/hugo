/*
 * 大アルカナ22枚：名称・象徴・一般的な意味 ＋ 朱里バリアントの恋愛向け仮解釈
 * カード面はすべてこのファイルで描くオリジナル図案（星・月・草花の線画）。
 * 既存デッキの絵柄は使っていません。正位置のみ（逆位置は監修事項）。
 *
 * weights は恋愛状況ごとの選ばれやすさ：
 *   [片思い, 交際中, 復縁希望, 婚活中, 関係改善]
 * actions は「今日は、〇〇。」に入る、本人が今日選べる小さな行動。
 */
(function (global) {
  'use strict';

  const REL = ['kataomoi', 'kosai', 'fukuen', 'konkatsu', 'kaizen'];

  const CARDS = [
    {
      id: 'fool', num: 0, roman: '0', name: '愚者', en: 'THE FOOL',
      keywords: ['始まり', '自由', '可能性'],
      symbols: '旅立つ人、白い花、小さな荷物、崖の先に広がる空',
      meaning: '新しい始まり、自由、無邪気さ、まだ形の決まっていない可能性。',
      love: 'まだ形の決まっていない可能性を表すカードです。うまくやろうとするより、今の気持ちを軽やかに楽しむことが、恋の風通しをよくしてくれます。',
      actions: {
        kataomoi: '身構えずに送れる短いひと言を、一つだけ考えてみましょう。送るかどうかは、あとで決めて大丈夫です',
        kosai: '二人でまだ行ったことのない場所を、一つ話題に出してみましょう',
        fukuen: '過去の答え合わせを少し休んで、今の自分が楽しめることを一つ選んでみましょう',
        konkatsu: '条件を少しだけ脇に置いて、会ってみたいと感じた気持ちを大切にしてみましょう',
        kaizen: 'いつもの会話に、最近あった小さな発見を一つ混ぜてみましょう'
      },
      affirmations: ['私は、新しい可能性に心をひらいています。', 'うまくやろうとしなくても、私は私のままで大丈夫。', '今日の一歩は、小さくても確かな一歩です。'],
      weights: [1.2, 1.0, 0.9, 1.3, 1.0]
    },
    {
      id: 'magician', num: 1, roman: 'I', name: '魔術師', en: 'THE MAGICIAN',
      keywords: ['創造', '意志', 'きっかけ'],
      symbols: '卓上にそろった道具、無限のしるし、天と地を指す手',
      meaning: '創造する力、意志、物事の始まり、必要な手段がそろっていること。',
      love: '必要なものは、もうあなたの手の中にそろっていることを示すカードです。待つだけでなく、自分から流れをつくる力が、今日のあなたにはあります。',
      actions: {
        kataomoi: '相手が話しやすい話題を一つ用意して、きっかけがあれば使えるようにしておきましょう',
        kosai: 'してほしいことを察してもらうのを待たずに、やわらかい言葉で一つ伝えてみましょう',
        fukuen: 'あの頃にはなかった、今の自分の良さを一つ書き出してみましょう',
        konkatsu: '自己紹介に、あなたらしい言葉を一行だけ足してみましょう',
        kaizen: '相手に頼みたいことを、責める形ではなくお願いの形で一つ伝えてみましょう'
      },
      affirmations: ['私は、自分の手で今日を形づくることができます。', '伝えたい気持ちは、私の言葉で届けられます。', '私には、必要な力がもう備わっています。'],
      weights: [1.3, 1.0, 1.0, 1.3, 1.0]
    },
    {
      id: 'priestess', num: 2, roman: 'II', name: '女教皇', en: 'THE HIGH PRIESTESS',
      keywords: ['直感', '静けさ', '内なる知恵'],
      symbols: '二本の柱、月、ヴェール、手にした書',
      meaning: '直感、静けさ、内なる知恵、まだ表に出ていない秘められたもの。',
      love: '答えを急がず、自分の内側の声に耳を澄ますことを促すカードです。相手の言葉を読み解くより、あなたの心が本当に望んでいるものを静かに確かめる日です。',
      actions: {
        kataomoi: '相手のSNSを見る時間を少しだけ減らして、自分の気持ちをノートに三行書いてみましょう',
        kosai: 'すぐに答えなくてもいい話題は、一晩あたためてから伝えてみましょう',
        fukuen: '連絡するか迷ったら、すぐには決めずに、気持ちを書き留めるだけにしてみましょう',
        konkatsu: '会った人の条件ではなく、一緒にいて呼吸が楽だったかを思い出してみましょう',
        kaizen: '言い返したくなったら、ひと呼吸おいて、本当に伝えたいことを確かめてみましょう'
      },
      affirmations: ['私は、自分の心の声を信じています。', '答えは急がなくても、ちゃんと私の中にあります。', '静かな時間は、私をやさしく整えてくれます。'],
      weights: [1.2, 1.0, 1.2, 1.0, 1.0]
    },
    {
      id: 'empress', num: 3, roman: 'III', name: '女帝', en: 'THE EMPRESS',
      keywords: ['豊かさ', '愛情', '育む'],
      symbols: '実りの麦、豊かな自然、ゆったりとした衣、ハートのしるし',
      meaning: '豊かさ、愛情、育むこと、満ちていく感覚。',
      love: '愛情や豊かさが、ゆっくり育っていくことを表すカードです。誰かに満たしてもらう前に、まずあなた自身を大切に扱うことで、恋のぬくもりも深まっていきます。',
      actions: {
        kataomoi: '好きな香りや飲みものを選んで、自分をもてなす時間を10分だけつくってみましょう',
        kosai: '相手にしてもらってうれしかったことを、一つ言葉にして伝えてみましょう',
        fukuen: 'あの人のためではなく、自分のためのごほうびを一つ用意してみましょう',
        konkatsu: '次に会う日の服や小物を、自分が心地よいと感じるもので選んでみましょう',
        kaizen: '一緒に食べたいものを提案して、ゆっくり味わう時間をつくってみましょう'
      },
      affirmations: ['私は、愛される価値のある存在です。', '私が私を大切にするほど、愛は豊かに育ちます。', '今日の私は、やわらかなぬくもりに包まれています。'],
      weights: [1.0, 1.3, 1.0, 1.1, 1.2]
    },
    {
      id: 'emperor', num: 4, roman: 'IV', name: '皇帝', en: 'THE EMPEROR',
      keywords: ['安定', '守る力', '境界線'],
      symbols: '石の玉座、山並み、王笏、冠',
      meaning: '安定、責任、守る力、秩序を保つこと。',
      love: '安定と、自分を守る境界線を表すカードです。相手に合わせすぎていないかを見直し、あなたが安心していられる形を大切にすることで、関係は落ち着いていきます。',
      actions: {
        kataomoi: '返事を気にする時間を決めて、それ以外の時間は自分の予定に集中してみましょう',
        kosai: '無理をしていることがあれば、一つだけ「ここまでなら大丈夫」と伝えてみましょう',
        fukuen: '自分が譲れないことを一つ書き出して、これからの自分の土台にしてみましょう',
        konkatsu: '大切にしたい暮らし方を三つ書き出して、出会いの軸にしてみましょう',
        kaizen: '家事や予定など、一つのことについて二人の分担を穏やかに話してみましょう'
      },
      affirmations: ['私は、自分の心を守ることができます。', '安心できる場所は、私の手でつくれます。', '私の気持ちは、大切にされていいものです。'],
      weights: [0.9, 1.1, 1.0, 1.1, 1.2]
    },
    {
      id: 'hierophant', num: 5, roman: 'V', name: '教皇', en: 'THE HIEROPHANT',
      keywords: ['信頼', '誠実', 'つながり'],
      symbols: '交差する二本の鍵、祝福する手、三重の冠',
      meaning: '信頼、教え、誠実さ、伝統や人とのつながり。',
      love: '誠実さと、信頼で結ばれるつながりを表すカードです。駆け引きよりも、約束を守る、丁寧に言葉を返すといった小さな誠実さが、心の距離を縮めていきます。',
      actions: {
        kataomoi: '相手からの話に、丁寧なひと言を添えて返してみましょう',
        kosai: '小さな約束を一つ決めて、守ってみましょう',
        fukuen: '信頼できる友人に、今の気持ちを少しだけ話してみましょう',
        konkatsu: '知人の紹介など、信頼できるつながりからの出会いにも目を向けてみましょう',
        kaizen: '「ありがとう」を、理由も添えて一度伝えてみましょう'
      },
      affirmations: ['私の誠実さは、ちゃんと伝わっていきます。', '私は、信頼できるつながりを育てています。', '丁寧な言葉は、私と誰かをやさしく結びます。'],
      weights: [0.9, 1.1, 1.0, 1.3, 1.1]
    },
    {
      id: 'lovers', num: 6, roman: 'VI', name: '恋人', en: 'THE LOVERS',
      keywords: ['選択', '調和', '心の通い合い'],
      symbols: '向き合う二人、空からの光、実りの木',
      meaning: '選択、調和、心の通い合い、価値観を分かち合うこと。',
      love: '心の通い合いと、自分で選ぶことの大切さを表すカードです。どう思われるかだけでなく、あなたがどんな恋をしたいのかを選ぶことが、調和への入り口になります。',
      actions: {
        kataomoi: '相手と話していて、自分が笑顔になれた瞬間を一つ思い出してみましょう',
        kosai: '最近好きになったものを一つ話して、相手の好きなものも聞いてみましょう',
        fukuen: 'あの人とどんな関係でいたいのか、今の自分の言葉で一文にしてみましょう',
        konkatsu: 'この人ともう一度話したいと思えたかを、素直な気持ちで振り返ってみましょう',
        kaizen: '二人で相談して決める小さな選択を、一つしてみましょう'
      },
      affirmations: ['私は、心が喜ぶ選択をします。', '私は、通じ合う関係を大切に育てています。', '私が選ぶ恋は、私を幸せにする恋です。'],
      weights: [1.4, 1.4, 1.1, 1.2, 1.3]
    },
    {
      id: 'chariot', num: 7, roman: 'VII', name: '戦車', en: 'THE CHARIOT',
      keywords: ['前進', '意志', '一歩'],
      symbols: '星をちりばめた天蓋、二頭の獣、前を見すえる御者',
      meaning: '前進、意志の力、勝利、揺れる力をまとめて進むこと。',
      love: '迷いを抱えたままでも、前に進む力を表すカードです。気持ちが揺れるのは自然なこと。全部を整えてからではなく、今日できる一歩を決めることで流れが動き出します。',
      actions: {
        kataomoi: '会話のきっかけを一つ、自分からつくってみましょう',
        kosai: '先延ばしにしていた二人の予定を、一つ決めてみましょう',
        fukuen: '気持ちが揺れても、自分の生活リズムを守ることを選んでみましょう',
        konkatsu: '気になっていた出会いの機会について、一つだけ調べてみましょう',
        kaizen: '話し合いたいことを一つにしぼって、伝える時間を決めてみましょう'
      },
      affirmations: ['私は、自分のペースで前に進んでいます。', '揺れる気持ちごと、私は一歩を踏み出せます。', '私の意志は、私を望む方へ運んでくれます。'],
      weights: [1.2, 1.0, 1.0, 1.2, 1.0]
    },
    {
      id: 'strength', num: 8, roman: 'VIII', name: '力', en: 'STRENGTH',
      keywords: ['やさしい強さ', '忍耐', '受容'],
      symbols: '獅子に寄り添う人、無限のしるし、花の帯',
      meaning: 'やさしい強さ、忍耐、受け入れる勇気、内なる力。',
      love: '力ずくではなく、やさしさで心をなだめる強さを表すカードです。焦りや不安が出てきても、それを否定せずに受けとめることで、あなたの魅力は穏やかに輝きます。',
      actions: {
        kataomoi: '不安になったら、手を胸に当てて三回ゆっくり呼吸してみましょう',
        kosai: '相手のペースを一度受けとめてから、自分の希望を伝えてみましょう',
        fukuen: '寂しさが出てきたら、その気持ちに「そうだよね」と声をかけてみましょう',
        konkatsu: 'うまく話せない場面があっても、自分を責めずに良かった点を一つ見つけてみましょう',
        kaizen: '言葉が強くなりそうなときは、語尾を一つやわらかくして伝えてみましょう'
      },
      affirmations: ['私のやさしさは、私の強さです。', '不安があっても、私は穏やかでいられます。', '私は、自分の気持ちをやさしく受けとめられます。'],
      weights: [1.1, 1.1, 1.3, 1.0, 1.3]
    },
    {
      id: 'hermit', num: 9, roman: 'IX', name: '隠者', en: 'THE HERMIT',
      keywords: ['内省', 'ひとりの時間', '灯り'],
      symbols: 'ランタンの灯、杖、雪の山頂、星の光',
      meaning: '内省、ひとりの時間、探求、静かな導き。',
      love: 'ひとりの時間に灯りをともし、自分を見つめ直すことを表すカードです。相手の反応から少し離れて、あなたにとって心地よい恋の形を思い出す、静かな充電の日です。',
      actions: {
        kataomoi: '寝る前の10分間だけスマホを置いて、好きな音楽を聴いてみましょう',
        kosai: '一人で過ごす時間も楽しんで、そこで感じたことをあとで話してみましょう',
        fukuen: '思い出から少し離れて、一人で落ち着ける場所で過ごしてみましょう',
        konkatsu: '活動を一日お休みして、自分が本当に望む関係をゆっくり考えてみましょう',
        kaizen: '相手を変えようとする前に、自分が何に疲れているのかを確かめてみましょう'
      },
      affirmations: ['ひとりの時間は、私を深く満たしてくれます。', '私の内側には、やさしい灯りがあります。', '立ち止まることも、私にとって大切な歩みです。'],
      weights: [1.0, 0.8, 1.2, 1.0, 1.0]
    },
    {
      id: 'wheel', num: 10, roman: 'X', name: '運命の輪', en: 'WHEEL OF FORTUNE',
      keywords: ['巡り', '転機', 'タイミング'],
      symbols: '回る輪、四隅の生きもの、巡る文字',
      meaning: '巡り、転機、タイミング、流れの変化。',
      love: '流れが巡り、タイミングが動いていくことを表すカードです。止まって見える状況も、少しずつ変わっていきます。今日のあなたが流れに乗りやすくなる、小さな準備を整えましょう。',
      actions: {
        kataomoi: '相手と自然に話せる場面がありそうな予定を、一つ確認してみましょう',
        kosai: '最近二人で話していない話題を、一つ思い出して投げかけてみましょう',
        fukuen: '今の自分の生活に、新しい習慣を一つ加えてみましょう',
        konkatsu: 'いつもと違う時間帯や場所で、予定を一つ入れてみましょう',
        kaizen: 'いつもの過ごし方を一つだけ変えて、二人で新しい流れを試してみましょう'
      },
      affirmations: ['流れは、私に味方するように巡っています。', '私は、ちょうどいいタイミングを受け取れます。', '変化は、私を新しい景色へ連れていってくれます。'],
      weights: [1.1, 1.0, 1.3, 1.2, 1.0]
    },
    {
      id: 'justice', num: 11, roman: 'XI', name: '正義', en: 'JUSTICE',
      keywords: ['バランス', '公正', 'まっすぐな心'],
      symbols: '天秤、剣、まっすぐな視線',
      meaning: 'バランス、公正さ、誠実な判断、原因と結果。',
      love: '心のバランスを取り戻し、公平に物事を見ることを表すカードです。相手のことばかり考えすぎていたら、自分の気持ちも同じ重さで大切にしてあげましょう。',
      actions: {
        kataomoi: '相手のために使った時間と同じだけ、自分のための時間もとってみましょう',
        kosai: 'してもらったことと、自分がしてあげたいことを一つずつ思い浮かべてみましょう',
        fukuen: 'あの頃の出来事を、自分を責めすぎずに一つだけ振り返ってみましょう',
        konkatsu: '相手に求めることと、自分が差し出せることを一つずつ書いてみましょう',
        kaizen: 'お互いの言い分を、一度だけ相手の立場から言い直してみましょう'
      },
      affirmations: ['私は、自分の気持ちも同じように大切にします。', '私の心は、ちょうどいいバランスを知っています。', '私は、まっすぐな心で選ぶことができます。'],
      weights: [1.0, 1.1, 1.0, 1.0, 1.3]
    },
    {
      id: 'hanged', num: 12, roman: 'XII', name: '吊るされた男', en: 'THE HANGED MAN',
      keywords: ['視点の転換', '待つ時間', '手放し'],
      symbols: '逆さの姿、穏やかな表情、頭の光',
      meaning: '視点の転換、待つこと、手放すことで得る気づき。',
      love: '立ち止まって見方を変えることで、新しい気づきが生まれることを表すカードです。思うように進まない時間も、無駄ではありません。今日は別の角度から恋を眺めてみましょう。',
      actions: {
        kataomoi: '返事を待つ時間の中に、自分がほっとできる予定も一つ置いてみましょう',
        kosai: '相手の行動を、相手の立場から一度だけ想像してみましょう',
        fukuen: '答えを出そうとするのを少しお休みして、ただ自分をいたわってみましょう',
        konkatsu: 'うまくいかなかった出会いから、学べたことを一つだけ見つけてみましょう',
        kaizen: '正しさを決めるのを一度やめて、相手の話を最後まで聞いてみましょう'
      },
      affirmations: ['待つ時間も、私を育ててくれています。', '見方を変えると、新しい答えが見えてきます。', '私は、力を抜いて流れにゆだねられます。'],
      weights: [1.2, 0.9, 1.3, 1.0, 1.1]
    },
    {
      id: 'death', num: 13, roman: 'XIII', name: '死神', en: 'DEATH',
      keywords: ['区切り', '変容', '新しい始まり'],
      symbols: '白い花、沈む陽と昇る陽、流れる川',
      meaning: '終わりと始まり、変容、ひとつの区切り。名前に反して、再生を含むカード。',
      love: '怖い名前に見えますが、ひとつの区切りと新しい始まりを表すカードです。役目を終えた思い込みや習慣を手放すことで、心に新しい風が入る余白が生まれます。',
      actions: {
        kataomoi: '繰り返し考えてしまう思い込みを一つ紙に書いて、そっと手放してみましょう',
        kosai: '二人の間でなんとなく続いている習慣を、一つ新しくしてみましょう',
        fukuen: 'あの頃の写真ややりとりを見返す時間を、少しだけ減らしてみましょう',
        konkatsu: 'もう合わないと感じている探し方を、一つお休みしてみましょう',
        kaizen: '繰り返しているすれ違いのパターンを、一つ言葉にしてみましょう'
      },
      affirmations: ['手放すことで、私には新しい余白が生まれます。', '終わりは、やさしい始まりにつながっています。', '私は、生まれ変わるように軽やかになれます。'],
      weights: [0.5, 0.4, 0.7, 0.5, 0.6]
    },
    {
      id: 'temperance', num: 14, roman: 'XIV', name: '節制', en: 'TEMPERANCE',
      keywords: ['調和', 'ほどよさ', '癒し'],
      symbols: '二つの杯を行き来する水、水辺、道の先の光',
      meaning: '調和、ほどよさ、癒し、異なるものが混ざり合うこと。',
      love: 'ほどよい距離感と、心を混ぜ合わせていく調和を表すカードです。近づきすぎず離れすぎず、あなたが自然体でいられる温度を見つけることが、関係をやさしく整えます。',
      actions: {
        kataomoi: '連絡の頻度を相手に合わせすぎず、自分が心地よいペースを意識してみましょう',
        kosai: '相手と自分の好みを一つずつ混ぜた過ごし方を、考えてみましょう',
        fukuen: '温かい飲みものをゆっくり飲んで、心の温度を落ち着けてみましょう',
        konkatsu: '一度にたくさん会うより、気になる人との会話を丁寧に続けてみましょう',
        kaizen: '話し合いの前に、温かいお茶を二人分いれてみましょう'
      },
      affirmations: ['私は、ちょうどいい距離で愛を育てられます。', '私の心は、やさしく調和しています。', '自然体の私が、いちばん心地よい私です。'],
      weights: [1.1, 1.3, 1.1, 1.0, 1.4]
    },
    {
      id: 'devil', num: 15, roman: 'XV', name: '悪魔', en: 'THE DEVIL',
      keywords: ['とらわれ', '執着', '気づき'],
      symbols: 'ゆるい鎖、たいまつ、夜の影',
      meaning: '執着、誘惑、とらわれ、抜け出せないと思い込んでいる状態。',
      love: '何かにとらわれている心に、気づかせてくれるカードです。気になって仕方ないことがあるなら、それを責めずに見つめるだけで、鎖は少しずつゆるんでいきます。',
      actions: {
        kataomoi: '相手のSNSを開きたくなったら、一度だけ別のことをしてから決めてみましょう',
        kosai: '不安から確かめたくなったことは、責める形ではなく気持ちとして伝えてみましょう',
        fukuen: '「あの人でなければ」という思いを、少しだけ横に置いてみましょう',
        konkatsu: '「こうでなければ」という条件を、一つだけゆるめてみましょう',
        kaizen: '我慢し続けていることを一つ、自分の中で認めてあげましょう'
      },
      affirmations: ['私は、心を縛るものから自由になれます。', '私の価値は、誰かの反応で決まりません。', '私は、自分を楽にする選択ができます。'],
      weights: [0.5, 0.5, 0.6, 0.5, 0.5]
    },
    {
      id: 'tower', num: 16, roman: 'XVI', name: '塔', en: 'THE TOWER',
      keywords: ['変化', '解放', '気づき'],
      symbols: '雷に打たれる塔、落ちる冠、夜空の火花',
      meaning: '突然の変化、崩れることで生まれる解放、思いがけない気づき。',
      love: '思いがけない出来事が、本当の気持ちに気づかせてくれることを表すカードです。もし心が揺れていても、それは古い形を見直すきっかけ。まずは自分の安心を最優先にしましょう。',
      actions: {
        kataomoi: '気持ちが揺れたら、すぐに動かず、まずは深呼吸を三回してみましょう',
        kosai: '驚くことがあっても結論を急がず、一晩置いてから話してみましょう',
        fukuen: '大きな決断は急がず、自分が安心できることを一つしてみましょう',
        konkatsu: '思い通りにいかなかったことは、方向を見直すサインとして受けとめてみましょう',
        kaizen: '感情が高ぶったときは、話し合いを短く区切ってみましょう'
      },
      affirmations: ['何が起きても、私は自分を守ることができます。', '揺れたあとには、本当の気持ちが見えてきます。', '私は、新しい土台を築く力を持っています。'],
      weights: [0.4, 0.4, 0.5, 0.4, 0.5]
    },
    {
      id: 'star', num: 17, roman: 'XVII', name: '星', en: 'THE STAR',
      keywords: ['希望', '癒し', '願い'],
      symbols: '大きな星と七つの星、水を注ぐ人、泉',
      meaning: '希望、癒し、インスピレーション、願いを持ち続けること。',
      love: '希望と癒しを表すカードです。願いを大切に持ち続けるあなたの心は、それ自体が美しい光です。結果を急がず、願いに向かう自分をやさしく応援してあげましょう。',
      actions: {
        kataomoi: '叶ったらうれしいことを、一つだけ具体的に思い描いてみましょう',
        kosai: '二人で楽しみにできる小さな予定を、一つ話してみましょう',
        fukuen: '願いを心の中で一度だけ言葉にして、そのあとは自分を大切に過ごしてみましょう',
        konkatsu: '理想のパートナーと過ごす休日を、一つ書き出してみましょう',
        kaizen: '二人がうまくいっていた頃の温かい場面を、一つ思い出してみましょう'
      },
      affirmations: ['私の願いは、私の中で静かに輝いています。', '私は、希望を持ち続けることができます。', '私は、癒しと光を受け取るのにふさわしい存在です。'],
      weights: [1.4, 1.2, 1.4, 1.3, 1.3]
    },
    {
      id: 'moon', num: 18, roman: 'XVIII', name: '月', en: 'THE MOON',
      keywords: ['揺らぎ', '想像', '見えないもの'],
      symbols: '満ち欠けする月、二つの塔、水辺から続く小道',
      meaning: '揺らぎ、不安、想像力、まだ見えていないもの。',
      love: '見えないものへの不安や、揺れる心を表すカードです。はっきりしないときほど、想像は不安な方へふくらみがち。今日は事実と想像を分けて、心を落ち着けてみましょう。',
      actions: {
        kataomoi: '気になっていることを「本当にあったこと」と「想像したこと」に分けて書いてみましょう',
        kosai: '不安に感じたことは、決めつけずに質問の形で聞いてみましょう',
        fukuen: '夜に考えごとが止まらないときは、明日の朝に考えると決めて休んでみましょう',
        konkatsu: '相手の反応を深読みしすぎず、次に会ったときの印象を大切にしてみましょう',
        kaizen: '相手の態度の理由を一人で決めつけず、一つだけ確かめてみましょう'
      },
      affirmations: ['私は、不安の奥にある本当の気持ちを見つめられます。', '見えない時間も、私は穏やかでいられます。', '私の心は、ゆっくりと晴れていきます。'],
      weights: [1.1, 1.0, 1.2, 1.0, 1.0]
    },
    {
      id: 'sun', num: 19, roman: 'XIX', name: '太陽', en: 'THE SUN',
      keywords: ['喜び', '素直さ', '生命力'],
      symbols: '輝く太陽、ひまわり、笑顔の子ども',
      meaning: '喜び、成功、生命力、ありのままの素直さ。',
      love: '喜びと素直さ、明るい生命力を表すカードです。うれしいことをうれしいと表現するあなたの笑顔が、まわりの空気を温めます。今日は気持ちを少しだけ外に出してみましょう。',
      actions: {
        kataomoi: '会ったときや話すときに、いつもより少しだけ笑顔を多めにしてみましょう',
        kosai: '相手のいいところを、一つ具体的にほめてみましょう',
        fukuen: '日の光を浴びながら散歩して、自分の元気を取り戻してみましょう',
        konkatsu: '自分が楽しいと思えることを、自己紹介で一つ話してみましょう',
        kaizen: '二人で一緒に笑えそうなことを、一つ提案してみましょう'
      },
      affirmations: ['私の笑顔は、まわりを明るく照らします。', '私は、喜びを素直に受け取ります。', '今日の私は、太陽のようにあたたかい。'],
      weights: [1.4, 1.3, 1.1, 1.3, 1.2]
    },
    {
      id: 'judgement', num: 20, roman: 'XX', name: '審判', en: 'JUDGEMENT',
      keywords: ['再生', '目覚め', 'もう一度'],
      symbols: '空に響くラッパ、目覚める人々、山並み',
      meaning: '再生、目覚め、呼びかけに応えること、過去を受け入れて進むこと。',
      love: '心が目覚め、もう一度向き合う力を表すカードです。過去の出来事にとらわれすぎず、今のあなたが感じていることに耳を傾けると、新しい答えが見えてきます。',
      actions: {
        kataomoi: '前から気になっていた一歩を、今の自分にできる大きさで考えてみましょう',
        kosai: '最近言えずにいたことを、一つだけやわらかく伝えてみましょう',
        fukuen: '過去の自分に「よく頑張ったね」と声をかけてみましょう',
        konkatsu: 'これまでの出会いを振り返って、次に大切にしたいことを一つ決めてみましょう',
        kaizen: '過去のことを一つ許すつもりで、今の気持ちを話してみましょう'
      },
      affirmations: ['私は、何度でも新しく始められます。', '過去の私も、今の私も、大切な私です。', '私は、心の呼びかけに素直に応えます。'],
      weights: [1.0, 1.0, 1.4, 1.0, 1.2]
    },
    {
      id: 'world', num: 21, roman: 'XXI', name: '世界', en: 'THE WORLD',
      keywords: ['完成', '調和', '満ちる'],
      symbols: '月桂樹の輪、舞う人、四隅の生きもの',
      meaning: '完成、調和、達成、ひとつの円が結ばれること。',
      love: 'ひとつの円が結ばれるような、満ちた調和を表すカードです。これまで歩んできたあなたの恋の時間は、すべて今につながっています。今日は、ここまでの自分を認めてあげましょう。',
      actions: {
        kataomoi: 'この恋を通して成長できたと感じることを、一つ書き出してみましょう',
        kosai: '二人で過ごしてきた時間の中で、うれしかった出来事を一つ話してみましょう',
        fukuen: 'あの恋から受け取ったものを、感謝とともに一つ思い出してみましょう',
        konkatsu: 'これまでの自分の頑張りを、一つ言葉にしてほめてみましょう',
        kaizen: '二人で乗り越えてきたことを一つ思い出して、言葉にして伝えてみましょう'
      },
      affirmations: ['私は、今の私で満たされています。', 'これまでの歩みが、すべて私の力になっています。', '私は、愛と調和の中にいます。'],
      weights: [1.1, 1.3, 1.0, 1.2, 1.1]
    }
  ];

  /* =========================================================
   * オリジナル図案（SVG）
   * viewBox 0 0 240 400 / 図案の中心 (120,190)
   * ========================================================= */
  const INK = '#4F4069';
  const GOLD = '#B7975A';
  const SOFT = '#EEE6F6';
  const PALE = '#F7F3FB';

  let uid = 0;

  function starPts(cx, cy, R, r, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const rad = i % 2 === 0 ? R : r;
      pts.push((cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }
  const star = (cx, cy, R, fill, n) =>
    `<polygon points="${starPts(cx, cy, R, R * 0.42, n || 5)}" fill="${fill || GOLD}" stroke="none"/>`;
  const sparkle = (cx, cy, s, fill) =>
    `<path d="M${cx},${cy - s} Q${cx},${cy} ${cx + s},${cy} Q${cx},${cy} ${cx},${cy + s} Q${cx},${cy} ${cx - s},${cy} Q${cx},${cy} ${cx},${cy - s}Z" fill="${fill || GOLD}"/>`;
  const leaf = (x, y, len, deg, fill) =>
    `<ellipse cx="${x}" cy="${y}" rx="${len / 2}" ry="${len / 5.2}" transform="rotate(${deg} ${x} ${y})" fill="${fill || 'none'}" stroke="${INK}" stroke-width="1.4"/>`;
  function sprig(x, y, dir, len) {
    // dir: -1 左へ、1 右へ。下から伸びる草花の枝
    const ex = x + dir * len * 0.75, ey = y - len * 0.55;
    let s = `<path d="M${x},${y} Q${x + dir * len * 0.2},${y - len * 0.5} ${ex},${ey}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const px = x + (ex - x) * t + dir * 2, py = y + (ey - y) * t - 4;
      s += leaf(px, py - 4, 13, dir > 0 ? -40 - i * 6 : 220 + i * 6);
    }
    s += `<circle cx="${ex}" cy="${ey}" r="2.6" fill="${GOLD}"/>`;
    return s;
  }
  function crescent(cx, cy, r, fill, rot) {
    return `<path d="M${cx},${cy - r} A${r},${r} 0 1,0 ${cx},${cy + r} A${r * 0.78},${r} 0 1,1 ${cx},${cy - r}Z" fill="${fill || GOLD}" transform="rotate(${rot || 0} ${cx} ${cy})"/>`;
  }
  const L = (d, w, c) => `<path d="${d}" fill="none" stroke="${c || INK}" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const C = (cx, cy, r, w, c, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill || 'none'}" stroke="${c || INK}" stroke-width="${w || 2}"/>`;
  const heart = (cx, cy, s, fill, stroke) =>
    `<path d="M${cx},${cy + s * 0.9} C${cx - s * 1.4},${cy - s * 0.1} ${cx - s * 0.7},${cy - s * 1.2} ${cx},${cy - s * 0.45} C${cx + s * 0.7},${cy - s * 1.2} ${cx + s * 1.4},${cy - s * 0.1} ${cx},${cy + s * 0.9}Z" fill="${fill || 'none'}" stroke="${stroke || INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
  const lemni = (cx, cy, w) => {
    const h = w * 0.3;
    return L(`M${cx},${cy} C${cx - h},${cy - h * 1.3} ${cx - w},${cy - h * 1.3} ${cx - w},${cy} C${cx - w},${cy + h * 1.3} ${cx - h},${cy + h * 1.3} ${cx},${cy} C${cx + h},${cy - h * 1.3} ${cx + w},${cy - h * 1.3} ${cx + w},${cy} C${cx + w},${cy + h * 1.3} ${cx + h},${cy + h * 1.3} ${cx},${cy}Z`, 1.8, GOLD);
  };

  const MOTIFS = {
    fool() {
      return L('M62,258 C80,230 70,205 100,190 C130,175 140,160 166,128', 2, INK).replace('stroke-linecap', 'stroke-dasharray="2 7" stroke-linecap') +
        star(170, 122, 13) +
        // つぼみ
        L('M92,252 C92,236 94,224 96,212') + `<path d="M96,212 C86,206 86,192 96,184 C106,192 106,206 96,212Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8"/>` +
        leaf(88, 236, 14, 210) + leaf(101, 230, 12, -30) +
        // 蝶
        `<g transform="translate(148 200) rotate(-14)">${leaf(-7, -5, 16, 210, PALE)}${leaf(7, -5, 16, -30, PALE)}${leaf(-5, 6, 11, 150, PALE)}${leaf(5, 6, 11, 30, PALE)}${L('M0,-10 L0,11', 1.6)}${L('M0,-10 C-3,-16 -6,-18 -8,-18', 1.2)}${L('M0,-10 C3,-16 6,-18 8,-18', 1.2)}</g>` +
        sparkle(132, 150, 5) + sparkle(72, 170, 4);
    },
    magician() {
      return lemni(120, 128, 24) +
        L('M120,150 L120,240', 2.4) + sparkle(120, 150, 9) +
        C(84, 180, 11) + L('M146,191 L156,170 L166,191Z') +
        `<rect x="74" y="210" width="20" height="20" rx="2" fill="none" stroke="${INK}" stroke-width="2"/>` + star(156, 220, 12, 'none').replace('stroke="none"', `stroke="${INK}" stroke-width="1.8"`) +
        L('M70,250 L170,250', 1.4, GOLD);
    },
    priestess() {
      const pillar = (x, fill) => `<rect x="${x}" y="140" width="16" height="108" fill="${fill}" stroke="${INK}" stroke-width="1.8"/><rect x="${x - 4}" y="132" width="24" height="8" rx="2" fill="${PALE}" stroke="${INK}" stroke-width="1.6"/><rect x="${x - 4}" y="248" width="24" height="7" rx="2" fill="${PALE}" stroke="${INK}" stroke-width="1.6"/>`;
      return pillar(66, SOFT) + pillar(158, PALE) +
        crescent(120, 165, 22, GOLD, 0) +
        L('M86,212 C98,204 108,220 120,212 C132,204 142,220 154,212', 1.6) +
        L('M86,226 C98,218 108,234 120,226 C132,218 142,234 154,226', 1.2, GOLD) +
        sparkle(104, 140, 4) + sparkle(138, 146, 3);
    },
    empress() {
      const wheat = (dir) => {
        let s = L(`M120,252 C${120 + dir * 10},228 ${120 + dir * 34},200 ${120 + dir * 46},150`, 1.6);
        for (let i = 0; i < 5; i++) {
          const t = i / 5;
          const x = 120 + dir * (14 + 30 * t), y = 222 - 66 * t;
          s += leaf(x - dir * 5, y, 12, dir > 0 ? -60 : 240, PALE) + leaf(x + dir * 5, y - 3, 12, dir > 0 ? -20 : 200, PALE);
        }
        return s;
      };
      return wheat(-1) + wheat(1) + heart(120, 178, 24, SOFT) + sparkle(120, 128, 7) + C(120, 180, 4, 0, 'none', GOLD);
    },
    emperor() {
      return `<path d="M48,252 L86,196 L104,220 L130,170 L160,228 L176,208 L194,252Z" fill="${PALE}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
        L('M124,180 L130,170 L136,180', 1.6, GOLD) +
        `<path d="M96,148 L96,124 L108,136 L120,116 L132,136 L144,124 L144,148Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
        L('M92,152 L148,152', 2.2, GOLD) + C(120, 116, 3, 0, 'none', GOLD) + C(96, 124, 2.4, 0, 'none', GOLD) + C(144, 124, 2.4, 0, 'none', GOLD);
    },
    hierophant() {
      const key = (deg) => `<g transform="rotate(${deg} 120 190)">${C(120, 130, 14, 2, INK, PALE)}${C(120, 130, 5, 1.4, GOLD)}${L('M120,144 L120,252', 2.4)}${L('M120,232 L134,232 M120,244 L130,244', 2.4)}</g>`;
      return key(-32) + key(32) + sparkle(120, 196, 7) + sparkle(120, 262, 4);
    },
    lovers() {
      return C(102, 198, 34, 1.8, INK, PALE) + C(138, 198, 34, 1.8, INK, 'none') +
        heart(120, 200, 9, GOLD, GOLD) +
        L('M96,140 A26,26 0 0 1 144,140', 1.8, GOLD) +
        L('M120,128 L120,118 M104,132 L98,124 M136,132 L142,124 M90,142 L82,138 M150,142 L158,138', 1.6, GOLD);
    },
    chariot() {
      return L('M76,150 C96,128 144,128 164,150', 2) +
        star(100, 142, 5) + star(120, 136, 6) + star(140, 142, 5) +
        L('M84,152 L84,198 M156,152 L156,198', 1.6) +
        `<rect x="80" y="198" width="80" height="30" rx="4" fill="${SOFT}" stroke="${INK}" stroke-width="1.8"/>` +
        L('M108,206 L120,198 L132,206', 1.6, GOLD) + L('M108,216 L120,208 L132,216', 1.6, GOLD) +
        C(94, 242, 13, 1.8) + C(146, 242, 13, 1.8) + C(94, 242, 3, 0, 'none', GOLD) + C(146, 242, 3, 0, 'none', GOLD) +
        L('M94,229 L94,255 M81,242 L107,242 M146,229 L146,255 M133,242 L159,242', 1);
    },
    strength() {
      let petals = '';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        petals += `<ellipse cx="${(120 + 15 * Math.cos(a)).toFixed(1)}" cy="${(196 + 15 * Math.sin(a)).toFixed(1)}" rx="13" ry="9" transform="rotate(${(i * 60).toFixed(0)} ${(120 + 15 * Math.cos(a)).toFixed(1)} ${(196 + 15 * Math.sin(a)).toFixed(1)})" fill="${PALE}" stroke="${INK}" stroke-width="1.6"/>`;
      }
      return lemni(120, 132, 22) + petals + C(120, 196, 8, 1.6, GOLD, SOFT) +
        L('M70,236 C95,256 145,256 170,236', 1.6) +
        leaf(84, 246, 12, 20) + leaf(104, 252, 12, 5) + leaf(136, 252, 12, -5) + leaf(156, 246, 12, -20) +
        C(120, 254, 3, 0, 'none', GOLD);
    },
    hermit() {
      const sixStar = `<polygon points="${starPts(120, 177, 12, 4.6, 8)}" fill="${GOLD}"/>`;
      return L('M120,112 L120,136', 1.6) + C(120, 110, 4, 1.6) +
        `<path d="M104,148 L112,136 L128,136 L136,148Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
        `<rect x="102" y="148" width="36" height="58" rx="3" fill="${PALE}" stroke="${INK}" stroke-width="1.8"/>` + sixStar +
        `<path d="M100,206 L140,206 L134,216 L106,216Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
        L('M86,176 L74,176 M154,176 L166,176 M90,150 L80,142 M150,150 L160,142 M90,202 L80,210 M150,202 L160,210', 1.4, GOLD).replace('stroke-linecap', 'stroke-dasharray="3 4" stroke-linecap') +
        `<path d="M64,258 L92,232 L106,244 L120,230 L134,244 L148,232 L176,258" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    },
    wheel() {
      let spokes = '';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        spokes += L(`M${(120 + 10 * Math.cos(a)).toFixed(1)},${(190 + 10 * Math.sin(a)).toFixed(1)} L${(120 + 42 * Math.cos(a)).toFixed(1)},${(190 + 42 * Math.sin(a)).toFixed(1)}`, 1.6);
        const b = a + Math.PI / 8;
        spokes += C((120 + 50 * Math.cos(b)).toFixed(1), (190 + 50 * Math.sin(b)).toFixed(1), 2.2, 0, 'none', GOLD);
      }
      return C(120, 190, 58, 2, INK, PALE) + C(120, 190, 42, 1.6) + spokes + C(120, 190, 10, 1.8, GOLD, SOFT) +
        sparkle(66, 136, 5) + sparkle(174, 136, 5) + sparkle(66, 244, 5) + sparkle(174, 244, 5);
    },
    justice() {
      const pan = (x) => L(`M${x},152 L${x - 16},200 M${x},152 L${x + 16},200`, 1.2) + `<path d="M${x - 20},200 A20,10 0 0 0 ${x + 20},200Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8"/>`;
      return L('M120,132 L120,244', 2.4) + L('M74,152 L166,152', 2) + C(120, 128, 6, 1.8, GOLD, PALE) +
        pan(80) + pan(160) +
        `<path d="M100,252 L140,252 L132,240 L108,240Z" fill="${PALE}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
        sparkle(120, 200, 5);
    },
    hanged() {
      return L('M66,134 C96,128 144,128 174,134', 2.2) +
        leaf(80, 126, 12, -20) + leaf(100, 124, 11, 15) + leaf(140, 124, 11, -15) + leaf(160, 126, 12, 20) +
        L('M120,131 L120,180', 1.4) +
        `<path d="M120,180 C108,196 106,206 106,212 A14,14 0 0 0 134,212 C134,206 132,196 120,180Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8"/>` +
        C(120, 208, 30, 1.4, GOLD).replace('stroke-width', 'stroke-dasharray="3 5" stroke-width') +
        sparkle(120, 254, 5) + sparkle(84, 236, 3) + sparkle(156, 236, 3);
    },
    death() {
      let rays = '';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i + 0.5) * (Math.PI / 7);
        rays += L(`M${(150 + 32 * Math.cos(a)).toFixed(1)},${(222 + 32 * Math.sin(a)).toFixed(1)} L${(150 + 42 * Math.cos(a)).toFixed(1)},${(222 + 42 * Math.sin(a)).toFixed(1)}`, 1.6, GOLD);
      }
      return `<path d="M124,222 A26,26 0 0 1 176,222Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8"/>` + rays +
        L('M52,222 L188,222', 1.8) +
        L('M60,236 C80,230 100,242 120,236 C140,230 160,242 180,236', 1.4) +
        L('M72,250 C90,244 106,256 124,250 C142,244 156,256 170,250', 1.2, GOLD) +
        L('M88,220 C88,206 86,196 88,186', 1.6) + leaf(80, 204, 12, 210) +
        C(88, 176, 12, 1.8, INK, '#FFFFFF') + L('M88,176 m-5,0 a5,5 0 1,1 5,5 a3,3 0 1,1 -3,-3', 1.2);
    },
    temperance() {
      const cup = (x, y) => `<path d="M${x - 14},${y} L${x + 14},${y} L${x + 9},${y + 20} L${x - 9},${y + 20}Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` + L(`M${x},${y + 20} L${x},${y + 30} M${x - 8},${y + 30} L${x + 8},${y + 30}`, 1.8);
      return cup(84, 150) + cup(156, 208) +
        L('M94,150 C112,130 150,160 152,206', 2, GOLD).replace('stroke-linecap', 'stroke-dasharray="1 6" stroke-linecap') +
        L('M98,152 C116,136 146,164 150,204', 1.4, INK) +
        sparkle(120, 118, 7) +
        L('M60,262 C80,256 100,268 120,262 C140,256 160,268 180,262', 1.2, GOLD);
    },
    devil() {
      return `<ellipse cx="102" cy="200" rx="24" ry="13" transform="rotate(-28 102 200)" fill="none" stroke="${INK}" stroke-width="3"/>` +
        `<ellipse cx="134" cy="182" rx="24" ry="13" transform="rotate(-28 134 182)" fill="none" stroke="${INK}" stroke-width="3" pathLength="100" stroke-dasharray="80 20" stroke-dashoffset="-6" stroke-linecap="round"/>` +
        heart(150, 142, 12, SOFT) + sparkle(170, 124, 4) + sparkle(132, 120, 3) + sparkle(176, 152, 3) +
        L('M82,246 L82,226', 2) + `<path d="M82,226 C76,216 82,208 82,204 C86,210 90,216 82,226Z" fill="${GOLD}"/>`;
    },
    tower() {
      return `<path d="M100,252 L100,160 L140,160 L140,252Z" fill="${PALE}" stroke="${INK}" stroke-width="1.8"/>` +
        `<path d="M96,160 L96,146 L104,146 L104,152 L112,152 L112,146 L120,146 L120,152 L128,152 L128,146 L136,146 L136,152 L144,152 L144,146 L144,160Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<path d="M114,210 L114,196 A6,6 0 0 1 126,196 L126,210Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.6"/>` +
        `<path d="M176,104 L156,132 L166,134 L146,158" fill="none" stroke="${GOLD}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>` +
        `<path d="M70,148 L70,138 L76,144 L82,134 L88,144 L94,138 L94,148Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.4" transform="rotate(-24 82 142)"/>` +
        sparkle(162, 176, 4) + sparkle(74, 186, 4) + sparkle(168, 204, 3) + L('M80,252 L160,252', 1.6);
    },
    star() {
      let small = '';
      const pos = [[72, 130], [168, 130], [60, 172], [180, 172], [72, 214], [168, 214], [120, 120]];
      pos.forEach((p, i) => { small += star(p[0], p[1], i === 6 ? 7 : 6, GOLD, 8); });
      return `<polygon points="${starPts(120, 176, 36, 13, 8)}" fill="${PALE}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
        `<polygon points="${starPts(120, 176, 20, 8, 8)}" fill="${GOLD}"/>` + small +
        `<ellipse cx="120" cy="244" rx="44" ry="8" fill="none" stroke="${INK}" stroke-width="1.4"/><ellipse cx="120" cy="244" rx="28" ry="5" fill="none" stroke="${GOLD}" stroke-width="1.2"/><ellipse cx="120" cy="244" rx="12" ry="2.4" fill="${SOFT}" stroke="${INK}" stroke-width="1"/>`;
    },
    moon() {
      const tower = (x) => `<path d="M${x - 9},252 L${x - 9},222 L${x},210 L${x + 9},222 L${x + 9},252Z" fill="${PALE}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
      return C(120, 152, 32, 1.6, INK, PALE) + crescent(120, 152, 32, GOLD, 180) +
        `<path d="M104,198 C100,204 100,208 104,208 C108,208 108,204 104,198Z" fill="${GOLD}"/><path d="M120,204 C116,210 116,214 120,214 C124,214 124,210 120,204Z" fill="${GOLD}"/><path d="M136,198 C132,204 132,208 136,208 C140,208 140,204 136,198Z" fill="${GOLD}"/>` +
        tower(70) + tower(170) +
        L('M120,262 C104,252 136,244 120,234 C108,226 128,222 120,218', 1.6).replace('stroke-linecap', 'stroke-dasharray="2 5" stroke-linecap');
    },
    sun() {
      let rays = '';
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        const r1 = 36, r2 = i % 2 ? 46 : 54;
        rays += L(`M${(120 + r1 * Math.cos(a)).toFixed(1)},${(166 + r1 * Math.sin(a)).toFixed(1)} L${(120 + r2 * Math.cos(a)).toFixed(1)},${(166 + r2 * Math.sin(a)).toFixed(1)}`, i % 2 ? 1.4 : 2, i % 2 ? INK : GOLD);
      }
      let petals = '';
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        petals += `<ellipse cx="${(120 + 11 * Math.cos(a)).toFixed(1)}" cy="${(244 + 11 * Math.sin(a)).toFixed(1)}" rx="6" ry="3" transform="rotate(${i * 36} ${(120 + 11 * Math.cos(a)).toFixed(1)} ${(244 + 11 * Math.sin(a)).toFixed(1)})" fill="${GOLD}"/>`;
      }
      return rays + C(120, 166, 30, 2, INK, PALE) + C(120, 166, 18, 1.4, GOLD, SOFT) + petals + C(120, 244, 6, 1.4, INK, SOFT);
    },
    judgement() {
      return `<path d="M72,166 L136,130 L142,150 L76,174Z" fill="${PALE}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
        `<path d="M136,130 C146,122 156,130 152,142 C150,150 146,152 142,150Z" fill="${SOFT}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
        L('M160,126 C168,134 168,146 160,154', 1.6, GOLD) + L('M168,118 C180,132 180,148 168,162', 1.4, GOLD) + L('M176,110 C192,130 192,150 176,170', 1.2, GOLD) +
        `<path d="M50,256 L82,222 L100,238 L120,216 L140,238 L158,222 L190,256" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
        L('M120,256 L120,226', 1.8) + leaf(112, 232, 13, 210, SOFT) + leaf(128, 228, 13, -30, SOFT) + sparkle(120, 206, 5);
    },
    world() {
      let wreath = '';
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const x = 120 + 44 * Math.cos(a), y = 190 + 60 * Math.sin(a);
        const deg = (a * 180) / Math.PI + 90 + (i % 2 ? 24 : -24);
        wreath += leaf(x.toFixed(1), y.toFixed(1), 15, deg.toFixed(0), i % 3 === 0 ? SOFT : 'none');
      }
      return `<ellipse cx="120" cy="190" rx="44" ry="60" fill="none" stroke="${GOLD}" stroke-width="1.2"/>` + wreath +
        `<polygon points="${starPts(120, 190, 18, 7, 4)}" fill="${GOLD}"/>` + C(120, 190, 26, 1.2, INK).replace('stroke-width', 'stroke-dasharray="2 4" stroke-width') +
        C(62, 124, 3, 0, 'none', GOLD) + C(178, 124, 3, 0, 'none', GOLD) + C(62, 256, 3, 0, 'none', GOLD) + C(178, 256, 3, 0, 'none', GOLD);
    }
  };

  function renderCardFace(card, opts) {
    opts = opts || {};
    const id = 'c' + (++uid);
    const label = `${card.name}（${card.en}）のカード`;
    return `<svg class="card-svg" viewBox="0 0 240 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="${id}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDFAF4"/><stop offset="1" stop-color="#F4EDDF"/></linearGradient>
        <radialGradient id="${id}halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${SOFT}"/></radialGradient>
      </defs>
      <rect x="0" y="0" width="240" height="400" rx="16" fill="url(#${id}bg)"/>
      <rect x="7" y="7" width="226" height="386" rx="12" fill="none" stroke="${GOLD}" stroke-width="1.4"/>
      <rect x="14" y="14" width="212" height="372" rx="8" fill="none" stroke="${GOLD}" stroke-width="0.7"/>
      ${sparkle(26, 26, 4)}${sparkle(214, 26, 4)}${sparkle(26, 374, 4)}${sparkle(214, 374, 4)}
      <text x="120" y="50" text-anchor="middle" font-family="'Shippori Mincho','Hiragino Mincho ProN','Yu Mincho',serif" font-size="17" letter-spacing="3" fill="${INK}">${card.roman}</text>
      ${(() => { const h = card.roman.length * 6.2 + 9; return `<path d="M${120 - h - 16},44.5 L${120 - h},44.5 M${120 + h},44.5 L${120 + h + 16},44.5" stroke="${GOLD}" stroke-width="1"/>`; })()}
      <circle cx="120" cy="190" r="80" fill="url(#${id}halo)" stroke="#DCCDEC" stroke-width="1.2"/>
      <circle cx="120" cy="190" r="86" fill="none" stroke="${GOLD}" stroke-width="0.6" stroke-dasharray="1 5"/>
      <g>${MOTIFS[card.id]()}</g>
      ${(() => { const half = Math.min(66, 12 + card.name.length * (card.name.length > 4 ? 9.5 : 11)); return sprig(120 - half, 334, -1, card.name.length > 4 ? 30 : 40) + sprig(120 + half, 334, 1, card.name.length > 4 ? 30 : 40); })()}
      <text x="120" y="330" text-anchor="middle" font-family="'Shippori Mincho','Hiragino Mincho ProN','Yu Mincho',serif" font-size="${card.name.length > 4 ? 18 : 22}" font-weight="600" letter-spacing="2" fill="${INK}">${card.name}</text>
      <text x="120" y="356" text-anchor="middle" font-family="'Cormorant Garamond','Times New Roman',serif" font-size="9.5" letter-spacing="2.4" fill="${GOLD}">${card.en}</text>
    </svg>`;
  }

  function renderCardBack() {
    const id = 'b' + (++uid);
    let dots = '';
    for (let y = 34; y <= 366; y += 22) {
      for (let x = 30; x <= 210; x += 22) {
        const off = ((y - 34) / 22) % 2 ? 11 : 0;
        const dx = x + off;
        if (dx > 212) continue;
        const d = Math.hypot(dx - 120, y - 200);
        if (d < 92) continue;
        dots += `<circle cx="${dx}" cy="${y}" r="1.1" fill="#FFFFFF" opacity="0.55"/>`;
      }
    }
    return `<svg class="card-svg" viewBox="0 0 240 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9B5E0"/><stop offset="0.55" stop-color="#A68BC7"/><stop offset="1" stop-color="#8A6DAF"/></linearGradient>
      </defs>
      <rect x="0" y="0" width="240" height="400" rx="16" fill="url(#${id}bg)"/>
      ${dots}
      <rect x="8" y="8" width="224" height="384" rx="12" fill="none" stroke="#F1E3C2" stroke-width="1.4"/>
      <rect x="15" y="15" width="210" height="370" rx="8" fill="none" stroke="#F1E3C2" stroke-width="0.6"/>
      <circle cx="120" cy="200" r="72" fill="none" stroke="#F1E3C2" stroke-width="1.2"/>
      <circle cx="120" cy="200" r="80" fill="none" stroke="#F1E3C2" stroke-width="0.6" stroke-dasharray="1 5"/>
      ${crescent(112, 196, 34, '#F6EBD2', 0)}
      <polygon points="${starPts(140, 178, 11, 4.4, 8)}" fill="#FFFFFF"/>
      ${sparkle(150, 222, 5, '#FFFFFF')}${sparkle(96, 150, 4, '#FFFFFF')}
      <circle cx="120" cy="300" r="3.2" fill="#D0563E"/>
      ${sparkle(120, 40, 6, '#F6EBD2')}${sparkle(120, 360, 6, '#F6EBD2')}
    </svg>`;
  }

  global.AKARI_CARDS = { CARDS, REL, renderCardFace, renderCardBack, byId: (id) => CARDS.find((c) => c.id === id) };
})(window);
