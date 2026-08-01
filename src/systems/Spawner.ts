import { W, GROUND_Y, POWERUP_TYPES } from '../utils/constants';
import { Obstacle } from '../entities/Obstacle';
import { Coin } from '../entities/Coin';
import { Powerup } from '../entities/Powerup';
import type { Pool } from '../core/Pool';
import type { ObstacleType, PowerupType } from '../utils/constants';

type ChunkDef = {
  name: string;
  obstacles: { x: number; y: number; w: number; h: number; type: ObstacleType; color: string; moveAmp?: number; moveSpeed?: number; baseY?: number }[];
  coins: { x: number; y: number }[];
  powerup?: { x: number; y: number; type: PowerupType };
};

const CHUNK_WIDTH = 1000;

/* Preset chunks */
const CHUNKS: ChunkDef[] = [
  {
    name: 'turret_nest',
    obstacles: [
      { x: 250, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 550, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 700, y: GROUND_Y, w: 22, h: 14, type: 'crate', color: '#2a3a5a' },
    ],
    coins: [
      { x: 180, y: GROUND_Y - 50 }, { x: 400, y: GROUND_Y - 48 }, { x: 620, y: GROUND_Y - 55 },
    ],
  },
  {
    name: 'jump_gauntlet',
    obstacles: [
      { x: 200, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 350, y: GROUND_Y - 35, w: 20, h: 55, type: 'tall', color: '#3a2a4a' },
      { x: 500, y: GROUND_Y, w: 22, h: 14, type: 'crate', color: '#2a3a5a' },
      { x: 500, y: GROUND_Y - 14, w: 22, h: 14, type: 'crate', color: '#2a4a5a' },
      { x: 650, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
    ],
    coins: [
      { x: 280, y: GROUND_Y - 60 }, { x: 300, y: GROUND_Y - 70 },
      { x: 420, y: GROUND_Y - 55 }, { x: 560, y: GROUND_Y - 45 },
    ],
  },
  {
    name: 'drone_swarm',
    obstacles: [
      { x: 300, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 600, y: GROUND_Y, w: 26, h: 16, type: 'crate', color: '#2a3a5a' },
      { x: 600, y: GROUND_Y - 16, w: 26, h: 16, type: 'crate', color: '#2a4a5a' },
    ],
    coins: [
      { x: 150, y: GROUND_Y - 45 }, { x: 170, y: GROUND_Y - 50 },
      { x: 450, y: GROUND_Y - 40 },
    ],
  },
  {
    name: 'shield_wall',
    obstacles: [
      { x: 200, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 200, y: GROUND_Y - 22, w: 22, h: 22, type: 'crate', color: '#2a4a5a' },
      { x: 200, y: GROUND_Y - 44, w: 22, h: 22, type: 'crate', color: '#3a4a5a' },
    ],
    coins: [
      { x: 280, y: GROUND_Y - 70 }, { x: 300, y: GROUND_Y - 75 }, { x: 320, y: GROUND_Y - 70 },
    ],
  },
  {
    name: 'coin_rush',
    obstacles: [
      { x: 400, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
    ],
    coins: [
      { x: 100, y: GROUND_Y - 50 }, { x: 130, y: GROUND_Y - 58 }, { x: 160, y: GROUND_Y - 55 },
      { x: 190, y: GROUND_Y - 60 }, { x: 220, y: GROUND_Y - 52 },
      { x: 500, y: GROUND_Y - 48 }, { x: 530, y: GROUND_Y - 56 }, { x: 560, y: GROUND_Y - 60 },
      { x: 590, y: GROUND_Y - 54 }, { x: 620, y: GROUND_Y - 58 },
    ],
  },
  {
    name: 'moving_gauntlet',
    obstacles: [
      { x: 250, y: GROUND_Y - 30, w: 18, h: 18, type: 'moving', color: '#4a2a5a', moveAmp: 35, moveSpeed: 2.5, baseY: GROUND_Y - 30 },
      { x: 450, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 600, y: GROUND_Y - 30, w: 18, h: 18, type: 'moving', color: '#4a2a5a', moveAmp: 40, moveSpeed: 3, baseY: GROUND_Y - 30 },
    ],
    coins: [
      { x: 350, y: GROUND_Y - 55 },
    ],
  },
  {
    name: 'air_assault',
    obstacles: [
      { x: 300, y: GROUND_Y, w: 26, h: 16, type: 'crate', color: '#2a3a5a' },
      { x: 300, y: GROUND_Y - 16, w: 26, h: 16, type: 'crate', color: '#2a4a5a' },
    ],
    coins: [
      { x: 180, y: GROUND_Y - 45 },
    ],
  },
  {
    name: 'enforcer_patrol',
    obstacles: [
      { x: 250, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 550, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
    ],
    coins: [
      { x: 150, y: GROUND_Y - 50 }, { x: 400, y: GROUND_Y - 55 }, { x: 650, y: GROUND_Y - 48 },
    ],
  },
  {
    name: 'flyer_trap',
    obstacles: [
      { x: 200, y: 240, w: 24, h: 16, type: 'flyer', color: '#5a2a3a' },
      { x: 350, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 500, y: 220, w: 24, h: 16, type: 'flyer', color: '#5a2a3a' },
      { x: 650, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
    ],
    coins: [
      { x: 150, y: GROUND_Y - 40 }, { x: 450, y: GROUND_Y - 50 },
    ],
  },
  {
    name: 'rest_stop',
    obstacles: [],
    coins: [
      { x: 200, y: GROUND_Y - 50 }, { x: 230, y: GROUND_Y - 55 },
      { x: 400, y: GROUND_Y - 48 }, { x: 430, y: GROUND_Y - 52 },
      { x: 600, y: GROUND_Y - 50 }, { x: 630, y: GROUND_Y - 55 },
    ],
    powerup: { x: 500, y: GROUND_Y - 50, type: 'magnet' },
  },
  {
    name: 'laser_gate',
    obstacles: [
      { x: 280, y: GROUND_Y - 40, w: 56, h: 20, type: 'gate', color: '#ff3b3b' },
      { x: 460, y: GROUND_Y - 40, w: 56, h: 20, type: 'gate', color: '#ff3b3b' },
      { x: 660, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
    ],
    coins: [
      { x: 200, y: GROUND_Y - 75 }, { x: 370, y: GROUND_Y - 80 },
      { x: 520, y: GROUND_Y - 55 },
    ],
  },
  {
    name: 'boss_gate',
    obstacles: [
      { x: 300, y: GROUND_Y, w: 22, h: 22, type: 'crate', color: '#2a3a5a' },
      { x: 500, y: GROUND_Y - 35, w: 20, h: 55, type: 'tall', color: '#3a2a4a' },
    ],
    coins: [
      { x: 150, y: GROUND_Y - 50 }, { x: 400, y: GROUND_Y - 55 },
    ],
  },
];

function pickChunk(prevName: string): ChunkDef {
  let pool = CHUNKS.filter(c => c.name !== prevName);
  if (pool.length === 0) pool = CHUNKS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export class Spawner {
  private currentChunk: ChunkDef;
  private nextChunk: ChunkDef;
  private chunkOffset = 0;
  private prevChunkName = '';
  private scrollAtLastChunk = 0;
  private spawned = false;

  constructor() {
    this.currentChunk = CHUNKS[0];
    this.nextChunk = pickChunk(this.currentChunk.name);
  }

  reset(): void {
    this.currentChunk = CHUNKS[0];
    this.nextChunk = pickChunk(this.currentChunk.name);
    this.chunkOffset = 0;
    this.prevChunkName = '';
    this.scrollAtLastChunk = 0;
    this.spawned = false;
  }

  update(dt: number, scrollOffset: number, speed: number,
    obstaclePool: Pool<Obstacle>, coinPool: Pool<Coin>,
    powerupPool: Pool<Powerup>,
    timeScale = 1,
  ): void {
    const st = dt * timeScale;
    const distInChunk = scrollOffset - this.scrollAtLastChunk;
    if (distInChunk > CHUNK_WIDTH) {
      this.currentChunk = this.nextChunk;
      this.nextChunk = pickChunk(this.currentChunk.name);
      this.scrollAtLastChunk = scrollOffset;
      this.chunkOffset = scrollOffset + W;
      this.spawnChunk(this.currentChunk, this.chunkOffset, obstaclePool, coinPool, powerupPool);
    } else if (!this.spawned) {
      this.spawned = true;
      /* Initial chunk: spawn far enough ahead to give the player a reaction window */
      this.chunkOffset = scrollOffset + W + 100;
      this.scrollAtLastChunk = scrollOffset;
      this.spawnChunk(this.currentChunk, this.chunkOffset, obstaclePool, coinPool, powerupPool);
    }
  }

  private spawnChunk(chunk: ChunkDef, offset: number,
    obstaclePool: Pool<Obstacle>, coinPool: Pool<Coin>,
    powerupPool: Pool<Powerup>,
  ): void {
    for (const od of chunk.obstacles) {
      const o = obstaclePool.spawn();
      if (!o) continue;
      o.x = od.x + offset;
      o.y = od.y;
      o.w = od.w;
      o.h = od.h;
      o.type = od.type;
      o.color = od.color;
      if (od.moveAmp !== undefined) o.moveAmp = od.moveAmp;
      if (od.moveSpeed !== undefined) o.moveSpeed = od.moveSpeed;
      if (od.baseY !== undefined) o.baseY = od.baseY;
    }

    for (const cd of chunk.coins) {
      const c = coinPool.spawn();
      if (!c) continue;
      c.x = cd.x + offset;
      c.y = cd.y;
    }

    if (chunk.powerup) {
      const p = powerupPool.spawn();
      if (p) {
        p.x = chunk.powerup.x + offset;
        p.y = chunk.powerup.y;
        p.powerType = chunk.powerup.type;
        p.bob = Math.random() * Math.PI * 2;
      }
    }
  }
}
