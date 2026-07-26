/* 德語 Perfekt 訓練 · 引擎 v2（含學習紀錄 / 記憶曲線 / 備份） */
(function () {
  "use strict";

  const DATA = window.PERFEKT;
  const VERBS = DATA.verbs;
  const FAMS = DATA.families;

  const STORE_KEY = "perfekt-store-v2";
  /* v1 舊鍵，用於自動遷移 */
  const OLD_WRONG = "perfekt-wrong-v1";
  const OLD_STARS = "perfekt-stars-v1";
  const OLD_SEEN = "perfekt-seen-v1";

  /* 記憶曲線：box 0..5 對應的下次複習間隔（毫秒）。考試在即，前段刻意排密。 */
  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const SRS_INTERVAL = [10 * MIN, 30 * MIN, 2 * HOUR, 8 * HOUR, 1 * DAY, 3 * DAY];
  const MASTER_BOX = 3; /* box >= 3 視為已掌握 */

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
    { id: "due",     lv: 1, title: "到期複習",   desc: "記憶曲線排程，先練該複習的", cat: "複習" },
    { id: "review",  lv: 4, title: "錯題本",     desc: "專攻答錯過又還沒掌握的", cat: "複習" },
    { id: "stats",   lv: 0, title: "學習紀錄",   desc: "掌握率 · 弱點動詞 · 每日趨勢", cat: "紀錄" },
    { id: "backup",  lv: 0, title: "備份與轉移", desc: "匯出／匯入，換裝置不丟紀錄", cat: "紀錄" },
  ];

  /* =========================================================
   *  Store：單一 JSON blob，方便日後整包同步到雲端
   * ========================================================= */
  const Store = (function () {
    let data = null;

    function blank() {
      return { v: 2, verbs: {}, history: {}, stars: 0, updatedAt: Date.now() };
    }

    function migrate() {
      /* 從 v1 的三個鍵搬過來，搬完保留舊鍵不刪（安全） */
      const s = blank();
      let touched = false;
      try {
        const seen = JSON.parse(localStorage.getItem(OLD_SEEN) || "{}");
        Object.keys(seen || {}).forEach((inf) => {
          s.verbs[inf] = { seen: Number(seen[inf]) || 1, ok: 0, fail: 0, box: 0, due: 0, lastAt: 0 };
          touched = true;
        });
      } catch {}
      try {
        const wrong = JSON.parse(localStorage.getItem(OLD_WRONG) || "[]");
        (Array.isArray(wrong) ? wrong : []).forEach((inf) => {
          if (!s.verbs[inf]) s.verbs[inf] = { seen: 1, ok: 0, fail: 0, box: 0, due: 0, lastAt: 0 };
          s.verbs[inf].fail = Math.max(1, s.verbs[inf].fail);
          s.verbs[inf].due = Date.now();
          touched = true;
        });
      } catch {}
      const st = Number(localStorage.getItem(OLD_STARS) || 0) || 0;
      if (st) { s.stars = st; touched = true; }
      return touched ? s : null;
    }

    function load() {
      if (data) return data;
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && parsed.verbs) {
            data = Object.assign(blank(), parsed);
            return data;
          }
        }
      } catch {}
      data = migrate() || blank();
      save();
      return data;
    }

    function save() {
      if (!data) return;
      data.updatedAt = Date.now();
      try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
      catch (e) { console.warn("儲存失敗（可能是隱私模式或空間不足）", e); }
    }

    function rec(inf) {
      const d = load();
      if (!d.verbs[inf]) d.verbs[inf] = { seen: 0, ok: 0, fail: 0, box: 0, due: 0, lastAt: 0 };
      return d.verbs[inf];
    }

    function todayKey(t) {
      const dt = t ? new Date(t) : new Date();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      return `${dt.getFullYear()}-${m}-${day}`;
    }

    /** 記一次作答：ok=true 正確。會推進記憶曲線並寫入當日統計。 */
    function answer(inf, ok) {
      const d = load();
      const r = rec(inf);
      r.seen += 1;
      r.lastAt = Date.now();
      if (ok) {
        r.ok += 1;
        r.box = Math.min(r.box + 1, SRS_INTERVAL.length - 1);
      } else {
        r.fail += 1;
        r.box = 0;
      }
      r.due = Date.now() + SRS_INTERVAL[r.box];

      const k = todayKey();
      if (!d.history[k]) d.history[k] = { answered: 0, correct: 0 };
      d.history[k].answered += 1;
      if (ok) { d.history[k].correct += 1; d.stars += 1; }
      save();
    }

    /** 只是看過（閃卡正面），算接觸過但不影響排程 */
    function touch(inf) {
      const r = rec(inf);
      if (!r.touched) { r.touched = true; save(); }
    }

    function of(inf) { return load().verbs[inf] || null; }
    function stars() { return load().stars || 0; }

    function isMastered(r) { return !!r && r.box >= MASTER_BOX && r.ok > r.fail; }
    function isLearned(r) { return !!r && (r.seen > 0 || r.touched === true); }

    function dueList() {
      const now = Date.now();
      const d = load();
      return VERBS.filter((v) => {
        const r = d.verbs[v.inf];
        if (!r || !r.due) return false;
        return r.due <= now && !isMastered(r);
      }).sort((a, b) => (d.verbs[a.inf].due - d.verbs[b.inf].due));
    }

    function wrongList() {
      const d = load();
      return VERBS.filter((v) => {
        const r = d.verbs[v.inf];
        return r && r.fail > 0 && !isMastered(r);
      }).sort((a, b) => {
        const ra = d.verbs[a.inf], rb = d.verbs[b.inf];
        return (rb.fail - rb.ok) - (ra.fail - ra.ok);
      });
    }

    /** 弱點排序：失誤率高、box 低的優先 */
    function weakList(limit) {
      const d = load();
      const scored = VERBS.map((v) => {
        const r = d.verbs[v.inf];
        if (!r) return null;
        const total = r.ok + r.fail;
        if (!total) return null;
        const failRate = r.fail / total;
        return { v, r, score: failRate * 10 + (MASTER_BOX - Math.min(r.box, MASTER_BOX)) };
      }).filter(Boolean).filter((x) => x.r.fail > 0);
      scored.sort((a, b) => b.score - a.score);
      return limit ? scored.slice(0, limit) : scored;
    }

    function famStats() {
      const d = load();
      return Object.keys(FAMS).map((key) => {
        const list = VERBS.filter((v) => v.fam === key);
        let learned = 0, mastered = 0;
        list.forEach((v) => {
          const r = d.verbs[v.inf];
          if (isLearned(r)) learned += 1;
          if (isMastered(r)) mastered += 1;
        });
        return { key, label: FAMS[key].label, total: list.length, learned, mastered };
      });
    }

    function overall() {
      const d = load();
      let learned = 0, mastered = 0, answered = 0, correct = 0;
      VERBS.forEach((v) => {
        const r = d.verbs[v.inf];
        if (isLearned(r)) learned += 1;
        if (isMastered(r)) mastered += 1;
        if (r) { answered += r.ok + r.fail; correct += r.ok; }
      });
      return { total: VERBS.length, learned, mastered, answered, correct };
    }

    function historyDays(n) {
      const d = load();
      const out = [];
      for (let i = n - 1; i >= 0; i--) {
        const t = Date.now() - i * DAY;
        const k = todayKey(t);
        const h = d.history[k] || { answered: 0, correct: 0 };
        out.push({ key: k, label: k.slice(5), answered: h.answered, correct: h.correct });
      }
      return out;
    }

    function exportJSON() { return JSON.stringify(load(), null, 2); }

    /** 匯入：預設與本機合併（取較好的紀錄），mode="replace" 則整包覆蓋 */
    function importJSON(text, mode) {
      const incoming = JSON.parse(text);
      if (!incoming || typeof incoming !== "object" || !incoming.verbs) {
        throw new Error("格式不對：找不到 verbs 欄位");
      }
      if (mode === "replace") {
        data = Object.assign(blank(), incoming);
        save();
        return { mode: "replace", verbs: Object.keys(data.verbs).length };
      }
      const d = load();
      let merged = 0;
      Object.keys(incoming.verbs).forEach((inf) => {
        const a = d.verbs[inf], b = incoming.verbs[inf];
        if (!b) return;
        if (!a) { d.verbs[inf] = b; merged += 1; return; }
        /* 合併：次數相加，box/due 取進度較前面的（lastAt 較新者為準） */
        const newer = (b.lastAt || 0) > (a.lastAt || 0) ? b : a;
        d.verbs[inf] = {
          seen: (a.seen || 0) + (b.seen || 0),
          ok: (a.ok || 0) + (b.ok || 0),
          fail: (a.fail || 0) + (b.fail || 0),
          box: Math.max(a.box || 0, b.box || 0),
          due: newer.due || 0,
          lastAt: Math.max(a.lastAt || 0, b.lastAt || 0),
          touched: a.touched === true || b.touched === true,
        };
        merged += 1;
      });
      Object.keys(incoming.history || {}).forEach((k) => {
        const a = d.history[k] || { answered: 0, correct: 0 };
        const b = incoming.history[k];
        d.history[k] = {
          answered: Math.max(a.answered, b.answered || 0),
          correct: Math.max(a.correct, b.correct || 0),
        };
      });
      d.stars = Math.max(d.stars || 0, incoming.stars || 0);
      save();
      return { mode: "merge", verbs: merged };
    }

    function reset() { data = blank(); save(); }

    return { load, save, answer, touch, of, stars, isMastered, isLearned,
             dueList, wrongList, weakList, famStats, overall, historyDays,
             exportJSON, importJSON, reset, MASTER_BOX };
  })();

  /* =========================================================
   *  狀態
   * ========================================================= */
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
    ppOptions: [],
    famTab: "un",
    blitzTimer: null,
    blitzLeft: 0,
    blitzMode: null,
    blitzWrong: [],
    blitzDone: false,
    feedback: "",
    feedbackKind: "",
    backupMsg: "",
    backupKind: "",
  };

  /* ---------- utils ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function sample(arr, n, exclude) { return shuffle(arr.filter((x) => x !== exclude)).slice(0, n); }
  function auxWord(v) { return v.aux === "sein" ? "ist" : "hat"; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function js(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
  function normalize(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }
  function verbByInf(inf) { return VERBS.find((v) => v.inf === inf); }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function relTime(ts) {
    if (!ts) return "—";
    const diff = ts - Date.now();
    const abs = Math.abs(diff);
    const unit = abs < HOUR ? [Math.round(abs / MIN), "分鐘"] : abs < DAY ? [Math.round(abs / HOUR), "小時"] : [Math.round(abs / DAY), "天"];
    return diff <= 0 ? `已到期 ${unit[0]} ${unit[1]}` : `${unit[0]} ${unit[1]}後`;
  }

  let voices = [];
  function refreshVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch { voices = []; } }
  if ("speechSynthesis" in window) { refreshVoices(); window.speechSynthesis.onvoiceschanged = refreshVoices; }
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

  /* =========================================================
   *  render root
   * ========================================================= */
  function render() {
    const map = { home: renderHome, table: renderTable, grammar: renderGrammar,
                  stats: renderStats, backup: renderBackup, game: renderGame };
    (map[state.view] || renderHome)();
  }
  function go(view) { state.view = view; window.scrollTo(0, 0); render(); }
  function backBar(extra) {
    return `<div class="toolbar"><button class="back" onclick="PK.home()">← 返回</button>${extra || ""}</div>`;
  }
  function bar(cls, value) {
    return `<div class="prog-track"><i class="prog-fill ${cls}" style="width:${value}%"></i></div>`;
  }

  /* ---------- 首頁 ---------- */
  function renderHome() {
    const o = Store.overall();
    const due = Store.dueList().length;
    const wrong = Store.wrongList().length;
    const cats = [...new Set(GAMES.map((g) => g.cat))];
    const grid = cats.map((cat) => {
      const items = GAMES.filter((g) => g.cat === cat).map((g) => {
        const lvTxt = ["", "入門", "進階", "挑戰", "挑戰"][g.lv] || "";
        const badge = g.lv === 0 ? "" : `<span class="lv l${g.lv}">Lv.${g.lv} ${lvTxt}</span>`;
        let extra = "";
        if (g.id === "due" && due) extra = `<span class="badge">${due}</span>`;
        if (g.id === "review" && wrong) extra = `<span class="badge">${wrong}</span>`;
        return `<button class="game-btn" onclick="PK.start('${g.id}')">
          ${badge}${extra}
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
        <p class="tagline">涵蓋講義全部 <b>${o.total}</b> 個動詞。從速查、閃卡到句子重組、限時閃電，多角度反覆練。</p>
        <div class="hero-meta">
          <span class="stat">已掌握 ${o.mastered} / ${o.total}</span>
          <span class="stat gold">⭐ ${Store.stars()}</span>
          ${due ? `<span class="stat warn">待複習 ${due}</span>` : ""}
        </div>
        <div class="prog-row" style="margin-top:10px">
          <div class="prog-label"><span>掌握進度</span><span>${pct(o.mastered, o.total)}%</span></div>
          ${bar("master", pct(o.mastered, o.total))}
        </div>
      </div>
      ${due ? `<div class="card due-banner">
        <b>有 ${due} 個動詞到了複習時間</b>
        <p class="muted" style="margin:4px 0 0">按記憶曲線排程，現在複習效率最高。</p>
        <button class="primary" onclick="PK.start('due')">開始到期複習 →</button>
      </div>` : ""}
      ${grid}
      <div class="card soft center">
        <p class="muted" style="margin:0">紀錄自動存在這台裝置。換裝置前請到<b>「備份與轉移」</b>匯出，避免弄丟。</p>
      </div>
    `;
  }

  /* ---------- 速查表 ---------- */
  function renderTable() {
    const fam = state.famTab;
    const tabs = Object.values(FAMS).map((f) =>
      `<button class="fam-tab ${f.key === fam ? "on" : ""}" onclick="PK.famTab('${f.key}')">${esc(f.label)}</button>`).join("");
    const list = VERBS.filter((v) => v.fam === fam);
    const rows = list.map((v) => {
      const r = Store.of(v.inf);
      const mark = Store.isMastered(r) ? `<span class="dot ok" title="已掌握"></span>`
                 : r && r.fail > 0 ? `<span class="dot bad" title="曾答錯"></span>`
                 : r && r.seen >= 1 ? `<span class="dot mid" title="學過"></span>` : "";
      return `<tr>
        <td class="inf">${mark}${esc(v.inf)}<div class="muted" style="font-size:.82rem">${esc(v.zh)}</div></td>
        <td class="pp"><span class="aux">${auxWord(v)}</span> <span class="pp">${esc(v.pp)}</span></td>
        <td>${esc(v.ex)}${v.note ? `<div class="muted" style="font-size:.8rem;margin-top:3px">💡 ${esc(v.note)}</div>` : ""}
          <button class="speak" onclick="PK.speak('${js(v.ex)}')">🔊</button></td>
      </tr>`;
    }).join("");
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
      <p class="muted center">此類共 ${list.length} 個　<span class="dot ok"></span>已掌握　<span class="dot mid"></span>學過　<span class="dot bad"></span>曾答錯</p>
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
    app.innerHTML = `
      ${backBar(`<button class="ghost" onclick="PK.start('flash')">開始閃卡 →</button>`)}
      <h2 class="section-title">語法講解 · Perfekt</h2>
      ${cards.map((c) => `<div class="card rule-card"><h3>${c.h}</h3>${c.ps.map((p) => `<p>${p}</p>`).join("")}</div>`).join("")}
    `;
  }

  /* ---------- 學習紀錄 ---------- */
  function renderStats() {
    const o = Store.overall();
    const fams = Store.famStats();
    const weak = Store.weakList(12);
    const days = Store.historyDays(7);
    const due = Store.dueList();
    const maxAns = Math.max(1, ...days.map((d) => d.answered));

    const famRows = fams.map((f) => `
      <div class="prog-row">
        <div class="prog-label"><span>${esc(f.label)}</span><span>掌握 ${f.mastered}/${f.total}</span></div>
        ${bar("master", pct(f.mastered, f.total))}
        <div class="prog-label" style="margin-top:3px"><span class="muted">學過 ${f.learned}/${f.total}</span><span class="muted">${pct(f.learned, f.total)}%</span></div>
        ${bar("learn", pct(f.learned, f.total))}
      </div>`).join("");

    const weakRows = weak.length ? weak.map(({ v, r }) => {
      const total = r.ok + r.fail;
      return `<div class="weak-item">
        <div>
          <b>${esc(v.inf)}</b> <span class="muted">${esc(v.zh)}</span>
          <div class="muted" style="font-size:.85rem">${auxWord(v)} ${esc(v.pp)} · 對 ${r.ok} / 錯 ${r.fail}　下次 ${esc(relTime(r.due))}</div>
        </div>
        <span class="chip fam-${v.fam}">${esc(FAMS[v.fam].short)}</span>
      </div>`;
    }).join("") : `<p class="muted">還沒有失誤紀錄，先去練幾輪吧。</p>`;

    const histBars = days.map((d) => {
      const h = Math.round((d.answered / maxAns) * 100);
      const rate = d.answered ? pct(d.correct, d.answered) : 0;
      return `<div class="hist-col" title="${d.key}：答 ${d.answered} 題，正確率 ${rate}%">
        <div class="hist-bar"><i style="height:${h}%"></i></div>
        <span class="hist-lb">${esc(d.label)}</span>
        <span class="hist-n">${d.answered || ""}</span>
      </div>`;
    }).join("");

    app.innerHTML = `
      ${backBar(`<button class="ghost" onclick="PK.start('backup')">備份</button>`)}
      <h2 class="section-title">學習紀錄</h2>

      <div class="card">
        <div class="stat-row">
          <span class="stat">已掌握 ${o.mastered}/${o.total}</span>
          <span class="stat">學過 ${o.learned}/${o.total}</span>
          <span class="stat gold">⭐ ${Store.stars()}</span>
        </div>
        <div class="prog-row">
          <div class="prog-label"><span>掌握率</span><span>${pct(o.mastered, o.total)}%</span></div>
          ${bar("master", pct(o.mastered, o.total))}
        </div>
        <p class="muted" style="margin:8px 0 0">累計作答 ${o.answered} 題，總正確率 ${pct(o.correct, o.answered)}%。
        ${due.length ? `目前有 <b>${due.length}</b> 個動詞到期待複習。` : "目前沒有到期的複習。"}</p>
        ${due.length ? `<button class="primary" onclick="PK.start('due')">去複習這 ${due.length} 個 →</button>` : ""}
      </div>

      <div class="card">
        <h3>四大類掌握率</h3>
        <p class="muted" style="margin:0 0 8px;font-size:.88rem">深色＝已掌握（記憶曲線第 ${Store.MASTER_BOX} 階以上），淺色＝接觸過。</p>
        ${famRows}
      </div>

      <div class="card">
        <h3>每日練習趨勢（近 7 天）</h3>
        <div class="hist">${histBars}</div>
        <p class="muted" style="margin:6px 0 0;font-size:.88rem">長按/滑過柱子可看當天正確率。</p>
      </div>

      <div class="card">
        <h3>最需要加強的動詞</h3>
        <p class="muted" style="margin:0 0 8px;font-size:.88rem">依失誤率與記憶階段排序，前 12 名。</p>
        ${weakRows}
        ${weak.length ? `<button class="primary" onclick="PK.start('review')">專攻錯題本 →</button>` : ""}
      </div>
    `;
  }

  /* ---------- 備份與轉移 ---------- */
  function renderBackup() {
    const o = Store.overall();
    const d = Store.load();
    const msg = state.backupMsg
      ? `<div class="tip ${state.backupKind}">${esc(state.backupMsg)}</div>` : "";
    app.innerHTML = `
      ${backBar()}
      <h2 class="section-title">備份與轉移</h2>
      <div class="card">
        <p style="margin:0 0 6px">目前紀錄：<b>${Object.keys(d.verbs).length}</b> 個動詞、掌握 <b>${o.mastered}</b> 個、⭐ ${Store.stars()}。</p>
        <p class="muted" style="margin:0">紀錄存在這台裝置的瀏覽器裡。清除瀏覽資料、換手機、或 iPhone 長期不開都可能弄丟，建議定期匯出。</p>
      </div>

      <div class="card">
        <h3>1 · 匯出備份</h3>
        <p class="muted" style="margin:0 0 8px">下載成檔案，或複製文字傳到另一台裝置。</p>
        <button class="primary" onclick="PK.exportFile()">下載備份檔</button>
        <button class="ghost" style="width:100%;margin-top:8px" onclick="PK.copyBackup()">複製到剪貼簿</button>
      </div>

      <div class="card">
        <h3>2 · 匯入還原</h3>
        <p class="muted" style="margin:0 0 8px">貼上備份文字，或選擇備份檔。<b>合併</b>會把兩邊紀錄相加（推薦跨裝置用）；<b>覆蓋</b>會丟掉本機現有紀錄。</p>
        <input type="file" accept=".json,application/json" onchange="PK.importFile(event)" style="margin-bottom:8px" />
        <textarea class="backup-box" id="importBox" placeholder="在這裡貼上備份文字…"></textarea>
        <div class="choices two" style="margin-top:8px">
          <button class="choice" onclick="PK.importText('merge')">合併匯入</button>
          <button class="choice" onclick="PK.importText('replace')">覆蓋匯入</button>
        </div>
      </div>
      ${msg}

      <div class="card">
        <h3>危險區</h3>
        <p class="muted" style="margin:0 0 8px">把所有學習紀錄歸零，無法復原。</p>
        <button class="danger" onclick="PK.resetAll()">清除全部紀錄</button>
      </div>
    `;
  }

  function exportFile() {
    try {
      const blob = new Blob([Store.exportJSON()], { type: "application/json" });
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = URL.createObjectURL(blob);
      a.download = `perfekt-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      flashBackup("已下載備份檔，請存到雲端硬碟或傳給自己。", "ok");
    } catch (e) { flashBackup("下載失敗：" + e.message, "bad"); }
  }
  async function copyBackup() {
    const text = Store.exportJSON();
    try {
      await navigator.clipboard.writeText(text);
      flashBackup("已複製到剪貼簿，貼到另一台裝置的匯入框即可。", "ok");
    } catch {
      const box = document.getElementById("importBox");
      if (box) { box.value = text; box.select(); }
      flashBackup("無法自動複製，備份文字已填到下面的框，請手動全選複製。", "");
    }
  }
  function importText(mode) {
    const box = document.getElementById("importBox");
    const text = box ? box.value.trim() : "";
    if (!text) return flashBackup("請先貼上備份文字。", "bad");
    doImport(text, mode);
  }
  function importFile(ev) {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => doImport(String(fr.result), "merge");
    fr.onerror = () => flashBackup("讀檔失敗。", "bad");
    fr.readAsText(f);
  }
  function doImport(text, mode) {
    try {
      const res = Store.importJSON(text, mode);
      flashBackup(`匯入成功（${res.mode === "replace" ? "覆蓋" : "合併"}）：${res.verbs} 個動詞紀錄。`, "ok");
    } catch (e) { flashBackup("匯入失敗：" + e.message, "bad"); }
  }
  function flashBackup(msg, kind) {
    state.backupMsg = msg;
    state.backupKind = kind || "";
    render();
  }
  function resetAll() {
    if (!window.confirm("確定要清除全部學習紀錄嗎？此動作無法復原。建議先匯出備份。")) return;
    Store.reset();
    flashBackup("已清除全部紀錄。", "");
  }

  /* =========================================================
   *  遊戲
   * ========================================================= */
  function buildDeck(gameId) {
    if (gameId === "review") return Store.wrongList();
    if (gameId === "due") {
      const due = Store.dueList();
      if (due.length) return due;
      /* 沒有到期的就練還沒掌握的 */
      return shuffle(VERBS.filter((v) => !Store.isMastered(Store.of(v.inf))));
    }
    return shuffle(VERBS.slice());
  }

  function start(gameId) {
    if (gameId === "table") return go("table");
    if (gameId === "grammar") return go("grammar");
    if (gameId === "stats") return go("stats");
    if (gameId === "backup") { state.backupMsg = ""; return go("backup"); }
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
    if (!v) return;
    if (state.game === "build") setupBuild(v);
    if (state.game === "ppchoice" || state.game === "review" || state.game === "due") setupPpChoice(v);
  }

  function current() { return state.deck[state.idx]; }

  function next() {
    if (state.game === "blitz") return blitzNext();
    state.idx += 1;
    if (state.idx >= state.deck.length) return renderDone();
    resetQuestion();
    render();
  }

  function renderGame() {
    const g = state.game;
    if (g === "blitz") return renderBlitz();
    if (!state.deck.length) return renderEmptyDeck();
    if (!current()) return renderDone();
    const map = { flash: renderFlash, aux: renderAux, ppchoice: renderPpChoice,
                  family: renderFamily, spell: renderSpell, build: renderBuild,
                  review: renderPpChoice, due: renderPpChoice };
    (map[g] || renderHome)();
  }

  function renderEmptyDeck() {
    const isReview = state.game === "review";
    app.innerHTML = `
      ${backBar()}
      <div class="card center">
        <div class="done-face">🎉</div>
        <h2>${isReview ? "錯題本是空的" : "目前沒有到期的複習"}</h2>
        <p class="muted">${isReview
          ? "答錯的動詞會自動收進來。先去玩其他模式吧。"
          : "所有動詞都還在記憶曲線的等待期。可以先練「分詞選擇」或「限時閃電」。"}</p>
        <button class="primary" onclick="PK.home()">回首頁挑一個開始</button>
      </div>`;
  }

  function headerBar() {
    const total = state.deck.length;
    const shown = Math.min(state.idx + 1, total);
    const pctv = total ? Math.round((state.idx / total) * 100) : 0;
    const title = (GAMES.find((x) => x.id === state.game) || {}).title || "";
    return `
      ${backBar(`<span class="chip">${shown} / ${total}</span><span class="chip gold">✔ ${state.score}</span>`)}
      <div class="progress-top"><i style="width:${pctv}%"></i></div>
      <p class="eyebrow">${esc(title)}</p>`;
  }

  function famChip(v) { return `<span class="chip fam-${v.fam}">${esc(FAMS[v.fam].short)}</span>`; }

  /* ---------- 閃卡 ---------- */
  function renderFlash() {
    const v = current();
    Store.touch(v.inf);
    const front = `
      <div class="big big-inf">${esc(v.inf)}</div>
      <div class="zh-line">${esc(v.zh)}</div>
      <div class="flip-hint">點卡片看答案</div>`;
    const back = `
      <div class="big big-inf">${esc(v.inf)}</div>
      <div class="pp-line"><span class="aux">${auxWord(v)}</span> <span class="pp">${esc(v.pp)}</span></div>
      <button class="speak" onclick="event.stopPropagation();PK.speak('${js(v.inf + ", " + auxWord(v) + " " + v.pp)}')">🔊 發音</button>
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
        </div>` : `<button class="primary" onclick="PK.flip()">翻卡</button>`}`;
  }
  function flip() { state.flip = !state.flip; render(); }
  function flashJudge(known) {
    const v = current();
    Store.answer(v.inf, known);
    if (known) state.score += 1;
    next();
  }

  /* ---------- haben / sein ---------- */
  function renderAux() {
    const v = current();
    const opts = [{ k: "haben", sub: "hat " + v.pp }, { k: "sein", sub: "ist " + v.pp }];
    const btns = opts.map((o) => {
      let cls = "choice";
      if (state.answered) {
        if (o.k === v.aux) cls += " ok";
        else if (o.k === state.selected) cls += " bad";
      }
      return `<button class="${cls}" ${state.answered ? "disabled" : ""} onclick="PK.answerAux('${o.k}')">
        ${o.k}<span class="sub">${esc(o.sub)}</span></button>`;
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
      ${state.answered ? nextBtn() : ""}`;
  }
  function answerAux(k) {
    if (state.answered) return;
    const v = current();
    state.answered = true;
    state.selected = k;
    judge(v, k === v.aux, `${v.aux} → ${auxWord(v)} ${v.pp}`);
    render();
  }

  /* ---------- 分詞選擇（也給錯題本/到期複習用） ---------- */
  function setupPpChoice(v) {
    const pool = new Set(sample(VERBS.filter((x) => x.fam === v.fam), 3, v).map((x) => x.pp));
    pool.delete(v.pp);
    while (pool.size < 3) {
      const r = VERBS[Math.floor(Math.random() * VERBS.length)];
      if (r.pp !== v.pp) pool.add(r.pp);
    }
    state.ppOptions = shuffle([v.pp, ...[...pool].slice(0, 3)]);
  }
  function renderPpChoice() {
    const v = current();
    const btns = state.ppOptions.map((pp) => {
      let cls = "choice";
      if (state.answered) {
        if (pp === v.pp) cls += " ok";
        else if (pp === state.selected) cls += " bad";
      }
      return `<button class="${cls}" ${state.answered ? "disabled" : ""} onclick="PK.answerPp('${js(pp)}')">${esc(pp)}</button>`;
    }).join("");
    const r = Store.of(v.inf);
    const hint = r && r.fail > 0 ? `<p class="muted" style="font-size:.85rem">你之前錯過 ${r.fail} 次</p>` : "";
    app.innerHTML = `
      ${headerBar()}
      <div class="card center">
        ${famChip(v)}
        <div class="big big-inf">${esc(v.inf)}</div>
        <div class="zh-line">${esc(v.zh)}</div>
        ${hint}
        <p class="muted">正確的第二分詞 Partizip II 是？</p>
      </div>
      <div class="choices four">${btns}</div>
      ${feedbackBox(v)}
      ${state.answered ? nextBtn() : ""}`;
  }
  function answerPp(pp) {
    if (state.answered) return;
    const v = current();
    state.answered = true;
    state.selected = pp;
    judge(v, pp === v.pp, `${v.inf} → ${auxWord(v)} ${v.pp}`);
    render();
  }

  /* ---------- 分類 ---------- */
  function renderFamily() {
    const v = current();
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
      ${state.answered ? nextBtn() : ""}`;
  }
  function answerFam(k) {
    if (state.answered) return;
    const v = current();
    const ok = k === v.fam;
    state.answered = true;
    state.selected = k;
    Store.answer(v.inf, ok);
    if (ok) state.score += 1;
    state.feedbackKind = ok ? "ok" : "bad";
    state.feedback = `${ok ? "✔ 正確！" : "✘ 這是「" + FAMS[v.fam].label + "」"}\n${FAMS[v.fam].rule}`;
    render();
  }

  /* ---------- 拼寫 ---------- */
  function renderSpell() {
    const v = current();
    const gap = v.ex.replace(v.pp, "＿＿＿＿");
    const cls = state.answered ? (state.feedbackKind === "ok" ? "spell ok" : "spell bad") : "spell";
    const keys = ["ä", "ö", "ü", "ß"].map((c) => `<button onclick="PK.spellKey('${c}')">${c}</button>`).join("");
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
      ${state.answered ? nextBtn() : `<button class="primary" onclick="PK.spellSubmit()">確認</button>`}`;
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
    state.answered = true;
    judge(v, normalize(state.spellVal) === normalize(v.pp), `${v.inf} → ${auxWord(v)} ${v.pp}`);
    render();
  }

  /* ---------- 句子重組 ---------- */
  function setupBuild(v) {
    const words = v.ex.replace(/\s+/g, " ").trim().split(" ");
    state.buildAnswer = words;
    state.buildPicked = [];
    state.buildPool = shuffle(words.map((w, i) => ({ w, id: i })));
  }
  function renderBuild() {
    const v = current();
    const picked = state.buildPicked.map((p) =>
      `<button class="word-chip on" onclick="PK.buildUnpick(${p.id})">${esc(p.w)}</button>`).join("");
    const pool = state.buildPool.filter((p) => !state.buildPicked.some((x) => x.id === p.id))
      .map((p) => `<button class="word-chip" onclick="PK.buildPick(${p.id})">${esc(p.w)}</button>`).join("");
    app.innerHTML = `
      ${headerBar()}
      <div class="card">
        ${famChip(v)}
        <p class="muted" style="margin:4px 0">把下面的詞排成正確的 Perfekt 句子（分詞放句尾）：</p>
        <div class="zh-line">${esc(v.inf)} · ${esc(v.zh)}</div>
        <div class="build-line">${picked || '<span class="muted">點下面的詞…</span>'}</div>
        <div class="word-pool">${pool}</div>
      </div>
      ${feedbackBox(v)}
      ${state.answered ? nextBtn() : `<button class="primary" onclick="PK.buildCheck()">確認</button>`}`;
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
    const want = state.buildAnswer.join(" ");
    state.answered = true;
    judge(v, state.buildPicked.map((p) => p.w).join(" ") === want, `正解：${want}`);
    render();
  }

  /* ---------- 限時閃電 ---------- */
  function startBlitz() {
    state.game = "blitz";
    state.deck = shuffle(VERBS.slice());
    state.idx = 0;
    state.score = 0;
    state.blitzLeft = 60;
    state.blitzWrong = [];
    state.blitzDone = false;
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
    state.blitzMode = Math.random() < 0.45 ? "aux" : "pp";
    if (state.blitzMode === "pp" && v) setupPpChoice(v);
    state.answered = false;
    state.selected = null;
  }
  function blitzNext() {
    state.idx += 1;
    if (state.idx >= state.deck.length) state.idx = 0;
    blitzSetup();
    render();
  }
  function renderBlitz() {
    if (state.blitzDone) return endBlitzScreen();
    const v = current();
    if (!v) return endBlitzScreen();
    const body = state.blitzMode === "aux"
      ? `<p class="muted center">助動詞？</p>
         <div class="choices two">
           <button class="choice" onclick="PK.blitzAns('haben')">haben (hat)</button>
           <button class="choice" onclick="PK.blitzAns('sein')">sein (ist)</button>
         </div>`
      : `<p class="muted center">正確分詞？</p><div class="choices four">${
          state.ppOptions.map((pp) => `<button class="choice" onclick="PK.blitzAns('${js(pp)}')">${esc(pp)}</button>`).join("")
        }</div>`;
    app.innerHTML = `
      ${backBar(`<span class="chip gold" id="blitzClock">${state.blitzLeft}s</span><span class="chip">✔ ${state.score}</span>`)}
      <div class="card center">
        ${famChip(v)}
        <div class="big big-inf">${esc(v.inf)}</div>
        <div class="zh-line">${esc(v.zh)}</div>
      </div>
      ${body}`;
  }
  function blitzAns(val) {
    const v = current();
    const ok = state.blitzMode === "aux" ? val === v.aux : val === v.pp;
    Store.answer(v.inf, ok);
    if (ok) state.score += 1;
    else if (!state.blitzWrong.includes(v.inf)) state.blitzWrong.push(v.inf);
    blitzNext();
  }
  function endBlitz() { clearInterval(state.blitzTimer); state.blitzDone = true; render(); }
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
        <button class="ghost" style="width:100%;margin-top:8px" onclick="PK.start('stats')">看學習紀錄</button>
        <button class="back" style="width:100%;margin-top:8px" onclick="PK.home()">回首頁</button>
      </div>`;
  }

  /* ---------- 共用 ---------- */
  function judge(v, ok, correctText) {
    Store.answer(v.inf, ok);
    if (ok) state.score += 1;
    state.feedbackKind = ok ? "ok" : "bad";
    let msg = (ok ? "✔ 正確！" : "✘ 再看一次：") + `\n<b>${esc(correctText)}</b>`;
    if (!ok && v.note) msg += `\n💡 ${esc(v.note)}`;
    if (v.ex) msg += `\n例：${esc(v.ex)}`;
    state.feedback = msg;
  }
  function feedbackBox(v) {
    if (!state.answered || !state.feedback) return "";
    return `<div class="tip ${state.feedbackKind}">${state.feedback}
      <button class="speak" onclick="PK.speak('${js(v.ex)}')">🔊 例句</button></div>`;
  }
  function nextBtn() {
    const last = state.idx >= state.deck.length - 1;
    return `<button class="primary" onclick="PK.next()">${last ? "看結果 →" : "下一題 →"}</button>`;
  }

  function renderDone() {
    const total = state.deck.length;
    const rate = pct(state.score, total);
    const face = rate >= 90 ? "🏆" : rate >= 70 ? "🎉" : rate >= 50 ? "💪" : "📚";
    const wrong = Store.wrongList().length;
    const due = Store.dueList().length;
    app.innerHTML = `
      ${backBar()}
      <div class="card center">
        <div class="done-face">${face}</div>
        <h2>本輪完成</h2>
        <div class="stat-row">
          <span class="stat gold">答對 ${state.score} / ${total}</span>
          <span class="stat">正確率 ${rate}%</span>
        </div>
        <p class="muted">紀錄已存檔，並依記憶曲線安排了下次複習時間。</p>
        <button class="primary" onclick="PK.start('${state.game}')">再練一輪</button>
        ${due ? `<button class="ghost" style="width:100%;margin-top:8px" onclick="PK.start('due')">到期複習 (${due})</button>` : ""}
        ${wrong ? `<button class="ghost" style="width:100%;margin-top:8px" onclick="PK.start('review')">錯題本 (${wrong})</button>` : ""}
        <button class="back" style="width:100%;margin-top:8px" onclick="PK.start('stats')">看學習紀錄</button>
        <button class="back" style="width:100%;margin-top:8px" onclick="PK.home()">回首頁</button>
      </div>`;
  }

  /* ---------- public API ---------- */
  window.PK = {
    home: () => { clearInterval(state.blitzTimer); state.blitzDone = false; go("home"); },
    start, next, flip, flashJudge, answerAux, answerPp, answerFam,
    spellInput, spellKey, spellSubmit, buildPick, buildUnpick, buildCheck, blitzAns,
    famTab: (k) => { state.famTab = k; render(); },
    speak,
    exportFile, copyBackup, importText, importFile, resetAll,
  };

  Store.load();
  render();
})();
