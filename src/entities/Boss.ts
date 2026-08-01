import { W, GROUND_Y } from '../utils/constants';
import { Audio } from '../systems/Audio';
import type { Pool } from '../core/Pool';
import type { Bullet } from './Bullet';
import type { Player } from './Player';

export type BossPhase = 1 | 2 | 3;
export type BossState = 'approaching' | 'idle' | 'attacking' | 'transition' | 'defeated';

interface PendingShot {
  delay: number;
  fire: (boss: Boss, player: Player, bulletPool: Pool<Bullet>) => void;
}

/* FSM state behaviors */
interface BossStateBehavior {
  enter(boss: Boss): void;
  update(boss: Boss, dt: number, player: Player, bulletPool: Pool<Bullet>, gameTime: number): string | null;
}

const IdleState: BossStateBehavior = {
  enter: (b) => { b.idleTimer = 0.5 + Math.random() * 0.5; },
  update: (b, dt) => {
    b.idleTimer -= dt;
    return b.idleTimer <= 0 ? 'attacking' : null;
  },
};

const AttackingState: BossStateBehavior = {
  enter: (b) => { b.attackTimer = 0.6; },
  update: (b, dt, player, bulletPool, gameTime) => {
    b.attackTimer -= dt;
    if (b.attackTimer <= 0) {
      b.firePattern(player, bulletPool, gameTime);
      return 'idle';
    }
    return null;
  },
};

const TransitionState: BossStateBehavior = {
  enter: (b) => { b.phaseTimer = 1.2; },
  update: (b, dt) => {
    b.phaseTimer -= dt;
    return b.phaseTimer <= 0 ? 'idle' : null;
  },
};

const STATE_BEHAVIORS: Record<string, BossStateBehavior> = {
  idle: IdleState,
  attacking: AttackingState,
  transition: TransitionState,
};

export class Boss {
  active = false;
  x = 0;
  y = 0;
  w = 50;
  h = 60;
  hp = 30;
  maxHp = 30;
  phase: BossPhase = 1;
  state: BossState = 'idle';
  attackTimer = 0;
  idleTimer = 0;
  phaseTimer = 0;
  flashTimer = 0;
  bobPhase = 0;
  driftDir = 1;
  appearProgress = 0;
  pendingShots: PendingShot[] = [];

  reset(difficulty: number): void {
    this.active = true;
    this.x = W + 100;
    this.y = GROUND_Y - this.h + 12;
    this.w = 50;
    this.h = 60;
    const baseHp = Math.floor(18 + difficulty * 3);
    this.maxHp = baseHp;
    this.hp = baseHp;
    this.phase = 1;
    this.state = 'approaching';
    this.attackTimer = 0;
    this.idleTimer = 0;
    this.phaseTimer = 0;
    this.flashTimer = 0;
    this.bobPhase = 0;
    this.driftDir = -1;
    this.appearProgress = 0;
    this.pendingShots.length = 0;
  }

  update(dt: number, player: Player, bulletPool: Pool<Bullet>, gameTime: number): void {
    this.bobPhase += dt * 2;
    if (this.flashTimer > 0) this.flashTimer -= dt;

    if (this.state === 'approaching') {
      this.appearProgress += dt * 0.5;
      if (this.appearProgress > 1) this.appearProgress = 1;
      const t = this.appearProgress;
      this.x = W + 100 - t * 220;
      if (t >= 1) {
        this.state = 'idle';
        IdleState.enter(this);
      }
      return;
    }

    if (this.state === 'defeated') return;

    /* Tick pending shots (pause-safe — no setTimeout) */
    for (let i = this.pendingShots.length - 1; i >= 0; i--) {
      const s = this.pendingShots[i];
      s.delay -= dt;
      if (s.delay <= 0) {
        s.fire(this, player, bulletPool);
        this.pendingShots.splice(i, 1);
      }
    }

    this.x += this.driftDir * 25 * dt;
    /* Sweep range reaches the player zone (player is pinned at x≈120) so stomping is possible */
    if (this.x > W - 80) this.driftDir = -1;
    if (this.x < 90) this.driftDir = 1;

    const behavior = STATE_BEHAVIORS[this.state];
    if (behavior) {
      const next = behavior.update(this, dt, player, bulletPool, gameTime);
      if (next && next !== this.state) {
        this.state = next as BossState;
        const nextBehavior = STATE_BEHAVIORS[next];
        if (nextBehavior) nextBehavior.enter(this);
      }
    }
  }

