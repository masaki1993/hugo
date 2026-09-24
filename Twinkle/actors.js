import { ENEMIES, HEROES, PLAYER_MAX_HP } from './characters.js';

export const ACTOR_STATES = Object.freeze([
  'normal',
  'attack',
  'barrier',
  'dash',
  'barrierDash',
  'hitstun',
  'dead',
]);

export const ATTACK_PHASES = Object.freeze(['windup', 'active', 'recovery']);

export class Actor {
  constructor({ id, role, stats, x, z, y = 0, modelId = null }) {
    this.id = id;
    this.role = role;
    this.modelId = modelId;
    this.stats = stats;
    this.x = x;
    this.z = z;
    this.y = y;
    this.facingX = 0;
    this.facingZ = 1;
    this.state = 'normal';
    this.stateAge = 0;
    this.attackPhase = null;
    this.attackAge = 0;
    this.dashAttack = false;
    this.defense = role === 'pierre' ? 'armored' : null;
    this.defenseTimer = 0;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.radius = stats.radius;
    this.stunUntil = 0;
    this.vulnUntil = 0;
    this.vulnMul = 1;
    this.attackBuffUntil = 0;
    this.attackBuffMul = 1;
    this.barrierAge = 0;
    this.barrierLockUntil = 0;
    this.invulnUntil = 0;
    this.hitThisSwing = new Set();
    this.vx = 0;
    this.vz = 0;
    this.dashFacingX = 0;
    this.dashFacingZ = 1;
    this.mesh = null;
    this.brain = {
      mode: 'chase',
      age: 0,
      kind: null,
      dirX: 0,
      dirZ: 1,
      cooldown: 0.4 + Math.random() * 0.5,
      cycle: 0,
    };
    this.seenCage = false;
  }

  setState(next, extra = {}) {
    if (!ACTOR_STATES.includes(next)) {
      throw new Error(`invalid actor state ${next}`);
    }
    this.state = next;
    this.stateAge = 0;
    if (next !== 'attack') {
      this.attackPhase = null;
      this.attackAge = 0;
      this.dashAttack = false;
      this.hitThisSwing = new Set();
    }
    if (next === 'barrier') this.barrierAge = 0;
    Object.assign(this, extra);
  }

  setFacing(x, z) {
    const len = Math.hypot(x, z);
    if (len < 1e-6) return;
    this.facingX = x / len;
    this.facingZ = z / len;
  }

  stunned(now) {
    return now < this.stunUntil;
  }

  canAct(now) {
    return this.state === 'normal' || this.state === 'barrier';
  }

  inArc(tx, tz, range, arc) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range + 0.01) return false;
    if (dist < 0.01) return true;
    const dot = (dx * this.facingX + dz * this.facingZ) / dist;
    return dot >= Math.cos(arc);
  }

  onDashLine(ox, oz, dx, dz, maxDist, lateral) {
    const px = this.x - ox;
    const pz = this.z - oz;
    const t = px * dx + pz * dz;
    if (t < 0.25 || t > maxDist) return null;
    const lat = Math.hypot(px - dx * t, pz - dz * t);
    if (lat > lateral + this.radius) return null;
    return t;
  }

  facingDotTo(tx, tz) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.01) return 1;
    return (dx * this.facingX + dz * this.facingZ) / dist;
  }
}

export function createHero(heroId, x, z) {
  const stats = HEROES[heroId];
  if (!stats) throw new Error(`unknown hero ${heroId}`);
  const actor = new Actor({
    id: heroId,
    role: 'hero',
    stats: { ...stats, hp: PLAYER_MAX_HP },
    x,
    z,
  });
  actor.hp = PLAYER_MAX_HP;
  actor.maxHp = PLAYER_MAX_HP;
  return actor;
}

export function createEnemy(kind, x, z, y) {
  const stats = ENEMIES[kind];
  if (!stats) throw new Error(`unknown enemy ${kind}`);
  return new Actor({
    id: `${kind}-${Math.random().toString(36).slice(2, 7)}`,
    role: stats.behavior || kind,
    modelId: stats.model || null,
    stats,
    x,
    z,
    y: y ?? 0,
  });
}

export function createPatricia(x, z) {
  return new Actor({
    id: 'patricia',
    role: 'patricia',
    stats: { hp: 1, radius: 0.4, speed: 0 },
    x,
    z,
  });
}

export function nearestOnDashLine(hero, enemies) {
  const maxDist = hero.stats.dashDistance + 2.4;
  const lateral = 1.55;
  let best = null;
  let bestT = Infinity;
  for (const enemy of enemies) {
    if (enemy.state === 'dead' || enemy.role === 'patricia') continue;
    const t = enemy.onDashLine(
      hero.x,
      hero.z,
      hero.dashFacingX,
      hero.dashFacingZ,
      maxDist,
      lateral,
    );
    if (t !== null && t < bestT) {
      bestT = t;
      best = enemy;
    }
  }
  return best;
}
