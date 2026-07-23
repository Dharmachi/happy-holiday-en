const STAR_KEY = "hh-stars-v1";
const WRONG_KEY = "hh-wrong-v1";
const NOTEBOOK_KEY = "hh-notebook-v1";
const PROGRESS_KEY = "hh-progress-v1";
const MASTERY_KEY = "hh-mastery-v1";
const ROUND = 12;
const MATCH_N = 8;
const AUTO_NEXT_OK = 700;
const AUTO_NEXT_BAD = 1200;

/** 记忆曲线间隔（天）：答对后进入下一档 */
const SRS_DAYS = [1, 2, 4, 7, 15, 30];

const GAMES = [
  { id: "pk", title: "双人 PK", desc: "同屏抢答，比比谁更快", cat: "对战" },
  { id: "gun", title: "单词打靶", desc: "瞄准正确单词开枪", cat: "闯关" },
  { id: "shoot", title: "词块坠落", desc: "落地前选对中文", cat: "闯关" },
  { id: "flash", title: "单词闪卡", desc: "点选后自动下一张", cat: "单词" },
  { id: "quiz", title: "中英互译", desc: "点选后自动下一题", cat: "单词" },
  { id: "context", title: "语境理解", desc: "在句子里理解单词", cat: "单词" },
  { id: "match", title: "配对消消乐", desc: "英文和中文配对", cat: "单词" },
  { id: "spell", title: "拼写挑战", desc: "只看中文来拼写", cat: "单词" },
  { id: "phrase", title: "短语闯关", desc: "短语与表达", cat: "表达" },
  { id: "build", title: "句子重组", desc: "把词排成正确句子", cat: "表达" },
  { id: "grammar", title: "语法课堂", desc: "讲解 · 例句 · 练习", cat: "语法" },
  { id: "cloze", title: "课文挖空", desc: "同一材料反复练", cat: "课文" },
  { id: "order", title: "事件排序", desc: "按时间排行程", cat: "课文" },
  { id: "read", title: "课文朗读", desc: "读课文、看笔记", cat: "课文" },
  { id: "notebookReview", title: "生词本复习", desc: "按记忆曲线复习不会的词", cat: "复习" },
  { id: "notebook", title: "我的生词本", desc: "查看、删除、看下次复习", cat: "复习" },
  { id: "review", title: "错题本", desc: "专攻错过的题", cat: "复习" },
];

const PK_ROUNDS = 10;
const PK_NAMES_KEY = "hh-pk-names-v1";

let autoNextTimer = null;
let speakAudio = null;
let shootRaf = null;
let gunRaf = null;

const state = {
  view: "home",
  game: null,
  stars: 0,
  wrongCount: 0,
  progress: {},
  round: [],
  index: 0,
  score: 0,
  answered: false,
  selected: null,
  flashShow: false,
  matchLeft: [],
  matchRight: [],
  matchSel: null,
  matchDone: new Set(),
  spellInput: "",
  buildPicked: [],
  buildPool: [],
  orderPicked: [],
  orderPool: [],
  clozeAnswers: [],
  clozeTextId: null,
  readTextId: null,
  feedback: "",
  feedbackOk: null,
  grammarTab: "rules",
  grammarTopicId: "indefinite",
  shoot: null,
  gun: null,
  notebookDue: 0,
  notebookTotal: 0,
  pk: null,
};

function loadStars() {
  return Number(localStorage.getItem(STAR_KEY) || 0) || 0;
}
function saveStars(n) {
  localStorage.setItem(STAR_KEY, String(n));
}

function loadWrongBook() {
  try {
    const list = JSON.parse(localStorage.getItem(WRONG_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveWrongBook(list) {
  localStorage.setItem(WRONG_KEY, JSON.stringify(list));
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}
function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progress));
}

function markPlayed(gameId) {
  state.progress[gameId] = (state.progress[gameId] || 0) + 1;
  saveProgress();
}

function loadMastery() {
  try {
    const data = JSON.parse(localStorage.getItem(MASTERY_KEY) || "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function saveMastery(data) {
  localStorage.setItem(MASTERY_KEY, JSON.stringify(data));
}

function masteryBucketFor(item) {
  if (!item) return null;
  const kind = item.kind || "word";
  if (kind === "phrase" || (item.en && allPhrases().some((p) => p.en === item.en) && !allVocab().some((v) => v.en === item.en))) {
    return "phrases";
  }
  if (kind === "sentence") return "sentences";
  if (kind === "order" || kind === "cloze") return "texts";
  if (kind === "name" || kind === "adj") return "words";
  if (allVocab().some((v) => v.en === item.en)) return "words";
  if (allPhrases().some((p) => p.en === item.en)) return "phrases";
  return "words";
}

/** 记录学习/掌握：seen=接触过，ok=答对次数；掌握=至少对 2 次且对多于错 */
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
  saveMastery(data);
}

function trackItemMastery(item, ok, meta = {}) {
  if (!item) return;
  const bucket = meta.bucket || masteryBucketFor(item);
  const id = meta.id || item.en || item.id;
  if (!bucket || !id) return;
  trackMastery(bucket, id, !!ok);
}

function markGrammarViewed(topicId) {
  if (!topicId) return;
  const data = loadMastery();
  if (!data.grammarMeta) data.grammarMeta = {};
  if (!data.grammarMeta[topicId]) data.grammarMeta[topicId] = { viewed: false, practiced: 0 };
  data.grammarMeta[topicId].viewed = true;
  saveMastery(data);
}

function markTextRead(textId) {
  if (!textId || textId === "dialogue") {
    const data = loadMastery();
    if (!data.texts) data.texts = {};
    if (!data.texts.dialogue) data.texts.dialogue = { seen: 0, ok: 0, fail: 0 };
    data.texts.dialogue.seen += 1;
    data.texts.dialogue.ok += 1;
    data.texts.dialogue.mastered = data.texts.dialogue.ok >= 1;
    saveMastery(data);
    return;
  }
  trackMastery("texts", textId, true);
}

function pct(n, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((n / total) * 100)));
}

function countMastery(bucket, idList) {
  const data = loadMastery();
  const map = data[bucket] || {};
  let learned = 0;
  let mastered = 0;
  idList.forEach((id) => {
    const row = map[id];
    if (!row) return;
    if (row.seen > 0) learned += 1;
    if (row.mastered || (row.ok >= 2 && row.ok > row.fail)) mastered += 1;
  });
  return { learned, mastered, total: idList.length };
}

function getLearningProgress() {
  const wordIds = allVocab().map((x) => x.en);
  const phraseIds = allPhrases().map((x) => x.en);
  const sentenceIds = (window.UNIT.sentenceBank || []).map((x) => x.id || x.en);
  const textIds = (window.UNIT.texts || []).map((x) => x.id);
  const grammarIds = [];
  allGrammarTopics().forEach((t) => {
    (t.blanks || []).forEach((b) => grammarIds.push(`${t.id}:${b.id}`));
  });

  const words = countMastery("words", wordIds);
  const phrases = countMastery("phrases", phraseIds);
  const grammar = countMastery("grammar", grammarIds);
  // 看过讲解也算入门学习
  const meta = loadMastery().grammarMeta || {};
  const viewedTopics = Object.keys(meta).filter((k) => meta[k] && meta[k].viewed).length;
  const topicTotal = allGrammarTopics().length;
  const grammarLearned = Math.min(grammar.total, Math.max(grammar.learned, Math.round((viewedTopics / Math.max(1, topicTotal)) * grammar.total * 0.3 + grammar.learned)));

  const texts = countMastery("texts", textIds);
  const sentences = countMastery("sentences", sentenceIds);

  const modules = [
    { id: "words", title: "单词", ...words, tip: `${words.total} 个单词` },
    { id: "phrases", title: "短语表达", ...phrases, tip: `${phrases.total} 条短语` },
    { id: "grammar", title: "语法", learned: grammarLearned, mastered: grammar.mastered, total: grammar.total, tip: `${grammar.total} 道语法题 · ${topicTotal} 个专题` },
    { id: "texts", title: "课文", ...texts, tip: `${texts.total} 篇课文` },
    { id: "sentences", title: "句子", ...sentences, tip: `${sentences.total} 个重点句` },
  ];

  const totalItems = modules.reduce((s, m) => s + m.total, 0);
  const learnedItems = modules.reduce((s, m) => s + m.learned, 0);
  const masteredItems = modules.reduce((s, m) => s + m.mastered, 0);

  return {
    modules,
    overall: {
      title: "本单元总进度",
      learned: learnedItems,
      mastered: masteredItems,
      total: totalItems,
    },
  };
}

function renderProgressBars() {
  const prog = getLearningProgress();
  const bar = (label, value, total, tone) => {
    const p = pct(value, total);
    return `
      <div class="prog-row">
        <div class="prog-label"><span>${esc(label)}</span><span>${value}/${total} · ${p}%</span></div>
        <div class="prog-track"><div class="prog-fill ${tone}" style="width:${p}%"></div></div>
      </div>`;
  };

  return `
    <section class="card soft progress-board">
      <h2>学习进度</h2>
      <p class="muted">学习 = 接触过；掌握 = 至少答对 2 次且对多于错。</p>
      <div class="overall-prog">
        <h3>${esc(prog.overall.title)}</h3>
        ${bar("学习", prog.overall.learned, prog.overall.total, "learn")}
        ${bar("掌握", prog.overall.mastered, prog.overall.total, "master")}
      </div>
      <div class="module-prog-list">
        ${prog.modules
          .map(
            (m) => `
          <div class="module-prog">
            <div class="module-prog-head">
              <strong>${esc(m.title)}</strong>
              <span class="muted">${esc(m.tip || "")}</span>
            </div>
            ${bar("学习", m.learned, m.total, "learn")}
            ${bar("掌握", m.mastered, m.total, "master")}
          </div>`,
          )
          .join("")}
      </div>
    </section>`;
}

function allVocab() {
  return window.UNIT.vocab;
}
function allPhrases() {
  return window.UNIT.phrases;
}
function allWordLike() {
  return [
    ...window.UNIT.vocab.map((x) => ({ ...x, kind: "word" })),
    ...window.UNIT.phrases.map((x) => ({ ...x, kind: "phrase", pos: "phr.", ipa: "" })),
    ...(window.UNIT.properNouns || []).map((x) => ({ ...x, kind: "name", pos: "n.", ipa: "" })),
    ...(window.UNIT.adjectives || []).map((x) => ({ ...x, kind: "adj", pos: "adj.", ipa: "" })),
  ];
}

