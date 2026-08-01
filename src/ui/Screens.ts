import { SKILL_TREE, BLESSINGS } from '../utils/constants';
import type { CharacterType, BlessingType } from '../utils/constants';
import { Audio } from '../systems/Audio';

const REWARD_DATA: Record<string, { name: string; desc: string; icon: string }> = {
  heal: { name: '神经修复', desc: '恢复 1 条生命', icon: '❤️' },
  shield_up: { name: '加密护盾', desc: '10 秒免疫伤害', icon: '🛡' },
  speed_boost: { name: '超频传输', desc: '10 秒加速', icon: '⚡' },
  magnet_up: { name: '数据引力', desc: '15 秒自动吸币', icon: '🧲' },
  x2_up: { name: '双倍解码', desc: '12 秒双倍分数', icon: '✖️' },
  score_bonus: { name: '数据洪流', desc: '直接获得 +500', icon: '📀' },
};

const CHAR_DATA: Record<CharacterType, { name: string; desc: string; icon: string; color: string }> = {
  striker: { name: 'STRK-01', desc: '远程射击 · 精准压制', icon: '🔫', color: '#00c8ff' },
  ghost: { name: 'GHST-07', desc: '相位闪避 · 不可触碰', icon: '👻', color: '#7b2ff7' },
  tank: { name: 'TNK-03', desc: '剑盾猛攻 · 重装压制', icon: '⚔️', color: '#ff6b6b' },
};

export class Screens {
  private titleScreen: HTMLElement;
  private gameoverScreen: HTMLElement;
  private pauseScreen: HTMLElement;
  private rewardScreen: HTMLElement;
  private goScore: HTMLElement;
  private goBest: HTMLElement;
  private goNewbest: HTMLElement;
  private goDist: HTMLElement;
  private goCoins: HTMLElement;
  private goPowers: HTMLElement;
  private goFrag: HTMLElement;
  private rewardCards: HTMLElement[];
  private rewardNames: HTMLElement[];
  private rewardDescs: HTMLElement[];
  private charCards: HTMLElement[];
  private totalCoinEl: HTMLElement;
  private skillTreeBtn: HTMLElement;
  private skillList: HTMLElement;
  private settingsScreen: HTMLElement;
  private goKills: HTMLElement;
  private goMaxCombo: HTMLElement;
  private goBossKills: HTMLElement;

  constructor(
    private onStart: (ch: CharacterType) => void,
    private onRestart: () => void,
    private onHome: () => void,
    private onResume: () => void,
    private onSkillUpgrade: (id: string) => void,
    private onOpenSettings?: () => void,
    private onSettingsChanged?: () => void,
  ) {
    this.titleScreen = document.getElementById('title-screen')!;
    this.gameoverScreen = document.getElementById('gameover-screen')!;
    this.pauseScreen = document.getElementById('pause-screen')!;
    this.rewardScreen = document.getElementById('reward-screen')!;
    this.settingsScreen = document.getElementById('settings-screen')!;
    this.goScore = document.getElementById('go-score')!;
    this.goBest = document.getElementById('go-best')!;
    this.goNewbest = document.getElementById('go-newbest')!;
    this.goDist = document.getElementById('go-dist')!;
    this.goCoins = document.getElementById('go-coins')!;
    this.goPowers = document.getElementById('go-powers')!;
    this.goKills = document.getElementById('go-kills')!;
    this.goMaxCombo = document.getElementById('go-maxcombo')!;
    this.goBossKills = document.getElementById('go-bosskills')!;
    this.goFrag = document.getElementById('go-frag')!;
    this.rewardCards = [0,1,2].map(i => document.getElementById(`reward-card-${i}`)!);
    this.rewardNames = [0,1,2].map(i => document.getElementById(`reward-name-${i}`)!);
    this.rewardDescs = [0,1,2].map(i => document.getElementById(`reward-desc-${i}`)!);
    this.charCards = [0,1,2].map(i => document.getElementById(`char-card-${i}`)!);
    this.totalCoinEl = document.getElementById('total-coins')!;
    this.skillTreeBtn = document.getElementById('skill-tree-btn')!;
    this.skillList = document.getElementById('skill-list')!;

    document.getElementById('start-btn')!.addEventListener('click', () => {
      Audio.init();
      this.onStart('striker');
    });

    this.charCards.forEach((card, i) => {
      card.addEventListener('click', () => {
        const ch = (['striker', 'ghost', 'tank'] as CharacterType[])[i];
        this.charCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('start-btn')!.onclick = () => this.onStart(ch);
      });
    });

    this.skillTreeBtn.addEventListener('click', () => {
      document.getElementById('skill-overlay')!.classList.remove('hidden');
      document.getElementById('skill-overlay')!.classList.add('active');
    });

    document.getElementById('skill-close')!.addEventListener('click', () => {
      document.getElementById('skill-overlay')!.classList.remove('active');
      document.getElementById('skill-overlay')!.classList.add('hidden');
    });

    document.getElementById('restart-btn')!.addEventListener('click', () => this.onRestart());
    document.getElementById('home-btn')!.addEventListener('click', () => this.onHome());
    document.getElementById('resume-btn')!.addEventListener('click', () => this.onResume());

    /* Settings toggle wiring */
    this.initSettings();
  }

