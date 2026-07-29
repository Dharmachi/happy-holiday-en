/**
 * 单词峡谷 · 战斗引擎
 * 内容来自 data.js(window.UNIT)，数值来自 moba-data.js(window.MOBA)。
 * 记忆曲线与生词本沿用主 App 的存档，两边进度互通。
 */
const SAVE_KEY = "hh-moba-v1";
const MASTERY_KEY = "hh-mastery-v1";
const NOTEBOOK_KEY = "hh-notebook-v1";

const U = window.UNIT;
const M = window.MOBA;
const app = document.getElementById("app");

/* ============================ 工具 ============================ */

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(list, n) {
  return shuffle(list).slice(0, n);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (_) { /* 静音失败无所谓 */ }
}

/* ============================ 存档 ============================ */

function defaultSave() {
  return {
    coins: 0,
    stars: 0,
    heroes: ["wordsmith"],
    hero: "wordsmith",
    difficulty: "normal",
    matches: 0,
    wins: 0,
    bestScore: 0,
  };
}

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!raw || typeof raw !== "object") return defaultSave();
    return Object.assign(defaultSave(), raw);
  } catch (_) {
    return defaultSave();
  }
}

let save = loadSave();

function commitSave() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

/* --- 与主 App 共享的记忆曲线存档 --- */

function loadMastery() {
  try {
    const d = JSON.parse(localStorage.getItem(MASTERY_KEY) || "{}");
    return d && typeof d === "object" ? d : {};
  } catch (_) {
    return {};
  }
}

function trackMastery(bucket, id, ok) {
  if (!bucket || !id) return;
  const data = loadMastery();
  if (!data[bucket]) data[bucket] = {};
  if (!data[bucket][id]) data[bucket][id] = { seen: 0, ok: 0, fail: 0 };
  const row = data[bucket][id];
  row.seen += 1;
  if (ok) row.ok += 1;
  else row.fail += 1;
  row.mastered = row.ok >= 2 && row.ok > row.fail;
  row.lastAt = Date.now();
  localStorage.setItem(MASTERY_KEY, JSON.stringify(data));
}

