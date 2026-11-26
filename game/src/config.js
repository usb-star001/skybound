// Skybound — every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 640 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The plane sits at this x; the world scrolls past it. */
export const PLANE_X = 300;

export const PLANE = {
  width: 88,
  height: 30,
  /** Vertical acceleration while climbing or diving, px/s^2. */
  climbAccel: 1500,
  diveAccel: 1500,
  /** Gentle pull back toward level flight, px/s^2. */
  gravity: 420,
  maxVy: 460,
  /** Seconds of mercy after a hit. */
  invulnerable: 1.5,
};

export const SPEED = {
  base: 250,
  min: 150,
  max: 430,
  perLevel: 14,
  /** How fast the throttle eases toward its target, per second. */
  ease: 1.6,
  /** Extra scroll speed while boosting. */
  boost: 170,
};

export const FUEL = {
  start: 100,
  /** Drain per second at cruise, plus this much again at full throttle. */
  drain: 0.55,
  throttleDrain: 0.35,
  /** Extra drain while boosting. */
  boostDrain: 1.6,
  /** Fuel a can gives back. */
  can: 30,
  /** Fuel a ring gives back. */
  ring: 5,
};

export const LIVES = 3;

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 25, max: 12 };

export const RING = {
  radius: 46,
  /** Inner radius the plane's centre must pass inside. */
  inner: 30,
  interval: 2.1,
  intervalJitter: 0.9,
  points: 50,
  minY: 110,
  maxY: 560,
};

export const BIRD = {
  width: 34,
  height: 18,
  /** Extra leftward speed over the world's scroll. */
  extra: 70,
  extraJitter: 50,
  interval: 1.7,
  intervalJitter: 0.9,
  intervalScale: 0.93,
  minInterval: 0.55,
};

export const BALLOON = {
  width: 64,
  height: 84,
  extra: 12,
  interval: 4.6,
  intervalJitter: 1.6,
  intervalScale: 0.94,
  minInterval: 2.2,
};

export const STORM = {
  width: 110,
  height: 64,
  extra: 25,
  interval: 6.0,
  intervalJitter: 2.0,
  intervalScale: 0.95,
  minInterval: 3.0,
};

export const FUELCAN = {
  size: 30,
  interval: 5.2,
  intervalJitter: 1.8,
};

export const CLOUD = { count: 14 };

/** How many moving things can exist at once; pools are allocated once, at boot. */
export const POOL_SIZE = 96;
export const PARTICLE_POOL = 160;

/** Feet shown per pixel of height, and knots per px/s of scroll speed. */
export const ALT_FEET_PER_PX = 3;
export const KNOTS_PER_PX = 0.55;

export const PALETTE = {
  backdrop: '#141a2e',
  skyTop: '#232a4d',
  skyMid: '#6b4a6e',
  skyLow: '#ff9e57',
  sun: '#ffd9a0',
  sunGlow: 'rgba(255, 190, 110, 0.35)',
  farRidge: '#4a3f66',
  nearRidge: '#3a2f52',
  ground: '#2c4632',
  groundDark: '#223728',
  road: '#6b5a44',
  cloud: 'rgba(255, 244, 230, 0.85)',
  cloudFar: 'rgba(255, 244, 230, 0.45)',
  plane: '#f2f5f7',
  planeStripe: '#e5534b',
  planeWing: '#dfe6ea',
  canopy: '#7fd4f7',
  prop: 'rgba(220, 230, 240, 0.5)',
  ring: '#f2c94c',
  ringGlow: 'rgba(242, 201, 76, 0.45)',
  bird: '#2b2f3a',
  balloon: '#e5534b',
  balloonAlt: '#f2c94c',
  storm: '#3a3f4d',
  stormDark: '#2c303c',
  fuelCan: '#e5534b',
  fuelText: '#ffffff',
  panel: 'rgba(13, 18, 32, 0.78)',
  panelEdge: 'rgba(242, 201, 76, 0.55)',
  text: '#eef1f5',
  muted: '#aab3c5',
  amber: '#f2c94c',
  cyan: '#4fc3f7',
  green: '#7ddc8a',
  red: '#ff6b5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'skybound.best';
