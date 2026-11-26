// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. A dawn sky, a low sun, two parallax ridges, a rolling airfield
// below, and the plane, rings, birds, balloons, storm clouds and fuel cans over it.
// Text that holds a number is rebuilt only when the number changes, so a frame
// allocates nothing.
import {
  ALT_FEET_PER_PX, FIELD, FONT, FUEL, KNOTS_PER_PX, LIVES, PALETTE, PLANE,
} from './config.js';
import { KIND_BALLOON, KIND_BIRD, KIND_FUELCAN, KIND_RING, KIND_STORM, hash01 } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 150, line: 32, bottom: 64 };
const SUN = { x: 1060, y: 170, r: 58 };

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const distLabel = cachedLabel('DIST ');
  const levelLabel = cachedLabel('LEVEL ');
  const altLabel = cachedLabel('ALT ');
  const spdLabel = cachedLabel('SPD ');
  const hdgLabel = cachedLabel('HDG ');
  const fuelLabel = cachedLabel('FUEL ');
  const finalLabel = cachedLabel('SCORE ');
  const finalBestLabel = cachedLabel('BEST ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** A canvas pixel height (client pixels) into a field height. */
  function toFieldY(clientY) {
    const rect = canvas.getBoundingClientRect();
    return (clientY - rect.top - view.y / (window.devicePixelRatio || 1)) / view.scale;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawSky(state) {
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(0.55, PALETTE.skyMid);
    grad.addColorStop(0.85, PALETTE.skyLow);
    grad.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Low sun with a soft glow.
    const glow = context.createRadialGradient(SUN.x, SUN.y, SUN.r * 0.2, SUN.x, SUN.y, SUN.r * 3.2);
    glow.addColorStop(0, PALETTE.sunGlow);
    glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
    context.fillStyle = glow;
    context.fillRect(SUN.x - SUN.r * 3.2, SUN.y - SUN.r * 3.2, SUN.r * 6.4, SUN.r * 6.4);
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2);
    context.fill();
  }

  function drawCloud(x, y, scale, alpha) {
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = PALETTE.cloud;
    context.beginPath();
    context.arc(x, y, 26 * scale, 0, Math.PI * 2);
    context.arc(x + 24 * scale, y + 6 * scale, 20 * scale, 0, Math.PI * 2);
    context.arc(x - 24 * scale, y + 8 * scale, 18 * scale, 0, Math.PI * 2);
    context.arc(x + 6 * scale, y - 12 * scale, 20 * scale, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawRidge(state, world, parallax, baseY, ridgeFn, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, FIELD.height);
    for (let x = 0; x <= FIELD.width; x += 16) {
      const wx = state.scrollX * parallax + x;
      context.lineTo(x, ridgeFn(wx));
    }
    context.lineTo(FIELD.width, FIELD.height);
    context.closePath();
    context.fill();
    void baseY;
    void world;
  }

  function drawGround(state) {
    // Grass strip.
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.groundDark;
    context.fillRect(0, FIELD.groundY, FIELD.width, 6);
    // A dirt road across the strip.
    context.fillStyle = PALETTE.road;
    context.fillRect(0, FIELD.groundY + 34, FIELD.width, 16);
    context.fillStyle = 'rgba(238, 241, 245, 0.55)';
    const dash = 46;
    const offset = -(state.scrollX % (dash * 2));
    for (let x = offset; x < FIELD.width; x += dash * 2) {
      context.fillRect(x, FIELD.groundY + 40, dash, 4);
    }
    // Trees and little houses, placed by a hash of their segment so they never jump.
    const segW = 170;
    const first = Math.floor(state.scrollX / segW) - 1;
    const last = Math.ceil((state.scrollX + FIELD.width) / segW) + 1;
    for (let seg = first; seg <= last; seg += 1) {
      const h = hash01(seg * 7 + 3);
      const x = seg * segW - state.scrollX + h * 90;
      if (x < -60 || x > FIELD.width + 60) continue;
      if (h < 0.34) {
        // Pine.
        context.fillStyle = '#1d3a24';
        context.beginPath();
        context.moveTo(x, FIELD.groundY - 34);
        context.lineTo(x - 13, FIELD.groundY + 2);
        context.lineTo(x + 13, FIELD.groundY + 2);
        context.closePath();
        context.fill();
        context.fillStyle = '#2c4632';
        context.beginPath();
        context.moveTo(x, FIELD.groundY - 22);
        context.lineTo(x - 10, FIELD.groundY + 2);
        context.lineTo(x + 10, FIELD.groundY + 2);
        context.closePath();
        context.fill();
      } else if (h < 0.52) {
        // House with a lit window.
        context.fillStyle = '#5a4632';
        context.fillRect(x - 16, FIELD.groundY - 22, 32, 22);
        context.fillStyle = '#8a5a3c';
        context.beginPath();
        context.moveTo(x - 19, FIELD.groundY - 22);
        context.lineTo(x, FIELD.groundY - 34);
        context.lineTo(x + 19, FIELD.groundY - 22);
        context.closePath();
        context.fill();
        context.fillStyle = PALETTE.amber;
        context.fillRect(x - 4, FIELD.groundY - 14, 8, 8);
      }
    }
  }

  function drawRing(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const r = item.width / 2;
    context.save();
    context.shadowColor = PALETTE.ringGlow;
    context.shadowBlur = 18;
    context.strokeStyle = PALETTE.ring;
    context.lineWidth = 7;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = '#fff3c4';
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(cx, cy, r - 5, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawBird(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const flap = Math.sin(item.flap) * 8;
    context.strokeStyle = PALETTE.bird;
    context.lineWidth = 3.5;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(cx - 15, cy - flap);
    context.quadraticCurveTo(cx - 5, cy + 4, cx, cy);
    context.quadraticCurveTo(cx + 5, cy + 4, cx + 15, cy - flap);
    context.stroke();
  }

  function drawBalloon(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    context.fillStyle = PALETTE.balloon;
    context.beginPath();
    context.arc(cx, cy - 12, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.balloonAlt;
    context.beginPath();
    context.ellipse(cx, cy - 12, 10, 26, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#3a2f2a';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cx - 14, cy + 8);
    context.lineTo(cx - 8, cy + 22);
    context.moveTo(cx + 14, cy + 8);
    context.lineTo(cx + 8, cy + 22);
    context.stroke();
    context.fillStyle = '#6b4a2f';
    context.fillRect(cx - 9, cy + 22, 18, 14);
  }

  function drawStorm(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    context.fillStyle = PALETTE.storm;
    context.beginPath();
    context.arc(cx - 26, cy + 6, 22, 0, Math.PI * 2);
    context.arc(cx, cy - 10, 28, 0, Math.PI * 2);
    context.arc(cx + 26, cy + 6, 22, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.stormDark;
    context.beginPath();
    context.arc(cx - 12, cy + 14, 20, 0, Math.PI * 2);
    context.arc(cx + 14, cy + 14, 20, 0, Math.PI * 2);
    context.fill();
    // Rain under the cloud.
    context.strokeStyle = 'rgba(174, 194, 224, 0.5)';
    context.lineWidth = 2;
    context.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const rx = cx - 36 + i * 18;
      context.moveTo(rx, cy + 26);
      context.lineTo(rx - 5, cy + 44);
    }
    context.stroke();
  }

  function drawFuelCan(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    context.fillStyle = PALETTE.fuelCan;
    context.beginPath();
    context.roundRect(cx - 13, cy - 15, 26, 30, 5);
    context.fill();
    context.fillStyle = PALETTE.fuelText;
    context.font = `bold 20px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('F', cx, cy + 1);
  }

  function drawPlane(state) {
    const plane = state.plane;
    const cx = plane.x + plane.width / 2;
    const cy = plane.y + plane.height / 2;
    const bank = Math.max(-0.32, Math.min(0.32, plane.vy * 0.00062));
    const propAngle = state.elapsed * 42;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (plane.invulnerable > 0 && Math.floor(plane.invulnerable * 10) % 2 === 0) return;
    context.save();
    context.translate(cx, cy);
    context.rotate(bank);
    // Tail fin.
    context.fillStyle = PALETTE.planeStripe;
    context.beginPath();
    context.moveTo(-34, -4);
    context.lineTo(-46, -22);
    context.lineTo(-36, -22);
    context.lineTo(-24, -4);
    context.closePath();
    context.fill();
    // Rear wing.
    context.fillStyle = PALETTE.planeWing;
    context.beginPath();
    context.moveTo(-18, 2);
    context.lineTo(-34, 12);
    context.lineTo(-26, 14);
    context.lineTo(-10, 6);
    context.closePath();
    context.fill();
    // Fuselage.
    context.fillStyle = PALETTE.plane;
    context.beginPath();
    context.ellipse(0, 0, 44, 13, 0, 0, Math.PI * 2);
    context.fill();
    // Red cheatline.
    context.fillStyle = PALETTE.planeStripe;
    context.beginPath();
    context.ellipse(2, 4, 40, 5, 0, 0, Math.PI);
    context.fill();
    // Main wing.
    context.fillStyle = PALETTE.planeWing;
    context.beginPath();
    context.moveTo(-6, -8);
    context.lineTo(16, -26);
    context.lineTo(24, -24);
    context.lineTo(10, -4);
    context.closePath();
    context.fill();
    // Canopy with a shine.
    context.fillStyle = PALETTE.canopy;
    context.beginPath();
    context.ellipse(16, -9, 13, 8, -0.15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.75)';
    context.beginPath();
    context.ellipse(12, -12, 5, 3, -0.4, 0, Math.PI * 2);
    context.fill();
    // Propeller: a blurred disc and two blades.
    context.fillStyle = PALETTE.prop;
    context.beginPath();
    context.ellipse(46, 0, 4, 17, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#2b2f3a';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(46, 0);
    context.lineTo(46 + Math.cos(propAngle) * 17, Math.sin(propAngle) * 17);
    context.moveTo(46, 0);
    context.lineTo(46 - Math.cos(propAngle) * 17, -Math.sin(propAngle) * 17);
    context.stroke();
    context.fillStyle = '#2b2f3a';
    context.beginPath();
    context.arc(46, 0, 3.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawParticles(state) {
    for (let index = 0; index < state.particles.length; index += 1) {
      const p = state.particles[index];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(scoreLabel(Math.floor(state.score)), 24, 18, 28, PALETTE.text, 'left');
    text(bestLabel(Math.floor(best)), 24, 48, 18, PALETTE.muted, 'left');
    text(levelLabel(state.level), FIELD.width / 2, 18, 28, PALETTE.text, 'center');
    // Lives as little planes.
    const lifeX = FIELD.width - 24 - LIVES * 30;
    text('LIVES', lifeX - 12, 18, 28, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      const x = lifeX + life * 30;
      context.fillStyle = life < state.lives ? PALETTE.cyan : 'rgba(139, 147, 163, 0.4)';
      context.beginPath();
      context.moveTo(x, 26);
      context.lineTo(x + 12, 22);
      context.lineTo(x + 22, 26);
      context.lineTo(x + 12, 30);
      context.closePath();
      context.fill();
    }

    // Instrument strip: altitude, speed, heading, distance, fuel.
    const barY = 76;
    const barH = 44;
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.roundRect(24, barY, FIELD.width - 48, barH, 10);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.stroke();
    const altFt = Math.max(0, Math.round((FIELD.groundY - (state.plane.y + state.plane.height)) * ALT_FEET_PER_PX));
    const spdKt = Math.round(state.speed * KNOTS_PER_PX);
    const distKm = (state.distanceM / 1000).toFixed(1);
    text(altLabel(`${altFt} FT`), 48, barY + 12, 22, PALETTE.amber, 'left');
    text(spdLabel(`${spdKt} KT`), 260, barY + 12, 22, PALETTE.cyan, 'left');
    text(hdgLabel('090°'), 470, barY + 12, 22, PALETTE.text, 'left');
    text(distLabel(`${distKm} KM`), 640, barY + 12, 22, PALETTE.text, 'left');
    // Fuel gauge.
    const fuelX = 860;
    const fuelW = 300;
    text(fuelLabel(''), fuelX - 12, barY + 12, 22, PALETTE.text, 'right');
    context.fillStyle = 'rgba(238, 241, 245, 0.15)';
    context.beginPath();
    context.roundRect(fuelX, barY + 13, fuelW, 18, 9);
    context.fill();
    const fuelFrac = Math.max(0, Math.min(1, state.fuel / 100));
    context.fillStyle = state.fuelEmpty || fuelFrac < 0.2 ? PALETTE.red : fuelFrac < 0.45 ? PALETTE.amber : PALETTE.green;
    if (fuelFrac > 0) {
      context.beginPath();
      context.roundRect(fuelX, barY + 13, fuelW * fuelFrac, 18, 9);
      context.fill();
    }
    if (state.fuelEmpty) {
      text('FUEL EMPTY', fuelX + fuelW + 16, barY + 12, 22, PALETTE.red, 'left');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.roundRect(x, y, PANEL.width, height, 14);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1.5;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 23, PALETTE.amber, 'center');
  }

  const TITLE_LINES = [
    'Fly the dawn route. Thread the gold rings.',
    'Climb with ↑ or W, dive with ↓ or S. ← → throttle, Shift boost.',
    'The mouse steers too. P pauses. Watch the fuel.',
    '',
  ];
  const PAUSED_LINES = ['The sky will wait for you.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the sky, the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, world) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state);
    // Far clouds behind the ridges.
    for (let index = 0; index < state.clouds.length; index += 1) {
      const cloud = state.clouds[index];
      if (cloud.parallax < 0.18) drawCloud(cloud.x, cloud.y, cloud.scale, 0.5);
    }
    drawRidge(state, world, 0.15, 0, world.farRidgeY, PALETTE.farRidge);
    drawRidge(state, world, 0.35, 0, world.nearRidgeY, PALETTE.nearRidge);
    drawGround(state);
    // Near clouds in front of the ridges.
    for (let index = 0; index < state.clouds.length; index += 1) {
      const cloud = state.clouds[index];
      if (cloud.parallax >= 0.18) drawCloud(cloud.x, cloud.y, cloud.scale, 0.8);
    }
    // Items, back to front by kind: rings first, then the rest.
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || item.kind !== KIND_RING) continue;
      drawRing(item);
    }
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active) continue;
      if (item.kind === KIND_BIRD) drawBird(item);
      else if (item.kind === KIND_BALLOON) drawBalloon(item);
      else if (item.kind === KIND_STORM) drawStorm(item);
      else if (item.kind === KIND_FUELCAN) drawFuelCan(item);
    }
    drawParticles(state);
    drawPlane(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = bestLabel(Math.floor(best));
      drawPanel('SKYBOUND', TITLE_LINES, 'Press Space or click to fly');
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(Math.floor(state.score));
      OVER_LINES[1] = finalBestLabel(Math.floor(best));
      drawPanel(state.overReason === 'Out of fuel' ? 'Out of fuel' : 'Game over', OVER_LINES, 'Press Space or click to fly again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toFieldY };
}
