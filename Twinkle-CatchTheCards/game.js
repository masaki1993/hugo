import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { UltraHDRLoader } from 'three/addons/loaders/UltraHDRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SAVE_KEY = 'twinkle-catch-cards';
const THREE_EX = 'https://threejs.org/examples/';
const SAMPLE_INDEX = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/model-index.json';
const SAMPLE_BASE = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/';
const JUNIOR_URL = '../Twinkle/assets/character/super-junior/super-junior.glb';
const CARD_BASE = '../pokemon-cards/cards/';

const CARDS = [
  { file: '01.jpg', name: 'ユウゴEX' },
  { file: '02.jpg', name: 'るかストライクEX' },
  { file: '03.jpg', name: 'るかストライクEX' },
  { file: '04.jpg', name: 'ユウゴEX' },
  { file: '05.jpg', name: 'るかストライクEX' },
  { file: '06.jpg', name: 'ユウゴEX' },
  { file: '07.jpg', name: 'るかストライクEX' },
  { file: '08.jpg', name: 'ユウゴEX' },
  { file: '09.jpg', name: 'るかストライクEX' },
  { file: '10.jpg', name: 'ユウゴEX' },
  { file: '11.jpg', name: 'マサキファミリーEX' },
  { file: '12.jpg', name: 'るかストライクEX' },
  { file: '13.jpg', name: 'ユウゴEX' },
  { file: '14.jpg', name: 'ユウゴEX' },
  { file: '15.jpg', name: 'ユウゴEX' },
  { file: '16.jpg', name: 'ユウゴEX' },
  { file: '17.jpg', name: 'るかストライクEX' },
  { file: '18.jpg', name: 'るかストライクEX' },
];

const CAST = [
  { id: 'robot', file: 'models/gltf/RobotExpressive/RobotExpressive.glb', yugo: '人', ruka: 'ひと', kata: 'ロボット', mul: 0.95 },
  { id: 'parrot', file: 'models/gltf/Parrot.glb', yugo: '青', ruka: 'あお', kata: 'オウム', mul: 0.55 },
  { id: 'flamingo', file: 'models/gltf/Flamingo.glb', yugo: '赤', ruka: 'あか', kata: 'フラミンゴ', mul: 0.85 },
  { id: 'stork', file: 'models/gltf/Stork.glb', yugo: '白', ruka: 'しろ', kata: 'コウノトリ', mul: 0.9 },
  { id: 'horse', file: 'models/gltf/Horse.glb', yugo: '大', ruka: 'おお', kata: 'ウマ', mul: 1.05 },
  { id: 'duck', file: 'models/gltf/duck.glb', yugo: '小', ruka: 'ちい', kata: 'アヒル', mul: 0.42 },
];


const HIRA_N = ['まだ', 'いち', 'に', 'さん', 'し', 'ご', 'ろく', 'しち', 'はち', 'きゅう', 'じゅう', 'じゅういち', 'じゅうに', 'じゅうさん', 'じゅうし', 'じゅうご', 'じゅうろく', 'じゅうしち', 'じゅうはち'];
const KANJI_N = ['まだ', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八'];

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyZ', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Enter',
]);

const DOWN = new THREE.Vector3(0, -1, 0);
const PARTY = [1, 2, 4, 2, 1, 3, 4, 2];

const STORIES = [
  {
    yugo: ['夜の川を', '小さな舟が', 'ゆっくり渡った。', '星の光が', '水に落ちて', '魚が一つ', '高く跳ねた。'],
    ruka: ['よるの かわを', 'ちいさな ふねが', 'ゆっくり わたった。', 'ほしの ひかりが', 'みずに おちて', 'さかなが ひとつ', 'たかく はねた。'],
    kata: ['ヨルノ カワヲ', 'チイサナ フネガ', 'ユックリ ワタッタ。', 'ホシノ ヒカリガ', 'ミズニ オチテ', 'サカナガ ヒトツ', 'タカク ハネタ。'],
  },
  {
    yugo: ['森の奥で', '友だちが', '地図をなくした。', '風が来て', 'ページをめくり', '鳥が鳴いて', '道を教えた。'],
    ruka: ['もりの おくで', 'ともだちが', 'ちずを なくした。', 'かぜが きて', 'ページを めくり', 'とりが ないて', 'みちを おしえた。'],
    kata: ['モリノ オクデ', 'トモダチガ', 'チズヲ ナクシタ。', 'カゼガ キテ', 'ページヲ メクリ', 'トリガ ナイテ', 'ミチヲ オシエタ。'],
  },
  {
    yugo: ['朝の市は', 'もうにぎやかだ。', '赤いりんごが', '山のように', '積んであった。', '女の人が', '一つくれて', '甘い匂いがした。'],
    ruka: ['あさの いちは', 'もう にぎやかだ。', 'あかい りんごが', 'やまのように', 'つんであった。', 'おんなの ひとが', 'ひとつ くれて', 'あまい においが した。'],
    kata: ['アサノ イチハ', 'モウ ニギヤカダ。', 'アカイ リンゴガ', 'ヤマノヨウニ', 'ツンデアッタ。', 'オンナノ ヒトガ', 'ヒトツ クレテ', 'アマイ ニオイガ シタ。'],
  },
  {
    yugo: ['窓を雨が', '何度も叩いた。', '部屋の中は', 'あたたかい。', '本のページが', '静かにめくれた。', '外の空は', 'まだ暗かった。'],
    ruka: ['まどを あめが', 'なんども たたいた。', 'へやの なかは', 'あたたかい。', 'ほんの ページが', 'しずかに めくれた。', 'そとの そらは', 'まだ くらかった。'],
    kata: ['マドヲ アメガ', 'ナンドモ タタイタ。', 'ヘヤノ ナカハ', 'アタタカイ。', 'ホンノ ページガ', 'シズカニ メクレタ。', 'ソトノ ソラハ', 'マダ クラカッタ。'],
  },
  {
    yugo: ['古い橋の上で', '馬が立ち止まった。', '下の川は', '白く泡立っている。', '向こう岸に', '灯が一つ', '小さく見えた。'],
    ruka: ['ふるい はしの うえで', 'うまが たちどまった。', 'したの かわは', 'しろく あわだっている。', 'むこう ぎしに', 'ひが ひとつ', 'ちいさく みえた。'],
    kata: ['フルイ ハシノ ウエデ', 'ウマガ タチドマッタ。', 'シタノ カワハ', 'シロク アワダッテイル。', 'ムコウ ギシニ', 'ヒガ ヒトツ', 'チイサク ミエタ。'],
  },
  {
    yugo: ['ロボットは', 'ふしぎな夢を見た。', '海の底で', '銀の魚が', '輪になっていた。', '目が覚めると', '手の中に', '貝があった。'],
    ruka: ['ロボットは', 'ふしぎな ゆめを みた。', 'うみの そこで', 'ぎんの さかなが', 'わに なっていた。', 'めが さめると', 'ての なかに', 'かいが あった。'],
    kata: ['ロボットハ', 'フシギナ ユメヲ ミタ。', 'ウミノ ソコデ', 'ギンノ サカナガ', 'ワニ ナッテイタ。', 'メガ サメルト', 'テノ ナカニ', 'カイガ アッタ。'],
  },
  {
    yugo: ['空から', '手紙が落ちた。', '封を開けると', '短い詩と', '押した花が', '一枚入っていた。', '差出人の名は', 'にじんで読めない。'],
    ruka: ['そらから', 'てがみが おちた。', 'ふうを あけると', 'みじかい うたと', 'おした はなが', 'いちまい はいっていた。', 'だした ひとの なまえは', 'にじんで よめない。'],
    kata: ['ソラカラ', 'テガミガ オチタ。', 'フウヲ アケルト', 'ミジカイ ウタト', 'オシタ ハナガ', 'イチマイ ハイッテイタ。', 'ダシタ ヒトノ ナマエハ', 'ニジンデ ヨメナイ。'],
  },
  {
    yugo: ['雨がやむと', '水たまりが', '道に残った。', 'アヒルが', '自分の顔を', 'じっと見ていた。', '雲が割れて', '空が青くなった。'],
    ruka: ['あめが やむと', 'みずたまりが', 'みちに のこった。', 'アヒルが', 'じぶんの かおを', 'じっと みていた。', 'くもが われて', 'そらが あおくなった。'],
    kata: ['アメガ ヤムト', 'ミズタマリガ', 'ミチニ ノコッタ。', 'アヒルガ', 'ジブンノ カオヲ', 'ジット ミテイタ。', 'クモガ ワレテ', 'ソラガ アオクナッタ。'],
  },
  {
    yugo: ['夕方の池で', 'フラミンゴが', '片足で眠っていた。', '風が吹くと', 'みんな起きて', 'ゆっくり', '大きな輪になった。'],
    ruka: ['ゆうがたの いけで', 'フラミンゴが', 'かたあしで ねむっていた。', 'かぜが ふくと', 'みんな おきて', 'ゆっくり', 'おおきな わに なった。'],
    kata: ['ユウガタノ イケデ', 'フラミンゴガ', 'カタアシデ ネムッテイタ。', 'カゼガ フクト', 'ミンナ オキテ', 'ユックリ', 'オオキナ ワニ ナッタ。'],
  },
  {
    yugo: ['階段の下に', '小さい扉がある。', 'ほこりが光り', '古い靴が', '片方だけ', '残っていた。', '誰もまだ', '開けていない。'],
    ruka: ['かいだんの したに', 'ちいさい とびらが ある。', 'ほこりが ひかり', 'ふるい くつが', 'かたほう だけ', 'のこっていた。', 'だれも まだ', 'あけていない。'],
    kata: ['カイダンノ シタニ', 'チイサイ トビラガ アル。', 'ホコリガ ヒカリ', 'フルイ クツガ', 'カタホウ ダケ', 'ノコッテイタ。', 'ダレモ マダ', 'アケテイナイ。'],
  },
  {
    yugo: ['月が出ると', 'パン屋の灯がついた。', '焼きたての匂いが', '道いっぱいに', '広がった。', '犬が座って', 'じっと待っていた。'],
    ruka: ['つきが でると', 'パンやの ひが ついた。', 'やきたての においが', 'みち いっぱいに', 'ひろがった。', 'いぬが すわって', 'じっと まっていた。'],
    kata: ['ツキガ デルト', 'パンヤノ ヒガ ツイタ。', 'ヤキタテノ ニオイガ', 'ミチ イッパイニ', 'ヒロガッタ。', 'イヌガ スワッテ', 'ジット マッテイタ。'],
  },
  {
    yugo: ['オウムが', '知らない歌を', '三回歌った。', '棚の奥で', '小さな鈴が', 'チリンと鳴った。', 'そこには', '誰もいなかった。'],
    ruka: ['オウムが', 'しらない うたを', 'さんかい うたった。', 'たなの おくで', 'ちいさな すずが', 'チリンと なった。', 'そこには', 'だれも いなかった。'],
    kata: ['オウムガ', 'シラナイ ウタヲ', 'サンカイ ウタッタ。', 'タナノ オクデ', 'チイサナ スズガ', 'チリンと ナッタ。', 'ソコニハ', 'ダレモ イナカッタ。'],
  },
];