/** 本单元全部英文/中文选项池（单词+短语+专有名词+形容词） */
function unitPool(field) {
  const seen = new Set();
  const out = [];
  for (const item of allWordLike()) {
    const v = item[field];
    if (!v) continue;
    const key = norm(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function pickDistractors(correct, field, n = 3) {
  const pool = unitPool(field).filter((x) => norm(x) !== norm(correct));
  return pick(pool, n);
}

function highlightWord(sentence, word) {
  if (!sentence || !word) return esc(sentence || "");
  const core = word.replace(/\s*\/\s*.*$/, "").replace(/\bsb'?s?\b|\bsth\b/gi, "").trim();
  const token = core.split(/\s+/)[0] || core;
  const re = new RegExp(`(\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i");
  if (!re.test(sentence)) return esc(sentence);
  return esc(sentence).replace(re, '<mark>$1</mark>');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

function stopSpeak() {
  if (speakAudio) {
    speakAudio.pause();
    speakAudio = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function pickEnglishVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  const rank = (v) => {
    const name = v.name || "";
    const lang = v.lang || "";
    let s = 0;
    if (/^en(-|_)US/i.test(lang)) s += 50;
    else if (/^en/i.test(lang)) s += 30;
    if (/Samantha|Karen|Moira|Google US|Microsoft (Aria|Jenny|Guy)|Neural|Enhanced|Premium/i.test(name)) s += 40;
    if (/Google|Microsoft|Apple/i.test(name)) s += 10;
    return s;
  };
  return [...voices].sort((a, b) => rank(b) - rank(a))[0] || null;
}

function speakNative(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.88;
  u.pitch = 1;
  const voice = pickEnglishVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang || "en-US";
  }
  window.speechSynthesis.speak(u);
}

/** 单词/短语优先用有道美音；长课文回退系统语音 */
function speak(text) {
  const t = String(text || "").trim();
  if (!t) return;
  stopSpeak();
  const words = t.split(/\s+/).length;
  const useDict = words <= 16 && t.length <= 120;
  if (useDict) {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(t)}&type=2`;
    speakAudio = new Audio(url);
    speakAudio.play().catch(() => speakNative(t));
    return;
  }
  speakNative(t);
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => pickEnglishVoice();
}

function itemKey(item) {
  return `${item.kind || "word"}:${item.en}`;
}

function loadNotebook() {
  try {
    const list = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveNotebook(list) {
  localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(list));
  refreshNotebookStats();
}

function refreshNotebookStats() {
  const list = loadNotebook();
  const now = Date.now();
  state.notebookTotal = list.length;
  state.notebookDue = list.filter((x) => (x.nextReviewAt || 0) <= now).length;
}

function dayMs(n) {
  return n * 24 * 60 * 60 * 1000;
}

function formatReviewTime(ts) {
  const now = Date.now();
  if (!ts || ts <= now) return "现在可复习";
  const diff = ts - now;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} 分钟后`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} 小时后`;
  const days = Math.round(hours / 24);
  return `${days} 天后`;
}

function stageLabel(stage) {
  const s = Math.max(0, Number(stage) || 0);
  if (s <= 0) return "新记";
  if (s >= SRS_DAYS.length) return "较熟";
  return `第 ${s} 档`;
}

function isNotebookable(item) {
  if (!item || !item.en || !item.zh) return false;
  const kind = item.kind || "word";
  if (kind === "order" || kind === "cloze" || kind === "sentence") return false;
  return true;
}

function saveToNotebook(item, meta = {}) {
  if (!item || !item.en) return null;
  if (!isNotebookable(item) && !meta.force) return null;
  const key = meta.key || itemKey(item);
  const list = loadNotebook();
  const i = list.findIndex((x) => x.key === key);
  const now = Date.now();
  if (i >= 0) {
    list[i].stage = 0;
    list[i].nextReviewAt = now;
    list[i].wrongCount = (list[i].wrongCount || 0) + 1;
    list[i].correctStreak = 0;
    list[i].lastAt = now;
    list[i].zh = item.zh || list[i].zh;
    list[i].en = item.en || list[i].en;
    list[i].ex = item.ex || list[i].ex || "";
    list[i].exZh = item.exZh || list[i].exZh || "";
    saveNotebook(list);
    return list[i];
  }
  const row = {
    key,
    en: item.en,
    zh: item.zh || "",
    kind: item.kind || meta.kind || "word",
    ex: item.ex || "",
    exZh: item.exZh || "",
    stage: 0,
    nextReviewAt: now,
    wrongCount: 1,
    correctStreak: 0,
    createdAt: now,
    lastAt: now,
  };
  list.unshift(row);
  saveNotebook(list);
  return row;
}

function notebookAdvance(key) {
  const list = loadNotebook();
  const i = list.findIndex((x) => x.key === key);
  if (i < 0) return;
  const row = list[i];
  const stage = Math.min(SRS_DAYS.length, (row.stage || 0) + 1);
  row.stage = stage;
  row.correctStreak = (row.correctStreak || 0) + 1;
  row.lastAt = Date.now();
  if (stage >= SRS_DAYS.length) {
    list.splice(i, 1);
  } else {
    const days = SRS_DAYS[stage - 1] || 1;
    row.nextReviewAt = Date.now() + dayMs(days);
    list[i] = row;
  }
  saveNotebook(list);
}

function notebookFail(key) {
  const list = loadNotebook();
  const i = list.findIndex((x) => x.key === key);
  if (i < 0) return;
  list[i].stage = 0;
  list[i].nextReviewAt = Date.now();
  list[i].wrongCount = (list[i].wrongCount || 0) + 1;
  list[i].correctStreak = 0;
  list[i].lastAt = Date.now();
  saveNotebook(list);
}

function removeFromNotebook(key) {
  saveNotebook(loadNotebook().filter((x) => x.key !== key));
}

function dueNotebookItems() {
  const now = Date.now();
  return loadNotebook()
    .filter((x) => (x.nextReviewAt || 0) <= now)
    .sort((a, b) => (a.nextReviewAt || 0) - (b.nextReviewAt || 0));
}

function enrichFromUnit(row) {
  const hit =
    allWordLike().find((x) => x.en === row.en) ||
    allVocab().find((x) => x.en === row.en) ||
    allPhrases().find((x) => x.en === row.en);
  return { ...hit, ...row, kind: row.kind || (hit && hit.kind) || "word" };
}

function addWrong(item, meta = {}) {
  if (!item || !item.en) return;
  const key = meta.key || itemKey(item);
  const list = loadWrongBook();
  const i = list.findIndex((x) => x.key === key);
  const row = {
    key,
    en: item.en,
    zh: item.zh,
    kind: item.kind || meta.kind || "word",
    prompt: meta.prompt || "",
    answer: meta.answer || item.en,
    wrongCount: 1,
    lastAt: Date.now(),
  };
  if (i >= 0) {
    list[i].wrongCount = (list[i].wrongCount || 1) + 1;
    list[i].lastAt = Date.now();
  } else {
    list.unshift(row);
  }
  saveWrongBook(list);
  state.wrongCount = list.length;
  const nbItem = { ...item, kind: item.kind || meta.kind || "word", zh: item.zh || meta.prompt || "" };
  if (isNotebookable(nbItem)) saveToNotebook(nbItem, { key });
  if (state.game !== "grammar" && !meta.skipMastery) {
    trackItemMastery(nbItem, false, { id: meta.masteryId, bucket: meta.bucket });
  }
}

function markCorrect(item, key) {
  const k = key || (item ? itemKey(item) : null);
  if (!k && state.game !== "grammar") return;
  let list = loadWrongBook();
  const i = k ? list.findIndex((x) => x.key === k) : -1;
  if (i >= 0) {
    if (state.game === "review" || state.game === "notebookReview") {
      list.splice(i, 1);
    } else {
      list[i].wrongCount = Math.max(0, (list[i].wrongCount || 1) - 1);
      if (list[i].wrongCount <= 0) list.splice(i, 1);
    }
    saveWrongBook(list);
    state.wrongCount = list.length;
  }
  if (state.game === "notebookReview") notebookAdvance(k);
  if (item && state.game !== "grammar" && !item.skipMastery) trackItemMastery(item, true);
}

function earnStars(n) {
  state.stars += n;
  saveStars(state.stars);
}

function goHome() {
  clearTimeout(autoNextTimer);
  stopShootLoop();
  stopGunLoop();
  stopSpeak();
  state.view = "home";
  state.game = null;
  state.feedback = "";
  state.shoot = null;
  state.gun = null;
  state.pk = null;
  refreshNotebookStats();
  render();
}

function scheduleAutoNext(ok) {
  clearTimeout(autoNextTimer);
  autoNextTimer = setTimeout(() => {
    if (state.view === "game" && state.answered) nextCard();
  }, ok ? AUTO_NEXT_OK : AUTO_NEXT_BAD);
}

function allGrammarTopics() {
  const main = {
    id: "indefinite",
    title: window.UNIT.grammar.title,
    titleEn: window.UNIT.grammar.titleEn,
    tip: window.UNIT.grammar.tip,
    rules: window.UNIT.grammar.rules || [],
    groups: window.UNIT.grammar.groups || [],
    examples: window.UNIT.grammar.examples || [],
    blanks: window.UNIT.grammar.blanks || [],
  };
  return [main, ...(window.UNIT.grammarExtra || [])];
}

function currentGrammarTopic() {
  return allGrammarTopics().find((t) => t.id === state.grammarTopicId) || allGrammarTopics()[0];
}

function startGame(gameId) {
  clearTimeout(autoNextTimer);
  stopSpeak();
  if (gameId === "review" && loadWrongBook().length === 0) {
    alert("错题本是空的，先去其他游戏练习吧！");
    return;
  }
  if (gameId === "notebookReview" && dueNotebookItems().length === 0) {
    alert(loadNotebook().length ? "今天没有到期的生词，稍后再来！" : "生词本是空的。练习时点「不会」或「加入生词本」即可收藏。");
    return;
  }
  if (gameId === "notebook") {
    state.view = "game";
    state.game = "notebook";
    markPlayed(gameId);
    refreshNotebookStats();
    render();
    return;
  }
  if (gameId === "pk") {
    startPkSetup();
    return;
  }
  if (gameId === "gun") {
    startGunRun();
    return;
  }
  state.view = "game";
  state.game = gameId;
  state.index = 0;
  state.score = 0;
  state.answered = false;
  state.selected = null;
  state.feedback = "";
  state.feedbackOk = null;
  state.flashShow = false;
  state.spellInput = "";
  state.buildPicked = [];
  state.orderPicked = [];
  state.clozeAnswers = [];
  markPlayed(gameId);

  if (gameId === "flash" || gameId === "quiz" || gameId === "spell" || gameId === "context") {
    const pool = gameId === "context" ? allVocab().filter((x) => x.ex) : allVocab();
    state.round = pick(pool, Math.min(ROUND, pool.length));
    if (gameId === "quiz") prepareQuizCard(state.round[0]);
    if (gameId === "context") prepareContextCard(state.round[0]);
  } else if (gameId === "phrase") {
    state.round = pick(allPhrases(), Math.min(ROUND, allPhrases().length));
    preparePhraseCard(state.round[0]);
  } else if (gameId === "match") {
    setupMatch(pick(allVocab(), MATCH_N));
  } else if (gameId === "grammar") {
    state.grammarTab = "rules";
    state.grammarTopicId = "indefinite";
    state.round = [];
    markGrammarViewed("indefinite");
  } else if (gameId === "shoot") {
    startShootRun();
    return;
  } else if (gameId === "cloze") {
    const texts = window.UNIT.texts.filter((t) => t.cloze);
    state.clozeTextId = texts[0].id;
    state.round = texts;
  } else if (gameId === "order") {
    state.round = shuffle(window.UNIT.sequences);
    setupOrder(state.round[0]);
  } else if (gameId === "build") {
    state.round = pick(window.UNIT.sentenceBank, Math.min(ROUND, window.UNIT.sentenceBank.length));
    setupBuild(state.round[0]);
  } else if (gameId === "read") {
    state.readTextId = window.UNIT.texts[0].id;
    markTextRead(state.readTextId);
  } else if (gameId === "review") {
    const wrong = loadWrongBook().slice(0, ROUND);
    state.round = wrong.map((w) => ({
      en: w.en,
      zh: w.zh,
      kind: w.kind,
      prompt: w.prompt,
      answer: w.answer,
      reviewKey: w.key,
    }));
    prepareQuizCard(state.round[0]);
  } else if (gameId === "notebookReview") {
    const due = dueNotebookItems().slice(0, ROUND);
    state.round = due.map((w) => {
      const full = enrichFromUnit(w);
      return {
        ...full,
        en: w.en,
        zh: w.zh,
        kind: w.kind || "word",
        reviewKey: w.key,
        notebookKey: w.key,
      };
    });
    prepareQuizCard(state.round[0]);
  }
  render();
}

function buildShootQueue() {
  const vocab = pick(allVocab(), 8).map((x) => ({
    kind: "单词",
    prompt: x.en,
    answer: x.zh,
    speak: x.en,
    item: x,
  }));
  const phrases = pick(allPhrases(), 5).map((x) => ({
    kind: "短语",
    prompt: x.en,
    answer: x.zh,
    speak: x.en,
    item: x,
  }));
  const sentences = pick(
    allVocab().filter((x) => x.ex),
    5,
  ).map((x) => ({
    kind: "句子",
    prompt: x.ex,
    answer: x.zh,
    speak: x.ex,
    item: x,
    hint: "句子中高亮词的意思是？",
    highlight: x.en,
  }));
  return shuffle([...vocab, ...phrases, ...sentences]);
}

function stopShootLoop() {
  if (shootRaf) cancelAnimationFrame(shootRaf);
  shootRaf = null;
}

function startShootRun() {
  stopShootLoop();
  state.game = "shoot";
  state.view = "game";
  state.score = 0;
  state.shoot = {
    lives: 3,
    cleared: 0,
    combo: 0,
    queue: buildShootQueue(),
    current: null,
    y: 0,
    speed: 18,
    locked: false,
    bang: false,
  };
  spawnShootTarget();
  render();
  shootRaf = requestAnimationFrame(shootTick);
}

function spawnShootTarget() {
  const s = state.shoot;
  if (!s || !s.queue.length) {
    finishShoot(true);
    return;
  }
  const next = s.queue.shift();
  const options = shuffle([next.answer, ...pickDistractors(next.answer, "zh", 3)]);
  s.current = { ...next, options };
  s.y = 0;
  s.locked = false;
  s.bang = false;
  // 更慢起步，随进度缓慢加快
  s.speed = 14 + Math.floor(s.cleared / 4) * 3;
}

function finishShoot(won) {
  stopShootLoop();
  const s = state.shoot;
  if (!s) return;
  const bonus = won ? 5 + Math.floor(s.cleared / 2) : Math.max(1, Math.floor(s.cleared / 2));
  earnStars(bonus);
  state.score = s.cleared;
  state.view = "result";
  state.feedback = won ? "全部击落，过关成功！" : "生命用尽，再试一次！";
  state.feedbackOk = won;
  render();
}

const GUN_WAVES = 12;

function stopGunLoop() {
  if (gunRaf) cancelAnimationFrame(gunRaf);
  gunRaf = null;
}

function startGunRun() {
  stopGunLoop();
  clearTimeout(autoNextTimer);
  state.view = "game";
  state.game = "gun";
  state.score = 0;
  state.feedback = "";
  state.gun = {
    lives: 3,
    hits: 0,
    combo: 0,
    wave: 0,
    locked: false,
    mission: null,
    targets: [],
    bullet: null,
    flash: false,
    lastTs: 0,
  };
  markPlayed("gun");
  spawnGunWave();
  render();
  gunRaf = requestAnimationFrame(gunTick);
}

function spawnGunWave() {
  const g = state.gun;
  if (!g) return;
  if (g.wave >= GUN_WAVES) {
    finishGun(true);
    return;
  }
  g.wave += 1;
  g.locked = false;
  g.bullet = null;
  g.flash = false;
  const answerItem = pick(allVocab(), 1)[0];
  const decoys = pick(
    allVocab().filter((x) => x.en !== answerItem.en),
    4,
  );
  const targets = shuffle([answerItem, ...decoys]).map((item, i) => ({
    id: `${g.wave}-${i}-${item.en}`,
    en: item.en,
    zh: item.zh,
    item,
    isAnswer: item.en === answerItem.en,
    x: 8 + Math.random() * 72,
    y: 8 + Math.random() * 42,
    vx: (Math.random() * 2 - 1) * (18 + g.wave * 1.2),
    vy: (Math.random() * 2 - 1) * (12 + g.wave),
    hit: false,
    boom: false,
  }));
  g.mission = {
    zh: answerItem.zh,
    en: answerItem.en,
    speak: answerItem.en,
    item: answerItem,
  };
  g.targets = targets;
  state.feedback = "";
}

function gunTick(ts) {
  if (state.game !== "gun" || !state.gun || state.view !== "game") return;
  const g = state.gun;
  if (!g.lastTs) g.lastTs = ts;
  const dt = Math.min(0.05, (ts - g.lastTs) / 1000);
  g.lastTs = ts;

  if (!g.locked) {
    g.targets.forEach((t) => {
      if (t.hit) return;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      if (t.x < 2 || t.x > 78) t.vx *= -1;
      if (t.y < 2 || t.y > 58) t.vy *= -1;
      t.x = Math.max(2, Math.min(78, t.x));
      t.y = Math.max(2, Math.min(58, t.y));
      const node = document.querySelector(`[data-gun-id="${CSS && CSS.escape ? CSS.escape(t.id) : t.id.replace(/"/g, "")}"]`);
      if (node) {
        node.style.left = `${t.x}%`;
        node.style.top = `${t.y}%`;
      }
    });
  }

  if (g.bullet) {
    g.bullet.t += dt * 3.2;
    const b = document.getElementById("gunBullet");
    if (b) {
      const p = Math.min(1, g.bullet.t);
      const x = g.bullet.x0 + (g.bullet.x1 - g.bullet.x0) * p;
      const y = g.bullet.y0 + (g.bullet.y1 - g.bullet.y0) * p;
      b.style.left = `${x}%`;
      b.style.top = `${y}%`;
      b.style.opacity = String(1 - p * 0.2);
    }
    if (g.bullet.t >= 1) g.bullet = null;
  }

  gunRaf = requestAnimationFrame(gunTick);
}

function fireGun(targetId, clientX, clientY) {
  const g = state.gun;
  if (!g || g.locked || !g.mission) return;
  const target = g.targets.find((t) => t.id === targetId && !t.hit);
  if (!target) return;

  g.locked = true;
  g.flash = true;

  const arena = document.getElementById("gunRange");
  let x1 = target.x + 6;
  let y1 = target.y + 4;
  if (arena) {
    const rect = arena.getBoundingClientRect();
    if (clientX != null && clientY != null && rect.width && rect.height) {
      x1 = ((clientX - rect.left) / rect.width) * 100;
      y1 = ((clientY - rect.top) / rect.height) * 100;
    }
  }
  g.bullet = { x0: 50, y0: 92, x1, y1, t: 0 };

  render();
  // keep animation nodes updated
  stopGunLoop();
  g.lastTs = 0;
  gunRaf = requestAnimationFrame(gunTick);

  setTimeout(() => {
    if (!state.gun || state.game !== "gun") return;
    const ok = target.isAnswer;
    target.hit = true;
    target.boom = true;
    g.flash = false;
    if (ok) {
      g.hits += 1;
      g.combo += 1;
      state.score = g.hits;
      state.feedback = g.combo > 1 ? `命中！连击 x${g.combo}` : "命中！";
      state.feedbackOk = true;
      markCorrect(g.mission.item);
      // clear other targets visually
      g.targets.forEach((t) => {
        if (!t.isAnswer) t.hit = true;
      });
      render();
      setTimeout(() => {
        if (!state.gun || state.game !== "gun") return;
        spawnGunWave();
        if (state.view === "result") return;
        render();
        stopGunLoop();
        state.gun.lastTs = 0;
        gunRaf = requestAnimationFrame(gunTick);
      }, 700);
    } else {
      g.combo = 0;
      g.lives -= 1;
      state.feedback = `打偏了！应打：${g.mission.en}`;
      state.feedbackOk = false;
      addWrong(g.mission.item);
      render();
      setTimeout(() => {
        if (!state.gun || state.game !== "gun") return;
        if (state.gun.lives <= 0) {
          finishGun(false);
          return;
        }
        spawnGunWave();
        render();
        stopGunLoop();
        state.gun.lastTs = 0;
        gunRaf = requestAnimationFrame(gunTick);
      }, 900);
    }
  }, 280);
}

function finishGun(won) {
  stopGunLoop();
  const g = state.gun;
  if (!g) return;
  const bonus = won ? 6 + Math.floor(g.hits / 2) : Math.max(1, Math.floor(g.hits / 2));
  earnStars(bonus);
  state.score = g.hits;
  state.view = "result";
  state.feedback = won ? "全部靶子打完，神枪手！" : "弹药耗尽，再练一局！";
  state.feedbackOk = won;
  render();
}

function shootTick(ts) {
  if (state.game !== "shoot" || !state.shoot || state.view !== "game") return;
  const s = state.shoot;
  if (!s.lastTs) s.lastTs = ts;
  const dt = Math.min(0.05, (ts - s.lastTs) / 1000);
  s.lastTs = ts;
  if (!s.locked && s.current) {
    s.y += s.speed * dt;
    const block = document.getElementById("fallingBlock");
    if (block) block.style.transform = `translate(-50%, ${s.y}px)`;
    const arena = document.getElementById("shootArena");
    const limit = arena ? arena.clientHeight - 88 : 320;
    if (s.y >= limit) {
      missShoot("太慢了，词块落地了！");
      return;
    }
  }
  shootRaf = requestAnimationFrame(shootTick);
}

function missShoot(msg) {
  const s = state.shoot;
  if (!s || s.locked) return;
  s.locked = true;
  s.combo = 0;
  s.lives -= 1;
  if (s.current) addWrong(s.current.item || { en: s.current.prompt, zh: s.current.answer });
  state.feedback = msg || "没打中";
  state.feedbackOk = false;
  render();
  setTimeout(() => {
    if (!state.shoot || state.game !== "shoot") return;
    if (state.shoot.lives <= 0) {
      finishShoot(false);
      return;
    }
    state.feedback = "";
    spawnShootTarget();
    render();
    stopShootLoop();
    state.shoot.lastTs = 0;
    shootRaf = requestAnimationFrame(shootTick);
  }, 900);
}

function answerShoot(choice) {
  const s = state.shoot;
  if (!s || !s.current || s.locked) return;
  s.locked = true;
  const ok = choice === s.current.answer;
  state.feedbackOk = ok;
  if (ok) {
    s.bang = true;
    s.cleared += 1;
    s.combo += 1;
    state.score = s.cleared;
    state.feedback = s.combo > 1 ? `击中！连击 x${s.combo}` : "击中！";
    markCorrect(s.current.item);
    render();
    setTimeout(() => {
      if (!state.shoot || state.game !== "shoot") return;
      state.feedback = "";
      if (!state.shoot.queue.length) {
        finishShoot(true);
        return;
      }
      spawnShootTarget();
      render();
      stopShootLoop();
      state.shoot.lastTs = 0;
      shootRaf = requestAnimationFrame(shootTick);
    }, 650);
  } else {
    s.combo = 0;
    s.lives -= 1;
    state.feedback = `打偏了！答案：${s.current.answer}`;
    addWrong(s.current.item || { en: s.current.prompt, zh: s.current.answer });
    render();
    setTimeout(() => {
      if (!state.shoot || state.game !== "shoot") return;
      if (state.shoot.lives <= 0) {
        finishShoot(false);
        return;
      }
      state.feedback = "";
      spawnShootTarget();
      render();
      stopShootLoop();
      state.shoot.lastTs = 0;
      shootRaf = requestAnimationFrame(shootTick);
    }, 1000);
  }
}

function startGrammarPractice() {
  const topic = currentGrammarTopic();
  const blanks = topic.blanks || [];
  if (!blanks.length) {
    alert("这个语法点还没有练习题。");
    return;
  }
  state.grammarTab = "practice";
  state.round = pick(blanks, Math.min(ROUND, blanks.length));
  state.index = 0;
  state.score = 0;
  state.answered = false;
  state.selected = null;
  state.feedback = "";
  state.feedbackOk = null;
  render();
}

function loadPkNames() {
  try {
    const n = JSON.parse(localStorage.getItem(PK_NAMES_KEY) || "{}");
    return {
      a: n.a || "红方",
      b: n.b || "蓝方",
    };
  } catch {
    return { a: "红方", b: "蓝方" };
  }
}

function savePkNames(a, b) {
  localStorage.setItem(PK_NAMES_KEY, JSON.stringify({ a, b }));
}

function buildPkQueue() {
  const words = pick(allVocab(), 6).map((x) => ({
    type: "word",
    prompt: x.en,
    answer: x.zh,
    speak: x.en,
    item: x,
    hint: "这个单词是什么意思？",
  }));
  const phrases = pick(allPhrases(), 2).map((x) => ({
    type: "phrase",
    prompt: x.en,
    answer: x.zh,
    speak: x.en,
    item: x,
    hint: "这个短语是什么意思？",
  }));
  const sentences = pick(
    allVocab().filter((x) => x.ex),
    2,
  ).map((x) => ({
    type: "sentence",
    prompt: x.ex,
    answer: x.zh,
    speak: x.ex,
    item: x,
    hint: "句子里这个词是什么意思？",
    highlight: x.en,
  }));
  return shuffle([...words, ...phrases, ...sentences]).slice(0, PK_ROUNDS);
}

function startPkSetup() {
  clearTimeout(autoNextTimer);
  stopShootLoop();
  const names = loadPkNames();
  state.view = "game";
  state.game = "pk";
  state.feedback = "";
  state.pk = {
    phase: "setup",
    nameA: names.a,
    nameB: names.b,
    scoreA: 0,
    scoreB: 0,
    index: 0,
    queue: [],
    current: null,
    lockedA: false,
    lockedB: false,
    resolved: false,
    roundWinner: null,
  };
  markPlayed("pk");
  render();
}

function beginPkBattle(nameA, nameB) {
  const a = (nameA || "红方").trim() || "红方";
  const b = (nameB || "蓝方").trim() || "蓝方";
  savePkNames(a, b);
  state.pk = {
    phase: "battle",
    nameA: a,
    nameB: b,
    scoreA: 0,
    scoreB: 0,
    index: 0,
    queue: buildPkQueue(),
    current: null,
    lockedA: false,
    lockedB: false,
    resolved: false,
    roundWinner: null,
  };
  spawnPkRound();
  render();
}

function spawnPkRound() {
  const pk = state.pk;
  if (!pk) return;
  if (pk.index >= pk.queue.length) {
    finishPk();
    return;
  }
  const next = pk.queue[pk.index];
  pk.current = {
    ...next,
    options: shuffle([next.answer, ...pickDistractors(next.answer, "zh", 3)]),
  };
  pk.lockedA = false;
  pk.lockedB = false;
  pk.resolved = false;
  pk.roundWinner = null;
  state.feedback = "";
  state.feedbackOk = null;
}

function answerPk(side, choice) {
  const pk = state.pk;
  if (!pk || pk.phase !== "battle" || !pk.current || pk.resolved) return;
  if (side === "a" && pk.lockedA) return;
  if (side === "b" && pk.lockedB) return;

  const ok = choice === pk.current.answer;
  if (ok) {
    pk.resolved = true;
    pk.roundWinner = side;
    if (side === "a") pk.scoreA += 1;
    else pk.scoreB += 1;
    state.feedback = `${side === "a" ? pk.nameA : pk.nameB} 抢到了！`;
    state.feedbackOk = true;
    markCorrect(pk.current.item);
    render();
    setTimeout(() => {
      if (!state.pk || state.game !== "pk") return;
      state.pk.index += 1;
      if (state.pk.index >= state.pk.queue.length) {
        finishPk();
        return;
      }
      spawnPkRound();
      render();
    }, 900);
    return;
  }

  // 答错：这一侧本轮锁住，另一侧还能抢
  if (side === "a") pk.lockedA = true;
  else pk.lockedB = true;
  addWrong(pk.current.item);
  state.feedback = `${side === "a" ? pk.nameA : pk.nameB} 答错了，对方继续抢！`;
  state.feedbackOk = false;

  if (pk.lockedA && pk.lockedB) {
    pk.resolved = true;
    state.feedback = `双方都错了。答案：${pk.current.answer}`;
    render();
    setTimeout(() => {
      if (!state.pk || state.game !== "pk") return;
      state.pk.index += 1;
      if (state.pk.index >= state.pk.queue.length) {
        finishPk();
        return;
      }
      spawnPkRound();
      render();
    }, 1100);
    return;
  }
  render();
}

function finishPk() {
  const pk = state.pk;
  if (!pk) return;
  pk.phase = "result";
  const tie = pk.scoreA === pk.scoreB;
  const aWins = pk.scoreA > pk.scoreB;
  state.score = Math.max(pk.scoreA, pk.scoreB);
  state.feedback = tie
    ? `平局！${pk.nameA} ${pk.scoreA} : ${pk.scoreB} ${pk.nameB}`
    : `${aWins ? pk.nameA : pk.nameB} 获胜！${pk.nameA} ${pk.scoreA} : ${pk.scoreB} ${pk.nameB}`;
  state.feedbackOk = true;
  earnStars(3 + Math.max(pk.scoreA, pk.scoreB));
  state.view = "result";
  render();
}

function setupMatch(items) {
  state.round = items;
  state.matchLeft = shuffle(items.map((x) => ({ id: x.en, label: x.en, side: "en" })));
  state.matchRight = shuffle(items.map((x) => ({ id: x.en, label: x.zh, side: "zh" })));
  state.matchSel = null;
  state.matchDone = new Set();
  state.score = 0;
}

function setupBuild(item) {
  state.buildPicked = [];
  state.buildPool = shuffle(item.words.map((w, i) => ({ id: `${i}-${w}`, w })));
  state.answered = false;
  state.feedback = "";
}

function setupOrder(seq) {
  state.orderPicked = [];
  state.orderPool = shuffle(seq.items.map((x) => ({ ...x })));
  state.answered = false;
  state.feedback = "";
}

function current() {
  return state.round[state.index];
}

function prepareQuizCard(item) {
  if (!item) return;
  if (item.answer && (item.prompt || item.zh)) {
    state.quizPrompt = item.prompt || item.en;
    state.quizCorrect = item.answer;
    state.quizHint = item.zh || "选出正确英文";
    const field = /[A-Za-z]/.test(item.answer) ? "en" : "zh";
    state.quizOptions = shuffle([item.answer, ...pickDistractors(item.answer, field, 3)]);
    return;
  }
  const enToZh = Math.random() < 0.5;
  if (enToZh) {
    state.quizPrompt = item.en;
    state.quizCorrect = item.zh;
    state.quizHint = "这个英文是什么意思？";
    state.quizOptions = shuffle([item.zh, ...pickDistractors(item.zh, "zh", 3)]);
  } else {
    state.quizPrompt = item.zh;
    state.quizCorrect = item.en;
    state.quizHint = "这个中文对应哪个英文？";
    state.quizOptions = shuffle([item.en, ...pickDistractors(item.en, "en", 3)]);
  }
}

function preparePhraseCard(item) {
  state.quizPrompt = item.en;
  state.quizCorrect = item.zh;
  state.quizHint = "这个短语是什么意思？";
  state.quizOptions = shuffle([item.zh, ...pickDistractors(item.zh, "zh", 3)]);
}

function prepareContextCard(item) {
  state.quizPrompt = item.ex;
  state.quizCorrect = item.zh;
  state.quizHint = "句子里高亮的词是什么意思？";
  state.quizOptions = shuffle([item.zh, ...pickDistractors(item.zh, "zh", 3)]);
  state.contextWord = item.en;
  state.contextExZh = item.exZh || "";
}

function nextCard() {
  clearTimeout(autoNextTimer);
  stopSpeak();
  state.index += 1;
  state.answered = false;
  state.selected = null;
  state.feedback = "";
  state.feedbackOk = null;
  state.flashShow = false;
  state.spellInput = "";
  if (state.index >= state.round.length) {
    if (state.game === "grammar") {
      earnStars(Math.max(1, Math.round(state.score / 2)));
      state.grammarTab = "rules";
      state.round = [];
      state.feedback = `练习完成！答对 ${state.score} 题`;
      state.feedbackOk = true;
      render();
      return;
    }
    finishRound();
    return;
  }
  if (state.game === "build") setupBuild(current());
  if (state.game === "order") setupOrder(current());
  if (state.game === "quiz" || state.game === "review" || state.game === "notebookReview") prepareQuizCard(current());
  if (state.game === "phrase") preparePhraseCard(current());
  if (state.game === "context") prepareContextCard(current());
  render();
}

function finishRound() {
  clearTimeout(autoNextTimer);
  const bonus = Math.max(1, Math.round(state.score / 2));
  earnStars(bonus);
  state.view = "result";
  render();
}

function answerQuiz(choice, correct) {
  if (state.answered) return;
  state.answered = true;
  state.selected = choice;
  const ok = choice === correct;
  state.feedbackOk = ok;
  const item = current();
  if (ok) {
    state.score += 1;
    state.feedback = "答对了！";
    markCorrect(item, item.reviewKey || item.notebookKey);
  } else {
    state.feedback = `正确答案：${correct}`;
    addWrong(item, { answer: correct, prompt: item.zh || item.prompt, key: item.reviewKey || item.notebookKey });
    if (state.game === "notebookReview" && (item.notebookKey || item.reviewKey)) {
      notebookFail(item.notebookKey || item.reviewKey);
    }
  }
  render();
  scheduleAutoNext(ok);
}

function onMatchTap(card) {
  if (state.matchDone.has(card.id + ":" + card.side)) return;
  if (!state.matchSel) {
    state.matchSel = card;
    render();
    return;
  }
  if (state.matchSel.side === card.side) {
    state.matchSel = card;
    render();
    return;
  }
  const a = state.matchSel;
  const b = card;
  const same = a.id === b.id;
  if (same) {
    state.matchDone.add(a.id + ":en");
    state.matchDone.add(a.id + ":zh");
    state.score += 1;
    state.matchSel = null;
    if (state.matchDone.size >= state.round.length * 2) {
      setTimeout(finishRound, 350);
    }
  } else {
    const item = state.round.find((x) => x.en === a.id) || { en: a.id, zh: "" };
    addWrong(item);
    state.feedback = "再试一次";
    state.matchSel = null;
    setTimeout(() => {
      state.feedback = "";
      render();
    }, 500);
  }
  render();
}

function checkSpell() {
  if (state.answered) return;
  const item = current();
  const ok = norm(state.spellInput) === norm(item.en);
  state.answered = true;
  state.feedbackOk = ok;
  if (ok) {
    state.score += 1;
    state.feedback = "拼写正确！";
    markCorrect(item);
  } else {
    state.feedback = `正确拼写：${item.en}`;
    addWrong(item);
  }
  render();
  scheduleAutoNext(ok);
}

function checkGrammar(choice) {
  const item = current();
  const topic = currentGrammarTopic();
  const masteryId = `${topic.id}:${item.id}`;
  const ok = choice === item.answer;
  trackMastery("grammar", masteryId, ok);
  answerQuiz(choice, item.answer);
}

function checkBuild() {
  if (state.answered) return;
  const item = current();
  const got = state.buildPicked.map((x) => x.w).join(" ");
  const ok = norm(got) === norm(item.words.join(" "));
  state.answered = true;
  state.feedbackOk = ok;
  trackMastery("sentences", item.id || item.en, ok);
  if (ok) {
    state.score += 1;
    state.feedback = "句子正确！";
  } else {
    state.feedback = `正确句子：${item.en}`;
    addWrong({ en: item.en, zh: item.zh, kind: "sentence" }, { key: `sentence:${item.id}`, answer: item.en, skipMastery: true });
  }
  render();
  scheduleAutoNext(ok);
}

function checkOrder() {
  if (state.answered) return;
  const seq = current();
  const got = state.orderPicked.map((x) => x.id);
  const ok = got.join(",") === seq.order.join(",");
  state.answered = true;
  state.feedbackOk = ok;
  if (ok) {
    state.score += 1;
    state.feedback = "顺序正确！";
  } else {
    const right = seq.order
      .map((id, i) => `${i + 1}. ${seq.items.find((x) => x.id === id).text}`)
      .join("\n");
    state.feedback = "正确顺序：\n" + right;
    addWrong({ en: seq.title, zh: "事件排序", kind: "order" }, { key: `order:${seq.id}` });
  }
  render();
}

function checkCloze() {
  if (state.answered) return;
  const text = window.UNIT.texts.find((t) => t.id === state.clozeTextId);
  let okCount = 0;
  text.blanks.forEach((b, i) => {
    const got = norm(state.clozeAnswers[i] || "");
    const ans = norm(b.answer);
    if (got === ans) okCount += 1;
    else addWrong({ en: b.answer, zh: b.hint || text.title, kind: "cloze" }, { key: `cloze:${text.id}:${i}`, skipMastery: true });
  });
  const allOk = okCount === text.blanks.length;
  trackMastery("texts", text.id, allOk);
  // 部分对也算接触过：若未全对，再记一次 seen-only via fail path already... trackMastery with false still increments seen
  if (!allOk && okCount > 0) {
    // 补一次“学过”但不算掌握：再保证 seen
    const data = loadMastery();
    if (data.texts && data.texts[text.id]) data.texts[text.id].seen = Math.max(data.texts[text.id].seen, 1);
    saveMastery(data);
  }
  state.answered = true;
  state.feedbackOk = allOk;
  state.score += okCount;
  state.feedback =
    allOk
      ? "全部填对了！"
      : `对了 ${okCount}/${text.blanks.length} 空。可对照课文再练。`;
  render();
}

function clearWrongBook() {
  if (!confirm("确定清空全部错题吗？")) return;
  saveWrongBook([]);
  state.wrongCount = 0;
  goHome();
}

function $(sel) {
  return document.querySelector(sel);
}

function renderHome() {
  const u = window.UNIT;
  const cats = ["对战", "闯关", "单词", "表达", "语法", "课文", "复习"];
  const played = Object.keys(state.progress).length;
  return `
    <header class="hero">
      <p class="eyebrow">${esc(u.title)} · 初二英语</p>
      <h1>${esc(u.theme)}</h1>
      <p class="tagline">${esc(u.themeZh)} · 同一批材料，多种游戏练透</p>
      <div class="hero-meta">
        <span class="stat">★ ${state.stars}</span>
        <span class="stat">生词待复习 ${state.notebookDue}</span>
        <span class="stat">生词本 ${state.notebookTotal}</span>
        <span class="stat">错题 ${state.wrongCount}</span>
      </div>
    </header>

    ${
      state.notebookDue > 0
        ? `<section class="card soft due-banner">
            <h2>今天有 ${state.notebookDue} 个生词到期</h2>
            <p class="muted">按记忆曲线复习：1→2→4→7→15→30 天，答对晋级，答错打回重练。</p>
            <button class="primary" data-start="notebookReview">开始生词本复习</button>
          </section>`
        : ""
    }

    <section class="card soft">
      <h2>本单元目标</h2>
      <p class="muted">大问题：${esc(u.bigQuestionZh)}</p>
      <ul class="goal-list">
        ${u.goals.map((g) => `<li>${esc(g.zh)}</li>`).join("")}
      </ul>
    </section>

    ${renderProgressBars()}

    ${cats
      .map((cat) => {
        const games = GAMES.filter((g) => g.cat === cat);
        if (!games.length) return "";
        return `
          <section class="block">
            <h2 class="section-title">${esc(cat)}</h2>
            <div class="games">
              ${games
                .map(
                  (g) => `
                <button class="game-btn" data-start="${g.id}">
                  <strong>${esc(g.title)}</strong>
                  <span>${esc(g.desc)}</span>
                  ${state.progress[g.id] ? `<em>练过 ${state.progress[g.id]} 次</em>` : ""}
                </button>`,
                )
                .join("")}
            </div>
          </section>`;
      })
      .join("")}

    <section class="card soft">
      <h2>教材进度</h2>
      <p class="muted">单词 ${u.vocab.length} · 短语 ${u.phrases.length} · 专有名词 ${u.properNouns.length} · 课文 ${u.texts.length} · 选项池 ${unitPool("en").length} 条</p>
      <p class="muted">你说一个单元一个单元补，Unit 1 已就绪。之后发 Unit 2 图片即可继续加。</p>
    </section>
  `;
}

function toolbar(title) {
  return `
    <div class="toolbar">
      <button class="back" data-home>← 返回</button>
      <span class="chip">${esc(title)}</span>
      <span class="chip">得分 ${state.score}</span>
    </div>
  `;
}

function feedbackBlock() {
  if (!state.feedback) return "";
  const cls = state.feedbackOk === true ? "ok" : state.feedbackOk === false ? "bad" : "";
  return `<div class="tip ${cls}">${esc(state.feedback).replace(/\n/g, "<br>")}</div>`;
}

function nextBtn(label = "下一题") {
  if (!state.answered) return "";
  return `<button class="primary" data-next>${esc(label)}</button>`;
}

function renderFlash() {
  const item = current();
  const inBook = loadNotebook().some((x) => x.key === itemKey(item));
  return `
    ${toolbar(`闪卡 ${state.index + 1}/${state.round.length}`)}
    <div class="card center flash-card" data-flash-tap>
      <p class="pos">${esc(item.pos || "")} ${item.ipa ? esc(item.ipa) : ""}</p>
      <p class="big-en">${esc(item.en)}</p>
      <button class="ghost" data-speak="${esc(item.en)}">听发音</button>
      ${
        state.flashShow
          ? `<p class="zh-line">${esc(item.zh)}</p>
             ${item.ex ? `<p class="example">${highlightWord(item.ex, item.en)}</p>
             <p class="muted">${esc(item.exZh || "")}</p>` : ""}
             ${item.tip ? `<p class="muted tip-note">${esc(item.tip)}</p>` : ""}`
          : `<p class="muted">点击卡片显示中文和例句</p>`
      }
    </div>
    <div class="row">
      <button class="choice" data-flash-ok>记得 · 下一张</button>
      <button class="choice" data-flash-bad>不会 · 下一张</button>
    </div>
    <button class="ghost" data-add-notebook ${inBook ? "disabled" : ""}>${inBook ? "已在生词本" : "加入生词本"}</button>
  `;
}

function renderQuiz() {
  const item = current();
  const prompt = state.quizPrompt;
  const correct = state.quizCorrect;
  const options = state.quizOptions || [];
  const title =
    state.game === "notebookReview"
      ? `生词复习 ${state.index + 1}/${state.round.length}`
      : `互译 ${state.index + 1}/${state.round.length}`;
  return `
    ${toolbar(title)}
    <div class="card center">
      <p class="muted">${esc(state.quizHint || "请选择正确答案")}（点选后自动下一题）</p>
      <p class="big-en">${esc(prompt)}</p>
      ${item.en && !item.answer ? `<button class="ghost" data-speak="${esc(item.en)}">听发音</button>` : ""}
      ${state.answered && item.ex ? `<p class="example">${highlightWord(item.ex, item.en)}</p>` : ""}
    </div>
    <div class="choices">
      ${options
        .map((o) => {
          let cls = "choice";
          if (state.answered) {
            if (o === correct) cls += " ok";
            else if (o === state.selected) cls += " bad";
          } else if (o === state.selected) cls += " on";
          return `<button class="${cls}" data-quiz="${esc(o)}" ${state.answered ? "disabled" : ""}>${esc(o)}</button>`;
        })
        .join("")}
    </div>
    ${feedbackBlock()}
  `;
}

function renderNotebook() {
  const list = loadNotebook().slice().sort((a, b) => (a.nextReviewAt || 0) - (b.nextReviewAt || 0));
  const due = list.filter((x) => (x.nextReviewAt || 0) <= Date.now()).length;
  return `
    ${toolbar("我的生词本")}
    <div class="card soft">
      <h2>共 ${list.length} 个 · 到期 ${due} 个</h2>
      <p class="muted">记忆曲线：答对后分别隔 1、2、4、7、15、30 天再出现；连续走完就移出生词本。答错会立刻回到“现在可复习”。</p>
      ${due ? `<button class="primary" data-start="notebookReview">复习到期生词</button>` : ""}
      ${list.length ? `<button class="ghost" data-clear-notebook>清空生词本</button>` : ""}
    </div>
    ${
      list.length
        ? list
            .map((x) => {
              const dueNow = (x.nextReviewAt || 0) <= Date.now();
              return `
              <div class="card notebook-item ${dueNow ? "due" : ""}">
                <div class="notebook-top">
                  <strong>${esc(x.en)}</strong>
                  <button class="mini" data-remove-notebook="${esc(x.key)}">删除</button>
                </div>
                <p class="zh-line" style="font-size:1.05rem;margin:6px 0">${esc(x.zh)}</p>
                <p class="muted">${esc(stageLabel(x.stage))} · ${esc(formatReviewTime(x.nextReviewAt))} · 错过 ${x.wrongCount || 0} 次</p>
                ${x.ex ? `<p class="example">${highlightWord(x.ex, x.en)}</p>` : ""}
                <button class="mini" data-speak="${esc(x.en)}">听</button>
              </div>`;
            })
            .join("")
        : `<div class="card"><p class="muted">还没有生词。在闪卡点「不会」或「加入生词本」，做错题时也会自动收录。</p></div>`
    }
  `;
}

function renderContext() {
  const item = current();
  const correct = state.quizCorrect;
  const options = state.quizOptions || [];
  return `
    ${toolbar(`语境 ${state.index + 1}/${state.round.length}`)}
    <div class="card">
      <p class="muted">${esc(state.quizHint)}（点选后自动下一题）</p>
      <p class="example big-example">${highlightWord(item.ex, item.en)}</p>
      <button class="ghost" data-speak="${esc(item.ex)}">听整句</button>
      ${state.answered ? `<p class="zh-line">${esc(item.en)} = ${esc(item.zh)}</p>
        <p class="muted">${esc(item.exZh || "")}</p>` : ""}
    </div>
    <div class="choices">
      ${options
        .map((o) => {
          let cls = "choice";
          if (state.answered) {
            if (o === correct) cls += " ok";
            else if (o === state.selected) cls += " bad";
          }
          return `<button class="${cls}" data-quiz="${esc(o)}" ${state.answered ? "disabled" : ""}>${esc(o)}</button>`;
        })
        .join("")}
    </div>
    ${feedbackBlock()}
  `;
}

function renderMatch() {
  const left = state.matchLeft;
  const right = state.matchRight;
  return `
    ${toolbar(`配对 ${state.matchDone.size / 2}/${state.round.length}`)}
    <p class="muted">先点左边英文，再点右边中文。</p>
    <div class="match-grid">
      <div class="match-col">
        ${left
          .map((c) => {
            const done = state.matchDone.has(c.id + ":en");
            const sel = state.matchSel && state.matchSel.id === c.id && state.matchSel.side === "en";
            return `<button class="match-card ${done ? "done" : ""} ${sel ? "sel" : ""}" data-match='${esc(JSON.stringify(c))}'>${esc(c.label)}</button>`;
          })
          .join("")}
      </div>
      <div class="match-col">
        ${right
          .map((c) => {
            const done = state.matchDone.has(c.id + ":zh");
            const sel = state.matchSel && state.matchSel.id === c.id && state.matchSel.side === "zh";
            return `<button class="match-card ${done ? "done" : ""} ${sel ? "sel" : ""}" data-match='${esc(JSON.stringify(c))}'>${esc(c.label)}</button>`;
          })
          .join("")}
      </div>
    </div>
    ${feedbackBlock()}
  `;
}

function renderSpell() {
  const item = current();
  return `
    ${toolbar(`拼写 ${state.index + 1}/${state.round.length}`)}
    <div class="card center">
      <p class="muted">根据中文拼出英文（不显示英文提示）</p>
      <p class="zh-line">${esc(item.zh)}</p>
      <p class="muted">${esc(item.pos || "")}</p>
      <input class="spell" id="spellInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(state.spellInput)}" ${state.answered ? "disabled" : ""} placeholder="输入英文" />
      ${!state.answered ? `<button class="primary" data-check-spell>检查</button>` : ""}
      ${
        state.answered
          ? `<button class="ghost" data-speak="${esc(item.en)}">听发音</button>
             ${item.ex ? `<p class="example">${highlightWord(item.ex, item.en)}</p>
             <p class="muted">${esc(item.exZh || "")}</p>` : ""}`
          : ""
      }
    </div>
    ${feedbackBlock()}
  `;
}

function renderPhrase() {
  const item = current();
  const correct = state.quizCorrect;
  const options = state.quizOptions || [];
  return `
    ${toolbar(`短语 ${state.index + 1}/${state.round.length}`)}
    <div class="card center">
      <p class="muted">${esc(state.quizHint || "这个短语是什么意思？")}（点选后自动下一题）</p>
      <p class="big-en">${esc(item.en)}</p>
      <button class="ghost" data-speak="${esc(item.en)}">听发音</button>
      ${state.answered && item.ex ? `<p class="example">${highlightWord(item.ex, item.en)}</p>
        <p class="muted">${esc(item.exZh || "")}</p>` : ""}
    </div>
    <div class="choices">
      ${options
        .map((o) => {
          let cls = "choice";
          if (state.answered) {
            if (o === correct) cls += " ok";
            else if (o === state.selected) cls += " bad";
          }
          return `<button class="${cls}" data-quiz="${esc(o)}" ${state.answered ? "disabled" : ""}>${esc(o)}</button>`;
        })
        .join("")}
    </div>
    ${feedbackBlock()}
  `;
}

function renderGun() {
  const g = state.gun;
  if (!g || !g.mission) {
    return `${toolbar("单词打靶")}<div class="card"><p class="muted">准备中…</p></div>`;
  }
  const hearts = "♥".repeat(Math.max(0, g.lives)) + "♡".repeat(Math.max(0, 3 - g.lives));
  return `
    ${toolbar("单词打靶")}
    <div class="shoot-hud">
      <span class="chip">生命 ${hearts}</span>
      <span class="chip">命中 ${g.hits}</span>
      <span class="chip">波次 ${g.wave}/${GUN_WAVES}</span>
      <span class="chip">连击 ${g.combo}</span>
    </div>
    <div class="card soft gun-mission">
      <p class="muted">瞄准并点击正确英文靶子</p>
      <p class="zh-line">${esc(g.mission.zh)}</p>
      <button class="ghost" data-speak="${esc(g.mission.speak)}">听答案发音</button>
    </div>
    <div class="gun-range ${g.flash ? "flashing" : ""}" id="gunRange">
      ${g.targets
        .filter((t) => !t.hit || t.boom)
        .map(
          (t) => `
        <button class="gun-target ${t.boom ? "boom" : ""} ${t.isAnswer && g.locked && t.boom ? "answer" : ""}"
          data-gun-id="${esc(t.id)}"
          data-gun-fire="${esc(t.id)}"
          style="left:${t.x}%;top:${t.y}%"
          ${g.locked ? "disabled" : ""}>
          <span class="gun-ring"></span>
          <strong>${esc(t.en)}</strong>
        </button>`,
        )
        .join("")}
      ${
        g.bullet
          ? `<div class="gun-bullet" id="gunBullet" style="left:${g.bullet.x0}%;top:${g.bullet.y0}%"></div>`
          : `<div class="gun-bullet" id="gunBullet" style="display:none"></div>`
      }
      <div class="gun-muzzle ${g.flash ? "on" : ""}"></div>
    </div>
    ${feedbackBlock()}
    <p class="muted center-tip">提示：点中靶子会开枪；点错会扣生命。</p>
  `;
}

function renderShoot() {
  const s = state.shoot;
  if (!s || !s.current) {
    return `${toolbar("词块坠落")}<div class="card"><p class="muted">准备中…</p></div>`;
  }
  const cur = s.current;
  const hearts = "♥".repeat(Math.max(0, s.lives)) + "♡".repeat(Math.max(0, 3 - s.lives));
  return `
    ${toolbar("词块坠落过关")}
    <div class="shoot-hud">
      <span class="chip">生命 ${hearts}</span>
      <span class="chip">击落 ${s.cleared}</span>
      <span class="chip">连击 ${s.combo}</span>
      <span class="chip">${esc(cur.kind)}</span>
    </div>
    <p class="muted">${esc(cur.hint || "在词块落地前点出正确中文！")}</p>
    <div class="shoot-arena" id="shootArena">
      <div class="falling ${s.bang ? "bang" : ""}" id="fallingBlock" style="transform:translate(-50%, ${s.y}px)">
        <span class="falling-kind">${esc(cur.kind)}</span>
        <p>${cur.highlight ? highlightWord(cur.prompt, cur.highlight) : esc(cur.prompt)}</p>
      </div>
      <div class="ground-line"></div>
    </div>
    <div class="choices shoot-choices">
      ${cur.options
        .map(
          (o) =>
            `<button class="choice" data-shoot="${esc(o)}" ${s.locked ? "disabled" : ""}>${esc(o)}</button>`,
        )
        .join("")}
    </div>
    ${feedbackBlock()}
    <button class="ghost" data-speak="${esc(cur.speak)}">听发音</button>
  `;
}

function renderGrammar() {
  const topics = allGrammarTopics();
  const topic = currentGrammarTopic();
  if (state.grammarTab === "practice" && state.round.length) {
    const item = current();
    return `
      ${toolbar(`${topic.title} · 练习 ${state.index + 1}/${state.round.length}`)}
      <div class="card">
        <p class="muted">${esc(item.zh || "")}（点选后自动下一题）</p>
        <p class="big-en prompt-line">${esc(item.prompt)}</p>
      </div>
      <div class="choices">
        ${item.options
          .map((o) => {
            let cls = "choice";
            if (state.answered) {
              if (o === item.answer) cls += " ok";
              else if (o === state.selected) cls += " bad";
            }
            return `<button class="${cls}" data-grammar="${esc(o)}" ${state.answered ? "disabled" : ""}>${esc(o)}</button>`;
          })
          .join("")}
      </div>
      ${feedbackBlock()}
      <button class="ghost" data-grammar-tab="rules">返回语法讲解</button>
    `;
  }

  return `
    ${toolbar("语法课堂")}
    <div class="tabs">
      ${topics
        .map(
          (t) =>
            `<button class="tab ${t.id === topic.id ? "on" : ""}" data-grammar-topic="${t.id}">${esc(t.title)}</button>`,
        )
        .join("")}
    </div>
    <div class="tabs">
      <button class="tab ${state.grammarTab === "rules" ? "on" : ""}" data-grammar-tab="rules">讲解</button>
      <button class="tab ${state.grammarTab === "examples" ? "on" : ""}" data-grammar-tab="examples">例句</button>
      <button class="tab ${state.grammarTab === "practice" ? "on" : ""}" data-grammar-practice>练习</button>
    </div>
    <div class="card soft">
      <h2>${esc(topic.title)} · ${esc(topic.titleEn || "")}</h2>
      <p class="muted">${esc(topic.tip || "")}</p>
    </div>
    ${
      state.grammarTab === "examples"
        ? `<div class="card">
            ${(topic.examples || [])
              .map(
                (ex) => `
              <div class="grammar-ex">
                <p class="example">${esc(ex.en || ex.q || "")}</p>
                <p class="zh-line" style="font-size:1rem">${esc(ex.zh || ex.a || "")}</p>
                ${ex.note ? `<p class="muted">${esc(ex.note)}</p>` : ""}
                ${ex.en ? `<button class="mini" data-speak="${esc(ex.en)}">听</button>` : ""}
              </div>`,
              )
              .join("")}
          </div>`
        : `<div class="card">
            ${(topic.rules || [])
              .map(
                (r) => `
              <div class="grammar-rule">
                <h2>${esc(r.title)}</h2>
                <p>${esc(r.body)}</p>
              </div>`,
              )
              .join("")}
            ${
              topic.groups
                ? `<div class="group-grid">${topic.groups
                    .map(
                      (g) =>
                        `<div class="group-card"><strong>${esc(g.kind)}</strong><p>${esc(g.items.join(" · "))}</p></div>`,
                    )
                    .join("")}</div>`
                : ""
            }
          </div>`
    }
    <button class="primary" data-grammar-practice>开始语法练习</button>
  `;
}

function renderCloze() {
  const texts = state.round;
  const text = texts.find((t) => t.id === state.clozeTextId) || texts[0];
  const parts = text.cloze.split("____");
  let html = "";
  parts.forEach((part, i) => {
    html += esc(part);
    if (i < text.blanks.length) {
      const val = state.clozeAnswers[i] || "";
      const b = text.blanks[i];
      let cls = "cloze-input";
      if (state.answered) {
        cls += norm(val) === norm(b.answer) ? " ok" : " bad";
      }
      html += `<input class="${cls}" data-cloze="${i}" value="${esc(val)}" ${state.answered ? "disabled" : ""} placeholder="${esc(b.hint || "")}" />`;
    }
  });
  return `
    ${toolbar("课文挖空")}
    <div class="tabs">
      ${texts
        .map(
          (t) =>
            `<button class="tab ${t.id === text.id ? "on" : ""}" data-cloze-text="${t.id}" ${state.answered ? "disabled" : ""}>${esc(t.title)}</button>`,
        )
        .join("")}
    </div>
    <div class="card">
      <h2>${esc(text.title)}</h2>
      <p class="cloze-body">${html}</p>
    </div>
    ${!state.answered ? `<button class="primary" data-check-cloze>检查填空</button>` : ""}
    ${feedbackBlock()}
    ${
      state.answered
        ? `<button class="primary" data-home>回首页</button>
           <button class="ghost" data-retry-cloze>再练这篇</button>
           <div class="card soft"><p class="muted">完整课文</p><p>${esc(text.body)}</p></div>`
        : ""
    }
  `;
}

function renderOrder() {
  const seq = current();
  return `
    ${toolbar(`排序 ${state.index + 1}/${state.round.length}`)}
    <div class="card">
      <h2>${esc(seq.title)}</h2>
      <p class="muted">按时间顺序点选事件</p>
      <div class="order-picked">
        ${
          state.orderPicked.length
            ? state.orderPicked
                .map(
                  (x, i) =>
                    `<div class="order-item"><span>${i + 1}</span><div><strong>${esc(x.text)}</strong><p>${esc(x.zh)}</p></div></div>`,
                )
                .join("")
            : `<p class="muted">还没有选择</p>`
        }
      </div>
    </div>
    <div class="choices">
      ${state.orderPool
        .map(
          (x) =>
            `<button class="choice" data-order="${esc(x.id)}" ${state.answered ? "disabled" : ""}><strong>${esc(x.text)}</strong><span class="en">${esc(x.zh)}</span></button>`,
        )
        .join("")}
    </div>
    ${!state.answered && state.orderPicked.length ? `<button class="ghost" data-order-undo>撤销</button>` : ""}
    ${!state.answered && state.orderPicked.length === seq.items.length ? `<button class="primary" data-check-order>检查顺序</button>` : ""}
    ${feedbackBlock()}
    ${nextBtn(state.index + 1 >= state.round.length ? "完成" : "下一组")}
  `;
}

function renderBuild() {
  const item = current();
  return `
    ${toolbar(`组句 ${state.index + 1}/${state.round.length}`)}
    <div class="card">
      <p class="muted">中文提示</p>
      <p class="zh-line">${esc(item.zh)}</p>
      <div class="build-line">
        ${
          state.buildPicked.length
            ? state.buildPicked.map((x) => `<button class="word-chip on" data-unbuild="${esc(x.id)}" ${state.answered ? "disabled" : ""}>${esc(x.w)}</button>`).join("")
            : `<span class="muted">点下面的词组成句子</span>`
        }
      </div>
    </div>
    <div class="word-pool">
      ${state.buildPool
        .map((x) => `<button class="word-chip" data-build="${esc(x.id)}" ${state.answered ? "disabled" : ""}>${esc(x.w)}</button>`)
        .join("")}
    </div>
    ${!state.answered && state.buildPicked.length ? `<button class="primary" data-check-build>检查句子</button>` : ""}
    ${feedbackBlock()}
    ${nextBtn()}
  `;
}

function renderRead() {
  const texts = window.UNIT.texts;
  const text = texts.find((t) => t.id === state.readTextId) || texts[0];
  const dialogue = window.UNIT.dialogue;
  return `
    ${toolbar("课文朗读")}
    <div class="tabs">
      ${texts
        .map((t) => `<button class="tab ${t.id === text.id ? "on" : ""}" data-read="${t.id}">${esc(t.title)}</button>`)
        .join("")}
      <button class="tab ${state.readTextId === "dialogue" ? "on" : ""}" data-read="dialogue">${esc(dialogue.title)}</button>
    </div>
    ${
      state.readTextId === "dialogue"
        ? `<div class="card">
            <h2>${esc(dialogue.title)}</h2>
            <button class="ghost" data-speak-all>朗读整段对话</button>
            <div class="dialogue">
              ${dialogue.lines
                .map(
                  (l) => `
                <div class="line">
                  <strong>${esc(l.who)}</strong>
                  <p>${esc(l.text)}</p>
                  <button class="mini" data-speak="${esc(l.text)}">听</button>
                </div>`,
                )
                .join("")}
            </div>
          </div>`
        : `<div class="card">
            <h2>${esc(text.title)}</h2>
            <p class="muted">${esc(text.titleEn || "")}</p>
            <button class="ghost" data-speak="${esc(text.body)}">朗读课文</button>
            <p class="read-body">${esc(text.body)}</p>
          </div>`
    }
    <button class="primary" data-home>回首页</button>
  `;
}

function renderPk() {
  const pk = state.pk;
  if (!pk) return `<div class="card"><button class="primary" data-home>回首页</button></div>`;

  if (pk.phase === "setup") {
    return `
      ${toolbar("双人 PK")}
      <div class="card soft">
        <h2>同屏抢答比赛</h2>
        <p class="muted">一人坐左边（红方），一人坐右边（蓝方）。中间出题，两边各自点选项，<strong>谁先点对谁得分</strong>。共 ${PK_ROUNDS} 题。</p>
      </div>
      <div class="pk-setup">
        <label class="pk-name pk-a">
          <span>红方昵称</span>
          <input id="pkNameA" value="${esc(pk.nameA)}" maxlength="8" />
        </label>
        <label class="pk-name pk-b">
          <span>蓝方昵称</span>
          <input id="pkNameB" value="${esc(pk.nameB)}" maxlength="8" />
        </label>
      </div>
      <button class="primary" data-pk-start>开始对战</button>
      <button class="ghost" data-home>回首页</button>
    `;
  }

  const cur = pk.current;
  if (!cur) return `${toolbar("双人 PK")}<div class="card"><p class="muted">准备中…</p></div>`;

  const optBtns = (side, locked) =>
    cur.options
      .map((o) => {
        let cls = `choice pk-opt ${side === "a" ? "side-a" : "side-b"}`;
        if (pk.resolved && o === cur.answer) cls += " ok";
        return `<button class="${cls}" data-pk-side="${side}" data-pk-choice="${esc(o)}" ${
          locked || pk.resolved ? "disabled" : ""
        }>${esc(o)}</button>`;
      })
      .join("");

  return `
    <div class="toolbar">
      <button class="back" data-home>← 退出</button>
      <span class="chip">第 ${pk.index + 1}/${pk.queue.length} 题</span>
    </div>
    <div class="pk-scoreboard">
      <div class="pk-score a">
        <strong>${esc(pk.nameA)}</strong>
        <span>${pk.scoreA}</span>
      </div>
      <div class="pk-vs">VS</div>
      <div class="pk-score b">
        <strong>${esc(pk.nameB)}</strong>
        <span>${pk.scoreB}</span>
      </div>
    </div>
    <div class="card center pk-prompt">
      <p class="muted">${esc(cur.hint || "抢答")}</p>
      <p class="big-en">${cur.highlight ? highlightWord(cur.prompt, cur.highlight) : esc(cur.prompt)}</p>
      <button class="ghost" data-speak="${esc(cur.speak)}">听发音</button>
    </div>
    <div class="pk-arena">
      <div class="pk-col a ${pk.lockedA ? "locked" : ""}">
        <p class="pk-col-title">${esc(pk.nameA)}${pk.lockedA ? "（本轮锁住）" : ""}</p>
        <div class="choices">${optBtns("a", pk.lockedA)}</div>
      </div>
      <div class="pk-col b ${pk.lockedB ? "locked" : ""}">
        <p class="pk-col-title">${esc(pk.nameB)}${pk.lockedB ? "（本轮锁住）" : ""}</p>
        <div class="choices">${optBtns("b", pk.lockedB)}</div>
      </div>
    </div>
    ${feedbackBlock()}
  `;
}

function renderResult() {
  const g = GAMES.find((x) => x.id === state.game);
  const pk = state.game === "pk" ? state.pk : null;
  return `
    <div class="card center result">
      <p class="eyebrow">${pk ? "对战结束" : "本轮结束"}</p>
      <h1>${esc(g ? g.title : "练习")}</h1>
      ${state.feedback ? `<p class="tip ${state.feedbackOk ? "ok" : "bad"}">${esc(state.feedback)}</p>` : ""}
      ${
        pk
          ? `<div class="pk-final">
              <div class="pk-score a"><strong>${esc(pk.nameA)}</strong><span>${pk.scoreA}</span></div>
              <div class="pk-vs">:</div>
              <div class="pk-score b"><strong>${esc(pk.nameB)}</strong><span>${pk.scoreB}</span></div>
            </div>`
          : `<p class="zh-line">得分 ${state.score}</p>`
      }
      <p class="muted">星星累计：★ ${state.stars}</p>
      <div class="row">
        <button class="primary" data-restart>再来一轮</button>
        <button class="ghost" data-home>回首页</button>
      </div>
    </div>
  `;
}

function renderGame() {
  switch (state.game) {
    case "pk":
      return renderPk();
    case "gun":
      return renderGun();
    case "shoot":
      return renderShoot();
    case "flash":
      return renderFlash();
    case "quiz":
    case "review":
    case "notebookReview":
      return renderQuiz();
    case "notebook":
      return renderNotebook();
    case "context":
      return renderContext();
    case "match":
      return renderMatch();
    case "spell":
      return renderSpell();
    case "phrase":
      return renderPhrase();
    case "grammar":
      return renderGrammar();
    case "cloze":
      return renderCloze();
    case "order":
      return renderOrder();
    case "build":
      return renderBuild();
    case "read":
      return renderRead();
    default:
      return renderHome();
  }
}

function render() {
  const app = $("#app");
  if (!app) return;
  if (state.view === "home") app.innerHTML = renderHome();
  else if (state.view === "result") app.innerHTML = renderResult();
  else app.innerHTML = renderGame();
  bind();
}

function bind() {
  document.querySelectorAll("[data-home]").forEach((el) => el.addEventListener("click", goHome));
  document.querySelectorAll("[data-start]").forEach((el) =>
    el.addEventListener("click", () => startGame(el.getAttribute("data-start"))),
  );
  document.querySelectorAll("[data-pk-start]").forEach((el) =>
    el.addEventListener("click", () => {
      const a = document.getElementById("pkNameA");
      const b = document.getElementById("pkNameB");
      beginPkBattle(a ? a.value : "红方", b ? b.value : "蓝方");
    }),
  );
  document.querySelectorAll("[data-pk-side]").forEach((el) =>
    el.addEventListener("click", () => {
      answerPk(el.getAttribute("data-pk-side"), el.getAttribute("data-pk-choice"));
    }),
  );
  document.querySelectorAll("[data-gun-fire]").forEach((el) =>
    el.addEventListener("click", (e) => {
      const id = el.getAttribute("data-gun-fire");
      fireGun(id, e.clientX, e.clientY);
    }),
  );
  document.querySelectorAll("[data-shoot]").forEach((el) =>
    el.addEventListener("click", () => answerShoot(el.getAttribute("data-shoot"))),
  );
  document.querySelectorAll("[data-grammar-topic]").forEach((el) =>
    el.addEventListener("click", () => {
      state.grammarTopicId = el.getAttribute("data-grammar-topic");
      state.grammarTab = "rules";
      state.round = [];
      state.answered = false;
      markGrammarViewed(state.grammarTopicId);
      render();
    }),
  );
  document.querySelectorAll("[data-grammar-tab]").forEach((el) =>
    el.addEventListener("click", () => {
      state.grammarTab = el.getAttribute("data-grammar-tab");
      state.round = [];
      state.answered = false;
      state.feedback = "";
      markGrammarViewed(state.grammarTopicId);
      render();
    }),
  );
  document.querySelectorAll("[data-grammar-practice]").forEach((el) =>
    el.addEventListener("click", startGrammarPractice),
  );
  document.querySelectorAll("[data-next]").forEach((el) => el.addEventListener("click", nextCard));
  document.querySelectorAll("[data-restart]").forEach((el) =>
    el.addEventListener("click", () => startGame(state.game)),
  );
  document.querySelectorAll("[data-speak]").forEach((el) =>
    el.addEventListener("click", () => speak(el.getAttribute("data-speak"))),
  );
  document.querySelectorAll("[data-reveal]").forEach((el) =>
    el.addEventListener("click", () => {
      state.flashShow = true;
      render();
    }),
  );
  document.querySelectorAll("[data-flash-tap]").forEach((el) =>
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-speak]")) return;
      if (!state.flashShow) {
        state.flashShow = true;
        render();
      }
    }),
  );
  document.querySelectorAll("[data-flash-ok]").forEach((el) =>
    el.addEventListener("click", () => {
      state.score += 1;
      markCorrect(current());
      nextCard();
    }),
  );
  document.querySelectorAll("[data-flash-bad]").forEach((el) =>
    el.addEventListener("click", () => {
      addWrong(current());
      saveToNotebook(current());
      nextCard();
    }),
  );
  document.querySelectorAll("[data-add-notebook]").forEach((el) =>
    el.addEventListener("click", () => {
      saveToNotebook(current(), { force: true });
      state.feedback = "已加入生词本";
      state.feedbackOk = true;
      render();
      setTimeout(() => {
        state.feedback = "";
        if (state.game === "flash") render();
      }, 700);
    }),
  );
  document.querySelectorAll("[data-remove-notebook]").forEach((el) =>
    el.addEventListener("click", () => {
      removeFromNotebook(el.getAttribute("data-remove-notebook"));
      render();
    }),
  );
  document.querySelectorAll("[data-clear-notebook]").forEach((el) =>
    el.addEventListener("click", () => {
      if (!confirm("确定清空生词本吗？")) return;
      saveNotebook([]);
      render();
    }),
  );
  document.querySelectorAll("[data-quiz]").forEach((el) =>
    el.addEventListener("click", () => {
      if (state.answered) return;
      answerQuiz(el.getAttribute("data-quiz"), state.quizCorrect);
    }),
  );
  document.querySelectorAll("[data-grammar]").forEach((el) =>
    el.addEventListener("click", () => checkGrammar(el.getAttribute("data-grammar"))),
  );
  document.querySelectorAll("[data-match]").forEach((el) =>
    el.addEventListener("click", () => {
      try {
        onMatchTap(JSON.parse(el.getAttribute("data-match")));
      } catch (_) {}
    }),
  );
  document.querySelectorAll("[data-check-spell]").forEach((el) =>
    el.addEventListener("click", () => {
      const input = $("#spellInput");
      state.spellInput = input ? input.value : state.spellInput;
      checkSpell();
    }),
  );
  const spell = $("#spellInput");
  if (spell) {
    spell.addEventListener("input", (e) => {
      state.spellInput = e.target.value;
    });
    spell.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.spellInput = spell.value;
        checkSpell();
      }
    });
    if (!state.answered) spell.focus();
  }
  document.querySelectorAll("[data-cloze-text]").forEach((el) =>
    el.addEventListener("click", () => {
      state.clozeTextId = el.getAttribute("data-cloze-text");
      state.clozeAnswers = [];
      state.answered = false;
      state.feedback = "";
      render();
    }),
  );
  document.querySelectorAll("[data-cloze]").forEach((el) =>
    el.addEventListener("input", (e) => {
      const i = Number(el.getAttribute("data-cloze"));
      state.clozeAnswers[i] = e.target.value;
    }),
  );
  document.querySelectorAll("[data-check-cloze]").forEach((el) =>
    el.addEventListener("click", checkCloze),
  );
  document.querySelectorAll("[data-retry-cloze]").forEach((el) =>
    el.addEventListener("click", () => {
      state.answered = false;
      state.feedback = "";
      state.clozeAnswers = [];
      render();
    }),
  );
  document.querySelectorAll("[data-order]").forEach((el) =>
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-order");
      const seq = current();
      const item = state.orderPool.find((x) => x.id === id);
      if (!item) return;
      state.orderPicked.push(item);
      state.orderPool = state.orderPool.filter((x) => x.id !== id);
      render();
    }),
  );
  document.querySelectorAll("[data-order-undo]").forEach((el) =>
    el.addEventListener("click", () => {
      const last = state.orderPicked.pop();
      if (last) state.orderPool.push(last);
      render();
    }),
  );
  document.querySelectorAll("[data-check-order]").forEach((el) =>
    el.addEventListener("click", checkOrder),
  );
  document.querySelectorAll("[data-build]").forEach((el) =>
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-build");
      const w = state.buildPool.find((x) => x.id === id);
      if (!w) return;
      state.buildPicked.push(w);
      state.buildPool = state.buildPool.filter((x) => x.id !== id);
      render();
    }),
  );
  document.querySelectorAll("[data-unbuild]").forEach((el) =>
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-unbuild");
      const w = state.buildPicked.find((x) => x.id === id);
      if (!w) return;
      state.buildPicked = state.buildPicked.filter((x) => x.id !== id);
      state.buildPool.push(w);
      render();
    }),
  );
  document.querySelectorAll("[data-check-build]").forEach((el) =>
    el.addEventListener("click", checkBuild),
  );
  document.querySelectorAll("[data-read]").forEach((el) =>
    el.addEventListener("click", () => {
      state.readTextId = el.getAttribute("data-read");
      markTextRead(state.readTextId);
      render();
    }),
  );
  document.querySelectorAll("[data-speak-all]").forEach((el) =>
    el.addEventListener("click", () => {
      const all = window.UNIT.dialogue.lines.map((l) => `${l.who}. ${l.text}`).join(" ");
      speak(all);
    }),
  );
}

function init() {
  state.stars = loadStars();
  state.wrongCount = loadWrongBook().length;
  state.progress = loadProgress();
  refreshNotebookStats();
  render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
