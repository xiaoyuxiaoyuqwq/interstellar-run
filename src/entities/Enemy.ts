import { Drawable } from '../core/Drawable';
import { GROUND_Y } from '../utils/constants';
import { drawEnemy } from '../assets/Sprites';

export type EnemyType = 'drone' | 'enforcer' | 'turret';

export class Enemy extends Drawable {
  enemyType: EnemyType = 'drone';
  hp = 1;
  maxHp = 1;
  bobPhase = 0;
  flashTimer = 0;
  animFrame = 0;
  hoverAmp = 0;
  hoverSpeed = 4;
  baseY = 0;

  reset(): void {
    super.reset();
    this.enemyType = 'drone';
    this.hp = 1;
    this.maxHp = 1;
    this.bobPhase = 0;
    this.flashTimer = 0;
    this.animFrame = 0;
    this.hoverAmp = 0;
    this.hoverSpeed = 4;
    this.baseY = 0;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.flashTimer = 0.15;
    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  update(dt: number): void {
    if (this.flashTimer > 0) this.flashTimer -= dt;
    this.bobPhase += dt * this.hoverSpeed;
    this.animFrame++;
    if (this.hoverAmp > 0) {
      this.y = this.baseY + Math.sin(this.bobPhase) * this.hoverAmp;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawEnemy(ctx, this.enemyType, this.x, this.y, this.w, this.h, this.bobPhase, this.flashTimer > 0, this.animFrame);
  }
}

/* Configure spawn attributes per enemy type */
export function configureEnemy(e: Enemy, type: EnemyType): void {
  e.enemyType = type;
  if (type === 'drone') {
    e.w = 22; e.h = 16; e.hp = 1; e.maxHp = 1;
    e.hoverAmp = 10; e.hoverSpeed = 4;
  } else if (type === 'turret') {
    e.w = 24; e.h = 26; e.hp = 1; e.maxHp = 1;
    e.hoverAmp = 2; e.hoverSpeed = 2;
  } else {
    e.w = 20; e.h = 28; e.hp = 2; e.maxHp = 2;
    e.hoverAmp = 0; e.hoverSpeed = 3;
  }
}

export function createEnemy(type: EnemyType, hp: number): Enemy {
  const e = new Enemy();
  configureEnemy(e, type);
  if (hp > 0) { e.hp = hp; e.maxHp = hp; }
  return e;
}