function loadNotebook() {
  try {
    const list = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function saveNotebook(list) {
  localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(list));
}

function notebookKey(item) {
  return `${item.kind || "word"}:${item.en}`;
}

/** 答错入生词本（格式与主 App 完全一致，可在生词本复习里看到） */
function addToNotebook(item) {
  if (!item || !item.en || !item.zh) return;
  const kind = item.kind || "word";
  if (kind !== "word" && kind !== "phrase") return;
  const list = loadNotebook();
  const key = notebookKey(item);
  const now = Date.now();
  const i = list.findIndex((x) => x.key === key);
  if (i >= 0) {
    list[i].stage = 0;
    list[i].nextReviewAt = now;
    list[i].wrongCount = (list[i].wrongCount || 0) + 1;
    list[i].correctStreak = 0;
    list[i].lastAt = now;
  } else {
    list.unshift({
      key,
      en: item.en,
      zh: item.zh || "",
      kind,
      ex: item.ex || "",
      exZh: item.exZh || "",
      stage: 0,
      nextReviewAt: now,
      wrongCount: 1,
      correctStreak: 0,
      createdAt: now,
      lastAt: now,
    });
  }
  saveNotebook(list);
}

/** 答对时推进记忆曲线档位 */
function advanceNotebook(item) {
  if (!item || !item.en) return;
  const list = loadNotebook();
  const key = notebookKey(item);
  const i = list.findIndex((x) => x.key === key);
  if (i < 0) return;
  const row = list[i];
  const stage = Math.min(M.srsDays.length, (row.stage || 0) + 1);
  row.stage = stage;
  row.correctStreak = (row.correctStreak || 0) + 1;
  row.lastAt = Date.now();
  if (stage >= M.srsDays.length) {
    list.splice(i, 1);
  } else {
    row.nextReviewAt = Date.now() + M.srsDays[stage - 1] * 86400000;
    list[i] = row;
  }
  saveNotebook(list);
}

/* ============================ 单词分级 ============================ */

/* 分级逻辑放在 wordlevel.js，训练场那边也用同一份 */
const WL = window.WordLevel;
const WT = WL.config;

const loadLevels = WL.load;
const capFor = WL.capFor;
const levelOf = WL.levelOf;
const levelDef = WL.levelDef;
const setLevel = WL.setLevel;
const recordLevelResult = WL.record;

function levelStats() {
  return WL.statsFor(POOL.words);
}

function untestedWords() {
  return WL.untestedIn(POOL.words);
}

/* ============================ 段位 ============================ */

function rankInfo(stars) {
  let acc = 0;
  for (let i = 0; i < M.ranks.length; i++) {
    const r = M.ranks[i];
    if (r.top || stars < acc + r.stars) {
      return { rank: r, index: i, floor: acc, inTier: Math.max(0, stars - acc) };
    }
    acc += r.stars;
  }
  const last = M.ranks[M.ranks.length - 1];
  return { rank: last, index: M.ranks.length - 1, floor: acc, inTier: last.stars };
}

/** 输了掉一星，但不会掉出当前大段位（对小孩很重要的挫败保护） */
function applyMatchResult(win) {
  const before = rankInfo(save.stars);
  if (win) {
    save.stars += 1;
    save.wins += 1;
  } else if (!before.rank.noDemote) {
    save.stars = Math.max(before.floor, save.stars - 1);
  }
  save.matches += 1;
  const after = rankInfo(save.stars);
  return {
    promoted: after.index > before.index,
    protectedLoss: !win && !before.rank.noDemote && save.stars === before.floor && before.inTier === 0,
    bronzeProtected: !win && !!before.rank.noDemote,
  };
}

/* ============================ 题库 ============================ */

function grammarTopics() {
  const list = [];
  if (U.grammar) list.push(Object.assign({ id: "indefinite" }, U.grammar));
  (U.grammarExtra || []).forEach((t) => list.push(t));
  return list;
}

const POOL = {
  words: (U.vocab || []).map((v) => Object.assign({}, v, { kind: "word" })),
  phrases: (U.phrases || []).map((p) => Object.assign({}, p, { kind: "phrase" })),
  grammar: grammarTopics().flatMap((t) =>
    (t.blanks || []).map((b) => Object.assign({}, b, { topicId: t.id, topicTitle: t.title }))
  ),
  sentences: (U.sentenceBank || []).filter((s) => s.words && s.words.length >= 4),
  texts: (U.texts || []).filter((t) => t.cloze && t.blanks && t.blanks.length >= 3),
};

const ALL_CLOZE_ANSWERS = Array.from(
  new Set(POOL.texts.flatMap((t) => t.blanks.map((b) => b.answer)))
);

/** 本局已出过的题，避免短时间重复 */
let usedThisMatch = new Set();

/**
 * 选下一个要练的词。已经毕业的词基本不再出现（这就是「熟词直接 pass」），
 * 正在练的词优先，还没定级的词偶尔出来顺手定级，到期该复习的最优先。
 */
function pickStudyItem() {
  const notebook = loadNotebook();
  const levels = loadLevels();
  const now = Date.now();
  const dueKeys = new Set(
    notebook.filter((x) => (x.nextReviewAt || 0) <= now).map((x) => x.key)
  );

  const candidates = POOL.words.concat(Math.random() < 0.25 ? POOL.phrases : []);
  const bag = { due: [], training: [], untested: [], graduated: [] };
  candidates.forEach((item) => {
    const key = notebookKey(item);
    if (usedThisMatch.has(key)) return;
    if (dueKeys.has(key)) {
      bag.due.push(item);
      return;
    }
    // 短语暂不分级，一律当正在练
    if (item.kind === "phrase") {
      bag.training.push(item);
      return;
    }
    const row = levels[item.en];
    if (!row || !row.lv) bag.untested.push(item);
    else if (row.lv > capFor(item)) bag.graduated.push(item);
    else bag.training.push(item);
  });

  const w = WT.pickWeights;
  const weighted = [
    { list: bag.due, weight: w.due },
    { list: bag.training, weight: w.training },
    { list: bag.untested, weight: w.untested },
    { list: bag.graduated, weight: WT.maintainWeight },
  ].filter((x) => x.list.length);

  if (!weighted.length) {
    usedThisMatch = new Set();
    return pick(POOL.words);
  }
  const total = weighted.reduce((s, x) => s + x.weight, 0);
  let roll = Math.random() * total;
  for (const x of weighted) {
    roll -= x.weight;
    if (roll <= 0) return pick(x.list);
  }
  return pick(weighted[weighted.length - 1].list);
}

function distractors(item, n) {
  const pool = item.kind === "phrase" ? POOL.phrases : POOL.words;
  return sample(pool.filter((x) => x.en !== item.en), n);
}

function hasUsableExample(item) {
  return !!item.ex && new RegExp(`\\b${item.en}\\b`, "i").test(item.ex);
}

/**
 * 按级别出题。同一个词在不同级别是完全不同的难度：
 * 1 看英文选中文 · 2 看中文选英文（或例句填空）· 3 听发音拼写 · 4 看中文拼写。
 * 第 3 级有读音当线索，所以不给字母提示；第 4 级没读音，给首字母和长度。
 * 这样难度顺序才是真的递增。
 */
function buildWordQuestion(item, lv, kind) {
  const base = { kind: kind || "minion", item, formLv: lv };
  const wrong = distractors(item, 3);

  if (lv <= 1) {
    return Object.assign(base, {
      type: "choice",
      form: "en2zh",
      prompt: item.en,
      promptEn: true,
      ipa: item.ipa || "",
      pos: item.pos || "",
      answer: item.zh,
      options: shuffle([item.zh].concat(wrong.map((w) => w.zh))),
    });
  }

  if (lv === 2) {
    // 有例句的词一半概率考例句填空：同样是「有选项的调取」，但更贴语境
    if (hasUsableExample(item) && Math.random() < 0.5) {
      return Object.assign(base, {
        type: "choice",
        form: "context",
        prompt: item.ex.replace(new RegExp(`\\b${item.en}\\b`, "i"), "▁▁▁▁"),
        sentence: true,
        sub: item.exZh || "",
        answer: item.en,
        options: shuffle([item.en].concat(wrong.map((w) => w.en))),
      });
    }
    return Object.assign(base, {
      type: "choice",
      form: "zh2en",
      prompt: item.zh,
      answer: item.en,
      options: shuffle([item.en].concat(wrong.map((w) => w.en))),
    });
  }

  if (lv === 3) {
    return Object.assign(base, {
      type: "spell",
      form: "dictation",
      audio: true,
      prompt: "听发音，把这个词拼出来",
      hint: `${item.en.length} 个字母`,
      answer: item.en,
    });
  }

  return Object.assign(base, {
    type: "spell",
    form: "zh2spell",
    prompt: item.zh,
    hint: `${item.en[0]}${"·".repeat(Math.max(1, item.en.length - 1))} （${item.en.length} 个字母）`,
    answer: item.en,
  });
}

/** 短语暂不分级，沿用中英互译 */
function buildPhraseQuestion(item) {
  const wrong = distractors(item, 3);
  if (Math.random() < 0.5) {
    return {
      type: "choice",
      kind: "minion",
      item,
      form: "en2zh",
      prompt: item.en,
      promptEn: true,
      answer: item.zh,
      options: shuffle([item.zh].concat(wrong.map((w) => w.zh))),
    };
  }
  return {
    type: "choice",
    kind: "minion",
    item,
    form: "zh2en",
    prompt: item.zh,
    answer: item.en,
    options: shuffle([item.en].concat(wrong.map((w) => w.en))),
  };
}

/** 兵线题：单词按自己的级别出，答对就升级 */
function buildMinionQuestion() {
  const item = pickStudyItem();
  usedThisMatch.add(notebookKey(item));

  if (item.kind === "phrase") return buildPhraseQuestion(item);

  const cap = capFor(item);
  let lv = levelOf(item) || 1;
  // 拼字师直接考最难那一级，答对了让这个词一步跳上去
  if (heroBuff("spellMode", false)) lv = cap;
  return buildWordQuestion(item, Math.min(lv, cap));
}

/** 1 技能：语法填空 */
function buildGrammarQuestion() {
  const fresh = POOL.grammar.filter((b) => !usedThisMatch.has(`g:${b.topicId}:${b.id}`));
  const b = pick(fresh.length ? fresh : POOL.grammar);
  usedThisMatch.add(`g:${b.topicId}:${b.id}`);
  return {
    type: "choice",
    kind: "skill",
    skill: "q",
    prompt: b.prompt.replace(/_{3,}/g, "▁▁▁▁"),
    sentence: true,
    sub: b.zh || "",
    tag: b.topicTitle || "语法",
    answer: b.answer,
    options: shuffle(b.options ? b.options.slice() : [b.answer]),
    masteryId: `${b.topicId}:${b.id}`,
    masteryBucket: "grammar",
  };
}

/** 2 技能：句子重组 */
function buildSentenceQuestion() {
  const fresh = POOL.sentences.filter((s) => !usedThisMatch.has(`s:${s.id}`));
  const s = pick(fresh.length ? fresh : POOL.sentences);
  usedThisMatch.add(`s:${s.id}`);
  return {
    type: "build",
    kind: "skill",
    skill: "w",
    prompt: s.zh,
    answer: s.en,
    words: shuffle(s.words.slice()),
    picked: [],
    tag: "句子重组",
    masteryId: s.id,
    masteryBucket: "sentences",
  };
}

/** 大招：同一篇课文里连出 N 题挖空，前后文都补齐，读起来像真的课文 */
function buildTextQuestions(n) {
  const text = pick(POOL.texts);
  const parts = text.cloze.split(/_{3,}/);
  const blanks = text.blanks;
  const count = Math.min(n, blanks.length);
  const idxs = sample(blanks.map((_, i) => i), count).sort((a, b) => a - b);

  return idxs.map((target) => {
    let sentence = "";
    parts.forEach((p, k) => {
      sentence += p;
      if (k < blanks.length) {
        sentence += k === target ? "▁▁▁▁" : blanks[k].answer;
      }
    });
    const answer = blanks[target].answer;
    const wrong = sample(ALL_CLOZE_ANSWERS.filter((a) => a !== answer), 3);
    return {
      type: "choice",
      kind: "ult",
      skill: "r",
      prompt: sentence.trim(),
      sentence: true,
      sub: blanks[target].hint ? `提示：${blanks[target].hint}` : "",
      tag: text.title,
      answer,
      options: shuffle([answer].concat(wrong)),
      masteryId: text.id,
      masteryBucket: "texts",
    };
  });
}

/* ============================ 战局状态 ============================ */

let B = null;
let loopId = null;

function heroDef(id) {
  return M.heroes.find((h) => h.id === id) || M.heroes[0];
}

function heroBuff(key, fallback) {
  if (!B) return fallback;
  const v = B.heroDef.buffs[key];
  return v === undefined ? fallback : v;
}

function hasItem(id) {
  return !!B && B.items.indexOf(id) >= 0;
}

/** 装备效果相乘 */
function itemMul(key) {
  if (!B) return 1;
  return B.items.reduce((mul, id) => {
    const it = M.items.find((x) => x.id === id);
    const v = it && it.effect[key];
    return typeof v === "number" ? mul * v : mul;
  }, 1);
}

function xpNeedFor(level) {
  return M.level.baseNeed + (level - 1) * M.level.growNeed;
}

function startBattle() {
  const diff = M.difficulties.find((d) => d.id === save.difficulty) || M.difficulties[1];
  const hd = heroDef(save.hero);
  const maxHp = hd.buffs.maxHp || M.hero.maxHp;
  usedThisMatch = new Set();

  const scale = diff.hpScale || 1;
  const buildLane = (list) => list.map((b) => {
    const hp = Math.round(b.hp * scale);
    return Object.assign({}, b, { hp, max: hp });
  });

  B = {
    heroDef: hd,
    diff,
    enemy: buildLane(M.lane.enemy),
    ally: buildLane(M.lane.ally),
    targetIndex: 0,
    allyIndex: 0,
    maxHp,
    hp: maxHp,
    level: 1,
    xp: 0,
    xpNeed: xpNeedFor(1),
    coins: 0,
    items: [],
    combo: 0,
    maxCombo: 0,
    correct: 0,
    wrong: 0,
    total: 0,
    cds: { q: 0, w: 0, r: 0 },
    activeSkill: null,
    ultQueue: [],
    ultCorrect: 0,
    q: null,
    answered: false,
    selected: null,
    dead: false,
    reviveMs: 0,
    deaths: 0,
    shieldUsed: false,
    elapsedMs: 0,
    aiMs: 0,
    lastTickAt: Date.now(),
    over: null,
    shopOpen: false,
    lastMissed: null,
    spellValue: "",
    toast: "",
  };

  nextMinion();
  render();
  startLoop();
}

const TICK_MS = 500;
/** 切回前台或卡顿后最多补算 2 秒，避免一次性被推掉一串塔 */
const MAX_CATCHUP_MS = 2000;

function startLoop() {
  stopLoop();
  B.lastTickAt = Date.now();
  loopId = setInterval(tick, TICK_MS);
}

function stopLoop() {
  if (loopId) clearInterval(loopId);
  loopId = null;
}

function elapsedSec() {
  return B ? Math.floor(B.elapsedMs / 1000) : 0;
}

/**
 * 按真实时间差走时，不靠 setInterval 的次数——浏览器在后台会把定时器节流，
 * 那样比赛时钟和敌方推进节奏都会失准。
 * 逛商店或页面被切走时整局暂停。
 */
function tick() {
  if (!B || B.over) return;

  const now = Date.now();
  const raw = now - B.lastTickAt;
  B.lastTickAt = now;

  if (B.shopOpen || document.hidden) return;
  const dt = Math.min(raw, MAX_CATCHUP_MS);

  B.elapsedMs += dt;
  ["q", "w", "r"].forEach((k) => {
    if (B.cds[k] > 0) B.cds[k] = Math.max(0, B.cds[k] - dt / 1000);
  });

  if (B.dead) {
    B.reviveMs -= dt;
    if (B.reviveMs <= 0) {
      revive();
      return;
    }
  }

  B.aiMs += dt;
  const pushEvery = B.diff.tick * 1000;
  if (B.aiMs >= pushEvery) {
    B.aiMs -= pushEvery;
    enemyPush();
    if (B.over) return;
  }

  patchTick();
}

/* ============================ 战斗动作 ============================ */

function currentTarget() {
  return B.enemy[B.targetIndex] || null;
}

function damageBuilding(list, index, amount) {
  const b = list[index];
  if (!b || b.hp <= 0) return 0;
  const dealt = Math.min(b.hp, amount);
  b.hp -= dealt;
  return dealt;
}

function computeDamage(source) {
  let dmg = M.economy.minionDamage;
  if (source === "minion") {
    dmg *= heroBuff("minionDamage", 1);
  } else {
    const sk = M.skills[source];
    dmg *= sk.multiplier * heroBuff("skillDamage", 1);
  }
  dmg *= 1 + M.level.dmgPerLevel * (B.level - 1);
  dmg *= 1 + M.economy.comboStep * Math.min(B.combo, M.economy.comboMax);
  dmg *= itemMul("damage");
  return Math.max(1, Math.round(dmg));
}

function gainXp(amount) {
  B.xp += Math.round(amount * itemMul("xp"));
  while (B.level < M.level.max && B.xp >= B.xpNeed) {
    B.xp -= B.xpNeed;
    B.level += 1;
    B.xpNeed = xpNeedFor(B.level);
    const unlocked = Object.keys(M.skills).find((k) => M.skills[k].unlockLevel === B.level);
    if (unlocked) {
      toast(`升到 ${B.level} 级 · 解锁「${M.skills[unlocked].name}」`);
    } else {
      toast(`升到 ${B.level} 级`);
    }
  }
  if (B.level >= M.level.max) B.xp = Math.min(B.xp, B.xpNeed);
}

function gainCoins(amount) {
  B.coins += Math.round(amount * itemMul("coins"));
}

function dealToEnemy(amount) {
  const idx = B.targetIndex;
  damageBuilding(B.enemy, idx, amount);

  const splash = heroBuff("splash", 0);
  if (splash > 0 && B.enemy[idx + 1]) {
    damageBuilding(B.enemy, idx + 1, Math.round(amount * splash));
  }

  while (B.enemy[B.targetIndex] && B.enemy[B.targetIndex].hp <= 0) {
    const killed = B.enemy[B.targetIndex];
    gainCoins(M.economy.towerCoins);
    toast(`推掉${killed.name}！+${M.economy.towerCoins} 金币`);
    B.targetIndex += 1;
  }
  if (B.targetIndex >= B.enemy.length) finish("win");
}

function enemyPush() {
  while (B.ally[B.allyIndex] && B.ally[B.allyIndex].hp <= 0) B.allyIndex += 1;
  if (B.allyIndex >= B.ally.length) {
    finish("lose");
    return;
  }
  const b = B.ally[B.allyIndex];
  damageBuilding(B.ally, B.allyIndex, B.diff.damage);
  if (b.hp <= 0) {
    toast(`${b.name}被推掉了！`);
    B.allyIndex += 1;
    if (B.allyIndex >= B.ally.length) finish("lose");
  }
}

function flash(text, bad) {
  const el = document.createElement("div");
  el.className = "flash-dmg" + (bad ? " bad" : "");
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 900);
}

