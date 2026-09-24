import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { HEROES } from './characters.js';
import { loadMonster, playMonster } from './monsters.js';

const JUNIOR_GLB = 'assets/character/super-junior/super-junior.glb';
const JUNIOR_HEIGHT = 1.82;
const JUNIOR_ONCE = new Set(['SwordSlash', 'Dash', 'Victory']);
let juniorGltfPromise = null;

const SKIN = 0xe0b089;
const NIGHT = 0x0b1020;

function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extra.roughness ?? 0.72,
    metalness: extra.metalness ?? 0.04,
    emissive: extra.emissive ?? 0x000000,
    emissiveIntensity: extra.emissiveIntensity ?? 0,
    transparent: extra.transparent ?? false,
    opacity: extra.opacity ?? 1,
    side: extra.side ?? THREE.FrontSide,
  });
}

function add(parent, geo, color, { pos, rot, scale, extra, shadow = true } = {}) {
  const mesh = new THREE.Mesh(geo, typeof color === 'number' || typeof color === 'string'
    ? std(color, extra || {})
    : color);
  if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function stoneTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
    g.fillStyle = '#6a7384';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 80; i += 1) {
      g.fillStyle = i % 3 === 0 ? '#5c6576' : '#7a8494';
    g.fillRect((i * 47) % 256, (i * 89) % 256, 28 + (i % 18), 16 + (i % 12));
  }
  for (let i = 0; i < 40; i += 1) {
    g.fillStyle = 'rgba(40, 90, 50, 0.18)';
    g.beginPath();
    g.arc((i * 61) % 256, (i * 97) % 256, 4, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 10);
  return tex;
}

function makeLimb(group, color, pos, scale) {
  return add(group, new THREE.BoxGeometry(1, 1, 1), color, { pos, scale });
}

function addEyes(parent, { y, z, gap, size, iris }) {
  for (const side of [-1, 1]) {
    const x = side * gap;
    add(parent, new THREE.SphereGeometry(size, 8, 6), 0xfff8ee, {
      pos: [x, y, z],
      shadow: false,
    });
    add(parent, new THREE.SphereGeometry(size * 0.58, 8, 6), iris, {
      pos: [x, y, z + size * 0.45],
      shadow: false,
    });
    add(parent, new THREE.SphereGeometry(size * 0.28, 6, 5), 0x1a120c, {
      pos: [x, y, z + size * 0.82],
      shadow: false,
    });
  }
}

function makeHumanoid({ tunic, accent, hair, slim = 1, iris = 0x3d6ea8, pants = 0x4a3428 }) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  add(body, new THREE.BoxGeometry(0.72 * slim, 0.78, 0.36), tunic, { pos: [0, 0.98, 0] });
  add(body, new THREE.SphereGeometry(0.3, 12, 10), SKIN, { pos: [0, 1.58, 0.02] });
  add(body, new THREE.SphereGeometry(0.28, 10, 8), hair, {
    pos: [0, 1.78, -0.06],
    scale: [1.05, 0.62, 0.82],
  });
  addEyes(body, { y: 1.64, z: 0.34, gap: 0.11, size: 0.075, iris });
  add(body, new THREE.BoxGeometry(0.07, 0.025, 0.02), hair, { pos: [-0.11, 1.76, 0.32], shadow: false });
  add(body, new THREE.BoxGeometry(0.07, 0.025, 0.02), hair, { pos: [0.11, 1.76, 0.32], shadow: false });
  add(body, new THREE.BoxGeometry(0.08, 0.02, 0.02), 0xc47a6a, { pos: [0, 1.5, 0.34], shadow: false });
  makeLimb(body, tunic, [-0.42 * slim, 0.98, 0], [0.16, 0.62, 0.16]);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.42 * slim, 1.22, 0);
  body.add(rightArm);
  add(rightArm, new THREE.BoxGeometry(0.16, 0.62, 0.16), tunic, { pos: [0, -0.26, 0] });
  makeLimb(body, pants, [-0.16 * slim, 0.34, 0], [0.2, 0.52, 0.22]);
  makeLimb(body, pants, [0.16 * slim, 0.34, 0], [0.2, 0.52, 0.22]);
  add(body, new THREE.BoxGeometry(0.22, 0.12, 0.28), 0x2a211c, { pos: [-0.16 * slim, 0.08, 0.04] });
  add(body, new THREE.BoxGeometry(0.22, 0.12, 0.28), 0x2a211c, { pos: [0.16 * slim, 0.08, 0.04] });

  root.userData.body = body;
  root.userData.rightArm = rightArm;
  root.userData.accent = accent;
  return root;
}

