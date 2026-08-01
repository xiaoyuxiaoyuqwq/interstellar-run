/**
 * AssetManager — .png sprite sheet loader with fallback to code-generated sprites.
 *
 * Usage:
 *   await AssetManager.load('/assets/player.png', 'player');
 *   AssetManager.draw(ctx, 'player', frameX, frameY, frameW, frameH, dx, dy, dw, dh);
 *
 * If asset is not loaded, draw() is a no-op (caller should use code-generated fallback).
 */

const _cache = new Map<string, HTMLImageElement>();
const _loading = new Map<string, Promise<void>>();

export const AssetManager = {
  load(url: string, key: string): Promise<void> {
    if (_cache.has(key)) return Promise.resolve();
    if (_loading.has(key)) return _loading.get(key)!;
    const p = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { _cache.set(key, img); resolve(); };
      img.onerror = () => { resolve(); /* silently fall back */ };
      img.src = url;
    });
    _loading.set(key, p);
    return p;
  },

  get(key: string): HTMLImageElement | null {
    return _cache.get(key) ?? null;
  },

  loaded(key: string): boolean {
    return _cache.has(key);
  },

  /**
   * Draw a slice from a sprite sheet.
   * Returns true if the image was loaded and drawn, false if caller should fall back.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw: number, dh: number,
  ): boolean {
    const img = _cache.get(key);
    if (!img) return false;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return true;
  },

  /** Preload common assets. Call during boot. */
  async preload(manifest: Record<string, string>): Promise<void> {
    const tasks = Object.entries(manifest).map(([key, url]) => this.load(url, key));
    await Promise.all(tasks);
  },
};