function toast(text) {
  const old = document.querySelector(".toast");
  if (old && old.parentNode) old.parentNode.removeChild(old);
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 2300);
}

/* ============================ 出题 / 判题 ============================ */

function nextMinion() {
  B.activeSkill = null;
  B.ultQueue = [];
  B.q = buildMinionQuestion();
  B.answered = false;
  B.selected = null;
  B.spellValue = "";
  if (B.q.audio) speak(B.q.answer);
}

function castSkill(key) {
  const sk = M.skills[key];
  if (!sk || B.level < sk.unlockLevel || B.cds[key] > 0 || B.answered || B.dead || B.over) return;

  const cd = Math.round(sk.cooldown * heroBuff("cooldown", 1) * itemMul("cooldown"));
  B.cds[key] = cd;
  B.activeSkill = key;
  B.answered = false;
  B.selected = null;
  B.spellValue = "";

  if (key === "q") B.q = buildGrammarQuestion();
  else if (key === "w") B.q = buildSentenceQuestion();
  else {
    B.ultQueue = buildTextQuestions(sk.rounds);
    B.ultCorrect = 0;
    B.q = B.ultQueue.shift();
  }
  render();
}

function trackQuestion(q, ok) {
  if (q.masteryBucket) {
    trackMastery(q.masteryBucket, q.masteryId, ok);
    return;
  }
  if (!q.item) return;
  const bucket = q.item.kind === "phrase" ? "phrases" : "words";
  trackMastery(bucket, q.item.en, ok);
  if (ok) advanceNotebook(q.item);
  else addToNotebook(q.item);

  if (q.item.kind === "word" && q.formLv) {
    const before = levelOf(q.item);
    const row = recordLevelResult(q.item, ok, q.formLv);
    const cap = capFor(q.item);
    if (row.lv > before) {
      if (row.lv > cap) toast(`「${q.item.en}」毕业了！不再出现`);
      else toast(`「${q.item.en}」升到「${levelDef(row.lv).name}」`);
    }
  }
}

