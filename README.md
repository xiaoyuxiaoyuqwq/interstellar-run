# 星际跑酷 · 豪华版

A cyberpunk-themed side-scrolling runner built with **TypeScript + HTML5 Canvas**.

## Features

- **3 characters** — STRK-01 shooter, GHST-07 phase dash, TNK-03 sword tank
- **Skill tree** — spend coins on permanent upgrades (lives, speed, magnet, damage…)
- **Double jump & ground pound** — tap ↑ in air, hold ↓ to slam
- **Slide & laser gates** — slide under the beam for a 擦弹 near-miss bonus
- **4 powerups** — shield, magnet, ×2 score, speed boost
- **Combo system** — chain coin collections for bonus points
- **Boss fights** — every 2000m, defeat the AI guardian for blessing rewards
- **Dynamic difficulty** — speed ramps, obstacle variety scales with distance
- **Visual polish** — parallax starfield, neon cityscape, afterimage trails, ambient dust, screen shake, hit-stop, theme shifts (city → factory → datacenter)
- **Settings** — SFX / BGM / FX particles / screen shake toggles
- **Web Audio** — synthesized sound effects (no asset files)
- **Touch support** — tap to jump, swipe to stomp/dash/attack

## Architecture

```
src/
├── core/          Game loop, object pool, abstract Drawable
│   ├── Game.ts    Facade — wires all systems together
│   ├── Pool.ts    Generic typed object pool
│   └── Drawable.ts
├── entities/      Game objects (Poolable)
│   ├── Player.ts  Physics, double jump, stomp, powerup timers
│   ├── Obstacle.ts
│   ├── Coin.ts
│   ├── Powerup.ts
│   └── Particle.ts
├── systems/       Systems layer
│   ├── Spawner.ts Procedural generation + difficulty scaling
│   ├── Renderer.ts Layered draw pipeline
│   └── Audio.ts   Web Audio tone synthesis
├── ui/            DOM overlay management
│   ├── HUD.ts     Score, lives, combo, progress bar
│   └── Screens.ts Title, pause, game-over screens
└── utils/
    ├── constants.ts
    └── math.ts
```

## Development

```bash
npm install
npm run dev        # → http://localhost:5173
```

## Build

```bash
npm run build      # outputs to dist/
```

## Deploy

Pushing to `main` triggers GitHub Pages deployment via `.github/workflows/deploy.yml`.

The site is served from `dist/`. The `base` path in `vite.config.ts` is set to `/interstellar-run/` to match this repo name — update it if you rename the repo.

## Controls

| Key | Action |
|-----|--------|
| Space / ↑ / Click | Jump (↑ for double jump) |
| ↓ | Slide / ground pound |
| Z | Shoot (STRK-01) / sword (TNK-03) |
| X | Dash (GHST-07) |
| P | Pause |

## License

MIT
