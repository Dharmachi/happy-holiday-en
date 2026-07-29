/* 德语专项训练 · 引擎（三格四格 / 身体部位 / 可分动词） */
(function () {
  "use strict";

  const D = window.DEUTSCH_DRILL;
  const app = document.getElementById("app");

  const STORE_KEY = "deutsch-drill-v1";
  const ROUND = 12;

  /* 记忆曲线：box 0..5 对应下次复习的间隔 */
  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const SRS = [10 * MIN, 30 * MIN, 2 * HOUR, 8 * HOUR, 1 * DAY, 3 * DAY];
  const MASTER_BOX = 3;

  /* 答完停留多久自动跳下一题。答错要留时间看解析，所以久一些。 */
  const AUTO_OK = 950;
  const AUTO_BAD = 3200;

  /* =========================================================
   *  存档
   * ========================================================= */
  const Store = (function () {
    let data = null;

    function blank() {
      return { v: 1, items: {}, history: {}, updatedAt: Date.now() };
    }

    function load() {
      if (data) return data;
      try {
        const raw = localStorage.getItem(STORE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === "object" && parsed.items) {
          data = Object.assign(blank(), parsed);
          return data;
        }
      } catch (_) { /* 存档坏了就重来，不影响做题 */ }
      data = blank();
      return data;
    }

    function save() {
      if (!data) return;
      data.updatedAt = Date.now();
      try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
      catch (e) { console.warn("保存失败（可能是隐私模式或空间不足）", e); }
    }

    function rec(key) {
      const d = load();
      if (!d.items[key]) d.items[key] = { seen: 0, ok: 0, fail: 0, box: 0, due: 0, lastAt: 0 };
      return d.items[key];
    }

    function todayKey(t) {
      const dt = t ? new Date(t) : new Date();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      return `${dt.getFullYear()}-${m}-${day}`;
    }

    function answer(key, ok) {
      const d = load();
      const r = rec(key);
      r.seen += 1;
      r.lastAt = Date.now();
      if (ok) {
        r.ok += 1;
        r.box = Math.min(r.box + 1, SRS.length - 1);
      } else {
        r.fail += 1;
        r.box = 0;
      }
      r.due = Date.now() + SRS[r.box];

      const k = todayKey();
      if (!d.history[k]) d.history[k] = { answered: 0, correct: 0 };
      d.history[k].answered += 1;
      if (ok) d.history[k].correct += 1;
      save();
    }

    function reset() { data = blank(); save(); }
    function replace(next) { data = Object.assign(blank(), next); save(); }

    return { load, save, rec, answer, reset, replace, todayKey };
  })();

  /* =========================================================
   *  小工具
   * ========================================================= */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }
  function pick(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }
  function sample(arr, n) { return pick(arr, n); }
  function norm(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }
  /** 句首字母大写：词块本身按小写存，排好序再补大写 */
  function cap(s) { return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1); }

  /** 把 ___ 换成高亮的空格 */
  function blanks(text) {
    return esc(text).replace(/_{2,}/g, '<span class="blank">___</span>');
  }

  let voices = [];
  function loadVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch (_) { voices = []; } }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  function speak(text) {
    if (!window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/…/g, " ").replace(/_/g, " "));
      u.lang = "de-DE";
      u.rate = 0.9;
      const de = voices.find((v) => /^de/i.test(v.lang));
      if (de) u.voice = de;
      window.speechSynthesis.speak(u);
    } catch (_) { /* 不支持朗读就算了 */ }
  }

  /* =========================================================
   *  题库：所有题目都归一成 { key, q, zh, a, o, why, speak }
   * ========================================================= */

  /** 带索引的原始习题，key 用「类型 + 序号」保证稳定 */
  function itemsFrom(list, prefix, tags) {
    return list
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => !tags || tags.indexOf(it.tag) >= 0)
      .map(({ it, i }) => ({
        key: `${prefix}${i}`,
        q: it.q,
        zh: it.zh,
        a: it.a,
        o: it.o,
        why: it.why,
        tag: it.tag,
        speak: it.q.indexOf("___") >= 0 ? it.q.replace(/___/g, it.a) : null,
      }));
  }

  const BODY_ARTS = ["der", "die", "das"];

  /** 身体部位：选冠词 */
  function genBodyArt() {
    return D.body.map((w) => ({
      key: `ba:${w.de}`,
      q: `___ ${w.de}`,
      zh: w.zh,
      a: w.art,
      o: BODY_ARTS,
      why: `${w.art} ${w.de} — ${w.zh}${w.note ? " · " + w.note : ""}`,
      speak: `${w.art} ${w.de}`,
    }));
  }

  /** 身体部位：看中文写德语（含冠词） */
  function genBodyWord() {
    return D.body.map((w) => {
      const right = `${w.art} ${w.de}`;
      const wrong = sample(D.body.filter((x) => x.de !== w.de), 3).map((x) => `${x.art} ${x.de}`);
      return {
        key: `bw:${w.de}`,
        q: w.zh,
        zh: "选出对应的德语（注意冠词）",
        a: right,
        o: [right].concat(wrong),
        why: `${right} — ${w.zh}`,
        speak: right,
      };
    });
  }

  /** 身体部位：复数形式 */
  function genBodyPlural() {
    return D.body.filter((w) => w.pl && w.pl !== "—").map((w) => {
      const wrong = sample(D.body.filter((x) => x.de !== w.de && x.pl !== "—"), 3).map((x) => x.pl);
      return {
        key: `bp:${w.de}`,
        q: `${w.art} ${w.de} → 复数是？`,
        zh: w.zh,
        a: w.pl,
        o: [w.pl].concat(wrong),
        why: `${w.art} ${w.de} → ${w.pl}${w.note ? " · " + w.note : ""}`,
        speak: w.pl,
      };
    });
  }

  /** 可分动词：判断分不分 */
  function genSepJudge() {
    return D.sepVerben.map((v) => ({
      key: `sj:${v.inf}`,
      q: `${v.inf} 分不分？`,
      zh: v.zh,
      a: v.sep ? "可分" : "不可分",
      o: ["可分", "不可分"],
      why: v.sep
        ? `${v.pre}- 是可分前缀，重音在前缀 → ${v.ex}`
        : `${v.pre}- 是不可分前缀，重音在词干，整个动词不拆 → ${v.ex}`,
      speak: v.inf,
    }));
  }

  /** 可分动词：例句里前缀跑到了哪 */
  function genSepTail() {
    const tail = /\s([a-zäöüß]+)([.!?])$/i;
    return D.sepVerben.filter((v) => {
      const m = v.ex.match(tail);
      return v.sep && m && m[1].toLowerCase() === v.pre.toLowerCase();
    }).map((v) => {
      const wrong = sample(D.prefixTrenn.filter((p) => p !== v.pre), 3);
      return {
        key: `st:${v.inf}`,
        q: v.ex.replace(tail, " ___$2"),
        zh: `${v.exZh}（${v.inf}）`,
        a: v.pre,
        o: [v.pre].concat(wrong),
        why: `${v.inf} 可分 → 变位的 ${v.stem} 在第二位，前缀 ${v.pre} 甩到句末`,
        speak: v.ex,
      };
    });
  }

  /** 可分动词：中德互译 */
  function genSepWord() {
    return D.sepVerben.map((v) => {
      const wrong = sample(D.sepVerben.filter((x) => x.inf !== v.inf), 3).map((x) => x.inf);
      return {
        key: `sw:${v.inf}`,
        q: v.zh,
        zh: "选出对应的动词原形",
        a: v.inf,
        o: [v.inf].concat(wrong),
        why: `${v.inf} — ${v.zh} · ${v.ex}`,
        speak: v.inf,
      };
    });
  }

  /** 身体部位：看中文把德语拼出来（含冠词） */
  function genBodySpell() {
    return D.body.map((w) => ({
      key: `bs:${w.de}`,
      type: "spell",
      q: w.zh,
      zh: "拼出德语，要带冠词",
      a: `${w.art} ${w.de}`,
      why: `${w.art} ${w.de} · 复数 ${w.pl}${w.note ? " · " + w.note : ""}`,
      speak: `${w.art} ${w.de}`,
    }));
  }

  /** 可分动词：看中文拼原形 */
  function genSepSpell() {
    return D.sepVerben.map((v) => ({
      key: `ss:${v.inf}`,
      type: "spell",
      q: v.zh,
      zh: "拼出动词原形",
      a: v.inf,
      why: `${v.inf} — ${v.sep ? "可分" : "不可分"} · ${v.ex}`,
      speak: v.inf,
    }));
  }

  /** 句子重组：点词排语序 */
  function genBuild(tags) {
    return D.buildSaetze
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !tags || tags.indexOf(s.tag) >= 0)
      .map(({ s, i }) => ({
        key: `bd:${i}`,
        type: "build",
        q: s.zh,
        zh: "点下面的词，排成正确的句子",
        a: cap(s.ok[0]) + s.end,
        ok: s.ok,
        end: s.end,
        words: s.ok[0].split(" "),
        why: s.why,
        tag: s.tag,
        speak: cap(s.ok[0]) + s.end,
      }));
  }

  /** 每个练习模式对应的题库 */
  const BANKS = {
    "c-verb": () => itemsFrom(D.caseItems, "c", ["verb"]),
    "c-pron": () => itemsFrom(D.caseItems, "c", ["pron"]),
    "c-prep": () => itemsFrom(D.caseItems, "c", ["prep-akk", "prep-dat"]),
    "c-wechsel": () => itemsFrom(D.caseItems, "c", ["wechsel"]),
    "c-dual": () => itemsFrom(D.caseItems, "c", ["dual"]),
    "c-mix": () => itemsFrom(D.caseItems, "c", null),

    "c-build": () => genBuild(["build-dual"]),

    "b-art": genBodyArt,
    "b-word": genBodyWord,
    "b-pl": genBodyPlural,
    "b-satz": () => itemsFrom(D.bodyItems, "b", null),
    "b-spell": genBodySpell,
    "b-build": () => genBuild(["build-body"]),

    "s-judge": () => genSepJudge().concat(itemsFrom(D.sepItems, "s", ["sep-judge"])),
    "s-tail": genSepTail,
    "s-split": () => itemsFrom(D.sepItems, "s", ["sep-split"]),
    "s-nosplit": () => itemsFrom(D.sepItems, "s", ["sep-nosplit"]),
    "s-word": genSepWord,
    "s-spell": genSepSpell,
    "s-build": () => genBuild(["build-sep", "build-nosplit"]),
  };

  /** 全部题目，用于到期复习 / 错题本 / 统计 */
  function allQuestions() {
    const out = [];
    Object.keys(BANKS).forEach((id) => {
      if (id === "c-mix") return; // 与其他四类重复
      BANKS[id]().forEach((q) => out.push(q));
    });
    const seen = new Set();
    return out.filter((q) => {
      if (seen.has(q.key)) return false;
      seen.add(q.key);
      return true;
    });
  }

  /* =========================================================
   *  模式清单
   * ========================================================= */
  const MODULES = [
    {
      id: "m1", no: "1", cls: "m1", title: "三格四格", de: "Dativ & Akkusativ",
      desc: "德语最核心的难点。先搞清动词和介词支配哪个格，冠词自然就出来了。",
      games: [
        { id: "c-rules", kind: "learn", title: "讲解", desc: "六步搞懂格 · 每条都有例句拆解" },
        { id: "c-table", kind: "learn", title: "变格表", desc: "冠词 · 代词 · 三格动词 · 介词" },
        { id: "c-verb", kind: "drill", title: "动词决定格", desc: "sehen 还是 helfen，四格还是三格" },
        { id: "c-pron", kind: "drill", title: "人称代词", desc: "mich 还是 mir" },
        { id: "c-prep", kind: "drill", title: "介词支配", desc: "für / mit 后面用什么格" },
        { id: "c-wechsel", kind: "hard", title: "双向介词", desc: "Wohin 四格，Wo 三格" },
        { id: "c-dual", kind: "hard", title: "双宾语", desc: "人三格，物四格" },
        { id: "c-build", kind: "hard", title: "句子重组", desc: "双宾语的先后顺序" },
        { id: "c-mix", kind: "hard", title: "综合练习", desc: "五类混着出，最接近考试" },
      ],
    },
    {
      id: "m2", no: "2", cls: "m2", title: "身体部位", de: "Körperteile",
      desc: "45 个身体名词，连带看病说法。这里正好是三格用得最多的地方：Mir tut der Kopf weh。",
      games: [
        { id: "b-rules", kind: "learn", title: "讲解", desc: "为什么「我头疼」要用三格" },
        { id: "b-list", kind: "learn", title: "词表", desc: "按部位分组 · 冠词和复数" },
        { id: "b-flash", kind: "drill", title: "闪卡", desc: "翻卡背冠词和复数" },
        { id: "b-art", kind: "drill", title: "der die das", desc: "只练冠词" },
        { id: "b-word", kind: "drill", title: "中译德", desc: "看中文选德语，含冠词" },
        { id: "b-pl", kind: "hard", title: "复数形式", desc: "Fuß → Füße 这类变音" },
        { id: "b-satz", kind: "hard", title: "疼痛句型", desc: "Mir tut … weh · 洗手用反身" },
        { id: "b-spell", kind: "hard", title: "拼写", desc: "看中文默写，冠词也要写对" },
        { id: "b-build", kind: "hard", title: "句子重组", desc: "疼痛句和反身句的语序" },
      ],
    },
    {
      id: "m3", no: "3", cls: "m3", title: "可分动词", de: "Trennbare Verben",
      desc: "前缀会跑到句末，但有三种情况不拆。先学会听重音判断可分不可分。",
      games: [
        { id: "s-rules", kind: "learn", title: "讲解", desc: "怎么判断 · 跑到哪 · 什么时候不拆" },
        { id: "s-table", kind: "learn", title: "动词表", desc: "前缀两大类 · 40 个动词" },
        { id: "s-judge", kind: "drill", title: "分不分", desc: "看前缀判断可分 / 不可分" },
        { id: "s-word", kind: "drill", title: "中译德", desc: "看中文选动词原形" },
        { id: "s-tail", kind: "drill", title: "前缀归位", desc: "句末该填哪个前缀" },
        { id: "s-spell", kind: "drill", title: "拼写", desc: "看中文默写动词原形" },
        { id: "s-split", kind: "hard", title: "拆开填空", desc: "变位部分 + 前缀怎么摆" },
        { id: "s-nosplit", kind: "hard", title: "什么时候不拆", desc: "情态动词 · 从句 · zu 不定式" },
        { id: "s-build", kind: "hard", title: "句子重组", desc: "拆与不拆，语序一次练透" },
      ],
    },
  ];

  const COMMON = [
    { id: "due", kind: "drill", title: "到期复习", desc: "按记忆曲线，先练该复习的" },
    { id: "review", kind: "hard", title: "错题本", desc: "专攻答错过又还没掌握的" },
    { id: "stats", kind: "learn", title: "学习记录", desc: "掌握率 · 弱项 · 每日趋势" },
    { id: "backup", kind: "learn", title: "备份与转移", desc: "导出／导入，换设备不丢记录" },
  ];

  function gameDef(id) {
    for (const m of MODULES) {
      const g = m.games.find((x) => x.id === id);
      if (g) return Object.assign({}, g, { mod: m });
    }
    const c = COMMON.find((x) => x.id === id);
    return c ? Object.assign({}, c, { mod: null }) : null;
  }

  /* =========================================================
   *  状态
   * ========================================================= */
  let view = "home";
  let state = {};
  let autoTimer = null;
  let lastScrollKey = null;

  function clearAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }

  function go(v) {
    clearAuto();
    view = v;
    render();
  }

  function dueCount() {
    const now = Date.now();
    const d = Store.load();
    return allQuestions().filter((q) => {
      const r = d.items[q.key];
      return r && r.due && r.due <= now && r.box < MASTER_BOX;
    }).length;
  }

  function wrongList() {
    const d = Store.load();
    return allQuestions().filter((q) => {
      const r = d.items[q.key];
      return r && r.fail > 0 && r.box < MASTER_BOX;
    });
  }

  /* =========================================================
   *  练习
   * ========================================================= */
  function startQuiz(gameId) {
    let bank;
    if (gameId === "due") {
      const now = Date.now();
      const d = Store.load();
      bank = allQuestions()
        .filter((q) => {
          const r = d.items[q.key];
          return r && r.due && r.due <= now && r.box < MASTER_BOX;
        })
        .sort((a, b) => (d.items[a.key].due || 0) - (d.items[b.key].due || 0));
    } else if (gameId === "review") {
      bank = wrongList();
    } else {
      bank = (BANKS[gameId] || (() => []))();
    }

    if (!bank.length) {
      state = { gameId, empty: true };
      go("quiz");
      return;
    }

    /* 没做过的和错过的优先，其余打乱 */
    const d = Store.load();
    const weight = (q) => {
      const r = d.items[q.key];
      if (!r || !r.seen) return 0;
      if (r.fail > r.ok) return 1;
      if (r.box < MASTER_BOX) return 2;
      return 3;
    };
    const ordered = gameId === "due"
      ? bank
      : shuffle(bank).sort((a, b) => weight(a) - weight(b));

    state = {
      gameId,
      round: ordered.slice(0, ROUND).map(prepare),
      i: 0,
      score: 0,
      answered: false,
      chosen: null,
      done: false,
      spellVal: "",
      picked: [],
    };
    go("quiz");
  }

  /** 每题进牌组前的准备：选项打乱，重组题额外发一副词块 */
  function prepare(q) {
    const copy = Object.assign({}, q);
    if (copy.o) copy.o = shuffle(copy.o);
    if (copy.type === "build") {
      copy.pool = shuffle(copy.words.map((w, i) => ({ w, id: i })));
    }
    return copy;
  }

  function current() { return state.round ? state.round[state.i] : null; }

  function answerQuiz(value, forcedOk) {
    if (state.answered) return;
    const q = current();
    if (!q) return;
    const ok = typeof forcedOk === "boolean" ? forcedOk : norm(value) === norm(q.a);
    state.answered = true;
    state.chosen = value;
    state.lastOk = ok;
    if (ok) state.score += 1;
    Store.answer(q.key, ok);
    render();

    clearAuto();
    autoTimer = setTimeout(() => {
      autoTimer = null;
      nextQ();
    }, ok ? AUTO_OK : AUTO_BAD);
  }

  function nextQ() {
    if (state.i + 1 >= state.round.length) {
      state.done = true;
      render();
      return;
    }
    state.i += 1;
    state.answered = false;
    state.chosen = null;
    state.spellVal = "";
    state.picked = [];
    render();
  }

  /* =========================================================
   *  首页
   * ========================================================= */
  function overall() {
    const all = allQuestions();
    const d = Store.load();
    let seen = 0, mastered = 0;
    all.forEach((q) => {
      const r = d.items[q.key];
      if (r && r.seen) seen += 1;
      if (r && r.box >= MASTER_BOX) mastered += 1;
    });
    return { total: all.length, seen, mastered };
  }

  function gameBtn(g, badge) {
    return `
      <button class="game-btn" data-go="${g.id}">
        ${badge ? `<span class="badge">${badge}</span>` : ""}
        <span class="kind ${g.kind}">${g.kind === "learn" ? "看懂" : g.kind === "drill" ? "练熟" : "挑战"}</span>
        <strong>${esc(g.title)}</strong>
        <span>${esc(g.desc)}</span>
      </button>`;
  }

  function viewHome() {
    const o = overall();
    const due = dueCount();
    const wrong = wrongList().length;
    const pctSeen = o.total ? Math.round((o.seen / o.total) * 100) : 0;
    const pctMaster = o.total ? Math.round((o.mastered / o.total) * 100) : 0;

    return `
      <div class="hero">
        <p class="eyebrow">
          <span class="flag"><i class="b"></i><i class="r"></i><i class="g"></i></span>
          DEUTSCH · GRAMMATIK
        </p>
        <h1>德语专项训练</h1>
        <p class="tagline">三格四格 · 身体部位 · 可分动词。每个模块都是先看讲解，再一类一类练熟，最后混着考。</p>
        <div class="hero-meta">
          <span class="stat">练过 ${o.seen} / ${o.total}</span>
          <span class="stat gold">已掌握 ${o.mastered}</span>
          ${due ? `<span class="stat warn">${due} 题该复习了</span>` : ""}
        </div>
      </div>

      <div class="card soft">
        <div class="prog-row">
          <div class="prog-label"><span>接触过</span><span>${pctSeen}%</span></div>
          <div class="prog-track"><i class="prog-fill learn" style="width:${pctSeen}%"></i></div>
        </div>
        <div class="prog-row">
          <div class="prog-label"><span>已掌握（记忆曲线到第 ${MASTER_BOX} 格）</span><span>${pctMaster}%</span></div>
          <div class="prog-track"><i class="prog-fill master" style="width:${pctMaster}%"></i></div>
        </div>
      </div>

      ${MODULES.map((m) => `
        <section class="mod ${m.cls}">
          <div class="mod-head">
            <span class="mod-no">${m.no}</span>
            <h2 style="margin:0">${esc(m.title)}</h2>
            <span class="mod-de">${esc(m.de)}</span>
          </div>
          <p class="muted">${esc(m.desc)}</p>
          <div class="games">${m.games.map((g) => gameBtn(g)).join("")}</div>
        </section>
      `).join("")}

      <h2 class="section-title">复习与记录</h2>
      <div class="games">
        ${COMMON.map((g) =>
          gameBtn(g, g.id === "due" ? (due || 0) : g.id === "review" ? (wrong || 0) : 0)
        ).join("")}
      </div>

      <div class="center" style="margin-top:18px">
        <a class="backlink" href="./perfekt.html">→ Perfekt 现在完成时训练</a>
      </div>
      <div class="center" style="margin-top:8px">
        <a class="backlink" href="./index.html">← 回英语训练场</a>
      </div>
    `;
  }

  /* =========================================================
   *  讲解页
   * ========================================================= */
  function ruleCard(r) {
    return `
      <div class="card rule-card">
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.intro)}</p>
        <ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        ${r.examples.map((ex) => `
          <div class="example">
            <p class="ex-de">${markUp(ex.de, ex.mark)}
              <button class="speak" data-speak="${esc(ex.de)}">🔊</button>
            </p>
            <p class="ex-zh">${esc(ex.zh)}</p>
            <div class="chain">
              ${ex.chain.map((c, i) => `${i ? '<span class="arrow">→</span>' : ""}<i>${esc(c)}</i>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>`;
  }

  /**
   * 把例句里要强调的片段加上底色。
   * mark 可以是一段文字，也可以是一组（可分动词要同时高亮变位部分和句末前缀）。
   */
  function markUp(de, mark) {
    const safe = esc(de);
    if (!mark) return safe;
    const parts = (Array.isArray(mark) ? mark : [mark]).map(esc).filter(Boolean);

    /* 先找出每段的位置，再从后往前插标签，避免下标错位 */
    const hits = [];
    let from = 0;
    parts.forEach((m) => {
      const at = safe.indexOf(m, from);
      if (at < 0) return;
      hits.push({ at, len: m.length });
      from = at + m.length;
    });

    let out = safe;
    hits.reverse().forEach((h) => {
      out = out.slice(0, h.at) + "<mark>" + out.slice(h.at, h.at + h.len) + "</mark>" + out.slice(h.at + h.len);
    });
    return out;
  }

  function viewRules(which) {
    const map = { "c-rules": D.caseRules, "b-rules": D.bodyRules, "s-rules": D.sepRules };
    const titles = { "c-rules": "三格四格 · 讲解", "b-rules": "身体部位 · 讲解", "s-rules": "可分动词 · 讲解" };
    const nexts = { "c-rules": "c-verb", "b-rules": "b-art", "s-rules": "s-judge" };
    const list = map[which] || [];
    return `
      <div class="toolbar">
        <button class="back" data-go="home">← 返回</button>
        <span class="chip">${esc(titles[which])}</span>
      </div>
      ${list.map(ruleCard).join("")}
      <button class="primary" data-go="${nexts[which]}">看完了，去练一练</button>
    `;
  }

  /* =========================================================
   *  表格页
   * ========================================================= */
  function viewCaseTable() {
    const tab = state.tab || "artikel";
    const A = D.artikel;
    let body = "";

    if (tab === "artikel") {
      body = `
        <p class="muted" style="font-size:.9rem">每格三个形式：<b>定冠词 / 不定冠词 / 物主代词</b>。</p>
        <div class="table-wrap">
          <table class="vt">
            <thead><tr><th>性别</th><th>一格 Nom.</th><th>四格 Akk.</th><th>三格 Dat.</th></tr></thead>
            <tbody>
              ${A.rows.map((r) => `
                <tr>
                  <td class="lb">${esc(r.label)}</td>
                  <td>${esc(r.nom)}</td>
                  <td${r.label.indexOf("阳") >= 0 ? ' class="hl"' : ""}>${esc(r.akk)}</td>
                  <td class="hl">${esc(r.dat)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="tip">${esc(A.note)}</div>`;
    } else if (tab === "pron") {
      body = `
        <div class="table-wrap">
          <table class="vt">
            <thead><tr><th>中文</th><th>一格</th><th>四格</th><th>三格</th></tr></thead>
            <tbody>
              ${D.pronomen.map((p) => `
                <tr>
                  <td class="lb">${esc(p.zh)}</td>
                  <td>${esc(p.nom)}</td>
                  <td>${esc(p.akk)}</td>
                  <td class="hl">${esc(p.dat)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="tip">uns 和 euch 的三格四格同形，是唯一不用纠结的两个。</div>`;
    } else if (tab === "datverb") {
      body = `
        <p class="muted" style="font-size:.9rem">这批动词后面跟<b>三格</b>，跟中文语感对不上，必须背。</p>
        <div class="table-wrap">
          <table class="vt">
            <thead><tr><th>动词</th><th>意思</th><th>例句</th></tr></thead>
            <tbody>
              ${D.datVerben.map((v) => `
                <tr>
                  <td class="lb">${esc(v.de)}</td>
                  <td>${esc(v.zh)}</td>
                  <td>${esc(v.ex)}<br><span class="muted" style="font-size:.84rem">${esc(v.exZh)}</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <h3 style="margin-top:16px">双宾语动词（人三格 + 物四格）</h3>
        <div class="chain">${D.dualVerben.map((v) => `<i>${esc(v.de)} ${esc(v.zh)}</i>`).join("")}</div>
        <h3 style="margin-top:16px">支配四格的常见动词</h3>
        <div class="chain">${D.akkVerben.map((v) => `<i>${esc(v.de)} ${esc(v.zh)}</i>`).join("")}</div>`;
    } else {
      body = `
        <h3>只用四格</h3>
        <div class="chain">${D.prepAkk.map((p) => `<i>${esc(p.de)} ${esc(p.zh)}</i>`).join("")}</div>
        <h3 style="margin-top:16px">只用三格</h3>
        <div class="chain">${D.prepDat.map((p) => `<i>${esc(p.de)} ${esc(p.zh)}</i>`).join("")}</div>
        <h3 style="margin-top:16px">双向介词（Wohin 四格 / Wo 三格）</h3>
        <div class="chain">${D.prepWechsel.map((p) => `<i>${esc(p.de)} ${esc(p.zh)}</i>`).join("")}</div>
        <div class="tip">双向介词是考试重点：有位置改变用四格，静止不动用三格。同一句换个格意思就变了。</div>`;
    }

    const tabs = [
      ["artikel", "冠词变格"], ["pron", "人称代词"], ["datverb", "动词"], ["prep", "介词"],
    ];
    return `
      <div class="toolbar">
        <button class="back" data-go="home">← 返回</button>
        <span class="chip">三格四格 · 变格表</span>
      </div>
      <div class="tabs">
        ${tabs.map(([id, lb]) => `<button class="tab ${tab === id ? "on" : ""}" data-tab="${id}">${lb}</button>`).join("")}
      </div>
      <div class="card">${body}</div>
      <button class="primary" data-go="c-verb">去练一练</button>
    `;
  }

  function artClass(art) {
    return art === "der" ? "m" : art === "die" ? "f" : "n";
  }

  function viewBodyList() {
    const grp = state.tab || "head";
    const d = Store.load();
    const list = D.body.filter((w) => w.grp === grp);
    const dotFor = (key) => {
      const r = d.items[key];
      if (!r || !r.seen) return "";
      const cls = r.box >= MASTER_BOX ? "ok" : r.fail > r.ok ? "bad" : "mid";
      return `<span class="dot ${cls}"></span>`;
    };
    return `
      <div class="toolbar">
        <button class="back" data-go="home">← 返回</button>
        <span class="chip">身体部位 · 词表</span>
        <span class="chip plain">${D.body.length} 个</span>
      </div>
      <div class="tabs">
        ${D.bodyGroups.map((g) => `<button class="tab ${grp === g.id ? "on" : ""}" data-tab="${g.id}">${esc(g.label)}</button>`).join("")}
        <button class="tab ${grp === "extra" ? "on" : ""}" data-tab="extra">看病用词</button>
      </div>
      ${grp === "extra" ? `
        <div class="card">
          <div class="wordlist">
            ${D.bodyExtra.map((w) => `
              <div class="word-row">
                <div>
                  <div class="word-de">${esc(w.de)}</div>
                  <div class="word-zh">${esc(w.zh)}</div>
                  ${w.note ? `<div class="word-pl">${esc(w.note)}</div>` : ""}
                </div>
                <button class="speak" data-speak="${esc(w.de)}">🔊</button>
              </div>`).join("")}
          </div>
        </div>
      ` : `
        <div class="card">
          <div class="wordlist">
            ${list.map((w) => `
              <div class="word-row">
                <div>
                  <div class="word-de">${dotFor(`ba:${w.de}`)}<span class="art">${esc(w.art)}</span> ${esc(w.de)}</div>
                  <div class="word-zh">${esc(w.zh)}</div>
                  <div class="word-pl">复数：${esc(w.pl)}</div>
                  ${w.note ? `<div class="word-pl">${esc(w.note)}</div>` : ""}
                </div>
                <button class="speak" data-speak="${esc(w.art + " " + w.de)}">🔊</button>
              </div>`).join("")}
          </div>
        </div>
      `}
      <button class="primary" data-go="b-art">去练冠词</button>
    `;
  }

  function viewSepTable() {
    const tab = state.tab || "prefix";
    let body;
    if (tab === "prefix") {
      body = `
        <h3>可分前缀（重音在前缀，现在时跑到句末）</h3>
        <div class="chain">${D.prefixTrenn.map((p) => `<i>${esc(p)}-</i>`).join("")}</div>
        <h3 style="margin-top:16px">不可分前缀（重音在词干，永远不拆）</h3>
        <div class="chain">${D.prefixUntrenn.map((p) => `<i>${esc(p)}-</i>`).join("")}</div>
        <div class="tip">把不可分的这八个背下来就行：<b>be- ge- er- ver- ent- emp- miss- zer-</b>。剩下的前缀基本都可分。</div>`;
    } else {
      const sep = D.sepVerben.filter((v) => v.sep);
      const un = D.sepVerben.filter((v) => !v.sep);
      const rows = (list) => `
        <div class="table-wrap">
          <table class="vt">
            <thead><tr><th>原形</th><th>意思</th><th>例句（第三人称）</th></tr></thead>
            <tbody>
              ${list.map((v) => `
                <tr>
                  <td class="lb">${esc(v.inf)}</td>
                  <td>${esc(v.zh)}</td>
                  <td>${esc(v.ex)}<br><span class="muted" style="font-size:.84rem">${esc(v.exZh)}</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
      body = `<h3>可分 ${sep.length} 个</h3>${rows(sep)}
              <h3 style="margin-top:18px">不可分 ${un.length} 个（对照用）</h3>${rows(un)}`;
    }
    return `
      <div class="toolbar">
        <button class="back" data-go="home">← 返回</button>
        <span class="chip">可分动词 · 动词表</span>
      </div>
      <div class="tabs">
        <button class="tab ${tab === "prefix" ? "on" : ""}" data-tab="prefix">前缀两大类</button>
        <button class="tab ${tab === "verbs" ? "on" : ""}" data-tab="verbs">动词表</button>
      </div>
      <div class="card">${body}</div>
      <button class="primary" data-go="s-judge">去练判断</button>
    `;
  }

  /* =========================================================
   *  身体部位闪卡
   * ========================================================= */
  function startFlash() {
    state = { gameId: "b-flash", round: pick(D.body, ROUND), i: 0, flipped: false, done: false };
    go("flash");
  }

  function viewFlash() {
    const w = state.round[state.i];
    if (!w) return "";
    const pct = Math.round((state.i / state.round.length) * 100);
    return `
      <div class="toolbar">
        <button class="back" data-go="home">← 返回</button>
        <span class="chip">身体闪卡 ${state.i + 1} / ${state.round.length}</span>
      </div>
      <div class="progress-top"><i style="width:${pct}%"></i></div>
      <div class="card flip-card" data-flip="1">
        ${state.flipped ? `
          <div class="big-de"><span style="color:var(--m1)">${esc(w.art)}</span> ${esc(w.de)}</div>
          <div class="big-zh">${esc(w.zh)}</div>
          <div class="muted">复数：${esc(w.pl)}</div>
          ${w.note ? `<div class="muted" style="font-size:.86rem">${esc(w.note)}</div>` : ""}
          <button class="speak" data-speak="${esc(w.art + " " + w.de)}">🔊 听</button>
        ` : `
          <div class="big-zh">${esc(w.zh)}</div>
          <div class="flip-hint">点一下看德语、冠词和复数</div>
        `}
      </div>
      ${state.flipped ? `
        <div class="choices two">
          <button class="choice" data-flash="1">记得 · 下一张</button>
          <button class="choice" data-flash="0">不会 · 下一张</button>
        </div>` : ""}
    `;
  }

  function flashNext(knew) {
    const w = state.round[state.i];
    if (w) Store.answer(`ba:${w.de}`, !!knew);
    if (state.i + 1 >= state.round.length) {
      state.done = true;
      state.gameId = "b-flash";
      state.score = 0;
      render();
      return;
    }
    state.i += 1;
    state.flipped = false;
    render();
  }

  /* =========================================================
   *  练习页
   * ========================================================= */
  function viewQuiz() {
    const g = gameDef(state.gameId) || { title: "练习" };

    if (state.empty) {
      const msg = state.gameId === "due"
        ? "现在没有到期该复习的题。先去各模块练几轮，之后再回来。"
        : state.gameId === "review"
          ? "错题本是空的。答错的题会自动收进来。"
          : "这一类暂时没有题目。";
      return `
        <div class="toolbar"><button class="back" data-go="home">← 返回</button></div>
        <div class="card center">
          <div class="done-face">🎯</div>
          <h2>${esc(g.title)}</h2>
          <p class="muted">${esc(msg)}</p>
          <button class="primary" data-go="home">回首页</button>
        </div>`;
    }

    if (state.done) {
      const n = state.round.length;
      const pct = n ? Math.round((state.score / n) * 100) : 0;
      const face = pct >= 90 ? "🏆" : pct >= 70 ? "👍" : pct >= 50 ? "💪" : "📖";
      return `
        <div class="toolbar"><button class="back" data-go="home">← 返回</button></div>
        <div class="card center">
          <div class="done-face">${face}</div>
          <h2>${state.score} / ${n} 正确</h2>
          <div class="stat-row">
            <span class="stat">正确率 ${pct}%</span>
            ${dueCount() ? `<span class="stat warn">还有 ${dueCount()} 题到期</span>` : ""}
          </div>
          <p class="muted">${pct >= 90 ? "这一类基本稳了，可以去挑战下一类。" : pct >= 50 ? "错的题已经进错题本，等会儿回来专攻。" : "先回去看一遍讲解，比硬练有用。"}</p>
          <button class="primary" data-again="${esc(state.gameId)}">再来一轮</button>
          <button class="back" style="width:100%;margin-top:8px" data-go="home">回首页</button>
        </div>`;
    }

    const q = current();
    const pct = Math.round((state.i / state.round.length) * 100);
    const ok = state.answered && state.lastOk;

    let bodyHtml;
    if (q.type === "spell") bodyHtml = quizSpell(q);
    else if (q.type === "build") bodyHtml = quizBuild(q);
    else bodyHtml = quizChoice(q);

    /* 答对了不用再念一遍答案，答错才提示正解 */
    return `
      <div class="toolbar">
        <button class="back" data-go="home">← 返回</button>
        <span class="chip">${esc(g.title)}</span>
        <span class="chip plain">${state.i + 1} / ${state.round.length}</span>
      </div>
      <div class="progress-top"><i style="width:${pct}%"></i></div>

      <div class="card">
        <div class="qline">${blanks(q.q)}</div>
        ${q.zh ? `<div class="qzh">${esc(q.zh)}</div>` : ""}
        ${q.speak && (state.answered || q.type === "choice" || !q.type)
          ? `<button class="speak" data-speak="${esc(q.speak)}">🔊 听整句</button>` : ""}

        ${bodyHtml}

        ${state.answered ? `
          <div class="tip ${ok ? "ok" : "bad"}">
            ${ok ? "✓ 对了" : `✗ 应该是 <b>${esc(q.a)}</b>`}
            <span class="why">${esc(q.why)}</span>
            <div class="countdown" style="--cd:${ok ? AUTO_OK : AUTO_BAD}ms"><i></i></div>
          </div>` : ""}
      </div>
    `;
  }

  function quizChoice(q) {
    const two = q.o.length <= 2 || q.o.every((x) => String(x).length <= 8);
    return `
      <div class="choices ${two ? "two" : ""}">
        ${q.o.map((opt) => {
          let cls = "";
          if (state.answered) {
            if (norm(opt) === norm(q.a)) cls = "ok";
            else if (opt === state.chosen) cls = "bad";
          }
          return `<button class="choice ${cls}" data-ans="${esc(opt)}" ${state.answered ? "disabled" : ""}>${esc(opt)}</button>`;
        }).join("")}
      </div>`;
  }

  /** 拼写题：手机上没有德语键盘，所以配一排变音字母 */
  function quizSpell(q) {
    const cls = state.answered ? (state.lastOk ? "spell ok" : "spell bad") : "spell";
    const keys = ["ä", "ö", "ü", "ß"]
      .map((c) => `<button data-key="${c}">${c}</button>`).join("");
    return `
      <input class="${cls}" id="spellIn" autocomplete="off" autocapitalize="off"
        autocorrect="off" spellcheck="false" placeholder="在这里拼写…"
        value="${esc(state.spellVal)}" ${state.answered ? "disabled" : ""} />
      <div class="keys">${keys}</div>
      ${state.answered ? "" : `<button class="primary" data-act="spellSubmit">确认</button>`}`;
  }

  /** 句子重组：点词进句，再点一次拿回来 */
  function quizBuild(q) {
    const picked = state.picked
      .map((p) => `<button class="word-chip on" data-unpick="${p.id}" ${state.answered ? "disabled" : ""}>${esc(p.w)}</button>`)
      .join("");
    const pool = q.pool
      .filter((p) => !state.picked.some((x) => x.id === p.id))
      .map((p) => `<button class="word-chip" data-pick="${p.id}" ${state.answered ? "disabled" : ""}>${esc(p.w)}</button>`)
      .join("");
    const preview = state.picked.length
      ? esc(cap(state.picked.map((p) => p.w).join(" ")) + q.end)
      : "";
    return `
      <div class="build-line">${picked || '<span class="muted">点下面的词，按顺序排…</span>'}</div>
      ${preview ? `<div class="build-preview">${preview}</div>` : ""}
      <div class="word-pool">${pool || '<span class="muted">词都用完了</span>'}</div>
      ${state.answered ? "" : `
        <button class="primary" data-act="buildCheck">确认</button>
        <button class="back" style="width:100%;margin-top:8px" data-act="buildClear">重来</button>`}`;
  }

  /* =========================================================
   *  学习记录 / 备份
   * ========================================================= */
  function viewStats() {
    const d = Store.load();
    const all = allQuestions();
    const o = overall();
    const weak = all
      .map((q) => ({ q, r: d.items[q.key] }))
      .filter((x) => x.r && x.r.fail > 0)
      .sort((a, b) => (b.r.fail - b.r.ok) - (a.r.fail - a.r.ok))
      .slice(0, 12);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const t = Date.now() - i * DAY;
      const k = Store.todayKey(t);
      const h = d.history[k] || { answered: 0, correct: 0 };
      days.push({ k: k.slice(5), n: h.answered, c: h.correct });
    }
    const maxN = Math.max(1, ...days.map((x) => x.n));

    return `
      <div class="toolbar">
        <button class="back" data-go="home">← 返回</button>
        <span class="chip">学习记录</span>
      </div>
      <div class="card">
        <h3>总览</h3>
        <div class="stat-row">
          <span class="stat">题目 ${o.total}</span>
          <span class="stat">练过 ${o.seen}</span>
          <span class="stat gold">已掌握 ${o.mastered}</span>
        </div>
      </div>
      <div class="card">
        <h3>最近 7 天</h3>
        <div class="table-wrap">
          <table class="vt">
            <thead><tr><th>日期</th><th>答题</th><th>正确</th><th>正确率</th></tr></thead>
            <tbody>
              ${days.map((x) => `
                <tr>
                  <td class="lb">${esc(x.k)}</td>
                  <td>${x.n}</td>
                  <td>${x.c}</td>
                  <td>${x.n ? Math.round((x.c / x.n) * 100) + "%" : "—"}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <p class="muted" style="font-size:.84rem;margin-top:8px">最多的一天答了 ${maxN} 题。</p>
      </div>
      <div class="card">
        <h3>最该补的 ${weak.length} 题</h3>
        ${weak.length ? weak.map((x) => `
          <div class="weak-item">
            <div>
              <div>${blanks(x.q.q)}</div>
              <div class="muted" style="font-size:.84rem">正确答案：<b>${esc(x.q.a)}</b>${x.q.zh ? " · " + esc(x.q.zh) : ""}</div>
            </div>
            <span class="chip plain">错 ${x.r.fail} / 对 ${x.r.ok}</span>
          </div>`).join("") : `<p class="muted">还没有错题记录。</p>`}
        ${weak.length ? `<button class="primary" data-go="review">去练错题本</button>` : ""}
      </div>
    `;
  }

  function viewBackup() {
    return `
      <div class="toolbar">
        <button class="back" data-go="home">← 返回</button>
        <span class="chip">备份与转移</span>
      </div>
      <div class="card">
        <h3>为什么要备份</h3>
        <p class="muted">记录只存在这台设备的浏览器里。清浏览数据、换手机、或者装成 App 后长期不打开，都可能弄丢。换设备前先导出。</p>
      </div>
      <div class="card">
        <h3>导出</h3>
        <p class="muted" style="font-size:.9rem">下载成文件，或复制下面的文字传到另一台设备。</p>
        <textarea class="backup-box" id="outBox" readonly>${esc(JSON.stringify(Store.load()))}</textarea>
        <button class="primary" data-act="download">下载备份文件</button>
        <button class="back" style="width:100%;margin-top:8px" data-act="copy">复制到剪贴板</button>
      </div>
      <div class="card">
        <h3>导入</h3>
        <p class="muted" style="font-size:.9rem">粘贴另一台设备导出的文字，然后点导入。这会覆盖本机记录。</p>
        <textarea class="backup-box" id="inBox" placeholder="在这里粘贴备份文字…"></textarea>
        <button class="primary" data-act="import">导入并覆盖</button>
      </div>
      <div class="card">
        <h3>清空</h3>
        <p class="muted" style="font-size:.9rem">把这个 app 的所有练习记录清空，重新开始。</p>
        <button class="danger" data-act="reset">清空全部记录</button>
      </div>
    `;
  }

  /* =========================================================
   *  路由
   * ========================================================= */
  function render() {
    let html;
    if (view === "home") html = viewHome();
    else if (view === "rules") html = viewRules(state.which);
    else if (view === "c-table") html = viewCaseTable();
    else if (view === "b-list") html = viewBodyList();
    else if (view === "s-table") html = viewSepTable();
    else if (view === "flash") html = viewFlash();
    else if (view === "quiz") html = viewQuiz();
    else if (view === "stats") html = viewStats();
    else if (view === "backup") html = viewBackup();
    else html = viewHome();
    app.innerHTML = html;

    /*
     * 只有真的换了页面/换了题才回到顶部。
     * 重组题每点一个词都会重绘，要是每次都滚回去，手机上词块在下半屏就没法点了。
     */
    const key = [view, state.gameId, state.i, state.tab, state.which, state.done].join("|");
    if (key !== lastScrollKey) {
      lastScrollKey = key;
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    }

    /* 拼写题重绘后把光标放回输入框，键盘不会收起来 */
    const inp = document.getElementById("spellIn");
    if (inp && !state.answered) {
      inp.addEventListener("input", () => { state.spellVal = inp.value; });
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  }

  function openGame(id) {
    if (id === "home") { state = {}; go("home"); return; }
    if (id === "c-rules" || id === "b-rules" || id === "s-rules") {
      state = { which: id };
      go("rules");
      return;
    }
    if (id === "c-table") { state = { tab: "artikel" }; go("c-table"); return; }
    if (id === "b-list") { state = { tab: "head" }; go("b-list"); return; }
    if (id === "s-table") { state = { tab: "prefix" }; go("s-table"); return; }
    if (id === "b-flash") { startFlash(); return; }
    if (id === "stats") { state = {}; go("stats"); return; }
    if (id === "backup") { state = {}; go("backup"); return; }
    startQuiz(id);
  }

  /* =========================================================
   *  事件
   * ========================================================= */
  app.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-go],[data-tab],[data-ans],[data-speak],[data-flip],[data-flash],[data-again],[data-act],[data-key],[data-pick],[data-unpick]");
    if (!el) return;

    /* 变音字母：直接插进输入框，不重绘，免得光标乱跳 */
    const key = el.getAttribute("data-key");
    if (key) {
      const inp = document.getElementById("spellIn");
      if (inp) {
        inp.value += key;
        state.spellVal = inp.value;
        inp.focus();
      }
      return;
    }

    const pickId = el.getAttribute("data-pick");
    if (pickId !== null) {
      const q = current();
      const item = q && q.pool.find((p) => String(p.id) === pickId);
      if (item && !state.answered) { state.picked.push(item); render(); }
      return;
    }

    const unpickId = el.getAttribute("data-unpick");
    if (unpickId !== null) {
      if (!state.answered) {
        state.picked = state.picked.filter((p) => String(p.id) !== unpickId);
        render();
      }
      return;
    }

    const speakText = el.getAttribute("data-speak");
    if (speakText) { ev.stopPropagation(); speak(speakText); return; }

    const go2 = el.getAttribute("data-go");
    if (go2) { openGame(go2); return; }

    const again = el.getAttribute("data-again");
    if (again) { openGame(again); return; }

    const tab = el.getAttribute("data-tab");
    if (tab) { state.tab = tab; render(); return; }

    const ans = el.getAttribute("data-ans");
    if (ans !== null) { answerQuiz(ans); return; }

    if (el.hasAttribute("data-flip")) {
      if (!state.flipped) { state.flipped = true; render(); }
      return;
    }

    const fl = el.getAttribute("data-flash");
    if (fl !== null) { flashNext(fl === "1"); return; }

    const act = el.getAttribute("data-act");
    if (act) { doAction(act); return; }
  });

  function doAction(act) {
    if (act === "spellSubmit") {
      const inp = document.getElementById("spellIn");
      const val = inp ? inp.value : state.spellVal;
      if (!String(val).trim()) return;
      state.spellVal = val;
      answerQuiz(val);
      return;
    }
    if (act === "buildCheck") {
      const q = current();
      if (!q || !state.picked.length) return;
      const got = norm(state.picked.map((p) => p.w).join(" "));
      /* 德语「动词第二位」允许别的成分提到句首，所以正确答案往往不止一种 */
      answerQuiz(cap(state.picked.map((p) => p.w).join(" ")) + q.end,
        q.ok.some((alt) => norm(alt) === got));
      return;
    }
    if (act === "buildClear") {
      state.picked = [];
      render();
      return;
    }
    if (act === "download") {
      const blob = new Blob([JSON.stringify(Store.load(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `deutsch-drill-${Store.todayKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return;
    }
    if (act === "copy") {
      const box = document.getElementById("outBox");
      if (!box) return;
      box.select();
      try { document.execCommand("copy"); alert("已复制，粘贴到另一台设备的「导入」框里。"); }
      catch (_) { alert("复制失败，请手动全选复制。"); }
      return;
    }
    if (act === "import") {
      const box = document.getElementById("inBox");
      if (!box || !box.value.trim()) { alert("请先粘贴备份文字。"); return; }
      try {
        const parsed = JSON.parse(box.value.trim());
        if (!parsed || typeof parsed !== "object" || !parsed.items) throw new Error("格式不对");
        if (!confirm("导入会覆盖这台设备现有的练习记录，确定？")) return;
        Store.replace(parsed);
        alert("导入成功。");
        openGame("home");
      } catch (e) {
        alert("导入失败：备份文字看起来不完整或格式不对。");
      }
      return;
    }
    if (act === "reset") {
      if (!confirm("确定清空全部练习记录？这一步无法撤销。")) return;
      Store.reset();
      openGame("home");
    }
  }

  document.addEventListener("keydown", (ev) => {
    if (view !== "quiz" || !state.round || state.answered || state.done) return;
    const q = current();
    if (!q) return;

    if (q.type === "spell") {
      if (ev.key === "Enter") { ev.preventDefault(); doAction("spellSubmit"); }
      return;
    }
    if (q.type === "build") {
      if (ev.key === "Enter") { ev.preventDefault(); doAction("buildCheck"); }
      return;
    }
    /* 选择题：数字键 1..n 直接选 */
    const n = Number(ev.key);
    if (q.o && n >= 1 && n <= q.o.length) answerQuiz(q.o[n - 1]);
  });

  render();
})();