function answer(value) {
  if (!B || B.answered || B.dead || B.over) return;
  const q = B.q;
  const ok = normalize(value) === normalize(q.answer);

  B.answered = true;
  B.selected = value;
  B.total += 1;
  trackQuestion(q, ok);

  if (ok) {
    B.correct += 1;
    B.combo += 1;
    B.maxCombo = Math.max(B.maxCombo, B.combo);

    const source = q.kind === "minion" ? "minion" : q.skill;
    const dmg = computeDamage(source);
    dealToEnemy(dmg);
    flash(`-${dmg}`);

    const e = M.economy;
    if (q.kind === "minion") {
      gainXp(e.minionXp);
      gainCoins(e.minionCoins);
    } else if (q.kind === "ult") {
      gainXp(e.ultXp);
      gainCoins(e.ultCoins);
      B.ultCorrect += 1;
      const heal = heroBuff("textHeal", 0);
      if (heal) B.hp = Math.min(B.maxHp, B.hp + heal);
    } else {
      gainXp(e.skillXp);
      gainCoins(e.skillCoins);
    }
  } else {
    B.wrong += 1;
    B.combo = 0;
    B.lastMissed = q;
    const hit = Math.round(
      M.hero.hitDamage * heroBuff("hitDamage", 1) * itemMul("hitReduce")
    );
    B.hp -= hit;
    flash(`-${hit}`, true);
    if (B.hp <= 0) {
      B.hp = 0;
      die();
      return;
    }
  }

  render();
  if (!B.over) scheduleAdvance(ok);
}

function normalize(s) {
  return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " ");
}

let advanceTimer = null;

function scheduleAdvance(ok) {
  if (advanceTimer) clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    if (!B || B.over || B.dead) return;
    if (B.ultQueue.length) {
      B.q = B.ultQueue.shift();
      B.answered = false;
      B.selected = null;
    } else {
      if (B.activeSkill === "r") {
        // 大招全对：额外一发毁灭伤害
        if (B.ultCorrect >= M.skills.r.rounds) {
          const burst = Math.round(computeDamage("r") * M.skills.r.perfectBonus);
          dealToEnemy(burst);
          flash(`大招全对 -${burst}`);
          toast("课文觉醒全对！毁灭伤害");
        }
      }
      if (B.over) {
        render();
        return;
      }
      nextMinion();
    }
    render();
  }, ok ? 800 : 1500);
}

function die() {
  B.dead = true;
  B.deaths += 1;
  B.reviveMs = Math.max(2, M.hero.reviveSeconds - (hasItem("armor") ? 2 : 0)) * 1000;

  const shielded = hasItem("armor") && !B.shieldUsed;
  if (shielded) {
    B.shieldUsed = true;
  } else {
    damageBuilding(B.ally, B.allyIndex, M.hero.deathTowerDamage);
    while (B.ally[B.allyIndex] && B.ally[B.allyIndex].hp <= 0) B.allyIndex += 1;
    if (B.allyIndex >= B.ally.length) {
      finish("lose");
      return;
    }
  }
  render();
}

function revive() {
  B.dead = false;
  B.hp = B.maxHp;
  B.combo = 0;
  B.activeSkill = null;
  B.ultQueue = [];
  nextMinion();
  render();
}

function finish(result) {
  B.over = result;
  stopLoop();
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }

  const g = M.grade;
  const acc = B.total ? B.correct / B.total : 0;
  const towers = B.enemy.filter((b) => b.hp <= 0 && !b.crystal).length;
  let score =
    acc * g.accuracy +
    (B.level / M.level.max) * g.level +
    towers * g.towers +
    (result === "win" ? g.win : 0) +
    Math.min(B.maxCombo, 10) * g.streak;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const reward =
    Math.round(120 * B.diff.coinBonus) +
    (result === "win" ? 150 : 60) +
    towers * 30 +
    Math.round(score * 1.5);

  const rankChange = applyMatchResult(result === "win");
  save.coins += reward;
  if (score > save.bestScore) save.bestScore = score;
  commitSave();

  B.result = { score, reward, towers, acc, rankChange };
  render();
}

/* ============================ 定级赛 ============================ */

let PL = null;
let plTimer = null;

/**
 * 定级赛：每个词最多问两题。
 * 第 1 级答错 → 从第 1 级开始练；第 1 级对、第 2 级错 → 从第 2 级练；
 * 两级都对 → 直接跳到第 3 级（听写），前面两级不用再浪费时间。
 * 一批 14 个词大约 20 多道题，两三分钟。
 */
function startPlacement() {
  const words = untestedWords();
  if (!words.length) {
    toast("所有单词都已定级");
    return;
  }
  PL = {
    queue: sample(words, Math.min(WT.batchSize, words.length)),
    i: 0,
    stage: 1,
    q: null,
    answered: false,
    selected: null,
    assigned: [],
  };
  nextPlacementQuestion();
  view = "placement";
  render();
}

function nextPlacementQuestion() {
  const item = PL.queue[PL.i];
  if (!item) {
    PL.q = null;
    return;
  }
  PL.q = buildWordQuestion(item, PL.stage, "minion");
  PL.answered = false;
  PL.selected = null;
}

function assignPlacement(item, lv) {
  const finalLv = Math.min(lv, capFor(item) + 1);
  setLevel(item, finalLv);
  PL.assigned.push({ item, lv: finalLv });
  PL.i += 1;
  PL.stage = 1;
  nextPlacementQuestion();
}

function answerPlacement(value) {
  if (!PL || PL.answered || !PL.q) return;
  const q = PL.q;
  const item = PL.queue[PL.i];
  const ok = normalize(value) === normalize(q.answer);

  PL.answered = true;
  PL.selected = value;
  trackMastery("words", item.en, ok);
  if (!ok) addToNotebook(item);
  render();

  if (plTimer) clearTimeout(plTimer);
  plTimer = setTimeout(() => {
    plTimer = null;
    if (!PL) return;
    if (PL.stage === 1 && ok) {
      PL.stage = 2;
      nextPlacementQuestion();
    } else if (PL.stage === 1) {
      assignPlacement(item, 1);
    } else {
      assignPlacement(item, ok ? 3 : 2);
    }
    render();
  }, ok ? 750 : 1600);
}

