/**
 * 单词峡谷 · 数值配置
 * 所有平衡数值集中在这里，调手感只改本文件。
 * 内容（单词/语法/课文）来自 data.js 的 window.UNIT。
 */
window.MOBA = {
  /**
   * 一局的建筑：先推掉两座塔，才能打水晶。
   * 单边总血量 4000，配合下面的伤害曲线，一局约 38 题、7-8 分钟。
   */
  lane: {
    enemy: [
      { id: "e1", name: "敌方一塔", hp: 1000 },
      { id: "e2", name: "敌方二塔", hp: 1300 },
      { id: "ec", name: "敌方水晶", hp: 1700, crystal: true },
    ],
    ally: [
      { id: "a1", name: "我方一塔", hp: 1000 },
      { id: "a2", name: "我方二塔", hp: 1300 },
      { id: "ac", name: "我方水晶", hp: 1700, crystal: true },
    ],
  },

  hero: {
    maxHp: 100,
    /** 答错扣血：连错 4 题阵亡 */
    hitDamage: 25,
    /** 阵亡后强制看解析的秒数 */
    reviveSeconds: 5,
    /** 阵亡时敌方顺势拆我方塔。别调太高：低正确率的孩子会连续阵亡，惩罚会叠成雪崩 */
    deathTowerDamage: 160,
  },

  /**
   * 升级所需经验：第 n 级 → n+1 级 = 24 + (n-1) * 2，合计 518 点。
   * 打得好的一局刚好能摸到 15 级满级，这是局内成长感的关键。
   * 技能解锁节奏：4 级约第 5 题、7 级约第 11 题、大招 10 级约第 19 题。
   */
  level: {
    max: 15,
    baseNeed: 24,
    growNeed: 2,
    /** 每级伤害加成 */
    dmgPerLevel: 0.05,
  },

  /** 基础伤害与收益 */
  economy: {
    minionDamage: 26,
    minionXp: 14,
    minionCoins: 18,
    skillXp: 22,
    skillCoins: 30,
    ultXp: 30,
    ultCoins: 34,
    towerCoins: 90,
    /** 连对加成：每连对 1 题 +10% 伤害，最多 5 层 */
    comboStep: 0.1,
    comboMax: 5,
  },

  skills: {
    q: {
      key: "1",
      name: "语法冲击",
      source: "grammar",
      unlockLevel: 4,
      cooldown: 40,
      multiplier: 2.2,
      desc: "解锁于 4 级 · 语法填空，伤害 2.2 倍",
    },
    w: {
      key: "2",
      name: "句式连斩",
      source: "sentence",
      unlockLevel: 7,
      cooldown: 55,
      multiplier: 2.6,
      desc: "解锁于 7 级 · 把词排成正确句子，伤害 2.6 倍",
    },
    r: {
      key: "大",
      name: "课文觉醒",
      source: "text",
      unlockLevel: 10,
      cooldown: 80,
      multiplier: 1.8,
      /** 大招连续题数 */
      rounds: 3,
      /** 全对额外倍率 */
      perfectBonus: 1.5,
      desc: "解锁于 10 级 · 课文 3 连题，全对造成毁灭伤害",
    },
  },

  /**
   * tick 秒推进一次、每次 damage 点。敌方独自拆完我方所需时间：
   * hpScale 同时缩放双方建筑血量：新手答得慢，缩短战线才能在一局里走完
   * 「升级→出装→推水晶」的完整过程，不然一局要十几分钟，小孩坐不住。
   */
  difficulties: [
    { id: "easy", name: "青铜战场", tick: 14, damage: 42, hpScale: 0.72, coinBonus: 1, desc: "战线短、推进慢，慢慢想也来得及" },
    { id: "normal", name: "黄金峡谷", tick: 11, damage: 70, hpScale: 1, coinBonus: 1.3, desc: "标准节奏，一局约 8 分钟" },
    { id: "hard", name: "王者巅峰", tick: 9, damage: 102, hpScale: 1, coinBonus: 1.7, desc: "敌方压得很凶，答慢就掉塔" },
  ],

  heroes: [
    {
      id: "wordsmith",
      name: "词锋",
      title: "单词流",
      emoji: "⚔️",
      cost: 0,
      color: "#f0b429",
      passive: "单词题伤害 +30%，但技能冷却 +20%",
      buffs: { minionDamage: 1.3, cooldown: 1.2 },
      tip: "最好上手。靠清兵线滚雪球，适合刚开始背单词。",
    },
    {
      id: "grammarian",
      name: "律者",
      title: "语法流",
      emoji: "📐",
      cost: 800,
      color: "#4dabf7",
      passive: "语法技能伤害 +50%，答对时溅射到下一个建筑",
      buffs: { skillDamage: 1.5, splash: 0.4 },
      tip: "语法一发爆炸伤害。想练不定代词、时态就选他。",
    },
    {
      id: "reader",
      name: "卷心",
      title: "阅读流",
      emoji: "📖",
      cost: 1200,
      color: "#69db7c",
      passive: "最大生命 130，课文题答对回血 20",
      buffs: { maxHp: 130, textHeal: 20 },
      tip: "血厚、耐打。靠课文大招回血续航，适合稳着打。",
    },
    {
      id: "speller",
      name: "拼字师",
      title: "拼写流",
      emoji: "🔤",
      cost: 1600,
      color: "#e599f7",
      passive: "清兵线改为手写拼单词，伤害 2.2 倍，答错扣血 1.5 倍",
      buffs: { minionDamage: 2.2, hitDamage: 1.5, spellMode: true },
      tip: "高风险高回报。拼对一个词顶别人打三下。",
    },
  ],

  items: [
    {
      id: "pen",
      name: "破军之笔",
      emoji: "🖊️",
      cost: 260,
      effect: { damage: 1.25 },
      desc: "全部伤害 +25%",
    },
    {
      id: "book",
      name: "吸血之书",
      emoji: "🩸",
      cost: 240,
      effect: { hitReduce: 0.6 },
      desc: "答错扣血减少 40%",
    },
    {
      id: "rune",
      name: "冷却符",
      emoji: "⏱️",
      cost: 220,
      effect: { cooldown: 0.7 },
      desc: "技能冷却 -30%",
    },
    {
      id: "crown",
      name: "智慧之冠",
      emoji: "👑",
      cost: 300,
      effect: { xp: 1.3 },
      desc: "获得经验 +30%，升级更快",
    },
    {
      id: "bag",
      name: "贪婪之袋",
      emoji: "💰",
      cost: 200,
      effect: { coins: 1.4 },
      desc: "局内金币 +40%",
    },
    {
      id: "armor",
      name: "复活甲",
      emoji: "🛡️",
      cost: 380,
      effect: { reviveCut: 2, deathShield: true },
      desc: "复活快 2 秒，且首次阵亡不掉塔血",
    },
  ],

  /** 段位：一个单元 = 一个赛季 */
  ranks: [
    { id: "bronze", name: "青铜", stars: 3, emoji: "🥉", noDemote: true },
    { id: "silver", name: "白银", stars: 3, emoji: "🥈" },
    { id: "gold", name: "黄金", stars: 4, emoji: "🥇" },
    { id: "platinum", name: "铂金", stars: 4, emoji: "💠" },
    { id: "diamond", name: "钻石", stars: 5, emoji: "💎" },
    { id: "star", name: "星耀", stars: 5, emoji: "🌟" },
    { id: "king", name: "最强王者", stars: 5, emoji: "👑", top: true },
  ],

  /** MVP 评分权重 */
  grade: {
    accuracy: 40,
    level: 20,
    towers: 10,
    win: 20,
    streak: 1,
    bands: [
      { min: 92, label: "S+", text: "全场 MVP！" },
      { min: 82, label: "S", text: "carry 全场" },
      { min: 70, label: "A", text: "打得不错" },
      { min: 55, label: "B", text: "还能更稳" },
      { min: 0, label: "C", text: "多练几局" },
    ],
  },

  /** 沿用主 App 的记忆曲线存档 */
  srsDays: [1, 2, 4, 7, 15, 30],

  /* 单词分级的级别定义和升降级规则在 wordlevel.js，训练场也共用那一份 */
};
