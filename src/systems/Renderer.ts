import { W, H, GROUND_Y, MAX_SPEED } from '../utils/constants';
import type { Player, Afterimage, SpriteState } from '../entities/Player';
import type { Pool } from '../core/Pool';
import type { Obstacle } from '../entities/Obstacle';
import type { Coin } from '../entities/Coin';
import type { Powerup } from '../entities/Powerup';
import type { Particle, ScorePopup, AmbientDust, Shockwave } from '../entities/Particle';
import type { Enemy } from '../entities/Enemy';
import type { Boss } from '../entities/Boss';
import type { Bullet } from '../entities/Bullet';
import type { Projectile } from '../entities/Projectile';
import { drawPlayer, drawJetFlame, drawBackground } from '../assets/Sprites';
import type { Tilemap } from './Tilemap';

/* ─── Theme System ─── */
interface ThemeColors {
  sky: [string, string, string, string];
  nebula: string;
  mountains: string;
  ground: string;
  lineGlow: string;
  grid: string;
  speedLine: string;
  buildingHue: number;
  buildingSat: number;
  buildingLight: [number, number];
  windowColor: string;
  windowBright: number;
  accent: string;
}

const THEMES: Record<string, ThemeColors> = {
  city: {
    sky: ['#040812', '#0c1428', '#141e38', '#080c16'],
    nebula: 'rgba(123,47,247,0.04)',
    mountains: '#0a1220',
    ground: '#101824',
    lineGlow: 'rgba(0,200,255,0.2)',
    grid: 'rgba(255,255,255,0.02)',
    speedLine: 'rgba(0,200,255,',
    buildingHue: 220,
    buildingSat: 18,
    buildingLight: [8, 20],
    windowColor: '255,220,150',
    windowBright: 0.08,
    accent: '#00c8ff',
  },
  factory: {
    sky: ['#0a0804', '#1a1408', '#2a1c0a', '#0e0a04'],
    nebula: 'rgba(255,120,40,0.04)',
    mountains: '#181008',
    ground: '#1a1410',
    lineGlow: 'rgba(255,160,40,0.2)',
    grid: 'rgba(255,160,80,0.025)',
    speedLine: 'rgba(255,160,40,',
    buildingHue: 25,
    buildingSat: 25,
    buildingLight: [10, 22],
    windowColor: '255,200,120',
    windowBright: 0.1,
    accent: '#ff8822',
  },
  datacenter: {
    sky: ['#020a08', '#061410', '#0a1c14', '#040e0a'],
    nebula: 'rgba(0,255,180,0.03)',
    mountains: '#061208',
    ground: '#0a1810',
    lineGlow: 'rgba(0,255,180,0.2)',
    grid: 'rgba(0,255,180,0.025)',
    speedLine: 'rgba(0,255,180,',
    buildingHue: 160,
    buildingSat: 22,
    buildingLight: [6, 18],
    windowColor: '180,255,220',
    windowBright: 0.12,
    accent: '#00ffb4',
  },
};

function getTheme(distance: number): ThemeColors {
  if (distance < 800) return THEMES.city;
  if (distance < 2000) return THEMES.factory;
  return THEMES.datacenter;
}

