import { Drawable } from '../core/Drawable';
import type { PowerupType } from '../utils/constants';
import { drawPowerup } from '../assets/Sprites';

export class Powerup extends Drawable {
  powerType: PowerupType = 'shield';
  bob = 0;
  r = 8;

  reset(): void {
    super.reset();
    this.powerType = 'shield';
    this.bob = 0;
    this.r = 8;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawPowerup(ctx, this.powerType, this.x, this.y, this.r, this.bob);
  }
}
