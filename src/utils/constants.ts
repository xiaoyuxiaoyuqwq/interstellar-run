export const W = 800;
export const H = 450;
export const GRAVITY = 1700;
export const TERMINAL_VELOCITY = 900;
export const GROUND_Y = 352;
export const PLAYER_START_X = 120;
export const MAX_SPEED = 700;
export const START_SPEED = 280;
export const MAX_LIVES = 3;
export const JUMP_VELOCITY = -500;
export const DOUBLE_JUMP_VELOCITY = -420;
export const STOMP_VELOCITY = 600;
export const INPUT_BUFFER_TIME = 0.1;
export const FIXED_DT = 1 / 60;
export const TILE_SIZE = 32;

export const NARRATIVE_TEXTS = [
  '企业防火墙日志 #731：检测到未授权突触链接，神经电击反噬已激活。',
  '黑市加密通讯 — GHOST: "数据管道有后门，但 IDS 会咬人。"',
  '前代骇客 "回声" 的遗言：别信霓虹灯，那只是企业的眼。',
  'Megacorp 内部通告：网络空间入侵者将被强制断连，后果自负。',
  '绿灯区 — 数据流稳定。红灯区 — 你已在他们的雷达上。',
  '"防火墙不是墙，是电网。" — 佚名突触骇客',
  '神经同步率下降至临界值… 链接即将中断。',
  '每一次碰撞都是企业 AI 的记录。他们正在学习你。',
  '暗网传闻：有一条通往核心数据的漏洞，没人活着出来过。',
  '你的神经接口在燃烧。这就是入侵的代价。',
];

export const OBSTACLE_TYPES = ['crate', 'tall', 'moving', 'flyer', 'gate'] as const;
export type ObstacleType = (typeof OBSTACLE_TYPES)[number];

export const POWERUP_TYPES = ['shield', 'magnet', 'x2', 'boost'] as const;
export type PowerupType = (typeof POWERUP_TYPES)[number];

export const CHARACTERS = ['striker', 'ghost', 'tank'] as const;
export type CharacterType = (typeof CHARACTERS)[number];

export const SKILL_TREE: Record<string, { name: string; desc: string; maxLevel: number; costs: number[] }> = {
  extra_life: { name: '神经加固', desc: '+1 初始生命', maxLevel: 2, costs: [200, 500] },
  speed_start: { name: '超频启动', desc: '+10% 初始速度', maxLevel: 3, costs: [150, 300, 500] },
  coin_magnet: { name: '数据引力', desc: '+30% 磁铁范围', maxLevel: 3, costs: [100, 250, 400] },
  shield_start: { name: '预载护盾', desc: '开局自带 3s 护盾', maxLevel: 1, costs: [300] },
  stomp_damage: { name: '重压冲击', desc: '踩踏伤害翻倍', maxLevel: 2, costs: [200, 500] },
  bullet_damage: { name: '弹头强化', desc: '子弹伤害 +1', maxLevel: 3, costs: [150, 300, 500] },
  dash_cooldown: { name: '相移冷却', desc: '冲刺冷却 -20%', maxLevel: 3, costs: [100, 250, 400] },
  sword_range: { name: '剑刃延伸', desc: '挥砍范围 +25%', maxLevel: 2, costs: [200, 400] },
};

export interface SaveData {
  totalCoins: number;
  skills: Record<string, number>;
}

export type BlessingType = 'spread_shot' | 'magnetic_stomp' | 'phase_shift' | 'sword_wave';
export const BLESSINGS: Record<BlessingType, { name: string; desc: string; icon: string }> = {
  spread_shot: { name: '散射协议', desc: '突击手射出3发扇形子弹', icon: '🔱' },
  magnetic_stomp: { name: '磁暴协议', desc: '下砸附带引力牵引', icon: '🌀' },
  phase_shift: { name: '相移协议', desc: 'Ghost冲刺距离+50%', icon: '💫' },
  sword_wave: { name: '剑波协议', desc: 'Tank挥砍发射剑气波', icon: '⚡' },
};

/* Character ability config — data-driven instead of hardcoded */
export const CHAR_CONFIG: Record<CharacterType, { hasShoot: boolean; hasDash: boolean; hasSword: boolean; maxShield: number }> = {
  striker: { hasShoot: true, hasDash: false, hasSword: false, maxShield: 0 },
  ghost: { hasShoot: false, hasDash: true, hasSword: false, maxShield: 0 },
  tank: { hasShoot: false, hasDash: false, hasSword: true, maxShield: 1 },
};

/* Centralized config for easy tuning */
export const CONFIG = {
  PLAYER_START_X: 120,
  JUMP_VELOCITY: -500,
  DOUBLE_JUMP_VELOCITY: -420,
  STOMP_VELOCITY: 600,
  GRAVITY: 1700,
  TERMINAL_VELOCITY: 900,
  MAX_SPEED: 700,
  START_SPEED: 280,
  MAX_LIVES: 3,
  INPUT_BUFFER_TIME: 0.1,
  FIXED_DT: 1 / 60,
  BOSS_TRIGGER_DIST: 2000,
  BOSS_BASE_HP: 18,
  BOSS_HP_SCALE: 0.5,
  BOSS_COOLDOWN_MIN: 0.2,
  BOSS_COOLDOWN_BASE: 1.0,
  BOSS_COOLDOWN_SCALE: 0.1,
  DIFFICULTY_RATE: 0.00008,
  SPEED_INCREASE_RATE: 2,
  DASH_SPEED: 300,
  DASH_COOLDOWN: 1.5,
  SWORD_COOLDOWN: 0.6,
  COMBO_BONUS_SCORE: 50,
  PARTICLE_POOL_SIZE: 300,
  AMBIENT_POOL_SIZE: 30,
  POPUP_POOL_SIZE: 15,
  OBSTACLE_POOL_SIZE: 40,
  COIN_POOL_SIZE: 30,
  POWERUP_POOL_SIZE: 5,
  ENEMY_POOL_SIZE: 100,
  BULLET_POOL_SIZE: 80,
  PROJECTILE_POOL_SIZE: 30,
} as const;
