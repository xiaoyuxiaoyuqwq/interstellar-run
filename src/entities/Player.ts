import {
  GRAVITY, GROUND_Y, TERMINAL_VELOCITY,
  JUMP_VELOCITY, DOUBLE_JUMP_VELOCITY,
  STOMP_VELOCITY, INPUT_BUFFER_TIME, TILE_SIZE, CHAR_CONFIG,
} from '../utils/constants';
import { clamp } from '../utils/math';
import type { PowerupType, CharacterType, BlessingType } from '../utils/constants';
import { Audio } from '../systems/Audio';
import type { Tilemap } from '../systems/Tilemap';

export interface Afterimage {
  x: number; y: number; squash: number;
  life: number; maxLife: number; boost: boolean;
  overclock?: boolean;
  animFrame?: number;
  state: SpriteState;
}

export interface AbilityState {
  type: 'shoot' | 'dash' | 'sword';
  progress: number;
}

enum State { Ground, Jumping, Falling, GroundSlam, Sliding, WallSliding }

export type SpriteState = 'run1' | 'run2' | 'jump' | 'fall' | 'run_shoot' | 'slide';

export class Player {
  x = 120;
  y = GROUND_Y;
  w = 26;
  h = 34;
  vy = 0;
  squash = 1;
  stretchX = 1;
  invincible = 0;
  animFrame = 0;
  animTimer = 0;
  powerups: Record<PowerupType, number> = { shield: 0, magnet: 0, x2: 0, boost: 0 };
  trail: { x: number; y: number; life: number }[] = [];
  dashTrail: { x: number; y: number; alpha: number }[] = [];
  character: CharacterType = 'striker';

  /* Ability state */
  ability: AbilityState | null = null;
  shootCooldown = 0;
  dashCooldown = 0;
  dashing = false;
  swordCooldown = 0;
  shieldHP = 0;
  shieldRecharge = 0;
  justLanded = false;
  slamLanded = false;
  overclocked = false;
  blessing: BlessingType | null = null;

  private state = State.Ground;
  private jumpBufferTimer = 0;
  private doubleJumpUsed = false;
  private coyoteTimer = 0;
  private readonly COYOTE_TIME = 0.1;
  slideTimer = 0;
  wallSide: 'left' | 'right' | null = null;

  get onGround(): boolean { return this.state === State.Ground || this.state === State.Sliding; }
  get isSlamming(): boolean { return this.state === State.GroundSlam; }
  get canShoot(): boolean { return CHAR_CONFIG[this.character].hasShoot; }
  get canDash(): boolean { return CHAR_CONFIG[this.character].hasDash && this.dashCooldown <= 0; }
  get canSwing(): boolean { return CHAR_CONFIG[this.character].hasSword && this.swordCooldown <= 0; }

  get spriteState(): SpriteState {
    if (this.state === State.Sliding || this.state === State.WallSliding) return 'slide';
    if (this.state === State.Jumping) return 'jump';
    if (this.state === State.Falling || this.state === State.GroundSlam) return 'fall';
    if (this.character === 'striker' && this.ability?.type === 'shoot' && this.ability.progress < 0.3) return 'run_shoot';
    return this.animFrame % 2 === 0 ? 'run1' : 'run2';
  }

  setCharacter(ch: CharacterType): void {
    this.character = ch;
    if (ch === 'tank') { this.shieldHP = 1; this.shieldRecharge = 5; }
  }

  reset(): void {
    this.x = 120;
    this.y = GROUND_Y;
    this.vy = 0;
    this.state = State.Ground;
    this.invincible = 0;
    this.squash = 1;
    this.jumpBufferTimer = 0;
    this.doubleJumpUsed = false;
    this.animFrame = 0;
    this.animTimer = 0;
    this.powerups = { shield: 0, magnet: 0, x2: 0, boost: 0 };
    this.trail = [];
    this.dashTrail = [];
    this.overclocked = false;
    this.blessing = null;
    this.ability = null;
    this.shootCooldown = 0;
    this.dashCooldown = 0;
    this.dashing = false;
    this.swordCooldown = 0;
    this.slideTimer = 0;
    this.wallSide = null;
    if (this.character === 'tank') { this.shieldHP = 1; this.shieldRecharge = 5; }
  }