function addWeapon(root, weapon, accent) {
  const arm = root.userData.rightArm;
  const hold = new THREE.Group();
  hold.position.set(0, -0.62, 0.12);
  arm.add(hold);
  if (weapon === 'sword') {
    add(hold, new THREE.BoxGeometry(0.08, 0.08, 1.15), 0xc0c6d0, { pos: [0, 0, 0.55], extra: { metalness: 0.55, roughness: 0.3 } });
    add(hold, new THREE.BoxGeometry(0.28, 0.08, 0.08), accent, { pos: [0, 0, 0.08] });
  } else if (weapon === 'hammer') {
    add(hold, new THREE.CylinderGeometry(0.06, 0.06, 0.95, 8), 0x6d4c41, { pos: [0, 0.1, 0.2], rot: [Math.PI / 2.4, 0, 0] });
    add(hold, new THREE.BoxGeometry(0.55, 0.4, 0.4), 0x7f8c8d, { pos: [0, 0.28, 0.72], extra: { metalness: 0.4 } });
  } else if (weapon === 'scepter') {
    add(hold, new THREE.CylinderGeometry(0.045, 0.045, 1.15, 8), accent, { pos: [0, 0, 0.5], rot: [Math.PI / 2, 0, 0], extra: { metalness: 0.6 } });
    add(hold, new THREE.SphereGeometry(0.16, 10, 8), accent, { pos: [0, 0.05, 1.05], extra: { emissive: accent, emissiveIntensity: 0.35, metalness: 0.7 } });
  } else if (weapon === 'orb') {
    add(hold, new THREE.SphereGeometry(0.18, 12, 10), 0x5dade2, { pos: [0, 0.1, 0.35], extra: { emissive: 0x2e86ab, emissiveIntensity: 0.7 } });
  } else if (weapon === 'dagger') {
    add(hold, new THREE.BoxGeometry(0.06, 0.05, 0.55), 0xb0b6c0, { pos: [0, 0, 0.32], extra: { metalness: 0.5 } });
    add(hold, new THREE.BoxGeometry(0.18, 0.05, 0.06), accent, { pos: [0, 0, 0.06] });
  }
  root.userData.weapon = hold;
}

function buildHeroMesh(heroId) {
  const h = HEROES[heroId];
  const slim = heroId === 'dunk' ? 1.22 : heroId === 'jones' ? 0.86 : 1;
  const iris = {
    junior: 0x3d7ec4,
    trick: 0x2e86ab,
    dunk: 0x6b4423,
    king: 0x2f9e78,
    jones: 0x6b4423,
  }[heroId];
  const root = makeHumanoid({
    tunic: h.tunic,
    accent: h.accent,
    hair: h.hair,
    slim,
    iris,
    pants: heroId === 'king' ? 0x145c32 : heroId === 'jones' ? 0x2a1838 : 0x5a3d2b,
  });
  const body = root.userData.body;

  if (heroId === 'junior') {
    const cape = add(body, new THREE.BoxGeometry(0.95, 1.05, 0.06), h.accent, { pos: [0, 0.95, -0.28], rot: [0.25, 0, 0] });
    root.userData.cape = cape;
    add(body, new THREE.BoxGeometry(0.78, 0.22, 0.28), h.accent, { pos: [0, 1.22, 0.08] });
    add(body, new THREE.BoxGeometry(0.42, 0.55, 0.08), 0xc9a227, {
      pos: [-0.5, 0.95, 0.16],
      extra: { metalness: 0.45 },
    });
  }
  if (heroId === 'trick') {
    add(body, new THREE.TorusGeometry(0.09, 0.02, 6, 12), 0x1c2833, {
      pos: [-0.11, 1.64, 0.22],
      rot: [1.2, 0, 0],
      extra: { metalness: 0.6 },
    });
    add(body, new THREE.TorusGeometry(0.09, 0.02, 6, 12), 0x1c2833, {
      pos: [0.11, 1.64, 0.22],
      rot: [1.2, 0, 0],
      extra: { metalness: 0.6 },
    });
    add(body, new THREE.BoxGeometry(0.34, 0.04, 0.06), 0x1c2833, { pos: [0, 1.7, 0.2], extra: { metalness: 0.5 } });
    add(body, new THREE.BoxGeometry(0.55, 0.14, 0.3), h.accent, { pos: [0, 0.7, 0.04] });
  }
  if (heroId === 'dunk') {
    add(body, new THREE.CylinderGeometry(0.34, 0.36, 0.18, 12), 0xf4d03f, { pos: [0, 1.92, 0] });
    add(body, new THREE.BoxGeometry(0.28, 0.1, 0.32), 0xf4d03f, { pos: [0, 1.9, 0.22] });
  }
  if (heroId === 'king') {
    add(body, new THREE.TorusGeometry(0.22, 0.045, 6, 14), h.accent, {
      pos: [0, 1.92, 0],
      rot: [Math.PI / 2, 0, 0],
      extra: { metalness: 0.75 },
    });
    for (const x of [-0.16, 0, 0.16]) {
      add(body, new THREE.ConeGeometry(0.05, 0.16, 6), h.accent, {
        pos: [x, 2.08, 0],
        extra: { metalness: 0.75 },
      });
    }
    add(body, new THREE.SphereGeometry(0.045, 8, 6), 0xc0392b, { pos: [0, 1.96, 0.16], shadow: false });
    add(body, new THREE.BoxGeometry(0.9, 0.28, 0.42), 0xf7f1e3, { pos: [0, 1.22, 0] });
  }
  if (heroId === 'jones') {
    add(body, new THREE.ConeGeometry(0.4, 0.5, 8), h.tunic, { pos: [0, 1.82, -0.04], rot: [0.2, 0, 0] });
    add(body, new THREE.BoxGeometry(0.5, 0.28, 0.08), h.accent, { pos: [0, 1.42, 0.22] });
  }

  addWeapon(root, h.weapon, h.accent);

  const barrier = add(root, new THREE.SphereGeometry(h.barrierRadius, 16, 12), h.accent, {
    pos: [0, 1.0, 0],
    extra: { transparent: true, opacity: 0.22, emissive: h.accent, emissiveIntensity: 0.4, roughness: 0.15 },
    shadow: false,
  });
  barrier.visible = false;
  root.userData.barrier = barrier;
  return root;
}

