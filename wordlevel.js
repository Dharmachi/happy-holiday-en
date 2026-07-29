/**
 * 单词分级：认得出 → 想得起 → 听得懂 → 写得出。
 *
 * 前两级是接受性词汇（认得出来），后两级是产出性词汇（调得出来），
 * 这是两种不同的能力，分开练才不会「熟词反复考、短板一次没练到」。
 *
 * 训练场（index.html）和单词峡谷（moba.html）共用这一份进度：
 * 峡谷按级别出题并升降级，训练场则把已毕业的词从题库里筛掉。
 */
(function () {
  const KEY = "hh-wordlv-v1";

  const config = {
    levels: [
      { lv: 1, name: "认得出", form: "en2zh", desc: "看英文，选中文", emoji: "👀" },
      { lv: 2, name: "想得起", form: "zh2en", desc: "看中文，选英文", emoji: "💭" },
      { lv: 3, name: "听得懂", form: "dictation", desc: "听发音，拼出来", emoji: "👂" },
      { lv: 4, name: "写得出", form: "zh2spell", desc: "看中文，拼出来", emoji: "✍️" },
    ],
    /** 同一级别连对几次才升级：四选一有 25% 蒙对率，一次就放过会漏词 */
    promoteStreak: 2,
    /** 定级赛一批测多少个词，控制在 2-3 分钟内 */
    batchSize: 14,
    /** 峡谷里毕业的词偶尔还会出来做维持复习的权重 */
    maintainWeight: 0.4,
    /** 峡谷兵线取词的权重：到期复习 > 正在练 > 还没定级 */
    pickWeights: { due: 4, training: 5, untested: 2 },
    /** 普通单词练到第 4 级毕业 */
    defaultCap: 4,
    /** 专有名词（Russian / Nazi 这类）认得出就够，不逼默写 */
    properNounCap: 2,
    /** 训练场筛掉毕业词后剩不到这么多，就不筛了，免得题库转不动 */
    minTrainingPool: 8,
  };

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "{}");
      return d && typeof d === "object" ? d : {};
    } catch (_) {
      return {};
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (_) {
      /* 存储写满时忽略，不影响做题 */
    }
  }

  /** 专有名词认得出就够，不要求默写 */
  function capFor(item) {
    return /^[A-Z]/.test(item.en || "") ? config.properNounCap : config.defaultCap;
  }

  function levelDef(lv) {
    return config.levels.find((x) => x.lv === lv) || config.levels[0];
  }

  /** 0 表示还没定级 */
  function levelOf(item, data) {
    const row = (data || load())[item.en];
    return row && row.lv ? row.lv : 0;
  }

  function isGraduated(item, data) {
    const row = (data || load())[item.en];
    return !!row && row.lv > capFor(item);
  }

  /** 定级赛直接指定起点级别 */
  function setLevel(item, lv) {
    const data = load();
    const row = data[item.en] || { seen: 0 };
    row.lv = Math.min(lv, capFor(item) + 1);
    row.ok = 0;
    row.seen = (row.seen || 0) + 1;
    row.lastAt = Date.now();
    data[item.en] = row;
    save(data);
    return row;
  }

  /**
   * 记一次答题结果。同一级别连对 promoteStreak 次才升级，答错降一级。
   * formLv 是这道题实际考的级别：如果高于当前级别还答对了（比如拼字师直接考拼写），
   * 就让这个词跳到那一级，不白费。
   */
  function record(item, ok, formLv) {
    const data = load();
    const row = data[item.en] || { lv: 1, ok: 0, seen: 0 };
    const cap = capFor(item);
    row.seen = (row.seen || 0) + 1;
    row.lastAt = Date.now();

    if (ok) {
      if (formLv && formLv > row.lv) {
        row.lv = Math.min(cap + 1, formLv);
        row.ok = 1;
      } else {
        row.ok = (row.ok || 0) + 1;
        if (row.ok >= config.promoteStreak) {
          row.ok = 0;
          row.lv = Math.min(cap + 1, (row.lv || 1) + 1);
        }
      }
    } else {
      row.ok = 0;
      row.lv = Math.max(1, (row.lv || 1) - 1);
    }

    data[item.en] = row;
    save(data);
    return row;
  }

  function statsFor(list) {
    const data = load();
    const stats = { untested: 0, byLevel: [0, 0, 0, 0], graduated: 0, total: list.length };
    list.forEach((item) => {
      const row = data[item.en];
      if (!row || !row.lv) stats.untested += 1;
      else if (row.lv > capFor(item)) stats.graduated += 1;
      else stats.byLevel[row.lv - 1] += 1;
    });
    return stats;
  }

  function untestedIn(list) {
    const data = load();
    return list.filter((item) => {
      const row = data[item.en];
      return !row || !row.lv;
    });
  }

  /**
   * 训练场用：把已经毕业的词筛掉，只留还要练的。
   * 剩得太少就整份还回去——宁可重复练，也不能让小游戏没题可出。
   */
  function forTraining(list) {
    const data = load();
    const left = list.filter((item) => !isGraduated(item, data));
    return left.length >= config.minTrainingPool ? left : list;
  }

  window.WordLevel = {
    KEY,
    config,
    load,
    save,
    capFor,
    levelDef,
    levelOf,
    isGraduated,
    setLevel,
    record,
    statsFor,
    untestedIn,
    forTraining,
  };
})();
