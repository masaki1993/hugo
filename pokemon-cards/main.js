import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CARDS = [
  { file: '01.jpg', name: 'ユウゴEX', sub: '光・波・炎' },
  { file: '02.jpg', name: 'るかストライクEX', sub: 'ドリブル竜巻' },
  { file: '03.jpg', name: 'るかストライクEX', sub: '炎のパス' },
  { file: '04.jpg', name: 'ユウゴEX', sub: 'クリスタル' },
  { file: '05.jpg', name: 'るかストライクEX', sub: 'インフィニティブレイズ' },
  { file: '06.jpg', name: 'ユウゴEX', sub: 'サイコドライブ' },
  { file: '07.jpg', name: 'るかストライクEX', sub: 'サイコスフィア' },
  { file: '08.jpg', name: 'ユウゴEX', sub: '光のパンチ' },
  { file: '09.jpg', name: 'るかストライクEX', sub: '炎のドラゴン' },
  { file: '10.jpg', name: 'ユウゴEX', sub: '炎のシュート' },
  { file: '11.jpg', name: 'マサキファミリーEX', sub: '絆のクリスタル' },
];

const CARD_W = 2.5;
const CARD_H = 3.5;
const CARD_D = 0.07;
const RADIUS = 8.6;
const FOV = 36;

const canvas = document.getElementById('view');
const hint = document.getElementById('hint');
const veil = document.getElementById('veil');
const nameEl = document.getElementById('card-name');
const subEl = document.getElementById('card-sub');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060c);
scene.fog = new THREE.FogExp2(0x07060c, 0.02);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.16).texture;
scene.environmentIntensity = 0.55;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(FOV, 1, 0.08, 500);
const camPos = new THREE.Vector3(0, 5.1, 16.6);
const lookPos = new THREE.Vector3(0, 0.45, 0);
camera.position.copy(camPos);

const desiredCam = new THREE.Vector3();
const desiredLook = new THREE.Vector3();
const cardWorld = new THREE.Vector3();
const cardOut = new THREE.Vector3();
const frontAxis = new THREE.Vector3(0, 0, 1);

const ring = new THREE.Group();
scene.add(ring);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const state = {
  mode: 'orbit',
  focus: -1,
  hover: -1,
  yaw: 0,
  dragging: false,
  dragMoved: false,
  lastX: 0,
  downX: 0,
  downY: 0,
};

const cards = [];

function makeFoilTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 360;
  const g = c.getContext('2d');
  g.fillStyle = '#120c16';
  g.fillRect(0, 0, 256, 360);
  const sheen = g.createLinearGradient(0, 0, 256, 360);
  sheen.addColorStop(0, '#241628');
  sheen.addColorStop(0.45, '#8a6230');
  sheen.addColorStop(1, '#1a2748');
  g.globalAlpha = 0.72;
  g.fillStyle = sheen;
  g.fillRect(0, 0, 256, 360);
  g.globalAlpha = 0.45;
  for (let i = 0; i < 80; i++) {
    g.fillStyle = i % 3 === 0 ? '#f0d48a' : '#d7e7ff';
    g.fillRect(Math.random() * 256, Math.random() * 360, 1.2, 1.2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildStage() {
  scene.add(new THREE.HemisphereLight(0xc9d4ff, 0x2a140c, 0.85));

  const key = new THREE.DirectionalLight(0xfff3dd, 2.35);
  key.position.set(5, 11, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 32;
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.bias = -0.0006;
  scene.add(key);

  const gold = new THREE.PointLight(0xffc56a, 28, 26, 2);
  gold.position.set(-4, 3.2, 5);
  scene.add(gold);
  const crystal = new THREE.PointLight(0x8ad7ff, 18, 24, 2);
  crystal.position.set(6, 2.4, -3);
  scene.add(crystal);
  const rose = new THREE.PointLight(0xff6eb4, 10, 20, 2);
  rose.position.set(-2, 4, -6);
  scene.add(rose);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(RADIUS + 5.5, 80),
    new THREE.MeshStandardMaterial({
      color: 0x100c14,
      metalness: 0.92,
      roughness: 0.2,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.25;
  floor.receiveShadow = true;
  scene.add(floor);

  const inlay = new THREE.Mesh(
    new THREE.RingGeometry(RADIUS - 0.48, RADIUS + 0.12, 120),
    new THREE.MeshStandardMaterial({
      color: 0xe8c56b,
      metalness: 1,
      roughness: 0.28,
      emissive: 0x5c3d10,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    })
  );
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = -2.22;
  scene.add(inlay);

  const count = 260;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 11;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = -1.6 + Math.random() * 7.5;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const motes = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({
      color: 0xf3dd9a,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(motes);
  return { gold, crystal, rose, motes };
}

function prepareTexture(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function makeCard(meta, index, frontTex, foilTex) {
  const frontMat = new THREE.MeshPhysicalMaterial({
    map: frontTex,
    roughness: 0.32,
    metalness: 0.06,
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xe8c56b,
    metalness: 0.88,
    roughness: 0.26,
    emissive: 0x3a2508,
    emissiveIntensity: 0.25,
  });
  const backMat = new THREE.MeshStandardMaterial({
    map: foilTex,
    color: 0xffffff,
    metalness: 0.72,
    roughness: 0.38,
  });

  const group = new THREE.Group();
  group.userData.index = index;

  const edge = new THREE.Mesh(new THREE.BoxGeometry(CARD_W + 0.045, CARD_H + 0.045, CARD_D), edgeMat);
  edge.castShadow = true;
  edge.userData.index = index;

  const front = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), frontMat);
  front.position.z = CARD_D / 2 + 0.004;
  front.userData.index = index;

  const back = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), backMat);
  back.position.z = -CARD_D / 2 - 0.004;
  back.rotation.y = Math.PI;
  back.userData.index = index;

  group.add(edge, front, back);

  const baseAngle = (index / CARDS.length) * Math.PI * 2;
  group.position.set(Math.sin(baseAngle) * RADIUS, 0, Math.cos(baseAngle) * RADIUS);
  group.rotation.y = baseAngle;
  ring.add(group);

  return {
    meta,
    group,
    frontMat,
    edgeMat,
    backMat,
    baseAngle,
    radius: RADIUS,
    y: 0,
    scale: 1,
    bright: 1,
    face: baseAngle,
  };
}

function dampAngle(current, target, lambda, dt) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function hitIndex(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(ring.children, true);
  if (!hits.length) return -1;
  const index = hits[0].object.userData.index;
  return Number.isInteger(index) ? index : -1;
}

function showCard(index) {
  const card = cards[index];
  nameEl.textContent = card.meta.name;
  subEl.textContent = card.meta.sub;
}

function enterFocus(index) {
  state.mode = 'focus';
  state.focus = index;
  state.hover = -1;
  document.body.classList.add('is-focus');
  hint.textContent = '← → で隣へ　·　Esc で戻る';
  showCard(index);
}

function exitFocus() {
  state.mode = 'orbit';
  state.focus = -1;
  document.body.classList.remove('is-focus');
  hint.textContent = 'ドラッグで回す　·　クリックで拡大';
}

function step(dir) {
  if (state.mode !== 'focus') return;
  const next = (state.focus + dir + cards.length) % cards.length;
  state.focus = next;
  showCard(next);
}

function focusDistance() {
  const fill = camera.aspect < 1 ? 0.7 : 0.8;
  const visibleH = (CARD_H * 1.08) / fill;
  return visibleH / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2));
}

function orbitPose() {
  const aspect = Math.max(camera.aspect, 0.3);
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
  const neededW = (RADIUS + CARD_W) * 2 + 4.5;
  const neededH = CARD_H + RADIUS * 0.72 + 5;
  const dist = Math.max(neededW / (2 * tanV * aspect), neededH / (2 * tanV), 16) * 1.08;
  const pitch = 0.36;
  const z = dist / Math.sqrt(1 + pitch * pitch);
  return { x: 0, y: z * pitch, z };
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function bindInput() {
  canvas.addEventListener('pointerdown', (event) => {
    state.dragging = true;
    state.dragMoved = false;
    state.lastX = event.clientX;
    state.downX = event.clientX;
    state.downY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!state.dragging) {
      state.hover = state.mode === 'orbit' ? hitIndex(event) : -1;
      canvas.style.cursor = state.hover >= 0 ? 'pointer' : 'grab';
      return;
    }
    const dx = event.clientX - state.lastX;
    state.lastX = event.clientX;
    if (Math.hypot(event.clientX - state.downX, event.clientY - state.downY) > 6) {
      state.dragMoved = true;
    }
    if (state.mode === 'orbit') state.yaw += dx * 0.0052;
    state.hover = -1;
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointerup', (event) => {
    const dx = event.clientX - state.downX;
    const dy = event.clientY - state.downY;
    state.dragging = false;
    canvas.style.cursor = state.mode === 'orbit' ? 'grab' : 'default';
    if (state.mode === 'focus' && state.dragMoved && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      step(dx < 0 ? 1 : -1);
      return;
    }
    if (state.dragMoved) return;
    const index = hitIndex(event);
    if (state.mode === 'orbit') {
      if (index >= 0) enterFocus(index);
      return;
    }
    if (index < 0) exitFocus();
    else if (index !== state.focus) enterFocus(index);
  });

  canvas.addEventListener('pointercancel', () => {
    state.dragging = false;
  });

  canvas.addEventListener('wheel', (event) => {
    if (state.mode !== 'orbit') return;
    event.preventDefault();
    state.yaw += Math.sign(event.deltaY) * 0.09;
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') exitFocus();
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'ArrowLeft') step(-1);
  });

  document.getElementById('prev').addEventListener('click', () => step(-1));
  document.getElementById('next').addEventListener('click', () => step(1));
  document.getElementById('back').addEventListener('click', () => exitFocus());
  window.addEventListener('resize', resize);
}

function frame(time, lights) {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === 'orbit' && !state.dragging) state.yaw += dt * 0.16;
  ring.rotation.y = state.yaw;

  lights.gold.position.set(Math.cos(time * 0.28) * 8, 3.1, Math.sin(time * 0.28) * 8);
  lights.crystal.position.set(Math.cos(-time * 0.2) * 9, 2.2, Math.sin(-time * 0.2) * 9);
  lights.motes.rotation.y = time * 0.04;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const focused = state.mode === 'focus' && i === state.focus;
    const bobAmp = focused ? 0.035 : 0.22;
    const bob = Math.sin(time * 1.15 + i * 0.7) * bobAmp;
    let radial = RADIUS;
    let lift = 0;
    let scale = 1;
    let bright = 1;
    if (state.mode === 'orbit' && state.hover === i) {
      radial += 0.42;
      scale = 1.045;
    }
    if (state.mode === 'focus') {
      if (focused) {
        radial += 0.7;
        lift = 0.42;
        scale = 1.08;
      } else {
        radial -= 1.35;
        lift = -0.28;
        scale = 0.88;
        bright = 0.2;
      }
    }
    const damp = (v, target, lambda) => THREE.MathUtils.damp(v, target, lambda, dt);
    card.radius = damp(card.radius, radial, 4.2);
    card.y = damp(card.y, bob + lift, 3.4);
    card.scale = damp(card.scale, scale, 4.5);
    card.bright = damp(card.bright, bright, 5);
    const angle = card.baseAngle;
    card.group.position.set(Math.sin(angle) * card.radius, card.y, Math.cos(angle) * card.radius);
    const worldAngle = angle + state.yaw;
    const wx = Math.sin(worldAngle) * card.radius;
    const wz = Math.cos(worldAngle) * card.radius;
    const toCam = Math.atan2(camPos.x - wx, camPos.z - wz);
    const turn = Math.atan2(Math.sin(toCam - worldAngle), Math.cos(toCam - worldAngle));
    const faceWorld = state.mode === 'focus' ? worldAngle : worldAngle + turn * 0.84;
    card.face = dampAngle(card.face, faceWorld - state.yaw, 5.5, dt);
    card.group.rotation.y = card.face;
    card.group.scale.setScalar(card.scale);
    const b = card.bright;
    card.frontMat.color.setScalar(b);
    card.backMat.color.setScalar(b);
    card.edgeMat.color.setRGB(0.91 * b, 0.77 * b, 0.42 * b);
    card.edgeMat.emissiveIntensity = focused ? 0.7 : 0.2;
  }

  ring.updateWorldMatrix(true, true);
  if (state.mode === 'focus' && state.focus >= 0) {
    const card = cards[state.focus];
    card.group.getWorldPosition(cardWorld);
    cardOut.copy(frontAxis).transformDirection(card.group.matrixWorld);
    desiredCam.copy(cardWorld).addScaledVector(cardOut, focusDistance());
    desiredCam.y += 0.08;
    desiredLook.copy(cardWorld);
  } else {
    const pose = orbitPose();
    desiredCam.set(pose.x, pose.y, pose.z);
    desiredLook.set(0, 0.45, 0);
  }

  const glide = 3.6;
  camPos.x = THREE.MathUtils.damp(camPos.x, desiredCam.x, glide, dt);
  camPos.y = THREE.MathUtils.damp(camPos.y, desiredCam.y, glide, dt);
  camPos.z = THREE.MathUtils.damp(camPos.z, desiredCam.z, glide, dt);
  lookPos.x = THREE.MathUtils.damp(lookPos.x, desiredLook.x, glide, dt);
  lookPos.y = THREE.MathUtils.damp(lookPos.y, desiredLook.y, glide, dt);
  lookPos.z = THREE.MathUtils.damp(lookPos.z, desiredLook.z, glide, dt);
  camera.position.copy(camPos);
  camera.lookAt(lookPos);
  scene.fog.density = 0.62 / Math.max(camera.position.length(), 14);
  renderer.render(scene, camera);
}

async function main() {
  resize();
  const pose = orbitPose();
  camPos.set(pose.x, pose.y, pose.z);
  lookPos.set(0, 0.45, 0);
  camera.position.copy(camPos);
  canvas.style.cursor = 'grab';
  const lights = buildStage();
  const loader = new THREE.TextureLoader();
  const foil = makeFoilTexture();
  const textures = await Promise.all(
    CARDS.map((card) => loader.loadAsync(`./cards/${card.file}`).then(prepareTexture))
  );
  textures.forEach((tex, i) => cards.push(makeCard(CARDS[i], i, tex, foil)));
  bindInput();
  veil.classList.add('is-gone');
  renderer.setAnimationLoop((t) => frame(t * 0.001, lights));
}

main().catch((err) => {
  veil.querySelector('p').textContent = 'カードを開けませんでした';
  console.error(err);
});