  private initSettings(): void {
    const load = (): Record<string,boolean> => {
      try { return JSON.parse(localStorage.getItem('game_settings') || '{}'); } catch { return {}; }
    };
    const save = (s: Record<string,boolean>) => localStorage.setItem('game_settings', JSON.stringify(s));

    const sfxToggle = document.getElementById('sfx-toggle')!;
    const bgmToggle = document.getElementById('bgm-toggle')!;
    const fxToggle = document.getElementById('fx-toggle')!;
    const shakeToggle = document.getElementById('shake-toggle')!;
    const closeBtn = document.getElementById('settings-close')!;
    const pauseSettingsBtn = document.getElementById('settings-btn-from-pause')!;

    /* Apply saved settings */
    const saved = load();
    if (saved.sfx === false) { sfxToggle.classList.remove('on'); Audio.setSfxMuted(true); }
    if (saved.bgm === false) { bgmToggle.classList.remove('on'); Audio.setBgmMuted(true); }
    if (saved.fx === false) fxToggle.classList.remove('on');
    if (saved.shake === false) shakeToggle.classList.remove('on');

    const toggleEl = (el: HTMLElement, key: string, onToggle: (on: boolean) => void) => {
      el.addEventListener('click', () => {
        const on = el.classList.toggle('on');
        const s = load(); s[key] = on; save(s);
        onToggle(on);
        if (this.onSettingsChanged) this.onSettingsChanged();
      });
    };

    toggleEl(sfxToggle, 'sfx', (on) => Audio.setSfxMuted(!on));
    toggleEl(bgmToggle, 'bgm', (on) => Audio.setBgmMuted(!on));
    toggleEl(fxToggle, 'fx', () => {});
    toggleEl(shakeToggle, 'shake', () => {});

    closeBtn.addEventListener('click', () => {
      this.settingsScreen.classList.remove('active');
      this.settingsScreen.classList.add('hidden');
    });

    pauseSettingsBtn.addEventListener('click', () => {
      this.settingsScreen.classList.remove('hidden');
      this.settingsScreen.classList.add('active');
    });
  }

  hideAll(): void {
    [this.titleScreen, this.gameoverScreen, this.pauseScreen, this.rewardScreen, this.settingsScreen].forEach(el => {
      el.classList.remove('active');
      el.classList.add('hidden');
    });
    document.getElementById('skill-overlay')!.classList.remove('active');
    document.getElementById('skill-overlay')!.classList.add('hidden');
  }

  showTitle(totalCoins: number, skills: Record<string, number>): void {
    this.hideAll();
    this.titleScreen.classList.remove('hidden');
    this.titleScreen.classList.add('active');
    this.totalCoinEl.textContent = '🪙 ' + totalCoins;
    this.showSkillTree(totalCoins, skills);
  }