function viewPlacement() {
  const total = PL.queue.length;
  if (!PL.q) return viewPlacementResult();

  const done = PL.i;
  const pctDone = Math.round((done / total) * 100);
  const lvd = levelDef(PL.stage);

  return `
    <div class="hud">
      <span class="chip">📋 单词定级赛</span>
      <span class="timer">${done} / ${total}</span>
      <span class="chip plain">${lvd.emoji} 第 ${PL.stage} 关</span>
    </div>

    <div class="bar xp" style="margin-bottom:12px"><i style="width:${pctDone}%"></i></div>

    ${questionCard({
      q: PL.q,
      answered: PL.answered,
      selected: PL.selected,
      prefix: "p",
      tagText: `定级 · ${lvd.emoji} ${lvd.name}（${lvd.desc}）`,
      okText: "✅ 会了",
    })}

    <p class="muted center" style="font-size:.82rem;margin-top:14px">
      答对就往上加一关，答错就定在这一级开始练。会的词之后不会再来烦你。
    </p>
    <div class="center">
      <button class="btn ghost" style="font-size:.84rem" data-act="pquit">先不测了</button>
    </div>
  `;
}

function viewPlacementResult() {
  const groups = { 1: [], 2: [], 3: [], grad: [] };
  PL.assigned.forEach((a) => {
    if (a.lv > capFor(a.item)) groups.grad.push(a.item);
    else groups[a.lv].push(a.item);
  });
  const left = untestedWords().length;

  const groupBlock = (title, list, note) => (list.length
    ? `<div class="card flat" style="text-align:left">
         <div class="row spread" style="margin-bottom:6px">
           <strong>${esc(title)}</strong><span class="chip plain">${list.length} 个</span>
         </div>
         <p class="muted" style="font-size:.8rem;margin:0 0 8px">${esc(note)}</p>
         <div class="row wrap" style="gap:6px">
           ${list.map((it) => `<span class="chip plain">${esc(it.en)}</span>`).join("")}
         </div>
       </div>`
    : "");

  return `
    <div class="hero-title">
      <div class="sub">定级完成</div>
      <h1>这批词的起点定好了</h1>
    </div>

    ${groupBlock("从「认得出」开始", groups[1], "这些词还不认识，会从看英文选中文开始练")}
    ${groupBlock("从「想得起」开始", groups[2], "认得出但想不起来，从看中文选英文开始练")}
    ${groupBlock("直接跳到「听得懂」", groups[3], "前两关都过了，省下的时间直接练听写和默写")}
    ${groupBlock("直接毕业", groups.grad, "专有名词认得出就够，不用默写")}

    ${left > 0
      ? `<button class="btn gold wide big" data-act="placement">再测下一批（还剩 ${left} 个）</button>`
      : `<div class="card flat center"><strong>全部 ${POOL.words.length} 个单词都定级完了</strong></div>`}
    <button class="btn wide" style="margin-top:8px" data-act="home">回大厅</button>
  `;
}

/* ============================ 商店 ============================ */

function openShop() {
  B.shopOpen = true;
  render();
}

function closeShop() {
  B.shopOpen = false;
  render();
}

function buyItem(id) {
  const it = M.items.find((x) => x.id === id);
  if (!it || hasItem(id) || B.items.length >= 3 || B.coins < it.cost) return;
  B.coins -= it.cost;
  B.items.push(id);
  toast(`装备「${it.name}」`);
  render();
}

/* ============================ 渲染 · 首页 ============================ */

function viewHome() {
  const info = rankInfo(save.stars);
  const hd = heroDef(save.hero);
  const diff = M.difficulties.find((d) => d.id === save.difficulty) || M.difficulties[1];
  const notebook = loadNotebook();
  const due = notebook.filter((x) => (x.nextReviewAt || 0) <= Date.now()).length;
  const winRate = save.matches ? Math.round((save.wins / save.matches) * 100) : 0;

  const starDots = Array.from({ length: info.rank.stars }, (_, i) =>
    `<i class="${i < info.inTier ? "on" : ""}"></i>`
  ).join("");

  return `
    <div class="hero-title">
      <div class="sub">${esc(U.title)} · ${esc(U.themeZh || U.theme)} 赛季</div>
      <h1>单词峡谷</h1>
      <p class="muted">清兵线背单词 · 技能考语法 · 大招读课文</p>
    </div>

    <div class="card rank-box">
      <div class="rank-emoji">${info.rank.emoji}</div>
      <div class="rank-name">${esc(info.rank.name)}${info.rank.top ? "" : ` ${romanize(info.inTier, info.rank.stars)}`}</div>
      <div class="stars">${starDots}</div>
      <div class="row wrap spread" style="margin-top:14px">
        <span class="chip">💰 ${save.coins}</span>
        <span class="chip plain">${save.matches} 场 · 胜率 ${winRate}%</span>
        <span class="chip plain">最高评分 ${save.bestScore}</span>
      </div>
    </div>

    ${due > 0 ? `<div class="card flat"><div class="row"><span class="chip red">📕 ${due} 个词到期</span><span class="muted" style="font-size:.86rem">兵线会优先派这些词上来</span></div></div>` : ""}

    ${wordLevelCard()}

    <div class="card">
      <h2>选英雄</h2>
      <p class="muted" style="font-size:.86rem;margin:0 0 10px">每个英雄擅长的题型不同，想玩谁就得练那一块。</p>
      <div class="pick-grid heroes">
        ${M.heroes.map((h) => heroCard(h)).join("")}
      </div>
    </div>

    <div class="card">
      <h2>选战场</h2>
      <div class="pick-grid diffs">
        ${M.difficulties.map((d) => `
          <button class="pick ${d.id === save.difficulty ? "on" : ""}" data-act="diff" data-id="${d.id}">
            <div class="nm">${esc(d.name)}</div>
            <div class="ps">${esc(d.desc)}<br>敌方每 ${d.tick} 秒推进一次</div>
          </button>
        `).join("")}
      </div>
    </div>

    <div class="card flat">
      <div class="row spread" style="margin-bottom:8px">
        <strong>出战阵容</strong>
        <span class="chip">${hd.emoji} ${esc(hd.name)} · ${esc(diff.name)}</span>
      </div>
      <p class="muted" style="font-size:.86rem;margin:0">${esc(hd.passive)}</p>
    </div>

    <button class="btn gold wide big" data-act="start">开始对战</button>
    <button class="btn wide" style="margin-top:8px" data-act="pvp">真人 1v1（下一步接入）</button>

    <div class="center">
      <a class="backlink" href="./index.html">← 回训练场（15 个小游戏）</a>
    </div>
  `;
}

