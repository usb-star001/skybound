# Skybound — a dawn flight game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/usb-star001/skybound/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/usb-star001/skybound/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A side-view endless flight game for the [make.fun "Make the best flight game" bounty](https://make.fun/c/best-flight-game-20261126-0057). Fly the dawn route: thread the gold rings, dodge birds, hot-air balloons and storm clouds, watch the fuel gauge, and see how far you get before the sky wins.

## Play

Open `game/index.html` in a desktop browser, or serve the folder and open it:

```
node serve.ts
# then open http://localhost:8080
```

No build step, no dependencies, no network requests — plain HTML, CSS and ES modules.

## Controls

| Input | Does |
| --- | --- |
| ↑ / W, ↓ / S | Climb, dive |
| ← / → | Throttle down, up |
| Shift | Boost (burns extra fuel) |
| Mouse | Steer toward the pointer's height |
| Space / click | Start, fly again |
| P | Pause |

## The game

- **Rings** — fly through a gold ring for +50 points and +5 fuel.
- **Fuel** — it drains as you fly; an empty tank means the engine quits and the plane sinks. Green fuel cans (+30) keep you going.
- **Hazards** — birds, hot-air balloons and storm clouds cost a life on contact. Three lives, with a short invulnerability window after each hit.
- **Levels** — every 25 seconds the route gets faster and busier, up to level 12.
- **Score** — distance flown plus rings threaded. Your best is kept in the browser.
- **Instruments** — the HUD shows altitude (ft), speed (kt), heading, distance (km), the fuel gauge, level, lives and best score.
- **Sound** — a small WebAudio synth (ring chime, fuel blip, hit thud); silent when audio is unavailable.

## Screenshots

Captured from the running game at 1280×720 (seed 1):

| Shot | Shows |
| --- | --- |
| `screenshots/1-start.jpg` | Title screen over the dawn route |
| `screenshots/2-play.jpg` | Level 2 flight, rings and a fuel can ahead |
| `screenshots/3-rings.jpg` | A gold ring ahead, balloon at the edge of the sky |
| `screenshots/4-end.jpg` | Game over after the third hit, storm cloud in frame |

The shots are staged by the game's own `?shot=` scenes (`?shot=start|play|rings|end`), which play the real rules forward with an autopilot, so each frame is what a short game really looks like. `?seed=N` fixes the sky for a reproducible frame.

## How it is built

- `game/src/config.js` — every number that tunes the game, in one place.
- `game/src/world.js` — the rules and state (plane, rings, hazards, fuel, score, levels); no drawing, no browser in it. One fixed 1/60 s step, seeded RNG, so a seed replays the same sky.
- `game/src/render.js` — the dawn sky, parallax ridges, ground, clouds, plane, HUD and panels; all drawn on canvas.
- `game/src/input.js` — keyboard, pointer and touch, with no scrolling or zooming while you play.
- `game/src/audio.js` — the tiny sound synth.
- `game/src/shots.js` — the autopilot that stages the screenshot scenes.
- `game/src/main.js` — boot, the loop, screens (title, play, paused, game over) and the `?shot=` staging.
- `main.ts` — the hand-in: copies `game/` and `screenshots/` to the output and writes `dossier.json`.
- `serve.ts` — a small static server for playing locally.

## License

MIT. See `LICENSE`.
