import type { Poolable } from './Pool';

export abstract class Drawable implements Poolable {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  active = false;
  life = 0;

  abstract draw(ctx: CanvasRenderingContext2D): void;

  update(dt: number): void {}

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.life = 0;
  }
}
