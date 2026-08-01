import { AssetManager } from '../systems/AssetManager';

/* Resolve asset paths against the deploy base (Vite base for GitHub Pages subpath) */
export function assetUrl(p: string): string {
  return import.meta.env.BASE_URL + p.replace(/^\//, '');
}

const ATLAS_KEY = 'game_atlas';
let atlasData: AtlasData | null = null;

interface AtlasFrame {
  x: number; y: number; w: number; h: number;
  sourceW: number; sourceH: number;
}

interface AtlasData {
  frames: Record<string, AtlasFrame>;
}

export async function loadAtlas(): Promise<void> {
  await AssetManager.load(assetUrl('/assets/sprites/atlas.png'), ATLAS_KEY);
  try {
    const resp = await fetch(assetUrl('/assets/sprites/atlas.json'));
    const raw = await resp.json();
    const frames: Record<string, AtlasFrame> = {};
    for (const f of raw.frames) {
      frames[f.filename] = {
        x: f.frame.x, y: f.frame.y, w: f.frame.w, h: f.frame.h,
        sourceW: f.sourceSize.w, sourceH: f.sourceSize.h,
      };
    }
    atlasData = { frames };
  } catch { atlasData = null; }
}

/* Sub-pixel jitter fix: snap to integer grid */
function rx(v: number): number { return Math.round(v); }

function drawAtlas(
  ctx: CanvasRenderingContext2D,
  name: string,
  dx: number, dy: number, dw: number, dh: number,
  alpha = 1,
): boolean {
  if (!atlasData) return false;
  const f = atlasData.frames[name];
  if (!f) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  const drawn = AssetManager.draw(ctx, ATLAS_KEY, f.x, f.y, f.w, f.h, rx(dx), rx(dy), rx(dw), rx(dh));
  ctx.restore();
  return drawn;
}

/* ─── Player ─── */
const PLAYER_SRC_W = 71;
const PLAYER_SRC_H = 67;
const PLAYER_DRAW_W = 34;
const PLAYER_DRAW_H = 40;

const RUN_FRAMES = ['run-1','run-2','run-3','run-4','run-5','run-6','run-7','run-8'];
const RUN_SHOOT_FRAMES = ['run-shoot-1','run-shoot-2','run-shoot-3','run-shoot-4',
  'run-shoot-5','run-shoot-6','run-shoot-7','run-shoot-8'];
const JUMP_FRAMES = ['jump-1','jump-2','jump-3','jump-4'];
const IDLE_FRAMES = ['idle-1','idle-2','idle-3','idle-4'];

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  state: 'run1' | 'run2' | 'jump' | 'fall' | 'run_shoot' | 'slide',
  x: number, y: number, w: number, h: number, squash: number,
  boost: boolean, invincible: boolean, alpha = 1,
  character = 'striker',
  ability?: { type: 'shoot' | 'dash' | 'sword'; progress: number },
  animFrame = 0,
): void {
  let name: string;
  if (state === 'slide') {
    name = JUMP_FRAMES[3];
  } else if (state === 'jump' || state === 'fall') {
    name = JUMP_FRAMES[state === 'fall' ? 3 : 2];
  } else if (state === 'run_shoot') {
    const idx = animFrame % 8;
    name = RUN_SHOOT_FRAMES[idx];
  } else {
    const idx = animFrame % 8;
    name = RUN_FRAMES[idx];
  }

  ctx.save();
  ctx.globalAlpha = invincible && Math.floor(performance.now() * 10) % 2 === 0 ? 0.4 : alpha;
  ctx.translate(rx(x), rx(y));
  ctx.scale(2 - squash, squash);

  const dw = PLAYER_DRAW_W;
  const dh = state === 'slide' ? h * 1.2 : PLAYER_DRAW_H;
  const drew = drawAtlas(ctx, name, -dw / 2, -dh, dw, dh, alpha);

  if (!drew) {
    ctx.fillStyle = character === 'striker' ? '#00c8ff' : character === 'ghost' ? '#7b2ff7' : '#ff6b6b';
    ctx.fillRect(rx(-w / 2), rx(-h), rx(w), rx(h));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rx(-2), rx(-h - 2), 4, 4);
  }

  if (character === 'tank') {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(rx(dw * 0.15 - 1), rx(-dh - 8), 3, 14);
    if (ability?.type === 'sword') {
      ctx.save();
      ctx.translate(rx(dw * 0.15), rx(-dh + 2));
      ctx.rotate(ability.progress * 1.5);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-2, -24, 3, 22);
      ctx.restore();
    }
  }

  /* Ghost dash trail */
  if (character === 'ghost' && ability?.type === 'dash') {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#7b2ff7';
    ctx.fillRect(rx(-dw / 2 - 16), rx(-dh), 16, dh);
  }

  /* Boost glow */
  if (boost) {
    ctx.globalAlpha = 0.2 + 0.15 * Math.sin(performance.now() * 0.008);
    ctx.fillStyle = '#7b2ff7';
    ctx.beginPath();
    ctx.arc(0, rx(-dh / 2), Math.max(dw, dh) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Enemies ─── */
const DRONE_FRAMES = ['drone-1','drone-2','drone-3','drone-4'];
const TURRET_FRAMES = ['turret-1','turret-2','turret-3','turret-4','turret-5','turret-6'];
const ENFORCER_FRAMES =
  ['walk-1','walk-2','walk-3','walk-4','walk-5','walk-6','walk-7','walk-8',
   'walk-9','walk-10','walk-11','walk-12','walk-13','walk-14','walk-15','walk-16'];
const ENEMY_EXPLOSION = ['enemy-explosion-1','enemy-explosion-2','enemy-explosion-3',
  'enemy-explosion-4','enemy-explosion-5','enemy-explosion-6'];

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  type: string, x: number, y: number, w: number, h: number,
  bobPhase: number, flash: boolean,
  animFrame = 0,
): void {
  const bob = type === 'drone' ? Math.sin(bobPhase) * 4 : 0;
  const dy = y + bob;
  let name: string | undefined;
  if (type === 'drone') {
    name = DRONE_FRAMES[Math.floor(bobPhase * 2) % 4];
  } else if (type === 'turret') {
    const idx = Math.floor(animFrame / 3) % 6;
    name = TURRET_FRAMES[idx];
  } else if (type === 'enforcer') {
    const idx = Math.floor(animFrame / 2) % 16;
    name = ENFORCER_FRAMES[idx];
  }

  ctx.save();
  ctx.globalAlpha = flash ? 0.7 : 1;

  const drew = name ? drawAtlas(ctx, name, rx(x), rx(dy), rx(w), rx(h)) : false;
  if (!drew) {
    ctx.fillStyle = type === 'drone' ? '#ff6b6b' : type === 'turret' ? '#ff8844' : '#7b2ff7';
    ctx.fillRect(rx(x), rx(dy), rx(w), rx(h));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx(x), rx(dy), rx(w), rx(h));
  }
  ctx.restore();
}