  update(dt: number, speed: number, tilemap?: Tilemap): void {
    this.animTimer += dt;
    if (this.animTimer > 0.1) {
      this.animTimer = 0;
      this.animFrame++;
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
      if (this.jumpBufferTimer > 0 && this.state === State.Ground) {
        this.execJump();
      }
    }

    this.coyoteTimer -= dt;

    /* Wall slide: reduced gravity when touching wall while falling */
    if (this.state !== State.Ground && this.state !== State.WallSliding && this.wallSide && this.vy > 0) {
      this.state = State.WallSliding;
      this.squash = 0.7;
    }

    this.vy += GRAVITY * dt;
    if (this.vy > TERMINAL_VELOCITY) this.vy = TERMINAL_VELOCITY;

    if (this.state === State.WallSliding) {
      if (!this.wallSide) {
        this.state = State.Falling;
      } else {
        this.vy = Math.min(this.vy, 150);
      }
    }

    if (this.state === State.GroundSlam && this.vy < STOMP_VELOCITY) {
      this.vy = STOMP_VELOCITY;
    }

    this.y += this.vy * dt;

    if (tilemap) {
      this.justLanded = false;
      this.slamLanded = false;
      this.resolveTileCollision(tilemap);
    }

    if (this.state === State.Jumping && this.vy > 0) {
      this.state = State.Falling;
    }

    /* Slide timer */
    if (this.state === State.Sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.state = State.Ground;
        this.h = 34;
        this.squash = 1;
      }
    }

    this.squash += (1 - this.squash) * clamp(dt * 14, 0, 1);
    this.stretchX = 2 - this.squash;
    if (this.invincible > 0) this.invincible -= dt;

    for (const k in this.powerups) {
      const key = k as PowerupType;
      if (this.powerups[key] > 0) this.powerups[key] = Math.max(0, this.powerups[key] - dt);
    }

