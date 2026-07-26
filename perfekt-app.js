/* 德語 Perfekt 訓練 · 引擎 */
(function () {
  "use strict";

  const DATA = window.PERFEKT;
  const VERBS = DATA.verbs;
  const FAMS = DATA.families;

  const WRONG_KEY = "perfekt-wrong-v1";
  const STAR_KEY = "perfekt-stars-v1";
  const SEEN_KEY = "perfekt-seen-v1";

  const app = document.getElementById("app");

  const GAMES = [
    { id: "table",   lv: 0, title: "動詞速查表", desc: "四大類一覽 · 分詞/助動詞/例句", cat: "學習" },
    { id: "grammar", lv: 0, title: "語法講解",   desc: "Perfekt 怎麼組成 · ge 規則", cat: "學習" },
    { id: "flash",   lv: 1, title: "分詞閃卡",   desc: "看原形，翻卡背 hat/ist + 分詞", cat: "入門" },
    { id: "aux",     lv: 1, title: "haben 還是 sein", desc: "選對助動詞", cat: "入門" },
    { id: "ppchoice",lv: 2, title: "分詞選擇",   desc: "選出正確 Partizip II", cat: "進階" },
    { id: "family",  lv: 2, title: "動詞分類",   desc: "判斷可分 / 不可分 / 規則 / 不規則", cat: "進階" },
    { id: "spell",   lv: 3, title: "分詞拼寫",   desc: "在句子裡拼出分詞（有鍵盤）", cat: "挑戰" },
    { id: "build",   lv: 3, title: "句子重組",   desc: "把詞排成正確的 Perfekt 句", cat: "挑戰" },
    { id: "blitz",   lv: 4, title: "限時閃電",   desc: "60 秒混合搶答", cat: "挑戰" },
    { id: "review",  lv: 4, title: "錯題本",     desc: "專攻答錯過的動詞", cat: "複習" },
  ];

  const state = {
    view: "home",
    game: null,
    deck: [],
    idx: 0,
    score: 0,
    answered: false,
    selected: null,
    flip: false,
    spellVal: "",
    buildPicked: [],
    buildPool: [],
    famTab: "un",
    blitzTimer: null,
    blitzLeft: 0,
    blitzMode: null,
    feedback: "",
    feedbackKind: "",
  };

  /* ---------- storage ---------- */
  function loadWrong() {
    try { const a = JSON.parse(localStorage.getItem(WRONG_KEY) || "[]"); return Array.isArray(a) ? a : []; }
    catch { return []; }
  }
  function saveWrong(list) { localStorage.setItem(WRONG_KEY, JSON.stringify(list)); }
  function addWrong(inf) {
    const list = loadWrong();
    if (!list.includes(inf)) { list.push(inf); saveWrong(list); }
  }
  function removeWrong(inf) { saveWrong(loadWrong().filter((x) => x !== inf)); }

  function loadStars() { return Number(localStorage.getItem(STAR_KEY) || 0) || 0; }
  function addStars(n) { localStorage.setItem(STAR_KEY, String(loadStars() + n)); }

  function loadSeen() {
    try { const o = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); return o && typeof o === "object" ? o : {}; }
    catch { return {}; }
  }
  function markSeen(inf) { const s = loadSeen(); s[inf] = (s[inf] || 0) + 1; localStorage.setItem(SEEN_KEY, JSON.stringify(s)); }
  function seenCount() { return Object.keys(loadSeen()).length; }

  /* ---------- utils ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function sample(arr, n, exclude) {
    const pool = arr.filter((x) => x !== exclude);
    return shuffle(pool).slice(0, n);
  }
  function auxWord(v) { return v.aux === "sein" ? "ist" : "hat"; }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function normalize(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function verbByInf(inf) { return VERBS.find((v) => v.inf === inf); }

  let voices = [];
  function refreshVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch { voices = []; } }
  if ("speechSynthesis" in window) {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      const de = voices.find((v) => /de(-|_)/i.test(v.lang));
      if (de) u.voice = de;
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  /* ---------- render root ---------- */
  function render() {
    if (state.view === "home") return renderHome();
    if (state.view === "table") return renderTable();
    if (state.view === "grammar") return renderGrammar();
    if (state.view === "game") return renderGame();
    renderHome();
  }

  function go(view) { state.view = view; window.scrollTo(0, 0); render(); }

  function backBar(extra) {
    return `<div class="toolbar">
      <button class="back" onclick="PK.home()">← 返回</button>
      ${extra || ""}
    </div>`;
  }

  /* ---------- home ---------- */
  function renderHome() {
    const total = VERBS.length;
    const seen = seenCount();
    const wrong = loadWrong().length;
    const stars = loadStars();
    const cats = [...new Set(GAMES.map((g) => g.cat))];
    const grid = cats.map((cat) => {
      const items = GAMES.filter((g) => g.cat === cat).map((g) => {
        const lvTxt = ["學習", "入門", "進階", "挑戰", "挑戰"][g.lv] || "";
        const lvCls = "l" + Math.max(1, g.lv);
        const badge = g.lv === 0 ? "" : `<span class="lv ${lvCls}">Lv.${g.lv} ${lvTxt}</span>`;
        return `<button class="game-btn" onclick="PK.start('${g.id}')">
          ${badge}
          <strong>${esc(g.title)}</strong>
          <span>${esc(g.desc)}</span>
        </button>`;
      }).join("");
      return `<div class="block"><h2 class="section-title">${esc(cat)}</h2><div class="games">${items}</div></div>`;
    }).join("");

    app.innerHTML = `
      <div class="hero">
        <p class="eyebrow"><span class="flag"><i class="b"></i><i class="r"></i><i class="g"></i></span>DEUTSCH · PERFEKT</p>
        <h1>現在完成時 · 針對性訓練</h1>
        <p class="tagline">涵蓋講義全部 <b>${total}</b> 個動詞（不可分 · 可分 · 規則 · 不規則）。從速查、閃卡到句子重組、限時閃電，多角度反覆練，下週考試穩住！</p>
        <div class="hero-meta">
          <span class="stat">已練動詞 ${seen} / ${total}</span>
          <span class="stat gold">⭐ ${stars}</span>
          <span class="stat">錯題 ${wrong}</span>
        </div>
      </div>
      <div class="card soft">
        <p class="muted" style="margin:0">建議順序：先看<b>語法講解</b>與<b>速查表</b> → <b>閃卡</b>熟悉 → <b>haben/sein</b>、<b>分詞選擇</b>、<b>分類</b>鞏固 → <b>拼寫</b>、<b>句子重組</b>輸出 → <b>限時閃電</b>模擬考場 → 用<b>錯題本</b>掃盲。</p>
      </div>
      ${grid}
      <div class="card soft center">
        <p class="muted" style="margin:0">進度自動存在這台裝置。可「加入主畫面」當 App 用。</p>
      </div>
    `;
  }

  /* ---------- 速查表 ---------- */
  function renderTable() {
    const fam = state.famTab;
    const tabs = Object.values(FAMS).map((f) =>
      `<button class="fam-tab ${f.key === fam ? "on" : ""}" onclick="PK.famTab('${f.key}')">${esc(f.label)}</button>`
    ).join("");
    const list = VERBS.filter((v) => v.fam === fam);
    const rows = list.map((v) => `
      <tr>
        <td class="inf">${esc(v.inf)}<div class="muted" style="font-size:.82rem">${esc(v.zh)}</div></td>
        <td class="pp"><span class="aux">${auxWord(v)}</span> <span class="pp">${esc(v.pp)}</span></td>
        <td>${esc(v.ex)}${v.note ? `<div class="muted" style="font-size:.8rem;margin-top:3px">💡 ${esc(v.note)}</div>` : ""}
          <button class="speak" onclick="PK.speak('${esc(v.ex).replace(/'/g, "\\'")}')">🔊</button></td>
      </tr>`).join("");
    app.innerHTML = `
      ${backBar()}
      <h2 class="section-title">動詞速查表</h2>
      <p class="muted" style="margin:0 0 8px">${esc(FAMS[fam].rule)}</p>
      <div class="fam-tabs">${tabs}</div>
      <div class="card" style="padding:6px">
        <div class="table-wrap">
          <table class="vt">
            <thead><tr><th>原形</th><th>hat/ist + 分詞</th><th>例句</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <p class="muted center">此類共 ${list.length} 個動詞</p>
    `;
  }

  /* ---------- 語法講解 ---------- */
  function renderGrammar() {
    const cards = [
      { h: "Perfekt 怎麼組成？", ps: [
        "公式：<b>haben / sein（變位）＋ Partizip II（第二分詞）</b>。",
        "第二分詞放在<b>主句最後</b>。例：Ich habe gestern Pizza <mark>gegessen</mark>.",
      ]},
      { h: "用 haben 還是 sein？", ps: [
        "大多數動詞用 <b>haben</b>。",
        "表示<b>位移 / 狀態改變</b>的動詞用 <b>sein</b>：gehen, kommen, fahren, aufstehen, umziehen, joggen, schwimmen…",
        "sein 自己與 bleiben 也用 sein：Er <mark>ist</mark> krank gewesen.",
      ]},
      { h: "第二分詞的 ge 規則", ps: [
        "規則（弱變化）：<b>ge…t</b>　machen→<mark>gemacht</mark>、kaufen→<mark>gekauft</mark>。",
        "不規則（強變化）：<b>ge…en</b>，詞幹常變音　essen→<mark>gegessen</mark>、gehen→<mark>gegangen</mark>。",
        "可分動詞：<b>ge 夾在中間</b>　anfangen→<mark>angefangen</mark>、einkaufen→<mark>eingekauft</mark>。",
        "不可分動詞（be-/ge-/er-/ver-/ent-/emp-/miss-/zer-）：<b>不加 ge</b>　verstehen→<mark>verstanden</mark>、bezahlen→<mark>bezahlt</mark>。",
        "<b>-ieren</b> 結尾：<b>不加 ge</b>　studieren→<mark>studiert</mark>、telefonieren→<mark>telefoniert</mark>。",
      ]},
      { h: "小提醒", ps: [
        "詞幹以 -t/-d 結尾的規則動詞：加 -et　arbeiten→<mark>gearbeitet</mark>。",
        "haben、sein 口語常直接用過去式（hatte / war）而不用 Perfekt。",
      ]},
    ];
    const html = cards.map((c) => `
      <div class="card rule-card">
        <h3>${c.h}</h3>
        ${c.ps.map((p) => `<p>${p}</p>`).join("")}
      </div>`).join("");
    app.innerHTML = `
      ${backBar(`<button class="ghost" onclick="PK.start('flash')">開始閃卡 →</button>`)}
      <h2 class="section-title">語法講解 · Perfekt</h2>
      ${html}
    `;
  }

  /* ---------- 通用：建立題組（全部動詞洗牌，保證覆蓋） ---------- */
  function buildDeck(gameId) {
    if (gameId === "review") {
      const list = loadWrong().map(verbByInf).filter(Boolean);
      return shuffle(list);
    }
    return shuffle(VERBS.slice());
  }

  function start(gameId) {
    const g = GAMES.find((x) => x.id === gameId);
    if (!g) return;
    if (gameId === "table") return go("table");
    if (gameId === "grammar") return go("grammar");

    if (gameId === "review" && loadWrong().length === 0) {
      state.game = gameId;
      go("game");
      return;
    }
    if (gameId === "blitz") return startBlitz();

    state.game = gameId;
    state.deck = buildDeck(gameId);
    state.idx = 0;
    state.score = 0;
    resetQuestion();
    go("game");
  }

  function resetQuestion() {
    state.answered = false;
    state.selected = null;
    state.flip = false;
    state.spellVal = "";
    state.feedback = "";
    state.feedbackKind = "";
    const v = current();
    if (state.game === "build" && v) setupBuild(v);
    if (state.game === "ppchoice" && v) setupPpChoice(v);
    if (state.game === "aux" && v) {} // 2 fixed options
  }

  function current() { return state.deck[state.idx]; }

  function next() {
    if (state.game === "blitz") return blitzNext();
    state.idx += 1;
    if (state.idx >= state.deck.length) return renderDone();
    resetQuestion();
    render();
  }

  /* ---------- 遊戲總渲染 ---------- */
  function renderGame() {
    const g = state.game;
    if (g === "review" && loadWrong().length === 0) return renderEmptyReview();
    if (g === "blitz") return renderBlitz();
    if (!current()) return renderDone();

    if (g === "flash") return renderFlash();
    if (g === "aux") return renderAux();
    if (g === "ppchoice") return renderPpChoice();
    if (g === "family") return renderFamily();
    if (g === "spell") return renderSpell();
    if (g === "build") return renderBuild();
    if (g === "review") return renderReviewCard();
  }

  function headerBar() {
    const total = state.deck.length;
    const done = Math.min(state.idx, total);
    const pctv = total ? Math.round((done / total) * 100) : 0;
    const title = (GAMES.find((x) => x.id === state.game) || {}).title || "";
    return `
      ${backBar(`<span class="chip">${done + (state.answered || state.game === "flash" ? 1 : 0)} / ${total}</span><span class="chip gold">✔ ${state.score}</span>`)}
      <div class="progress-top"><i style="width:${pctv}%"></i></div>
      <p class="eyebrow">${esc(title)}</p>
    `;
  }

  function famChip(v) {
    const f = FAMS[v.fam];
    return `<span class="chip fam-${v.fam}">${esc(f.short)}</span>`;
  }

  /* ---------- 1. 閃卡 ---------- */
  function renderFlash() {
    const v = current();
    markSeen(v.inf);
    const front = `
      <div class="big big-inf">${esc(v.inf)}</div>
      <div class="zh-line">${esc(v.zh)}</div>
      <div class="flip-hint">點卡片看答案</div>`;
    const back = `
      <div class="big big-inf">${esc(v.inf)}</div>
      <div class="pp-line"><span class="aux">${auxWord(v)}</span> <span class="pp">${esc(v.pp)}</span></div>
      <button class="speak" onclick="event.stopPropagation();PK.speak('${esc(v.inf)} , ${esc(v.aux === "sein" ? "ist" : "hat")} ${esc(v.pp)}')">🔊 發音</button>
      <div class="ex-de">${esc(v.ex)}</div>
      ${v.note ? `<div class="muted" style="font-size:.85rem">💡 ${esc(v.note)}</div>` : ""}`;
    app.innerHTML = `
      ${headerBar()}
      <div class="card flip-card" onclick="PK.flip()">
        ${famChip(v)}
        ${state.flip ? back : front}
      </div>
      ${state.flip ? `
        <div class="choices two">
          <button class="choice" onclick="PK.flashJudge(false)">還不熟 ↺</button>
          <button class="choice ok" onclick="PK.flashJudge(true)">記住了 ✓</button>
        </div>` : `<button class="primary" onclick="PK.flip()">翻卡</button>`}
    `;
  }
  function flip() { state.flip = !state.flip; render(); }
  function flashJudge(known) {
    const v = current();
    if (known) { addStars(1); state.score += 1; removeWrong(v.inf); }
    else { addWrong(v.inf); }
    next();
  }

  /* ---------- 2. haben 還是 sein ---------- */
  function renderAux() {
    const v = current();
    markSeen(v.inf);
    const opts = [
      { k: "haben", label: "haben", sub: "hat " + v.pp },
      { k: "sein", label: "sein", sub: "ist " + v.pp },
    ];
    const btns = opts.map((o) => {
      let cls = "choice";
      if (state.answered) {
        if (o.k === v.aux) cls += " ok";
        else if (o.k === state.selected) cls += " bad";
      }
      return `<button class="${cls}" ${state.answered ? "disabled" : ""} onclick="PK.answerAux('${o.k}')">
        ${o.label}<span class="sub">${esc(o.sub)}</span></button>`;
    }).join("");
    app.innerHTML = `
      ${headerBar()}
      <div class="card center">
        ${famChip(v)}
        <div class="big big-inf">${esc(v.inf)}</div>
        <div class="zh-line">${esc(v.zh)}</div>
        <p class="muted">這個動詞的 Perfekt 用哪個助動詞？</p>
      </div>
      <div class="choices two">${btns}</div>
      ${feedbackBox(v)}
      ${state.answered ? nextBtn() : ""}
    `;
  }
  function answerAux(k) {
    if (state.answered) return;
    const v = current();
    state.answered = true;
    state.selected = k;
    judge(v, k === v.aux, `${v.aux === "sein" ? "sein" : "haben"} → ${auxWord(v)} ${v.pp}`);
    render();
  }

  /* ---------- 3. 分詞選擇 ---------- */
  function setupPpChoice(v) {
    let distract = sample(VERBS.filter((x) => x.fam === v.fam), 3, v).map((x) => x.pp);
    const pool = new Set(distract);
    while (pool.size < 3) {
      const r = VERBS[Math.floor(Math.random() * VERBS.length)];
      if (r.pp !== v.pp) pool.add(r.pp);
    }
    state.ppOptions = shuffle([v.pp, ...[...pool].slice(0, 3)]);
  }
  function renderPpChoice() {
    const v = current();
    markSeen(v.inf);
    const btns = state.ppOptions.map((pp) => {
      let cls = "choice";
      if (state.answered) {
        if (pp === v.pp) cls += " ok";
        else if (pp === state.selected) cls += " bad";
      }
      return `<button class="${cls}" ${state.answered ? "disabled" : ""} onclick="PK.answerPp('${esc(pp)}')">${esc(pp)}</button>`;
    }).join("");
    app.innerHTML = `
      ${headerBar()}
      <div class="card center">
        ${famChip(v)}
        <div class="big big-inf">${esc(v.inf)}</div>
        <div class="zh-line">${esc(v.zh)}</div>
        <p class="muted">正確的第二分詞 Partizip II 是？</p>
      </div>
      <div class="choices four">${btns}</div>
      ${feedbackBox(v)}
      ${state.answered ? nextBtn() : ""}
    `;
  }
  function answerPp(pp) {
    if (state.answered) return;
    const v = current();
    state.answered = true;
    state.selected = pp;
    judge(v, pp === v.pp, `${v.inf} → ${auxWord(v)} ${v.pp}`);
    render();
  }

  /* ---------- 4. 分類 ---------- */
  function renderFamily() {
    const v = current();
    markSeen(v.inf);
    const order = ["un", "tr", "reg", "irr"];
    const btns = order.map((k) => {
      let cls = "choice";
      if (state.answered) {
        if (k === v.fam) cls += " ok";
        else if (k === state.selected) cls += " bad";
      }
      return `<button class="${cls}" ${state.answered ? "disabled" : ""} onclick="PK.answerFam('${k}')">${esc(FAMS[k].label)}</button>`;
    }).join("");
    app.innerHTML = `
      ${headerBar()}
      <div class="card center">
        <div class="big big-inf">${esc(v.inf)}</div>
        <div class="zh-line">${esc(v.zh)}</div>
        <div class="pp-line" style="font-size:1.3rem"><span class="aux">${auxWord(v)}</span> <span class="pp">${esc(v.pp)}</span></div>
        <p class="muted">這是哪一類動詞？</p>
      </div>
      <div class="choices four">${btns}</div>
      ${state.answered ? `<div class="tip ${state.feedbackKind}">${state.feedback}</div>` : ""}
      ${state.answered ? nextBtn() : ""}
    `;
  }
  function answerFam(k) {
    if (state.answered) return;
    const v = current();
    state.answered = true;
    state.selected = k;
    const ok = k === v.fam;
    if (ok) { addStars(1); state.score += 1; removeWrong(v.inf); }
    else { addWrong(v.inf); }
    state.feedbackKind = ok ? "ok" : "bad";
    state.feedback = `${ok ? "✔ 正確！" : "✘ 這是「" + FAMS[v.fam].label + "」"}\n${FAMS[v.fam].rule}`;
    render();
  }

  /* ---------- 5. 拼寫（句子填空） ---------- */
  function renderSpell() {
    const v = current();
    markSeen(v.inf);
    const gap = v.ex.replace(v.pp, "＿＿＿＿");
    const cls = state.answered ? (state.feedbackKind === "ok" ? "spell ok" : "spell bad") : "spell";
    const umlauts = ["ä", "ö", "ü", "ß"];
    const keys = umlauts.map((c) => `<button onclick="PK.spellKey('${c}')">${c}</button>`).join("");
    app.innerHTML = `
      ${headerBar()}
      <div class="card center">
        ${famChip(v)}
        <div class="big big-inf">${esc(v.inf)}</div>
        <div class="zh-line">${esc(v.zh)}</div>
        <p class="muted">在句子裡填入第二分詞（助動詞已給）：</p>
        <div class="ex-de">${esc(gap)}</div>
      </div>
      <input class="${cls}" id="spellIn" autocomplete="off" autocapitalize="off" autocorrect="off"
        spellcheck="false" placeholder="輸入 Partizip II…" value="${esc(state.spellVal)}"
        oninput="PK.spellInput(this.value)" onkeydown="if(event.key==='Enter')PK.spellSubmit()"
        ${state.answered ? "disabled" : ""} />
      <div class="keys">${keys}</div>
      ${feedbackBox(v)}
      ${state.answered ? nextBtn() : `<button class="primary" onclick="PK.spellSubmit()">確認</button>`}
    `;
    const inp = document.getElementById("spellIn");
    if (inp && !state.answered) { inp.focus(); const l = inp.value.length; try { inp.setSelectionRange(l, l); } catch {} }
  }
  function spellInput(val) { state.spellVal = val; }
  function spellKey(c) {
    const inp = document.getElementById("spellIn");
    state.spellVal = (inp ? inp.value : state.spellVal) + c;
    render();
  }
  function spellSubmit() {
    if (state.answered) return;
    const v = current();
    const ok = normalize(state.spellVal) === normalize(v.pp);
    state.answered = true;
    judge(v, ok, `${v.inf} → ${auxWord(v)} ${v.pp}`);
    render();
  }

  /* ---------- 6. 句子重組 ---------- */
  function setupBuild(v) {
    const words = v.ex.replace(/\s+/g, " ").trim().split(" ");
    state.buildAnswer = words;
    state.buildPicked = [];
    state.buildPool = shuffle(words.map((w, i) => ({ w, id: i })));
  }
  function renderBuild() {
    const v = current();
    markSeen(v.inf);
    const picked = state.buildPicked.map((p) =>
      `<button class="word-chip on" onclick="PK.buildUnpick(${p.id})">${esc(p.w)}</button>`).join("");
    const pool = state.buildPool.filter((p) => !state.buildPicked.some((x) => x.id === p.id))
      .map((p) => `<button class="word-chip" onclick="PK.buildPick(${p.id})">${esc(p.w)}</button>`).join("");
    app.innerHTML = `
      ${headerBar()}
      <div class="card">
        ${famChip(v)}
        <p class="muted" style="margin:4px 0">用中文提示，把下面的詞排成正確的 Perfekt 句子（分詞放句尾）：</p>
        <div class="zh-line">${esc(v.inf)} · ${esc(v.zh)}</div>
        <div class="build-line">${picked || '<span class="muted">點下面的詞…</span>'}</div>
        <div class="word-pool">${pool}</div>
      </div>
      ${feedbackBox(v)}
      ${state.answered ? nextBtn() : `<button class="primary" onclick="PK.buildCheck()">確認</button>`}
    `;
  }
  function buildPick(id) {
    if (state.answered) return;
    const item = state.buildPool.find((p) => p.id === id);
    if (item) { state.buildPicked.push(item); render(); }
  }
  function buildUnpick(id) {
    if (state.answered) return;
    state.buildPicked = state.buildPicked.filter((p) => p.id !== id);
    render();
  }
  function buildCheck() {
    if (state.answered) return;
    const v = current();
    const got = state.buildPicked.map((p) => p.w).join(" ");
    const want = state.buildAnswer.join(" ");
    const ok = got === want;
    state.answered = true;
    judge(v, ok, `正解：${want}`);
    render();
  }

  /* ---------- 錯題本 ---------- */
  function renderEmptyReview() {
    app.innerHTML = `
      ${backBar()}
      <div class="card center">
        <div class="done-face">🎉</div>
        <h2>錯題本是空的</h2>
        <p class="muted">先去玩其他模式，答錯的動詞會自動收進來，方便你集中複習。</p>
        <button class="primary" onclick="PK.home()">回首頁挑一個開始</button>
      </div>`;
  }
  function renderReviewCard() {
    // 錯題本用「分詞選擇」的形式複習
    return renderPpChoice();
  }

  /* ---------- 限時閃電 ---------- */
  function startBlitz() {
    state.game = "blitz";
    state.deck = shuffle(VERBS.slice());
    state.idx = 0;
    state.score = 0;
    state.blitzLeft = 60;
    state.blitzWrong = [];
    resetQuestion();
    blitzSetup();
    go("game");
    clearInterval(state.blitzTimer);
    state.blitzTimer = setInterval(() => {
      state.blitzLeft -= 1;
      if (state.blitzLeft <= 0) { state.blitzLeft = 0; endBlitz(); return; }
      const el = document.getElementById("blitzClock");
      if (el) el.textContent = state.blitzLeft + "s";
    }, 1000);
  }
  function blitzSetup() {
    const v = current();
    // 隨機兩種題型：助動詞 或 分詞選擇
    state.blitzMode = Math.random() < 0.45 ? "aux" : "pp";
    if (state.blitzMode === "pp") setupPpChoice(v);
    state.answered = false;
    state.selected = null;
  }
  function blitzNext() {
    state.idx += 1;
    if (state.idx >= state.deck.length) state.idx = 0; // 循環直到時間到
    blitzSetup();
    render();
  }
  function renderBlitz() {
    const v = current();
    if (!v) return endBlitzScreen();
    if (state.blitzDone) return endBlitzScreen();
    markSeen(v.inf);
    let body = "";
    if (state.blitzMode === "aux") {
      body = `
        <p class="muted">助動詞？</p>
        <div class="choices two">
          <button class="choice" onclick="PK.blitzAns('haben')">haben (hat)</button>
          <button class="choice" onclick="PK.blitzAns('sein')">sein (ist)</button>
        </div>`;
    } else {
      const btns = state.ppOptions.map((pp) =>
        `<button class="choice" onclick="PK.blitzAns('${esc(pp)}')">${esc(pp)}</button>`).join("");
      body = `<p class="muted">正確分詞？</p><div class="choices four">${btns}</div>`;
    }
    app.innerHTML = `
      ${backBar(`<span class="chip gold" id="blitzClock">${state.blitzLeft}s</span><span class="chip">✔ ${state.score}</span>`)}
      <div class="card center">
        ${famChip(v)}
        <div class="big big-inf">${esc(v.inf)}</div>
        <div class="zh-line">${esc(v.zh)}</div>
      </div>
      ${body}
    `;
  }
  function blitzAns(val) {
    const v = current();
    let ok;
    if (state.blitzMode === "aux") ok = val === v.aux;
    else ok = val === v.pp;
    if (ok) { state.score += 1; addStars(1); }
    else { addWrong(v.inf); if (!state.blitzWrong.includes(v.inf)) state.blitzWrong.push(v.inf); }
    blitzNext();
  }
  function endBlitz() {
    clearInterval(state.blitzTimer);
    state.blitzDone = true;
    render();
  }
  function endBlitzScreen() {
    clearInterval(state.blitzTimer);
    const wrong = state.blitzWrong || [];
    app.innerHTML = `
      ${backBar()}
      <div class="card center">
        <div class="done-face">⚡️</div>
        <h2>時間到！</h2>
        <div class="stat-row">
          <span class="stat gold">答對 ${state.score}</span>
          <span class="stat">失誤 ${wrong.length}</span>
        </div>
        ${wrong.length ? `<p class="muted">待加強：${wrong.map(esc).join("、")}</p>` : `<p class="muted">全對，太強了！</p>`}
        <button class="primary" onclick="PK.start('blitz')">再來 60 秒</button>
        <button class="back" style="width:100%;margin-top:8px" onclick="PK.home()">回首頁</button>
      </div>`;
    state.blitzDone = false;
  }

  /* ---------- 共用：判定 / 回饋 / 下一題 / 完成 ---------- */
  function judge(v, ok, correctText) {
    if (ok) { addStars(1); state.score += 1; removeWrong(v.inf); }
    else { addWrong(v.inf); }
    state.feedbackKind = ok ? "ok" : "bad";
    let msg = ok ? "✔ 正確！" : "✘ 再看一次：";
    msg += `\n<b>${esc(correctText)}</b>`;
    if (!ok && v.note) msg += `\n💡 ${esc(v.note)}`;
    if (v.ex) msg += `\n例：${esc(v.ex)}`;
    state.feedback = msg;
  }
  function feedbackBox(v) {
    if (!state.answered || !state.feedback) return "";
    return `<div class="tip ${state.feedbackKind}">${state.feedback}
      <button class="speak" onclick="PK.speak('${esc(v.ex).replace(/'/g, "\\'")}')">🔊 例句</button></div>`;
  }
  function nextBtn() {
    const last = state.idx >= state.deck.length - 1;
    return `<button class="primary" onclick="PK.next()">${last ? "看結果 →" : "下一題 →"}</button>`;
  }

  function renderDone() {
    const total = state.deck.length;
    const s = state.score;
    const rate = total ? Math.round((s / total) * 100) : 0;
    const face = rate >= 90 ? "🏆" : rate >= 70 ? "🎉" : rate >= 50 ? "💪" : "📚";
    const wrongNow = loadWrong();
    app.innerHTML = `
      ${backBar()}
      <div class="card center">
        <div class="done-face">${face}</div>
        <h2>本輪完成</h2>
        <div class="stat-row">
          <span class="stat gold">答對 ${s} / ${total}</span>
          <span class="stat">正確率 ${rate}%</span>
        </div>
        ${wrongNow.length ? `<p class="muted">錯題本目前有 ${wrongNow.length} 個動詞，建議接著練「錯題本」。</p>` : `<p class="muted">錯題本已清空，太棒了！</p>`}
        <button class="primary" onclick="PK.start('${state.game}')">再練一輪</button>
        ${wrongNow.length ? `<button class="ghost" style="width:100%;margin-top:8px" onclick="PK.start('review')">去練錯題本 (${wrongNow.length})</button>` : ""}
        <button class="back" style="width:100%;margin-top:8px" onclick="PK.home()">回首頁</button>
      </div>`;
  }

  /* ---------- public API ---------- */
  window.PK = {
    home: () => { clearInterval(state.blitzTimer); state.blitzDone = false; go("home"); },
    start,
    next,
    flip,
    flashJudge,
    answerAux,
    answerPp,
    answerFam,
    spellInput,
    spellKey,
    spellSubmit,
    buildPick,
    buildUnpick,
    buildCheck,
    blitzAns,
    famTab: (k) => { state.famTab = k; render(); },
    speak,
  };

  render();
})();