const HINTS = [
  (name) => ({
    yugo: [`つぎは${name}だ。`, '話を聞きに行け。'],
    ruka: [`つぎは ${name} だ。`, 'はなしを ききに いけ。'],
    kata: [`ツギハ ${name} ダ。`, 'ハナシヲ キキニ イケ。'],
  }),
  (name) => ({
    yugo: [`${name}が知っている。`, '会いに行け。'],
    ruka: [`${name}が しっている。`, 'あいに いけ。'],
    kata: [`${name}ガ シッテイル。`, 'アイニ イケ。'],
  }),
  (name) => ({
    yugo: ['鍵のヒントは続く。', `${name}を探せ。`],
    ruka: ['かぎの ヒントは つづく。', `${name}を さがせ。`],
    kata: ['カギノ ヒントハ ツヅク。', `${name}ヲ サガセ。`],
  }),
  (name) => ({
    yugo: [`${name}の所へ歩け。`, 'まだ途中だ。'],
    ruka: [`${name}の ところへ あるけ。`, 'まだ とちゅうだ。'],
    kata: [`${name}ノ トコロヘ アルケ。`, 'マダ トチュウダ。'],
  }),
];

const GOLD_HINTS = [
  {
    yugo: ['金に行け。', 'そこに鍵がある。'],
    ruka: ['きんに いけ。', 'そこに かぎが ある。'],
    kata: ['キンニ イケ。', 'ソコニ カギガ アル。'],
  },
  {
    yugo: ['ヒントは終わりだ。', '金に行け。'],
    ruka: ['ヒントは おわりだ。', 'きんに いけ。'],
    kata: ['ヒントハ オワリダ。', 'キンニ イケ。'],
  },
  {
    yugo: ['鍵は金の所だ。', '金に行け。'],
    ruka: ['かぎは きんの ところだ。', 'きんに いけ。'],
    kata: ['カギハ キンノ トコロダ。', 'キンニ イケ。'],
  },
];

function emptySave() {
  return {
    course: 'sponza',
    caught: [],
    kira: [],
    turn: 'yugo',
    route: [],
    step: 0,
    usedStories: [],
    replay: false,
    replayAt: 0,
    serial: 0,
  };
}

function loadSave() {
  const save = emptySave();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return save;
    if (raw.course === 'dungeon') save.course = 'dungeon';
    if (Array.isArray(raw.caught)) save.caught = raw.caught.filter((id) => CARDS.some((c) => c.file === id));
    if (Array.isArray(raw.kira)) save.kira = raw.kira.filter((id) => save.caught.includes(id));
    if (raw.turn === 'ruka') save.turn = 'ruka';
    const ids = new Set(CAST.map((c) => c.id));
    if (Array.isArray(raw.route)) {
      const route = raw.route.filter((id) => ids.has(id));
      if (route.length >= 1 && route.length <= 4) {
        save.route = route;
        const step = Number.isFinite(raw.step) ? raw.step : 0;
        save.step = Math.max(0, Math.min(route.length, step));
      }
    }
    if (Array.isArray(raw.usedStories)) {
      save.usedStories = raw.usedStories.filter((n) => Number.isInteger(n) && n >= 0 && n < STORIES.length);
    }
    save.replay = !!raw.replay;
    save.replayAt = Number.isFinite(raw.replayAt) ? raw.replayAt : 0;
    save.serial = Number.isFinite(raw.serial) ? raw.serial : 0;
  } catch (err) {
    return emptySave();
  }
  if (save.caught.length >= 9 && save.course === 'sponza') save.course = 'dungeon';
  return save;
}

function whoName(id) {
  const spec = CAST.find((c) => c.id === id);
  return spec ? spec.kata : '';
}

