# 突触骇客 · 数据逃亡 — 游戏设计方案

## 一、项目概览

| 项目 | 内容 |
|---|---|
| 名称 | 突触骇客 · 数据逃亡（Interstellar Run） |
| 类型 | 横向卷轴跑酷（Side-scrolling Runner） |
| 技术栈 | TypeScript + HTML5 Canvas 2D + Vite |
| 运行时依赖 | 零（无第三方运行时库） |
| 构建产物 | 57 kB gzip(17 kB) |
| 素材来源 | Warped City 像素包（ansimuz / CC0） |

---

## 二、核心玩法循环

```
标题画面 → 选角色 → 无缝关卡(Chunk拼接) → Boss战(每2000m)
                                              ↓
                   失败 ← 3命耗尽 ← 受击扣命 ← 奖励选择(祝福/增益)
```

- **目标**：尽可能跑远，收集数据碎片（金币），击杀敌人，突破Boss节点
- **结束条件**：3条命耗尽
- **持续成长**：金币跨局保留，可在技能树中购买永久升级

---

## 三、可玩角色（3种）

| 角色 | 特性 | 技能 | 专属 Blessing |
|---|---|---|---|
| **STRK-01** 突击手 | 均衡型 | Z 远程射击 | Spread Shot（三发散射） |
| **GHST-07** 幽灵 | 高速型 | X 相位冲刺（无敌穿怪） | Phase Shift（冲刺距离+50%） |
| **TNK-03** 坦克 | 重装型 | Z 剑斩 / 被动物理盾（5s充能） | Sword Wave（剑波）/ Magnetic Stomp（磁暴拉扯） |

---

## 四、关卡生成系统（Chunk）

### 架构
```
Spawner 管理 currentChunk / nextChunk
每 1000px 推进一个 chunk
chunk 间随机 shuffle，不重复相邻
```

### 预设 Chunk（11种）
| Chunk | 特点 |
|---|---|
| `jump_gauntlet` | 5个连续跳台 |
| `drone_swarm` | 3只无人机 + 2个箱子 |
| `shield_wall` | 3层叠箱 + 1个 enforcer |
| `coin_rush` | 10枚金币弧线排列 |
| `moving_gauntlet` | 2个浮动平台 + 2只无人机 |
| `air_assault` | 3只无人机 + 1个 enforcer + 炮台 |
| `enforcer_patrol` | 2个 enforcer 巡逻 |
| `flyer_trap` | 2个飞台 + 1只无人机 |
| `rest_stop` | 纯金币 + 磁铁道具 |
| `boss_gate` | 2只无人机 + enforcer 守卫 |
| `turret_nest` | 3个炮台阵地 |

---

## 五、敌人类型

| 敌人 | 血量 | 行为 | 图集帧 |
|---|---|---|---|
| **Drone** 无人机 | 1 | 空中漂浮，正弦上下浮动 | drone-1~4（4帧） |
| **Enforcer** 执行者 | 2 | 地面巡逻 | 无（矩形回退） |
| **Turret** 炮台 | 1 | 地面固定，6帧动画 | turret-1~6（6帧） |
| **Boss** AI守卫 | 3+ | 3阶段弹幕（aimed/spread/wave/laser） | 代码绘制 |

---

## 六、Blessing 系统（Boss战后奖励）

在每场 Boss 战后，玩家从3个随机选项中选1个：

| Blessing | 适用角色 | 效果 |
|---|---|---|
| **Spread Shot** | 突击手 | 射击变为3发散弹 |
| **Phase Shift** | 幽灵 | 冲刺距离+50% |
| **Sword Wave** | 坦克 | 剑斩发射远程剑波 |
| **Magnetic Stomp** | 坦克 | 践踏时拉扯周围敌人 |

此外每次 Boss 战还可选通用增益：回血、护盾、加速、磁铁、双倍、+500分。

---

## 七、Overclock 超频模式