/** 大厅里的单词分级面板：一眼看到 56 个词分别卡在哪一层 */
function wordLevelCard() {
  const s = levelStats();
  const segs = [
    { n: s.graduated, cls: "grad", label: "已毕业" },
    { n: s.byLevel[3], cls: "l4", label: "写得出" },
    { n: s.byLevel[2], cls: "l3", label: "听得懂" },
    { n: s.byLevel[1], cls: "l2", label: "想得起" },
    { n: s.byLevel[0], cls: "l1", label: "认得出" },
    { n: s.untested, cls: "none", label: "未定级" },
  ];
  const pct = (n) => (s.total ? (n / s.total) * 100 : 0);

  return `
    <div class="card">
      <div class="row spread" style="margin-bottom:4px">
        <h2 style="margin:0">单词分级</h2>
        <span class="chip plain">${s.graduated} / ${s.total} 毕业</span>
      </div>
      <p class="muted" style="font-size:.84rem;margin:6px 0 10px">
        每个词要过四关：认得出 → 想得起 → 听得懂 → 写得出。兵线只考你还没过的那一关，毕业的词不再出现。
      </p>

      <div class="lvbar">
        ${segs.filter((x) => x.n > 0).map((x) =>
          `<i class="${x.cls}" style="width:${pct(x.n)}%" title="${x.label} ${x.n} 个"></i>`
        ).join("")}
      </div>
      <div class="lvlegend">
        ${segs.map((x) => `<span><i class="${x.cls}"></i>${x.label} ${x.n}</span>`).join("")}
      </div>

      ${s.untested > 0
        ? `<button class="btn gold wide" style="margin-top:12px" data-act="placement">
             开始定级赛（还有 ${s.untested} 个词没测）
           </button>
           <p class="muted center" style="font-size:.78rem;margin:8px 0 0">
             一批 ${Math.min(WT.batchSize, s.untested)} 个词，两三分钟。会的直接跳级，不用陪着从头练。
           </p>`
        : `<div class="center muted" style="font-size:.84rem;margin-top:10px">全部单词都已定级，直接开打就行</div>`}
    </div>
  `;
}

function romanize(inTier, total) {
  // 段位内星星越多，罗马数字越小（和王者一致：青铜III → 青铜I）
  const left = Math.max(1, total - inTier);
  return ["I", "II", "III", "IV", "V"][Math.min(4, left - 1)] || "I";
}

