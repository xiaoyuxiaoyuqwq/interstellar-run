# 突触骇客·数据逃亡 — Bug 清单 & 优化方向

## 一、当前 Bug（已定位）

### Bug 1：拖影位置不对
- **文件** `src/systems/Renderer.ts:180`
- **原因** `ctx.transform(1, 0, skew, 1, 0, 0)` 是在画布原点 (0,0) 做斜切，而非玩家位置，导致拖影出现在错误位置
- **修复** 先 `translate` 到拖影位置，再 `transform` 斜切

### Bug 2：无法返回初始界面
- **原因** gameover 界面只有"重新链接"按钮，缺少"返回首页"按钮
- **涉及文件** `index.html`、`src/ui/Screens.ts`、`src/core/Game.ts`
- **修复** 在 gameover 添加"返回首页"按钮，Screens 添加 onHome 回调，Game 添加 goHome 方法

### Bug 3：武器打不了敌人
- **3a. Striker 子弹碰撞** `src/core/Game.ts:345` — 点碰撞检测未考虑子弹半径 `p.r`，加上敌我都在高速移动，碰撞窗口仅 1-2 帧，极易穿模
- **3b. Tank 剑的判定框方向反了** `src/entities/Player.ts:193` — getSwordHitbox 返回 `x: this.x - 30`，判定框在玩家左侧，但敌人从右侧来
- **3c. Ghost 冲刺无伤害** `src/entities/Player.ts:174` — dash 只做了位移和无敌，没有敌人碰撞伤害

---

## 二、下一步优化方向（打算）

### 短期（Phase 3.5 Polish）
1. 修复以上 3 个 bug（已定位，马上改）
2. Boss 战调试：确认弹幕碰撞/阶段转换/奖励三选一都正常工作
3. Meta-progression 体验打磨：技能树效果实际生效验证（如 extra_life 开局多一条命、coin_magnet 磁铁范围等）
4. 游戏手感：跳跃/冲刺 buffer、落地缓冲、碰撞宽容度

### 中期（Phase 4）
1. 合成波 BGM + SFX 替换掉 placeholder（Audio.ts 已预留 setFilter，可接 Web Audio 合成）
2. 真实像素图替换生成图块（用 Aseprite 绘制，Git LFS 管理二进制资源）
3. README 动画预览图（GitHub 社交卡片）
4. 地图主题随距离变化（城市 → 工厂 → 数据中心）

### 长期（拓展功能）
1. 成就/挑战系统（成就界面在 title 加 tab）
2. 设置菜单（音效开关/画质/键位）
3. 移动端触控布局适配
4. 无尽模式 + 排行榜成绩上传
5. 多语言（中/英）
