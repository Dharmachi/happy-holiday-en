const STAR_KEY = "hh-stars-v1";
const WRONG_KEY = "hh-wrong-v1";
const PROGRESS_KEY = "hh-progress-v1";
const ROUND = 12;
const MATCH_N = 8;
const AUTO_NEXT_OK = 700;
const AUTO_NEXT_BAD = 1200;

const GAMES = [
  { id: "shoot", title: "词块坠落", desc: "过关打词：词·短语·句子", cat: "闯关" },
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
  { id: "review", title: "错题本", desc: "专攻错过的题", cat: "复习" },
];

let autoNextTimer = null;
let speakAudio = null;
let shootRaf = null;

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
}

function markCorrect(item, key) {
  const k = key || (item ? itemKey(item) : null);
  if (!k) return;
  let list = loadWrongBook();
  const i = list.findIndex((x) => x.key === k);
  if (i < 0) return;
  if (state.game === "review") {
    list.splice(i, 1);
  } else {
    list[i].wrongCount = Math.max(0, (list[i].wrongCount || 1) - 1);
    if (list[i].wrongCount <= 0) list.splice(i, 1);
  }
  saveWrongBook(list);
  state.wrongCount = list.length;
}

function earnStars(n) {
  state.stars += n;
  saveStars(state.stars);
}

function goHome() {
  clearTimeout(autoNextTimer);
  stopShootLoop();
  stopSpeak();
  state.view = "home";
  state.game = null;
  state.feedback = "";
  state.shoot = null;
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
    speed: 38,
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
  s.speed = 34 + Math.floor(s.cleared / 3) * 8;
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
  if (state.game === "quiz" || state.game === "review") prepareQuizCard(current());
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
    markCorrect(item, item.reviewKey);
  } else {
    state.feedback = `正确答案：${correct}`;
    addWrong(item, { answer: correct, prompt: item.zh || item.prompt });
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
  answerQuiz(choice, item.answer);
}

function checkBuild() {
  if (state.answered) return;
  const item = current();
  const got = state.buildPicked.map((x) => x.w).join(" ");
  const ok = norm(got) === norm(item.words.join(" "));
  state.answered = true;
  state.feedbackOk = ok;
  if (ok) {
    state.score += 1;
    state.feedback = "句子正确！";
  } else {
    state.feedback = `正确句子：${item.en}`;
    addWrong({ en: item.en, zh: item.zh, kind: "sentence" }, { key: `sentence:${item.id}`, answer: item.en });
  }
  render();
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
    else addWrong({ en: b.answer, zh: b.hint || text.title, kind: "cloze" }, { key: `cloze:${text.id}:${i}` });
  });
  state.answered = true;
  state.feedbackOk = okCount === text.blanks.length;
  state.score += okCount;
  state.feedback =
    okCount === text.blanks.length
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
  const cats = ["闯关", "单词", "表达", "语法", "课文", "复习"];
  const played = Object.keys(state.progress).length;
  return `
    <header class="hero">
      <p class="eyebrow">${esc(u.title)} · 初二英语</p>
      <h1>${esc(u.theme)}</h1>
      <p class="tagline">${esc(u.themeZh)} · 同一批材料，多种游戏练透</p>
      <div class="hero-meta">
        <span class="stat">★ ${state.stars}</span>
        <span class="stat">已练 ${played} 种游戏</span>
        <span class="stat">错题 ${state.wrongCount}</span>
      </div>
    </header>

    <section class="card soft">
      <h2>本单元目标</h2>
      <p class="muted">大问题：${esc(u.bigQuestionZh)}</p>
      <ul class="goal-list">
        ${u.goals.map((g) => `<li>${esc(g.zh)}</li>`).join("")}
      </ul>
    </section>

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
      <button class="choice" data-flash-bad>再练 · 下一张</button>
    </div>
  `;
}

function renderQuiz() {
  const item = current();
  const prompt = state.quizPrompt;
  const correct = state.quizCorrect;
  const options = state.quizOptions || [];
  return `
    ${toolbar(`互译 ${state.index + 1}/${state.round.length}`)}
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

function renderReview() {
  return renderQuiz();
}

function renderResult() {
  const g = GAMES.find((x) => x.id === state.game);
  return `
    <div class="card center result">
      <p class="eyebrow">本轮结束</p>
      <h1>${esc(g ? g.title : "练习")}</h1>
      ${state.feedback ? `<p class="tip ${state.feedbackOk ? "ok" : "bad"}">${esc(state.feedback)}</p>` : ""}
      <p class="zh-line">得分 ${state.score}</p>
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
    case "shoot":
      return renderShoot();
    case "flash":
      return renderFlash();
    case "quiz":
    case "review":
      return renderQuiz();
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
  document.querySelectorAll("[data-shoot]").forEach((el) =>
    el.addEventListener("click", () => answerShoot(el.getAttribute("data-shoot"))),
  );
  document.querySelectorAll("[data-grammar-topic]").forEach((el) =>
    el.addEventListener("click", () => {
      state.grammarTopicId = el.getAttribute("data-grammar-topic");
      state.grammarTab = "rules";
      state.round = [];
      state.answered = false;
      render();
    }),
  );
  document.querySelectorAll("[data-grammar-tab]").forEach((el) =>
    el.addEventListener("click", () => {
      state.grammarTab = el.getAttribute("data-grammar-tab");
      state.round = [];
      state.answered = false;
      state.feedback = "";
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
      nextCard();
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
  render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
