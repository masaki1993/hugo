import * as THREE from 'three';
import {
  COPY,
  ENEMIES,
  EXIT_HINT,
  HERO_ORDER,
  HEROES,
  PLAYER_MAX_HP,
  ROOMS,
  STORY_PAGES,
} from './characters.js';
import { createEnemy, createHero, createPatricia, nearestOnDashLine } from './actors.js';
import { World } from './world.js';

const PHASES = Object.freeze(['story', 'select', 'courtyard', 'throne', 'rescue']);
const HITSTUN = 0.42;
const BARRIER_LOCK = 1.2;
const BROKEN_TIME = 4;
const PERFECT_WINDOW = 0.35;

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyZ', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyK', 'KeyL', 'KeyT', 'Enter',
]);

class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.onKeyDown = (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.held.add(e.code);
      this.pressed.add(e.code);
    };
    this.onKeyUp = (e) => {
      this.held.delete(e.code);
      this.released.add(e.code);
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.held.clear());
  }

  beginFrame() {}

  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  down(code) {
    return this.held.has(code);
  }

  edge(code) {
    return this.pressed.has(code);
  }

  move() {
    let x = 0;
    let z = 0;
    // The camera looks toward +Z, so world +X sits on the left of the screen.
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

export class Game {
  constructor() {
    this.canvas = document.getElementById('view');
    this.world = new World(this.canvas);
    this.input = new Input();
    this.phase = 'story';
    this.page = 0;
    this.heroId = null;
    this.hero = null;
    this.actors = [];
    this.hazards = [];
    this.time = 0;
    this.bannerUntil = 0;
    this.bannerText = '';
    this.promptText = '';
    this.taughtBlock = false;
    this.sawCage = false;
    this.gateAnnounced = false;
    this.continueReady = false;
    this.roomIndex = 0;
    this.loadToken = 0;
    this.hasKey = false;
    this.travelAt = 0;
    this.last = performance.now();

    this.els = {
      story: document.getElementById('story'),
      select: document.getElementById('select'),
      prompt: document.getElementById('prompt'),
      rescue: document.getElementById('rescue'),
      banner: document.getElementById('banner'),
      promptLine: document.getElementById('prompt-line'),
      hearts: document.getElementById('hearts'),
      boss: document.getElementById('boss'),
      hud: document.getElementById('hud'),
      continueBtn: document.getElementById('continue-btn'),
      goal: document.getElementById('goal'),
      key: document.getElementById('key'),
    };

    this.buildStory();
    this.buildSelect();
    this.buildRescue();
    this.els.continueBtn.addEventListener('click', () => this.tryEnterThrone());
    this.world.setRoom('courtyard');
    this.setPhase('story');
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setPhase(next) {
    if (!PHASES.includes(next)) throw new Error(`invalid phase ${next}`);
    this.phase = next;
    this.els.story.classList.toggle('hidden', next !== 'story');
    this.els.select.classList.toggle('hidden', next !== 'select');
    this.els.rescue.classList.toggle('hidden', next !== 'rescue');
    this.els.hud.classList.toggle('hidden', next === 'story' || next === 'select' || next === 'rescue');
    this.els.prompt.classList.toggle('hidden', !(next === 'courtyard' && this.continueReady));
    if (next === 'story') this.renderStory();
    if (next === 'select') this.els.select.classList.remove('hidden');
  }

  buildStory() {
    this.els.story.innerHTML = `
      <article class="pager">
        <p class="kicker">${COPY.title}</p>
        <h1 id="story-title"></h1>
        <div id="story-body"></div>
        <div class="row">
          <button type="button" id="story-back">${COPY.back}</button>
          <button type="button" id="story-next">${COPY.next}</button>
        </div>
      </article>`;
    this.els.story.querySelector('#story-back').addEventListener('click', () => this.turnStory(-1));
    this.els.story.querySelector('#story-next').addEventListener('click', () => this.turnStory(1));
  }

  renderStory() {
    const page = STORY_PAGES[this.page];
    this.els.story.querySelector('#story-title').textContent = page.title;
    this.els.story.querySelector('#story-body').innerHTML = page.body.map((s) => `<p>${s}</p>`).join('');
    const last = this.page === STORY_PAGES.length - 1;
    this.els.story.querySelector('#story-next').textContent = last ? COPY.play : COPY.next;
    this.els.story.querySelector('#story-back').disabled = this.page === 0;
  }

  turnStory(dir) {
    if (dir < 0) {
      this.page = Math.max(0, this.page - 1);
      this.renderStory();
      return;
    }
    if (this.page >= STORY_PAGES.length - 1) {
      this.setPhase('select');
      return;
    }
    this.page += 1;
    this.renderStory();
  }

  buildSelect() {
    const cards = HERO_ORDER.map((id) => {
      const h = HEROES[id];
      return `<article class="hero-card" data-hero="${id}">
        <div class="swatch" style="background:${h.tunic}; box-shadow: 0 0 0 4px ${h.accent}"></div>
        <h2>${h.name}</h2>
        <p>${h.blurb}</p>
        <p class="line">« ${h.line} »</p>
        <button type="button" data-pick="${id}">${COPY.choose}</button>
      </article>`;
    }).join('');
    this.els.select.innerHTML = `
      <div class="select-wrap">
        <h1>${COPY.title}</h1>
        <p class="sub">${COPY.selectSubtitle}</p>
        <div class="cards">${cards}</div>
        <button type="button" class="ghost" id="read-story">${COPY.readStory}</button>
      </div>`;
    this.els.select.querySelectorAll('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () => this.startRun(btn.getAttribute('data-pick')));
    });
    this.els.select.querySelector('#read-story').addEventListener('click', () => {
      this.page = 0;
      this.setPhase('story');
    });
  }

  buildRescue() {
    const last = STORY_PAGES[STORY_PAGES.length - 1];
    this.els.rescue.innerHTML = `
      <article class="pager">
        <h1>${last.title}</h1>
        ${last.body.map((s) => `<p>${s}</p>`).join('')}
        <p class="banner-copy">${COPY.rescue}</p>
        <button type="button" id="replay">${COPY.replay}</button>
      </article>`;
    this.els.rescue.querySelector('#replay').addEventListener('click', () => this.backToSelect());
  }

  backToSelect() {
    this.clearRun();
    this.setPhase('select');
  }

  clearRun() {
    this.world.detachAll();
    this.actors = [];
    this.hazards = [];
    this.hero = null;
    this.taughtBlock = false;
    this.sawCage = false;
    this.gateAnnounced = false;
    this.continueReady = false;
    this.hasKey = false;
    this.travelAt = 0;
    this.roomIndex = 0;
    this.promptText = '';
    this.bannerText = '';
    this.els.boss.classList.add('hidden');
  }

  startRun(heroId) {
    this.clearRun();
    this.heroId = heroId;
    this.loadRoom(0);
  }

  async loadRoom(index) {
    const room = ROOMS[index];
    if (!room) return;
    this.roomIndex = index;
    this.hasKey = false;
    this.travelAt = 0;
    this.world.detachAll();
    this.hazards.forEach((h) => {
      if (h.mesh) this.world.hazardsRoot.remove(h.mesh);
    });
    this.hazards = [];
    this.world.setRoom(room.boss ? 'throne' : 'chamber', room.exit || 'north');
    const spawn = room.boss ? { x: 0, z: -6 } : this.world.spawnPoint;
    this.hero = createHero(this.heroId, spawn.x, spawn.z);
    this.hero.y = this.world.floorY(spawn.x, spawn.z);
    this.hero.setFacing(0, 1);
    this.hero.invulnUntil = this.time + 0.75;
    const actors = [this.hero];
    if (room.boss) {
      actors.push(createPatricia(0, 11.2));
      const pierre = createEnemy('pierre', 0, 2.4);
      pierre.brain.cooldown = 1.3;
      actors.push(pierre);
    } else {
      const spot = room.exit === 'east' || room.exit === 'west' ? { x: 0, z: 0 } : { x: 0, z: -1.4 };
      const enemy = createEnemy(room.enemy, spot.x, spot.z, room.enemy === 'bat' ? undefined : 0);
      enemy.brain.cooldown = 1.1;
      actors.push(enemy);
    }
    const token = ++this.loadToken;
    this.world.generation = token;
    const present = actors.filter((actor) => !actor.modelId);
    const incoming = actors.filter((actor) => actor.modelId);
    this.actors = present;
    for (const actor of present) this.world.attach(actor);
    this.world.snap(this.hero);
    this.world.showKey(false);
    this.setPhase(room.boss ? 'throne' : 'courtyard');
    this.flash(COPY.loading, 8);
    this.prompt(room.goal);
    this.updateHud();
    try {
      for (const actor of incoming) {
        const mounted = await this.world.attach(actor);
        if (token !== this.loadToken || !mounted) return;
        this.actors.push(actor);
      }
    } catch (err) {
      console.error(err);
      if (token === this.loadToken) this.flash('Le modèle du monstre a échoué.', 5);
      return;
    }
    if (token !== this.loadToken) return;
    this.flash(room.title, 2.4);
    this.updateHud();
  }

  nearDoor() {
    const door = this.world.door;
    if (!this.hero || !door || this.world.gateOpen) return false;
    return Math.hypot(this.hero.x - door.x, this.hero.z - door.z) < 2.6;
  }

  exitHint() {
    const room = ROOMS[this.roomIndex];
    return EXIT_HINT[room?.exit] || COPY.doorHint;
  }

  tryOpenDoor() {
    if (!this.hasKey || !this.nearDoor()) return false;
    this.world.setGateOpen(true);
    this.world.showKey(false);
    this.hasKey = false;
    this.flash(COPY.doorOpens, 1.2);
    this.travelAt = this.time + 0.7;
    return true;
  }

  grantKey() {
    if (this.hasKey || ROOMS[this.roomIndex]?.boss) return;
    this.hasKey = true;
    this.world.showKey(true);
    this.flash(`${COPY.keyGot} ${this.exitHint()}`, 3.2);
    this.prompt(this.exitHint());
    this.updateHud();
  }

  enterThrone() {
    this.world.detachAll();
    this.hazards = [];
    this.world.setRoom('throne');
    this.hero.x = 0;
    this.hero.z = -9;
    this.hero.y = 0;
    this.hero.setFacing(0, 1);
    this.hero.setState('normal');
    const pierre = createEnemy('pierre', 0, 6.2);
    const patricia = createPatricia(0, 12.6);
    this.actors = [this.hero, patricia, pierre];
    for (const a of this.actors) this.world.attach(a);
    this.continueReady = false;
    this.els.prompt.classList.add('hidden');
    this.setPhase('throne');
    this.flash(COPY.throne, 2.6);
    this.els.boss.classList.remove('hidden');
    this.updateHud();
  }

  tryEnterThrone() {
    if (this.phase !== 'courtyard' || !this.continueReady) return;
    this.enterThrone();
  }

  livingEnemies() {
    return this.actors.filter((a) => a.role !== 'hero' && a.role !== 'patricia' && a.state !== 'dead');
  }

  flash(text, seconds) {
    this.bannerText = text;
    this.bannerUntil = this.time + seconds;
    this.els.banner.textContent = text;
    this.els.banner.classList.remove('hidden');
  }

  prompt(text) {
    this.promptText = text;
    this.els.promptLine.textContent = text || '';
    this.els.promptLine.classList.toggle('hidden', !text);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.input.beginFrame();
    this.tick(dt);
    this.input.endFrame();
    this.world.update(dt, this.time);
    if (this.hero && this.phase !== 'story' && this.phase !== 'select') {
      this.world.follow(this.hero, dt);
    } else {
      this.world.camera.position.set(0, 16, -20);
      this.world.camera.lookAt(0, 1, 4);
    }
    this.world.render();
    requestAnimationFrame(this.loop);
  }

  tick(dt) {
    if (this.phase === 'story') {
      if (this.input.edge('Enter') || this.input.edge('ArrowRight')) this.turnStory(1);
      if (this.input.edge('ArrowLeft')) this.turnStory(-1);
      return;
    }
    if (this.phase === 'select') return;
    if (this.phase === 'rescue') {
      if (this.input.edge('Enter')) this.backToSelect();
      this.syncVisuals();
      return;
    }

    if (this.hero.state === 'dead') {
      this.flash(COPY.fallen, 99);
      if (this.input.edge('Enter')) this.backToSelect();
      this.syncVisuals();
      this.updateHud();
      return;
    }

    this.updateHero(dt);
    this.updateEnemies(dt);
    this.updateHazards(dt);
    this.resolveHits();
    this.updateBossDefense(dt);
    this.syncVisuals();
    this.updateHud();
    this.updatePhaseFlow();

    if (this.time > this.bannerUntil && this.hero.state !== 'dead') {
      this.els.banner.classList.add('hidden');
    }
  }

  updateHero(dt) {
    const hero = this.hero;
    hero.stateAge += dt;
    if (hero.state === 'barrier' || hero.state === 'barrierDash') hero.barrierAge += dt;

    const move = this.input.move();
    const k = this.input.down('KeyK');
    const lEdge = this.input.edge('KeyL');
    const tEdge = this.input.edge('KeyT');
    const locked = this.time < hero.barrierLockUntil;

    if (lEdge && hero.state !== 'attack' && hero.state !== 'dash' && hero.state !== 'hitstun') {
      if (this.tryOpenDoor()) return;
    }

    if (hero.state === 'hitstun') {
      hero.x += hero.vx * dt;
      hero.z += hero.vz * dt;
      hero.vx *= 0.86;
      hero.vz *= 0.86;
      this.world.clamp(hero);
      if (hero.stateAge >= HITSTUN) this.restHero(hero, k, locked);
      return;
    }

    if (hero.state === 'attack') {
      this.tickAttack(hero, dt);
      return;
    }

    if (hero.state === 'dash' || hero.state === 'barrierDash') {
      if (lEdge && hero.state === 'dash') {
        this.beginAttack(hero, true);
        return;
      }
      const dur = hero.stats.dashDuration;
      const dist = hero.stats.dashDistance;
      hero.x += hero.dashFacingX * (dist / dur) * dt;
      hero.z += hero.dashFacingZ * (dist / dur) * dt;
      this.world.clamp(hero);
      if (hero.stateAge >= dur) {
        if (hero.state === 'barrierDash') hero.barrierLockUntil = this.time + BARRIER_LOCK;
        this.restHero(hero, k && hero.state !== 'barrierDash', locked);
      }
      return;
    }

    if (hero.state === 'barrier') {
      if (tEdge) {
        this.beginDash(hero, true);
        return;
      }
      if (!k) {
        hero.setState('normal');
      } else {
        this.walk(hero, move, hero.stats.speed * hero.stats.barrierMove, dt);
      }
      return;
    }

    if (move.x || move.z) hero.setFacing(move.x, move.z);

    if (tEdge && k && !locked) {
      this.beginDash(hero, true);
      return;
    }
    if (k && !locked) {
      hero.setState('barrier');
      this.walk(hero, move, hero.stats.speed * hero.stats.barrierMove, dt);
      return;
    }
    if (lEdge) {
      this.beginAttack(hero, false);
      return;
    }
    if (tEdge) {
      this.beginDash(hero, false);
      return;
    }
    this.walk(hero, move, hero.stats.speed, dt);
  }

  restHero(hero, wantBarrier, locked) {
    if (wantBarrier && !locked) hero.setState('barrier');
    else hero.setState('normal');
  }

  walk(hero, move, speed, dt) {
    if (move.x || move.z) {
      hero.setFacing(move.x, move.z);
      hero.x += move.x * speed * dt;
      hero.z += move.z * speed * dt;
      this.world.clamp(hero);
    }
  }

  beginDash(hero, withBarrier) {
    hero.dashFacingX = hero.facingX;
    hero.dashFacingZ = hero.facingZ;
    hero.setState(withBarrier ? 'barrierDash' : 'dash');
    if (withBarrier) hero.barrierAge = hero.barrierAge || 0;
  }

  beginAttack(hero, fromDash) {
    if (fromDash && hero.stats.teleportDashAttack) {
      const target = nearestOnDashLine(hero, this.livingEnemies());
      if (target) {
        hero.x = target.x + hero.dashFacingX * (target.radius + 0.85);
        hero.z = target.z + hero.dashFacingZ * (target.radius + 0.85);
        hero.setFacing(-hero.dashFacingX, -hero.dashFacingZ);
        this.world.clamp(hero);
      }
    }
    hero.setState('attack', {
      attackPhase: 'windup',
      attackAge: 0,
      dashAttack: fromDash,
      hitThisSwing: new Set(),
    });
  }

  tickAttack(hero, dt) {
    hero.attackAge += dt * 1000;
    const t = hero.stats.timings;
    if (hero.attackAge < t.windup) {
      hero.attackPhase = 'windup';
    } else if (hero.attackAge < t.active) {
      hero.attackPhase = 'active';
      this.playerHits(hero);
    } else if (hero.attackAge < t.recovery) {
      hero.attackPhase = 'recovery';
    } else {
      this.restHero(hero, this.input.down('KeyK'), this.time < hero.barrierLockUntil);
    }
  }

  playerHits(hero) {
    const range = hero.stats.attackRange;
    const arc = hero.stats.attackArc;
    for (const enemy of this.livingEnemies()) {
      if (hero.hitThisSwing.has(enemy.id)) continue;
      const reach = range + enemy.radius;
      if (!hero.inArc(enemy.x, enemy.z, reach, arc)) continue;
      hero.hitThisSwing.add(enemy.id);
      this.damageEnemy(hero, enemy);
    }
  }

  damageEnemy(hero, enemy) {
    let dmg = hero.dashAttack ? hero.stats.dashAttack : hero.stats.attack;
    if (this.time < hero.attackBuffUntil) dmg *= hero.attackBuffMul;
    if (this.time < enemy.vulnUntil) dmg *= enemy.vulnMul;
    if (enemy.role === 'pierre' && enemy.defense === 'armored') dmg = 1;
    if (enemy.role === 'knight' && this.knightGuards(enemy, hero)) dmg = 1;
    enemy.hp -= dmg;
    const kb = 1.4;
    const dx = enemy.x - hero.x;
    const dz = enemy.z - hero.z;
    const len = Math.hypot(dx, dz) || 1;
    enemy.x += (dx / len) * kb;
    enemy.z += (dz / len) * kb;
    this.world.clamp(enemy);
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.setState('dead');
      if (enemy.role === 'pierre') this.winRescue();
      else this.grantKey();
      return;
    }
    if (enemy.role !== 'pierre' || enemy.defense === 'broken') {
      enemy.setState('hitstun');
      enemy.brain.mode = 'recover';
      enemy.brain.age = 0;
    }
  }

  knightGuards(knight, hero) {
    if (knight.stunned(this.time)) return false;
    return knight.facingDotTo(hero.x, hero.z) > 0.25;
  }

  updateEnemies(dt) {
    for (const enemy of this.actors) {
      if (enemy.role === 'hero' || enemy.role === 'patricia') continue;
      if (enemy.state === 'dead') continue;
      enemy.stateAge += dt;
      if (enemy.state === 'hitstun') {
        if (enemy.stateAge >= 0.32) enemy.setState('normal');
        continue;
      }
      if (enemy.stunned(this.time)) continue;
      if (enemy.role === 'pierre') this.updatePierre(enemy, dt);
      else this.updateMinion(enemy, dt);
    }
  }

  updateMinion(enemy, dt) {
    const brain = enemy.brain;
    brain.age += dt;
    brain.cooldown -= dt;
    const hero = this.hero;
    const dx = hero.x - enemy.x;
    const dz = hero.z - enemy.z;
    const dist = Math.hypot(dx, dz);
    const nx = dist > 0.01 ? dx / dist : 0;
    const nz = dist > 0.01 ? dz / dist : 1;

    if (brain.mode === 'chase') {
      enemy.setFacing(nx, nz);
      if (enemy.role === 'bat') enemy.y = this.world.floorY(enemy.x, enemy.z) + enemy.stats.flyHeight;
      const range = enemy.role === 'knight' ? 2.15 : enemy.role === 'bat' ? 4.6 : 3.4;
      if (dist < range && brain.cooldown <= 0) {
        brain.mode = 'telegraph';
        brain.age = 0;
        brain.dirX = nx;
        brain.dirZ = nz;
        brain.kind = enemy.role === 'bat' ? 'dive' : enemy.role === 'knight' ? 'swing' : 'lunge';
        if (!this.taughtBlock) {
          this.taughtBlock = true;
          this.flash(COPY.pressK, 2.2);
        }
      } else {
        const spd = enemy.stats.speed;
        enemy.x += nx * spd * dt;
        enemy.z += nz * spd * dt;
        this.world.clamp(enemy);
      }
      return;
    }

    if (brain.mode === 'telegraph') {
      enemy.setFacing(brain.dirX, brain.dirZ);
      if (brain.age >= enemy.stats.telegraph) {
        brain.mode = 'strike';
        brain.age = 0;
        brain.landed = false;
        if (brain.kind === 'lunge' || brain.kind === 'dive') enemy.setState('dash');
        else enemy.setState('attack', { attackPhase: 'active', attackAge: 0 });
      }
      return;
    }

    if (brain.mode === 'strike') {
      if (brain.kind === 'lunge') {
        enemy.x += brain.dirX * 9 * dt;
        enemy.z += brain.dirZ * 7 * dt;
      } else if (brain.kind === 'dive') {
        enemy.x += brain.dirX * 10 * dt;
        enemy.z += brain.dirZ * 8 * dt;
        const floor = this.world.floorY(enemy.x, enemy.z);
        enemy.y = floor + Math.max(0.35, enemy.stats.flyHeight * (1 - brain.age / enemy.stats.strike));
      } else {
        enemy.setFacing(nx, nz);
      }
      this.world.clamp(enemy);
      if (brain.age >= enemy.stats.strike) {
        brain.mode = 'recover';
        brain.age = 0;
        brain.cooldown = enemy.stats.recover;
        enemy.setState('normal');
      }
      return;
    }

    if (brain.mode === 'recover') {
      if (enemy.role === 'bat') {
        const hover = this.world.floorY(enemy.x, enemy.z) + enemy.stats.flyHeight;
        enemy.y += (hover - enemy.y) * 3 * dt;
      }
      if (brain.age >= enemy.stats.recover) {
        brain.mode = 'chase';
        brain.age = 0;
      }
    }
  }

  updatePierre(pierre, dt) {
    const brain = pierre.brain;
    brain.age += dt;
    const hero = this.hero;
    const dx = hero.x - pierre.x;
    const dz = hero.z - pierre.z;
    const dist = Math.hypot(dx, dz);
    const nx = dist > 0.01 ? dx / dist : 0;
    const nz = dist > 0.01 ? dz / dist : 1;
    const cycle = ['punch', 'wave', 'rain', 'charge'];
    const kind = cycle[brain.cycle % 4];

    if (brain.mode === 'chase') {
      pierre.setFacing(nx, nz);
      if (dist > 6.5) {
        pierre.x += nx * pierre.stats.speed * dt;
        pierre.z += nz * pierre.stats.speed * dt;
        this.world.clamp(pierre);
      }
      if (brain.age > 1.05) {
        brain.mode = 'telegraph';
        brain.age = 0;
        brain.kind = kind;
        brain.dirX = nx;
        brain.dirZ = nz;
        this.announcePierre(kind);
      }
      return;
    }

    if (brain.mode === 'telegraph') {
      pierre.setFacing(brain.dirX, brain.dirZ);
      if (brain.age >= pierre.stats.telegraph) {
        brain.mode = 'strike';
        brain.age = 0;
        brain.landed = false;
        this.launchPierre(pierre, brain.kind);
      }
      return;
    }

    if (brain.mode === 'strike') {
      if (brain.kind === 'charge') {
        pierre.x += brain.dirX * 8 * dt;
        pierre.z += brain.dirZ * 6.5 * dt;
        this.world.clamp(pierre);
      } else if (brain.kind === 'punch') {
        pierre.setFacing(brain.dirX, brain.dirZ);
      }
      if (brain.age >= (brain.kind === 'charge' ? 0.55 : 0.4)) {
        brain.mode = 'recover';
        brain.age = 0;
        this.prompt('');
        if (pierre.mesh?.userData.fist) pierre.mesh.userData.fist.visible = false;
      }
      return;
    }

    if (brain.mode === 'recover' && brain.age >= pierre.stats.recover) {
      brain.mode = 'chase';
      brain.age = 0;
      brain.cycle += 1;
    }
  }

  announcePierre(kind) {
    if (kind === 'punch') {
      this.flash(`${COPY.punch}. ${COPY.pressKBarrier}`, 1.4);
      this.prompt(COPY.pressKBarrier);
    } else if (kind === 'wave') {
      this.flash(`${COPY.wave}. ${COPY.dodgeT}`, 1.4);
      this.prompt(COPY.dodgeT);
    } else if (kind === 'rain') {
      this.flash(COPY.rain, 1.4);
      this.prompt(COPY.rain);
    } else {
      this.flash(`${COPY.charge}. ${COPY.pressKPerfect}`, 1.6);
      this.prompt(COPY.pressKPerfect);
    }
  }

  launchPierre(pierre, kind) {
    if (kind === 'punch') {
      if (pierre.mesh?.userData.fist) pierre.mesh.userData.fist.visible = true;
      const mesh = this.world.spawnHazardMesh('fist');
      this.hazards.push({
        kind: 'fist',
        blockable: true,
        x: pierre.x + pierre.facingX * 2.2,
        z: pierre.z + pierre.facingZ * 2.2,
        y: 1.1,
        vx: pierre.facingX * 14,
        vz: pierre.facingZ * 14,
        life: 0.45,
        age: 0,
        radius: 0.85,
        mesh,
      });
    } else if (kind === 'wave') {
      const mesh = this.world.spawnHazardMesh('wave');
      this.hazards.push({
        kind: 'wave',
        blockable: false,
        x: pierre.x,
        z: pierre.z + 0.5,
        y: 0.45,
        vx: pierre.facingX * 8,
        vz: pierre.facingZ * 8,
        life: 2.1,
        age: 0,
        radius: 1.1,
        halfW: 7,
        mesh,
      });
    } else if (kind === 'rain') {
      for (let i = 0; i < 8; i += 1) {
        const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
        const rad = 1.4 + Math.random() * 5.2;
        const mesh = this.world.spawnHazardMesh('rain');
        this.hazards.push({
          kind: 'rain',
          blockable: false,
          x: this.hero.x + Math.cos(ang) * rad,
          z: this.hero.z + Math.sin(ang) * rad,
          y: 8.5 + Math.random() * 1.5,
          vx: 0,
          vz: 0,
          vy: 0,
          life: 2.4,
          age: 0,
          radius: 1.15,
          mesh,
        });
      }
    } else {
      pierre.setState('dash');
    }
  }

  updateHazards(dt) {
    const keep = [];
    for (const h of this.hazards) {
      h.age += dt;
      if (h.kind === 'rain') {
        h.vy = (h.vy || 0) + 18 * dt;
        h.y -= h.vy * dt;
        if (h.y <= 0.35) {
          h.y = 0.35;
          this.tryHazardHit(h);
          h.age = h.life;
        }
      } else {
        h.x += (h.vx || 0) * dt;
        h.z += (h.vz || 0) * dt;
        this.tryHazardHit(h);
      }
      if (h.mesh) {
        h.mesh.position.set(h.x, h.y, h.z);
        if (h.kind === 'wave') {
          h.mesh.rotation.y = Math.atan2(h.vx, h.vz);
        }
        if (h.mesh.userData.shadow) {
          h.mesh.userData.shadow.position.set(0, -h.y + 0.03, 0);
        }
      }
      if (h.age < h.life) keep.push(h);
      else if (h.mesh) this.world.hazardsRoot.remove(h.mesh);
    }
    this.hazards = keep;
  }

  tryHazardHit(h) {
    if (h.spent) return;
    const hero = this.hero;
    if (hero.state === 'dead' || this.time < hero.invulnUntil) return;
    let hit = false;
    if (h.kind === 'wave') {
      const localX = (hero.x - h.x) * Math.cos(-Math.atan2(h.vx, h.vz)) - (hero.z - h.z) * Math.sin(-Math.atan2(h.vx, h.vz));
      const localZ = (hero.x - h.x) * Math.sin(-Math.atan2(h.vx, h.vz)) + (hero.z - h.z) * Math.cos(-Math.atan2(h.vx, h.vz));
      hit = Math.abs(localX) < h.halfW && Math.abs(localZ) < 1.1 && hero.y < 1.4;
    } else {
      hit = Math.hypot(hero.x - h.x, hero.z - h.z) < h.radius + hero.radius && hero.y < 1.6;
    }
    if (!hit) return;
    h.spent = true;
    this.hitHero(h.blockable, h.x, h.z);
  }

  tryEnemyHit(enemy, blockable) {
    const hero = this.hero;
    if (hero.state === 'dead' || this.time < hero.invulnUntil) return;
    if (enemy.brain.landed) return;
    const reach = enemy.radius + hero.radius + (enemy.role === 'pierre' ? 0.35 : 0.25);
    if (Math.hypot(hero.x - enemy.x, hero.z - enemy.z) > reach) return;
    if (enemy.role === 'knight' && enemy.facingDotTo(hero.x, hero.z) < 0.15) return;
    enemy.brain.landed = true;
    this.hitHero(blockable && enemy.stats.blockable !== false, enemy.x, enemy.z, enemy);
  }

  resolveHits() {
    for (const enemy of this.livingEnemies()) {
      if (enemy.brain.mode !== 'strike') continue;
      const blockable = enemy.role === 'pierre'
        ? enemy.brain.kind === 'punch' || enemy.brain.kind === 'charge'
        : true;
      this.tryEnemyHit(enemy, blockable);
    }
  }

  hitHero(blockable, fromX, fromZ, source) {
    const hero = this.hero;
    if (hero.state === 'dead' || this.time < hero.invulnUntil) return;
    const guarded = hero.state === 'barrier' || hero.state === 'barrierDash';
    if (guarded && blockable) {
      // Perfect window is time since barrier went up, not time until the hit lands.
      if (hero.barrierAge <= PERFECT_WINDOW) this.perfect(hero, source, fromX, fromZ);
      this.knock(hero, fromX, fromZ, -0.4);
      if (source) this.knock(source, hero.x, hero.z, -1.8);
      return;
    }
    hero.hp -= 1;
    hero.invulnUntil = this.time + 0.55;
    if (hero.hp <= 0) {
      hero.hp = 0;
      hero.setState('dead');
      this.flash(COPY.fallen, 99);
      return;
    }
    const k = this.knockVec(hero, fromX, fromZ, 6);
    hero.vx = k.x;
    hero.vz = k.z;
    hero.setState('hitstun');
  }

  perfect(hero, source) {
    this.flash(COPY.perfect, 1.6);
    const fx = hero.stats.perfect;
    if (fx.kind === 'attackBuff') {
      hero.attackBuffUntil = this.time + fx.duration;
      hero.attackBuffMul = fx.mul;
    } else if (fx.kind === 'defenseDown' && source) {
      source.vulnUntil = this.time + 6;
      source.vulnMul = fx.mul;
      this.flash(fx.banner || COPY.weak, 1.8);
    } else if (fx.kind === 'stun' && source) {
      source.stunUntil = this.time + fx.duration;
    } else if (fx.kind === 'heal') {
      hero.hp = Math.min(PLAYER_MAX_HP, hero.hp + fx.hearts);
    }
    if (source && source.role === 'pierre') {
      source.defense = 'broken';
      source.defenseTimer = BROKEN_TIME;
      this.flash(COPY.broken, 2);
    }
  }

  knock(actor, fromX, fromZ, strength) {
    const v = this.knockVec(actor, fromX, fromZ, strength);
    actor.x += v.x * 0.12;
    actor.z += v.z * 0.12;
    this.world.clamp(actor);
  }

  knockVec(actor, fromX, fromZ, strength) {
    const dx = actor.x - fromX;
    const dz = actor.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    return { x: (dx / len) * strength, z: (dz / len) * strength };
  }

  updateBossDefense(dt) {
    const pierre = this.actors.find((a) => a.role === 'pierre');
    if (!pierre || pierre.state === 'dead') return;
    if (pierre.defense === 'broken') {
      pierre.defenseTimer -= dt;
      if (pierre.defenseTimer <= 0) pierre.defense = 'armored';
    }
  }

  winRescue() {
    const patricia = this.actors.find((a) => a.role === 'patricia');
    this.world.openCage();
    if (patricia && this.hero) {
      patricia.x = this.hero.x + 1.1;
      patricia.z = this.hero.z + 0.2;
    }
    this.flash(COPY.rescue, 4);
    this.setPhase('rescue');
  }

  updatePhaseFlow() {
    if (this.phase !== 'courtyard' && this.phase !== 'throne') return;
    if (this.travelAt && this.time >= this.travelAt) {
      this.travelAt = 0;
      this.loadRoom(this.roomIndex + 1);
      return;
    }
    this.updateGuide();
  }

  updateGuide() {
    const room = ROOMS[this.roomIndex];
    if (!room || this.hero.state === 'dead') return;
    if (room.boss) {
      this.prompt(COPY.kingGoal);
      return;
    }
    if (this.nearDoor() && this.hasKey) this.prompt(COPY.pressL);
    else if (this.hasKey) this.prompt(this.exitHint());
    else if (this.nearDoor()) this.prompt(COPY.doorLocked);
    else this.prompt(room.goal);
  }

  syncVisuals() {
    for (const a of this.actors) this.world.syncActor(a, this.time);
  }

  updateHud() {
    if (!this.hero) return;
    const filled = Math.max(0, this.hero.hp);
    let hearts = '';
    for (let i = 0; i < PLAYER_MAX_HP; i += 1) {
      hearts += i < filled ? '<span class="heart on">♥</span>' : '<span class="heart">♡</span>';
    }
    this.els.hearts.innerHTML = `<span class="life">${COPY.life}</span> ${hearts}`;
    const room = ROOMS[this.roomIndex];
    if (this.els.goal) {
      this.els.goal.textContent = room ? `${room.title} · ${this.roomIndex + 1} sur ${ROOMS.length}` : '';
    }
    if (this.els.key) {
      this.els.key.textContent = this.hasKey ? COPY.hasKey : '';
      this.els.key.classList.toggle('hidden', !this.hasKey);
    }
    const pierre = this.actors.find((a) => a.role === 'pierre' && a.state !== 'dead');
    if (pierre && this.phase === 'throne') {
      const pct = Math.max(0, pierre.hp / ENEMIES.pierre.hp);
      this.els.boss.classList.remove('hidden');
      this.els.boss.innerHTML = `<span>${COPY.pierre}</span><i style="width:${pct * 100}%"></i>${
        pierre.defense === 'broken' ? `<em>${COPY.broken}</em>` : ''
      }`;
    } else if (this.phase !== 'throne') {
      this.els.boss.classList.add('hidden');
    }
  }
}

const game = new Game();
window.game = game;