function heroCard(h) {
  const owned = save.heroes.indexOf(h.id) >= 0;
  const on = save.hero === h.id;
  const canBuy = save.coins >= h.cost;
  return `
    <button class="pick ${on ? "on" : ""} ${owned ? "" : "locked"}"
            data-act="${owned ? "hero" : "buyhero"}" data-id="${h.id}">
      ${owned ? "" : `<span class="lock chip">🔒 ${h.cost}</span>`}
      <div class="emoji">${h.emoji}</div>
      <div class="tt">${esc(h.title)}</div>
      <div class="nm">${esc(h.name)}</div>
      <div class="ps">${esc(h.passive)}</div>
      <div class="ps" style="color:#7c8dab">${esc(h.tip)}</div>
      ${owned ? "" : `<div class="ps" style="color:${canBuy ? "var(--gold)" : "#7c8dab"}">${canBuy ? "点击解锁" : `还差 ${h.cost - save.coins} 金币`}</div>`}
    </button>
  `;
}

/* ============================ 渲染 · 战斗 ============================ */

function laneInner() {
  const bld = (b, side, isTarget) => `
    <div class="bld ${side} ${b.hp > 0 ? "alive" : "dead"} ${isTarget ? "target" : ""}">
      <div class="icon">${b.crystal ? "💠" : "🗼"}</div>
      <div class="hpbar"><i style="width:${Math.max(0, (b.hp / b.max) * 100)}%"></i></div>
      <div class="lb">${esc(b.name.replace(/^(我方|敌方)/, ""))}</div>
    </div>
  `;
  return `
    <div class="lane-side ally">
      ${B.ally.map((b, i) => bld(b, "ally", i === B.allyIndex && b.hp > 0)).join("")}
    </div>
    <div class="lane-mid">VS</div>
    <div class="lane-side enemy">
      ${B.enemy.map((b, i) => bld(b, "enemy", i === B.targetIndex && b.hp > 0)).join("")}
    </div>
  `;
}

function skillbarInner() {
  const btn = (key) => {
    const sk = M.skills[key];
    const locked = B.level < sk.unlockLevel;
    const cd = Math.ceil(B.cds[key]);
    const ready = !locked && cd <= 0;
    const isUlt = key === "r";
    return `
      <button class="skill ${isUlt ? "ult" : ""} ${ready ? "ready" : ""}"
              data-act="skill" data-id="${key}" ${ready ? "" : "disabled"}>
        <div class="sk-key">${sk.key}</div>
        <div class="sk-nm">${esc(sk.name)}</div>
        ${locked
          ? `<div class="cd">🔒<small>${sk.unlockLevel} 级</small></div>`
          : cd > 0
            ? `<div class="cd">${cd}<small>冷却</small></div>`
            : ""}
      </button>
    `;
  };
  return `
    ${btn("q")}${btn("w")}${btn("r")}
    <button class="skill" data-act="shop">
      <div class="sk-key">🛒</div>
      <div class="sk-nm">商店 ${B.coins}</div>
    </button>
  `;
}

function hstateInner() {
  const hpPct = (B.hp / B.maxHp) * 100;
  const xpPct = B.level >= M.level.max ? 100 : (B.xp / B.xpNeed) * 100;
  return `
    <div class="lvl">${B.level}<small>Lv</small></div>
    <div class="bars">
      <div class="bar hp ${hpPct <= 35 ? "low" : ""}"><i style="width:${Math.max(0, hpPct)}%"></i><span>${B.hp} / ${B.maxHp}</span></div>
      <div class="bar xp"><i style="width:${xpPct}%"></i><span>${B.level >= M.level.max ? "满级" : `经验 ${B.xp}/${B.xpNeed}`}</span></div>
    </div>
    <div class="combo">${B.combo > 0 ? `x${B.combo}` : "—"}<small>连对</small></div>
  `;
}

/**
 * 通用题目卡片。ctx.prefix 决定点击事件名（战斗用 answer，定级赛用 panswer），
 * 这样同一套渲染能给两个场景复用。
 */
function questionCard(ctx) {
  const q = ctx.q;
  if (!q) return "";
  const answered = ctx.answered;
  const selected = ctx.selected;
  const p = ctx.prefix || "";

  const tagClass = q.kind === "minion" ? "minion" : q.kind === "ult" ? "ult" : "skill";
  const lvd = q.formLv ? levelDef(q.formLv) : null;
  const tagText = ctx.tagText || (
    q.kind === "minion"
      ? (lvd ? `兵线 · ${lvd.emoji} ${lvd.name}` : "兵线 · 短语")
      : q.kind === "ult"
        ? `大招 · ${q.tag}（还剩 ${ctx.ultLeft || 0} 题）`
        : `技能 · ${q.tag}`
  );

  let body = "";
  if (q.audio) {
    body = `<div class="center" style="padding:6px 0 2px">
              <button class="big-speak" data-act="speak" data-id="${esc(q.answer)}">🔊 再听一遍</button>
              <div class="qsub" style="margin-top:8px">${esc(q.prompt)}${q.hint ? ` · ${esc(q.hint)}` : ""}</div>
            </div>`;
  } else if (q.sentence) {
    body = `<div class="qsent">${renderBlank(q.prompt)}</div>
            ${q.sub ? `<div class="qsub" style="margin-top:6px">${esc(q.sub)}</div>` : ""}`;
  } else if (q.promptEn) {
    body = `<div class="qmain en">${esc(q.prompt)}</div>
            <div class="row wrap" style="gap:6px;margin-top:4px">
              ${q.ipa ? `<span class="qipa">${esc(q.ipa)}</span>` : ""}
              ${q.pos ? `<span class="chip plain">${esc(q.pos)}</span>` : ""}
              <button class="speak" data-act="speak" data-id="${esc(q.prompt)}">🔊 听</button>
            </div>`;
  } else {
    body = `<div class="qmain">${esc(q.prompt)}</div>
            ${q.hint ? `<div class="qsub">${esc(q.hint)}</div>` : ""}`;
  }

  let input = "";
  if (q.type === "choice") {
    const two = q.options.every((o) => String(o).length <= 12);
    input = `<div class="choices ${two ? "two" : ""}">
      ${q.options.map((o) => {
        let cls = "";
        if (answered) {
          if (normalize(o) === normalize(q.answer)) cls = "ok";
          else if (o === selected) cls = "bad";
        }
        return `<button class="choice ${cls}" data-act="${p}answer" data-id="${esc(o)}" ${answered ? "disabled" : ""}>${esc(o)}</button>`;
      }).join("")}
    </div>`;
  } else if (q.type === "spell") {
    input = `
      <input class="spellin ${answered ? (normalize(selected) === normalize(q.answer) ? "ok" : "bad") : ""}"
             id="spellin" type="text" autocomplete="off" autocapitalize="off"
             spellcheck="false" placeholder="拼出这个词"
             value="${esc(ctx.spellValue || "")}" ${answered ? "disabled" : ""} />
      <button class="btn gold wide" style="margin-top:8px" data-act="${p}submitspell" ${answered ? "disabled" : ""}>确定</button>`;
  } else if (q.type === "build") {
    input = `
      <div class="line-box">
        ${q.picked.length
          ? q.picked.map((w, i) => `<button class="wchip" data-act="unpick" data-id="${i}" ${answered ? "disabled" : ""}>${esc(w)}</button>`).join("")
          : `<span class="muted" style="font-size:.86rem">点下面的词，按顺序排成句子</span>`}
      </div>
      <div class="pool">
        ${q.words.map((w, i) => `<button class="wchip" data-act="pickword" data-id="${i}" ${answered ? "disabled" : ""}>${esc(w)}</button>`).join("")}
      </div>
      <button class="btn gold wide" style="margin-top:10px" data-act="submitbuild" ${answered || !q.words.length ? "disabled" : ""}>出招</button>`;
  }

  let fb = "";
  if (answered) {
    const ok = normalize(selected) === normalize(q.answer);
    fb = `<div class="fb ${ok ? "ok" : "bad"}">
      ${ok ? (ctx.okText || "✅ 命中！") : `❌ 正确答案：<b>${esc(q.answer)}</b>`}
      ${explainFor(q, ok)}
    </div>`;
  }

  return `
    <div class="card qcard">
      <span class="qtag ${tagClass}">${esc(tagText)}</span>
      ${body}
      ${input}
      ${fb}
    </div>
  `;
}

function renderBlank(text) {
  return esc(text).replace(/▁+/g, '<span class="blankmark">▁▁▁▁</span>');
}

function explainFor(q, ok) {
  const it = q.item;
  if (it) {
    const bits = [];
    if (!ok || q.form !== "en2zh") bits.push(`<b>${esc(it.en)}</b> ${esc(it.zh || "")}`);
    if (it.tip) bits.push(esc(it.tip));
    if (it.ex) bits.push(`${esc(it.ex)}<br>${esc(it.exZh || "")}`);
    return bits.length ? `<div style="margin-top:6px">${bits.join("<br>")}</div>` : "";
  }
  if (q.sub && !ok) return `<div style="margin-top:6px">${esc(q.sub)}</div>`;
  return "";
}

function itemsInner() {
  if (!B.items.length) return "";
  return `<div class="row wrap" style="margin-bottom:10px">
    ${B.items.map((id) => {
      const it = M.items.find((x) => x.id === id);
      return `<span class="chip">${it.emoji} ${esc(it.name)}</span>`;
    }).join("")}
  </div>`;
}

function viewBattle() {
  const info = rankInfo(save.stars);
  return `
    <div class="hud">
      <span class="chip">${info.rank.emoji} ${esc(info.rank.name)}</span>
      <span class="timer" id="timer">${fmtTime(elapsedSec())}</span>
      <span class="chip">${B.heroDef.emoji} ${esc(B.heroDef.name)}</span>
    </div>

    <div class="lane" id="lane">${laneInner()}</div>

    <div class="battle-main">
      <div class="col-side">
        <div class="hstate" id="hstate">${hstateInner()}</div>
        <div id="items">${itemsInner()}</div>
      </div>
      <div class="col-q">${questionCard({
        q: B.q,
        answered: B.answered,
        selected: B.selected,
        spellValue: B.spellValue,
        ultLeft: B.ultQueue.length,
      })}</div>
    </div>

    <div class="skillbar" id="skillbar">${skillbarInner()}</div>

    <div class="center">
      <button class="btn ghost" style="margin-top:14px;font-size:.84rem" data-act="quit">投降退出</button>
    </div>
  `;
}

/* ============================ 渲染 · 遮罩层 ============================ */

function viewDead() {
  const q = B.lastMissed;
  const it = q && q.item;
  return `
    <div class="overlay">
      <div class="sheet center">
        <div class="dead-title">阵亡</div>
        <p class="muted" style="margin:4px 0 0">趁复活的时间把这个记住，下次就不会死在这</p>
        <div class="dead-cd" id="deadcd">${Math.ceil(B.reviveMs / 1000)}</div>
        ${q ? `
          <div class="learnbox">
            <div class="k">${esc(it ? it.en : q.answer)}</div>
            <div class="v">${esc(it ? `${it.pos || ""} ${it.zh || ""}`.trim() : q.answer)}</div>
            ${it && it.ipa ? `<div class="muted" style="font-size:.86rem;margin-top:2px">${esc(it.ipa)}</div>` : ""}
            ${it && it.tip ? `<div class="ex">💡 ${esc(it.tip)}</div>` : ""}
            ${it && it.ex ? `<div class="ex">${esc(it.ex)}<br>${esc(it.exZh || "")}</div>` : ""}
            ${!it && q.sub ? `<div class="ex">${esc(q.sub)}</div>` : ""}
            ${!it ? `<div class="ex">题目：${renderBlank(q.prompt)}</div>` : ""}
          </div>
          ${it ? `<button class="speak" data-act="speak" data-id="${esc(it.en)}">🔊 听一遍</button>` : ""}
        ` : ""}
        <p class="muted" style="font-size:.82rem;margin-top:14px">已阵亡 ${B.deaths} 次${B.deaths >= 3 ? " · 慢一点、看清题再点" : ""}</p>
      </div>
    </div>
  `;
}

function viewShop() {
  return `
    <div class="overlay">
      <div class="sheet">
        <div class="row spread" style="margin-bottom:4px">
          <h2 style="margin:0">商店</h2>
          <span class="chip">💰 ${B.coins}</span>
        </div>
        <p class="muted" style="font-size:.84rem;margin:0 0 12px">
          最多带 3 件（已带 ${B.items.length}/3）。逛商店时敌方暂停推进。
        </p>
        ${M.items.map((it) => {
          const owned = hasItem(it.id);
          const full = B.items.length >= 3;
          const poor = B.coins < it.cost;
          const dis = owned || full || poor;
          return `
            <button class="shop-item ${owned ? "owned" : ""}" data-act="buy" data-id="${it.id}" ${dis ? "disabled" : ""}>
              <span class="emoji">${it.emoji}</span>
              <span class="grow">
                <span class="nm">${esc(it.name)}</span>
                <span class="ds">${esc(it.desc)}</span>
              </span>
              <span class="pz">${owned ? "已带" : it.cost}</span>
            </button>
          `;
        }).join("")}
        <button class="btn gold wide" style="margin-top:6px" data-act="closeshop">回到战斗</button>
      </div>
    </div>
  `;
}

function viewResult() {
  const r = B.result;
  const g = M.grade.bands.find((b) => r.score >= b.min) || M.grade.bands[M.grade.bands.length - 1];
  const info = rankInfo(save.stars);
  const win = B.over === "win";
  const rc = r.rankChange;

  return `
    <div class="overlay">
      <div class="sheet center">
        <h1 style="color:${win ? "var(--gold)" : "var(--enemy)"};margin-bottom:2px">${win ? "胜利" : "失败"}</h1>
        <div class="grade-badge">${g.label}</div>
        <p class="muted" style="margin:2px 0 14px">${esc(g.text)} · 评分 ${r.score}</p>

        <div class="card flat" style="text-align:left">
          <div class="kv"><span>答对 / 总题数</span><span>${B.correct} / ${B.total}</span></div>
          <div class="kv"><span>正确率</span><span>${Math.round(r.acc * 100)}%</span></div>
          <div class="kv"><span>最高连对</span><span>x${B.maxCombo}</span></div>
          <div class="kv"><span>达到等级</span><span>Lv ${B.level}</span></div>
          <div class="kv"><span>推塔</span><span>${r.towers} 座</span></div>
          <div class="kv"><span>阵亡</span><span>${B.deaths} 次</span></div>
          <div class="kv"><span>用时</span><span>${fmtTime(elapsedSec())}</span></div>
        </div>

        <div class="row wrap" style="justify-content:center;margin:10px 0">
          <span class="chip">💰 +${r.reward}</span>
          <span class="chip ${win ? "" : "red"}">${win
            ? "⭐ +1 星"
            : rc.bronzeProtected
              ? "🛡️ 青铜不掉星"
              : rc.protectedLoss
                ? "🛡️ 保段，这颗星没掉"
                : "⭐ -1 星"}</span>
          <span class="chip plain">${info.rank.emoji} ${esc(info.rank.name)}</span>
        </div>
        ${rc.promoted ? `<p style="color:var(--gold);font-weight:800">🎉 晋级 ${esc(info.rank.name)}！</p>` : ""}

        <button class="btn gold wide big" data-act="again">再来一局</button>
        <button class="btn wide" style="margin-top:8px" data-act="home">回大厅</button>
      </div>
    </div>
  `;
}

/* ============================ 渲染入口 ============================ */

let view = "home";

function render() {
  app.className = view === "battle" && B ? "app battle" : "app";
  if (view === "placement" && PL) {
    app.innerHTML = viewPlacement();
    const psp = document.getElementById("spellin");
    if (psp && !PL.answered) psp.focus();
    return;
  }
  if (view === "home" || !B) {
    app.innerHTML = viewHome();
    return;
  }
  let html = viewBattle();
  if (B.over) html += viewResult();
  else if (B.dead) html += viewDead();
  else if (B.shopOpen) html += viewShop();
  app.innerHTML = html;

  const sp = document.getElementById("spellin");
  if (sp && !B.answered) {
    sp.focus();
    sp.setSelectionRange(sp.value.length, sp.value.length);
  }
}

/** 每秒只更新会变的那几块，避免整页重绘打断输入 */
function patchTick() {
  const t = document.getElementById("timer");
  if (t) t.textContent = fmtTime(elapsedSec());
  const lane = document.getElementById("lane");
  if (lane) lane.innerHTML = laneInner();
  const sb = document.getElementById("skillbar");
  if (sb) sb.innerHTML = skillbarInner();
  const hs = document.getElementById("hstate");
  if (hs) hs.innerHTML = hstateInner();
  const dc = document.getElementById("deadcd");
  if (dc) dc.textContent = String(Math.max(0, Math.ceil(B.reviveMs / 1000)));
}

/* ============================ 事件 ============================ */

app.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  const act = el.getAttribute("data-act");
  const id = el.getAttribute("data-id");

  switch (act) {
    case "hero":
      save.hero = id;
      commitSave();
      render();
      break;
    case "buyhero": {
      const h = heroDef(id);
      if (save.coins < h.cost) {
        toast(`还差 ${h.cost - save.coins} 金币`);
        return;
      }
      save.coins -= h.cost;
      save.heroes.push(h.id);
      save.hero = h.id;
      commitSave();
      toast(`解锁英雄「${h.name}」`);
      render();
      break;
    }
    case "diff":
      save.difficulty = id;
      commitSave();
      render();
      break;
    case "start":
      view = "battle";
      startBattle();
      break;
    case "pvp":
      toast("真人 1v1 正在接入，先打 AI 峡谷练手");
      break;
    case "answer":
      answer(id);
      break;
    case "placement":
      startPlacement();
      break;
    case "panswer":
      answerPlacement(id);
      break;
    case "psubmitspell": {
      const psp = document.getElementById("spellin");
      answerPlacement(psp ? psp.value : "");
      break;
    }
    case "pquit":
      if (plTimer) {
        clearTimeout(plTimer);
        plTimer = null;
      }
      PL = null;
      view = "home";
      render();
      break;
    case "speak":
      speak(id);
      break;
    case "skill":
      castSkill(id);
      break;
    case "shop":
      openShop();
      break;
    case "closeshop":
      closeShop();
      break;
    case "buy":
      buyItem(id);
      break;
    case "submitspell": {
      const sp = document.getElementById("spellin");
      answer(sp ? sp.value : B.spellValue);
      break;
    }
    case "pickword": {
      const i = Number(id);
      const q = B.q;
      q.picked.push(q.words[i]);
      q.words.splice(i, 1);
      render();
      break;
    }
    case "unpick": {
      const i = Number(id);
      const q = B.q;
      q.words.push(q.picked[i]);
      q.picked.splice(i, 1);
      render();
      break;
    }
    case "submitbuild":
      answer(B.q.picked.join(" "));
      break;
    case "again":
      startBattle();
      break;
    case "home":
      view = "home";
      B = null;
      PL = null;
      stopLoop();
      render();
      break;
    case "quit":
      if (B && !B.over) finish("lose");
      break;
    default:
      break;
  }
});

app.addEventListener("input", (ev) => {
  if (ev.target.id === "spellin" && B && view === "battle") B.spellValue = ev.target.value;
});

app.addEventListener("keydown", (ev) => {
  if (ev.target.id === "spellin" && ev.key === "Enter") {
    ev.preventDefault();
    if (view === "placement") answerPlacement(ev.target.value);
    else answer(ev.target.value);
  }
});

document.addEventListener("keydown", (ev) => {
  if (view === "placement" && PL && PL.q && !PL.answered && PL.q.type === "choice") {
    const pn = Number(ev.key);
    if (pn >= 1 && pn <= PL.q.options.length) answerPlacement(PL.q.options[pn - 1]);
    return;
  }
  if (!B || B.over || B.dead || view !== "battle") return;
  if (document.activeElement && document.activeElement.id === "spellin") return;
  const k = ev.key.toLowerCase();
  if (k === "q" || k === "w" || k === "r") {
    castSkill(k);
    return;
  }
  if (B.answered || !B.q || B.q.type !== "choice") return;
  const n = Number(ev.key);
  if (n >= 1 && n <= B.q.options.length) answer(B.q.options[n - 1]);
});

/** 切回前台时重置基准时间，避免把离开的那段算成敌方推进 */
document.addEventListener("visibilitychange", () => {
  if (B && !B.over) B.lastTickAt = Date.now();
});

window.addEventListener("beforeunload", stopLoop);

/* ============================ 启动 ============================ */

render();
