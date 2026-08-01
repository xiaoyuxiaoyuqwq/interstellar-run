import { Game } from './core/Game';
import { FIXED_DT } from './utils/constants';
import { loadAtlas, loadBackgrounds, loadTileset } from './assets/Sprites';
import { loadAudioAssets } from './systems/Audio';

async function boot(): Promise<void> {
  /* Preload real assets with silent fallback to code-generated */
  await Promise.all([loadAtlas(), loadBackgrounds(), loadTileset(), loadAudioAssets()]);

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  canvas.getContext('2d')!.imageSmoothingEnabled = false;

  const game = new Game(canvas);
  (window as unknown as { __game?: Game }).__game = game;
  game.showTitle();

  let lastTime = 0;
  let accumulator = 0;

  function loop(time: number): void {
    const frameTime = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    accumulator += frameTime;

    while (accumulator >= FIXED_DT) {
      game.fixedUpdate(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    game.draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

boot();
