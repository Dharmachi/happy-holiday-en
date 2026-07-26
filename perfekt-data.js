/**
 * 德語 Perfekt（現在完成時）訓練資料
 * 來源：課堂講義四張表（不可分 / 可分 / 規則 / 不規則動詞）
 *
 * 欄位說明：
 *  inf  : 動詞原形 Infinitiv
 *  pp   : 第二分詞 Partizip II
 *  aux  : 助動詞 "haben" 或 "sein"（第三人稱：hat / ist）
 *  fam  : 動詞家族 un=不可分, tr=可分, reg=規則, irr=不規則
 *  zh   : 中文意思
 *  ex   : 講義例句（Perfekt 完整句）
 *  note : 需要特別注意的地方（可選）
 */
window.PERFEKT = {
  families: {
    un:  { key: "un",  label: "不可分動詞", short: "不可分", rule: "不可分前綴 be-/ge-/er-/ver-/ent-/emp-/miss-/zer-，第二分詞「不加 ge」。" },
    tr:  { key: "tr",  label: "可分動詞",   short: "可分",   rule: "可分前綴（ab-/an-/auf-/aus-/ein-/mit-/um-/zu-…），ge 夾在中間：an|ge|fangen。" },
    reg: { key: "reg", label: "規則動詞",   short: "規則",   rule: "規則（弱變化）：ge…t（machen→gemacht）。-ieren 結尾的不加 ge！" },
    irr: { key: "irr", label: "不規則動詞", short: "不規則", rule: "不規則（強變化）：常見 ge…en，詞幹常變音（essen→gegessen），要背。" },
  },

  verbs: [
    /* ============ 不可分動詞 UNTRENNBARE VERBEN（不加 ge） ============ */
    { inf: "begreifen",     pp: "begriffen",     aux: "haben", fam: "un",  zh: "理解、領會",       ex: "Ich habe die Aufgabe begriffen." },
    { inf: "bekommen",      pp: "bekommen",      aux: "haben", fam: "un",  zh: "得到、收到",       ex: "Ich habe ein Geschenk bekommen." },
    { inf: "bezahlen",      pp: "bezahlt",       aux: "haben", fam: "un",  zh: "付款、支付",       ex: "Ich habe die Rechnung bezahlt." },
    { inf: "bestellen",     pp: "bestellt",      aux: "haben", fam: "un",  zh: "點餐、訂購",       ex: "Wir haben Pizza bestellt." },
    { inf: "besuchen",      pp: "besucht",       aux: "haben", fam: "un",  zh: "拜訪、參觀",       ex: "Ich habe meine Oma besucht." },
    { inf: "entdecken",     pp: "entdeckt",      aux: "haben", fam: "un",  zh: "發現",             ex: "Sie hat eine neue Stadt entdeckt." },
    { inf: "empfangen",     pp: "empfangen",     aux: "haben", fam: "un",  zh: "接待、接收",       ex: "Der Chef hat die Gäste empfangen." },
    { inf: "empfehlen",     pp: "empfohlen",     aux: "haben", fam: "un",  zh: "推薦",             ex: "Er hat ein gutes Restaurant empfohlen." },
    { inf: "entscheiden",   pp: "entschieden",   aux: "haben", fam: "un",  zh: "決定",             ex: "Ich habe mich schnell entschieden." },
    { inf: "erklären",      pp: "erklärt",       aux: "haben", fam: "un",  zh: "解釋、說明",       ex: "Der Lehrer hat die Aufgabe erklärt." },
    { inf: "erzählen",      pp: "erzählt",       aux: "haben", fam: "un",  zh: "講述、敘述",       ex: "Er hat eine Geschichte erzählt." },
    { inf: "gefallen",      pp: "gefallen",      aux: "haben", fam: "un",  zh: "使喜歡、中意",     ex: "Der Film hat mir gefallen." },
    { inf: "gehören",       pp: "gehört",        aux: "haben", fam: "un",  zh: "屬於",             ex: "Das Buch hat mir gehört." },
    { inf: "missverstehen", pp: "missverstanden",aux: "haben", fam: "un",  zh: "誤解",             ex: "Ich habe dich missverstanden." },
    { inf: "verbieten",     pp: "verboten",      aux: "haben", fam: "un",  zh: "禁止",             ex: "Der Lehrer hat das Handy verboten." },
    { inf: "verkaufen",     pp: "verkauft",      aux: "haben", fam: "un",  zh: "賣、出售",         ex: "Sie hat ihr Auto verkauft." },
    { inf: "vermieten",     pp: "vermietet",     aux: "haben", fam: "un",  zh: "出租",             ex: "Er hat seine Wohnung vermietet." },
    { inf: "vermissen",     pp: "vermisst",      aux: "haben", fam: "un",  zh: "想念",             ex: "Ich habe meine Familie vermisst." },
    { inf: "verstehen",     pp: "verstanden",    aux: "haben", fam: "un",  zh: "理解、聽懂",       ex: "Ich habe die Frage verstanden." },
    { inf: "zerbrechen",    pp: "zerbrochen",    aux: "sein",  fam: "un",  zh: "打碎、破碎",       ex: "Er hat das Glas zerbrochen.", note: "自動詞用 sein（ist zerbrochen＝碎了）；及物「打碎某物」用 haben（hat … zerbrochen），如例句。" },
    { inf: "zerstören",     pp: "zerstört",      aux: "haben", fam: "un",  zh: "摧毀、破壞",       ex: "Das Feuer hat das Haus zerstört." },

    /* ============ 可分動詞 TRENNBARE VERBEN（ge 夾中間） ============ */
    { inf: "abholen",       pp: "abgeholt",      aux: "haben", fam: "tr",  zh: "接（人）、去取",   ex: "Ich habe dich vom Bahnhof abgeholt." },
    { inf: "anfangen",      pp: "angefangen",    aux: "haben", fam: "tr",  zh: "開始",             ex: "Der Kurs hat um 9 Uhr angefangen." },
    { inf: "ankommen",      pp: "angekommen",    aux: "sein",  fam: "tr",  zh: "到達",             ex: "Der Zug ist pünktlich angekommen." },
    { inf: "anrufen",       pp: "angerufen",     aux: "haben", fam: "tr",  zh: "打電話",           ex: "Ich habe meine Mutter angerufen." },
    { inf: "aufstehen",     pp: "aufgestanden",  aux: "sein",  fam: "tr",  zh: "起床、站起",       ex: "Ich bin früh aufgestanden." },
    { inf: "aussehen",      pp: "ausgesehen",    aux: "haben", fam: "tr",  zh: "看起來",           ex: "Das Kleid hat sehr schön ausgesehen." },
    { inf: "aussteigen",    pp: "ausgestiegen",  aux: "sein",  fam: "tr",  zh: "下車",             ex: "Wir sind am Stephansplatz ausgestiegen." },
    { inf: "einkaufen",     pp: "eingekauft",    aux: "haben", fam: "tr",  zh: "購物、採買",       ex: "Ich habe im Supermarkt eingekauft." },
    { inf: "einsteigen",    pp: "eingestiegen",  aux: "sein",  fam: "tr",  zh: "上車",             ex: "Wir sind in den Bus eingestiegen." },
    { inf: "fernsehen",     pp: "ferngesehen",   aux: "haben", fam: "tr",  zh: "看電視",           ex: "Wir haben gestern Abend ferngesehen." },
    { inf: "mitbringen",    pp: "mitgebracht",   aux: "haben", fam: "tr",  zh: "帶來",             ex: "Ich habe einen Kuchen mitgebracht." },
    { inf: "mitkommen",     pp: "mitgekommen",   aux: "sein",  fam: "tr",  zh: "一起來、同行",     ex: "Mein Freund ist mitgekommen." },
    { inf: "mitnehmen",     pp: "mitgenommen",   aux: "haben", fam: "tr",  zh: "帶走、隨身帶",     ex: "Ich habe meine Kamera mitgenommen." },
    { inf: "umtauschen",    pp: "umgetauscht",   aux: "haben", fam: "tr",  zh: "換、退換",         ex: "Ich habe die Schuhe umgetauscht." },
    { inf: "umziehen",      pp: "umgezogen",     aux: "sein",  fam: "tr",  zh: "搬家",             ex: "Wir sind nach Wien umgezogen." },
    { inf: "zumachen",      pp: "zugemacht",     aux: "haben", fam: "tr",  zh: "關閉、關上",       ex: "Ich habe die Tür zugemacht." },
    { inf: "zurückschicken",pp: "zurückgeschickt",aux:"haben", fam: "tr",  zh: "寄回、退回",       ex: "Ich habe das Paket zurückgeschickt." },

    /* ============ 規則動詞 REGELMÄSSIGE VERBEN（ge…t / -ieren 不加 ge） ============ */
    { inf: "arbeiten",      pp: "gearbeitet",    aux: "haben", fam: "reg", zh: "工作",             ex: "Ihr habt am Samstag nicht gearbeitet.", note: "詞幹以 -t 結尾，加 -et：ge-arbeit-et。" },
    { inf: "buchstabieren", pp: "buchstabiert",  aux: "haben", fam: "reg", zh: "拼寫",             ex: "Wir haben das Wort buchstabiert.", note: "-ieren 結尾：不加 ge！" },
    { inf: "joggen",        pp: "gejoggt",       aux: "sein",  fam: "reg", zh: "慢跑",             ex: "Wir sind zwei Stunden in Schönbrunn gejoggt.", note: "位移動作，用 sein。" },
    { inf: "kaufen",        pp: "gekauft",       aux: "haben", fam: "reg", zh: "買",               ex: "Er hat ein T-Shirt gekauft." },
    { inf: "kochen",        pp: "gekocht",       aux: "haben", fam: "reg", zh: "煮、烹飪",         ex: "Ihr habt gestern Eier gekocht." },
    { inf: "machen",        pp: "gemacht",       aux: "haben", fam: "reg", zh: "做",               ex: "Wir haben die Hausübung gemacht." },
    { inf: "studieren",     pp: "studiert",      aux: "haben", fam: "reg", zh: "上大學、主修",     ex: "Sie hat Architektur studiert.", note: "-ieren 結尾：不加 ge！" },
    { inf: "telefonieren",  pp: "telefoniert",   aux: "haben", fam: "reg", zh: "打電話、通話",     ex: "Wir haben am Sonntag telefoniert.", note: "-ieren 結尾：不加 ge！" },
    { inf: "trainieren",    pp: "trainiert",     aux: "haben", fam: "reg", zh: "訓練、鍛鍊",       ex: "Wir haben gestern nicht trainiert.", note: "-ieren 結尾：不加 ge！" },

    /* ============ 不規則動詞 UNREGELMÄSSIGE VERBEN（ge…en，詞幹常變音） ============ */
    { inf: "essen",         pp: "gegessen",      aux: "haben", fam: "irr", zh: "吃",               ex: "Ich habe gestern Apfelstrudel gegessen." },
    { inf: "fahren",        pp: "gefahren",      aux: "sein",  fam: "irr", zh: "（乘車）行駛、開車",ex: "Wir sind gestern nach Grinzing gefahren." },
    { inf: "finden",        pp: "gefunden",      aux: "haben", fam: "irr", zh: "找到、覺得",       ex: "Nach fünf Minuten habe ich den Schlüssel gefunden." },
    { inf: "gehen",         pp: "gegangen",      aux: "sein",  fam: "irr", zh: "走、去",           ex: "Gestern bin ich ins Theater gegangen." },
    { inf: "haben",         pp: "gehabt",        aux: "haben", fam: "irr", zh: "有",               ex: "Sie hat gestern keinen Kurs gehabt.", note: "口語常用過去式：Sie hatte gestern keinen Kurs." },
    { inf: "kommen",        pp: "gekommen",      aux: "sein",  fam: "irr", zh: "來",               ex: "Ich bin gestern zu spät gekommen." },
    { inf: "lesen",         pp: "gelesen",       aux: "haben", fam: "irr", zh: "讀、閱讀",         ex: "Ihr habt einen Roman gelesen." },
    { inf: "schlafen",      pp: "geschlafen",    aux: "haben", fam: "irr", zh: "睡覺",             ex: "Am Sonntag habe ich lange geschlafen." },
    { inf: "schreiben",     pp: "geschrieben",   aux: "haben", fam: "irr", zh: "寫",               ex: "Sie hat gestern eine E-Mail geschrieben." },
    { inf: "schwimmen",     pp: "geschwommen",   aux: "sein",  fam: "irr", zh: "游泳",             ex: "Wir sind gestern zwei Kilometer geschwommen." },
    { inf: "sehen",         pp: "gesehen",       aux: "haben", fam: "irr", zh: "看、看見",         ex: "Gestern habe ich einen Horrorfilm gesehen." },
    { inf: "sein",          pp: "gewesen",       aux: "sein",  fam: "irr", zh: "是、存在",         ex: "Gestern ist er krank gewesen.", note: "口語常用過去式：Gestern war er krank." },
    { inf: "sprechen",      pp: "gesprochen",    aux: "haben", fam: "irr", zh: "說、講",           ex: "Wir haben am Wochenende Englisch gesprochen." },
    { inf: "treffen",       pp: "getroffen",     aux: "haben", fam: "irr", zh: "遇見、見面",       ex: "Er hat Freunde getroffen." },
    { inf: "trinken",       pp: "getrunken",     aux: "haben", fam: "irr", zh: "喝",               ex: "Sie hat eine Melange mit Zucker getrunken." },
  ],
};