function loadJuniorGltf() {
  if (!juniorGltfPromise) {
    juniorGltfPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(JUNIOR_GLB, resolve, undefined, reject);
    });
  }
  return juniorGltfPromise;
}

function playJunior(mesh, name) {
  const actions = mesh.userData.actions;
  const next = actions?.[name];
  if (!next || mesh.userData.clip === name) return;
  const prev = actions[mesh.userData.clip];
  if (JUNIOR_ONCE.has(name)) {
    next.setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = true;
  } else {
    next.setLoop(THREE.LoopRepeat, Infinity);
  }
  next.reset().fadeIn(0.1).play();
  if (prev && prev !== next) prev.fadeOut(0.1);
  mesh.userData.clip = name;
}

async function buildJuniorMesh() {
  const gltf = await loadJuniorGltf();
  const model = SkeletonUtils.clone(gltf.scene);
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.frustumCulled = false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (mat) mat.side = THREE.DoubleSide;
    }
  });
  model.scale.setScalar(JUNIOR_HEIGHT / 2.88);

  const root = new THREE.Group();
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  root.userData.mixer = mixer;
  root.userData.actions = actions;
  root.userData.junior = true;
  root.userData.clip = '';
  playJunior(root, 'Idle');

  const barrier = add(root, new THREE.SphereGeometry(HEROES.junior.barrierRadius, 16, 12), HEROES.junior.accent, {
    pos: [0, 0.95, 0],
    extra: { transparent: true, opacity: 0.22, emissive: HEROES.junior.accent, emissiveIntensity: 0.4, roughness: 0.15 },
    shadow: false,
  });
  barrier.visible = false;
  root.userData.barrier = barrier;
  return root;
}

function slimeBody(root, color, radius, y, scaleY = 0.82) {
  return add(root, new THREE.SphereGeometry(radius, 16, 12), color, {
    pos: [0, y, 0],
    scale: [1, scaleY, 0.92],
    extra: { roughness: 0.18, emissive: color, emissiveIntensity: 0.28 },
  });
}

function slimeMouth(root, y, z, w) {
  add(root, new THREE.SphereGeometry(w, 10, 8), 0x0d2a14, {
    pos: [0, y, z],
    scale: [1.15, 0.72, 0.55],
    shadow: false,
  });
  add(root, new THREE.SphereGeometry(w * 0.45, 8, 6), 0xc0392b, {
    pos: [0, y - w * 0.05, z + w * 0.15],
    shadow: false,
  });
}

function buildSlime(color, scale = 1) {
  const root = new THREE.Group();
  slimeBody(root, color, 0.78 * scale, 0.62 * scale, 0.8);
  slimeMouth(root, 0.5 * scale, 0.78 * scale, 0.24 * scale);
  addEyes(root, {
    y: 0.92 * scale,
    z: 0.78 * scale,
    gap: 0.26 * scale,
    size: 0.13 * scale,
    iris: 0xf4d03f,
  });
  return root;
}

function buildBat() {
  const root = new THREE.Group();
  const green = 0x1e8449;
  slimeBody(root, green, 0.32, 0, 0.85);
  slimeMouth(root, -0.04, 0.32, 0.11);
  addEyes(root, { y: 0.12, z: 0.34, gap: 0.13, size: 0.08, iris: 0xf7f3ea });
  add(root, new THREE.ConeGeometry(0.07, 0.22, 5), green, { pos: [-0.1, 0.32, 0], rot: [0.2, 0, 0.4] });
  add(root, new THREE.ConeGeometry(0.07, 0.22, 5), green, { pos: [0.1, 0.32, 0], rot: [0.2, 0, -0.4] });
  const wingL = add(root, new THREE.BoxGeometry(1.15, 0.06, 0.62), 0x145a32, {
    pos: [-0.7, 0.05, -0.05],
    rot: [0.2, 0.3, 0.35],
    extra: { roughness: 0.35, emissive: 0x0e3d22, emissiveIntensity: 0.2 },
  });
  const wingR = add(root, new THREE.BoxGeometry(1.15, 0.06, 0.62), 0x145a32, {
    pos: [0.7, 0.05, -0.05],
    rot: [0.2, -0.3, -0.35],
    extra: { roughness: 0.35, emissive: 0x0e3d22, emissiveIntensity: 0.2 },
  });
  root.userData.wingL = wingL;
  root.userData.wingR = wingR;
  return root;
}

function buildKnight() {
  const root = new THREE.Group();
  const green = 0x27ae60;
  slimeBody(root, green, 0.55, 0.7, 0.9);
  addEyes(root, { y: 1.02, z: 0.58, gap: 0.18, size: 0.09, iris: 0xf4d03f });
  slimeMouth(root, 0.62, 0.58, 0.16);
  add(root, new THREE.BoxGeometry(0.7, 0.28, 0.62), 0xb0b6c0, {
    pos: [0, 1.22, 0],
    extra: { metalness: 0.55, roughness: 0.35 },
  });
  add(root, new THREE.BoxGeometry(0.72, 0.55, 0.5), 0x7f8c8d, {
    pos: [0, 0.72, 0.02],
    extra: { metalness: 0.4 },
  });
  add(root, new THREE.BoxGeometry(0.5, 0.7, 0.08), 0x1e8449, { pos: [-0.48, 0.75, 0.16] });
  add(root, new THREE.BoxGeometry(0.08, 0.08, 0.85), 0xd5d8dc, {
    pos: [0.46, 0.8, 0.32],
    extra: { metalness: 0.6 },
  });
  return root;
}

