import { Drawable } from '../core/Drawable';
import { W } from '../utils/constants';

export class Projectile extends Drawable {
  vx = 500;
  vy = 0;
  r = 3;

  reset(): void {
    super.reset();
    this.vx = 500;
    this.vy = 0;
    this.r = 3;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x > W + 20 || this.x < -40 || this.y < -40 || this.y > 500) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
