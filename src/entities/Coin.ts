import { Drawable } from '../core/Drawable';
import { drawCoin } from '../assets/Sprites';

export class Coin extends Drawable {
  r = 7;

  reset(): void {
    super.reset();
    this.r = 7;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const wobble = Math.sin(performance.now() * 0.004 + this.x) * 2;
    drawCoin(ctx, this.x, this.y, this.r, wobble);
  }
}