  showGameOver(score: number, bestScore: number, distance: number, coins: number, powers: number, isNewBest: boolean, fragment?: string, stats?: { kills: number; maxCombo: number; bossKills: number }): void {
    this.hideAll();
    this.goScore.textContent = Math.floor(score).toString();
    this.goBest.textContent = Math.floor(bestScore).toString();
    this.goDist.textContent = Math.floor(distance) + 'm';
    this.goCoins.textContent = coins.toString();
    this.goPowers.textContent = powers.toString();
    if (stats) {
      this.goKills.textContent = stats.kills.toString();
      this.goMaxCombo.textContent = 'x' + stats.maxCombo;
      this.goBossKills.textContent = stats.bossKills.toString();
    }
    this.goNewbest.classList.toggle('hidden', !isNewBest);
    if (fragment && this.goFrag) {
      this.goFrag.textContent = fragment;
      this.goFrag.classList.remove('hidden');
    }
    this.gameoverScreen.classList.remove('hidden');
    this.gameoverScreen.classList.add('active');
  }

  showPause(): void {
    this.pauseScreen.classList.remove('hidden');
    this.pauseScreen.classList.add('active');
  }

  hidePause(): void {
    this.pauseScreen.classList.remove('active');
    this.pauseScreen.classList.add('hidden');
  }

  showReward(onChoose: (id: string) => void, blessingOptions?: BlessingType[]): void {
    this.hideAll();
    const keys = Object.keys(REWARD_DATA);
    const shuffled = [...keys].sort(() => Math.random() - 0.5);

    /* Mix in a blessing if available */
    let picked: { id: string; name: string; desc: string; icon: string }[];
    if (blessingOptions && blessingOptions.length > 0) {
      const blessingIds = blessingOptions.sort(() => Math.random() - 0.5);
      const blessings = blessingIds.slice(0, 1).map(id => ({
        id, name: BLESSINGS[id as BlessingType].name,
        desc: BLESSINGS[id as BlessingType].desc,
        icon: BLESSINGS[id as BlessingType].icon,
      }));
      const numRewards = shuffled.slice(0, 3 - blessings.length).map(k => ({ id: k, ...REWARD_DATA[k] }));
      picked = [...blessings, ...numRewards].sort(() => Math.random() - 0.5);
    } else {
      picked = shuffled.slice(0, 3).map(k => ({ id: k, ...REWARD_DATA[k] }));
    }

    picked.forEach((r, i) => {
      this.rewardNames[i].textContent = r.name;
      this.rewardDescs[i].textContent = r.desc;
      this.rewardCards[i].querySelector('.reward-icon')!.textContent = r.icon;
      this.rewardCards[i].onclick = () => { onChoose(r.id); this.hideReward(); };
    });
    this.rewardScreen.classList.remove('hidden');
    this.rewardScreen.classList.add('active');
  }

  hideReward(): void {
    this.rewardScreen.classList.remove('active');
    this.rewardScreen.classList.add('hidden');
  }

  showSkillTree(totalCoins: number, skills: Record<string, number>): void {
    this.skillList.innerHTML = '';
    for (const [id, skill] of Object.entries(SKILL_TREE)) {
      const level = skills[id] || 0;
      const maxed = level >= skill.maxLevel;
      const cost = maxed ? 0 : skill.costs[level];
      const canAfford = totalCoins >= cost;

      const card = document.createElement('div');
      card.className = 'skill-item' + (maxed ? ' maxed' : '') + (canAfford && !maxed ? ' affordable' : '');
      card.innerHTML = `
        <div class="skill-name">${skill.name}</div>
        <div class="skill-desc">${skill.desc}</div>
        <div class="skill-level">${level}/${skill.maxLevel}</div>
        <div class="skill-cost">${maxed ? '已满级' : cost > 0 ? '🪙 ' + cost : '免费'}</div>
      `;
      if (!maxed && canAfford) {
        card.addEventListener('click', () => this.onSkillUpgrade(id));
      }
      this.skillList.appendChild(card);
    }
  }
}
