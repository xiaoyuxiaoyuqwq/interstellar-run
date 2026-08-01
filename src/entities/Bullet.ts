import { Drawable } from '../core/Drawable';
import { W, H } from '../utils/constants';

export type BulletType = 'aimed' | 'spread' | 'wave' | 'laser' | 'rain';

export class Bullet extends Drawable {
  vx = 0;
  vy = 0;
  r = 3;
  bulletType: BulletType = 'aimed';
  wavePhase = 0;

  reset(): void {
    super.reset();
    this.vx = 0;
    this.vy = 0;
    this.r = 3;
    this.bulletType = 'aimed';
    this.wavePhase = 0;
  }

  update(dt: number): void {
    if (this.bulletType === 'wave') {
      this.wavePhase += dt * 8;
      this.x += this.vx * dt;
      this.y += this.vy * dt + Math.sin(this.wavePhase) * 100 * dt;
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    if (this.x < -30 || this.x > W + 30 || this.y < -30 || this.y > H + 30) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const glow = `rgba(255,107,107,${0.2 + 0.15 * Math.sin(performance.now() * 0.006 + this.x)})`;
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    if (this.bulletType === 'laser') {
      ctx.fillStyle = '#ff6b6b';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-this.r * 6, -2, this.r * 12, 4);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
