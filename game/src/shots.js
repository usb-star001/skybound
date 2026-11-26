// The screenshot scenes behind ?shot=start|play|rings|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same seed
// always gives the same frame.
//
// The autopilot is a planner, not a reflex: every step it tries climb, level and
// dive, simulates the plane forward over its horizon with the world's own vertical
// physics, and holds the climb whose path stays clear of birds, balloons and storm
// clouds (and the ground) and threads a ring when one is on the way. The play
// scene's pilot looks 1.4 s ahead and keeps its lives; the end scene's looks only
// 0.25 s ahead, so it is caught out once things speed up, as a hurried player is.
import { FIELD, PLANE, RING, STEP } from './config.js';
import { EVENT_OVER, KIND_BALLOON, KIND_BIRD, KIND_RING, KIND_STORM } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const RINGS_WAIT_SECONDS = 45;
const END_LIMIT_SECONDS = 600;
const HORIZON_PLAY = 1.4;
const HORIZON_END = 0.1;
/** The crash penalty dwarfs any ring bonus, so a ring is never worth dying for. */
const CRASH_SCORE = -10000;
/** Each step spent inside a ring's mouth is worth this; cruising near 300 ft is worth a little. */
const RING_STEP_SCORE = 100;
const CRUISE_HEIGHT = 300;

function obstacleRadius(kind) {
  return kind === KIND_BIRD ? 15 : kind === KIND_BALLOON ? 30 : 42;
}

/** The climb to hold this step (-1 climb, 0 level, 1 dive). */
function planClimb(state, horizon) {
  const plane = state.plane;
  const pcx = plane.x + plane.width / 2;
  const obstacles = [];
  const rings = [];
  for (const item of state.items) {
    if (!item.active) continue;
    if (item.kind === KIND_RING && !item.scored) rings.push(item);
    else if (item.kind === KIND_BIRD || item.kind === KIND_BALLOON || item.kind === KIND_STORM) obstacles.push(item);
  }
  let bestClimb = 0;
  let bestScore = -Infinity;
  for (const climb of [-1, 0, 1]) {
    let y = plane.y;
    let vy = plane.vy;
    let score = 0;
    let crashed = false;
    let survived = 0;
    const steps = Math.ceil(horizon / STEP);
    for (let s = 0; s < steps; s += 1) {
      // The world's vertical physics, step by step.
      if (climb < 0 && !state.fuelEmpty) vy -= PLANE.climbAccel * STEP;
      else if (climb > 0) vy += PLANE.diveAccel * STEP;
      else vy *= Math.max(0, 1 - 2.4 * STEP);
      if (state.fuelEmpty) vy += PLANE.gravity * STEP;
      vy = Math.max(-PLANE.maxVy, Math.min(PLANE.maxVy, vy));
      y += vy * STEP;
      if (y < 30) {
        y = 30;
        vy = Math.max(0, vy);
      }
      const t = (s + 1) * STEP;
      const cy = y + plane.height / 2;
      if (y + plane.height >= FIELD.groundY) {
        crashed = true;
        break;
      }
      for (const item of obstacles) {
        const ix = item.x - (state.speed + item.extra) * t + item.width / 2;
        const iy = item.y + item.height / 2;
        const r = 24 + obstacleRadius(item.kind);
        const dx = pcx - ix;
        const dy = cy - iy;
        if (dx * dx + dy * dy < r * r) {
          crashed = true;
          break;
        }
      }
      if (crashed) break;
      survived = s + 1;
      for (const ring of rings) {
        const rx = ring.x - state.speed * t + ring.width / 2;
        const ry = ring.y + ring.height / 2;
        const dx = pcx - rx;
        const dy = cy - ry;
        const r = 10 + RING.inner;
        if (dx * dx + dy * dy < r * r) score += RING_STEP_SCORE;
      }
    }
    if (crashed) score = CRASH_SCORE + survived;
    else score -= Math.abs(y + plane.height / 2 - CRUISE_HEIGHT) * 0.05;
    if (score > bestScore) {
      bestScore = score;
      bestClimb = climb;
    }
  }
  return bestClimb;
}

function controlsFor(state, horizon) {
  return { climb: planClimb(state, horizon), throttle: 0, boost: false, pointerY: null };
}

/**
 * Set `world` to the named scene (start, play, rings or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'rings' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { climb: 0, throttle: 0, boost: false, pointerY: null }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'rings') {
    for (let index = 0; index < RINGS_WAIT_SECONDS / STEP; index += 1) {
      world.step(STEP, controlsFor(world.state, HORIZON_PLAY), false);
      const plane = world.state.plane;
      let near = false;
      for (let i = 0; i < world.state.items.length; i += 1) {
        const item = world.state.items[i];
        if (item.active && item.kind === KIND_RING && !item.scored && item.x > plane.x - 40 && item.x < plane.x + 430) {
          near = true;
          break;
        }
      }
      if (near) break;
    }
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.step(STEP, controlsFor(world.state, horizon), false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