function buildPierre() {
  const root = new THREE.Group();
  const green = 0x1e8449;
  slimeBody(root, green, 1.55, 1.35, 0.86);
  slimeMouth(root, 1.15, 1.45, 0.48);
  addEyes(root, { y: 1.95, z: 1.42, gap: 0.48, size: 0.22, iris: 0xf7e38a });
  add(root, new THREE.TorusGeometry(0.7, 0.1, 6, 16), 0xd4af37, {
    pos: [0, 2.55, 0],
    rot: [Math.PI / 2, 0, 0],
    extra: { metalness: 0.8 },
  });
  for (const x of [-0.45, -0.2, 0.2, 0.45]) {
    add(root, new THREE.ConeGeometry(0.1, 0.32, 6), 0xd4af37, {
      pos: [x, 2.85, 0],
      extra: { metalness: 0.8 },
    });
  }
  add(root, new THREE.ConeGeometry(0.12, 0.4, 6), 0xd4af37, {
    pos: [0, 2.95, 0],
    extra: { metalness: 0.8 },
  });
  add(root, new THREE.SphereGeometry(0.1, 8, 6), 0xc0392b, { pos: [0, 2.62, 0.55], shadow: false });
  add(root, new THREE.CylinderGeometry(0.06, 0.07, 1.5, 8), 0xd4af37, {
    pos: [1.15, 1.5, 0.4],
    rot: [0.4, 0, 0.5],
    extra: { metalness: 0.7 },
  });
  add(root, new THREE.SphereGeometry(0.22, 10, 8), 0x27ae60, {
    pos: [1.45, 2.15, 0.7],
    extra: { emissive: 0x145a32, emissiveIntensity: 0.45 },
  });
  const fist = add(root, new THREE.SphereGeometry(0.55, 10, 8), 0x27ae60, {
    pos: [-1.5, 1.05, 0.9],
    extra: { roughness: 0.25, emissive: 0x1e8449, emissiveIntensity: 0.2 },
  });
  fist.visible = false;
  root.userData.fist = fist;
  return root;
}

function buildPatricia() {
  const root = new THREE.Group();
  add(root, new THREE.CylinderGeometry(0.32, 0.48, 1.15, 12), 0xf3d2c6, { pos: [0, 0.75, 0] });
  add(root, new THREE.SphereGeometry(0.28, 12, 10), SKIN, { pos: [0, 1.52, 0.02] });
  add(root, new THREE.SphereGeometry(0.3, 10, 8), 0x6d4c41, {
    pos: [0, 1.7, -0.08],
    scale: [1.05, 0.7, 0.9],
  });
  add(root, new THREE.BoxGeometry(0.16, 0.55, 0.16), 0x6d4c41, { pos: [-0.22, 1.35, 0.02] });
  add(root, new THREE.BoxGeometry(0.16, 0.55, 0.16), 0x6d4c41, { pos: [0.22, 1.35, 0.02] });
  addEyes(root, { y: 1.56, z: 0.32, gap: 0.1, size: 0.06, iris: 0x6b4423 });
  add(root, new THREE.SphereGeometry(0.07, 8, 6), 0xd4af37, {
    pos: [0, 1.12, 0.32],
    extra: { metalness: 0.7, emissive: 0xd4af37, emissiveIntensity: 0.45 },
  });
  return root;
}

function buildKey() {
  const g = new THREE.Group();
  add(g, new THREE.TorusGeometry(0.22, 0.06, 8, 14), 0xd4af37, {
    extra: { metalness: 0.75, emissive: 0xd4af37, emissiveIntensity: 0.45 },
    shadow: false,
  });
  add(g, new THREE.BoxGeometry(0.08, 0.08, 0.55), 0xd4af37, {
    pos: [0.38, 0, 0],
    extra: { metalness: 0.65, emissive: 0xd4af37, emissiveIntensity: 0.3 },
    shadow: false,
  });
  g.visible = false;
  return g;
}

function buildCage(open = false) {
  const root = new THREE.Group();
  const bars = [];
  const iron = 0x8a7a4a;
  add(root, new THREE.BoxGeometry(2.6, 0.12, 2.6), iron, { pos: [0, 0.06, 0], extra: { metalness: 0.5 } });
  add(root, new THREE.BoxGeometry(2.6, 0.12, 2.6), iron, { pos: [0, 2.35, 0], extra: { metalness: 0.5 } });
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const bar = add(root, new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6), iron, {
      pos: [Math.cos(a) * 1.15, 1.2, Math.sin(a) * 1.15],
      extra: { metalness: 0.55 },
    });
    bars.push(bar);
    if (open) bar.position.y = 3.4;
  }
  root.userData.bars = bars;
  return root;
}

function wall(parent, w, h, d, x, y, z) {
  return add(parent, new THREE.BoxGeometry(w, h, d), 0x4a5160, { pos: [x, y, z] });
}