- **触发条件**：连击 ≥ 15
- **效果**：速度 +10%，角色边缘青色辉光，残影变红+青双色
- **音频**：BGM 滤波器 Q 值升至 8，低频增强
- **解除**：连击中断

---

## 八、道具系统

| 道具 | 颜色 | 效果 | 持续时间 |
|---|---|---|---|
| 护盾 🛡 | 青色 | 抵挡一次伤害 | 5s |
| 磁铁 🧲 | 金色 | 自动吸引金币 | 5s |
| 双倍 ✖2 | 红色 | 金币分数 ×2 | 5s |
| 加速 ⚡ | 紫色 | 速度大幅提升 | 5s |

---

## 九、视觉系统

### 主题渐变
游戏距离驱动 3 个主题，200px 平滑过渡：

```
city (0-700m) ──→ factory (800-2000m) ──→ datacenter (2100m+)
```

每个主题定义：天空色、雾气色、地面色、线条辉光色、建筑色相/饱和度、窗色、强调色。

### 视差背景
3层真实像素背景（Warped City 素材）：

| 层 | 文件 | 滚动速度 | 缩放 |
|---|---|---|---|
| 远景 | bg-1.png (384×224) | 0.04× | 2.08× |
| 中景 | bg-2.png (384×224) | 0.10× | 2.08× |
| 近景 | bg-3.png (1009×224) | 0.20× | 0.8× |

背景上方叠加主题色半透明渐变，保持主题过渡可视性。

### 精灵图集
- 单张 `atlas.png` 1437×239，包含所有精灵
- JSON 帧定义（trimmed / sourceSize）
- AssetManager 统一管理加载 + 缓存
- 加载失败时自动回退到程序绘制（彩色矩形）

### 核心精灵帧
| 动画 | 帧数 | 帧名 |
|---|---|---|
| 跑步 | 8 | run-1 ~ run-8 |
| 跳跃 | 4 | jump-1 ~ jump-4 |
| 待机 | 4 | idle-1 ~ idle-4 |
| 无人机 | 4 | drone-1 ~ drone-4 |
| 炮台 | 6 | turret-1 ~ turret-6 |
| 爆炸 | 6 | enemy-explosion-1 ~ 6 |
| 弹丸 | 3 | shot-1 ~ shot-3 |

---

## 十、音频系统

### 架构
- **Web Audio API**，双通道：BGM + SFX
- 共享低通滤波器（Overclock 时调节 Q 值）
- Ogg 加载优先，失败回退到程序合成

### 声音资源
| 文件 | 用途 | 回退 |
|---|---|---|
| `sci_fi_platformer02.ogg` | BGM（2.75 MB，循环） | 程序合成 synthwave（和弦+琶音+贝斯） |
| `beam.ogg` | 跳跃/射击 | 方波 tone |
| `explosion.ogg` | 死亡 | 噪声 burst + 锯齿波 |
| `hurt.ogg` | 受击 | 噪声 burst + 方波 |

---

## 十一、UI 系统

### 游戏内 HUD（DOM 层叠在 Canvas 上）
- 左上：数据量（分数），链式入侵（连击）
- 右上：传输速率（速度），渗透深度（距离）
- 左下：生命点（3个圆点），底部：进度条
- 右下：道具状态 badge

### 覆盖层（Glassmorphism 风格）
- **标题画面**：角色选择卡、操作提示、技能树入口、总金币
- **暂停画面**：继续、设置
- **设置画面**：音效/音乐/特效/震动 开关（localStorage 持久化）
- **游戏结束**：6项结算统计（分数/深度/碎片/工具/击杀/最高连击/Boss击杀）、叙事片段、新纪录标识
- **奖励画面**：3选1（祝福 + 通用增益）
- **技能树**：8项可升级技能，金币购买

---

## 十二、技能树