function rollRoute(seed) {
  const order = CAST.map((c) => c.id);
  let s = (Math.abs(seed) + 1) >>> 0;
  for (let i = order.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  const count = PARTY[Math.abs(seed) % PARTY.length];
  return order.slice(0, count);
}

function targetId(save) {
  if (!save.route.length || save.step >= save.route.length) return 'gold';
  return save.route[save.step];
}

function goalText(save) {
  const id = targetId(save);
  const yugo = save.turn === 'yugo';
  const kata = !yugo && save.serial % 2 === 1;
  if (id === 'gold') {
    if (yugo) return '金に行け。鍵を見つけろ。';
    return kata ? 'キンニ イケ。カギヲ ミツケロ。' : 'きんに いけ。かぎを みつけろ。';
  }
  const name = whoName(id);
  if (yugo) return `${name}に話しかけろ。`;
  return kata ? `${name}ニ ハナシカケテ。` : `${name}に はなしかけて。`;
}

function pickStory(save) {
  const used = new Set(save.usedStories);
  let pool = STORIES.map((_, i) => i).filter((i) => !used.has(i));
  if (!pool.length) pool = STORIES.map((_, i) => i);
  return pool[Math.abs(save.serial) % pool.length];
}

function buildLine(save) {
  const index = pickStory(save);
  const story = STORIES[index];
  const next = save.step + 1;
  const hint = next >= save.route.length
    ? GOLD_HINTS[Math.abs(save.serial) % GOLD_HINTS.length]
    : HINTS[Math.abs(save.serial) % HINTS.length](whoName(save.route[next]));
  return {
    storyId: index,
    yugo: story.yugo.concat(hint.yugo),
    ruka: story.ruka.concat(hint.ruka),
    kata: story.kata.concat(hint.kata),
    kataMode: save.serial % 2 === 1,
  };
}

function commitLine(save, line) {
  if (!save.usedStories.includes(line.storyId)) save.usedStories.push(line.storyId);
  if (save.usedStories.length >= STORIES.length) save.usedStories = [];
  save.serial += 1;
}

function countText(n, turn) {
  const i = Math.max(0, Math.min(18, n));
  return turn === 'yugo' ? KANJI_N[i] : HIRA_N[i];
}

class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.onKeyDown = (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.held.add(e.code);
      this.pressed.add(e.code);
    };
    this.onKeyUp = (e) => {
      this.held.delete(e.code);
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.held.clear());
  }

  endFrame() {
    this.pressed.clear();
  }

  down(code) {
    return this.held.has(code);
  }

  edge(code) {
    return this.pressed.has(code);
  }

  hold(code, on) {
    if (on) this.held.add(code);
    else this.held.delete(code);
  }

  tap(code) {
    this.pressed.add(code);
  }

  move() {
    let x = 0;
    let z = 0;
    if (this.down('KeyD') || this.down('ArrowRight')) x -= 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) z += 1;
    if (this.down('KeyZ') || this.down('ArrowDown')) z -= 1;
    const len = Math.hypot(x, z);
    if (len > 0) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }
}

function fitHeight(object, height) {
  const parent = object.parent;
  const pos = parent ? parent.position.clone() : null;
  const rot = parent ? parent.rotation.clone() : null;
  if (parent) {
    parent.position.set(0, 0, 0);
    parent.rotation.set(0, 0, 0);
    parent.scale.set(1, 1, 1);
    parent.updateWorldMatrix(true, false);
  }
  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  const h = Math.max(0.001, box.max.y - box.min.y);
  object.scale.setScalar(height / h);
  object.updateWorldMatrix(true, true);
  const fitted = new THREE.Box3().setFromObject(object);
  object.position.y -= fitted.min.y;
  if (parent && pos && rot) {
    parent.position.copy(pos);
    parent.rotation.copy(rot);
  }
}

function disposeTree(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const mats = obj.material ? [].concat(obj.material) : [];
    for (const mat of mats) {
      for (const key of Object.keys(mat)) {
        const value = mat[key];
        if (value && value.isTexture) value.dispose();
      }
      if (mat.dispose) mat.dispose();
    }
  });
}

function makeLabelTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(8, 16, 32, 0.78)';
  g.fillRect(16, 48, 480, 160);
  g.fillStyle = '#f4efe2';
  const size = text.length > 5 ? 64 : text.length > 2 ? 92 : 140;
  g.font = `700 ${size}px "Kiwi Maru", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class Game {
  constructor() {
    this.save = loadSave();
    this.input = new Input();
    this.mode = 'load';
    this.ready = false;
    this.mixers = [];
    this.cast = [];
    this.level = null;
    this.player = null;
    this.junior = null;
    this.pedestal = null;
    this.toilet = null;
    this.facingX = 0;
    this.facingZ = 1;
    this.playerHeight = 1.35;
    this.speed = 6;
    this.reach = 2;
    this.radius = 0.35;
    this.camBack = 7.6;
    this.camHeight = 8.2;
    this.bounds = { minX: -8, maxX: 8, minZ: -8, maxZ: 8, minY: 0, maxY: 6 };
    this.line = null;
    this.readAt = 0;
    this.talkNpc = null;
    this.pendingCard = null;
    this.hdr = null;
    this.roomEnv = null;
    this.last = performance.now();
    this.v1 = new THREE.Vector3();
    this.npcFrom = new THREE.Vector3();
    this.npcDir = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.camPos = new THREE.Vector3(0, 8, -10);

    this.els = {
      turn: document.getElementById('turn'),
      count: document.getElementById('count'),
      goal: document.getElementById('goal'),
      steps: document.getElementById('steps'),
      home: document.getElementById('home'),
      album: document.getElementById('album'),
      book: document.getElementById('book'),
      bookTitle: document.getElementById('book-title'),
      bookGrid: document.getElementById('book-grid'),
      bookClose: document.getElementById('book-close'),
      zero: document.getElementById('zero'),
      bookZoom: document.getElementById('book-zoom'),
      bookZoomImg: document.getElementById('book-zoom-img'),
      toilet: document.getElementById('toilet'),
      toiletLine: document.getElementById('toilet-line'),
      toiletOut: document.getElementById('toilet-out'),
      rewardFound: document.getElementById('reward-found'),
      prompt: document.getElementById('prompt'),
      talk: document.getElementById('talk'),
      talkHow: document.getElementById('talk-how'),
      talkWho: document.getElementById('talk-who'),
      words: document.getElementById('words'),
      go: document.getElementById('go'),
      reward: document.getElementById('reward'),
      rewardImg: document.getElementById('reward-img'),
      rewardLine: document.getElementById('reward-line'),
      rewardGo: document.getElementById('reward-go'),
      done: document.getElementById('done'),
      doneTitle: document.getElementById('done-title'),
      again: document.getElementById('again'),
      reset: document.getElementById('reset'),
      veil: document.getElementById('veil'),
      veilText: document.getElementById('veil-text'),
      veilError: document.getElementById('veil-error'),
      bar: document.getElementById('bar'),
      act: document.getElementById('act'),
    };

    const canvas = document.getElementById('view');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fb7e8);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
    this.floorRay = new THREE.Raycaster();
    this.wallRay = new THREE.Raycaster();
    this.wallRay.firstHitOnly = true;

    this.hemi = new THREE.HemisphereLight(0xc5d8ff, 0x8d6a45, 0.85);
    this.sun = new THREE.DirectionalLight(0xfff2dc, 2.3);
    this.sun.position.set(-12, 24, 8);
    this.scene.add(this.hemi, this.sun);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.roomEnv;

    this.loader = this.makeLoader();
    this.bindUi();
    this.paint();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop((now) => this.frame(now));
  }

  makeLoader() {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      if (total) this.els.bar.value = (loaded / total) * 100;
    };
    const draco = new DRACOLoader(manager);
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(draco);
    loader.setCrossOrigin('anonymous');
    return loader;
  }

  bindUi() {
    for (const button of document.querySelectorAll('#pad button[data-code]')) {
      const code = button.dataset.code;
      const down = (e) => {
        e.preventDefault();
        this.input.hold(code, true);
      };
      const up = (e) => {
        e.preventDefault();
        this.input.hold(code, false);
      };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointerleave', up);
      button.addEventListener('pointercancel', up);
    }
    this.els.act.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.tap('Enter');
    });
    this.els.go.addEventListener('click', () => this.finishTalk());
    this.els.count.addEventListener('click', () => this.openBook());
    this.els.bookClose.addEventListener('click', () => this.closeBook());
    this.els.zero.addEventListener('click', () => this.zeroCards());
    this.els.bookZoom.addEventListener('click', () => this.closeZoom());
    this.els.toiletOut.addEventListener('click', () => this.closeToilet());
    this.els.rewardGo.addEventListener('click', () => this.finishReward());
    this.els.again.addEventListener('click', () => this.again());
    this.els.reset.addEventListener('click', () => {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    });
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  async start() {
    try {
      await document.fonts.load('700 72px "Kiwi Maru"');
    } catch (err) {
      /* canvas labels still draw with a fallback face */
    }
    try {
      await this.loadCourse(this.save.course, { keepPlayer: false });
      this.ready = true;
      this.mode = 'play';
      document.body.classList.remove('is-load');
      this.hideVeil();
      if (this.save.caught.length >= 18 && !this.save.replay) this.showDone();
    } catch (err) {
      this.fail(err);
    }
  }

  fail(err) {
    this.els.veilError.textContent = err && err.message ? err.message : String(err);
    this.els.veil.classList.remove('is-gone');
  }

  hideVeil() {
    this.els.veil.classList.add('is-gone');
    this.els.veil.style.visibility = 'hidden';
    this.els.veilError.textContent = '';
  }

  showVeil(text) {
    this.els.veilText.textContent = text;
    this.els.bar.value = 0;
    this.els.veil.style.visibility = 'visible';
    this.els.veil.classList.remove('is-gone');
    document.body.classList.add('is-load');
    this.mode = 'load';
    this.ready = false;
  }

  async loadCourse(name, { keepPlayer }) {
    this.showVeil(this.save.turn === 'yugo' ? '中へ入る' : 'なかへ はいる');
    if (this.level) {
      this.scene.remove(this.level);
      disposeTree(this.level);
      this.level = null;
    }
    if (name === 'dungeon') await this.loadDungeon();
    else await this.loadSponza();
    this.normalizeLevel();
    this.measureLevel();
    if (!this.player) await this.loadPlayer();
    if (!this.cast.length) await this.loadCast();
    this.fitBodies();
    if (!this.pedestal) this.buildPedestal();
    this.placeBodies();
    this.scene.environment = name === 'dungeon' && this.hdr ? this.hdr : this.roomEnv;
    this.ready = true;
    this.mode = 'play';
    document.body.classList.remove('is-load');
    this.paint();
    this.snapCamera();
    if (keepPlayer) this.hideVeil();
    else this.hideVeil();
  }

  async sponzaUrl() {
    const response = await fetch(SAMPLE_INDEX);
    if (!response.ok) throw new Error('Sponza index');
    const models = await response.json();
    const info = models.find((model) => model.name === 'Sponza');
    if (!info) throw new Error('Sponza');
    const variants = info.variants || {};
    const variantName = variants['glTF-Binary'] || variants.glTF || variants['glTF-Embedded'] || Object.values(variants)[0];
    if (!variantName) throw new Error('Sponza variant');
    const folder = String(variantName).endsWith('.glb') ? 'glTF-Binary' : 'glTF';
    return `${SAMPLE_BASE}${info.name}/${folder}/${variantName}`;
  }

  async loadSponza() {
    const url = await this.sponzaUrl();
    const gltf = await this.loader.loadAsync(url);
    this.level = gltf.scene;
    this.scene.add(this.level);
    this.scene.background = new THREE.Color(0x8fb7e8);
    this.hemi.intensity = 0.9;
    this.sun.intensity = 2.35;
    this.sun.color.set(0xfff2dc);
  }

  async loadDungeon() {
    if (!this.hdr) {
      try {
        const tex = await new UltraHDRLoader().loadAsync(`${THREE_EX}textures/equirectangular/royal_esplanade_2k.hdr.jpg`);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        this.hdr = tex;
      } catch (err) {
        this.hdr = null;
      }
    }
    const gltf = await this.loader.loadAsync(`${THREE_EX}models/gltf/dungeon_warkarma.glb`);
    this.level = gltf.scene;
    this.scene.add(this.level);
    if (this.hdr) {
      this.scene.background = this.hdr;
      this.hemi.intensity = 0.35;
      this.sun.intensity = 0.8;
    } else {
      this.scene.background = new THREE.Color(0x87a0b8);
      this.hemi.intensity = 0.7;
      this.sun.intensity = 1.6;
    }
  }

  normalizeLevel() {
    const box = new THREE.Box3().setFromObject(this.level);
    const size = box.getSize(new THREE.Vector3());
    let scale = 1;
    if (size.y > 60) scale = 18 / size.y;
    else if (size.y > 0 && size.y < 3) scale = 12 / size.y;
    if (scale !== 1) {
      this.level.scale.multiplyScalar(scale);
      this.level.updateMatrixWorld(true);
    }
    const sized = new THREE.Box3().setFromObject(this.level).getSize(new THREE.Vector3());
    if (sized.x > sized.z * 1.15) {
      this.level.rotation.y += Math.PI / 2;
      this.level.updateMatrixWorld(true);
    }
  }

  measureLevel() {
    const box = new THREE.Box3().setFromObject(this.level);
    const size = box.getSize(new THREE.Vector3());
    const insetX = size.x * 0.08;
    const insetZ = size.z * 0.08;
    this.bounds = {
      minX: box.min.x + insetX,
      maxX: box.max.x - insetX,
      minZ: box.min.z + insetZ,
      maxZ: box.max.z - insetZ,
      minY: box.min.y,
      maxY: box.max.y,
    };
    const span = Math.max(size.x, size.z);
    this.playerHeight = THREE.MathUtils.clamp(size.y * 0.085, 1.05, 1.65);
    this.speed = span > 28 ? Math.min(11, Math.max(6, span / 8)) : 6;
    this.reach = Math.max(1.7, this.playerHeight * 1.45);
    this.radius = Math.max(0.28, this.playerHeight * 0.22);
    const scale = this.playerHeight / 1.82;
    const hallH = Math.max(1, size.y);
    this.camBack = Math.min(7.6 * scale, Math.max(2.8, hallH * 0.42));
    this.camHeight = Math.min(8.2 * scale, Math.max(2.4, hallH * 0.38));
    this.camera.far = Math.max(200, span * 6);
    this.camera.updateProjectionMatrix();
  }

  async loadPlayer() {
    const gltf = await this.loader.loadAsync(JUNIOR_URL);
    const pivot = new THREE.Group();
    const model = gltf.scene;
    pivot.add(model);
    model.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.frustumCulled = false;
      obj.castShadow = false;
    });
    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
    pivot.userData.actions = actions;
    pivot.userData.clip = '';
    this.mixers.push(mixer);
    this.player = pivot;
    this.junior = model;
    this.scene.add(pivot);
    this.playPlayer('Idle');
  }

  playPlayer(name) {
    const actions = this.player && this.player.userData.actions;
    if (!actions || !actions[name] || this.player.userData.clip === name) return;
    const prev = actions[this.player.userData.clip];
    const next = actions[name];
    next.reset().fadeIn(0.12).play();
    if (prev && prev !== next) prev.fadeOut(0.12);
    this.player.userData.clip = name;
  }

  async loadCast() {
    for (const spec of CAST) {
      const gltf = await this.loader.loadAsync(THREE_EX + spec.file);
      const pivot = new THREE.Group();
      const model = gltf.scene;
      pivot.add(model);
      model.traverse((obj) => {
        if (obj.isMesh) obj.frustumCulled = false;
        if (obj.morphTargetDictionary && obj.morphTargetInfluences) {
          const smile = obj.morphTargetDictionary.mouthSmile;
          if (smile != null) obj.morphTargetInfluences[smile] = 0.35;
        }
      });
      const actions = {};
      let clip = '';
      if (gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        const walkClip = gltf.animations.find((item) => /walk/i.test(item.name) && !/jump/i.test(item.name))
          || gltf.animations[0];
        const idleClip = gltf.animations.find((item) => /^idle$/i.test(item.name));
        actions.walk = mixer.clipAction(walkClip);
        if (idleClip) actions.idle = mixer.clipAction(idleClip);
        const start = actions.idle || actions.walk;
        start.play();
        clip = actions.idle ? 'idle' : 'walk';
        this.mixers.push(mixer);
      }
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      pivot.add(sprite);
      this.scene.add(pivot);
      const fly = spec.id === 'parrot' || spec.id === 'flamingo' || spec.id === 'stork';
      this.cast.push({
        spec,
        pivot,
        model,
        sprite,
        actions,
        clip,
        fly,
        heading: Math.random() * Math.PI * 2,
        wanderT: 0.4 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        speed: { robot: 1.55, parrot: 1.85, flamingo: 1.65, stork: 1.6, horse: 2.05, duck: 1.05 }[spec.id] || 1.4,
      });
    }
  }

  playNpc(npc, name) {
    const actions = npc.actions;
    if (!actions || !actions.walk) return;
    const clip = actions[name] ? name : 'walk';
    if (npc.clip === clip) return;
    const next = actions[clip];
    const prev = actions[npc.clip];
    next.reset().fadeIn(0.18).play();
    if (prev && prev !== next) prev.fadeOut(0.18);
    npc.clip = clip;
  }

  buildPedestal() {
    const group = new THREE.Group();
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.78, 0.2, 28),
      new THREE.MeshStandardMaterial({ color: 0x6a5430, metalness: 0.45, roughness: 0.42, emissive: 0x3a2a10, emissiveIntensity: 0.15 }),
    );
    stone.position.y = 0.1;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xe7c56a, emissive: 0xe7c56a, emissiveIntensity: 0.15, transparent: true, opacity: 0.9 }),
    );
    beam.position.y = 0.95;
    const light = new THREE.PointLight(0xe7c56a, 0, 6, 2);
    light.position.y = 1.2;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    sprite.position.y = 2.1;
    group.add(stone, beam, light, sprite);
    group.userData.beam = beam;
    group.userData.light = light;
    group.userData.sprite = sprite;
    const s = Math.max(0.7, this.playerHeight * 0.62);
    sprite.scale.set(s * 1.8, s * 0.9, 1);
    this.pedestal = group;
    this.scene.add(group);
  }

  fitBodies() {
    if (this.junior) fitHeight(this.junior, this.playerHeight);
    for (const npc of this.cast) fitHeight(npc.model, this.playerHeight * npc.spec.mul);
    const s = Math.max(0.7, this.playerHeight * 0.62);
    for (const npc of this.cast) {
      npc.sprite.position.y = this.playerHeight * npc.spec.mul + 0.28;
      npc.sprite.scale.set(s * 1.5, s * 0.75, 1);
    }
    if (this.pedestal && this.pedestal.userData.sprite) {
      const sign = this.pedestal.userData.sprite;
      sign.position.y = this.playerHeight * 1.7;
      sign.scale.set(s * 1.8, s * 0.9, 1);
    }
    this.refreshLabels();
  }

  labelFor(spec) {
    return spec.kata;
  }

  refreshLabels() {
    const yugo = this.save.turn === 'yugo';
    const kata = !yugo && this.save.serial % 2 === 1;
    for (const npc of this.cast) {
      const tex = makeLabelTexture(this.labelFor(npc.spec));
      if (npc.sprite.material.map) npc.sprite.material.map.dispose();
      npc.sprite.material.map = tex;
      npc.sprite.material.needsUpdate = true;
    }
    const sign = this.pedestal && this.pedestal.userData.sprite;
    if (!sign) return;
    const plate = yugo ? '金' : (kata ? 'キン' : 'きん');
    const tex = makeLabelTexture(plate);
    if (sign.material.map) sign.material.map.dispose();
    sign.material.map = tex;
    sign.material.needsUpdate = true;
  }

  placeBodies() {
    const spots = [
      [0.22, 0.4],
      [0.4, 0.48],
      [0.6, 0.4],
      [0.28, 0.7],
      [0.5, 0.76],
      [0.72, 0.68],
    ];
    const center = this.spot(0.5, 0.54);
    this.pedestal.position.set(center.x, center.y, center.z);
    this.cast.forEach((npc, index) => {
      const p = this.spot(spots[index][0], spots[index][1]);
      npc.pivot.position.set(p.x, p.y, p.z);
      npc.pivot.rotation.y = Math.atan2(center.x - p.x, center.z - p.z);
    });
    const floors = this.cast.map((npc) => npc.pivot.position.y).sort((a, b) => a - b);
    const floor = floors[Math.floor(floors.length / 2)] ?? center.y;
    let start = this.spot(0.5, 0.3);
    if (Math.abs(start.y - floor) > 0.45) {
      const back = Math.min(3.2, (this.bounds.maxZ - this.bounds.minZ) * 0.16);
      start = {
        x: center.x,
        y: floor,
        z: THREE.MathUtils.clamp(center.z - back, this.bounds.minZ, this.bounds.maxZ),
      };
    }
    this.player.position.set(start.x, start.y, start.z);
    this.facingX = 0;
    this.facingZ = 1;
    this.player.rotation.y = Math.atan2(this.facingX, this.facingZ) + Math.PI;
    this.placeToilet(center);
  }

  buildToilet() {
    const group = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: 0x6eafc4, roughness: 0.45 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.28 });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 1.05), wall);
    left.position.set(-0.52, 0.78, 0);
    const right = left.clone();
    right.position.x = 0.52;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.55, 0.08), wall);
    back.position.set(0, 0.78, -0.48);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.28, 16), white);
    bowl.position.set(0, 0.32, -0.12);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 18), new THREE.MeshStandardMaterial({ color: 0xd7e4ee, roughness: 0.35 }));
    seat.rotation.x = Math.PI / 2;
    seat.position.set(0, 0.48, -0.12);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.16), white);
    tank.position.set(0, 0.72, -0.34);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    sprite.position.y = 1.95;
    sprite.scale.set(1.6, 0.8, 1);
    group.add(left, right, back, bowl, seat, tank, sprite);
    group.userData.sprite = sprite;
    this.toilet = group;
    this.scene.add(group);
  }

  placeToilet(center) {
    if (!this.toilet) this.buildToilet();
    const p = this.spot(0.58, 0.62);
    const floors = this.cast.map((npc) => npc.pivot.position.y).sort((a, b) => a - b);
    const floor = floors[Math.floor(floors.length / 2)];
    if (floor != null && Math.abs(p.y - floor) > 0.45) p.y = floor;
    this.toilet.position.set(p.x, p.y, p.z);
    this.toilet.rotation.y = Math.atan2(center.x - p.x, center.z - p.z);
    const sign = this.toilet.userData.sprite;
    const tex = makeLabelTexture('トイレ');
    if (sign.material.map) sign.material.map.dispose();
    sign.material.map = tex;
    sign.material.needsUpdate = true;
  }

  spot(fx, fz) {
    const b = this.bounds;
    let x = THREE.MathUtils.lerp(b.minX, b.maxX, fx);
    let z = THREE.MathUtils.lerp(b.minZ, b.maxZ, fz);
    let y = this.groundY(x, z, b.maxY, true);
    const nudges = [[0.03, 0], [-0.03, 0], [0, 0.03], [0, -0.03], [0.05, 0.05], [-0.05, 0.04]];
    for (const [ox, oz] of nudges) {
      if (y != null) break;
      x = THREE.MathUtils.lerp(b.minX, b.maxX, THREE.MathUtils.clamp(fx + ox, 0.02, 0.98));
      z = THREE.MathUtils.lerp(b.minZ, b.maxZ, THREE.MathUtils.clamp(fz + oz, 0.02, 0.98));
      y = this.groundY(x, z, b.maxY, true);
    }
    if (y != null) {
      const stand = this.groundY(x, z, y + 0.25, false);
      if (stand != null && stand < y + 1.4) y = stand;
    }
    if (y == null) y = b.minY;
    return { x, y, z };
  }

  groundY(x, z, fromY, lowest) {
    if (!this.level) return null;
    const start = (fromY == null ? this.bounds.maxY : fromY) + 1.5;
    this.floorRay.set(this.v1.set(x, start, z), DOWN);
    this.floorRay.far = start - this.bounds.minY + 8;
    this.floorRay.firstHitOnly = !lowest;
    const hits = this.floorRay.intersectObject(this.level, true);
    let best = null;
    for (const hit of hits) {
      if (!hit.face) continue;
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (n.y < 0.55) continue;
      if (!lowest) return hit.point.y;
      if (best == null || hit.point.y < best) best = hit.point.y;
    }
    return best;
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    if (this.ready && this.mode !== 'load') this.update(dt);
    for (const mixer of this.mixers) mixer.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  update(dt) {
    if (this.mode === 'play') this.walk(dt);
    if (this.mode !== 'talk') this.wander(dt);
    this.stickFloor();
    this.followCamera(dt);
    this.glowPedestal(performance.now() / 1000);
    this.markPeople();
    if (this.mode === 'play') {
      this.updatePrompt();
      if (this.input.edge('Enter')) this.interact();
    }
  }

  walk(dt) {
    const move = this.input.move();
    if (move.x || move.z) {
      const stepX = move.x * this.speed * dt;
      const stepZ = move.z * this.speed * dt;
      const cx = THREE.MathUtils.clamp(this.player.position.x + stepX, this.bounds.minX, this.bounds.maxX);
      const cz = THREE.MathUtils.clamp(this.player.position.z + stepZ, this.bounds.minZ, this.bounds.maxZ);
      if (!this.blocked(cx, this.player.position.z)) this.player.position.x = cx;
      if (!this.blocked(this.player.position.x, cz)) this.player.position.z = cz;
      this.facingX = move.x;
      this.facingZ = move.z;
      this.playPlayer('Walk');
    } else {
      this.playPlayer('Idle');
    }
    this.player.rotation.y = Math.atan2(this.facingX, this.facingZ) + Math.PI;
  }

  wander(dt) {
    const b = this.bounds;
    const padX = (b.maxX - b.minX) * 0.16;
    const padZ = (b.maxZ - b.minZ) * 0.16;
    const minX = b.minX + padX;
    const maxX = b.maxX - padX;
    const minZ = b.minZ + padZ;
    const maxZ = b.maxZ - padZ;
    const now = performance.now() / 1000;
    for (const npc of this.cast) {
      npc.wanderT -= dt;
      if (npc.wanderT <= 0) {
        npc.wanderT = 1.2 + Math.random() * 2.8;
        npc.heading = Math.random() < 0.22 ? null : Math.random() * Math.PI * 2;
      }
      const moving = npc.heading != null;
      if (npc.fly) this.playNpc(npc, 'walk');
      else this.playNpc(npc, moving ? 'walk' : 'idle');
      if (npc.actions && npc.actions.walk && !npc.actions.idle) npc.actions.walk.timeScale = moving ? 1 : 0.4;
      if (!moving) {
        if (npc.spec.id === 'duck') npc.model.rotation.z *= 0.9;
        continue;
      }
      const step = npc.speed * dt;
      const nx = npc.pivot.position.x + Math.sin(npc.heading) * step;
      const nz = npc.pivot.position.z + Math.cos(npc.heading) * step;
      if (nx < minX || nx > maxX || nz < minZ || nz > maxZ || this.npcBlocked(npc, nx, nz) || this.crowd(npc, nx, nz)) {
        npc.heading = Math.random() * Math.PI * 2;
        npc.wanderT = 0.35 + Math.random() * 0.6;
        continue;
      }
      npc.pivot.position.x = nx;
      npc.pivot.position.z = nz;
      const floor = this.groundY(nx, nz, npc.pivot.position.y + 1.4, false);
      if (floor != null) {
        const hop = npc.fly ? 0.28 + Math.sin(now * 2.4 + npc.phase) * 0.1 : 0;
        npc.pivot.position.y = floor + hop;
      }
      npc.pivot.rotation.y = npc.heading;
      if (npc.spec.id === 'duck') npc.model.rotation.z = Math.sin(now * 8 + npc.phase) * 0.35;
    }
  }

  crowd(npc, x, z) {
    const spots = [this.pedestal, this.toilet];
    for (const spot of spots) {
      if (!spot) continue;
      if (Math.hypot(spot.position.x - x, spot.position.z - z) < 1.15) return true;
    }
    for (const other of this.cast) {
      if (other === npc) continue;
      if (Math.hypot(other.pivot.position.x - x, other.pivot.position.z - z) < 0.85) return true;
    }
    return false;
  }

  npcBlocked(npc, x, z) {
    const dx = x - npc.pivot.position.x;
    const dz = z - npc.pivot.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-5 || !this.level) return false;
    this.wallRay.set(
      this.npcFrom.set(npc.pivot.position.x, npc.pivot.position.y + this.playerHeight * npc.spec.mul * 0.45, npc.pivot.position.z),
      this.npcDir.set(dx / dist, 0, dz / dist),
    );
    this.wallRay.far = dist + 0.4;
    const hit = this.wallRay.intersectObject(this.level, true)[0];
    return !!(hit && hit.distance <= dist + 0.28);
  }

  blocked(x, z) {
    const dx = x - this.player.position.x;
    const dz = z - this.player.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-5 || !this.level) return false;
    this.wallRay.set(
      this.v1.set(this.player.position.x, this.player.position.y + this.playerHeight * 0.45, this.player.position.z),
      new THREE.Vector3(dx / dist, 0, dz / dist),
    );
    this.wallRay.far = dist + this.radius;
    const hit = this.wallRay.intersectObject(this.level, true)[0];
    return !!(hit && hit.distance <= dist + this.radius * 0.8);
  }

  stickFloor() {
    const y = this.groundY(this.player.position.x, this.player.position.z, this.player.position.y + this.playerHeight * 0.85, false);
    if (y == null) return;
    const drop = this.player.position.y - y;
    const rise = y - this.player.position.y;
    if (rise > 0.02 && rise < 0.6) this.player.position.y = y;
    else if (drop >= -0.02 && drop < 0.75) this.player.position.y = y;
  }

  cameraTarget() {
    const back = this.camBack;
    const b = this.bounds;
    let dz = back;
    if (this.player.position.z - dz < b.minZ) dz = Math.max(back * 0.35, this.player.position.z - b.minZ);
    if (this.player.position.z - dz > b.maxZ) dz = Math.min(-back * 0.32, this.player.position.z - b.maxZ);
    const span = Math.max(0.001, back - back * 0.42);
    const t = THREE.MathUtils.clamp((Math.abs(dz) - back * 0.42) / span, 0, 1);
    const y = THREE.MathUtils.lerp(this.player.position.y + 1.7 * (this.playerHeight / 1.82), this.player.position.y + this.camHeight, t);
    const pos = new THREE.Vector3(this.player.position.x, y, this.player.position.z - dz);
    const look = new THREE.Vector3(
      this.player.position.x,
      this.player.position.y + THREE.MathUtils.lerp(1.05, 1.15, t) * (this.playerHeight / 1.82),
      this.player.position.z + THREE.MathUtils.lerp(0.15, 1.4, t) * (this.playerHeight / 1.82),
    );
    return { pos, look };
  }

  snapCamera() {
    const { pos, look } = this.cameraTarget();
    const pulled = this.pullCamera(pos);
    this.camPos.copy(pulled);
    this.camera.position.copy(pulled);
    this.look.copy(look);
    this.camera.lookAt(this.look);
  }

  followCamera(dt) {
    const { pos, look } = this.cameraTarget();
    const pulled = this.pullCamera(pos);
    const k = 1 - Math.exp(-4.2 * dt);
    this.camPos.lerp(pulled, k);
    this.camera.position.copy(this.camPos);
    this.look.lerp(look, k);
    this.camera.lookAt(this.look);
  }

  pullCamera(pos) {
    if (!this.level || !this.player) return pos;
    const head = new THREE.Vector3(
      this.player.position.x,
      this.player.position.y + this.playerHeight * 0.55,
      this.player.position.z,
    );
    const dir = pos.clone().sub(head);
    const dist = dir.length();
    if (dist < 0.35) return pos;
    dir.multiplyScalar(1 / dist);
    this.wallRay.set(head, dir);
    this.wallRay.far = dist;
    const hit = this.wallRay.intersectObject(this.level, true)[0];
    if (!hit || hit.distance > dist - 0.2) return pos;
    return head.add(dir.multiplyScalar(Math.max(0.45, hit.distance - 0.3)));
  }

  glowPedestal(time) {
    if (!this.pedestal) return;
    const ready = this.cardReady();
    const beam = this.pedestal.userData.beam;
    const light = this.pedestal.userData.light;
    beam.material.emissiveIntensity = ready ? 0.7 + Math.sin(time * 3) * 0.35 : 0.08;
    light.intensity = ready ? 8 : 0;
  }

  ensureRoute() {
    const ids = new Set(CAST.map((c) => c.id));
    const ok = this.save.route.length > 0 && this.save.route.every((id) => ids.has(id));
    if (!ok) {
      this.save.route = rollRoute(this.save.serial + this.save.caught.length * 7);
      this.save.step = 0;
      this.persist();
    }
  }

  cardReady() {
    return this.save.route.length > 0 && this.save.step >= this.save.route.length;
  }

  nearest() {
    const target = targetId(this.save);
    let best = null;
    let bestD = this.reach;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    for (const npc of this.cast) {
      const d = Math.hypot(npc.pivot.position.x - px, npc.pivot.position.z - pz);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'npc', npc, d };
      }
    }
    if (this.pedestal) {
      const d = Math.hypot(this.pedestal.position.x - px, this.pedestal.position.z - pz);
      if (d < bestD) best = { kind: 'pedestal', d };
    }
    const questNear = best && (
      (best.kind === 'npc' && best.npc.spec.id === target)
      || (best.kind === 'pedestal' && target === 'gold')
    );
    if (this.toilet && !questNear) {
      const d = Math.hypot(this.toilet.position.x - px, this.toilet.position.z - pz);
      if (d < bestD) best = { kind: 'toilet', d };
    }
    return best;
  }

  markPeople() {
    const target = targetId(this.save);
    const s = Math.max(0.7, this.playerHeight * 0.62);
    for (const npc of this.cast) {
      const hot = npc.spec.id === target;
      const pop = hot ? 1.45 : 0.7;
      npc.sprite.scale.set(s * 1.5 * pop, s * 0.75 * pop, 1);
      npc.sprite.material.opacity = hot ? 1 : 0.42;
    }
  }

  updatePrompt() {
    const near = this.nearest();
    const yugo = this.save.turn === 'yugo';
    const kata = !yugo && this.save.serial % 2 === 1;
    const target = targetId(this.save);
    const want = target === 'gold' ? (yugo ? '金' : (kata ? 'キン' : 'きん')) : whoName(target);
    let text = '';
    let act = yugo ? '見よ' : 'みる';
    if (!near) {
      text = '';
    } else if (near.kind === 'toilet') {
      text = yugo ? 'トイレに入る' : (kata ? 'トイレニ ハイル' : 'トイレに はいる');
      act = yugo ? '入る' : (kata ? 'ハイル' : 'はいる');
    } else if (target === 'gold' && near.kind === 'pedestal') {
      text = yugo ? '金を見よ。鍵がある' : (kata ? 'キンヲ ミテ。カギガ アル' : 'きんを みて。かぎが ある');
      act = yugo ? '行こう' : (kata ? 'イコウ' : 'いこう');
    } else if (near.kind === 'npc' && near.npc.spec.id === target) {
      text = yugo ? `${want}に話しかけろ` : (kata ? `${want}ニ ハナシカケテ` : `${want}に はなしかけて`);
      act = yugo ? '聞く' : (kata ? 'キク' : 'きく');
    } else if (target === 'gold') {
      text = yugo ? '今は金に行け' : (kata ? 'イマハ キンニ イケ' : 'いまは きんに いけ');
    } else {
      text = yugo ? `今は${want}に話しかけろ` : (kata ? `イマハ ${want}ニ ハナシカケテ` : `いまは ${want}に はなしかけて`);
    }
    this.els.prompt.hidden = !text;
    this.els.prompt.textContent = text;
    this.els.act.textContent = act;
  }

  interact() {
    const near = this.nearest();
    if (!near) return;
    if (near.kind === 'toilet') {
      this.openToilet();
      return;
    }
    const target = targetId(this.save);
    if (near.kind === 'pedestal') {
      if (target === 'gold') this.openReward();
      return;
    }
    if (near.npc.spec.id !== target) return;
    this.openTalk(near.npc);
  }

  openTalk(npc) {
    this.mode = 'talk';
    this.talkNpc = npc;
    npc.heading = null;
    this.playNpc(npc, 'idle');
    this.line = buildLine(this.save);
    this.readAt = 0;
    document.body.classList.add('is-talk');
    this.els.prompt.hidden = true;
    this.els.talk.hidden = false;
    const kata = this.save.turn === 'ruka' && this.line.kataMode;
    this.els.talkHow.textContent = this.save.turn === 'yugo'
      ? '左から見よ'
      : (kata ? 'ヒダリカラ ミテ' : 'ひだりから みて');
    this.els.talkWho.textContent = whoName(npc.spec.id);
    this.els.go.hidden = true;
    this.els.go.textContent = this.save.turn === 'yugo' ? '行こう' : 'いこう';
    const words = this.save.turn === 'yugo' ? this.line.yugo : (kata ? this.line.kata : this.line.ruka);
    this.els.words.replaceChildren();
    words.forEach((word, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'word' + (index === 0 ? ' is-next' : '');
      button.textContent = word;
      button.addEventListener('click', () => this.tapWord(index, button));
      this.els.words.appendChild(button);
    });
  }

  tapWord(index, button) {
    if (this.mode !== 'talk') return;
    if (index !== this.readAt) {
      button.classList.remove('is-bad');
      void button.offsetWidth;
      button.classList.add('is-bad');
      return;
    }
    button.classList.add('is-done');
    button.classList.remove('is-next');
    this.readAt += 1;
    const next = this.els.words.children[this.readAt];
    if (next) next.classList.add('is-next');
    if (this.readAt >= this.els.words.children.length) this.els.go.hidden = false;
  }

  finishTalk() {
    if (this.mode !== 'talk' || this.els.go.hidden) return;
    commitLine(this.save, this.line);
    this.save.step += 1;
    this.save.turn = this.save.turn === 'yugo' ? 'ruka' : 'yugo';
    this.persist();
    this.closeTalk();
    this.paint();
  }

  closeTalk() {
    this.mode = 'play';
    this.talkNpc = null;
    this.line = null;
    document.body.classList.remove('is-talk');
    this.els.talk.hidden = true;
  }

  nextCard() {
    if (this.save.replay) return CARDS[this.save.replayAt % CARDS.length];
    return CARDS[Math.min(this.save.caught.length, CARDS.length - 1)];
  }

  openReward() {
    const card = this.nextCard();
    const already = this.save.caught.includes(card.file);
    this.pendingCard = { card, already };
    this.mode = 'reward';
    document.body.classList.add('is-reward');
    this.els.prompt.hidden = true;
    this.els.reward.hidden = false;
    this.els.reward.classList.toggle('is-kira', already);
    this.els.rewardImg.src = CARD_BASE + card.file;
    const yugo = this.save.turn === 'yugo';
    const kata = !yugo && this.save.serial % 2 === 1;
    this.els.rewardFound.textContent = yugo ? '鍵を見つけた' : (kata ? 'カギヲ ミツケタ' : 'かぎを みつけた');
    const prize = already
      ? (yugo ? '金のカードが開いた' : (kata ? 'キンノ カードガ ヒライタ' : 'きんの カードが ひらいた'))
      : (yugo ? 'カードが開いた' : (kata ? 'カードガ ヒライタ' : 'カードが ひらいた'));
    this.els.rewardLine.textContent = yugo ? prize : `${prize}\n${card.name}`;
    this.els.rewardGo.textContent = yugo ? '行こう' : 'いこう';
  }

  async finishReward() {
    if (this.mode !== 'reward' || !this.pendingCard) return;
    this.mode = 'load';
    const { card, already } = this.pendingCard;
    this.pendingCard = null;
    if (!already) this.save.caught.push(card.file);
    else if (!this.save.kira.includes(card.file)) this.save.kira.push(card.file);
    if (this.save.replay) this.save.replayAt += 1;
    this.save.route = rollRoute(this.save.serial + this.save.caught.length * 7);
    this.save.step = 0;
    const enterDungeon = !this.save.replay && this.save.course === 'sponza' && this.save.caught.length >= 9;
    if (enterDungeon) this.save.course = 'dungeon';
    this.persist();
    this.els.reward.hidden = true;
    document.body.classList.remove('is-reward');
    this.paint();
    if (enterDungeon) {
      try {
        await this.loadCourse('dungeon', { keepPlayer: true });
      } catch (err) {
        this.fail(err);
      }
      return;
    }
    this.mode = 'play';
    if (this.save.caught.length >= 18 && !this.save.replay) this.showDone();
  }

  showDone() {
    this.mode = 'done';
    document.body.classList.add('is-done');
    this.els.prompt.hidden = true;
    this.els.done.hidden = false;
    const yugo = this.save.turn === 'yugo';
    this.els.doneTitle.textContent = yugo ? '十八枚を見た' : 'じゅうはちまい みた';
    this.els.again.textContent = yugo ? 'もう行く' : 'もういく';
    this.els.reset.textContent = yugo ? '一から出る' : 'はじめから';
  }

  again() {
    this.save.replay = true;
    this.save.replayAt = 0;
    this.save.route = rollRoute(this.save.serial + 3);
    this.save.step = 0;
    this.save.turn = 'yugo';
    this.persist();
    this.mode = 'play';
    document.body.classList.remove('is-done');
    this.els.done.hidden = true;
    this.paint();
  }

  persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch (err) {
      /* private mode can refuse storage; the session still plays */
    }
  }

  paint() {
    this.ensureRoute();
    const yugo = this.save.turn === 'yugo';
    const kata = !yugo && this.save.serial % 2 === 1;
    document.body.classList.toggle('is-yugo', yugo);
    document.body.classList.toggle('is-ruka', !yugo);
    this.els.turn.textContent = yugo ? 'ゆうご' : 'るか';
    this.els.goal.textContent = goalText(this.save);
    const names = this.save.route.map((id) => whoName(id));
    names.push(yugo ? '金' : (kata ? 'キン' : 'きん'));
    this.els.steps.replaceChildren();
    names.forEach((mark, index) => {
      const chip = document.createElement('span');
      chip.textContent = mark;
      if (index < this.save.step) chip.className = 'is-done';
      else if (index === this.save.step) chip.className = 'is-now';
      this.els.steps.appendChild(chip);
    });
    const got = Math.min(18, this.save.caught.length);
    this.els.count.textContent = yugo
      ? `カード ${countText(got, 'yugo')} / 十八`
      : `カード ${countText(got, 'ruka')} / じゅうはち`;
    this.els.home.textContent = yugo ? '出る' : 'でる';
    this.els.act.textContent = yugo ? '見よ' : 'みる';
    this.refreshLabels();
  }

  openBook() {
    if (this.mode !== 'play') return;
    this.mode = 'book';
    document.body.classList.add('is-book');
    this.els.prompt.hidden = true;
    this.els.book.hidden = false;
    this.els.bookZoom.hidden = true;
    const got = Math.min(18, this.save.caught.length);
    const yugo = this.save.turn === 'yugo';
    const kata = !yugo && this.save.serial % 2 === 1;
    this.els.bookTitle.textContent = yugo
      ? `カード ${countText(got, 'yugo')} / 十八`
      : `カード ${countText(got, 'ruka')} / じゅうはち`;
    this.els.bookClose.textContent = yugo ? '出る' : (kata ? 'デル' : 'でる');
    this.els.zero.textContent = yugo ? '0に戻す' : (kata ? '0ニ モドス' : '0に もどす');
    this.els.bookGrid.replaceChildren();
    CARDS.forEach((card, index) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      const gotIt = this.save.caught.includes(card.file);
      const kira = this.save.kira.includes(card.file);
      cell.className = 'book-card' + (gotIt ? ' is-got' : '') + (kira ? ' is-kira' : '');
      if (gotIt) {
        const img = document.createElement('img');
        img.src = CARD_BASE + card.file;
        img.alt = card.name;
        cell.appendChild(img);
        cell.addEventListener('click', () => this.zoomCard(card));
      } else {
        cell.textContent = yugo ? KANJI_N[index + 1] : HIRA_N[index + 1];
        cell.disabled = true;
      }
      this.els.bookGrid.appendChild(cell);
    });
  }

  async zeroCards() {
    if (this.mode !== 'book' && this.mode !== 'done' && this.mode !== 'play') return;
    const fromBook = this.mode === 'book';
    const leaveDungeon = this.save.course === 'dungeon';
    this.save.caught = [];
    this.save.kira = [];
    this.save.replay = false;
    this.save.replayAt = 0;
    this.save.route = [];
    this.save.step = 0;
    this.save.course = 'sponza';
    this.persist();
    if (this.mode === 'done') {
      this.mode = 'play';
      document.body.classList.remove('is-done');
      this.els.done.hidden = true;
    }
    if (leaveDungeon) {
      if (fromBook) this.closeBook();
      try {
        await this.loadCourse('sponza', { keepPlayer: false });
      } catch (err) {
        this.fail(err);
      }
      return;
    }
    this.paint();
    if (fromBook) {
      this.mode = 'play';
      this.openBook();
    }
  }

  zoomCard(card) {
    this.els.bookZoomImg.src = CARD_BASE + card.file;
    this.els.bookZoomImg.alt = card.name;
    this.els.bookZoom.hidden = false;
  }

  closeZoom() {
    this.els.bookZoom.hidden = true;
  }

  closeBook() {
    if (this.mode !== 'book') return;
    this.closeZoom();
    this.mode = 'play';
    document.body.classList.remove('is-book');
    this.els.book.hidden = true;
  }

  openToilet() {
    this.mode = 'toilet';
    document.body.classList.add('is-toilet');
    this.els.prompt.hidden = true;
    this.els.toilet.hidden = false;
    const yugo = this.save.turn === 'yugo';
    const kata = !yugo && this.save.serial % 2 === 1;
    this.els.toiletLine.textContent = yugo ? 'トイレに入った。' : (kata ? 'トイレニ ハイッタ。' : 'トイレに はいった。');
    this.els.toiletOut.textContent = yugo ? '出る' : (kata ? 'デル' : 'でる');
  }

  closeToilet() {
    if (this.mode !== 'toilet') return;
    this.mode = 'play';
    document.body.classList.remove('is-toilet');
    this.els.toilet.hidden = true;
  }
}

const game = new Game();
game.start();