function torch(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.7, 6), 0x5d4037, { pos: [0, 0.2, 0] });
  const flame = add(g, new THREE.SphereGeometry(0.14, 8, 6), 0xff9f43, {
    pos: [0, 0.62, 0],
    extra: { emissive: 0xff9f43, emissiveIntensity: 1.2 },
    shadow: false,
  });
  const light = new THREE.PointLight(0xff9f43, 4.2, 16, 2);
  light.position.set(0, 0.7, 0);
  light.castShadow = false;
  g.add(light);
  g.userData.flame = flame;
  g.userData.light = light;
  parent.add(g);
  return g;
}

function stars(scene) {
  const geo = new THREE.BufferGeometry();
  const n = 180;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * 90;
    pos[i * 3 + 1] = 16 + Math.random() * 28;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf7e7c0, size: 0.12 })));
}

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(NIGHT);
    this.scene.fog = new THREE.Fog(0x152038, 38, 90);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 140);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambient = new THREE.AmbientLight(0x6b7c99, 1.05);
    const fill = new THREE.HemisphereLight(0x9bb6d4, 0x2a1810, 0.7);
    const moon = new THREE.DirectionalLight(0xe8f0ff, 1.35);
    moon.position.set(-8, 22, -10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.near = 2;
    moon.shadow.camera.far = 60;
    moon.shadow.camera.left = -24;
    moon.shadow.camera.right = 24;
    moon.shadow.camera.top = 24;
    moon.shadow.camera.bottom = -24;
    this.scene.add(ambient, fill, moon);

    this.room = new THREE.Group();
    this.actorsRoot = new THREE.Group();
    this.hazardsRoot = new THREE.Group();
    this.scene.add(this.room, this.actorsRoot, this.hazardsRoot);
    stars(this.scene);

    this.torches = [];
    this.gateLeft = null;
    this.gateRight = null;
    this.cage = null;
    this.bounds = { minX: -13, maxX: 13, minZ: -17, maxZ: 18 };
    this.gateZ = 17.2;
    this.gateOpen = false;
    this.camPos = new THREE.Vector3(0, 10.2, -25);
    this.look = new THREE.Vector3();
    this.mixers = [];
    this.generation = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  clearGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
      });
    }
  }

  setRoom(kind, exit = 'north') {
    this.clearGroup(this.room);
    this.torches = [];
    this.gateOpen = false;
    this.keyMesh = null;
    this.cage = null;
    this.gateLeft = null;
    this.gateRight = null;
    this.exit = exit;
    this.door = null;
    this.spawnPoint = { x: 0, z: -4 };
    if (kind === 'chamber') this.buildChamber(exit);
    else if (kind === 'courtyard') this.buildCourtyard();
    else this.buildThrone();
  }

  floorY(x, z) {
    if (this.exit === 'up') {
      if (z <= 0) return 0;
      if (z >= 4.6) return 2.5;
      return (z / 4.6) * 2.5;
    }
    if (this.exit === 'down') {
      if (z <= 0) return 2.5;
      if (z >= 4.6) return 0;
      return 2.5 * (1 - z / 4.6);
    }
    return 0;
  }

  buildChamber(exit = 'north') {
    this.exit = exit;
    this.bounds = { minX: -7.2, maxX: 7.2, minZ: -8.2, maxZ: 7.4 };
    this.gateZ = 6.4;
    const floor = add(this.room, new THREE.PlaneGeometry(18, 20), std(0x6a7384), {
      pos: [0, -0.02, -1],
      rot: [-Math.PI / 2, 0, 0],
      shadow: false,
    });
    floor.material.map = stoneTexture();
    floor.material.needsUpdate = true;
    floor.receiveShadow = true;
    const lift = (floor) => floor + 2.75;
    const spawnFloor = exit === 'down' ? 2.5 : 0;
    const doorFloor = exit === 'up' ? 2.5 : 0;
    const sideFloor = exit === 'up' || exit === 'down' ? 1.25 : 0;
    const doorNorth = exit === 'north' || exit === 'up' || exit === 'down';
    wall(this.room, 16, 5.5, 1, 0, lift(spawnFloor), -8.4);
    if (doorNorth) {
      wall(this.room, 5.4, 5.5, 1, -5.1, lift(doorFloor), 7.4);
      wall(this.room, 5.4, 5.5, 1, 5.1, lift(doorFloor), 7.4);
    } else {
      wall(this.room, 16, 5.5, 1, 0, lift(0), 7.6);
    }
    if (exit === 'east') {
      wall(this.room, 1.1, 5.5, 5.2, -7.5, lift(sideFloor), -4.6);
      wall(this.room, 1.1, 5.5, 5.2, -7.5, lift(sideFloor), 4.6);
    } else {
      wall(this.room, 1.1, 5.5, 18, -7.7, lift(sideFloor), -0.6);
    }
    if (exit === 'west') {
      wall(this.room, 1.1, 5.5, 5.2, 7.5, lift(sideFloor), -4.6);
      wall(this.room, 1.1, 5.5, 5.2, 7.5, lift(sideFloor), 4.6);
    } else {
      wall(this.room, 1.1, 5.5, 18, 7.7, lift(sideFloor), -0.6);
    }
    if (exit === 'down') {
      add(this.room, new THREE.BoxGeometry(14.2, 2.5, 8.6), 0x5c6574, { pos: [0, 1.25, -4.2] });
    }
    if (exit === 'up') {
      add(this.room, new THREE.BoxGeometry(14.2, 2.5, 3.2), 0x5c6574, { pos: [0, 1.25, 5.8] });
    }

    const door = {
      north: { x: 0, z: 6.3, axis: 'z', sign: 1 },
      east: { x: -6.3, z: 0, axis: 'x', sign: -1 },
      west: { x: 6.3, z: 0, axis: 'x', sign: 1 },
      up: { x: 0, z: 5.5, axis: 'z', sign: 1 },
      down: { x: 0, z: 5.5, axis: 'z', sign: 1 },
    }[exit] || { x: 0, z: 6.3, axis: 'z', sign: 1 };
    this.door = door;
    this.spawnPoint = exit === 'east' ? { x: 3.2, z: -1 } : exit === 'west' ? { x: -3.2, z: -1 } : { x: 0, z: -4.2 };

    if (exit === 'up' || exit === 'down') {
      for (let i = 0; i < 6; i += 1) {
        const z = 0.4 + i * 0.75;
        const h = exit === 'up' ? 0.28 + i * 0.38 : 2.5 - i * 0.38;
        add(this.room, new THREE.BoxGeometry(3.2, Math.max(0.25, h), 0.72), 0x8d6a45, {
          pos: [0, Math.max(0.12, h) / 2, z],
        });
      }
    }

    const doorY = this.floorY(door.x, door.z) + 2.05;
    const alongX = door.axis === 'z';
    const leaf = alongX ? [2.2, 3.6, 0.4] : [0.4, 3.6, 2.2];
    const gap = 1.15;
    const leftPos = alongX ? [door.x - gap, doorY, door.z] : [door.x, doorY, door.z - gap];
    const rightPos = alongX ? [door.x + gap, doorY, door.z] : [door.x, doorY, door.z + gap];
    this.gateLeft = add(this.room, new THREE.BoxGeometry(...leaf), 0x3e2a1a, { pos: leftPos });
    this.gateRight = add(this.room, new THREE.BoxGeometry(...leaf), 0x3e2a1a, { pos: rightPos });
    const slide = 2.6;
    this.gateLeft.userData.openX = alongX ? door.x - gap - slide : door.x;
    this.gateLeft.userData.openZ = alongX ? door.z : door.z - gap - slide;
    this.gateRight.userData.openX = alongX ? door.x + gap + slide : door.x;
    this.gateRight.userData.openZ = alongX ? door.z : door.z + gap + slide;

    const keyZ = door.z - (door.axis === 'z' ? 1.3 * door.sign : 0);
    const keyX = door.x - (door.axis === 'x' ? 1.3 * door.sign : 0);
    this.keyMesh = buildKey();
    this.keyMesh.position.set(keyX, this.floorY(keyX, keyZ) + 1.35, keyZ);
    this.room.add(this.keyMesh);
    this.torches.push(
      torch(this.room, -6.2, 2.2 + this.floorY(-6.2, -5), -5),
      torch(this.room, 6.2, 2.2 + this.floorY(6.2, -5), -5),
      torch(this.room, -6.2, 2.2 + this.floorY(-6.2, 2), 2),
      torch(this.room, 6.2, 2.2 + this.floorY(6.2, 2), 2),
    );
  }

  showKey(on) {
    if (this.keyMesh) this.keyMesh.visible = on;
  }

  buildCourtyard() {
    this.bounds = { minX: -13.5, maxX: 13.5, minZ: -18, maxZ: 20 };
    this.gateZ = 17.4;
    const floor = add(this.room, new THREE.PlaneGeometry(40, 72), std(0x6a7384), {
      pos: [0, 0, -4],
      rot: [-Math.PI / 2, 0, 0],
      extra: {},
      shadow: false,
    });
    floor.material.map = stoneTexture();
    floor.material.needsUpdate = true;
    floor.receiveShadow = true;

    wall(this.room, 40, 5.5, 1.2, 0, 2.6, -38);
    wall(this.room, 1.4, 5.5, 62, -16.5, 2.6, -6);
    wall(this.room, 1.4, 5.5, 62, 16.5, 2.6, -6);
    wall(this.room, 14, 5.5, 1.4, -10, 2.6, 20.4);
    wall(this.room, 14, 5.5, 1.4, 10, 2.6, 20.4);
    for (let i = -15; i <= 15; i += 3) {
      add(this.room, new THREE.BoxGeometry(1.1, 1.1, 1.1), 0x555d6c, { pos: [i, 5.7, -37.6] });
    }

    this.gateLeft = add(this.room, new THREE.BoxGeometry(4.2, 4.6, 0.5), 0x3e2a1a, { pos: [-2.1, 2.3, 17.6] });
    this.gateRight = add(this.room, new THREE.BoxGeometry(4.2, 4.6, 0.5), 0x3e2a1a, { pos: [2.1, 2.3, 17.6] });

    this.cage = buildCage(false);
    this.cage.position.set(0, 0, 14.2);
    this.room.add(this.cage);

    this.torches.push(
      torch(this.room, -12.8, 2.4, -8),
      torch(this.room, 12.8, 2.4, -8),
      torch(this.room, -12.8, 2.4, 8),
      torch(this.room, 12.8, 2.4, 8),
      torch(this.room, -6, 2.4, 19.2),
      torch(this.room, 6, 2.4, 19.2),
    );
  }

  buildThrone() {
    this.bounds = { minX: -10, maxX: 10, minZ: -12, maxZ: 15 };
    this.gateZ = 99;
    const floor = add(this.room, new THREE.PlaneGeometry(26, 32), std(0x5c6576), {
      pos: [0, 0, 1],
      rot: [-Math.PI / 2, 0, 0],
      shadow: false,
    });
    floor.material.map = stoneTexture();
    floor.material.needsUpdate = true;
    add(this.room, new THREE.PlaneGeometry(3.2, 28), 0x6b2c2c, {
      pos: [0, 0.02, 1],
      rot: [-Math.PI / 2, 0, 0],
      shadow: false,
    });
    wall(this.room, 26, 7, 1.4, 0, 3.4, -14.5);
    wall(this.room, 1.4, 7, 32, -12.2, 3.4, 1);
    wall(this.room, 1.4, 7, 32, 12.2, 3.4, 1);
    wall(this.room, 26, 7, 1.4, 0, 3.4, 16.2);
    add(this.room, new THREE.BoxGeometry(4.5, 2.2, 2.2), 0x4a5160, { pos: [0, 1.1, 12.4] });
    this.cage = buildCage(false);
    this.cage.position.set(0, 0, 12.6);
    this.room.add(this.cage);
    this.gateLeft = null;
    this.gateRight = null;
    this.torches.push(
      torch(this.room, -9.4, 3.2, -6),
      torch(this.room, 9.4, 3.2, -6),
      torch(this.room, -9.4, 3.2, 8),
      torch(this.room, 9.4, 3.2, 8),
    );
  }

  setGateOpen(open) {
    this.gateOpen = open;
  }

  openCage() {
    if (!this.cage) return;
    for (const bar of this.cage.userData.bars) bar.userData.open = true;
  }

  async attach(actor) {
    const generation = this.generation;
    let mesh;
    if (actor.modelId) mesh = await loadMonster(actor.modelId);
    else if (actor.role === 'hero' && actor.id === 'junior') mesh = await buildJuniorMesh();
    else if (actor.role === 'hero') mesh = buildHeroMesh(actor.id);
    else if (actor.role === 'patricia') mesh = buildPatricia();
    else mesh = buildSlime(actor.stats?.color || '#888');
    if (generation !== this.generation) return false;
    actor.mesh = mesh;
    if (mesh.userData.mixer) this.mixers.push(mesh.userData.mixer);
    this.actorsRoot.add(mesh);
    this.syncActor(actor, 0);
    return true;
  }

  detachAll() {
    for (const mixer of this.mixers) mixer.stopAllAction();
    this.mixers = [];
    this.clearGroup(this.actorsRoot);
    this.clearGroup(this.hazardsRoot);
  }

  spawnHazardMesh(kind, extra) {
    const g = new THREE.Group();
    if (kind === 'wave') {
      add(g, new THREE.BoxGeometry(14, 0.9, 1.6), 0x27ae60, {
        extra: { transparent: true, opacity: 0.72, emissive: 0x1e8449, emissiveIntensity: 0.5 },
        shadow: false,
      });
    } else if (kind === 'rain') {
      add(g, new THREE.SphereGeometry(0.38, 8, 6), 0x2ecc71, {
        extra: { emissive: 0x1e8449, emissiveIntensity: 0.4 },
      });
      const shadow = add(g, new THREE.CircleGeometry(0.7, 10), 0x0b1020, {
        pos: [0, 0.03, 0],
        rot: [-Math.PI / 2, 0, 0],
        extra: { transparent: true, opacity: 0.45 },
        shadow: false,
      });
      g.userData.shadow = shadow;
    } else if (kind === 'fist') {
      add(g, new THREE.SphereGeometry(0.62, 10, 8), 0x27ae60, {
        extra: { emissive: 0x145a32, emissiveIntensity: 0.35 },
      });
    }
    if (extra) Object.assign(g.userData, extra);
    this.hazardsRoot.add(g);
    return g;
  }

  clamp(actor) {
    const r = actor.radius;
    const b = this.bounds;
    actor.x = Math.min(b.maxX - r, Math.max(b.minX + r, actor.x));
    actor.z = Math.min(b.maxZ - r, Math.max(b.minZ + r, actor.z));
    const door = this.door;
    if (!door || this.gateOpen) return;
    if (door.axis === 'z' && door.sign > 0) actor.z = Math.min(actor.z, door.z - r - 0.15);
    if (door.axis === 'x' && door.sign > 0) actor.x = Math.min(actor.x, door.x - r - 0.15);
    if (door.axis === 'x' && door.sign < 0) actor.x = Math.max(actor.x, door.x + r + 0.15);
  }

  syncActor(actor, time) {
    if (!actor.mesh) return;
    if (actor.role !== 'patricia') actor.y = this.floorY(actor.x, actor.z);
    actor.mesh.position.set(actor.x, actor.y, actor.z);
    actor.mesh.rotation.y = Math.atan2(actor.facingX, actor.facingZ);
    if (actor.id === 'junior') actor.mesh.rotation.y += Math.PI;
    const ud = actor.mesh.userData;
    if (ud.barrier) {
      const up = actor.state === 'barrier' || actor.state === 'barrierDash';
      ud.barrier.visible = up;
      if (up) {
        const fresh = actor.barrierAge <= 0.35;
        ud.barrier.material.opacity = fresh ? 0.4 : 0.22;
        ud.barrier.material.emissiveIntensity = fresh ? 0.9 : 0.35;
      }
    }
    if (ud.rightArm) {
      if (actor.state === 'attack') {
        const t = actor.attackAge / Math.max(1, actor.stats.timings.recovery);
        ud.rightArm.rotation.x = -Math.sin(t * Math.PI) * 1.6;
      } else {
        ud.rightArm.rotation.x *= 0.8;
      }
    }
    if (ud.cape) ud.cape.rotation.x = 0.25 + Math.sin(time * 3) * 0.05;
    if (ud.wingL) {
      const flap = Math.sin(time * 10) * 0.45;
      ud.wingL.rotation.z = flap;
      ud.wingR.rotation.z = -flap;
    }
    if (ud.junior) {
      const moved = Math.hypot(actor.x - (ud.px ?? actor.x), actor.z - (ud.pz ?? actor.z)) > 0.02;
      ud.px = actor.x;
      ud.pz = actor.z;
      let clip = 'Idle';
      if (actor.state === 'attack') clip = 'SwordSlash';
      else if (actor.state === 'dash' || actor.state === 'barrierDash') clip = 'Dash';
      else if (actor.state === 'barrier' && !moved) clip = 'Barrier';
      else if (moved) clip = 'Walk';
      playJunior(actor.mesh, clip);
    } else if (ud.mixer) {
      const mode = actor.brain?.mode;
      const clip = actor.state === 'dead' || actor.state === 'hitstun'
        ? 'idle'
        : mode === 'chase'
          ? 'walk'
          : mode === 'strike' || mode === 'telegraph'
            ? 'attack'
            : 'idle';
      playMonster(actor.mesh, clip);
    }
    if (actor.state === 'dead') {
      if (ud.junior) actor.mesh.rotation.x = 0.9;
      else if (ud.mixer) actor.mesh.rotation.x = 1.15;
      else {
        actor.mesh.rotation.x = 1.2;
        actor.mesh.position.y = 0.15;
      }
    }
    if (!ud.mixer && (actor.role === 'slime' || actor.role === 'pierre')) {
      const wobble = actor.state === 'dead' ? 0.2 : 1 + Math.sin(time * 4 + actor.x) * 0.04;
      actor.mesh.scale.y = wobble;
    }
  }

  cameraTarget(actor) {
    const back = 7.6;
    const height = 8.2;
    const b = this.bounds || { minZ: -8.2, maxZ: 7.4 };
    const minZ = b.minZ + 1.2;
    const maxZ = b.maxZ - 1.2;
    let dz = back;
    if (actor.z - dz < minZ) dz = Math.max(2.4, actor.z - minZ);
    if (actor.z - dz > maxZ) dz = Math.min(-2.4, actor.z - maxZ);
    const span = back - 3.2;
    const t = THREE.MathUtils.clamp((Math.abs(dz) - 3.2) / span, 0, 1);
    const y = THREE.MathUtils.lerp(1.7, height, t) + actor.y;
    const pos = new THREE.Vector3(actor.x, y, actor.z - dz);
    const look = new THREE.Vector3(
      actor.x,
      THREE.MathUtils.lerp(1.05, 1.15, t) + actor.y,
      actor.z + THREE.MathUtils.lerp(0.15, 1.4, t),
    );
    return { pos, look };
  }

  snap(actor) {
    const { pos, look } = this.cameraTarget(actor);
    this.camPos.copy(pos);
    this.camera.position.copy(this.camPos);
    this.look.copy(look);
    this.camera.lookAt(this.look);
  }

  follow(actor, dt) {
    const { pos, look } = this.cameraTarget(actor);
    this.camPos.lerp(pos, 1 - Math.exp(-4.2 * dt));
    this.camera.position.copy(this.camPos);
    this.look.lerp(look, 1 - Math.exp(-4.2 * dt));
    this.camera.lookAt(this.look);
  }

  update(dt, time) {
    for (const mixer of this.mixers) mixer.update(dt);
    for (const t of this.torches) {
      const flicker = 3.6 + Math.sin(time * 9 + t.position.x) * 0.55;
      t.userData.light.intensity = flicker;
      t.userData.flame.scale.setScalar(0.9 + Math.sin(time * 12 + t.position.z) * 0.12);
    }
    if (this.gateLeft && this.gateOpen) {
      const k = 1 - Math.exp(-3 * dt);
      for (const gate of [this.gateLeft, this.gateRight]) {
        if (gate.userData.openX === undefined) continue;
        gate.position.x = THREE.MathUtils.lerp(gate.position.x, gate.userData.openX, k);
        gate.position.z = THREE.MathUtils.lerp(gate.position.z, gate.userData.openZ, k);
      }
    }
    if (this.keyMesh && this.keyMesh.visible) {
      this.keyMesh.rotation.y += dt * 1.6;
      const base = this.floorY(this.keyMesh.position.x, this.keyMesh.position.z);
      this.keyMesh.position.y = base + 1.35 + Math.sin(time * 3) * 0.12;
    }
    if (this.cage) {
      for (const bar of this.cage.userData.bars) {
        if (bar.userData.open) {
          bar.position.y = THREE.MathUtils.lerp(bar.position.y, 3.6, 1 - Math.exp(-3 * dt));
        }
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