export function drawEnemyExplosion(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, frame: number,
): void {
  const name = ENEMY_EXPLOSION[Math.min(frame, ENEMY_EXPLOSION.length - 1)];
  const drew = drawAtlas(ctx, name, rx(x - 16), rx(y - 16), 32, 32);
  if (!drew) {
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(rx(x), rx(y), 8 + frame * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ─── Tileset ─── */
export const TILE_SRC_SIZE = 16;
export const TILE_DEST_SIZE = 32;
const TILESET_KEY = 'tileset';

/* Tile source regions in tileset.png (24 cols × 16 rows of 16×16 tiles) */
const TILE_SRC: Record<string, { sx: number; sy: number }> = {
  ground_top:   { sx: 0 * TILE_SRC_SIZE, sy: 0 * TILE_SRC_SIZE },
  ground_fill:  { sx: 1 * TILE_SRC_SIZE, sy: 0 * TILE_SRC_SIZE },
  wall:         { sx: 2 * TILE_SRC_SIZE, sy: 0 * TILE_SRC_SIZE },
  platform:     { sx: 3 * TILE_SRC_SIZE, sy: 0 * TILE_SRC_SIZE },
  crate:        { sx: 4 * TILE_SRC_SIZE, sy: 0 * TILE_SRC_SIZE },
  metal:        { sx: 5 * TILE_SRC_SIZE, sy: 0 * TILE_SRC_SIZE },
};

export async function loadTileset(): Promise<void> {
  await AssetManager.load(assetUrl('/assets/sprites/tileset.png'), TILESET_KEY);
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tileId: string,
  dx: number, dy: number, dw?: number, dh?: number,
): void {
  const src = TILE_SRC[tileId];
  if (!src) return;
  const img = AssetManager.get(TILESET_KEY);
  if (!img) return;
  const dt = dw ?? TILE_DEST_SIZE;
  const dh2 = dh ?? dt;
  ctx.drawImage(img, src.sx, src.sy, TILE_SRC_SIZE, TILE_SRC_SIZE,
    rx(dx), rx(dy), rx(dt), rx(dh2));
}

/* ─── Obstacles (tile-based) ─── */
export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  type: string, x: number, y: number, w: number, h: number,
): void {
  ctx.save();
  if (type === 'gate') {
    /* Laser gate: two pylons + pulsing beam (slide under = 擦弹) */
    const beamY = y + h / 2;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012 + x * 0.01);
    ctx.fillStyle = '#16222e';
    ctx.fillRect(rx(x), rx(y), 5, rx(h));
    ctx.fillRect(rx(x + w - 5), rx(y), 5, rx(h));
    ctx.fillStyle = 'rgba(255,80,80,0.5)';
    ctx.fillRect(rx(x), rx(y + h / 2 - 1), 2, 2);
    ctx.fillRect(rx(x + w - 2), rx(y + h / 2 - 1), 2, 2);
    /* Beam glow (additive) */
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255,60,60,${0.25 + 0.15 * pulse})`;
    ctx.fillRect(rx(x), rx(beamY - 5), rx(w), 10);
    ctx.fillStyle = `rgba(255,120,120,${0.5 + 0.3 * pulse})`;
    ctx.fillRect(rx(x), rx(beamY - 2), rx(w), 4);
    ctx.fillStyle = 'rgba(255,220,220,0.9)';
    ctx.fillRect(rx(x), rx(beamY - 0.5), rx(w), 1);
    ctx.restore();
    return;
  }
  /* Try tileset first */
  const tileMap: Record<string, string> = {
    crate: 'crate', tall: 'wall', moving: 'metal', flyer: 'platform',
  };
  const tileId = tileMap[type];
  if (tileId && AssetManager.get(TILESET_KEY)) {
    drawTile(ctx, tileId, x, y, w, h);
  } else {
    ctx.fillStyle = type === 'crate' ? '#2a3a5a' : type === 'tall' ? '#3a2a4a' :
      type === 'moving' ? '#4a2a5a' : '#5a2a3a';
    ctx.fillRect(rx(x), rx(y), rx(w), rx(h));
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx(x), rx(y), rx(w), rx(h));
  }
  ctx.restore();
}

/* ─── Ground tiles ─── */
/* Cacheable 32px repeating pattern for a tileset region (batch 1+ drawImage per tile → 1 fillRect) */
export function createTilePattern(
  ctx: CanvasRenderingContext2D,
  tileId: string,
): CanvasPattern | null {
  const src = TILE_SRC[tileId];
  if (!src) return null;
  const img = AssetManager.get(TILESET_KEY);
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = TILE_DEST_SIZE;
  canvas.height = TILE_DEST_SIZE;
  const c = canvas.getContext('2d');
  if (!c) return null;
  c.drawImage(img, src.sx, src.sy, TILE_SRC_SIZE, TILE_SRC_SIZE,
    0, 0, TILE_DEST_SIZE, TILE_DEST_SIZE);
  return ctx.createPattern(canvas, 'repeat');
}

/* ─── Coins ─── */
export function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  wobble: number,
): void {
  ctx.save();
  const s = r * 2.2;
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.12 + 0.06 * Math.sin(performance.now() * 0.004 + x);
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(rx(x), rx(y + wobble), rx(s), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(rx(x), rx(y + wobble), rx(r), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(rx(x), rx(y + wobble), rx(r * 0.4), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ─── Powerups ─── */
export function drawPowerup(
  ctx: CanvasRenderingContext2D,
  type: string, x: number, y: number, r: number, bobPhase: number,
): void {
  const py = y + Math.sin(bobPhase) * 5;
  const s = r * 2.4;
  const color = type === 'shield' ? '#00c8ff' : type === 'magnet' ? '#ffd700' :
    type === 'x2' ? '#ff6b6b' : '#7b2ff7';

  ctx.save();
  const g = ctx.createRadialGradient(rx(x), rx(py), 3, rx(x), rx(py), rx(s));
  g.addColorStop(0, color + '44');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(rx(x), rx(py), rx(s), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(rx(x), rx(py), rx(r), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(rx(x), rx(py), rx(r * 0.3), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ─── Projectile ─── */
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
): void {
  const name = 'shot-1';
  const drew = drawAtlas(ctx, name, rx(x - r), rx(y - r), rx(r * 2), rx(r * 2));
  if (!drew) {
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(rx(x), rx(y), rx(r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ─── Jet flame ─── */
export function drawJetFlame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
): void {
  ctx.save();
  ctx.fillStyle = '#00c8ff';
  ctx.fillRect(rx(x - 3), rx(y), 6, 12);
  ctx.fillStyle = '#7b2ff7';
  ctx.fillRect(rx(x - 1), rx(y + 6), 2, 6);
  ctx.restore();
}

/* ─── Background layer ─── */
const BG_KEYS = ['bg-1','bg-2','bg-3','skyline-a','skyline-b','buildings-bg','near-buildings-bg'];

export async function loadBackgrounds(): Promise<void> {
  const base = assetUrl('/assets/sprites/');
  const files = ['bg-1.png','bg-2.png','bg-3.png','skyline-a.png','skyline-b.png',
    'buildings-bg.png','near-buildings-bg.png'];
  await Promise.all(files.map(f => AssetManager.load(base + f, f.replace('.png', ''))));
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  key: string,
  dx: number, dy: number, dw: number, dh: number,
): void {
  const img = AssetManager.get(key);
  if (img) {
    ctx.drawImage(img, rx(dx), rx(dy), rx(dw), rx(dh));
  }
}
