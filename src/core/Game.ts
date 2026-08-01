import { W, H, GROUND_Y, MAX_SPEED, START_SPEED, MAX_LIVES, NARRATIVE_TEXTS } from '../utils/constants';
import { rectOverlap } from '../utils/math';
import { OVERCLOCK_THRESHOLD, OVERCLOCK_SPEED_BONUS } from '../utils/overclock';
import { Pool } from './Pool';
import { Player } from '../entities/Player';
import { Obstacle } from '../entities/Obstacle';
import { Coin } from '../entities/Coin';
import { Powerup } from '../entities/Powerup';
import { Enemy, configureEnemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Bullet } from '../entities/Bullet';
import { Projectile } from '../entities/Projectile';
import { Particle, ScorePopup, AmbientDust, Shockwave } from '../entities/Particle';
import { Renderer } from '../systems/Renderer';
import { Spawner } from '../systems/Spawner';
import { Audio } from '../systems/Audio';
import { Tilemap, T as TILE } from '../systems/Tilemap';
import { HUD } from '../ui/HUD';
import { Screens } from '../ui/Screens';
import { CollisionSystem } from '../systems/CollisionSystem';
import type { Afterimage } from '../entities/Player';
import type { CharacterType, SaveData, BlessingType } from '../utils/constants';
import { SKILL_TREE, BLESSINGS } from '../utils/constants';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private spawner: Spawner;
  private hud: HUD;
  private screens: Screens;

  private state: 'menu' | 'playing' | 'dead' | 'reward' = 'menu';
  private score = 0;
  private distance = 0;
  private scrollOffset = 0;
  private speed = START_SPEED;
  private lives = MAX_LIVES;
  private comboCount = 0;
  private comboTimer = 0;
  private coinsCollected = 0;
  private powersCollected = 0;
  private screenShake = 0;
  private gameTime = 0;
  private paused = false;
  private timeMultiplier = 1.0;
  private bestScore = 0;
  private difficulty = 1;
  private kills = 0;
  private totalCoins = 0;
  private skillLevels: Record<string, number> = {};
  private selectedCharacter: CharacterType = 'striker';
  private settings: Record<string, boolean> = {};
  private bossEncounterCount = 0;
  private stats = { kills: 0, maxCombo: 0, bossKills: 0 };

  private player: Player;
  private afterimages: Afterimage[] = [];
  private obstaclePool: Pool<Obstacle>;
  private coinPool: Pool<Coin>;
  private powerupPool: Pool<Powerup>;
  private enemyPool: Pool<Enemy>;
  private particlePool: Pool<Particle>;
  private ambientPool: Pool<AmbientDust>;
  private popupPool: Pool<ScorePopup>;
  private shockwavePool: Pool<Shockwave>;
  private boss!: Boss;
  private bulletPool: Pool<Bullet>;
  private bossFight = false;
  private bossIndex = 0;
  private projectilePool: Pool<Projectile>;
  private tilemap: Tilemap;
  private bossHud: HTMLElement;
  private bossHpFill: HTMLElement;
  private bossPhaseEl: HTMLElement;
  private bossNameEl: HTMLElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.renderer = new Renderer();
    this.spawner = new Spawner();
    this.hud = new HUD();
    this.bestScore = Number(localStorage.getItem('platBest3')) || 0;
    this.loadSave();

    this.loadSettings();

    this.screens = new Screens(
      (ch: CharacterType) => { this.selectedCharacter = ch; this.start(); },
      () => this.restart(),
      () => this.goHome(),
      () => this.togglePause(),
      (id: string) => this.onSkillUpgrade(id),
      () => this.openSettings(),
      () => { this.loadSettings(); this.applySettings(); },
    );

    this.player = new Player();
    this.obstaclePool = new Pool(() => new Obstacle(), 40);
    this.coinPool = new Pool(() => new Coin(), 30);
    this.powerupPool = new Pool(() => new Powerup(), 5);
    this.enemyPool = new Pool(() => new Enemy(), 100);
    this.particlePool = new Pool(() => new Particle(), 300);
    this.ambientPool = new Pool(() => new AmbientDust(), 30);
    this.popupPool = new Pool(() => new ScorePopup(), 15);
    this.shockwavePool = new Pool(() => new Shockwave(), 12);
    this.bulletPool = new Pool(() => new Bullet(), 80);
    this.projectilePool = new Pool(() => new Projectile(), 30);
    this.boss = new Boss();
    this.tilemap = new Tilemap();
    this.bossHud = document.getElementById('boss-hud')!;
    this.bossHpFill = document.getElementById('boss-hp-fill')!;
    this.bossPhaseEl = document.getElementById('boss-phase')!;
    this.bossNameEl = document.getElementById('boss-name')!;

    this.setupInput();
  }

  private loadSettings(): void {
    try {
      this.settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
    } catch { this.settings = {}; }
  }

  private applySettings(): void {
    const root = document.documentElement;
    const fx = this.settings.fx !== false;
    root.style.setProperty('--fx-enabled', fx ? '1' : '0');
  }

  private openSettings(): void {
    if (this.state === 'playing') this.paused = true;
  }

  private setupInput(): void {
    document.addEventListener('keyup', (e) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && this.state === 'playing') this.player.stopJump();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (this.state === 'playing' && !this.paused) this.player.jump();
        else if (this.state === 'menu') this.start();
        else if (this.state === 'dead') this.restart();
      }
      if (e.code === 'ArrowDown' && this.state === 'playing' && !this.paused) this.player.stomp();
      if (e.code === 'KeyP' && this.state === 'playing') this.togglePause();
      if (e.code === 'KeyZ' && this.state === 'playing' && !this.paused) {
        if (this.player.character === 'striker') {
          if (this.player.shoot()) this.spawnProjectile();
        } else if (this.player.character === 'tank') {
          this.player.swingSword();
        }
      }
      if (e.code === 'KeyX' && this.state === 'playing' && !this.paused) {
        if (this.player.character === 'ghost') this.player.dash();
      }
    });

    this.canvas.addEventListener('mousedown', () => {
      if (this.state === 'playing' && !this.paused) this.player.jump();
    });

    /* Touch with swipe */
    let touchStartX = 0, touchStartY = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      if (this.state === 'menu') this.start();
      else if (this.state === 'dead') this.restart();
      else if (this.state === 'playing' && this.paused) this.togglePause();
    });

    this.canvas.addEventListener('touchmove', (e) => e.preventDefault());

    this.canvas.addEventListener('touchend', (e) => {
      if (this.state !== 'playing' || this.paused) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);

      /* Tap or short flick → jump */
      if (absDx < 30 && absDy < 30) { this.player.jump(); return; }

      /* Swipe down → stomp */
      if (absDy > 40 && dy > 0 && absDy > absDx) { this.player.stomp(); return; }

      /* Swipe up → jump (double jump if in air) */
      if (absDy > 40 && dy < 0 && absDy > absDx) { this.player.jump(); return; }

      /* Horizontal swipes */
      if (absDx > 40 && absDx > absDy) {
        if (dx < 0) {
          /* Left → attack */
          if (this.player.character === 'striker') { if (this.player.shoot()) this.spawnProjectile(); }
          else if (this.player.character === 'tank') { this.player.swingSword(); }
        } else {
          /* Right → dash (ghost) or jump */
          if (this.player.character === 'ghost') this.player.dash();
          else this.player.jump();
        }
      }
    });
  }

  start(): void {
    this.state = 'playing';
    this.screens.hideAll();
    this.reset();
    Audio.setFilter(22000);
    Audio.startBGM();
  }

  restart(): void {
    this.state = 'playing';
    this.screens.hideAll();
    this.reset();
    Audio.setFilter(22000);
    Audio.startBGM();
  }

  private reset(): void {
    this.score = 0;
    this.distance = 0;
    this.scrollOffset = 0;
    this.speed = START_SPEED;
    this.lives = MAX_LIVES + (this.skillLevels.extra_life || 0);
    this.gameTime = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.coinsCollected = 0;
    this.powersCollected = 0;
    this.screenShake = 0;
    this.difficulty = 1;
    this.timeMultiplier = 1.0;
    Audio.setFilter(22000);
    this.paused = false;
    this.kills = 0;
    this.afterimages = [];
    this.bossFight = false;
    this.bossIndex = 0;
    this.bossEncounterCount = 0;
    this.stats = { kills: 0, maxCombo: 0, bossKills: 0 };
    this.bulletPool.forEachActive(b => b.active = false);
    this.projectilePool.forEachActive(p => p.active = false);
    /* Clear leftover world entities so a fresh run starts clean */
    this.obstaclePool.forEachActive(o => o.active = false);
    this.coinPool.forEachActive(c => c.active = false);
    this.powerupPool.forEachActive(p => p.active = false);
    this.enemyPool.forEachActive(e => e.active = false);
    this.particlePool.forEachActive(p => p.active = false);
    this.popupPool.forEachActive(p => p.active = false);
    this.shockwavePool.forEachActive(p => p.active = false);
    this.ambientPool.forEachActive(d => d.active = false);
    this.player.setCharacter(this.selectedCharacter);
    this.player.reset();
    this.spawner.reset();
    this.tilemap.reset();
    /* Boss inactive until its first encounter — no ghost boss on screen */
    this.boss.active = false;
    this.bossHud.classList.add('hidden');

    /* Apply skill bonuses */
    const spdBonus = (this.skillLevels.speed_start || 0) * 0.1;
    this.speed = START_SPEED * (1 + spdBonus);
    if (this.skillLevels.shield_start) this.player.powerups.shield = 3;

    /* Apply settings */
    this.loadSettings();
    this.applySettings();
  }

  togglePause(): void {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
    if (this.paused) this.screens.showPause();
    else this.screens.hidePause();
  }

  fixedUpdate(dt: number): void {
    if (this.state !== 'playing' || this.paused) return;
    this.gameTime += dt;
    this.difficulty = 1 + this.distance * 0.00008;

    this.timeMultiplier += (1 - this.timeMultiplier) * Math.min(1, dt * 40);
    const timeScale = this.timeMultiplier * (this.player.invincible > 0 ? 0.3 : 1);
    const t = dt * timeScale;

    this.distance += this.speed * t * 0.02;
    this.scrollOffset += this.speed * t;
    this.tilemap.scrollOffset = this.scrollOffset;
    this.speed = Math.min(MAX_SPEED, this.speed + t * (2 + this.difficulty * 0.5));
    this.score += this.speed * t * 0.05;

    if (this.player.powerups.boost > 0) {
      this.speed = Math.min(MAX_SPEED, this.speed + t * 15);
    }

    /* Ghost dash surge: sinusoidal world-speed boost while flying */
    if (this.player.character === 'ghost' && this.player.ability?.type === 'dash') {
      const p = this.player.ability.progress;
      this.speed = Math.min(MAX_SPEED, this.speed + t * 380 * Math.sin(Math.min(1, p) * Math.PI));
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= t;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    /* Overclock mode */
    const wasOverclocked = this.player.overclocked;
    this.player.overclocked = this.comboCount >= OVERCLOCK_THRESHOLD && this.state === 'playing';
    if (this.player.overclocked && !wasOverclocked) {
      this.speed *= 1 + OVERCLOCK_SPEED_BONUS;
      Audio.setOverclock(true);
    } else if (!this.player.overclocked && wasOverclocked) {
      Audio.setOverclock(false);
    }

    this.player.update(t, this.bossFight ? 0 : this.speed, this.tilemap);

    /* Death plane — fell off world */
    if (this.player.y > H + 100) this.die();

    /* Landing dust + impact ring */
    if (this.player.justLanded) {
      this.spawnParticles(this.player.x, this.player.y, 8, '#00c8ff', 60, 0.4, 2);
      this.spawnShockwave(this.player.x, this.player.y, 34, '#00c8ff');
      this.screenShake = Math.max(this.screenShake, 1.5);
      if (this.player.slamLanded) {
        /* Ground slam AoE: big impact + damage enemies around */
        this.screenShake = Math.max(this.screenShake, 6);
        this.spawnShockwave(this.player.x, this.player.y, 70, '#00c8ff');
        this.spawnParticles(this.player.x, this.player.y, 24, '#00c8ff', 260, 0.6, 5);
        this.enemyPool.forEachActive(e => {
          const dx = Math.abs(this.player.x - (e.x + e.w / 2));
          if (dx > 150) return;
          /* Ground shockwave — only hits enemies near the ground */
          if (Math.abs(e.y + e.h - GROUND_Y) > 100) return;
          const dead = e.takeDamage(1);
          if (dead) {
            this.kills++;
            this.stats.kills++;
            this.score += 80;
            this.timeMultiplier = Math.min(this.timeMultiplier, 0.4);
            Audio.combo(this.kills);
            const pop = this.popupPool.spawn();
            if (pop) { pop.x = e.x; pop.y = e.y - 10; pop.text = '+80 💀'; pop.life = 1; pop.color = '#ffd700'; }
            this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 10, '#ff6b6b', 120, 0.5, 4);
          } else {
            this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 6, '#ffd700', 80, 0.3, 3);
          }
        });
      }
    }

    /* Ghost dash spark */
    if (this.player.character === 'ghost' && this.player.ability?.type === 'dash' && this.player.ability.progress < 0.05) {
      this.spawnParticles(this.player.x, this.player.y - this.player.h / 2, 12, '#7b2ff7', 100, 0.3, 3);
    }

    /* Overclock edge glow particles */
    if (this.player.overclocked && Math.floor(this.gameTime * 30) % 3 === 0) {
      this.spawnParticles(
        this.player.x + (Math.random() - 0.5) * this.player.w * 1.5,
        this.player.y - this.player.h * (0.3 + Math.random() * 0.5),
        1, '#00c8ff', 30, 0.3, 2,
      );
    }

    /* Boss trigger */
    if (!this.bossFight && this.distance >= 2000 * (this.bossIndex + 1)) {
      this.startBossFight();
    }

    if (this.bossFight) {
      this.updateBossFight(t);

      /* Combat stays live while the world is frozen: projectiles, sword, stomp, bullets */
      this.projectilePool.forEachActive(p => p.update(t));

      const px = this.player.x - this.player.w / 2;
      const py = this.player.y - this.player.h;
      const bx = this.boss.x - this.boss.w / 2;
      const by = this.boss.y - this.boss.h / 2;

      /* Striker projectiles → boss */
      this.projectilePool.forEachActive(p => {
        if (p.x + p.r > bx && p.x - p.r < bx + this.boss.w &&
            p.y + p.r > by && p.y - p.r < by + this.boss.h) {
          p.active = false;
          const dead = this.boss.takeDamage(1 + (this.skillLevels.bullet_damage || 0));
          this.spawnParticles(p.x, p.y, 6, '#ffd700', 80, 0.3, 3);
          if (dead) this.onBossDefeated();
        }
      });
      if (this.state !== 'playing') return;

      /* Tank sword → boss */
      const swordHit = this.player.getSwordHitbox();
      if (swordHit && rectOverlap(swordHit.x, swordHit.y, swordHit.w, swordHit.h, bx, by, this.boss.w, this.boss.h)) {
        const dead = this.boss.takeDamage(2);
        this.spawnParticles(this.boss.x, this.boss.y - this.boss.h / 2, 8, '#ffd700', 80, 0.3, 3);
        if (dead) this.onBossDefeated();
      }
      if (this.state !== 'playing') return;

      /* Boss body — stomp from above deals damage */
      if (rectOverlap(px, py, this.player.w, this.player.h, bx, by, this.boss.w, this.boss.h)) {
        if (this.player.vy > 0 && py + this.player.h < by + this.boss.h * 0.25) {
          this.player.vy = -400;
          this.score += 200;
          this.screenShake = 8;
          this.timeMultiplier = 0.05;
          Audio.stomp();
          Audio.duckBGM();
          this.spawnParticles(this.boss.x, this.boss.y - this.boss.h / 2, 20, '#ff6b6b', 200, 0.6, 5);
          this.spawnShockwave(this.boss.x, this.boss.y - this.boss.h / 2, 80, '#ff6b6b');
          const dead = this.boss.takeDamage(1);
          const pop = this.popupPool.spawn();
          if (pop) { pop.x = this.boss.x; pop.y = this.boss.y - 30; pop.text = dead ? '💥 节点攻破!' : '-1 HP'; pop.life = 1.2; pop.color = '#ffd700'; }
          if (dead) { this.onBossDefeated(); return; }
          if (this.boss.state === 'transition') {
            Audio.powerup();
            this.screenShake = 14;
            this.spawnParticles(this.boss.x, this.boss.y - this.boss.h / 2, 30, '#ffd700', 250, 0.8, 6);
          }
        } else if (this.player.invincible <= 0) {
          this.die();
          return;
        }
      }

      /* Boss bullets → player */
      let bulletHit = false;
      const cx = this.player.x, cy = this.player.y - this.player.h / 2;
      this.bulletPool.forEachActive(b => {
        const dx = cx - b.x, dy = cy - b.y;
        if (dx * dx + dy * dy < (this.player.w * 0.35 + b.r) ** 2) {
          b.active = false;
          if (this.player.invincible <= 0) bulletHit = true;
        }
      });
      if (bulletHit) { this.die(); return; }

      /* FX stays alive during the fight */
      this.particlePool.forEachActive(p => p.update(t));
      this.popupPool.forEachActive(p => p.update(t));
      this.shockwavePool.forEachActive(p => p.update(t));
      this.screenShake *= Math.max(0, 1 - t * 6);

      this.hud.update(this.score, this.distance, this.speed, this.comboCount,
        this.lives, MAX_LIVES, this.player.powerups);
      return;
    }

    /* Afterimage */
    const speedRatio = this.speed / MAX_SPEED;
    if (speedRatio > 0.5 || (!this.player.onGround && Math.abs(this.player.vy) > 100)) {
      const freq = Math.max(1, Math.floor(4 - speedRatio * 3));
      if (Math.floor(this.gameTime * 60) % freq === 0) {
        this.afterimages.push({
          x: this.player.x, y: this.player.y, squash: this.player.squash,
          life: 0.3 + speedRatio * 0.3, maxLife: 0.3 + speedRatio * 0.3,
          boost: this.player.powerups.boost > 0,
          overclock: this.player.overclocked,
          animFrame: this.player.animFrame,
          state: this.player.spriteState,
        });
      }
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life -= t;
      if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
    }

    /* Ambient dust */
    if (Math.floor(this.gameTime * 20) % 3 === 0 && this.settings.fx !== false) {
      const d = this.ambientPool.spawn();
      if (d) {
        d.x = Math.random() * W + 20;
        d.y = Math.random() * GROUND_Y * 0.6;
        d.vx = -(20 + Math.random() * 30);
        d.vy = -5 + Math.random() * 10;
        d.size = 1.5 + Math.random() * 2.5;
        d.life = 3 + Math.random() * 3;
        d.maxLife = 6;
        d.alpha = 0.2 + Math.random() * 0.3;
      }
    }

    /* Tilemap enemy spawns — type mix scales with distance */
    {
      const enemySpawns = this.tilemap.collectEnemiesAt(
        this.player.x, this.player.y - this.player.h / 2, 300,
      );
      const d = this.scrollOffset;
      let types: Array<'drone' | 'enforcer' | 'turret'>;
      if (d < 500) types = ['drone'];
      else if (d < 1500) types = ['drone', 'drone', 'turret'];
      else {
        const r = Math.random();
        types = r < 0.4 ? ['drone'] : r < 0.75 ? ['turret'] : ['enforcer'];
      }
      for (const s of enemySpawns) {
        const e = this.enemyPool.spawn();
        if (!e) break;
        configureEnemy(e, types[Math.floor(Math.random() * types.length)]);
        e.x = s.wx;
        e.y = s.wy;
        e.baseY = s.wy;
        e.flashTimer = 0;
        e.bobPhase = Math.random() * Math.PI * 2;
      }
    }

    /* Tilemap coin collection */
    const collected = this.tilemap.collectCoinsAt(
      this.player.x, this.player.y - this.player.h / 2, 14,
    );
    for (const c of collected) {
      this.coinsCollected++;
      this.totalCoins++;
      this.score += 10;
      this.comboCount++;
      this.comboTimer = 2;
      Audio.combo(this.comboCount);
      this.spawnParticles(c.wx, c.wy, 8, '#ffd700', 80, 0.4, 3);
      const pop = this.popupPool.spawn();
      if (pop) { pop.x = c.wx; pop.y = c.wy; pop.text = '+10'; pop.life = 0.8; pop.color = '#ffd700'; }
      if (this.comboCount > 1 && this.comboCount % 5 === 0) {
        this.score += 50;
        const pop2 = this.popupPool.spawn();
        if (pop2) { pop2.x = c.wx; pop2.y = c.wy - 20; pop2.text = 'COMBO x' + this.comboCount + '!'; pop2.life = 1.2; pop2.color = '#ff6b6b'; }
        this.spawnParticles(c.wx, c.wy, 10, '#ff6b6b', 100, 0.5, 4);
        this.showComboPop(this.comboCount);
      }
    }

    /* Move objects */
    const moveX = this.speed * t;
    this.obstaclePool.forEachActive(o => {
      o.x -= moveX;
      o.update(t);
      if (o.x < -60) o.active = false;
    });
    this.coinPool.forEachActive(c => {
      c.x -= moveX;
      if (c.x < -40) c.active = false;
    });
    this.powerupPool.forEachActive(p => {
      p.x -= moveX;
      p.bob += t * 3;
      if (p.x < -40) p.active = false;
    });
    this.enemyPool.forEachActive(e => {
      e.x -= moveX;
      e.update(t);
      if (e.x < -60) e.active = false;
    });

    /* Spawner */
    this.spawner.update(t, this.scrollOffset, this.speed,
      this.obstaclePool, this.coinPool, this.powerupPool, this.timeMultiplier);

    /* Unified collision via CollisionSystem */
    const colResult = CollisionSystem.checkAll(
      this.player, this.obstaclePool, this.enemyPool, this.coinPool, this.powerupPool,
      this.projectilePool, this.boss, this.bulletPool, this.bossFight, t,
    );

    /* Process collision results */
    if (colResult.obstacleHit) {
      this.score += 50;
      Audio.stomp();
    }

    /* 擦弹 near-miss bonus */
    for (const o of colResult.nearMisses) {
      this.score += 15;
      this.comboCount++;
      this.comboTimer = 2;
      Audio.nearMiss();
      this.screenShake = Math.max(this.screenShake, 0.5);
      this.spawnParticles(o.x, (o.y + o.h / 2), 6, '#00c8ff', 60, 0.25, 2);
      const pop = this.popupPool.spawn();
      if (pop) { pop.x = o.x; pop.y = o.y; pop.text = '擦弹 +15'; pop.life = 0.8; pop.color = '#00c8ff'; }
      if (this.comboCount > 1 && this.comboCount % 5 === 0) this.showComboPop(this.comboCount);
    }

    for (const se of colResult.stompedEnemies) {
      this.score += se.score;
      Audio.stomp();
      this.timeMultiplier = Math.min(this.timeMultiplier, 0.5);
      this.spawnParticles(se.enemy.x + se.enemy.w / 2, se.enemy.y + se.enemy.h / 2, 12, '#ff6b6b', 140, 0.6, 4);
      this.spawnShockwave(se.enemy.x + se.enemy.w / 2, se.enemy.y + se.enemy.h / 2, 50, '#ff6b6b');

      if (this.player.blessing === 'magnetic_stomp') {
        const px = this.player.x, py2 = this.player.y - this.player.h / 2;
        this.enemyPool.forEachActive(e2 => {
          const dx = px - e2.x, dy = py2 - e2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0 && dist < 200) {
            e2.x += (dx / dist) * 400 * t;
            e2.y += (dy / dist) * 200 * t;
          }
        });
        this.spawnParticles(this.player.x, this.player.y, 16, '#00c8ff', 160, 0.4, 3);
      }
    }

    for (const de of colResult.damagedEnemies) {
      if (de.score > 0) this.score += de.score;
      this.spawnParticles(de.enemy.x + de.enemy.w / 2, de.enemy.y + de.enemy.h / 2, 8, '#ffd700', 80, 0.3, 3);
    }

    for (const ke of colResult.killedEnemies) {
      this.kills++;
      this.stats.kills++;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.comboCount);
      Audio.combo(this.kills);
      this.timeMultiplier = Math.min(this.timeMultiplier, 0.4);
      const pop = this.popupPool.spawn();
      if (pop) { pop.x = ke.x; pop.y = ke.y - 10; pop.text = '+80 💀'; pop.life = 1; pop.color = '#ffd700'; }
    }

    for (const c of colResult.collectedCoins) {
      const mult = this.player.powerups.x2 > 0 ? 2 : 1;
      this.score += 10 * mult;
      this.coinsCollected++;
      this.totalCoins++;
      this.comboCount++;
      this.comboTimer = 2;
      Audio.combo(this.comboCount);
      this.spawnParticles(c.x, c.y, 8, '#ffd700', 80, 0.4, 3);
      const pop = this.popupPool.spawn();
      if (pop) { pop.x = c.x; pop.y = c.y; pop.text = '+' + (10 * mult); pop.life = 0.8; pop.color = '#ffd700'; }
      if (this.comboCount > 1 && this.comboCount % 5 === 0) {
        this.score += 50;
        const pop2 = this.popupPool.spawn();
        if (pop2) { pop2.x = c.x; pop2.y = c.y - 20; pop2.text = 'COMBO x' + this.comboCount + '!'; pop2.life = 1.2; pop2.color = '#ff6b6b'; }
        this.spawnParticles(c.x, c.y, 10, '#ff6b6b', 100, 0.5, 4);
        this.showComboPop(this.comboCount);
      }
    }

    for (const p of colResult.collectedPowerups) {
      this.powersCollected++;
      this.player.powerups[p.powerType] = (this.player.powerups[p.powerType] || 0) + 5;
      Audio.powerup();
      const names: Record<string, string> = { shield: '🛡 护盾', magnet: '🧲 磁铁', x2: '✖2 双倍', boost: '⚡ 加速' };
      const colors: Record<string, string> = { shield: '#00c8ff', magnet: '#ffd700', x2: '#ff6b6b', boost: '#7b2ff7' };
      const pop = this.popupPool.spawn();
      if (pop) { pop.x = p.x; pop.y = p.y - 10; pop.text = names[p.powerType] || '道具'; pop.life = 1; pop.color = '#00c8ff'; }
      this.spawnParticles(p.x, p.y, 12, colors[p.powerType] || '#00c8ff', 100, 0.6, 4);
    }

    if (colResult.bossStomped) {
      this.score += 200;
      this.screenShake = 8;
      this.timeMultiplier = 0.05;
      Audio.stomp();
      Audio.duckBGM();
      this.spawnParticles(this.boss.x, this.boss.y - this.boss.h / 2, 20, '#ff6b6b', 200, 0.6, 5);
      this.spawnShockwave(this.boss.x, this.boss.y - this.boss.h / 2, 80, '#ff6b6b');
      const pop = this.popupPool.spawn();
      if (pop) { pop.x = this.boss.x; pop.y = this.boss.y - 30; pop.text = colResult.bossDefeated ? '💥 节点攻破!' : '-1 HP'; pop.life = 1.2; pop.color = '#ffd700'; }
      if (colResult.bossDefeated) { this.onBossDefeated(); return; }
      if (this.boss.state === 'transition') {
        Audio.powerup();
        this.screenShake = 14;
        this.spawnParticles(this.boss.x, this.boss.y - this.boss.h / 2, 30, '#ffd700', 250, 0.8, 6);
      }
    }

    if (colResult.shieldBroken) {
      this.spawnParticles(this.player.x, this.player.y - this.player.h / 2, 12, '#00c8ff', 120, 0.5, 3);
      this.spawnShockwave(this.player.x, this.player.y - this.player.h / 2, 55, '#00c8ff');
      Audio.powerup();
    }
    if (colResult.playerHit) {
      this.die();
      return;
    }

    /* Projectile movement */
    this.projectilePool.forEachActive(p => p.update(t));

    /* Sword wave projectile blessing */
    const swordHit = this.player.getSwordHitbox();
    if (swordHit && this.player.blessing === 'sword_wave' && this.player.ability && this.player.ability.progress < 0.05) {
      const pw = this.projectilePool.spawn();
      if (pw) {
        pw.x = this.player.x + 10; pw.y = this.player.y - this.player.h / 2;
        pw.vx = 400; pw.vy = 0; pw.r = 6;
      }
    }

    this.particlePool.forEachActive(p => p.update(t));
    this.popupPool.forEachActive(p => p.update(t));
    this.shockwavePool.forEachActive(p => p.update(t));
    this.ambientPool.forEachActive(d => d.update(t));

    /* Magnet */
    if (this.player.powerups.magnet > 0) {
      const range = 120;
      this.coinPool.forEachActive(c => {
        const dx = this.player.x - c.x;
        const dy = (this.player.y - this.player.h / 2) - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < range && dist > 0) {
          c.x += (dx / dist) * 300 * t;
          c.y += (dy / dist) * 300 * t;
        }
      });
    }

    this.screenShake *= Math.max(0, 1 - t * 6);

    this.hud.update(this.score, this.distance, this.speed, this.comboCount,
      this.lives, MAX_LIVES, this.player.powerups);
  }

  private spawnProjectile(): void {
    const bonus = (this.skillLevels.bullet_damage || 0);
    const r = 3 + bonus * 0.5;
    const count = this.player.blessing === 'spread_shot' ? 3 : 1;
    const baseVx = 350 + this.speed;
    for (let i = 0; i < count; i++) {
      const p = this.projectilePool.spawn();
      if (!p) break;
      p.x = this.player.x + 20;
      p.y = this.player.y - this.player.h * 0.85;
      p.r = r * (count > 1 ? 0.7 : 1);
      if (count > 1) {
        const angle = (i - 1) * 0.25;
        p.vx = Math.cos(angle) * baseVx;
        p.vy = Math.sin(angle) * baseVx;
      } else {
        p.vx = baseVx;
      }
    }
  }

  private loadSave(): void {
    try {
      const raw = localStorage.getItem('cyberSave');
      if (raw) {
        const data: SaveData = JSON.parse(raw);
        this.totalCoins = data.totalCoins || 0;
        this.skillLevels = data.skills || {};
      }
    } catch {}
  }

  private saveSave(): void {
    try {
      const data: SaveData = { totalCoins: this.totalCoins, skills: this.skillLevels };
      localStorage.setItem('cyberSave', JSON.stringify(data));
    } catch {}
  }

  showTitle(): void {
    this.screens.showTitle(this.totalCoins, this.skillLevels);
  }

  private goHome(): void {
    this.saveSave();
    Audio.stopBGM();
    this.state = 'menu';
    this.screens.showTitle(this.totalCoins, this.skillLevels);
  }

  private onSkillUpgrade(id: string): void {
    const skill = SKILL_TREE[id];
    if (!skill) return;
    const level = this.skillLevels[id] || 0;
    if (level >= skill.maxLevel) return;
    const cost = skill.costs[level];
    if (this.totalCoins < cost) return;
    this.totalCoins -= cost;
    this.skillLevels[id] = level + 1;
    this.saveSave();
    this.screens.showSkillTree(this.totalCoins, this.skillLevels);
  }

  private startBossFight(): void {
    this.bossFight = true;
    this.bossEncounterCount++;
    const scaledDiff = this.difficulty + this.bossEncounterCount * 0.5;
    this.boss.reset(scaledDiff);
    /* Scale boss HP and fire rate by encounter count */
    const hpMul = 1 + (this.bossEncounterCount - 1) * 0.5;
    this.boss.maxHp = Math.floor(this.boss.maxHp * hpMul);
    this.boss.hp = this.boss.maxHp;
    this.bulletPool.forEachActive(b => b.active = false);
    this.speed = 0;
    this.bossHud.classList.remove('hidden');
    this.bossNameEl.textContent = `⚠ AI 守卫 v${this.bossEncounterCount}.0`;
  }

  private updateBossFight(t: number): void {
    this.boss.update(t, this.player, this.bulletPool, this.gameTime);
    this.bulletPool.forEachActive(b => b.update(t));

    /* Bullet cleanup off-screen */
    this.bulletPool.forEachActive(b => {
      if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) b.active = false;
    });

    /* Boss HUD */
    const hpPct = Math.max(0, (this.boss.hp / this.boss.maxHp) * 100);
    this.bossHpFill.style.width = hpPct + '%';
    this.bossPhaseEl.textContent = `PHASE ${this.boss.phase}`;
    const colors = ['#00c8ff', '#ffd700', '#ff6b6b'];
    this.bossHpFill.style.background = colors[this.boss.phase - 1];
  }

  private onBossDefeated(): void {
    Audio.powerup();
    this.screenShake = 12;
    this.bossFight = false;
    this.bossIndex++;
    this.stats.bossKills++;
    this.bossHud.classList.add('hidden');
    this.state = 'reward';

    /* Offer blessings relevant to current character */
    const blessingPool: Record<string, BlessingType[]> = {
      striker: ['spread_shot'],
      ghost: ['phase_shift'],
      tank: ['sword_wave', 'magnetic_stomp'],
    };
    const available = (blessingPool[this.selectedCharacter] || []).filter(b => this.player.blessing !== b);

    this.screens.showReward((id: string) => {
      this.state = 'playing';
      this.applyReward(id);
      if (id !== 'speed_boost') this.speed = START_SPEED;
    }, available.length > 0 ? available : undefined);
  }

  private applyReward(id: string): void {
    switch (id) {
      case 'heal':
        this.lives = Math.min(MAX_LIVES, this.lives + 1);
        this.spawnParticles(this.player.x, GROUND_Y, 20, '#ff6b6b', 80, 0.6, 4);
        break;
      case 'shield_up':
        this.player.powerups.shield = 10;
        break;
      case 'speed_boost':
        this.speed = Math.min(MAX_SPEED, this.speed + 150);
        break;
      case 'magnet_up':
        this.player.powerups.magnet = 15;
        break;
      case 'x2_up':
        this.player.powerups.x2 = 12;
        break;
      case 'score_bonus':
        this.score += 500;
        const pop = this.popupPool.spawn();
        if (pop) { pop.x = this.player.x; pop.y = this.player.y - 30; pop.text = '+500 📀'; pop.life = 1.5; pop.color = '#ffd700'; }
        break;
      case 'spread_shot':
      case 'magnetic_stomp':
      case 'phase_shift':
      case 'sword_wave':
        this.player.blessing = id as BlessingType;
        break;
    }
    this.spawnParticles(this.player.x, this.player.y - this.player.h / 2, 16, '#ffd700', 150, 0.5, 4);
  }

  private die(): void {
    this.timeMultiplier = 0.05;
    this.lives--;
    Audio.hit();
    Audio.setFilter(400);
    this.screenShake = 8;
    this.spawnParticles(this.player.x, this.player.y - this.player.h / 2, 20, '#ff6b6b', 150, 0.8, 4);

    /* Danger flash */
    this.triggerDangerFlash();

    /* Track stats */
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.comboCount);

    if (this.lives <= 0) {
      Audio.die();
      Audio.stopBGM();
      this.state = 'dead';
      const isNew = this.score > this.bestScore;
      if (isNew) {
        this.bestScore = this.score;
        localStorage.setItem('platBest3', String(this.bestScore));
      }
      this.saveSave();
      const fragment = NARRATIVE_TEXTS[Math.floor(Math.random() * NARRATIVE_TEXTS.length)];
      this.screens.showGameOver(this.score, this.bestScore, this.distance, this.coinsCollected, this.powersCollected, isNew, fragment, this.stats);
    } else {
      this.player.invincible = 2;
      this.player.forceLand();
    }
  }

  private spawnParticles(x: number, y: number, count: number, color: string, spread: number, life: number, size: number): void {
    if (this.settings.fx === false) return;
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.spawn();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * spread + 20;
      p.x = x + (Math.random() - 0.5) * 8;
      p.y = y + (Math.random() - 0.5) * 8;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd - 30;
      p.life = life * (0.5 + Math.random() * 0.5);
      p.maxLife = p.life;
      p.color = color;
      p.size = size * (0.5 + Math.random() * 0.5);
    }
    /* Extra white sparks for bigger bursts */
    if (count > 10) {
      for (let i = 0; i < count * 0.5; i++) {
        const p = this.particlePool.spawn();
        if (!p) break;
        const angle = Math.random() * Math.PI * 2;
        const spd = spread * 1.5 * (0.5 + Math.random() * 0.5);
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.life = life * 0.3 * (0.5 + Math.random() * 0.5);
        p.maxLife = p.life;
        p.color = '#ffffff';
        p.size = size * 0.3;
      }
    }
  }

  private spawnShockwave(x: number, y: number, maxRadius: number, color: string): void {
    if (this.settings.fx === false) return;
    const s = this.shockwavePool.spawn();
    if (!s) return;
    s.x = x;
    s.y = y;
    s.maxRadius = maxRadius;
    s.color = color;
    s.life = 0.35;
    s.maxLife = s.life;
  }

  private showComboPop(combo: number): void {
    const el = document.getElementById('combo-pop')!;
    el.textContent = 'x' + combo;
    el.classList.remove('pop-anim');
    /* Force reflow to restart animation */
    void el.offsetWidth;
    el.classList.add('pop-anim');
  }

  private triggerDangerFlash(): void {
    const el = document.getElementById('danger-flash')!;
    el.classList.remove('flash-anim');
    void el.offsetWidth;
    el.classList.add('flash-anim');
  }

  draw(): void {
    this.ctx.save();

    this.renderer.draw(this.ctx, 1 / 60, this.gameTime, this.distance, this.scrollOffset, this.speed,
      this.player, this.afterimages,
      this.obstaclePool, this.coinPool, this.powerupPool, this.enemyPool,
      this.particlePool, this.ambientPool, this.popupPool, this.shockwavePool,
      this.boss, this.bulletPool, this.projectilePool,
      this.tilemap, this.settings.shake === false ? 0 : this.screenShake);

    this.ctx.restore();
  }
}