    /* Ability cooldowns */
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.swordCooldown > 0) this.swordCooldown -= dt;

    /* Ability animation */
    if (this.ability) {
      this.ability.progress += dt * 5;
      if (this.ability.progress >= 1) this.ability = null;
    }

    /* Dash effect — flight + trail (accel curve applied to world speed in Game) */
    if (this.character === 'ghost' && this.ability?.type === 'dash') {
      this.vy = 0; /* Lock vertical — no gravity during dash */
      this.invincible = Math.max(this.invincible, 0.15);
      this.dashing = true;
      /* Dash trail: push every 2 frames */
      if (Math.floor(performance.now() / 33) % 2 === 0) {
        this.dashTrail.push({ x: this.x, y: this.y, alpha: 0.7 });
        if (this.dashTrail.length > 5) this.dashTrail.shift();
      }
    } else {
      this.dashing = false;
      for (let i = this.dashTrail.length - 1; i >= 0; i--) {
        this.dashTrail[i].alpha -= dt * 3;
        if (this.dashTrail[i].alpha <= 0) this.dashTrail.splice(i, 1);
      }
    }

    /* Tank shield recharge */
    if (this.character === 'tank' && this.shieldHP <= 0) {
      this.shieldRecharge -= dt;
      if (this.shieldRecharge <= 0) { this.shieldHP = 1; this.shieldRecharge = 5; }
    }

    /* Trail */
    if (this.state !== State.Ground && Math.abs(this.vy) > 30) {
      this.trail.push({ x: this.x - 12, y: this.y + 16, life: 0.25 });
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }
  }

  private resolveTileCollision(tilemap: Tilemap): void {
    const TS = TILE_SIZE;
    const halfW = this.w / 2;

    const l = this.x - halfW;
    const r = this.x + halfW;
    const head = this.y - this.h;
    const feet = this.y;

    const colL = Math.floor(l / TS);
    const colR = Math.floor(r / TS);
    const rowHead = Math.floor(head / TS);
    const rowFeet = Math.floor(feet / TS);

    const prevOnGround = this.state === State.Ground;

    /* Check ground below feet */
    let grounded = false;
    for (let c = colL; c <= colR; c++) {
      const id = tilemap.getTileAtCol(c, feet);
      if (tilemap.isSolid(id) || tilemap.isPlatform(id)) {
        const tileTop = rowFeet * TS;
        if (feet >= tileTop) {
          this.y = tileTop;
          this.vy = 0;
          grounded = true;
          break;
        }
      }
    }

    if (grounded) {
      this.coyoteTimer = this.COYOTE_TIME;
      this.doubleJumpUsed = false;
      this.wallSide = null;
      if (this.state !== State.Ground && this.state !== State.Sliding) {
        if (this.state === State.GroundSlam) this.slamLanded = true;
        this.state = State.Ground;
        this.squash = 0.6;
        this.justLanded = true;
      }
    } else if (prevOnGround) {
      this.state = State.Falling;
    }

    /* Check wall collision on left/right — skip ground row to avoid corner snagging */
    const groundRow = tilemap.getGroundRow();
    this.wallSide = null;
    for (let r2 = rowHead; r2 < Math.min(rowFeet, groundRow); r2++) {
      const leftId = tilemap.getTileAtCol(colL, r2 * TS + TS / 2);
      if (tilemap.isSolid(leftId)) {
        this.x = (colL + 1) * TS + halfW;
        this.wallSide = 'left';
      }
      const rightId = tilemap.getTileAtCol(colR, r2 * TS + TS / 2);
      if (tilemap.isSolid(rightId)) {
        this.x = colR * TS - halfW;
        this.wallSide = 'right';
      }
    }

    /* Ceiling collision */
    if (this.vy < 0) {
      for (let c = colL; c <= colR; c++) {
        const id = tilemap.getTileAtCol(c, head);
        if (tilemap.isSolid(id)) {
          const tileBottom = (rowHead + 1) * TS;
          this.y = tileBottom + this.h;
          this.vy = 0;
          break;
        }
      }
    }
  }

  jump(): void {
    if (this.state === State.Sliding) {
      this.state = State.Ground;
      this.h = 34;
      this.slideTimer = 0;
      this.execJump();
      return;
    }
    /* Wall jump */
    if (this.state !== State.Ground && this.wallSide) {
      this.vy = JUMP_VELOCITY;
      this.x += this.wallSide === 'left' ? 30 : -30;
      this.wallSide = null;
      this.squash = 0.7;
      this.jumpBufferTimer = 0;
      return;
    }
    this.jumpBufferTimer = INPUT_BUFFER_TIME;
    /* Coyote time: allow jump for a short window after leaving ground */
    if (this.state === State.Ground || this.coyoteTimer > 0) this.execJump();
    else if (this.state === State.Falling && !this.doubleJumpUsed) this.execDoubleJump();
  }

  stopJump(): void {
    if (this.vy < 0) this.vy *= 0.5;
  }

  shoot(): boolean {
    if (!this.canShoot) return false;
    if (this.shootCooldown > 0) return false;
    this.shootCooldown = 0.25;
    this.ability = { type: 'shoot', progress: 0 };
    Audio.jump();
    return true;
  }

  dash(): boolean {
    if (!this.canDash) return false;
    this.dashCooldown = 1.5;
    this.ability = { type: 'dash', progress: 0 };
    this.invincible = 0.25;
    Audio.dblJump();
    return true;
  }

  swingSword(): boolean {
    if (!this.canSwing) return false;
    this.swordCooldown = 0.6;
    this.ability = { type: 'sword', progress: 0 };
    Audio.hit();
    return true;
  }

  getSwordHitbox(): { x: number; y: number; w: number; h: number } | null {
    if (this.character !== 'tank' || !this.ability || this.ability.type !== 'sword') return null;
    return { x: this.x + 5, y: this.y - this.h - 10, w: 30, h: this.h + 20 };
  }

  getDashHitbox(): { x: number; y: number; w: number; h: number } | null {
    if (this.character !== 'ghost' || !this.dashing) return null;
    /* Area in front of the player during dash */
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w + 60, h: this.h };
  }

  private execJump(): void {
    this.vy = JUMP_VELOCITY;
    this.state = State.Jumping;
    this.squash = 1.35;
    this.jumpBufferTimer = 0;
  }

  private execDoubleJump(): void {
    this.vy = DOUBLE_JUMP_VELOCITY;
    this.state = State.Jumping;
    this.doubleJumpUsed = true;
    this.squash = 0.8;
    this.jumpBufferTimer = 0;
  }

  stomp(): void {
    if (this.state === State.Ground) {
      this.state = State.Sliding;
      this.slideTimer = 0.4;
      this.h = 18;
      this.squash = 0.3;
    } else if (this.state !== State.Sliding) {
      this.state = State.GroundSlam;
      this.vy = STOMP_VELOCITY;
    }
  }

  forceLand(): void {
    this.y = GROUND_Y;
    this.vy = 0;
    this.doubleJumpUsed = false;
    this.state = State.Ground;
  }
}
