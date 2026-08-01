# 突触骇客·数据逃亡 — 白皮书核查 Gap List

生成日期: 2026-07-27 | 总计: 26 项

| # | Feature | 状态 | 备注 |
|---|---------|------|------|
| 1 | 世界观语义映射 | ✅ 已实现 | HUD 显示 📀数据量 / ⚡传输速率 / 渗透深度 |
| 2 | 碎片化叙事 | ✅ 已实现 | NARRATIVE_TEXTS 10条，die()时随机展示 |
| 3 | 企业防火墙日志文本 | ✅ 已实现 | #go-frag 展示，随 gameover 出现 |
| 4 | 三角色差异化 | ✅ 已实现 | Striker shoot / Ghost dash / Tank sword+shield |
| 5 | 敌人类型 | ✅ 已实现 | Drone (空中) + Enforcer (地面) |
| 6 | Boss战 | ✅ 已实现 | 2000m触发, 3阶段, 4弹幕, 三选一奖励 |
| 7 | 技能树 | ✅ 已实现 | 8种多级, localStorage 持久化 |
| 8 | 键盘映射 | ✅ 已实现 | Space↑跳跃, ↓下砸, Z主技能, X次技能 |
| 9 | 指令缓冲 | ✅ 已实现 | jumpBufferTimer = 100ms |
| 10 | 固定步长物理循环 | ✅ 已实现 | accumulator + FIXED_DT = 1/60 |
| 11 | 速度矢量拖影 | ✅ 已实现 | ctx.transform skewX |
| 12 | Hit-Stop顿帧 | ✅ 已实现 | timeMultiplier 0.05→1 lerp |
| 13 | DOM屏幕震动 | ✅ 已实现 | wrap transform translate+scale |
| 14 | Web Audio低通滤波 | ✅ 已实现 | BiquadFilterNode 400Hz |
| 15 | **合成波BGM** | ❌ **缺失** | Audio.ts 只有 SFX，无 BGM |
| 16 | 粒子系统对象池 | ✅ 已实现 | 200 particles + 20 ambient |
| 17 | 对象池 Pool<T> | ✅ 已实现 | 9 个池实例，零 GC 分配 |
| 18 | 色板统一 | ✅ 已实现 | cyan / magenta / violet |
| 19 | CSS玻璃拟态UI | ✅ 已实现 | backdrop-filter blur |
| 20 | 注册/开始/暂停/设置/商店 | ⚠️ 部分缺失 | 开始/暂停 OK；注册/设置 无；商店=技能树 |
| 21 | ECS架构 | ❌ **缺失** | 当前为 class 继承，非 ECS |
| 22 | **移动端触控滑动手势** | ⚠️ **部分缺失** | touchstart OK，无 swipe 手势 |
| 23 | 真实精灵图替换生成图 | ⚠️ 部分实现 | 当前用 Canvas 生成，可接外部 png |
| 24 | CI/CD流水线 | ✅ 已实现 | GitHub Actions deploy.yml |
| 25 | README/开源文档 | ✅ 已实现 | README.md + MIT License |
| 26 | 多语言 | ❌ **缺失** | 所有 UI 硬编码中文 |

---

## 缺失项优先级

### P0 — 高优先级（影响核心体验）
- **合成波BGM** — Web Audio API 合成背景音乐
- **移动端触控滑动手势** — swipe down 下砸, swipe left/right 冲刺

### P1 — 中优先级（打磨）
- **粒子系统扩增强化**
- **设置菜单**（音效开关 / 画质 / 键位提示）

### P2 — 低优先级（拓展）
- **多语言支持**（中/英）
- **真实精灵图替换**
- **ECS 架构重构**

### Won't Do（超出当前范围）
- 用户注册/登录系统（单机游戏不需要）
