/**
 * 德语专项训练 · 内容数据
 *
 * 三个模块，按一条线串起来：
 *   1. 三格四格（Dativ / Akkusativ）—— 德语最核心的难点
 *   2. 身体部位名词 —— 正好是三格用得最多的场景（Mir tut der Kopf weh）
 *   3. 可分动词 —— 前缀跑到句末，语序问题
 *
 * 习题字段：
 *   q    : 题目，用 ___ 表示要填的空
 *   zh   : 中文意思
 *   a    : 正确答案
 *   o    : 选项（含正确答案，显示时会打乱）
 *   why  : 为什么选这个，答完给出的解析
 *   tag  : 归类，用于「弱项加强」按类型出题
 */
window.DEUTSCH_DRILL = {
  /* =========================================================
   * 模块一 · 三格四格
   * ========================================================= */

  /** 定冠词 / 不定冠词 / 物主代词的变格表 */
  artikel: {
    cases: ["Nominativ 一格", "Akkusativ 四格", "Dativ 三格"],
    rows: [
      { label: "阳性 der", nom: "der / ein / mein", akk: "den / einen / meinen", dat: "dem / einem / meinem" },
      { label: "中性 das", nom: "das / ein / mein", akk: "das / ein / mein", dat: "dem / einem / meinem" },
      { label: "阴性 die", nom: "die / eine / meine", akk: "die / eine / meine", dat: "der / einer / meiner" },
      { label: "复数 die", nom: "die / — / meine", akk: "die / — / meine", dat: "den / — / meinen" },
    ],
    note: "只有阳性在四格会变（der → den），中性和阴性四格跟一格一样。三格四个都要变，复数三格名词还要额外加 -n（den Kindern）。",
  },

  /** 人称代词的一格 / 四格 / 三格 */
  pronomen: [
    { nom: "ich", akk: "mich", dat: "mir", zh: "我" },
    { nom: "du", akk: "dich", dat: "dir", zh: "你" },
    { nom: "er", akk: "ihn", dat: "ihm", zh: "他" },
    { nom: "sie", akk: "sie", dat: "ihr", zh: "她" },
    { nom: "es", akk: "es", dat: "ihm", zh: "它" },
    { nom: "wir", akk: "uns", dat: "uns", zh: "我们" },
    { nom: "ihr", akk: "euch", dat: "euch", zh: "你们" },
    { nom: "sie", akk: "sie", dat: "ihnen", zh: "他们" },
    { nom: "Sie", akk: "Sie", dat: "Ihnen", zh: "您（敬称）" },
  ],

  /** 支配四格的常见动词 */
  akkVerben: [
    { de: "sehen", zh: "看见" }, { de: "haben", zh: "有" }, { de: "kaufen", zh: "买" },
    { de: "essen", zh: "吃" }, { de: "trinken", zh: "喝" }, { de: "lesen", zh: "读" },
    { de: "brauchen", zh: "需要" }, { de: "suchen", zh: "找" }, { de: "finden", zh: "找到" },
    { de: "besuchen", zh: "拜访" }, { de: "fragen", zh: "问" }, { de: "verstehen", zh: "理解" },
    { de: "nehmen", zh: "拿" }, { de: "machen", zh: "做" }, { de: "lieben", zh: "爱" },
    { de: "mögen", zh: "喜欢" }, { de: "kennen", zh: "认识" }, { de: "bestellen", zh: "点餐" },
  ],

  /** 支配三格的动词 —— 这些必须背，因为跟中文语感对不上 */
  datVerben: [
    { de: "helfen", zh: "帮助", ex: "Ich helfe meinem Bruder.", exZh: "我帮我弟弟。" },
    { de: "danken", zh: "感谢", ex: "Ich danke dir.", exZh: "我谢谢你。" },
    { de: "gefallen", zh: "使…喜欢", ex: "Das Bild gefällt mir.", exZh: "我喜欢这幅画。" },
    { de: "gehören", zh: "属于", ex: "Das Buch gehört mir.", exZh: "这书是我的。" },
    { de: "passen", zh: "合适（尺寸/时间）", ex: "Die Hose passt mir nicht.", exZh: "这条裤子我穿不合身。" },
    { de: "schmecken", zh: "好吃、合口味", ex: "Die Suppe schmeckt mir.", exZh: "这汤我觉得好吃。" },
    { de: "antworten", zh: "回答（某人）", ex: "Er antwortet dem Lehrer.", exZh: "他回答老师。" },
    { de: "glauben", zh: "相信（某人）", ex: "Ich glaube dir.", exZh: "我相信你。" },
    { de: "folgen", zh: "跟随", ex: "Der Hund folgt dem Kind.", exZh: "狗跟着孩子。" },
    { de: "gratulieren", zh: "祝贺", ex: "Wir gratulieren dir.", exZh: "我们祝贺你。" },
    { de: "zuhören", zh: "倾听", ex: "Ich höre der Lehrerin zu.", exZh: "我听老师讲。" },
    { de: "wehtun", zh: "疼", ex: "Der Kopf tut mir weh.", exZh: "我头疼。" },
    { de: "fehlen", zh: "缺少、想念", ex: "Du fehlst mir.", exZh: "我想你。" },
    { de: "schenken", zh: "赠送", ex: "Ich schenke ihm ein Buch.", exZh: "我送他一本书。" },
    { de: "vertrauen", zh: "信任", ex: "Sie vertraut ihrer Freundin.", exZh: "她信任她的朋友。" },
    { de: "begegnen", zh: "遇到", ex: "Ich bin ihm begegnet.", exZh: "我遇到他了。" },
  ],

  /** 双宾语动词：人用三格，物用四格 */
  dualVerben: [
    { de: "geben", zh: "给" }, { de: "schenken", zh: "送" }, { de: "zeigen", zh: "展示" },
    { de: "bringen", zh: "带来" }, { de: "erklären", zh: "解释" }, { de: "empfehlen", zh: "推荐" },
    { de: "schicken", zh: "寄" }, { de: "leihen", zh: "借" }, { de: "erzählen", zh: "讲述" },
    { de: "kaufen", zh: "买（给某人）" }, { de: "sagen", zh: "说" }, { de: "wünschen", zh: "祝愿" },
  ],

  /** 只支配四格的介词 */
  prepAkk: [
    { de: "durch", zh: "穿过" }, { de: "für", zh: "为了" }, { de: "gegen", zh: "反对、朝" },
    { de: "ohne", zh: "没有" }, { de: "um", zh: "围绕、在（点钟）" }, { de: "bis", zh: "直到" },
  ],

  /** 只支配三格的介词 */
  prepDat: [
    { de: "aus", zh: "从…出来" }, { de: "bei", zh: "在…旁边、在…处" }, { de: "mit", zh: "和…一起、用" },
    { de: "nach", zh: "去（地名）、之后" }, { de: "seit", zh: "自从" }, { de: "von", zh: "从、的" },
    { de: "zu", zh: "去（人/机构）" }, { de: "gegenüber", zh: "对面" },
  ],

  /** 双向介词：Wohin? 用四格，Wo? 用三格 */
  prepWechsel: [
    { de: "in", zh: "在…里 / 进…里" }, { de: "an", zh: "靠着、在…边上" }, { de: "auf", zh: "在…上面" },
    { de: "über", zh: "在…上方" }, { de: "unter", zh: "在…下面" }, { de: "vor", zh: "在…前面" },
    { de: "hinter", zh: "在…后面" }, { de: "neben", zh: "在…旁边" }, { de: "zwischen", zh: "在…之间" },
  ],

  /** 三格四格的讲解卡片 */
  caseRules: [
    {
      id: "c1",
      title: "第一步：看动词支配哪个格",
      intro: "德语的「格」是标记名词在句子里扮演什么角色。大部分动词后面跟四格（直接宾语），但有一小批动词偏偏跟三格，这批必须硬背。",
      steps: [
        "绝大多数动词 → 四格：sehen、kaufen、essen、brauchen…",
        "一小批动词 → 三格：helfen、danken、gefallen、gehören、passen、schmecken、antworten、glauben…",
        "判断出格以后，再看名词的性别，最后查表得出冠词。",
      ],
      examples: [
        { de: "Ich sehe den Mann.", mark: "den Mann", zh: "我看见那个男人。", chain: ["sehen 支配四格", "der Mann 阳性", "阳性四格 → den"] },
        { de: "Ich helfe dem Mann.", mark: "dem Mann", zh: "我帮那个男人。", chain: ["helfen 支配三格（要背）", "der Mann 阳性", "阳性三格 → dem"] },
      ],
    },
    {
      id: "c2",
      title: "第二步：查冠词表",
      intro: "记住一句话就够了：只有阳性在四格会变。中性和阴性的四格跟一格长得一模一样，所以四格其实只要认一个 den。",
      steps: [
        "四格：阳性 der → den，其他三个不变。",
        "三格：der → dem，das → dem，die → der，复数 die → den。",
        "复数三格名词本身还要加 -n：mit den Kindern、mit den Freunden。",
      ],
      examples: [
        { de: "Ich kaufe das Buch.", mark: "das Buch", zh: "我买这本书。", chain: ["kaufen 支配四格", "das Buch 中性", "中性四格不变 → das"] },
        { de: "Ich spiele mit den Kindern.", mark: "den Kindern", zh: "我和孩子们玩。", chain: ["mit 支配三格", "复数", "复数三格 → den，名词加 -n → Kindern"] },
      ],
    },
    {
      id: "c3",
      title: "介词：背两串就够",
      intro: "介词自己会决定后面用什么格，不用管动词。有两串固定的，还有九个「双向介词」要看句意。",
      steps: [
        "四格介词：durch, für, gegen, ohne, um（记成「杜甫改无ums」都行，重点是背下来）",
        "三格介词：aus, bei, mit, nach, seit, von, zu",
        "双向介词：in, an, auf, über, unter, vor, hinter, neben, zwischen —— 看下一条。",
      ],
      examples: [
        { de: "Das Geschenk ist für meinen Vater.", mark: "für meinen Vater", zh: "这礼物是给我爸的。", chain: ["für 是四格介词", "der Vater 阳性", "阳性四格 → meinen"] },
        { de: "Ich fahre mit dem Bus.", mark: "mit dem Bus", zh: "我坐公交去。", chain: ["mit 是三格介词", "der Bus 阳性", "阳性三格 → dem"] },
      ],
    },
    {
      id: "c4",
      title: "双向介词：Wohin 用四格，Wo 用三格",
      intro: "这九个介词既能表示「在哪里」也能表示「往哪里去」。问 Wohin?（去哪）就用四格，问 Wo?（在哪）就用三格。判断标准是有没有位置的改变。",
      steps: [
        "有移动、换了位置 → Wohin? → 四格",
        "静止、待在原处 → Wo? → 三格",
        "同一个句子换个格，意思就变了，所以这是考试重点。",
      ],
      examples: [
        { de: "Ich gehe in die Schule.", mark: "in die Schule", zh: "我去学校。（往里走，位置改变）", chain: ["Wohin? 去哪里", "→ 四格", "die Schule 阴性四格 → die"] },
        { de: "Ich bin in der Schule.", mark: "in der Schule", zh: "我在学校里。（人已经在里面）", chain: ["Wo? 在哪里", "→ 三格", "die Schule 阴性三格 → der"] },
        { de: "Er hängt das Bild an die Wand.", mark: "an die Wand", zh: "他把画挂到墙上。（挂的动作）", chain: ["Wohin? → 四格", "die Wand 阴性", "→ die"] },
        { de: "Das Bild hängt an der Wand.", mark: "an der Wand", zh: "画挂在墙上。（已经挂着）", chain: ["Wo? → 三格", "die Wand 阴性", "→ der"] },
      ],
    },
    {
      id: "c5",
      title: "双宾语：人三格，物四格",
      intro: "geben、schenken、zeigen 这类动词后面能跟两个宾语。规则很整齐：接受东西的人用三格，被给的东西用四格。",
      steps: [
        "谁收到 → 三格（人）",
        "收到什么 → 四格（物）",
        "两个都是名词时，三格在前；如果物用代词，代词提到前面：Ich gebe es ihm.",
      ],
      examples: [
        { de: "Ich gebe dem Kind einen Apfel.", mark: "dem Kind einen Apfel", zh: "我给这孩子一个苹果。", chain: ["Kind 是收的人 → 三格 dem", "Apfel 是给的物 → 四格 einen"] },
        { de: "Ich gebe es ihm.", mark: "es ihm", zh: "我把它给他。", chain: ["物用代词时提前", "es（四格）+ ihm（三格）"] },
      ],
    },
    {
      id: "c6",
      title: "人称代词也要变",
      intro: "代词的三格四格比冠词更常用，因为口语里到处都是。mich / mir 这一对分不清，句子就会错。",
      steps: [
        "四格：mich, dich, ihn, sie, es, uns, euch, sie",
        "三格：mir, dir, ihm, ihr, ihm, uns, euch, ihnen",
        "uns 和 euch 三格四格同形，是唯一省心的地方。",
      ],
      examples: [
        { de: "Kannst du mir helfen?", mark: "mir", zh: "你能帮我吗？", chain: ["helfen 支配三格", "我 → mir（不是 mich）"] },
        { de: "Sie liebt mich.", mark: "mich", zh: "她爱我。", chain: ["lieben 支配四格", "我 → mich"] },
      ],
    },
  ],

  /** 三格四格习题 */
  caseItems: [
    /* --- 动词决定的格 --- */
    { q: "Ich sehe ___ Mann.", zh: "我看见那个男人。", a: "den", o: ["den", "dem", "der"], why: "sehen 支配四格 · der Mann 阳性 → den", tag: "verb" },
    { q: "Ich helfe ___ Mann.", zh: "我帮那个男人。", a: "dem", o: ["den", "dem", "der"], why: "helfen 支配三格 · 阳性三格 → dem", tag: "verb" },
    { q: "Wir besuchen ___ Lehrerin.", zh: "我们去拜访那位女老师。", a: "die", o: ["die", "der", "den"], why: "besuchen 支配四格 · die Lehrerin 阴性，四格不变 → die", tag: "verb" },
    { q: "Das Auto gehört ___ Frau.", zh: "这车属于那位女士。", a: "der", o: ["die", "der", "den"], why: "gehören 支配三格 · 阴性三格 → der", tag: "verb" },
    { q: "Der Film gefällt ___ Kind.", zh: "这孩子喜欢这部电影。", a: "dem", o: ["das", "dem", "des"], why: "gefallen 支配三格 · das Kind 中性三格 → dem", tag: "verb" },
    { q: "Er kauft ___ Buch.", zh: "他买这本书。", a: "das", o: ["das", "dem", "den"], why: "kaufen 支配四格 · das Buch 中性，四格不变 → das", tag: "verb" },
    { q: "Ich danke ___ Freunden.", zh: "我感谢这些朋友。", a: "den", o: ["die", "den", "der"], why: "danken 支配三格 · 复数三格 → den（名词已加 -n）", tag: "verb" },
    { q: "Die Suppe schmeckt ___ Vater.", zh: "爸爸觉得这汤好喝。", a: "dem", o: ["den", "dem", "der"], why: "schmecken 支配三格 · 阳性三格 → dem", tag: "verb" },
    { q: "Sie sucht ___ Schlüssel.", zh: "她在找那把钥匙。", a: "den", o: ["den", "dem", "der"], why: "suchen 支配四格 · der Schlüssel 阳性 → den", tag: "verb" },
    { q: "Der Hund folgt ___ Kindern.", zh: "狗跟着孩子们。", a: "den", o: ["die", "den", "der"], why: "folgen 支配三格 · 复数三格 → den", tag: "verb" },
    { q: "Ich verstehe ___ Frage nicht.", zh: "我不懂这个问题。", a: "die", o: ["die", "der", "den"], why: "verstehen 支配四格 · die Frage 阴性，四格不变 → die", tag: "verb" },
    { q: "Wir gratulieren ___ Schwester.", zh: "我们祝贺姐姐。", a: "der", o: ["die", "der", "den"], why: "gratulieren 支配三格 · 阴性三格 → der", tag: "verb" },

    /* --- 人称代词 --- */
    { q: "Kannst du ___ helfen?", zh: "你能帮我吗？", a: "mir", o: ["mir", "mich", "ich"], why: "helfen 支配三格 · 我 → mir", tag: "pron" },
    { q: "Sie liebt ___ .", zh: "她爱我。", a: "mich", o: ["mir", "mich", "ich"], why: "lieben 支配四格 · 我 → mich", tag: "pron" },
    { q: "Das Buch gehört ___ .", zh: "这书是他的。", a: "ihm", o: ["ihn", "ihm", "er"], why: "gehören 支配三格 · 他 → ihm", tag: "pron" },
    { q: "Ich sehe ___ jeden Tag.", zh: "我每天都看见他。", a: "ihn", o: ["ihn", "ihm", "er"], why: "sehen 支配四格 · 他 → ihn", tag: "pron" },
    { q: "Der Pullover passt ___ nicht.", zh: "这毛衣你穿不合身。", a: "dir", o: ["dich", "dir", "du"], why: "passen 支配三格 · 你 → dir", tag: "pron" },
    { q: "Ich frage ___ .", zh: "我问你。", a: "dich", o: ["dich", "dir", "du"], why: "fragen 支配四格 · 你 → dich", tag: "pron" },
    { q: "Wie geht es ___ ?", zh: "您好吗？", a: "Ihnen", o: ["Ihnen", "Sie", "Ihr"], why: "固定句型 Wie geht es + 三格 · 您 → Ihnen", tag: "pron" },
    { q: "Das Bild gefällt ___ sehr.", zh: "他们很喜欢这幅画。", a: "ihnen", o: ["sie", "ihnen", "ihr"], why: "gefallen 支配三格 · 他们 → ihnen", tag: "pron" },
    { q: "Ich glaube ___ nicht.", zh: "我不信她。", a: "ihr", o: ["sie", "ihr", "ihnen"], why: "glauben 支配三格 · 她 → ihr", tag: "pron" },
    { q: "Sie besucht ___ morgen.", zh: "她明天来看我们。", a: "uns", o: ["uns", "unser", "wir"], why: "besuchen 支配四格 · 我们 → uns（三格四格同形）", tag: "pron" },

    /* --- 四格介词 --- */
    { q: "Das Geschenk ist für ___ Vater.", zh: "这礼物是给爸爸的。", a: "den", o: ["den", "dem", "der"], why: "für 是四格介词 · 阳性四格 → den", tag: "prep-akk" },
    { q: "Wir gehen durch ___ Park.", zh: "我们穿过公园。", a: "den", o: ["den", "dem", "der"], why: "durch 是四格介词 · der Park 阳性 → den", tag: "prep-akk" },
    { q: "Ich komme ohne ___ Auto.", zh: "我不开车来。", a: "das", o: ["das", "dem", "des"], why: "ohne 是四格介词 · das Auto 中性，四格不变 → das", tag: "prep-akk" },
    { q: "Sie läuft um ___ See.", zh: "她绕着湖跑。", a: "den", o: ["den", "dem", "der"], why: "um 是四格介词 · der See 阳性 → den", tag: "prep-akk" },
    { q: "Er hat nichts gegen ___ Plan.", zh: "他不反对这个计划。", a: "den", o: ["den", "dem", "der"], why: "gegen 是四格介词 · der Plan 阳性 → den", tag: "prep-akk" },
    { q: "Ich kaufe Blumen für ___ Mutter.", zh: "我给妈妈买花。", a: "die", o: ["die", "der", "den"], why: "für 是四格介词 · die Mutter 阴性，四格不变 → die", tag: "prep-akk" },
    { q: "Ich habe ein Geschenk für ___ Kind.", zh: "我有个礼物给这孩子。", a: "das", o: ["das", "dem", "des"], why: "für 是四格介词 · das Kind 中性，四格不变 → das", tag: "prep-akk" },
    { q: "Sie geht ohne ___ Mantel raus.", zh: "她不穿大衣就出去。", a: "den", o: ["den", "dem", "der"], why: "ohne 是四格介词 · der Mantel 阳性 → den", tag: "prep-akk" },

    /* --- 三格介词 --- */
    { q: "Ich fahre mit ___ Bus.", zh: "我坐公交。", a: "dem", o: ["den", "dem", "der"], why: "mit 是三格介词 · der Bus 阳性 → dem", tag: "prep-dat" },
    { q: "Sie kommt aus ___ Schweiz.", zh: "她来自瑞士。", a: "der", o: ["die", "der", "den"], why: "aus 是三格介词 · die Schweiz 阴性 → der", tag: "prep-dat" },
    { q: "Nach ___ Kurs gehe ich nach Hause.", zh: "课后我回家。", a: "dem", o: ["den", "dem", "der"], why: "nach 是三格介词 · der Kurs 阳性 → dem", tag: "prep-dat" },
    { q: "Ich wohne bei ___ Eltern.", zh: "我住在父母那儿。", a: "den", o: ["die", "den", "der"], why: "bei 是三格介词 · 复数三格 → den", tag: "prep-dat" },
    { q: "Seit ___ Woche bin ich krank.", zh: "我病了一个星期了。", a: "einer", o: ["eine", "einer", "einem"], why: "seit 是三格介词 · die Woche 阴性三格 → einer", tag: "prep-dat" },
    { q: "Das ist ein Geschenk von ___ Oma.", zh: "这是奶奶送的礼物。", a: "der", o: ["die", "der", "den"], why: "von 是三格介词 · die Oma 阴性 → der", tag: "prep-dat" },
    { q: "Ich gehe zu ___ Arzt.", zh: "我去看医生。", a: "dem", o: ["den", "dem", "der"], why: "zu 是三格介词 · der Arzt 阳性 → dem（口语常缩成 zum）", tag: "prep-dat" },
    { q: "Wir spielen mit ___ Kindern.", zh: "我们和孩子们玩。", a: "den", o: ["die", "den", "der"], why: "mit 是三格介词 · 复数三格 → den，名词加 -n", tag: "prep-dat" },

    /* --- 双向介词：Wohin / Wo --- */
    { q: "Ich gehe in ___ Schule.", zh: "我去学校。（往里走）", a: "die", o: ["die", "der", "den"], why: "Wohin? 有移动 → 四格 · 阴性四格 → die", tag: "wechsel" },
    { q: "Ich bin in ___ Schule.", zh: "我在学校里。（已经在里面）", a: "der", o: ["die", "der", "den"], why: "Wo? 静止 → 三格 · 阴性三格 → der", tag: "wechsel" },
    { q: "Er hängt das Bild an ___ Wand.", zh: "他把画挂到墙上。（挂的动作）", a: "die", o: ["die", "der", "den"], why: "Wohin? 位置改变 → 四格 · 阴性 → die", tag: "wechsel" },
    { q: "Das Bild hängt an ___ Wand.", zh: "画挂在墙上。（已经挂着）", a: "der", o: ["die", "der", "den"], why: "Wo? 静止 → 三格 · 阴性 → der", tag: "wechsel" },
    { q: "Die Katze springt auf ___ Tisch.", zh: "猫跳到桌上。", a: "den", o: ["den", "dem", "der"], why: "Wohin? 跳上去 → 四格 · der Tisch 阳性 → den", tag: "wechsel" },
    { q: "Die Katze schläft auf ___ Tisch.", zh: "猫在桌上睡觉。", a: "dem", o: ["den", "dem", "der"], why: "Wo? 静止 → 三格 · 阳性三格 → dem", tag: "wechsel" },
    { q: "Ich lege das Buch auf ___ Bett.", zh: "我把书放到床上。", a: "das", o: ["das", "dem", "des"], why: "Wohin? 放上去 → 四格 · das Bett 中性，四格不变 → das", tag: "wechsel" },
    { q: "Das Buch liegt auf ___ Bett.", zh: "书在床上。", a: "dem", o: ["das", "dem", "des"], why: "Wo? 静止 → 三格 · 中性三格 → dem", tag: "wechsel" },
    { q: "Wir fahren in ___ Stadt.", zh: "我们进城去。", a: "die", o: ["die", "der", "den"], why: "Wohin? → 四格 · die Stadt 阴性 → die", tag: "wechsel" },
    { q: "Wir wohnen in ___ Stadt.", zh: "我们住在城里。", a: "der", o: ["die", "der", "den"], why: "Wo? → 三格 · 阴性三格 → der", tag: "wechsel" },
    { q: "Stell die Flasche neben ___ Kühlschrank.", zh: "把瓶子放到冰箱旁边。", a: "den", o: ["den", "dem", "der"], why: "Wohin? 放过去 → 四格 · der Kühlschrank 阳性 → den", tag: "wechsel" },
    { q: "Die Flasche steht neben ___ Kühlschrank.", zh: "瓶子在冰箱旁边。", a: "dem", o: ["den", "dem", "der"], why: "Wo? 站着不动 → 三格 · 阳性三格 → dem", tag: "wechsel" },

    /* --- 双宾语 --- */
    { q: "Ich gebe ___ Kind einen Apfel.", zh: "我给这孩子一个苹果。", a: "dem", o: ["das", "dem", "den"], why: "收东西的人用三格 · das Kind 中性三格 → dem", tag: "dual" },
    { q: "Ich gebe dem Kind ___ Apfel.", zh: "我给这孩子一个苹果。", a: "einen", o: ["einen", "einem", "ein"], why: "被给的物用四格 · der Apfel 阳性四格 → einen", tag: "dual" },
    { q: "Er schenkt ___ Freundin Blumen.", zh: "他送女朋友花。", a: "seiner", o: ["seine", "seiner", "seinen"], why: "收的人用三格 · die Freundin 阴性三格 → seiner", tag: "dual" },
    { q: "Zeig ___ bitte den Weg!", zh: "请给我指路！", a: "mir", o: ["mir", "mich", "ich"], why: "收的人用三格 · 我 → mir", tag: "dual" },
    { q: "Der Kellner empfiehlt ___ Gästen den Fisch.", zh: "服务员向客人们推荐这鱼。", a: "den", o: ["die", "den", "der"], why: "收的人用三格 · 复数三格 → den", tag: "dual" },
    { q: "Ich schicke ___ eine E-Mail.", zh: "我给你发一封邮件。", a: "dir", o: ["dich", "dir", "du"], why: "收的人用三格 · 你 → dir", tag: "dual" },
  ],

  /* =========================================================
   * 模块二 · 身体部位
   * ========================================================= */

  bodyGroups: [
    { id: "head", label: "头和脸" },
    { id: "upper", label: "上身和手" },
    { id: "lower", label: "下身和脚" },
    { id: "inner", label: "内部和其他" },
  ],

  /**
   * art : 冠词 der/die/das
   * pl  : 复数形式（没有复数写 "—"）
   */
  body: [
    { de: "Kopf", art: "der", pl: "die Köpfe", zh: "头", grp: "head" },
    { de: "Haar", art: "das", pl: "die Haare", zh: "头发", grp: "head", note: "说头发一般用复数 die Haare。" },
    { de: "Gesicht", art: "das", pl: "die Gesichter", zh: "脸", grp: "head" },
    { de: "Auge", art: "das", pl: "die Augen", zh: "眼睛", grp: "head" },
    { de: "Nase", art: "die", pl: "die Nasen", zh: "鼻子", grp: "head" },
    { de: "Mund", art: "der", pl: "die Münder", zh: "嘴", grp: "head" },
    { de: "Ohr", art: "das", pl: "die Ohren", zh: "耳朵", grp: "head" },
    { de: "Zahn", art: "der", pl: "die Zähne", zh: "牙齿", grp: "head" },
    { de: "Zunge", art: "die", pl: "die Zungen", zh: "舌头", grp: "head" },
    { de: "Lippe", art: "die", pl: "die Lippen", zh: "嘴唇", grp: "head" },
    { de: "Stirn", art: "die", pl: "die Stirnen", zh: "额头", grp: "head" },
    { de: "Wange", art: "die", pl: "die Wangen", zh: "脸颊", grp: "head" },
    { de: "Kinn", art: "das", pl: "die Kinne", zh: "下巴", grp: "head" },
    { de: "Augenbraue", art: "die", pl: "die Augenbrauen", zh: "眉毛", grp: "head" },
    { de: "Hals", art: "der", pl: "die Hälse", zh: "脖子、喉咙", grp: "head" },

    { de: "Schulter", art: "die", pl: "die Schultern", zh: "肩膀", grp: "upper" },
    { de: "Arm", art: "der", pl: "die Arme", zh: "手臂", grp: "upper" },
    { de: "Ellbogen", art: "der", pl: "die Ellbogen", zh: "肘", grp: "upper" },
    { de: "Hand", art: "die", pl: "die Hände", zh: "手", grp: "upper" },
    { de: "Finger", art: "der", pl: "die Finger", zh: "手指", grp: "upper", note: "单复数同形，只有冠词变。" },
    { de: "Daumen", art: "der", pl: "die Daumen", zh: "拇指", grp: "upper" },
    { de: "Fingernagel", art: "der", pl: "die Fingernägel", zh: "指甲", grp: "upper" },
    { de: "Brust", art: "die", pl: "die Brüste", zh: "胸", grp: "upper" },
    { de: "Rücken", art: "der", pl: "die Rücken", zh: "背", grp: "upper", note: "单复数同形。" },
    { de: "Bauch", art: "der", pl: "die Bäuche", zh: "肚子", grp: "upper" },
    { de: "Taille", art: "die", pl: "die Taillen", zh: "腰", grp: "upper" },

    { de: "Bein", art: "das", pl: "die Beine", zh: "腿", grp: "lower" },
    { de: "Knie", art: "das", pl: "die Knie", zh: "膝盖", grp: "lower" },
    { de: "Fuß", art: "der", pl: "die Füße", zh: "脚", grp: "lower" },
    { de: "Zehe", art: "die", pl: "die Zehen", zh: "脚趾", grp: "lower" },
    { de: "Knöchel", art: "der", pl: "die Knöchel", zh: "脚踝", grp: "lower" },
    { de: "Hüfte", art: "die", pl: "die Hüften", zh: "髋部、胯", grp: "lower" },
    { de: "Oberschenkel", art: "der", pl: "die Oberschenkel", zh: "大腿", grp: "lower" },
    { de: "Ferse", art: "die", pl: "die Fersen", zh: "脚后跟", grp: "lower" },

    { de: "Herz", art: "das", pl: "die Herzen", zh: "心脏", grp: "inner" },
    { de: "Lunge", art: "die", pl: "die Lungen", zh: "肺", grp: "inner" },
    { de: "Magen", art: "der", pl: "die Mägen", zh: "胃", grp: "inner" },
    { de: "Leber", art: "die", pl: "die Lebern", zh: "肝", grp: "inner" },
    { de: "Niere", art: "die", pl: "die Nieren", zh: "肾", grp: "inner" },
    { de: "Gehirn", art: "das", pl: "die Gehirne", zh: "大脑", grp: "inner" },
    { de: "Knochen", art: "der", pl: "die Knochen", zh: "骨头", grp: "inner", note: "单复数同形。" },
    { de: "Muskel", art: "der", pl: "die Muskeln", zh: "肌肉", grp: "inner" },
    { de: "Haut", art: "die", pl: "die Häute", zh: "皮肤", grp: "inner" },
    { de: "Blut", art: "das", pl: "—", zh: "血", grp: "inner", note: "不可数，没有复数。" },
    { de: "Nerv", art: "der", pl: "die Nerven", zh: "神经", grp: "inner" },
  ],

  /** 看病、疼痛相关词 */
  bodyExtra: [
    { de: "die Kopfschmerzen", zh: "头疼", note: "总是复数：Ich habe Kopfschmerzen." },
    { de: "die Zahnschmerzen", zh: "牙疼" },
    { de: "die Bauchschmerzen", zh: "肚子疼" },
    { de: "die Halsschmerzen", zh: "喉咙疼" },
    { de: "die Rückenschmerzen", zh: "背疼" },
    { de: "das Fieber", zh: "发烧" },
    { de: "der Husten", zh: "咳嗽" },
    { de: "der Schnupfen", zh: "鼻塞、流鼻涕" },
    { de: "die Erkältung", zh: "感冒" },
    { de: "die Grippe", zh: "流感" },
    { de: "der Arzt / die Ärztin", zh: "医生（男 / 女）" },
    { de: "die Apotheke", zh: "药房" },
    { de: "die Tablette", zh: "药片" },
    { de: "das Rezept", zh: "处方" },
    { de: "krank", zh: "生病的" },
    { de: "gesund", zh: "健康的" },
  ],

  /** 身体部位的语法讲解 —— 关键是它跟三格的关系 */
  bodyRules: [
    {
      id: "b1",
      title: "「我头疼」为什么用三格",
      intro: "德语说疼，主语是身体部位，疼的那个人用三格。这跟中文语序完全相反，所以要单独练。",
      steps: [
        "句型：三格的人 + tut/tun + 定冠词 + 身体部位 + weh",
        "身体部位是主语，所以用一格（der Kopf、die Füße）。",
        "部位是单数用 tut，复数用 tun。",
      ],
      examples: [
        { de: "Mir tut der Kopf weh.", mark: "Mir", zh: "我头疼。", chain: ["疼的人 → 三格 mir", "der Kopf 是主语 → 一格", "单数 → tut"] },
        { de: "Mir tun die Füße weh.", mark: "tun", zh: "我脚疼。", chain: ["die Füße 复数主语", "复数 → tun"] },
        { de: "Tut dir der Hals weh?", mark: "dir", zh: "你喉咙疼吗？", chain: ["疑问句动词提前", "你 → dir"] },
      ],
    },
    {
      id: "b2",
      title: "另一种说法：haben + Schmerzen",
      intro: "更口语的说法是「有某处的疼」，把部位和 Schmerzen 拼成一个词。这类词永远是复数。",
      steps: [
        "Ich habe Kopfschmerzen. = 我头疼。",
        "拼法：部位 + schmerzen，如 Zahn→Zahnschmerzen、Bauch→Bauchschmerzen。",
        "Schmerzen 是复数，不加冠词直接用。",
      ],
      examples: [
        { de: "Ich habe Zahnschmerzen.", mark: "Zahnschmerzen", zh: "我牙疼。", chain: ["haben 支配四格", "Schmerzen 复数，不带冠词"] },
        { de: "Sie hat Fieber und Husten.", mark: "Fieber und Husten", zh: "她发烧还咳嗽。", chain: ["haben + 症状", "这两个词不用冠词"] },
      ],
    },
    {
      id: "b3",
      title: "洗手不说「我的手」",
      intro: "这是德语和中文差别最大的地方。对自己身体做动作时，德语用「三格反身代词 + 定冠词」，不用物主代词。",
      steps: [
        "对 → Ich wasche mir die Hände.（我洗手）",
        "错 → Ich wasche meine Hände.（语法不算错，但德国人不这么说）",
        "反身三格：mir, dir, sich, uns, euch, sich",
      ],
      examples: [
        { de: "Ich wasche mir die Hände.", mark: "mir die Hände", zh: "我洗手。", chain: ["动作作用在自己身上 → 反身三格 mir", "部位用定冠词 die，不用 meine"] },
        { de: "Er putzt sich die Zähne.", mark: "sich die Zähne", zh: "他刷牙。", chain: ["第三人称反身 → sich", "die Zähne 用定冠词"] },
        { de: "Sie hat sich den Arm gebrochen.", mark: "sich den Arm", zh: "她把手臂摔断了。", chain: ["反身三格 sich", "der Arm 四格 → den"] },
      ],
    },
  ],

  /** 身体部位相关的句型习题 */
  bodyItems: [
    { q: "___ tut der Kopf weh.", zh: "我头疼。", a: "Mir", o: ["Mir", "Mich", "Ich"], why: "疼的人用三格 → mir", tag: "body-weh" },
    { q: "Mir ___ die Füße weh.", zh: "我脚疼。", a: "tun", o: ["tut", "tun", "tue"], why: "die Füße 是复数主语 → tun", tag: "body-weh" },
    { q: "Mir ___ der Bauch weh.", zh: "我肚子疼。", a: "tut", o: ["tut", "tun", "tue"], why: "der Bauch 单数主语 → tut", tag: "body-weh" },
    { q: "Tut ___ der Hals weh?", zh: "你喉咙疼吗？", a: "dir", o: ["dir", "dich", "du"], why: "疼的人用三格 → dir", tag: "body-weh" },
    { q: "___ tun die Ohren weh.", zh: "他耳朵疼。", a: "Ihm", o: ["Ihm", "Ihn", "Er"], why: "疼的人用三格 → ihm · die Ohren 复数 → tun", tag: "body-weh" },
    { q: "Ich habe ___ .", zh: "我牙疼。", a: "Zahnschmerzen", o: ["Zahnschmerzen", "Zahnweh sehr", "die Zahn"], why: "部位 + schmerzen，永远复数，不带冠词", tag: "body-weh" },
    { q: "___ tut der Rücken weh.", zh: "她背疼。", a: "Ihr", o: ["Ihr", "Sie", "Ihnen"], why: "疼的人用三格 · 她 → ihr", tag: "body-weh" },
    { q: "Uns ___ die Beine weh.", zh: "我们腿疼。", a: "tun", o: ["tut", "tun", "tue"], why: "die Beine 复数主语 → tun", tag: "body-weh" },
    { q: "Was ___ Ihnen weh?", zh: "您哪里疼？", a: "tut", o: ["tut", "tun", "tue"], why: "was 是单数主语 → tut", tag: "body-weh" },
    { q: "Der Arm tut ___ weh.", zh: "我胳膊疼。", a: "mir", o: ["mir", "mich", "ich"], why: "部位作主语，疼的人用三格 → mir", tag: "body-weh" },
    { q: "Haben Sie ___ ?", zh: "您头疼吗？", a: "Kopfschmerzen", o: ["Kopfschmerzen", "Kopfweh sehr", "den Kopf weh"], why: "haben + 部位schmerzen，复数不带冠词", tag: "body-weh" },
    { q: "Ich wasche ___ die Hände.", zh: "我洗手。", a: "mir", o: ["mir", "mich", "meine"], why: "对自己身体的动作用反身三格 mir，部位用定冠词", tag: "body-refl" },
    { q: "Er putzt ___ die Zähne.", zh: "他刷牙。", a: "sich", o: ["sich", "ihm", "seine"], why: "第三人称反身三格 → sich", tag: "body-refl" },
    { q: "Sie hat sich ___ Arm gebrochen.", zh: "她把手臂摔断了。", a: "den", o: ["den", "dem", "der"], why: "der Arm 四格 → den（brechen 支配四格）", tag: "body-refl" },
    { q: "Wir putzen ___ die Zähne zweimal am Tag.", zh: "我们一天刷两次牙。", a: "uns", o: ["uns", "unsere", "wir"], why: "反身三格复数 → uns", tag: "body-refl" },
    { q: "Ich putze ___ die Zähne.", zh: "我刷牙。", a: "mir", o: ["mir", "mich", "meine"], why: "对自己身体的动作 → 反身三格 mir", tag: "body-refl" },
    { q: "Sie wäscht ___ das Gesicht.", zh: "她洗脸。", a: "sich", o: ["sich", "ihr", "ihre"], why: "第三人称反身三格 → sich", tag: "body-refl" },
    { q: "Zieh ___ bitte die Schuhe aus!", zh: "请把鞋脱了！", a: "dir", o: ["dir", "dich", "deine"], why: "命令式也一样，反身三格 → dir", tag: "body-refl" },
    { q: "Er hat sich ___ Bein gebrochen.", zh: "他把腿摔断了。", a: "das", o: ["das", "dem", "den"], why: "das Bein 中性，四格跟一格同形 → das", tag: "body-refl" },
    { q: "Ich wasche mir ___ Haare.", zh: "我洗头。", a: "die", o: ["die", "der", "meine"], why: "部位用定冠词不用物主代词 · die Haare 复数四格 → die", tag: "body-refl" },
    { q: "Kämmst du ___ die Haare?", zh: "你梳头吗？", a: "dir", o: ["dir", "dich", "deine"], why: "反身三格 → dir，部位用定冠词", tag: "body-refl" },
    { q: "___ Kopf tut weh.", zh: "（这个）头疼。", a: "Der", o: ["Der", "Den", "Dem"], why: "身体部位在这个句型里是主语 → 一格 der", tag: "body-art" },
    { q: "Der Arzt untersucht ___ Hals.", zh: "医生检查喉咙。", a: "den", o: ["den", "dem", "der"], why: "untersuchen 支配四格 · der Hals 阳性 → den", tag: "body-art" },
    { q: "Was fehlt ___ ?", zh: "您哪里不舒服？", a: "Ihnen", o: ["Ihnen", "Sie", "Ihr"], why: "fehlen 支配三格 · 您 → Ihnen", tag: "body-art" },
    { q: "Sie geht mit ___ Grippe nicht zur Arbeit.", zh: "她得了流感，不去上班。", a: "einer", o: ["eine", "einer", "einem"], why: "mit 是三格介词 · die Grippe 阴性三格 → einer", tag: "body-art" },
    { q: "Der Arzt schaut in ___ Hals.", zh: "医生看（我的）喉咙。", a: "den", o: ["den", "dem", "der"], why: "in 双向介词 · 往里看，有方向 → 四格 · der Hals → den", tag: "body-art" },
    { q: "Ich habe Schmerzen in ___ Rücken.", zh: "我背疼。", a: "dem", o: ["den", "dem", "der"], why: "Wo? 疼在哪里，静止 → 三格 · der Rücken → dem（口语缩成 im）", tag: "body-art" },
    { q: "___ Augen sind blau.", zh: "（这双）眼睛是蓝色的。", a: "Die", o: ["Die", "Den", "Das"], why: "主语用一格 · die Augen 复数一格 → die", tag: "body-art" },
    { q: "Er kann ___ Finger nicht bewegen.", zh: "他动不了这根手指。", a: "den", o: ["den", "dem", "der"], why: "bewegen 支配四格 · der Finger 阳性 → den", tag: "body-art" },
    { q: "Die Nase gehört zu ___ Gesicht.", zh: "鼻子属于脸的一部分。", a: "dem", o: ["das", "dem", "des"], why: "zu 是三格介词 · das Gesicht 中性三格 → dem", tag: "body-art" },
  ],

  /* =========================================================
   * 模块三 · 可分动词
   * ========================================================= */

  /** 可分前缀：重音在前缀上，现在时要跑到句末 */
  prefixTrenn: ["ab", "an", "auf", "aus", "bei", "ein", "mit", "nach", "vor", "weg", "zu", "zurück", "zusammen", "los", "fest", "fern", "her", "hin", "teil", "statt", "um", "vorbei", "wieder"],

  /** 不可分前缀：重音在词干上，永远不分开，第二分词也不加 ge */
  prefixUntrenn: ["be", "ge", "er", "ver", "ent", "emp", "miss", "zer"],

  sepRules: [
    {
      id: "s1",
      title: "怎么判断分不分",
      intro: "德语动词的前缀分两种。可分前缀重音落在前缀上，说 AUFstehen；不可分前缀重音在词干上，说 beSUchen。念一遍就能听出来。",
      steps: [
        "可分（重音在前）：ab-, an-, auf-, aus-, bei-, ein-, mit-, nach-, vor-, weg-, zu-, zurück-, los-, mit-…",
        "不可分（重音在后）：be-, ge-, er-, ver-, ent-, emp-, miss-, zer- —— 这八个背下来，剩下的基本都可分。",
        "不可分前缀的第二分词不加 ge：besuchen → besucht。可分的 ge 夹在中间：abholen → abgeholt。",
      ],
      examples: [
        { de: "Ich stehe um 7 Uhr auf.", mark: ["stehe", "auf"], zh: "我七点起床。", chain: ["aufstehen 可分", "现在时 → 前缀 auf 到句末"] },
        { de: "Ich besuche meine Oma.", mark: "besuche", zh: "我去看奶奶。", chain: ["besuchen 不可分（be-）", "整个动词留在原位"] },
      ],
    },
    {
      id: "s2",
      title: "前缀跑到哪里去",
      intro: "可分动词在主句里会被拆成两半：变位的部分放第二位，前缀甩到句子最末尾。中间夹多少东西都行。",
      steps: [
        "主句陈述句：动词第二位，前缀最末位。",
        "中间的内容越长，两半离得越远，但前缀永远在最后。",
        "疑问句同理：Wann stehst du auf?",
      ],
      examples: [
        { de: "Ich rufe meine Mutter an.", mark: ["rufe", "an"], zh: "我给妈妈打电话。", chain: ["anrufen 拆开", "rufe 第二位，an 句末"] },
        { de: "Ich hole dich morgen um acht vom Bahnhof ab.", mark: ["hole", "ab"], zh: "我明天八点去火车站接你。", chain: ["中间塞了一堆成分", "ab 仍然在最后"] },
        { de: "Wann fängt der Film an?", mark: ["fängt", "an"], zh: "电影什么时候开始？", chain: ["疑问句也拆", "an 放句末"] },
      ],
    },
    {
      id: "s3",
      title: "什么时候不拆",
      intro: "有三种情况前缀不动，整个动词保持原形写在一起。这是考试最爱挖的坑。",
      steps: [
        "情态动词后面：Ich muss früh aufstehen.（原形不拆）",
        "从句里（weil, dass, wenn, ob…）：…, weil ich früh aufstehe.（动词整个到句末，不拆）",
        "带 zu 的不定式：zu 夹在中间 → abzuholen，Ich habe keine Zeit, dich abzuholen.",
      ],
      examples: [
        { de: "Ich muss morgen früh aufstehen.", mark: "aufstehen", zh: "我明天得早起。", chain: ["情态动词 muss + 原形", "aufstehen 不拆，放句末"] },
        { de: "Ich bin müde, weil ich früh aufstehe.", mark: "aufstehe", zh: "我累，因为我起得早。", chain: ["weil 引导从句", "动词整个到句末，不拆"] },
        { de: "Ich habe keine Zeit, dich abzuholen.", mark: "abzuholen", zh: "我没时间去接你。", chain: ["带 zu 的不定式", "zu 夹在前缀和词干中间"] },
      ],
    },
  ],

  /**
   * pre  : 前缀
   * stem : 例句里变位的那部分（可分动词的例句统一用陈述句，动词在第二位，前缀在句末）
   * sep  : true 可分，false 不可分
   */
  sepVerben: [
    { inf: "aufstehen", pre: "auf", stem: "steht", sep: true, zh: "起床", ex: "Er steht um 7 Uhr auf.", exZh: "他七点起床。" },
    { inf: "anfangen", pre: "an", stem: "fängt", sep: true, zh: "开始", ex: "Der Film fängt um 8 Uhr an.", exZh: "电影八点开始。" },
    { inf: "anrufen", pre: "an", stem: "ruft", sep: true, zh: "打电话", ex: "Sie ruft ihre Mutter an.", exZh: "她给妈妈打电话。" },
    { inf: "abholen", pre: "ab", stem: "holt", sep: true, zh: "接、去取", ex: "Er holt dich vom Bahnhof ab.", exZh: "他去火车站接你。" },
    { inf: "einkaufen", pre: "ein", stem: "kauft", sep: true, zh: "买东西", ex: "Sie kauft im Supermarkt ein.", exZh: "她在超市买东西。" },
    { inf: "fernsehen", pre: "fern", stem: "sieht", sep: true, zh: "看电视", ex: "Am Abend sieht er fern.", exZh: "晚上他看电视。" },
    { inf: "mitkommen", pre: "mit", stem: "kommt", sep: true, zh: "一起来", ex: "Mein Freund kommt heute mit.", exZh: "我朋友今天一起来。" },
    { inf: "mitbringen", pre: "mit", stem: "bringt", sep: true, zh: "带来", ex: "Sie bringt einen Kuchen mit.", exZh: "她带个蛋糕来。" },
    { inf: "aussteigen", pre: "aus", stem: "steigt", sep: true, zh: "下车", ex: "Er steigt am Stephansplatz aus.", exZh: "他在斯蒂芬广场下车。" },
    { inf: "einsteigen", pre: "ein", stem: "steigt", sep: true, zh: "上车", ex: "Sie steigt in den Bus ein.", exZh: "她上公交车。" },
    { inf: "umziehen", pre: "um", stem: "zieht", sep: true, zh: "搬家", ex: "Sie zieht nach Wien um.", exZh: "她搬到维也纳。" },
    { inf: "zumachen", pre: "zu", stem: "macht", sep: true, zh: "关上", ex: "Er macht die Tür zu.", exZh: "他把门关上。" },
    { inf: "aufmachen", pre: "auf", stem: "macht", sep: true, zh: "打开", ex: "Sie macht das Fenster auf.", exZh: "她把窗户打开。" },
    { inf: "ausmachen", pre: "aus", stem: "macht", sep: true, zh: "关掉（电器）", ex: "Er macht das Licht aus.", exZh: "他把灯关掉。" },
    { inf: "anmachen", pre: "an", stem: "macht", sep: true, zh: "打开（电器）", ex: "Er macht den Computer an.", exZh: "他打开电脑。" },
    { inf: "anziehen", pre: "an", stem: "zieht", sep: true, zh: "穿上", ex: "Sie zieht die Jacke an.", exZh: "她穿上外套。" },
    { inf: "ausziehen", pre: "aus", stem: "zieht", sep: true, zh: "脱下", ex: "Er zieht die Schuhe aus.", exZh: "他把鞋脱掉。" },
    { inf: "aufräumen", pre: "auf", stem: "räumt", sep: true, zh: "收拾", ex: "Sie räumt das Zimmer auf.", exZh: "她收拾房间。" },
    { inf: "ausfüllen", pre: "aus", stem: "füllt", sep: true, zh: "填写", ex: "Sie füllt das Formular aus.", exZh: "她填这张表。" },
    { inf: "vorbereiten", pre: "vor", stem: "bereitet", sep: true, zh: "准备", ex: "Er bereitet das Essen vor.", exZh: "他准备饭菜。" },
    { inf: "aufhören", pre: "auf", stem: "hört", sep: true, zh: "停止", ex: "Der Regen hört endlich auf.", exZh: "雨终于停了。" },
    { inf: "zuhören", pre: "zu", stem: "hört", sep: true, zh: "倾听", ex: "Er hört der Lehrerin zu.", exZh: "他听老师讲。", note: "zuhören 支配三格：der Lehrerin。" },
    { inf: "einladen", pre: "ein", stem: "lädt", sep: true, zh: "邀请", ex: "Sie lädt ihre Freunde ein.", exZh: "她邀请她的朋友们。" },
    { inf: "ankommen", pre: "an", stem: "kommt", sep: true, zh: "到达", ex: "Der Zug kommt um 9 Uhr an.", exZh: "火车九点到。" },
    { inf: "abfahren", pre: "ab", stem: "fährt", sep: true, zh: "出发", ex: "Der Bus fährt um 6 Uhr ab.", exZh: "公交六点出发。" },
    { inf: "zurückkommen", pre: "zurück", stem: "kommt", sep: true, zh: "回来", ex: "Er kommt um 8 Uhr zurück.", exZh: "他八点回来。" },
    { inf: "weggehen", pre: "weg", stem: "geht", sep: true, zh: "离开", ex: "Er geht um 10 Uhr weg.", exZh: "他十点离开。" },
    { inf: "teilnehmen", pre: "teil", stem: "nimmt", sep: true, zh: "参加", ex: "Sie nimmt am Kurs teil.", exZh: "她参加这门课。" },
    { inf: "stattfinden", pre: "statt", stem: "findet", sep: true, zh: "举行", ex: "Das Konzert findet morgen statt.", exZh: "音乐会明天举行。" },
    { inf: "ausgehen", pre: "aus", stem: "geht", sep: true, zh: "出去玩", ex: "Sie geht heute Abend aus.", exZh: "她今晚出去。" },

    /* 不可分的，用来对照 */
    { inf: "besuchen", pre: "be", stem: "besucht", sep: false, zh: "拜访", ex: "Er besucht seine Oma.", exZh: "他去看奶奶。" },
    { inf: "verstehen", pre: "ver", stem: "versteht", sep: false, zh: "理解", ex: "Ich verstehe die Frage.", exZh: "我懂这个问题。" },
    { inf: "erklären", pre: "er", stem: "erklärt", sep: false, zh: "解释", ex: "Sie erklärt die Regel.", exZh: "她解释这条规则。" },
    { inf: "bekommen", pre: "be", stem: "bekommt", sep: false, zh: "得到", ex: "Er bekommt ein Geschenk.", exZh: "他收到一个礼物。" },
    { inf: "verkaufen", pre: "ver", stem: "verkauft", sep: false, zh: "卖", ex: "Sie verkauft ihr Auto.", exZh: "她卖掉她的车。" },
    { inf: "entscheiden", pre: "ent", stem: "entscheidet", sep: false, zh: "决定", ex: "Er entscheidet schnell.", exZh: "他很快做决定。" },
    { inf: "erzählen", pre: "er", stem: "erzählt", sep: false, zh: "讲述", ex: "Sie erzählt eine Geschichte.", exZh: "她讲一个故事。" },
    { inf: "gehören", pre: "ge", stem: "gehört", sep: false, zh: "属于", ex: "Das Buch gehört mir.", exZh: "这书是我的。" },
    { inf: "zerbrechen", pre: "zer", stem: "zerbricht", sep: false, zh: "打碎", ex: "Er zerbricht das Glas.", exZh: "他把杯子打碎。" },
    { inf: "missverstehen", pre: "miss", stem: "missversteht", sep: false, zh: "误解", ex: "Du missverstehst mich.", exZh: "你误解我了。" },
  ],

  /** 可分动词习题 */
  sepItems: [
    { q: "Ich ___ um 7 Uhr ___ . (aufstehen)", zh: "我七点起床。", a: "stehe … auf", o: ["stehe … auf", "aufstehe … —", "stehe auf … —"], why: "可分动词在主句拆开：变位部分第二位，前缀句末", tag: "sep-split" },
    { q: "Der Film ___ um 8 Uhr ___ . (anfangen)", zh: "电影八点开始。", a: "fängt … an", o: ["fängt … an", "anfängt … —", "fangt … an"], why: "anfangen 可分，第三人称词干变音 a→ä → fängt … an", tag: "sep-split" },
    { q: "Wann ___ du ___ ? (zurückkommen)", zh: "你什么时候回来？", a: "kommst … zurück", o: ["kommst … zurück", "zurückkommst … —", "kommt … zurück"], why: "疑问句也拆开，zurück 放句末", tag: "sep-split" },
    { q: "Sie ___ ihre Mutter ___ . (anrufen)", zh: "她给妈妈打电话。", a: "ruft … an", o: ["ruft … an", "anruft … —", "ruft an … —"], why: "anrufen 可分 → ruft … an", tag: "sep-split" },
    { q: "Wir ___ im Supermarkt ___ . (einkaufen)", zh: "我们在超市买东西。", a: "kaufen … ein", o: ["kaufen … ein", "einkaufen … —", "kaufen ein … —"], why: "einkaufen 可分 → kaufen … ein", tag: "sep-split" },
    { q: "Sie ___ die Tür ___ . (zumachen)", zh: "她把门关上。", a: "macht … zu", o: ["macht … zu", "zumacht … —", "macht zu … —"], why: "zumachen 可分 → macht … zu", tag: "sep-split" },
    { q: "Der Zug ___ um 9 Uhr ___ . (ankommen)", zh: "火车九点到。", a: "kommt … an", o: ["kommt … an", "ankommt … —", "kommt an … —"], why: "ankommen 可分 → kommt … an", tag: "sep-split" },
    { q: "Ich ___ dich vom Bahnhof ___ . (abholen)", zh: "我去火车站接你。", a: "hole … ab", o: ["hole … ab", "abhole … —", "hole ab … —"], why: "abholen 可分 → hole … ab，中间塞多少成分都行", tag: "sep-split" },
    { q: "Er ___ am Abend ___ . (fernsehen)", zh: "他晚上看电视。", a: "sieht … fern", o: ["sieht … fern", "fernsieht … —", "sieht fern … —"], why: "fernsehen 可分 · 第三人称 e→ie → sieht … fern", tag: "sep-split" },
    { q: "Wir ___ das Zimmer ___ . (aufräumen)", zh: "我们收拾房间。", a: "räumen … auf", o: ["räumen … auf", "aufräumen … —", "räumen auf … —"], why: "aufräumen 可分 → räumen … auf", tag: "sep-split" },
    { q: "Sie ___ ihre Freunde ___ . (einladen)", zh: "她邀请她的朋友们。", a: "lädt … ein", o: ["lädt … ein", "einlädt … —", "ladet … ein"], why: "einladen 可分 · 第三人称 a→ä → lädt … ein", tag: "sep-split" },
    { q: "Ich muss morgen früh ___ .", zh: "我明天得早起。", a: "aufstehen", o: ["aufstehen", "stehe auf", "auf stehen"], why: "情态动词后面用原形，不拆", tag: "sep-nosplit" },
    { q: "Ich bin müde, weil ich früh ___ .", zh: "我累，因为我起得早。", a: "aufstehe", o: ["aufstehe", "stehe auf", "auf stehe"], why: "weil 从句里动词整个到句末，不拆", tag: "sep-nosplit" },
    { q: "Ich habe keine Zeit, dich ___ .", zh: "我没时间去接你。", a: "abzuholen", o: ["abzuholen", "abholen zu", "zu abholen"], why: "带 zu 的不定式，zu 夹在前缀和词干中间", tag: "sep-nosplit" },
    { q: "Er sagt, dass der Zug um 9 Uhr ___ .", zh: "他说火车九点到。", a: "ankommt", o: ["ankommt", "kommt an", "an kommt"], why: "dass 从句，动词到句末且不拆", tag: "sep-nosplit" },
    { q: "Kannst du das Fenster ___ ?", zh: "你能把窗户打开吗？", a: "aufmachen", o: ["aufmachen", "machst auf", "auf machen"], why: "情态动词 kannst + 原形，不拆", tag: "sep-nosplit" },
    { q: "Wir wollen heute Abend ___ .", zh: "我们今晚想出去。", a: "ausgehen", o: ["ausgehen", "gehen aus", "aus gehen"], why: "wollen + 原形，不拆", tag: "sep-nosplit" },
    { q: "Sie freut sich, wenn du ___ .", zh: "你一起来她就高兴。", a: "mitkommst", o: ["mitkommst", "kommst mit", "mit kommst"], why: "wenn 从句，动词到句末不拆", tag: "sep-nosplit" },
    { q: "besuchen 是可分动词吗？", zh: "判断前缀类型", a: "不可分", o: ["不可分", "可分"], why: "be- 是不可分前缀，重音在词干：beSUchen", tag: "sep-judge" },
    { q: "abholen 是可分动词吗？", zh: "判断前缀类型", a: "可分", o: ["可分", "不可分"], why: "ab- 是可分前缀，重音在前缀：ABholen", tag: "sep-judge" },
    { q: "verkaufen 是可分动词吗？", zh: "判断前缀类型", a: "不可分", o: ["不可分", "可分"], why: "ver- 是不可分前缀", tag: "sep-judge" },
    { q: "mitbringen 是可分动词吗？", zh: "判断前缀类型", a: "可分", o: ["可分", "不可分"], why: "mit- 是可分前缀", tag: "sep-judge" },
    { q: "entscheiden 是可分动词吗？", zh: "判断前缀类型", a: "不可分", o: ["不可分", "可分"], why: "ent- 是不可分前缀", tag: "sep-judge" },
    { q: "zurückschicken 是可分动词吗？", zh: "判断前缀类型", a: "可分", o: ["可分", "不可分"], why: "zurück- 是可分前缀", tag: "sep-judge" },
    { q: "zerstören 是可分动词吗？", zh: "判断前缀类型", a: "不可分", o: ["不可分", "可分"], why: "zer- 是不可分前缀", tag: "sep-judge" },
    { q: "vorbereiten 是可分动词吗？", zh: "判断前缀类型", a: "可分", o: ["可分", "不可分"], why: "vor- 是可分前缀（注意里面的 be- 不影响）", tag: "sep-judge" },
  ],

  /* =========================================================
   * 句子重组 —— 语序才是这三个模块真正的考点
   * =========================================================
   * ok  : 所有可接受的语序（小写写法，句首字母由程序自动大写）
   *       德语「动词第二位」允许别的成分提到句首，所以多数句子不止一个正确答案
   * end : 句末标点
   */
  buildSaetze: [
    /* --- 可分动词：主句里拆开，前缀甩到最后 --- */
    { ok: ["er steht um 7 Uhr auf", "um 7 Uhr steht er auf"], end: ".", zh: "他七点起床。",
      why: "aufstehen 拆开：变位的 steht 在第二位，前缀 auf 到句末。时间状语提到句首也行，但动词仍在第二位。", tag: "build-sep" },
    { ok: ["der Film fängt um 8 Uhr an", "um 8 Uhr fängt der Film an"], end: ".", zh: "电影八点开始。",
      why: "anfangen 拆开 → fängt … an（第三人称 a→ä）", tag: "build-sep" },
    { ok: ["sie ruft ihre Mutter an"], end: ".", zh: "她给妈妈打电话。",
      why: "anrufen 拆开 → ruft … an，宾语夹在中间", tag: "build-sep" },
    { ok: ["ich hole dich vom Bahnhof ab"], end: ".", zh: "我去火车站接你。",
      why: "abholen 拆开 → hole … ab，中间塞多少成分，ab 都在最后", tag: "build-sep" },
    { ok: ["er sieht am Abend fern", "am Abend sieht er fern"], end: ".", zh: "他晚上看电视。",
      why: "fernsehen 拆开 → sieht … fern", tag: "build-sep" },
    { ok: ["der Zug kommt um 9 Uhr an", "um 9 Uhr kommt der Zug an"], end: ".", zh: "火车九点到。",
      why: "ankommen 拆开 → kommt … an", tag: "build-sep" },
    { ok: ["sie macht das Fenster auf"], end: ".", zh: "她把窗户打开。",
      why: "aufmachen 拆开 → macht … auf", tag: "build-sep" },
    { ok: ["wir räumen das Zimmer auf"], end: ".", zh: "我们收拾房间。",
      why: "aufräumen 拆开 → räumen … auf", tag: "build-sep" },
    { ok: ["er macht das Licht aus"], end: ".", zh: "他把灯关掉。",
      why: "ausmachen 拆开 → macht … aus", tag: "build-sep" },
    { ok: ["wann fängt der Film an"], end: "?", zh: "电影什么时候开始？",
      why: "疑问词开头，动词仍在第二位，前缀照样甩到句末", tag: "build-sep" },

    /* --- 可分动词：这三种情况不拆 --- */
    { ok: ["ich muss morgen früh aufstehen", "morgen muss ich früh aufstehen"], end: ".", zh: "我明天得早起。",
      why: "情态动词 muss 占第二位，aufstehen 保持原形整个放句末，不拆", tag: "build-nosplit" },
    { ok: ["wir wollen heute Abend ausgehen", "heute Abend wollen wir ausgehen"], end: ".", zh: "我们今晚想出去。",
      why: "wollen + 原形，ausgehen 不拆", tag: "build-nosplit" },
    { ok: ["ich bin müde, weil ich früh aufstehe"], end: ".", zh: "我累，因为我起得早。",
      why: "weil 从句里动词整个跑到句末，而且不拆 → aufstehe", tag: "build-nosplit" },
    { ok: ["er sagt, dass der Zug um 9 Uhr ankommt"], end: ".", zh: "他说火车九点到。",
      why: "dass 从句，动词到句末且不拆 → ankommt", tag: "build-nosplit" },
    { ok: ["ich habe keine Zeit, dich abzuholen"], end: ".", zh: "我没时间去接你。",
      why: "带 zu 的不定式，zu 夹在前缀和词干中间 → abzuholen", tag: "build-nosplit" },
    { ok: ["kannst du das Fenster aufmachen"], end: "?", zh: "你能把窗户打开吗？",
      why: "情态动词疑问句：kannst 在句首，aufmachen 原形在句末，不拆", tag: "build-nosplit" },

    /* --- 三格四格：双宾语的先后顺序 --- */
    { ok: ["ich gebe dem Kind einen Apfel", "dem Kind gebe ich einen Apfel"], end: ".", zh: "我给这孩子一个苹果。",
      why: "两个都是名词时：人（三格 dem Kind）在前，物（四格 einen Apfel）在后", tag: "build-dual" },
    { ok: ["er schenkt seiner Freundin Blumen"], end: ".", zh: "他送女朋友花。",
      why: "收的人用三格 seiner Freundin，送的物用四格 Blumen", tag: "build-dual" },
    { ok: ["ich schicke dir eine E-Mail"], end: ".", zh: "我给你发一封邮件。",
      why: "人三格 dir 在前，物四格 eine E-Mail 在后", tag: "build-dual" },
    { ok: ["der Kellner empfiehlt uns den Fisch"], end: ".", zh: "服务员向我们推荐这鱼。",
      why: "人三格 uns 在前，物四格 den Fisch 在后", tag: "build-dual" },
    { ok: ["ich gebe es ihm"], end: ".", zh: "我把它给他。",
      why: "物用代词时顺序反过来：四格代词 es 在前，三格 ihm 在后", tag: "build-dual" },

    /* --- 身体部位：疼痛句型和反身 --- */
    { ok: ["mir tut der Kopf weh", "der Kopf tut mir weh"], end: ".", zh: "我头疼。",
      why: "der Kopf 是主语（一格），疼的人 mir 用三格，weh 在句末", tag: "build-body" },
    { ok: ["mir tun die Füße weh", "die Füße tun mir weh"], end: ".", zh: "我脚疼。",
      why: "die Füße 复数主语 → tun", tag: "build-body" },
    { ok: ["ich wasche mir die Hände"], end: ".", zh: "我洗手。",
      why: "对自己身体的动作：反身三格 mir + 定冠词 die Hände，不用 meine", tag: "build-body" },
    { ok: ["er putzt sich die Zähne"], end: ".", zh: "他刷牙。",
      why: "第三人称反身三格 sich，部位用定冠词", tag: "build-body" },
  ],
};
