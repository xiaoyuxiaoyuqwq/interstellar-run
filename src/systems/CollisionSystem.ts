import { rectOverlap } from '../utils/math';
import { W, H } from '../utils/constants';
import type { Player, Afterimage } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { Obstacle } from '../entities/Obstacle';
import type { Coin } from '../entities/Coin';
import type { Powerup } from '../entities/Powerup';
import type { Boss } from '../entities/Boss';
import type { Bullet } from '../entities/Bullet';
import type { Projectile } from '../entities/Projectile';
import type { Pool } from '../core/Pool';

export interface CollisionResult {
  stompedEnemies: { enemy: Enemy; score: number }[];
  damagedEnemies: { enemy: Enemy; score: number; dmg: number }[];
  killedEnemies: Enemy[];
  collectedCoins: Coin[];
  collectedPowerups: Powerup[];
  nearMisses: Obstacle[];
  obstacleHit: boolean;
  bossStomped: boolean;
  bossDefeated: boolean;
  playerHit: boolean;
  shieldBroken: boolean;
}

export class CollisionSystem {
  static checkAll(
    player: Player,
    obstaclePool: Pool<Obstacle>,
    enemyPool: Pool<Enemy>,
    coinPool: Pool<Coin>,
    powerupPool: Pool<Powerup>,
    projectilePool: Pool<Projectile>,
    boss: Boss | undefined,
    bulletPool: Pool<Bullet> | undefined,
    bossFight: boolean,
    t: number,
  ): CollisionResult {
    const result: CollisionResult = {
      stompedEnemies: [], damagedEnemies: [], killedEnemies: [],
      collectedCoins: [], collectedPowerups: [],
      nearMisses: [],
      obstacleHit: false, bossStomped: false, bossDefeated: false,
      playerHit: false, shieldBroken: false,
    };

    const px = player.x - player.w / 2;
    const py = player.y - player.h;
    const NEAR_MISS_GAP = 28;

    /* Obstacle collision + near-miss tracking */
    obstaclePool.forEachActive(o => {
      if (o.x > player.x + 40) return;
      if (rectOverlap(px, py, player.w, player.h, o.x, o.y, o.w, o.h)) {
        if (player.vy > 0 && py + player.h < o.y + o.h * 0.4) {
          player.vy = -350;
          result.obstacleHit = true;
          o.active = false;
          return;
        }
        if (player.invincible > 0) return;
        if (player.powerups.shield > 0) {
          player.powerups.shield = 0;
          player.invincible = 1;
          result.shieldBroken = true;
          return;
        }
        result.playerHit = true;
      }

      /* 擦弹: track min vertical gap while horizontally overlapping the player column */
      if (o.x < px + player.w && o.x + o.w > px) {
        const gap = Math.max(0, o.y - (py + player.h), py - (o.y + o.h));
        if (gap >= 2 && gap < o.nearMissGap) o.nearMissGap = gap;
      }
      if (!o.passed && o.x + o.w < px) {
        o.passed = true;
        if (o.nearMissGap < NEAR_MISS_GAP) result.nearMisses.push(o);
      }
    });

    /* Enemy collision */
    enemyPool.forEachActive(e => {
      if (e.x > player.x + 40) return;

      const dashBox = player.getDashHitbox();
      if (dashBox && rectOverlap(dashBox.x, dashBox.y, dashBox.w, dashBox.h, e.x, e.y, e.w, e.h)) {
        const dead = e.takeDamage(1);
        result.damagedEnemies.push({ enemy: e, score: dead ? 80 : 0, dmg: 1 });
        if (dead) result.killedEnemies.push(e);
        return;
      }

      if (rectOverlap(px, py, player.w, player.h, e.x, e.y, e.w, e.h)) {
        if (player.vy > 0 && py + player.h < e.y + e.h * 0.35) {
          player.vy = -380;
          const dead = e.takeDamage(1);
          result.stompedEnemies.push({ enemy: e, score: dead ? 150 : 100 });
          if (dead) result.killedEnemies.push(e);
          return;
        }
        if (player.invincible > 0) return;
        if (player.powerups.shield > 0) {
          player.powerups.shield = 0;
          player.invincible = 1;
          result.shieldBroken = true;
          return;
        }
        result.playerHit = true;
      }
    });

    /* Projectile-enemy collision */
    projectilePool.forEachActive(p => {
      enemyPool.forEachActive(e => {
        if (e.x > p.x + (p.r || 3) + e.w + 30) return;
        const pr = p.r || 3;
        if (p.x + pr > e.x && p.x - pr < e.x + e.w && p.y + pr > e.y && p.y - pr < e.y + e.h) {
          p.active = false;
          const dead = e.takeDamage(1);
          result.damagedEnemies.push({ enemy: e, score: dead ? 80 : 0, dmg: 1 });
          if (dead) result.killedEnemies.push(e);
        }
      });
    });

    /* Tank sword collision */
    const swordHit = player.getSwordHitbox();
    if (swordHit) {
      enemyPool.forEachActive(e => {
        if (e.x > player.x + 40) return;
        if (rectOverlap(swordHit.x, swordHit.y, swordHit.w, swordHit.h, e.x, e.y, e.w, e.h)) {
          const dead = e.takeDamage(2);
          result.damagedEnemies.push({ enemy: e, score: dead ? 80 : 0, dmg: 2 });
          if (dead) result.killedEnemies.push(e);
        }
      });
    }

    /* Coin collection */
    coinPool.forEachActive(c => {
      const dx = player.x - c.x;
      const dy = (player.y - player.h / 2) - c.y;
      if (dx * dx + dy * dy < (player.w / 2 + c.r) ** 2) {
        c.active = false;
        result.collectedCoins.push(c);
      }
    });

    /* Powerup collection */
    powerupPool.forEachActive(p => {
      const dx = player.x - p.x;
      const dy = (player.y - player.h / 2) - p.y;
      if (dx * dx + dy * dy < 400) {
        p.active = false;
        result.collectedPowerups.push(p);
      }
    });

    /* Boss collision */
    if (boss && boss.active && bossFight) {
      const bx = boss.x - boss.w / 2;
      const by = boss.y - boss.h / 2;
      if (rectOverlap(px, py, player.w, player.h, bx, by, boss.w, boss.h)) {
        if (player.vy > 0 && py + player.h < by + boss.h * 0.25) {
          player.vy = -400;
          result.bossStomped = true;
          const dead = boss.takeDamage(1);
          if (dead) result.bossDefeated = true;
        } else if (player.invincible <= 0) {
          result.playerHit = true;
        }
      }

      /* Bullet collision */
      if (bulletPool) {
        const cx = player.x;
        const cy = player.y - player.h / 2;
        bulletPool.forEachActive(b => {
          const dx = cx - b.x;
          const dy = cy - b.y;
          if (dx * dx + dy * dy < (player.w * 0.35 + b.r) ** 2) {
            b.active = false;
            if (player.invincible <= 0) result.playerHit = true;
          }
        });
      }
    }

    return result;
  }
}