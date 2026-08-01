import { Drawable } from '../core/Drawable';

export class Particle extends Drawable {
  vx = 0;
  vy = 0;
  maxLife = 0;
  color = '#00c8ff';
  size = 3;

  reset(): void {
    super.reset();
    this.vx = 0;
    this.vy = 0;
    this.maxLife = 0;
    this.color = '#00c8ff';
    this.size = 3;
  }

  update(dt: number): void {
    this.vy += 400 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class ScorePopup extends Drawable {
  text = '';
  color = '#ffd700';
  vy = -60;

  reset(): void {
    super.reset();
    this.text = '';
    this.color = '#ffd700';
    this.vy = -60;
  }

  update(dt: number): void {
    this.y += this.vy * dt;
    this.vy += 30 * dt;
    this.life -= dt;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.min(1, this.life * 2);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px Space Mono';
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillText(this.text, this.x, this.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

export class Shockwave extends Drawable {
  maxLife = 0;
  radius = 0;
  maxRadius = 40;
  color = '#00c8ff';
  width = 3;

  reset(): void {
    super.reset();
    this.maxLife = 0;
    this.radius = 0;
    this.maxRadius = 40;
    this.color = '#00c8ff';
    this.width = 3;
  }

  update(dt: number): void {
    this.life -= dt;
    if (this.life <= 0) this.active = false;
    const p = 1 - Math.max(0, this.life) / this.maxLife;
    this.radius = this.maxRadius * (1 - (1 - p) * (1 - p));
    this.width = 3 * (1 - p) + 1;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const p = 1 - Math.max(0, this.life) / this.maxLife;
    ctx.globalAlpha = 0.7 * (1 - p);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export class AmbientDust extends Drawable {
  vx = 0;
  vy = 0;
  maxLife = 0;
  size = 2;
  alpha = 0.2;

  reset(): void {
    super.reset();
    this.vx = 0;
    this.vy = 0;
    this.maxLife = 0;
    this.size = 2;
    this.alpha = 0.2;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0 || this.x < -30) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const a = (this.life / this.maxLife) * this.alpha;
    ctx.fillStyle = `rgba(100,180,255,${a})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
