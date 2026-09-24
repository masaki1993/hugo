import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = 'https://threejs-games.github.io/assets/models/';

const MODELS = {
  demon: {
    file: 'character/demon/model.fbx',
    height: 2.3,
    anims: {
      idle: 'character/demon/Mutant Breathing Idle.fbx',
      walk: 'character/demon/Mutant Walking.fbx',
      attack: 'character/demon/Zombie Attack.fbx',
    },
  },
  goblin: {
    file: 'character/goblin/model.fbx',
    height: 1.45,
    anims: {
      idle: 'character/goblin/Great Sword Idle.fbx',
      walk: 'character/goblin/Great Sword Walk.fbx',
      attack: 'character/goblin/Great Sword Slash.fbx',
    },
  },
  golem: {
    file: 'character/golem/model.fbx',
    height: 2.4,
    anims: {
      idle: 'character/golem/Unarmed Idle.fbx',
      walk: 'character/golem/Mutant Walking.fbx',
      attack: 'character/golem/Mutant Swiping.fbx',
    },
  },
  orc: {
    file: 'character/orc/model.fbx',
    height: 1.9,
    anims: {
      idle: 'character/orc/Unarmed Idle.fbx',
      walk: 'character/orc/Orc Walk.fbx',
      attack: 'character/orc/Zombie Attack.fbx',
    },
  },
  'orc-ogre': {
    file: 'character/orc-ogre/model.fbx',
    height: 2.65,
    anims: {
      idle: 'character/orc-ogre/Unarmed Idle.fbx',
      walk: 'character/orc-ogre/Mutant Walking.fbx',
      attack: 'character/orc-ogre/Mutant Swiping.fbx',
    },
  },
  sorceress: {
    file: 'character/sorceress/model.fbx',
    height: 1.7,
    anims: {
      idle: 'character/sorceress/Standing Idle.fbx',
      walk: 'character/sorceress/Standing Walk Forward.fbx',
      attack: 'character/sorceress/Standing 1H Magic Attack 01.fbx',
    },
  },
  troll: {
    file: 'character/troll/model.fbx',
    height: 2.5,
    anims: {
      idle: 'character/troll/Unarmed Idle.fbx',
      walk: 'character/troll/Mutant Walking.fbx',
      attack: 'character/troll/Zombie Attack.fbx',
    },
  },
  witch: {
    file: 'character/witch/model.fbx',
    height: 1.65,
    anims: {
      idle: 'character/witch/Crouch Idle.fbx',
      walk: 'character/witch/Crouched Walking.fbx',
      attack: 'character/witch/Spell Casting.fbx',
    },
  },
  'zombie-barefoot': {
    file: 'character/zombie/zombie-barefoot.fbx',
    height: 1.75,
    anims: {
      idle: 'character/zombie/Zombie Scratch Idle.fbx',
      walk: 'character/zombie/Zombie Walk.fbx',
      attack: 'character/zombie/Zombie Punching.fbx',
    },
  },
  'zombie-cop': {
    file: 'character/zombie/zombie-cop.fbx',
    height: 1.75,
    anims: {
      idle: 'character/zombie/Zombie Idle.fbx',
      walk: 'character/zombie/Zombie Walk.fbx',
      attack: 'character/zombie/Zombie Neck Bite.fbx',
    },
  },
  'zombie-doctor': {
    file: 'character/zombie/zombie-doctor.fbx',
    height: 1.75,
    anims: {
      idle: 'character/zombie/Thriller Idle.fbx',
      walk: 'character/zombie/Walking.fbx',
      attack: 'character/zombie/Zombie Attack.fbx',
    },
  },
  'zombie-doctor-crawl': {
    file: 'character/zombie/zombie-doctor.fbx',
    height: 1.55,
    anims: {
      idle: 'character/zombie/Sleeping Idle.fbx',
      walk: 'character/zombie/Zombie Crawl.fbx',
      attack: 'character/zombie/Zombie Biting.fbx',
    },
  },
  'zombie-guard': {
    file: 'character/zombie/zombie-guard.fbx',
    height: 1.8,
    anims: {
      idle: 'character/zombie/Zombie Idle.fbx',
      walk: 'character/zombie/Walking.fbx',
      attack: 'character/zombie/Zombie Kicking.fbx',
    },
  },
  skeleton: {
    file: 'character/skeleton/model.fbx',
    height: 1.9,
    anims: {
      idle: 'character/skeleton/Zombie Idle.fbx',
      walk: 'character/skeleton/Walking.fbx',
      attack: 'character/skeleton/Zombie Neck Bite.fbx',
    },
  },
  'goth-girl': {
    file: 'character/zombie/goth-girl.fbx',
    height: 1.75,
    anims: {
      idle: 'character/zombie/Thriller Idle.fbx',
      walk: 'character/zombie/Walking.fbx',
      attack: 'character/zombie/Zombie Attack.fbx',
    },
  },
};

const cache = new Map();
const loader = new FBXLoader();

function assetUrl(path) {
  return BASE + path.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function fitHeight(model, height) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = height / Math.max(0.001, size.y);
  model.scale.multiplyScalar(scale);
  const grounded = new THREE.Box3().setFromObject(model);
  model.position.y -= grounded.min.y;
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.frustumCulled = false;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (mat?.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
}

async function loadClip(path) {
  const model = await loader.loadAsync(assetUrl(path));
  const clip = model.animations[0];
  if (!clip) return null;
  clip.name = path;
  return clip;
}

async function buildTemplate(id) {
  const spec = MODELS[id];
  const [model, idle, walk, attack] = await Promise.all([
    loader.loadAsync(assetUrl(spec.file)),
    loadClip(spec.anims.idle),
    loadClip(spec.anims.walk),
    loadClip(spec.anims.attack),
  ]);
  fitHeight(model, spec.height);
  const root = new THREE.Group();
  root.add(model);
  return {
    root,
    clips: { idle, walk, attack },
  };
}

export async function loadMonster(id) {
  if (!cache.has(id)) cache.set(id, buildTemplate(id));
  const template = await cache.get(id);
  const root = SkeletonUtils.clone(template.root);
  const mixer = new THREE.AnimationMixer(root);
  root.userData.mixer = mixer;
  root.userData.clips = template.clips;
  playMonster(root, 'idle');
  return root;
}

export function playMonster(mesh, name) {
  const mixer = mesh.userData.mixer;
  const clip = mesh.userData.clips?.[name];
  if (!mixer || !clip || mesh.userData.clip === name) return;
  const next = mixer.clipAction(clip);
  next.enabled = true;
  next.setLoop(THREE.LoopRepeat, Infinity);
  next.reset().fadeIn(0.12).play();
  if (mesh.userData.action) mesh.userData.action.fadeOut(0.12);
  mesh.userData.action = next;
  mesh.userData.clip = name;
}