function lerpTheme(a: ThemeColors, b: ThemeColors, t: number): ThemeColors {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    sky: a.sky.map((_, i) => lerpColor(a.sky[i], b.sky[i], t)) as [string, string, string, string],
    nebula: lerpRGBA(a.nebula, b.nebula, t),
    mountains: lerpColor(a.mountains, b.mountains, t),
    ground: lerpColor(a.ground, b.ground, t),
    lineGlow: lerpRGBA(a.lineGlow, b.lineGlow, t),
    grid: lerpRGBA(a.grid, b.grid, t),
    speedLine: lerpRGBA(a.speedLine, b.speedLine, t),
    buildingHue: a.buildingHue + (b.buildingHue - a.buildingHue) * t,
    buildingSat: a.buildingSat + (b.buildingSat - a.buildingSat) * t,
    buildingLight: [a.buildingLight[0] + (b.buildingLight[0] - a.buildingLight[0]) * t, a.buildingLight[1] + (b.buildingLight[1] - a.buildingLight[1]) * t],
    windowColor: '', /* unused during transition, skip */
    windowBright: a.windowBright + (b.windowBright - a.windowBright) * t,
    accent: lerpColor(a.accent, b.accent, t),
  };
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseHex(a), pb = parseHex(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function lerpRGBA(a: string, b: string, t: number): string {
  const pa = parseRGBA(a), pb = parseRGBA(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  const al = pa[3] + (pb[3] - pa[3]) * t;
  return `rgba(${r},${g},${bl},${al})`;
}

function parseHex(c: string): number[] | null {
  const m = c.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function parseRGBA(c: string): number[] | null {
  const m = c.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
  return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), parseFloat(m[4])] : null;
}

/* Append hex alpha to a color string, supporting both #rrggbb and rgb(r,g,b) */
function withAlpha(c: string, a: number): string {
  if (c.startsWith('#')) return c + a.toString(16).padStart(2, '0');
  return c.replace('rgb(', 'rgba(').replace(')', ',' + (a / 255).toFixed(2) + ')');
}

const CITY_LAYERS = [
  { key: 'skyline-a', speed: 0.02, sw: 384, sh: 224, sx: 2.08, sy: 2.0 },
  { key: 'skyline-b', speed: 0.04, sw: 384, sh: 224, sx: 2.08, sy: 2.0 },
  { key: 'bg-1',       speed: 0.06, sw: 384, sh: 224, sx: 2.08, sy: 2.0 },
  { key: 'buildings-bg', speed: 0.10, sw: 384, sh: 224, sx: 2.08, sy: 2.0 },
  { key: 'bg-2',       speed: 0.14, sw: 384, sh: 224, sx: 2.08, sy: 2.0 },
  { key: 'near-buildings-bg', speed: 0.18, sw: 384, sh: 224, sx: 2.08, sy: 2.0 },
  { key: 'bg-3',       speed: 0.22, sw: 1009, sh: 224, sx: 0.8, sy: 2.0 },
];

const FACTORY_LAYERS = [
  { key: 'bg-1', speed: 0.04, sw: 384, sh: 224, sx: 2.08, sy: 2.0 },
  { key: 'bg-2', speed: 0.10, sw: 384, sh: 224, sx: 2.08, sy: 2.0 },
  { key: 'bg-3', speed: 0.20, sw: 1009, sh: 224, sx: 0.8, sy: 2.0 },
];

export class Renderer {
  private frame = 0;
  private stars: Star[] = [];

  constructor() {
    this.stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * 800, y: Math.random() * 350,
      s: 0.4 + Math.random() * 1.8, b: Math.random() * Math.PI * 2, layer: Math.floor(Math.random() * 3),
    }));
  }

  draw(ctx: CanvasRenderingContext2D, dt: number,
    gameTime: number, distance: number, scrollOffset: number, speed: number,
    player: Player, afterimages: Afterimage[],
    obstaclePool: Pool<Obstacle>, coinPool: Pool<Coin>, powerupPool: Pool<Powerup>,
    enemyPool: Pool<Enemy>,
    particlePool: Pool<Particle>, ambientPool: Pool<AmbientDust>, popupPool: Pool<ScorePopup>,
    shockwavePool?: Pool<Shockwave>,
    boss?: Boss, bulletPool?: Pool<Bullet>, projectilePool?: Pool<Projectile>,
    tilemap?: Tilemap,
    screenShake = 0,
  ): void {
    this.frame++;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    /* Screen shake via Canvas transform instead of DOM */
    if (screenShake > 0.3) {
      const sx = (Math.random() - 0.5) * screenShake * 2;
      const sy = (Math.random() - 0.5) * screenShake * 2;
      ctx.translate(sx, sy);
    }

    /* Theme selection with 200px transition zone */
    const theme = getTheme(distance);
    let nextTheme: ThemeColors | null = null;
    let transT = 0;
    if (distance >= 700 && distance < 900) {
      nextTheme = THEMES.factory; transT = (distance - 700) / 200;
    } else if (distance >= 1900 && distance < 2100) {
      nextTheme = THEMES.datacenter; transT = (distance - 1900) / 200;
    }
    const t = nextTheme ? lerpTheme(theme, nextTheme, transT) : theme;

    /* Sky base */
    ctx.fillStyle = t.sky[0];
    ctx.fillRect(-10, -10, W + 20, H + 20);

    /* Real background layers — parallax from far to near */
    const isCity = distance < 800;
    const bgLayers = isCity ? CITY_LAYERS : FACTORY_LAYERS;
    for (const layer of bgLayers) {
      const dw = layer.sw * layer.sx;
      const dh = layer.sh * layer.sy;
      /* Additive wrap: avoid floating-point % which causes tearing */
      let off = -(scrollOffset * layer.speed);
      while (off <= -dw) off += dw;
      while (off > 0) off -= dw;
      /* +1px overlap prevents sub-pixel gaps between tiled background images */
      const overlap = 1;
      drawBackground(ctx, layer.key, off, 0, dw + overlap, dh);
      drawBackground(ctx, layer.key, off + dw, 0, dw + overlap, dh);
    }

    /* Theme overlay — blend backgrounds toward current palette */
    const themeGrad = ctx.createLinearGradient(0, 0, 0, H);
    themeGrad.addColorStop(0, withAlpha(t.sky[0], 0xcc));
    themeGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    themeGrad.addColorStop(1, withAlpha(t.sky[3], 0x88));
    ctx.fillStyle = themeGrad;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    /* Nebula glow */
    const nebX = Math.sin(gameTime * 0.02) * 200 + 400;
    const ng = ctx.createRadialGradient(nebX, 120, 10, nebX, 120, 250);
    ng.addColorStop(0, t.nebula);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, W, H);

    /* Stars */
    for (const s of this.stars) {
      const flicker = 0.4 + 0.6 * Math.sin(this.frame * 0.015 + s.b);
      const parallax = s.layer * 0.3;
      const sx = ((s.x - scrollOffset * parallax) % (W + 100) + W + 100) % (W + 100) - 50;
      ctx.globalAlpha = flicker * (0.5 + s.layer * 0.25);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, s.y, s.s * (0.5 + s.layer * 0.3), 0, Math.PI * 2); ctx.fill();
      if (s.s > 1.2 && flicker > 0.7) {
        ctx.globalAlpha = flicker * 0.15;
        ctx.beginPath(); ctx.arc(sx, s.y, s.s * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    /* Ambient dust */
    ambientPool.forEachActive(d => d.draw(ctx));

    /* Ground — tilemap */
    if (tilemap) {
      tilemap.draw(ctx);
      tilemap.drawCoins(ctx);
    } else {
      ctx.fillStyle = t.ground;
      ctx.fillRect(-10, GROUND_Y, W + 20, 80);
    }

    const lineGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 4);
    lineGrad.addColorStop(0, t.lineGlow);
    lineGrad.addColorStop(0.5, t.lineGlow);
    lineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(-10, GROUND_Y, W + 20, 4);

    const gridOff = -(scrollOffset * 0.6) % 40;
    ctx.strokeStyle = t.grid;
    ctx.lineWidth = 1;
    for (let x = gridOff; x < W + 40; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 4); ctx.lineTo(x, H); ctx.stroke();
    }

    /* Speed lines */
    if (speed > 350) {
      const intensity = Math.min(1, (speed - 350) / 300);
      ctx.strokeStyle = `${t.speedLine}${intensity * 0.06})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 8 + intensity * 12; i++) {
        const sx = Math.random() * W;
        const sy = Math.random() * (GROUND_Y - 40) + 20;
        const len = 20 + intensity * 50;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - len - Math.random() * 30, sy + (Math.random() - 0.5) * 20);
        ctx.stroke();
      }
    }

    /* Coins */
    coinPool.forEachActive(c => { if (c.x < W + 40) c.draw(ctx); });

    /* Obstacles */
    obstaclePool.forEachActive(o => { if (o.x < W + 40) o.draw(ctx); });

    /* Powerups */
    powerupPool.forEachActive(p => { if (p.x < W + 40) p.draw(ctx); });

    /* Boss */
    if (boss && boss.active) boss.draw(ctx, gameTime);

    /* Bullets */
    if (bulletPool) bulletPool.forEachActive(b => { if (b.x < W + 40) b.draw(ctx); });

    /* Player projectiles */
    if (projectilePool) projectilePool.forEachActive(p => { if (p.x < W + 40) p.draw(ctx); });

    /* Enemies */
    enemyPool.forEachActive(e => { if (e.x < W + 40) e.draw(ctx); });

    /* Ghost dash trail */
    if (player.character === 'ghost' && player.dashTrail.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const t of player.dashTrail) {
        ctx.globalAlpha = t.alpha * 0.4;
        ctx.fillStyle = '#7b2ff7';
        ctx.fillRect(t.x - player.w / 2, t.y - player.h, player.w, player.h);
        ctx.globalAlpha = t.alpha * 0.15;
        ctx.fillStyle = '#00c8ff';
        ctx.fillRect(t.x - player.w / 2 - 2, t.y - player.h - 2, player.w + 4, player.h + 4);
      }
      ctx.restore();
    }

    /* Player shadow */
    const shadowScale = Math.max(0.3, 1 - (GROUND_Y - player.y) / 120);
    ctx.fillStyle = `rgba(0,0,0,${shadowScale * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(player.x, GROUND_Y + 2, player.w * 0.6 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Afterimages with speed skew */
    const skew = Math.min(1, speed / MAX_SPEED) * 0.5;
    for (const a of afterimages) {
      const alpha = (a.life / a.maxLife) * (a.overclock ? 0.5 : 0.25);
      ctx.save();
      ctx.translate(a.x, a.y);
      if (skew > 0.02) ctx.transform(1, 0, skew, 1, 0, 0);
      if (a.overclock) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(0, -player.h / 2, player.w * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      drawPlayer(ctx, a.state,
        0, 0, player.w, player.h, a.squash,
        a.boost, false, alpha, player.character, undefined, a.animFrame ?? 0);
      ctx.restore();
    }

    /* Jet flame */
    if (!player.onGround && player.vy < 0) {
      drawJetFlame(ctx, player.x, player.y);
    }

    /* Player */
    drawPlayer(ctx, player.spriteState,
      player.x, player.y, player.w, player.h, player.squash,
      player.powerups.boost > 0,
      player.invincible > 0, 1, player.character, player.ability ?? undefined,
      player.animFrame);

    /* Shield aura */
    if (player.powerups.shield > 0) {
      ctx.strokeStyle = `rgba(0,200,255,${0.15 + 0.1 * Math.sin(gameTime * 5)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y - player.h / 2, player.h * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* Trail particles */
    for (const t of player.trail) {
      ctx.globalAlpha = (t.life / 0.25) * 0.2;
      ctx.fillStyle = '#00c8ff';
      ctx.fillRect(t.x, t.y, 2, 2);
    }
    ctx.globalAlpha = 1;

    /* Particles */
    particlePool.forEachActive(p => p.draw(ctx));

    /* Shockwaves */
    if (shockwavePool) shockwavePool.forEachActive(p => p.draw(ctx));

    /* Score popups */
    popupPool.forEachActive(p => p.draw(ctx));

    ctx.restore();
  }
}

interface Star { x: number; y: number; s: number; b: number; layer: number; }
interface CityBlock { x: number; w: number; h: number; c: string; hueOff: number; satOff: number; lightOff: number; windows: boolean[]; }
interface Mountain { x: number; w: number; h: number; }
