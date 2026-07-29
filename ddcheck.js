/* 题库自检：改完 deutsch-drill-data.js 就跑一次 `node ddcheck.js` */
global.window = global;
global.document = {
  getElementById: () => ({ innerHTML: "", addEventListener() {} }),
  addEventListener() {},
  createElement: () => ({ click() {} }),
};
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); },
};
global.speechSynthesis = null;

require("./deutsch-drill-data.js");
const D = global.DEUTSCH_DRILL;

let bad = 0;
const err = (m) => { console.log("  ✗ " + m); bad++; };

/* --- 1. 每道原始习题：答案必须在选项里，选项不能重复 --- */
function checkItems(list, name) {
  list.forEach((it, i) => {
    const at = `${name}[${i}] "${it.q}"`;
    if (!it.q || !it.a || !Array.isArray(it.o)) return err(`${at} 字段缺失`);
    if (it.o.indexOf(it.a) < 0) err(`${at} 答案 "${it.a}" 不在选项 ${JSON.stringify(it.o)} 里`);
    if (new Set(it.o).size !== it.o.length) err(`${at} 选项有重复 ${JSON.stringify(it.o)}`);
    if (!it.why) err(`${at} 缺解析`);
    if (!it.zh) err(`${at} 缺中文`);
    if (!it.tag) err(`${at} 缺 tag`);
    const nb = (it.q.match(/_{2,}/g) || []).length;
    if (nb === 0 && !/？|\?/.test(it.q)) err(`${at} 既没有空也不是问句`);
  });
}
console.log("检查原始习题…");
checkItems(D.caseItems, "caseItems");
checkItems(D.bodyItems, "bodyItems");
checkItems(D.sepItems, "sepItems");

/* --- 2. 身体名词 --- */
console.log("检查身体名词…");
const seenBody = new Set();
D.body.forEach((w) => {
  const at = `body "${w.de}"`;
  if (!["der", "die", "das"].includes(w.art)) err(`${at} 冠词不对：${w.art}`);
  if (!w.pl) err(`${at} 缺复数`);
  if (!w.zh) err(`${at} 缺中文`);
  if (!D.bodyGroups.some((g) => g.id === w.grp)) err(`${at} 分组 ${w.grp} 不存在`);
  if (seenBody.has(w.de)) err(`${at} 重复`);
  seenBody.add(w.de);
  if (w.pl !== "—" && !w.pl.startsWith("die ")) err(`${at} 复数应以 "die " 开头：${w.pl}`);
});

/* --- 3. 可分动词 --- */
console.log("检查可分动词…");
const seenVerb = new Set();
D.sepVerben.forEach((v) => {
  const at = `sepVerben "${v.inf}"`;
  if (seenVerb.has(v.inf)) err(`${at} 重复`);
  seenVerb.add(v.inf);
  if (!v.inf.startsWith(v.pre)) err(`${at} 前缀 ${v.pre} 与原形不匹配`);
  const inTrenn = D.prefixTrenn.includes(v.pre);
  const inUntrenn = D.prefixUntrenn.includes(v.pre);
  if (v.sep && !inTrenn) err(`${at} 标为可分，但前缀 ${v.pre} 不在可分表里`);
  if (!v.sep && !inUntrenn) err(`${at} 标为不可分，但前缀 ${v.pre} 不在不可分表里`);
  if (inTrenn && inUntrenn) err(`${at} 前缀 ${v.pre} 同时在两张表里`);
  if (!v.ex || !v.exZh) err(`${at} 缺例句`);
  /* 可分动词的例句里，变位部分应该出现 */
  if (v.sep && v.ex.toLowerCase().indexOf(v.stem.toLowerCase()) < 0) {
    err(`${at} 例句里找不到变位形式 ${v.stem}：${v.ex}`);
  }
  /* 可分动词例句里不该出现完整原形（那就说明没拆） */
  if (v.sep && new RegExp("\\b" + v.inf + "\\b", "i").test(v.ex)) {
    err(`${at} 例句里动词没拆开：${v.ex}`);
  }
});

/* --- 4. 前缀归位题能生成多少 --- */
const tail = /\s([a-zäöüß]+)([.!?])$/i;
const tailable = D.sepVerben.filter((v) => {
  const m = v.ex.match(tail);
  return v.sep && m && m[1].toLowerCase() === v.pre.toLowerCase();
});
console.log(`前缀归位题可生成 ${tailable.length} 道（可分动词共 ${D.sepVerben.filter((v) => v.sep).length} 个）`);
if (tailable.length < 12) err("前缀归位题太少，练习会重复");

