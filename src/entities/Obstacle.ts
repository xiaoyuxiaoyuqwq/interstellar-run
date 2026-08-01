import { Drawable } from '../core/Drawable';
import type { ObstacleType } from '../utils/constants';
import { GROUND_Y } from '../utils/constants';
import { drawObstacle } from '../assets/Sprites';

export class Obstacle extends Drawable {
  type: ObstacleType = 'crate';
  color = '#2a3a5a';
  moveAmp = 0;
  moveSpeed = 0;
  movePhase = 0;
  baseY = 0;
  bobPhase = 0;
  /* Near-miss (擦弹) tracking */
  nearMissGap = Infinity;
  passed = false;

  reset(): void {
    super.reset();
    this.type = 'crate';
    this.color = '#2a3a5a';
    this.moveAmp = 0;
    this.moveSpeed = 0;
    this.movePhase = 0;
    this.baseY = 0;
    this.bobPhase = 0;
    this.nearMissGap = Infinity;
    this.passed = false;
  }

  update(dt: number): void {
    if (this.type === 'moving') {
      this.movePhase += this.moveSpeed * dt;
      this.y = this.baseY + Math.sin(this.movePhase) * this.moveAmp;
    }
    if (this.type === 'flyer') {
      this.bobPhase += 3 * dt;
      this.y += Math.sin(this.bobPhase) * 30 * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawObstacle(ctx, this.type, this.x, this.y, this.w, this.h);
  }
}