  firePattern(player: Player, bulletPool: Pool<Bullet>, _gameTime: number): void {
    const patterns = this.getPatterns();
    const chosen = patterns[Math.floor(Math.random() * patterns.length)];

    switch (chosen) {
      case 'aimed': {
        const count = 1 + this.phase;
        for (let i = 0; i < count; i++) {
          this.pendingShots.push({
            delay: i * 0.12,
            fire: (b, p, pool) => {
              const bullet = pool.spawn();
              if (!bullet) return;
              const targetY = p.y - p.h / 2;
              const dx = p.x - b.x;
              const dy = targetY - b.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const spd = 220 * (1 + (b.phase - 1) * 0.3);
              bullet.x = b.x;
              bullet.y = b.y - 10;
              bullet.r = 4;
              bullet.bulletType = 'aimed';
              bullet.vx = (dx / dist) * spd;
              bullet.vy = (dy / dist) * spd;
            },
          });
        }
        break;
      }
      case 'spread': {
        const count = 4 + this.phase * 2;
        for (let i = 0; i < count; i++) {
          this.pendingShots.push({
            delay: i * 0.05,
            fire: (b, _p, pool) => {
              const bullet = pool.spawn();
              if (!bullet) return;
              const angle = (i / count) * Math.PI * 1.2 - Math.PI * 0.6;
              const spd = 140 * (1 + (b.phase - 1) * 0.3);
              bullet.x = b.x;
              bullet.y = b.y - 10;
              bullet.r = 3;
              bullet.bulletType = 'spread';
              bullet.vx = Math.cos(angle) * spd;
              bullet.vy = Math.sin(angle) * spd * 0.5;
            },
          });
        }
        break;
      }
      case 'wave': {
        const count = 2 + this.phase;
        for (let i = 0; i < count; i++) {
          this.pendingShots.push({
            delay: i * 0.2,
            fire: (b, _p, pool) => {
              const bullet = pool.spawn();
              if (!bullet) return;
              bullet.x = b.x;
              bullet.y = b.y - 15 + i * 12;
              bullet.r = 3;
              bullet.bulletType = 'wave';
              bullet.vx = -180 * (1 + (b.phase - 1) * 0.3);
              bullet.vy = 0;
              bullet.wavePhase = Math.random() * Math.PI * 2;
            },
          });
        }
        break;
      }
      case 'laser': {
        const count = 1 + this.phase;
        for (let i = 0; i < count; i++) {
          this.pendingShots.push({
            delay: i * 0.25,
            fire: (b, _p, pool) => {
              const bullet = pool.spawn();
              if (!bullet) return;
              bullet.x = b.x;
              bullet.y = GROUND_Y - 8 - i * 14;
              bullet.r = 5;
              bullet.bulletType = 'laser';
              bullet.vx = -(320 * (1 + (b.phase - 1) * 0.3));
              bullet.vy = 0;
            },
          });
        }
        break;
      }
      case 'rain': {
        const count = 5 + this.phase * 2;
        for (let i = 0; i < count; i++) {
          this.pendingShots.push({
            delay: i * 0.09,
            fire: (b, _p, pool) => {
              const bullet = pool.spawn();
              if (!bullet) return;
              bullet.x = b.x + (Math.random() - 0.5) * 180;
              bullet.y = -12;
              bullet.r = 4;
              bullet.bulletType = 'rain';
              bullet.vx = 0;
              bullet.vy = 150 * (1 + (b.phase - 1) * 0.25);
            },
          });
        }
        break;
      }
    }
  }

  getPatterns(): string[] {
    switch (this.phase) {
      case 1: return ['aimed', 'aimed', 'spread'];
      case 2: return ['aimed', 'spread', 'wave', 'laser'];
      case 3: return ['aimed', 'spread', 'wave', 'laser', 'rain'];
    }
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.flashTimer = 0.15;

    if (this.hp <= 0) {
      this.state = 'defeated';
      this.active = false;
      return true;
    }

    const pct = this.hp / this.maxHp;
    if (pct <= 0.3 && this.phase === 2) {
      this.phase = 3;
      this.state = 'transition';
      TransitionState.enter(this);
    } else if (pct <= 0.6 && this.phase === 1) {
      this.phase = 2;
      this.state = 'transition';
      TransitionState.enter(this);
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, gameTime: number): void {
    const bob = Math.sin(this.bobPhase) * 4;
    ctx.save();
    ctx.translate(this.x, this.y + bob);

    const phaseColors = ['#00c8ff', '#ffd700', '#ff6b6b'];
    const pc = phaseColors[this.phase - 1];
    const glowAlpha = this.phase * 0.06;

    const g = ctx.createRadialGradient(0, -this.h / 2, 5, 0, -this.h / 2, this.w * 0.8);
    g.addColorStop(0, pc + Math.floor(glowAlpha * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, pc + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -this.h / 2, this.w * 0.8, 0, Math.PI * 2);
    ctx.fill();

    if (this.flashTimer > 0) ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    ctx.strokeStyle = pc;
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    ctx.fillStyle = pc;
    ctx.fillRect(-12, -12, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -5, 10, 10);

    const scan = ((gameTime * 50) % (this.w + 10));
    ctx.fillStyle = '#00c8ff';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-this.w / 2 + scan, -this.h / 2 + 3, 2, this.h - 6);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#8899aa';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`AI GUARD P${this.phase}`, 0, this.h / 2 + 14);

    /* HP bar */
    const bw = this.w + 8;
    const bx = -bw / 2;
    const by = -this.h / 2 - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = pc;
    ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), 5);

    ctx.restore();
  }
}
