export class HUD {
  private scoreEl: HTMLElement;
  private distEl: HTMLElement;
  private speedEl: HTMLElement;
  private comboEl: HTMLElement;
  private livesEl: HTMLElement;
  private powerupEl: HTMLElement;
  private progressBar: HTMLElement;
  private dangerFlash: HTMLElement;
  private lastLives = -1;
  private lastMaxLives = -1;
  private lastPowerups = '';

  constructor() {
    this.scoreEl = document.getElementById('hud-score')!;
    this.distEl = document.getElementById('hud-dist')!;
    this.speedEl = document.getElementById('hud-speed')!;
    this.comboEl = document.getElementById('hud-combo')!;
    this.livesEl = document.getElementById('lives')!;
    this.powerupEl = document.getElementById('powerup')!;
    this.progressBar = document.getElementById('progress-bar')!;
    this.dangerFlash = document.getElementById('danger-flash')!;
  }

  update(score: number, distance: number, speed: number, comboCount: number,
    lives: number, maxLives: number, powerups: Record<string, number>,
  ): void {
    this.scoreEl.textContent = Math.floor(score).toString();
    this.distEl.textContent = Math.floor(distance) + 'm';
    this.speedEl.textContent = Math.floor(speed).toString();

    if (comboCount > 1) {
      this.comboEl.textContent = '链式入侵 x' + comboCount;
      this.comboEl.classList.add('show');
    } else {
      this.comboEl.classList.remove('show');
    }

    /* Lives — rebuild only on change */
    if (lives !== this.lastLives || maxLives !== this.lastMaxLives) {
      this.lastLives = lives;
      this.lastMaxLives = maxLives;
      this.livesEl.innerHTML = '';
      for (let i = 0; i < maxLives; i++) {
        const d = document.createElement('div');
        d.className = 'life-dot' + (i >= lives ? ' lost' : '');
        this.livesEl.appendChild(d);
      }
    }

    /* Powerups — rebuild only on change */
    const sig = Object.entries(powerups)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => k + ':' + Math.ceil(v))
      .join(',');
    if (sig !== this.lastPowerups) {
      this.lastPowerups = sig;
      this.powerupEl.innerHTML = '';
      const names: Record<string, string> = { shield: '🛡 护盾', magnet: '🧲 磁铁', x2: '✖2 双倍', boost: '⚡ 加速' };
      const cls: Record<string, string> = { shield: 'pu-shield', magnet: 'pu-magnet', x2: 'pu-2x', boost: 'pu-boost' };
      for (const [k, v] of Object.entries(powerups)) {
        if (v > 0) {
          const b = document.createElement('div');
          b.className = 'pu-badge show ' + (cls[k] || '');
          b.textContent = (names[k] || k) + ' ' + Math.ceil(v) + 's';
          this.powerupEl.appendChild(b);
        }
      }
    }

    /* Progress — 数据传输进度 */
    this.progressBar.style.width = Math.min(100, (distance / 5000) * 100) + '%';

    /* Danger */
    const danger = Math.max(0, Math.min(1, (speed - 350) / 300));
    this.dangerFlash.classList.toggle('active', danger > 0.3);
  }
}