/* --- 5. 人称代词表 --- */
console.log("检查代词表…");
D.pronomen.forEach((p) => {
  if (!p.nom || !p.akk || !p.dat || !p.zh) err(`pronomen ${p.nom} 字段缺失`);
});

/* --- 6. 讲解卡片 --- */
console.log("检查讲解卡片…");
[["caseRules", D.caseRules], ["bodyRules", D.bodyRules], ["sepRules", D.sepRules]].forEach(([n, rs]) => {
  rs.forEach((r) => {
    const at = `${n} "${r.title}"`;
    if (!r.intro || !r.steps || !r.steps.length) err(`${at} 缺 intro/steps`);
    if (!r.examples || !r.examples.length) err(`${at} 缺例句`);
    r.examples.forEach((ex) => {
      if (!ex.de || !ex.zh || !ex.chain || !ex.chain.length) err(`${at} 例句字段缺失：${ex.de}`);
      /* mark 必须真的出现在句子里，不然高亮会失效。可分动词那种要高亮两段的写成数组。 */
      if (ex.mark) {
        let from = 0;
        (Array.isArray(ex.mark) ? ex.mark : [ex.mark]).forEach((m) => {
          const at2 = ex.de.indexOf(m, from);
          if (at2 < 0) err(`${at} 例句 "${ex.de}" 里（第 ${from} 位之后）找不到要高亮的 "${m}"`);
          else from = at2 + m.length;
        });
      }
    });
  });
});

/* --- 7. 句子重组 --- */
console.log("检查句子重组…");
const buildTags = ["build-sep", "build-nosplit", "build-dual", "build-body"];
const key = (s) => s.trim().toLowerCase().split(/\s+/).sort().join(" ");
D.buildSaetze.forEach((s, i) => {
  const at = `buildSaetze[${i}] "${(s.ok || [])[0]}"`;
  if (!s.ok || !s.ok.length) return err(`${at} 缺 ok`);
  if (!s.end) err(`${at} 缺句末标点`);
  if (!s.zh || !s.why) err(`${at} 缺中文或解析`);
  if (buildTags.indexOf(s.tag) < 0) err(`${at} tag 不认识：${s.tag}`);
  /* 词块是从 ok[0] 发的，别的答案必须用同一批词，否则玩家永远拼不出来 */
  const base = key(s.ok[0]);
  s.ok.slice(1).forEach((alt) => {
    if (key(alt) !== base) err(`${at} 备选语序用词对不上：${alt}`);
  });
  if (new Set(s.ok.map((x) => x.trim().toLowerCase())).size !== s.ok.length) {
    err(`${at} 备选语序有重复`);
  }
  /* 句子里不该混进标点，标点统一放 end */
  s.ok.forEach((alt) => {
    if (/[.?!]/.test(alt)) err(`${at} 句子里带了句末标点：${alt}`);
  });
});

/* --- 8. 选项撞车：中文提示重复会让题目出现两个正确答案 --- */
console.log("检查选项撞车…");
function uniq(list, field, name) {
  const seen = {};
  list.forEach((x) => {
    const v = x[field];
    if (!v || v === "—") return;
    if (seen[v]) err(`${name} 的 ${field} 重复："${v}"（${seen[v]} / ${x.de || x.inf}）`);
    else seen[v] = x.de || x.inf;
  });
}
uniq(D.body, "zh", "body");        // 中译德 / 拼写题拿 zh 当题干
uniq(D.body, "pl", "body");        // 复数题拿别人的 pl 当干扰项
uniq(D.sepVerben, "zh", "sepVerben");

/* --- 9. 题量统计 --- */
const tagCount = {};
[...D.caseItems, ...D.bodyItems, ...D.sepItems].forEach((it) => {
  tagCount[it.tag] = (tagCount[it.tag] || 0) + 1;
});
console.log("\n每类题量：");
Object.keys(tagCount).sort().forEach((t) => {
  const n = tagCount[t];
  console.log(`  ${t.padEnd(12)} ${n}${n < 6 ? "   ← 偏少" : ""}`);
});
console.log(`  身体名词生成    ${D.body.length} × 4 类（冠词/中译德/复数/拼写）`);
console.log(`  可分动词生成    ${D.sepVerben.length} × 3 类 + 前缀归位 ${tailable.length}`);
const bt = {};
D.buildSaetze.forEach((s) => { bt[s.tag] = (bt[s.tag] || 0) + 1; });
console.log(`  句子重组        ${D.buildSaetze.length}（${Object.keys(bt).sort().map((k) => k + " " + bt[k]).join(" / ")}）`);

console.log(bad ? `\n发现 ${bad} 个问题` : "\n全部通过");
process.exit(bad ? 1 : 0);