| 技能 | 最大等级 | 每级效果 | 费用(每级) |
|---|---|---|---|
| 神经加固 | 3 | 初始速度 +10%/级 | 50/100/150 |
| 超频启动 | 3 | Overclock 阈值 -1 | 40/80/120 |
| 数据引力 | 3 | 磁铁范围 +20%/级 | 30/60/90 |
| 预载护盾 | 1 | 开局带护盾 | 100 |
| 重压冲击 | 3 | 践踏伤害 +1/级 | 50/100/150 |
| 弹头强化 | 3 | 子弹伤害+1 | 60/120/180 |
| 相移冷却 | 3 | 冲刺CD -0.2s/级 | 40/80/120 |
| 剑刃延伸 | 3 | 剑范围 +10px/级 | 50/100/150 |

---

## 十三、技术架构

```
main.ts (boot → 加载资产 → 创建 Game)
  │
  ├─ Game.ts (核心循环：fixedUpdate + draw)
  │   ├─ Player.ts (角色状态机 + 能力)
  │   ├─ Spawner.ts (Chunk 生成)
  │   ├─ Renderer.ts (视差 + 主题 + 所有绘制)
  │   ├─ Audio.ts (声音引擎)
  │   ├─ Screens.ts (所有 UI)
  │   ├─ HUD.ts (游戏内 HUD)
  │   ├─ CollisionSystem.ts (碰撞检测)
  │   ├─ BossManager.ts (Boss 战斗管理)
  │   └─ Pool.ts (对象池 ×8)
  │
  ├─ entities/ (Boss, Enemy, Bullet, Particle, Obstacle, Projectile, Coin, Powerup)
  ├─ systems/ (Renderer, Spawner, Audio, AssetManager, CollisionSystem, BossManager)
  ├─ assets/ (Sprites.ts — 所有绘制函数 + 图集加载)
  └─ utils/ (constants, math, overclock)
```

### 关键设计决策
1. **零运行时依赖** — 纯 Canvas 2D，无框架，便于审核和移植
2. **DOM UI + Canvas 游戏** — 标题/暂停/设置等用 DOM 实现，游戏画面用 Canvas，兼顾开发效率和渲染性能
3. **对象池 ×8** — Player、Obstacle、Coin、Powerup、Enemy、Particle、AmbientDust、ScorePopup、Bullet、Projectile
4. **固定时间步长** — fixedUpdate(1/60s) + 渲染插值
5. **双通道音频** — BGM/SFX 独立增益 + 共享滤波器
6. **静默降级** — 所有外部资源（图集、音频、背景图片）加载失败时自动回退到程序生成

---

## 十四、构建与部署

```bash
npm run dev      # 开发服务器 localhost:5173
npm run build    # TypeScript 编译 + Vite 打包 → dist/
npm run preview  # 预览构建产物
```

- 构建产物 **57 kB**（JavaScript），gzip 后 **17 kB**
- 公共资产（图集、背景、音频）~ **4 MB**
- `base` 路径：开发 `/`，生产 `/interstellar-run/`

---

## 十五、操作方式

| 操作 | 键盘 | 触屏 |
|---|---|---|
| 跳跃 | 空格 / ↑ | 点击 / 上滑 |
| 二段跳 | 空中 ↑ | 空中上滑 |
| 砸地 | ↓ | 下滑 |
| 攻击（突击手/坦克） | Z | 左滑 |
| 闪避（幽灵） | X | 右滑 |
| 暂停 | P | — |

---

## 十六、当前状态

- **完成度**：核心玩法完整，含 3 角色、Boss 战、道具、技能树、祝福、11 种关卡块、3 主题、完整音效系统
- **已知问题**：
  - 背景 `skyline-a/b`, `buildings-bg`, `near-buildings-bg` 已加载但未使用
  - `tileset.png` 未集成
  - Enforcer 敌人暂无像素精灵（使用矩形回退）
  - 部分帧（如 `run-shoot-*`）在游戏中未使用
- **后续方向**：
  - 增加更多敌人变种（载具）
  - 成就 / 排行榜系统
  - 难度曲线调优
  - 音效更多变体
