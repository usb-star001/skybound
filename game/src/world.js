// The game's rules and state, with no drawing and no browser in it: the plane, the
// scrolling sky, the rings, the birds, balloons and storm clouds, the fuel cans,
// the particles, the score, the fuel, the lives and the levels. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react without
// the world knowing about screens or sound. Nothing here allocates after createWorld
// returns, except the ridge phase numbers, which are fixed at boot.
import {
  BALLOON, BIRD, CLOUD, FIELD, FUEL, FUELCAN, LEVEL, LIVES, PARTICLE_POOL,
  PLANE, PLANE_X, POOL_SIZE, RING, SPEED, STORM,
} from './config.js';
import { createRandom, range } from './random.js';

export const KIND_RING = 0;
export const KIND_BIRD = 1;
export const KIND_BALLOON = 2;
export const KIND_STORM = 3;
export const KIND_FUELCAN = 4;

export const EVENT_RING = 1;
export const EVENT_CAN = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_FUEL_EMPTY = 16;

/** A deterministic 0..1 hash of an integer, for placing trees and houses along the ground. */
export function hash01(n) {
  let x = (Math.imul(n | 0, 2654435761) >>> 0) ^ 0x9e3779b9;
  x ^= x >>> 15;
  x = (Math.imul(x, 2246822519) >>> 0) ^ 0x85ebca6b;
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

function overlapsCircle(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(random) {
  const seed = Math.floor(random() * 4294967296);
  const ridge = {
    farA: range(random, 40, 70),
    farB: range(random, 20, 40),
    farF1: 0.0016,
    farF2: 0.0041,
    farP1: random() * 6.28,
    farP2: random() * 6.28,
    nearA: range(random, 35, 55),
    nearB: range(random, 18, 30),
    nearF1: 0.0021,
    nearF2: 0.0053,
    nearP1: random() * 6.28,
    nearP2: random() * 6.28,
  };

  const plane = {
    x: PLANE_X,
    y: 300,
    vy: 0,
    width: PLANE.width,
    height: PLANE.height,
    invulnerable: 0,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_RING, x: 0, y: 0, width: 0, height: 0, extra: 0, scored: false, flap: 0 });
  }
  const particles = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff', kind: 0 });
  }
  const clouds = [];
  for (let index = 0; index < CLOUD.count; index += 1) {
    clouds.push({
      x: random() * (FIELD.width + 400),
      y: range(random, 36, 300),
      scale: range(random, 0.6, 1.7),
      parallax: range(random, 0.08, 0.3),
    });
  }

  const state = {
    plane,
    items,
    particles,
    clouds,
    ridge,
    seed,
    score: 0,
    distanceM: 0,
    scrollX: 0,
    speed: SPEED.base,
    fuel: FUEL.start,
    fuelEmpty: false,
    lives: LIVES,
    level: 1,
    elapsed: 0,
    ringTimer: 1.2,
    birdTimer: 1.4,
    balloonTimer: 3.2,
    stormTimer: 4.5,
    canTimer: 3.6,
    exhaustTimer: 0,
    over: false,
    overReason: '',
  };

  function reset() {
    plane.y = 300;
    plane.vy = 0;
    plane.invulnerable = 0;
    for (const item of items) item.active = false;
    for (const p of particles) p.active = false;
    state.score = 0;
    state.distanceM = 0;
    state.scrollX = 0;
    state.speed = SPEED.base;
    state.fuel = FUEL.start;
    state.fuelEmpty = false;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.ringTimer = 1.2;
    state.birdTimer = 1.4;
    state.balloonTimer = 3.2;
    state.stormTimer = 4.5;
    state.canTimer = 3.6;
    state.exhaustTimer = 0;
    state.over = false;
    state.overReason = '';
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) if (!particles[index].active) return particles[index];
    return null;
  }

  function burst(x, y, color, count, speed, kind) {
    for (let n = 0; n < count; n += 1) {
      const p = freeParticle();
      if (p === null) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v - state.speed * 0.4;
      p.vy = Math.sin(angle) * v;
      p.maxLife = range(random, 0.35, 0.8);
      p.life = p.maxLife;
      p.size = range(random, 2.5, 6);
      p.color = color;
      p.kind = kind;
    }
  }

  function spawnRing() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_RING;
    item.width = RING.radius * 2;
    item.height = RING.radius * 2;
    item.x = FIELD.width + 80;
    item.y = range(random, RING.minY, RING.maxY);
    item.extra = 0;
    item.scored = false;
  }

  function spawnBird() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_BIRD;
    item.width = BIRD.width;
    item.height = BIRD.height;
    item.x = FIELD.width + 60;
    item.y = range(random, 90, FIELD.groundY - 140);
    item.extra = BIRD.extra + random() * BIRD.extraJitter;
    item.flap = random() * 6.28;
  }

  function spawnBalloon() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_BALLOON;
    item.width = BALLOON.width;
    item.height = BALLOON.height;
    item.x = FIELD.width + 90;
    item.y = range(random, 120, FIELD.groundY - 220);
    item.extra = BALLOON.extra;
  }

  function spawnStorm() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_STORM;
    item.width = STORM.width;
    item.height = STORM.height;
    item.x = FIELD.width + 120;
    item.y = range(random, 80, 320);
    item.extra = STORM.extra;
  }

  function spawnCan() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_FUELCAN;
    item.width = FUELCAN.size;
    item.height = FUELCAN.size;
    item.x = FIELD.width + 70;
    item.y = range(random, 120, FIELD.groundY - 160);
    item.extra = 0;
  }

  function interval(base, scale, min, level) {
    return Math.max(min, base * scale ** (level - 1));
  }

  function hit() {
    state.lives -= 1;
    plane.invulnerable = PLANE.invulnerable;
    burst(plane.x + plane.width / 2, plane.y + plane.height / 2, '#ff6b5e', 22, 260, 1);
    burst(plane.x + plane.width / 2, plane.y + plane.height / 2, '#f2c94c', 10, 180, 1);
    if (state.lives <= 0) {
      state.over = true;
      state.overReason = state.fuelEmpty ? 'Out of fuel' : 'Crashed';
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  /**
   * One fixed step. `controls` is { climb, throttle, boost, pointerY } where climb
   * is -1 to climb, 1 to dive; throttle -1 to slow, 1 to speed up; pointerY is the
   * field height the pointer asks for, or null. With `harmless` set (the title
   * screen's backdrop) things move but nothing touches the plane and nothing scores.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));

    // Throttle and speed.
    const base = SPEED.base + SPEED.perLevel * (state.level - 1);
    let target = base + controls.throttle * 60;
    if (controls.boost && !state.fuelEmpty) target += SPEED.boost;
    target = Math.min(SPEED.max, Math.max(SPEED.min, target));
    const ease = 1 - Math.exp(-SPEED.ease * dt);
    state.speed += (target - state.speed) * ease;

    // Fuel.
    let drain = FUEL.drain + (controls.throttle > 0 ? FUEL.throttleDrain : 0);
    if (controls.boost && !state.fuelEmpty) drain += FUEL.boostDrain;
    if (!harmless) {
      state.fuel = Math.max(0, state.fuel - drain * dt);
      if (state.fuel === 0 && !state.fuelEmpty) {
        state.fuelEmpty = true;
        events |= EVENT_FUEL_EMPTY;
      }
    }

    // Vertical flight.
    if (controls.climb < 0 && !state.fuelEmpty) plane.vy -= PLANE.climbAccel * dt;
    else if (controls.climb > 0) plane.vy += PLANE.diveAccel * dt;
    else if (controls.pointerY !== null && controls.pointerY !== undefined && !state.fuelEmpty) {
      const centre = plane.y + plane.height / 2;
      const diff = controls.pointerY - centre;
      plane.vy += Math.max(-PLANE.climbAccel, Math.min(PLANE.climbAccel, diff * 6)) * dt;
    } else {
      plane.vy *= Math.max(0, 1 - 2.4 * dt);
    }
    if (state.fuelEmpty) plane.vy += PLANE.gravity * dt;
    plane.vy = Math.max(-PLANE.maxVy, Math.min(PLANE.maxVy, plane.vy));
    plane.y += plane.vy * dt;
    if (plane.y < 30) {
      plane.y = 30;
      plane.vy = Math.max(0, plane.vy);
    }
    if (plane.invulnerable > 0) plane.invulnerable = Math.max(0, plane.invulnerable - dt);

    // Scroll and distance score.
    state.scrollX += state.speed * dt;
    state.distanceM += state.speed * dt * 0.2;
    if (!harmless) state.score += state.speed * dt * 0.02;

    // Spawning.
    state.ringTimer -= dt;
    if (state.ringTimer <= 0) {
      spawnRing();
      state.ringTimer += RING.interval + random() * RING.intervalJitter;
    }
    state.birdTimer -= dt;
    if (state.birdTimer <= 0) {
      spawnBird();
      state.birdTimer += interval(BIRD.interval, BIRD.intervalScale, BIRD.minInterval, state.level) + random() * BIRD.intervalJitter;
    }
    state.balloonTimer -= dt;
    if (state.balloonTimer <= 0) {
      spawnBalloon();
      state.balloonTimer += interval(BALLOON.interval, BALLOON.intervalScale, BALLOON.minInterval, state.level) + random() * BALLOON.intervalJitter;
    }
    state.stormTimer -= dt;
    if (state.stormTimer <= 0) {
      spawnStorm();
      state.stormTimer += interval(STORM.interval, STORM.intervalScale, STORM.minInterval, state.level) + random() * STORM.intervalJitter;
    }
    state.canTimer -= dt;
    if (state.canTimer <= 0) {
      spawnCan();
      state.canTimer += FUELCAN.interval + random() * FUELCAN.intervalJitter;
    }

    // Exhaust puffs behind the tail.
    state.exhaustTimer -= dt;
    if (state.exhaustTimer <= 0) {
      const p = freeParticle();
      if (p !== null) {
        p.active = true;
        p.x = plane.x - 6;
        p.y = plane.y + plane.height / 2 + range(random, -4, 4);
        p.vx = -state.speed * 0.55;
        p.vy = range(random, -12, 12);
        p.maxLife = range(random, 0.35, 0.6);
        p.life = p.maxLife;
        p.size = range(random, 3, 6);
        p.color = 'rgba(255, 244, 230, 0.5)';
        p.kind = 0;
      }
      state.exhaustTimer += 0.055;
    }

    // Items move, collide, and leave.
    const pcx = plane.x + plane.width / 2;
    const pcy = plane.y + plane.height / 2;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.x -= (state.speed + item.extra) * dt;
      if (item.kind === KIND_BIRD) item.flap += dt * 11;
      if (item.x + item.width < -40) {
        item.active = false;
        continue;
      }
      if (harmless) continue;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      if (item.kind === KIND_RING) {
        if (!item.scored && overlapsCircle(pcx, pcy, 10, cx, cy, RING.inner)) {
          item.scored = true;
          item.active = false;
          state.score += RING.points;
          state.fuel = Math.min(100, state.fuel + FUEL.ring);
          burst(cx, cy, '#f2c94c', 14, 200, 1);
          events |= EVENT_RING;
        }
        continue;
      }
      if (item.kind === KIND_FUELCAN) {
        if (overlapsCircle(pcx, pcy, 24, cx, cy, 18)) {
          item.active = false;
          state.fuel = Math.min(100, state.fuel + FUEL.can);
          burst(cx, cy, '#7ddc8a', 10, 160, 1);
          events |= EVENT_CAN;
        }
        continue;
      }
      // Birds, balloons and storms hurt.
      const radius = item.kind === KIND_BIRD ? 15 : item.kind === KIND_BALLOON ? 30 : 42;
      if (plane.invulnerable === 0 && overlapsCircle(pcx, pcy, 24, cx, cy, radius)) {
        item.active = false;
        events |= hit();
        if (events & EVENT_OVER) return events;
      }
    }

    // Ground contact.
    if (plane.y + plane.height >= FIELD.groundY) {
      plane.y = FIELD.groundY - plane.height;
      if (!harmless && plane.invulnerable === 0) {
        plane.vy = -300;
        events |= hit();
        if (events & EVENT_OVER) return events;
      } else {
        plane.vy = Math.min(0, plane.vy);
      }
    }

    // Particles.
    for (let index = 0; index < particles.length; index += 1) {
      const p = particles[index];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt - state.speed * 0.25 * dt;
      p.y += p.vy * dt;
    }

    // Clouds drift and wrap.
    for (let index = 0; index < clouds.length; index += 1) {
      const cloud = clouds[index];
      cloud.x -= (state.speed * cloud.parallax + 6) * dt;
      if (cloud.x < -280) {
        cloud.x = FIELD.width + random() * 240;
        cloud.y = range(random, 36, 300);
        cloud.scale = range(random, 0.6, 1.7);
      }
    }

    return events;
  }

  /** Height of the far ridge at a world x, in field coordinates. */
  function farRidgeY(worldX) {
    return 470 + ridge.farA * Math.sin(worldX * ridge.farF1 + ridge.farP1) + ridge.farB * Math.sin(worldX * ridge.farF2 + ridge.farP2);
  }

  /** Height of the near ridge at a world x, in field coordinates. */
  function nearRidgeY(worldX) {
    return 560 + ridge.nearA * Math.sin(worldX * ridge.nearF1 + ridge.nearP1) + ridge.nearB * Math.sin(worldX * ridge.nearF2 + ridge.nearP2);
  }

  reset();
  return { state, reset, step, farRidgeY, nearRidgeY };
}
