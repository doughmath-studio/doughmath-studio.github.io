/* Bento's talking helper.
   1) create(): an on-device dialog engine (no network, no AI service). It reuses the app's own math
      from core.js, so every number it says is the number the tabs show.
      It answers in the app's language (en, es, pt, fr, de, pl, uk, ru). For other languages the question is first
      turned into the small English the engine reads (toEnglish: the language's word list in i18n.js),
      so the same rules and the same math run for every language, and English words keep working too.
   2) mount(): the Talk view (animated Bento, voice in and out, chat). Browser only.
   Works in Node for tests: require("./agent.js").create({ core: require("./core.js"), getState }). */
(function (root, factory) {
  var I = typeof module === "object" && module.exports ? require("./i18n.js") : root.BentoI18n;
  var api = factory(I || null);
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.BentoAgent = api; root.BentoTalk = { mount: api.mount }; }
})(typeof self !== "undefined" ? self : this, function (I) {
  "use strict";

  // =====================================================================
  // Text normalising: number words, fractions, dozens, money, durations
  // =====================================================================
  var SMALL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
  var TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function r4(x) { return Math.round(x * 10000) / 10000; }
  function isLang(l) { return !!(l && l !== "en" && I && I.has(l)); }

  function wordsToDigits(t) {
    var parts = t.split(" "), out = [], i = 0;
    while (i < parts.length) {
      var w = parts[i];
      if (!has(SMALL, w) && !has(TENS, w)) { out.push(w); i++; continue; }
      var total = 0, cur = 0, last = "", j = i;
      while (j < parts.length) {
        var x = parts[j];
        if (has(SMALL, x)) {
          if (last === "small" || last === "teen" || (last === "tens" && SMALL[x] >= 10)) break;
          cur += SMALL[x]; last = SMALL[x] >= 10 ? "teen" : "small";
        } else if (has(TENS, x)) {
          if (last && last !== "hundred") break;
          cur += TENS[x]; last = "tens";
        } else if (x === "hundred" && last && last !== "hundred") {
          cur = cur * 100; last = "hundred";
        } else if (x === "thousand" && last) {
          total += cur * 1000; cur = 0; last = "hundred";
        } else if (x === "and" && last === "hundred" && j + 1 < parts.length && (has(SMALL, parts[j + 1]) || has(TENS, parts[j + 1]))) {
          /* "one hundred and twenty" */
        } else break;
        j++;
      }
      out.push(String(total + cur)); i = j;
    }
    return out.join(" ");
  }

  var CUR_SYM = "(?:(?:us|ca|c|a)\\$|\\$|€|£)";
  var MONEY_W = "(?:dollars?|bucks?|usd|cad|aud|euros?|eur|gbp|quid|zlotys?|złoty|zł|zl|pln|cents?|pence|pounds?|hryvnias?|uah|rubles?)";
  var MONEY_ANY = "(?:" + CUR_SYM + "\\s?\\d+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?\\s?(?:" + CUR_SYM + "|" + MONEY_W + "))";
  // glass250 / glass200 are internal words for a Polish glass (250 ml) and a Ukrainian or Russian glass (200 ml)
  var VOL = "cups?|tablespoons?|tbsps?|tbsp|tbs|teaspoons?|tsps?|tsp|pounds?|lbs?|lb|kilos?|kg|liters?|litres?|sticks?|ounces?|oz|glass250|glass200";
  var LETTER = "a-z\\u00df-\\u00f6\\u00f8-\\u00ff\\u0100-\\u017f\\u0400-\\u04ff";

  // ---------- other languages -> the engine's English ----------
  var COMPILED = {};
  function compileRules(list, foldIt) {
    return (list || []).map(function (r) {
      var src = foldIt ? I.foldMarks(r[0]) : r[0], rep = r[1];
      var re = new RegExp("(^| )(?:" + src + ")(?= |$)", "g");
      return [re, function () {
        var g = arguments;
        if (typeof rep === "function") return g[1] + rep.apply(null, Array.prototype.slice.call(g, 2, g.length - 2));
        return g[1] + String(rep).replace(/\$(\d)/g, function (x, n) { return g[+n + 1] == null ? "" : g[+n + 1]; });
      }];
    });
  }
  function compiled(lang) {
    if (COMPILED[lang]) return COMPILED[lang];
    var d = I.D[lang], N = d.nums || { w: {} }, w = {}, unitsW = [], tensW = [];
    Object.keys(N.w).forEach(function (k) {
      var f = I.fold(k); w[f] = N.w[k];
      if (N.w[k] > 0 && N.w[k] < 10) unitsW.push(f);
      if (N.w[k] >= 20 && N.w[k] < 100 && N.w[k] % 10 === 0) tensW.push(f);
    });
    var ufv = Object.assign({}, w);
    Object.keys(N.ufw || {}).forEach(function (k) { ufv[I.fold(k)] = N.ufw[k]; unitsW.push(I.fold(k)); });
    var c = {
      pre: compileRules(d.pre, false), nlex: compileRules(d.nlex, true), lex: compileRules(d.lex, true),
      w: w, ufv: ufv, join: (N.join || []).map(I.fold), fr: !!N.fr,
      // German writes 24 as "vierundzwanzig" (four-and-twenty)
      uf: N.uf ? new RegExp("^(" + unitsW.join("|") + ")" + N.uf + "(" + tensW.join("|") + ")$") : null
    };
    return (COMPILED[lang] = c);
  }
  function numVal(tok, c) {
    if (has(c.w, tok)) return c.w[tok];
    var m = c.uf && tok.match(c.uf);
    return m ? c.ufv[m[1]] + c.ufv[m[2]] : null;
  }
  // number words -> digits ("veinticuatro" -> 24, "trente cinq" -> 35, "quatre vingt dix" -> 90, "двадцать четыре" -> 24)
  function numberPass(t, c) {
    var toks = t.split(" "), out = [], i = 0;
    while (i < toks.length) {
      var v = numVal(toks[i], c);
      if (v == null) { out.push(toks[i]); i++; continue; }
      var cur = v, last = v, j = i + 1;
      while (j < toks.length) {
        var k = j;
        if (c.join.indexOf(toks[k]) >= 0 && k + 1 < toks.length) k++;
        var nv = numVal(toks[k], c);
        if (nv == null) break;
        if (c.fr && nv === 20 && cur === 4 && last === 4) { cur = 80; last = 80; j = k + 1; continue; }
        if (nv === 100 && cur < 10 && last === cur) { cur = cur * 100; last = 100; j = k + 1; continue; }
        var ok = last % 10 === 0 && nv < last && (nv < 10 || last >= 100 || (c.fr && (last === 60 || last === 80) && nv < 20));
        if (!ok) break;
        cur += nv; last = nv; j = k + 1;
      }
      out.push(String(cur)); i = j;
    }
    return out.join(" ");
  }
  // Rules every non-English language shares, on the English side ("9 zł 50" -> "9.50 zł").
  var POST = [
    [/(^| )(\d+) (dollars?|euros?|pounds?|zł|zl|zloty|zlotys?|hryvnias?|rubles?) (?:and |with )?(\d{1,2})(?: cents?)?(?= [,;.!?]| and | with | of |$)/g,
      function (m, b, a, u, c) { return b + a + "." + (c.length === 1 ? "0" + c : c) + " " + u; }],
    [/(^| )(\d+) (\d{1,2}) cents?(?= |$)/g, function (m, b, a, c) { return b + a + "." + (c.length === 1 ? "0" + c : c) + " bucks"; }]
  ];
  function toEnglish(t, lang) {
    var c = compiled(lang);
    t = " " + t + " ";
    c.pre.forEach(function (r) { t = t.replace(r[0], r[1]); });
    t = I.fold(t).replace(/\s+/g, " ");
    // "20 €/h", "20 zł/godz.", "300 грн/год" = per hour (in every language)
    t = t.replace(/\/ ?(?:h|hr|hora|heure|stunde|std|stde|godz|godzine|godzina|час|ч|год|годину|година)(?= |$)/g, " per hour");
    c.nlex.forEach(function (r) { t = t.replace(r[0], r[1]); });
    t = numberPass(t.trim(), c);
    t = " " + t + " ";
    c.lex.forEach(function (r) { t = t.replace(r[0], r[1]); });
    t = t.replace(/\s+/g, " ").trim();
    POST.forEach(function (r) { t = t.replace(r[0], r[1]); });
    return t.replace(/\s+/g, " ").trim();
  }
  // decimal commas and thousands dots as written in the comma languages
  function localDecimals(t) {
    t = t.replace(/(\d{1,3}(?:,\d{3})+)\.(\d+)/g, function (m, a, b) { return a.replace(/,/g, "") + "." + b; });
    t = t.replace(/(\d{1,3}(?:\.\d{3})+),(\d+)/g, function (m, a, b) { return a.replace(/\./g, "") + "." + b; });
    t = t.replace(/(^|[^\d.,])([1-9]\d{0,2}(?:\.\d{3})+)(?![\d.,])/g, function (m, p, a) { return p + a.replace(/\./g, ""); });
    return t.replace(/(\d),(\d+)/g, "$1.$2");
  }

  function prep(raw, lang) {
    var t = " " + String(raw == null ? "" : raw).toLowerCase() + " ";
    t = t.replace(/[’`´]/g, "'").replace(/[“”"«»]/g, " ").replace(/[–—]/g, " ");
    if (isLang(lang)) t = t.replace(/ʼ/g, "'").replace(/[„¿¡…]/g, " ");
    t = t.replace(/½/g, " 1/2").replace(/¼/g, " 1/4").replace(/¾/g, " 3/4").replace(/⅓/g, " 1/3").replace(/⅔/g, " 2/3").replace(/⅛/g, " 1/8");
    if (isLang(lang)) {
      t = localDecimals(t);
      t = t.replace(new RegExp("([" + LETTER + "])-(?=[" + LETTER + "])", "g"), "$1 ");
      t = t.replace(/([,;:!?()])/g, " $1 ").replace(/\.(?!\d)/g, " . ").replace(/\s+/g, " ");
    } else {
      t = t.replace(/(\d),(\d{3})(?!\d)/g, "$1$2").replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2");
      t = t.replace(/([a-z])-(?=[a-z])/g, "$1 ");
      t = t.replace(/([,;!?()])/g, " $1 ").replace(/\.(?!\d)/g, " . ").replace(/\s+/g, " ");
    }
    return t.trim();
  }

  function normalize(raw, lang) {
    var t = prep(raw, lang);
    if (isLang(lang)) t = toEnglish(t, lang);
    t = " " + wordsToDigits(t) + " ";
    // fractions: 1 1/2, 1-1/2, 3/4
    t = t.replace(/(\d+)[ -](\d+)\/(\d+)(?![\d\/])/g, function (m, a, b, c) { return +c ? String(r4(+a + b / c)) : m; });
    t = t.replace(/(\d+)\/(\d+)(?![\d\/])/g, function (m, b, c) { return +c ? String(r4(b / c)) : m; });
    t = t.replace(/(\d+(?:\.\d+)?) and (?:a )?half\b/g, function (m, a) { return String(+a + 0.5); });
    t = t.replace(/ (?:an?|1) hours? and (?:a )?half /g, " 1.5 hours ").replace(/ hour and a half /g, " 1.5 hours ");
    t = t.replace(/ half (?:an |a |1 )?hour /g, " 30 minutes ").replace(/ (?:a )?quarter (?:of )?(?:an |a |1 )?hour /g, " 15 minutes ");
    t = t.replace(/ half (?:a |1 )?dozen /g, " 6 ");
    t = t.replace(new RegExp(" (?:a |1 )?half (?:of )?(?:a |an |1 )?(" + VOL + ") ", "g"), " 0.5 $1 ");
    t = t.replace(new RegExp(" (?:a |1 )?quarter (?:of )?(?:a |an |1 )?(" + VOL + ") ", "g"), " 0.25 $1 ");
    t = t.replace(new RegExp(" (?:a |1 )?third (?:of )?(?:a |an |1 )?(" + VOL + ") ", "g"), " 0.3333 $1 ");
    t = t.replace(new RegExp(" (\\d+) quarters? (?:of )?(?:a |an )?(" + VOL + ") ", "g"), function (m, n, u) { return " " + r4(n * 0.25) + " " + u + " "; });
    t = t.replace(new RegExp(" (\\d+) thirds? (?:of )?(?:a |an )?(" + VOL + ") ", "g"), function (m, n, u) { return " " + r4(n / 3) + " " + u + " "; });
    // "$15 a dozen" is a price per dozen, not 12 pieces
    t = t.replace(new RegExp("(" + MONEY_ANY + ") (?:a|per|the|each) dozen", "g"), "$1 perdozen");
    t = t.replace(/(\d+(?:\.\d+)?) dozen\b/g, function (m, n) { return String(r4(n * 12)); });
    t = t.replace(/\b(?:a|1) dozen\b/g, "12").replace(/\bper dozen\b/g, "perdozen").replace(/\bdozen\b/g, "12");
    // "9 dollars 50", "9 dollars and 50 cents"
    t = t.replace(/(\d+) (dollars?|bucks|euros?|zlotys?|złoty) (?:and )?(\d{1,2})(?: cents?| groszy)?(?![\d.])/g, function (m, a, u, c) { return a + "." + (c.length === 1 ? "0" + c : c) + " " + u; });
    // money or a number + "an hour" = hourly rate
    t = t.replace(new RegExp("(" + MONEY_ANY + "|\\d+(?:\\.\\d+)?) ?(?:an?|per|each|every|by the|\\/) ?(?:hour|hr|h)\\b", "g"), "$1 /hr");
    t = t.replace(new RegExp("(" + MONEY_ANY + "|\\d+(?:\\.\\d+)?) ?hourly\\b", "g"), "$1 /hr");
    t = t.replace(/(\d)\/(?:hour|hr|h)\b/g, "$1 /hr");
    t = t.replace(new RegExp(" (?:an?|1) (hours?|hrs?|minutes?|mins?|cups?|tablespoons?|tbsps?|tbsp|tbs|teaspoons?|tsps?|tsp|pounds?|lbs?|lb|ounces?|oz|kilos?|kg|kilograms?|liters?|litres?|ml|sticks?|egg|large egg|glass250|glass200) ", "g"), " 1 $1 ");
    // 1 hour 30 minutes -> 90 minutes
    t = t.replace(/(\d+(?:\.\d+)?) ?(?:hours?|hrs?|h) (?:and )?(\d+(?:\.\d+)?) ?(?:minutes?|mins?|min|m)\b/g, function (m, h, mi) { return r4(h * 60 + +mi) + " minutes"; });
    return t.replace(/\s+/g, " ").trim();
  }

  // =====================================================================
  // Finding numbers and what they belong to
  // =====================================================================
  var NOUNS = "cookies?|cupcakes?|pieces?|pcs|muffins?|brownies?|blondies?|bars?|cinnamon rolls?|rolls?|cake pops?|cakes?|cheesecakes?|whoopie pies?|pies?|macarons?|macaroons?|donuts?|doughnuts?|loaves|loaf|slices?|scones?|buns?|croissants?|biscuits?|treats?|items?|servings?|portions?|tartlets?|tarts?|bagels?|pretzels?|truffles?|eclairs?|cannoli|breads?|baguettes?|brookies?|bites?|squares?|minis?";
  var NOUN_RE = new RegExp("\\b(" + NOUNS + ")\\b");
  function rxFor(word) {
    return {
      nounAfter: new RegExp("^ ?(?:(?!(?:for|of|to|in|on|at|with|and|per|is|are|cost|costs|a|the|each|from)\\b)[" + word + "']+ ){0,3}?(?:" + NOUNS + ")\\b"),
      boxAfter: new RegExp("^ ?(?:pieces? |pcs |pc |count |ct )?(?:[" + word + "]+ )?(?:box|boxes|bundles?|trays?|platters?|assortments?)\\b"),
      name: "[" + word + " ]+"
    };
  }
  var RX_EN = rxFor("a-z"), RX_X = rxFor("a-z\\u0400-\\u04ff");
  function rx(lang) { return isLang(lang) ? RX_X : RX_EN; }
  var BOX_BEFORE = /(?:box|boxes|bundles?|packs?|sets?|trays?|platters?|assortments?|tins?|bags?) (?:of |with )?(?:about )?$/;

  function plural(n) {
    if (!n) return "pieces";
    if (n === "pcs" || n === "piece") return "pieces";
    if (n === "loaf") return "loaves";
    if (/(?:s|cannoli)$/.test(n)) return n;
    return n + "s";
  }

  function mentions(t, cur, lang) {
    var X = rx(lang);
    var re = new RegExp(
      "(" + CUR_SYM + ")\\s?(\\d+(?:\\.\\d+)?)" +
      "|(\\d+(?:\\.\\d+)?)\\s?(" + CUR_SYM + "|" + MONEY_W + ")(?![a-z])" +
      "|(\\d+(?:\\.\\d+)?)\\s?(%|percent|per cent|pct)" +
      "|(\\d+(?:\\.\\d+)?)\\s?(hours?|hrs?|h|minutes?|mins?|min|m)(?![a-z])" +
      "|(\\d+(?:\\.\\d+)?)", "g");
    var out = [], m;
    while ((m = re.exec(t))) {
      var o = { s: m.index, e: m.index + m[0].length, text: m[0] };
      if (m[2] != null) { o.kind = "money"; o.v = +m[2]; }
      else if (m[3] != null) {
        var u = m[4];
        o.v = +m[3];
        if (/^(?:cents?|pence)$/.test(u)) { o.kind = "money"; o.v = o.v / 100; }
        else if (/^pounds?$/.test(u)) {
          if (cur === "£" && !/^ of\b/.test(t.slice(o.e))) o.kind = "money"; else o.kind = "weight";
        } else o.kind = "money";
      } else if (m[5] != null) { o.kind = "percent"; o.v = +m[5]; }
      else if (m[7] != null) { o.kind = "duration"; o.v = /^h/.test(m[8]) ? +m[7] * 60 : +m[7]; }
      else { o.kind = "plain"; o.v = +m[9]; }
      var after = t.slice(o.e, o.e + 40), before = t.slice(Math.max(0, o.s - 30), o.s);
      if (/^ ?\/hr\b/.test(after) && (o.kind === "money" || o.kind === "plain")) o.rate = true;
      if (/^ ?perdozen\b/.test(after)) o.perDozen = true;
      if (o.kind === "plain") {
        if (BOX_BEFORE.test(before) || X.boxAfter.test(after)) o.box = true;
        else if (X.nounAfter.test(after)) o.noun = true;
      }
      out.push(o);
    }
    return out;
  }

  // [slot, regex, extra distance, direction ("before" = keyword must come before the number), max gap]
  var KW = [
    ["loss", /\b(?:lose|loses|losing|loss|lost|waste\w*|break\w*|broken|burn\w*|spoil\w*|reject\w*|fail\w*|tasting|samples?)\b/g, 0],
    ["margin", /\b(?:margin|profit)\b/g, 0],
    ["markup", /\bmark ?up\b/g, 0],
    ["rate", /\b(?:rate|wage|hourly|pay myself|pay me|my time is worth|labou?r)\b/g, 0],
    ["rate", /\b(?:hours?|hrs?|minutes?|mins?) (?:at|@)\b/g, 1, "before", 4],
    ["pack", /\b(?:packag\w*|packing|bags?|wrap\w*|stickers?|labels?|ribbons?|containers?|cello\w*|liners?)\b/g, 0],
    ["packBox", /\b(?:box|boxes|tins?)\b/g, 1],
    ["ovh", /\b(?:overheads?|electric\w*|utilit\w*|gas|power|energy|rent|oven|fees?|kitchen|insurance)\b/g, 0],
    ["ing", /\b(?:ingredients?|groceries|supplies|materials|food cost|flour|butter|sugar|eggs?|chocolate|batch costs?|spend|spent)\b/g, 0],
    ["ing", /\b(?:costs?|cost me|paid|pay|price of|is|are)\b/g, 8],
    ["now", /\b(?:charge|charging|ask|asking|sell|selling|sold)(?: \S+){0,3} (?:for|at)\b|\b(?:currently|my price is|my current price|i charge|i'm charging|i am charging)\b/g, 0, null, null, /(?:should|do|to|can|could|would|will|must|much|what)(?: i| you| we)? $/],
    ["pcs", /\b(?:makes?|making|made|yields?|batch of|recipe of|bakes?|baking|gets?|gives?)\b/g, 0, "before", 14],
    ["pcs", /\bfor\b/g, 6, "before", 3]
  ];
  var COMPAT = {
    money: ["ing", "pack", "ovh", "rate", "boxPack", "now"],
    plain: ["pcs", "ing", "pack", "ovh", "rate", "margin", "loss", "boxPack"],
    percent: ["margin", "loss", "markup"],
    duration: ["mins"]
  };
  var SEP = /(?: [,;!?.] | (?:and|with|plus|but|also|then|while) )/g;

  function clauseOf(t) {
    var cuts = [], m;
    SEP.lastIndex = 0;
    while ((m = SEP.exec(t))) { cuts.push(m.index); SEP.lastIndex = m.index + 1; }
    return function (pos) { var c = 0; for (var i = 0; i < cuts.length; i++) if (cuts[i] < pos) c++; return c; };
  }

  // Pulls price inputs out of a sentence. ctx: { cur, box (bool), prefer (slot to fill first), lang }
  function extractPrice(t, ctx) {
    ctx = ctx || {};
    var ms = mentions(t, ctx.cur, ctx.lang), clause = clauseOf(t), vals = {}, mins = 0, hasMins = false, notes = {};
    function put(m, slot) {
      if (m.used) return false;
      if (slot === "packBox") slot = ctx.box ? "boxPack" : "pack";
      if (slot === "markup") {
        if (vals.margin != null) return false;
        vals.margin = r4(m.v / (100 + m.v) * 100); notes.markup = m.v; m.used = true; return true;
      }
      if (vals[slot] != null) return false;
      vals[slot] = m.perDozen && slot === "now" ? m.v / 12 : m.v; m.used = true; return true;
    }
    var lossKw = [];
    KW[0][1].lastIndex = 0;
    var lm;
    while ((lm = KW[0][1].exec(t))) lossKw.push(lm.index);
    ms.forEach(function (m) {
      if (m.kind === "duration") { mins += m.v; hasMins = true; m.used = true; }
      else if (m.rate) put(m, "rate");
      else if (m.kind === "plain" && m.box) { if (vals.box == null) { vals.box = m.v; m.used = true; } }
      else if (m.kind === "plain" && m.noun) {
        var lossBefore = lossKw.some(function (p) { return p < m.s && m.s - p < 16 && clause(p) === clause(m.s); });
        if (lossBefore) { if (vals.lossPcs == null) { vals.lossPcs = m.v; m.used = true; } }
        else put(m, "pcs");
      }
    });
    if (hasMins) vals.mins = r4(mins);
    var cands = [];
    ms.forEach(function (m) {
      if (m.used || !COMPAT[m.kind]) return;
      KW.forEach(function (k) {
        var slot = k[0], target = slot === "packBox" ? (ctx.box ? "boxPack" : "pack") : slot;
        if (COMPAT[m.kind].indexOf(target) < 0 && !(slot === "markup" && m.kind === "percent")) return;
        var re = k[1], km;
        re.lastIndex = 0;
        while ((km = re.exec(t))) {
          var ks = km.index, ke = ks + km[0].length;
          if (clause(ks) !== clause(m.s)) continue;
          var before = ke <= m.s, gap = before ? m.s - ke : (ks >= m.e ? ks - m.e : 0);
          if (k[3] === "before" && !before) continue;
          if (k[5] && k[5].test(t.slice(Math.max(0, ks - 14), ks))) continue;
          if (k[4] != null && gap > k[4]) continue;
          // a bare number is more likely a count than money: money words prefer real money mentions
          var plainMoney = m.kind === "plain" && ["ing", "pack", "ovh", "boxPack"].indexOf(target) >= 0 ? 8 : 0;
          cands.push({ m: m, slot: slot, score: gap + (k[2] || 0) + plainMoney });
        }
      });
    });
    cands.sort(function (a, b) { return a.score - b.score || a.m.s - b.m.s; });
    cands.forEach(function (c) { put(c.m, c.slot); });
    // numbers with no label: money -> ingredients, plain -> pieces (or box size), percent -> margin
    ms.forEach(function (m) {
      if (m.used) return;
      var order = { money: ["ing"], plain: ctx.box ? ["box", "pcs"] : ["pcs"], percent: ["margin"] }[m.kind] || [];
      if (ctx.prefer && COMPAT[m.kind] && (COMPAT[m.kind].indexOf(ctx.prefer) >= 0 || ctx.prefer === "box" && m.kind === "plain")) order = [ctx.prefer].concat(order);
      for (var i = 0; i < order.length; i++) if (put(m, order[i])) break;
    });
    var nm = t.match(NOUN_RE);
    return { vals: vals, notes: notes, noun: nm ? plural(nm[1]) : null, count: ms.filter(function (m) { return m.kind !== "weight"; }).length };
  }

  // =====================================================================
  // Intents
  // =====================================================================
  var RE = {
    cancel: /^(?:cancel|stop|never ?mind|forget it|start over|reset|no thanks|nothing)\b/,
    greet: /^(?:hi|hello|hey|hiya|howdy|yo|good (?:morning|afternoon|evening)|hola|greetings)\b/,
    thanks: /\b(?:thanks|thank you|thank u|thx|ty|cheers|appreciate it|great job|awesome|perfect|love it)\b/,
    help: /\b(?:help|what can you do|what do you do|who are you|what are you|how does this work|how do you work|what can i ask)\b/,
    pro: /\b(?:photos?|pictures?|pic|image|camera|snap|scan|bookkeep\w*|accounting|invoic\w*|track (?:my )?orders|order track\w*|orders? and deposits|bento pro|pro version|pro features?|pro tab|waitlist|wait list|premium|upgrade)\b/,
    faqMarkup: /\bmark ?up\b|\bmargin\b.*\b(?:vs|versus|or|difference|mean|means|explain)\b|\b(?:what is|what's|whats|explain|define)\b.*\bmargin\b/,
    faqDeposit: /\b(?:deposits?|down ?payments?|upfront|up front|non ?refundable|retainer)\b/,
    faqTime: /\b(?:my time|myself|my labou?r|my hours|hourly rate|per hour|my work)\b/,
    faqTimeQ: /\b(?:charge|pay|paid|price|worth|count|bill|rate|what|how much|how)\b/,
    faqCottage: /\b(?:cottage|licen[cs]e\w*|permits?|legal\w*|illegal|laws?|allowed to sell|health (?:department|dept|inspector|code)|regulat\w*|inspect\w*|food safety|food hygiene|registration|register my|sell(?:ing)? from home|home kitchen rules)\b/,
    faqHowTo: /\bhow (?:do|should|to|can|would|could) (?:i |you |we |one )?(?:price|set (?:a |my )?prices?|work out (?:a |my )?prices?|calculate (?:a |my )?prices?)\b|\bhow to price\b|\bpricing (?:tips|advice|formula|guide)\b|\bprice baked goods\b/,
    recipe: /\b(?:what(?:'s| is| does)?|how much)\b.*\b(?:recipe|batch)\b.*\bcosts?\b|\b(?:recipe|batch) costs?\b|\bcost (?:of|for) (?:my |the |this |one )?(?:recipe|batch)\b|\bhow much (?:is|does) (?:my |the |this |one )?(?:recipe|batch)\b|\bcost my recipe\b/,
    priceRecipe: /\bprice (?:my|the|this) recipe\b|\bprice it\b|\buse (?:my|the) recipe\b|\bfrom (?:my|the) recipe\b/,
    scale: /\bscal(?:e|ing)\b|\bresize\b|\bmultiply\b|\bdouble (?:the|my|this|it|a|recipe|batch)\b|\bdouble$|\btriple\b|\bquadruple\b|\bhalve\b|\bhalf (?:the |my |a )?(?:recipe|batch)\b|\bi need \d|\bneed to make \d|\bmake \d+(?:\.\d+)? instead\b|\bfor \d+ (?:people|guests|kids)\b|\binstead of \d/,
    box: /\b(?:box|boxes|bundles?|platters?|trays?|gift sets?|assortments?)\b/,
    price: /\b(?:price|prices|pricing|charge|sell|selling|worth|cost per|per piece|per cookie|each|profit|how much should|how much to|what should i ask)\b/,
    unit: new RegExp("(\\d+(?:\\.\\d+)?)? ?\\b(fl oz|fluid ounces?|cups?|tablespoons?|tbsps?|tbsp|tbs|tbl|teaspoons?|tsps?|tsp|milliliters?|millilitres?|ml|liters?|litres?|ounces?|oz|pounds?|lbs?|lb|kilograms?|kilos?|kg|sticks?|glass250|glass200)\\b"),
    egg: /(\d+(?:\.\d+)?)? ?\b(?:large )?(egg whites?|egg yolks?|yolks?|eggs?)\b/,
    grams: /\b(?:grams?|gr|g|weigh\w*|weight|convert)\b/
  };
  var UNIT_MAP = [
    [/^(?:cups?)$/, "cup"], [/^(?:tablespoons?|tbsps?|tbsp|tbs|tbl)$/, "tbsp"], [/^(?:teaspoons?|tsps?|tsp)$/, "tsp"],
    [/^(?:ml|milliliters?|millilitres?)$/, "ml"], [/^(?:liters?|litres?)$/, "l"], [/^(?:fl oz|fluid ounces?)$/, "fl oz"],
    [/^(?:ounces?|oz)$/, "oz"], [/^(?:pounds?|lbs?|lb)$/, "lb"], [/^(?:kg|kilos?|kilograms?)$/, "kg"], [/^sticks?$/, "stick"],
    [/^glass250$/, "glass250"], [/^glass200$/, "glass200"]
  ];
  var GLASS_ML = { glass250: 250, glass200: 200 };
  function unitKey(w) { for (var i = 0; i < UNIT_MAP.length; i++) if (UNIT_MAP[i][0].test(w)) return UNIT_MAP[i][1]; return null; }
  var UNIT_NAMES = { cup: ["cup", "cups", "cup", "cups"], tbsp: ["tbsp", "tbsp", "tablespoon", "tablespoons"], tsp: ["tsp", "tsp", "teaspoon", "teaspoons"],
    ml: ["ml", "ml", "milliliter", "milliliters"], l: ["l", "l", "liter", "liters"], "fl oz": ["fl oz", "fl oz", "fluid ounce", "fluid ounces"],
    oz: ["oz", "oz", "ounce", "ounces"], lb: ["lb", "lb", "pound", "pounds"], kg: ["kg", "kg", "kilogram", "kilograms"], g: ["g", "g", "gram", "grams"],
    piece: ["piece", "pieces", "piece", "pieces"] };
  function unitLabelEn(u, n, spoken) { var a = UNIT_NAMES[u] || [u, u, u, u]; var one = n <= 1 + 1e-9; return spoken ? (one ? a[2] : a[3]) : (one ? a[0] : a[1]); }

  function hasData(t) { return new RegExp(MONEY_ANY).test(t) || /\d\s?(?:%|percent)/.test(t); }
  function isUnits(t, lang) {
    var u = t.match(RE.unit);
    if (u && unitKey(u[2]) && !hasData(t) && (RE.grams.test(t) || /\bhow (?:much|many)\b/.test(t) || new RegExp("^(?:\\d+(?:\\.\\d+)? )?" + u[2] + " (?:of )?" + rx(lang).name + "$").test(t))) return true;
    return RE.egg.test(t) && /\b(?:grams?|g|weigh\w*)\b/.test(t) && !hasData(t);
  }

  function classify(t, lang) {
    var data = hasData(t);
    if (RE.cancel.test(t)) return "cancel";
    if (isUnits(t, lang)) return "units";
    if (RE.pro.test(t) && !data) return "pro";
    if (!data) {
      if (RE.faqCottage.test(t)) return "faq:cottage";
      if (RE.faqDeposit.test(t)) return "faq:deposit";
      if (RE.faqTime.test(t) && RE.faqTimeQ.test(t) && !/\d/.test(t)) return "faq:time";
      if (RE.faqMarkup.test(t)) return "faq:markup";
      if (RE.faqHowTo.test(t)) return "faq:howto";
      if (RE.recipe.test(t) && !RE.priceRecipe.test(t) && !/\d/.test(t)) return "recipe";
      if (RE.scale.test(t)) return "scale";
    }
    var ms = mentions(t, null, lang);
    if (ms.some(function (m) { return m.box; }) || (RE.box.test(t) && /\b(?:price|cost|charge|sell|how much)\b/.test(t) && !/\bpackag/.test(t))) return "box";
    if (RE.priceRecipe.test(t)) return "price";
    if (RE.price.test(t)) return "price";
    if (data && ms.some(function (m) { return m.kind === "plain" || m.kind === "duration"; })) return "price";
    var nums = ms.filter(function (m) { return m.kind !== "weight"; });
    if (nums.length >= 2 && (ms.some(function (m) { return m.noun || m.rate || m.kind === "duration"; }) || /\b(?:ingredients?|costs?|spend|spent)\b/.test(t))) return "price";
    if (RE.greet.test(t)) return "greet";
    if (RE.thanks.test(t)) return "thanks";
    if (RE.help.test(t)) return "help";
    return "unknown";
  }

  // =====================================================================
  // Spoken vs shown text
  // =====================================================================
  var CUR_WORDS = { "$": ["dollar", "dollars", "cent", "cents"], "C$": ["dollar", "dollars", "cent", "cents"], "A$": ["dollar", "dollars", "cent", "cents"],
    "€": ["euro", "euros", "cent", "cents"], "£": ["pound", "pounds", "penny", "pence"], "zł": ["zloty", "zloty", "grosz", "groszy"] };
  // Money as people say it: "2 dollars and 25 cents", "9 złotych 50 groszy", "9 євро 50 центів".
  function spokenMoney(v, cur, lang) {
    var neg = v < 0, c = Math.round(Math.abs(v) * 100), whole = Math.floor(c / 100), cents = c % 100, out = [];
    if (!isLang(lang)) {
      var w = CUR_WORDS[cur] || CUR_WORDS.$;
      if (whole > 0 || cents === 0) out.push(whole + " " + (whole === 1 ? w[0] : w[1]));
      if (cents > 0) out.push(cents + " " + (cents === 1 ? w[2] : w[3]));
      return (neg ? "minus " : "") + out.join(" and ");
    }
    var M = I.D[lang].money, ww = M[cur] || M.$, minus = neg ? I.D[lang].words.minus + " " : "";
    if (!ww[1] && cents > 0) {
      // no everyday word for the cents in this language: the number and the currency name
      var x = c / 100;
      return minus + I.fill("{n}", { n: localDec(lang, x.toFixed(2)) }) + " " + I.pick(ww[0], lang, x);
    }
    if (whole > 0 || cents === 0) out.push(whole + " " + I.pick(ww[0], lang, whole));
    if (cents > 0) out.push(cents + " " + I.pick(ww[1], lang, cents));
    return minus + out.join(M.join);
  }
  function localDec(lang, s) { return lang === "en" ? s : String(s).replace(".", ","); }

  var DEFAULT_CHIPS = ["Price my cookies", "2 cups flour in grams", "Scale my recipe"];
  var CHIP_KEYS = ["c.priceCookies", "c.cupsFlour", "c.scale"];
  function chipsFor(lang) { return CHIP_KEYS.map(function (k) { return I ? I.t(lang || "en", k) : DEFAULT_CHIPS[CHIP_KEYS.indexOf(k)]; }); }
  function tipsFor(lang) { var out = []; for (var i = 0; i < 10; i++) out.push(I.t(lang || "en", "tip." + i)); return out; }
  var TIPS = I ? tipsFor("en") : [];

  // =====================================================================
  // The engine
  // =====================================================================
  function create(opts) {
    var C = opts.core;
    var getState = opts.getState;
    var pending = null;
    var lg = "en";

    function curLang() {
      var l = opts.lang != null ? (typeof opts.lang === "function" ? opts.lang() : opts.lang) : (getState() || {}).lang;
      return I && I.has(l) ? l : "en";
    }
    function cur() { return (getState() || {}).cur || "$"; }
    function t(key, vars, n) { return I.t(lg, key, vars, n); }
    function T(key, vars, n) { return I.parts(lg, key, vars, n); }
    function seg(kd, ks, vars) { return { d: T(kd, vars), s: T(ks, vars) }; }
    var NL = { d: "\n", s: " " };
    function words() { return I.D[lg].words; }
    function nEn(x) { return Number(C.fmtEn(x)); }

    function renderMode(list, mode, c) {
      var out = "";
      (list || []).forEach(function (p) {
        if (p == null || p === false) return;
        if (typeof p === "string" || typeof p === "number") { out += p; return; }
        if (Array.isArray(p)) { out += renderMode(p, mode, c); return; }
        var d = mode === "d";
        if (p.m != null) out += d ? C.money(p.m, c, lg) : spokenMoney(p.m, c, lg);
        else if (p.p != null) {
          if (d) out += C.pct(p.p, lg);
          else if (lg === "en") out += C.pct(p.p).replace("%", " percent");
          else { var pv = Math.round(p.p * 10) / 10; out += C.localNum(String(pv), lg) + " " + I.pick(words().percent, lg, pv); }
        } else if (p.g != null) {
          if (lg === "en") out += C.fmt(p.g) + (d ? " g" : " grams");
          else out += C.fmt(p.g, lg) + " " + C.unitLabel("g", nEn(p.g), lg, !d);
        } else if (p.min != null) {
          if (lg === "en") out += C.fmt(p.min) + (d ? " min" : (p.min === 1 ? " minute" : " minutes"));
          else out += C.fmt(p.min, lg) + " " + (d ? words().min : I.pick(words().minute, lg, nEn(p.min)));
        } else if (p.u) {
          if (lg === "en") out += C.fmt(p.u[0]) + " " + unitLabelEn(p.u[1], p.u[0], !d);
          else out += C.fmt(p.u[0], lg) + " " + C.unitLabel(p.u[1], nEn(p.u[0]), lg, !d);
        } else {
          var v = d ? p.d : p.s;
          if (Array.isArray(v)) out += renderMode(v, mode, c);
          else out += v || "";
        }
      });
      return out;
    }
    function render(parts) {
      var c = cur(), d = renderMode(parts, "d", c), s = renderMode(parts, "s", c);
      var about = lg === "en" ? "about" : words().about, times = lg === "en" ? "times" : words().times;
      s = s.replace(/≈/g, about).replace(/×/g, times).replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
      return { text: d.trim(), speech: s };
    }
    function reply(intent, parts, o) {
      o = o || {};
      var r = render(typeof parts === "string" ? [parts] : parts);
      return { intent: intent, text: r.text, speech: r.speech, mood: o.mood || "happy", actions: o.actions || [], chips: o.chips || chipsFor(lg), data: o.data || null, blush: !!o.blush };
    }
    function numStr(x) { return lg === "en" ? String(x) : C.localNum(String(x), lg); }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    // ---------- bakery nouns in the language ----------
    var NOUN_KEY = { cookies: "cookies", biscuits: "cookies", brookies: "cookies", cupcakes: "cupcakes", muffins: "muffins", brownies: "brownies", blondies: "brownies",
      cakes: "cakes", "cake pops": "pieces", cheesecakes: "cheesecakes", pies: "pies", "whoopie pies": "pieces", buns: "buns", rolls: "buns", "cinnamon rolls": "buns",
      breads: "breads", loaves: "breads", baguettes: "breads", croissants: "croissants", donuts: "donuts", doughnuts: "donuts", slices: "slices",
      tarts: "tarts", tartlets: "tarts", macarons: "macarons", macaroons: "macarons", eclairs: "eclairs" };
    function nounData(noun) {
      var N = I.D[lg].nouns;
      if (lg === "en") return { how: I.fill(N._how, { noun: noun }), n: function (k) { return I.fill(N._n, { n: k, noun: noun }); } };
      var e = N[NOUN_KEY[noun] || "pieces"] || N.pieces;
      return { how: e.how, n: function (k) { return I.fill(I.pick(e.n, lg, +k), { n: numStr(k) }); } };
    }
    function piecesStr(n) { return t("n.pieces", { n: numStr(n) }, +n); }

    // ---------- Price per piece / box ----------
    var LBL = ["pcs", "ing", "loss", "pack", "mins", "rate", "ovh", "margin"];
    // Says which values came from the Price tab: listed on screen, named (not read out) in speech.
    function priceDefaultsText(used, v) {
      var c = cur(), N = function (k) { return C.num(v[k], "en"); }, M = function (k) { return C.money(N(k), c, lg); }, bits = [];
      if (used.pcs && used.ing) bits.push(t("b.pcsIng", { pieces: piecesStr(N("pcs")), ing: M("ing") }));
      else if (used.pcs) bits.push(t("b.pcs", { pieces: piecesStr(N("pcs")) }));
      else if (used.ing) bits.push(t("b.ing", { ing: M("ing") }));
      if (used.loss) bits.push(t("b.loss", { loss: C.pct(N("loss"), lg) }));
      if (used.pack) bits.push(t("b.pack", { pack: M("pack") }));
      if (used.mins && used.rate) bits.push(t("b.minsRate", { mins: C.fmt(N("mins"), lg), rate: M("rate") }));
      else if (used.mins) bits.push(t("b.mins", { mins: C.fmt(N("mins"), lg) }));
      else if (used.rate) bits.push(t("b.rate", { rate: M("rate") }));
      if (used.ovh) bits.push(t("b.ovh", { ovh: M("ovh") }));
      if (used.margin) bits.push(t("b.margin", { margin: C.pct(N("margin"), lg) }));
      if (!bits.length) return [];
      var names = LBL.filter(function (k) { return used[k]; }).map(function (k) { return t("lbl." + k); });
      return [NL, { d: t("a.fromTab", { list: bits.join(", ") }), s: t("a.fromTab_s", { names: I.joinList(lg, names) }) }];
    }

    function askFor(p, slot) {
      p.ask = slot;
      pending = p;
      var noun = p.noun || "pieces", nd = nounData(noun);
      if (slot === "pcs") return reply("ask:pcs", T("a.askPcs", { how: nd.how }), { mood: "worried", chips: [nd.n(12), nd.n(24), nd.n(36)], data: { ask: slot } });
      if (slot === "ing") return reply("ask:ing", T("a.askIng", { ex: { m: 9.5 } }), { mood: "worried", chips: [C.money(5, cur(), lg), C.money(10, cur(), lg), t("price.fromRecipe")], data: { ask: slot } });
      if (slot === "box") return reply("ask:box", T("a.askBox"), { mood: "worried", chips: ["6", "12", "24"], data: { ask: slot } });
      if (slot === "margin") return reply("ask:margin", T("a.askMargin"), { mood: "worried", chips: [C.pct(30, lg), C.pct(35, lg), C.pct(40, lg)], data: { ask: slot } });
      return null;
    }

    // a value typed in the Price tab, as a plain number string ("1.500" typed in German is "1500")
    function fromTab(x) {
      var s = String(x == null ? "" : x);
      if (lg === "en" || s.trim() === "") return s;
      return String(C.num(s, lg));
    }

    function handlePrice(tx, isBox, continuing) {
      var st = getState(), p = continuing ? pending : { intent: isBox ? "box" : "price", given: {}, noun: null, box: null, boxPack: null };
      if (isBox) p.intent = "box";
      pending = null;
      var ex = extractPrice(tx, { cur: st.cur, box: p.intent === "box", prefer: continuing ? p.ask : null, lang: lg });
      var g = ex.vals;
      ["pcs", "ing", "loss", "pack", "mins", "rate", "ovh", "margin", "now", "lossPcs"].forEach(function (k) { if (g[k] != null) p.given[k] = g[k]; });
      if (g.box != null) p.box = g.box;
      if (g.boxPack != null) p.boxPack = g.boxPack;
      if (ex.noun && ex.noun !== "pieces") p.noun = ex.noun;
      else if (!p.noun && ex.noun) p.noun = ex.noun;
      if (ex.notes.markup != null) p.markup = ex.notes.markup;
      var fromRecipe = false;
      if (RE.priceRecipe.test(tx) && p.given.ing == null) {
        var rt = C.recipeTotal(st.recipe, lg), mk = Math.floor(C.num(st.recipe.makes, lg));
        if (rt.total > 0) {
          p.given.ing = Math.round(rt.total * 100) / 100;
          if (p.given.pcs == null && mk > 0) p.given.pcs = mk;
          fromRecipe = st.recipe.name || t("a.yourRecipeLc");
        }
      }
      if (p.given.lossPcs != null && p.given.pcs > 0 && p.given.loss == null) p.given.loss = r4(p.given.lossPcs / p.given.pcs * 100);
      // what is still missing? (one question at a time)
      if (p.intent === "box" && p.box == null) return askFor(p, "box");
      var batchGiven = p.given.pcs != null || p.given.ing != null;
      if (p.intent === "price" || batchGiven) {
        if (p.given.pcs == null || Math.floor(p.given.pcs) < 1) return askFor(p, "pcs");
        if (p.given.ing == null) return askFor(p, "ing");
      }
      if (p.given.margin != null && (p.given.margin < 0 || p.given.margin >= 95)) { delete p.given.margin; return askFor(p, "margin"); }
      // fill the rest from the Price tab
      var v = {}, used = {};
      ["pcs", "ing", "loss", "pack", "mins", "rate", "ovh", "margin"].forEach(function (k) {
        if (p.given[k] != null) v[k] = String(p.given[k]);
        else { v[k] = fromTab(st.price[k]); used[k] = true; }
      });
      var r = C.priceCalc(v, "en");
      if (!r.ok) {
        if (r.error === "margin") return askFor(p, "margin");
        return askFor(p, "pcs");
      }
      var values = Object.assign({}, v);
      var noun = p.noun || "pieces", nd = nounData(noun), mood = "excited", parts;
      if (p.intent === "box") {
        var n = Math.floor(p.box), bp = p.boxPack || 0, total = r.price * n + bp, cost = r.cost * n + bp, keep = total - cost;
        var bv = { total: { m: total }, n: n, price: { m: r.price }, bp: { m: bp } };
        parts = [bp ? seg("a.boxPlus", "a.boxPlus_s", bv) : seg("a.box", "a.box_s", bv), NL, T("a.boxCost", { cost: { m: cost }, keep: { m: keep } })];
        parts = parts.concat(priceDefaultsText(used, v));
        return reply("box", parts, { mood: mood, actions: [{ type: "price", label: t("act.price"), values: values }],
          chips: [t("c.box6"), t("c.deposits"), t("c.margin")],
          data: { values: values, result: r, used: used, count: n, boxPack: bp, total: total, cost: cost, keep: keep } });
      }
      var count = nd.n(r.pcs);
      parts = [fromRecipe ? T("a.priceHeadRecipe", { recipe: fromRecipe, count: count, ing: { m: r.ing } }) : T("a.priceHead", { count: count, ing: { m: r.ing } }),
        NL, seg("a.trueCost", "a.trueCost_s", { cost: { m: r.cost } }),
        NL, seg("a.charge", "a.charge_s", { price: { m: r.price }, dozen: { m: r.dozen } }),
        NL, seg("a.profit", "a.profit_s", { profit: { m: r.profit }, batch: { m: r.batch } })];
      if (p.given.lossPcs != null && r.pcs > 0) {
        var an = /^(?:8|11|18)/.test(C.pct(r.loss, "en"));
        parts.push(NL, T(an ? "a.lossPcsAn" : "a.lossPcs", { lost: C.fmt(p.given.lossPcs, lg), pcs: r.pcs, loss: { p: r.loss } }));
      }
      if (p.markup != null) {
        parts.push(NL, T("a.markup", { mk: lg === "en" ? { d: C.pct(p.markup), s: p.markup + " percent" } : { p: p.markup }, margin: { p: r.margin } }));
      }
      parts = parts.concat(priceDefaultsText(used, v));
      var chk = null;
      if (p.given.now != null) {
        values.now = String(p.given.now);
        chk = C.nowCheck(r, values.now, "en");
        if (chk && chk.status === "bad") { mood = "worried"; parts.push(NL, T("a.nowBad", { now: { m: chk.now }, diff: { m: r.cost - chk.now } })); }
        else if (chk && chk.status === "warn") { mood = "worried"; parts.push(NL, T("a.nowWarn", { now: { m: chk.now }, m: { p: chk.m }, margin: { p: r.margin } })); }
        else if (chk) parts.push(NL, T("a.nowOk", { now: { m: chk.now }, m: { p: chk.m } }));
      }
      if (r.rate === 0) { mood = "worried"; parts.push(NL, T("a.rate0")); }
      return reply("price", parts, { mood: mood, actions: [{ type: "price", label: t("act.price"), values: values }],
        chips: [t("c.box12"), t("c.margin"), t("c.recipeCost")],
        data: { values: values, result: r, used: used, now: chk, noun: noun } });
    }

    // ---------- Recipe cost ----------
    function handleRecipe() {
      var st = getState(), rec = st.recipe || { items: [] }, rt = C.recipeTotal(rec, lg), makes = Math.floor(C.num(rec.makes, lg));
      var name = String(rec.name || "").trim() || t("a.yourRecipe");
      if (!(rt.total > 0)) {
        return reply("recipe", T("a.recipeEmpty"), { mood: "worried", actions: [{ type: "recipe", label: t("act.recipe") }], data: { total: 0, makes: makes } });
      }
      var parts = [makes > 0 ? T("a.recipe", { name: name, total: { m: rt.total }, per: { m: rt.total / makes }, pieces: piecesStr(makes) }) : T("a.recipeNoMakes", { name: name, total: { m: rt.total } })];
      if (rt.bad) parts.push(NL, T("a.recipeBad", { n: rt.bad }));
      return reply("recipe", parts, { mood: rt.bad ? "worried" : "happy", actions: [{ type: "recipe", label: t("act.recipe") }],
        chips: [t("c.priceRecipe"), t("c.scale"), t("c.box12")],
        data: { name: name, total: rt.total, perPiece: makes > 0 ? rt.total / makes : null, makes: makes, bad: rt.bad } });
    }

    // ---------- Scale ----------
    function scaleTarget(tx, makes) {
      var m;
      if (/\bdouble\b/.test(tx)) return makes * 2;
      if (/\btriple\b/.test(tx)) return makes * 3;
      if (/\bquadruple\b/.test(tx)) return makes * 4;
      if (/\bhalve\b|\bhalf\b/.test(tx)) return makes / 2;
      if ((m = tx.match(/\bx ?(\d+(?:\.\d+)?)\b|\b(\d+(?:\.\d+)?) ?(?:x|times)\b/))) return makes * +(m[1] || m[2]);
      if ((m = tx.match(/\b(?:to|need|make|making|for|into|get)\s(?:about\s)?(\d+(?:\.\d+)?)\b/))) return +m[1];
      if ((m = tx.match(new RegExp("(\\d+(?:\\.\\d+)?) ?(?:" + NOUNS + ")\\b")))) return +m[1];
      if ((m = tx.match(/(\d+(?:\.\d+)?)/))) return +m[1];
      return null;
    }
    function handleScale(tx) {
      var st = getState(), rec = st.recipe || { items: [] }, makes = C.num(rec.makes, lg);
      pending = null;
      if (!(makes > 0)) {
        return reply("scale", T("a.scaleNoMakes"), { mood: "worried", actions: [{ type: "recipe", label: t("act.recipe") }] });
      }
      var to = scaleTarget(tx, makes);
      if (!(to > 0)) {
        pending = { intent: "scale", ask: "to" };
        return reply("ask:scale", T("a.scaleAsk", { makes: C.fmt(makes, lg) }), { mood: "worried", chips: ["36", "48", "60"], data: { ask: "to" } });
      }
      var sc = C.scaleRecipe(rec, to, lg), name = String(rec.name || "").trim() || t("a.yourRecipeLc");
      if (Math.abs(sc.f - 1) < 1e-9) {
        return reply("scale", T("a.scaleSame", { name: cap(name), makes: C.fmt(sc.makes, lg) }), { mood: "happy", chips: [t("c.scale36"), t("c.scale60"), t("c.recipeCost")], data: { to: sc.to, makes: sc.makes, f: 1 } });
      }
      var whole = sc.batches * sc.makes;
      var parts = [T("a.scale", { to: C.fmt(sc.to, lg), makes: C.fmt(sc.makes, lg), f: C.fmt(sc.f, lg) }),
        { d: [" ", T("a.scaleBatches", { batches: t("n.wholeBatches", { n: sc.batches }), pieces: t("n.pieces", { n: C.fmt(whole, lg) }, nEn(whole)) })], s: "" }];
      var first = sc.lines.slice(0, 5);
      if (first.length) {
        first.forEach(function (ln) {
          var amt = lg === "en" && ln.unit === "piece" ? C.fmt(ln.amount) + " " + ln.unitLabel : { u: [ln.amount, ln.unit] };
          var vars = { name: ln.name, amt: amt, g: { g: ln.grams } };
          parts.push(NL, ln.grams != null ? seg("a.scaleLineG", "a.scaleLineG_s", vars) : seg("a.scaleLine", "a.scaleLine_s", vars));
        });
        if (sc.lines.length > 5) parts.push(NL, seg("a.scaleMore", "a.scaleMore_s", { k: sc.lines.length - 5 }));
      }
      parts.push(NL, seg("a.scaleCost", "a.scaleCost_s", { to: C.fmt(sc.to, lg), cost: { m: sc.cost } }));
      return reply("scale", parts, { mood: "happy", actions: [{ type: "scale", label: t("act.scale"), to: sc.to }],
        chips: [t("c.recipeCost"), t("c.scale36"), t("c.cupsFlour")],
        data: { to: sc.to, makes: sc.makes, f: sc.f, batches: sc.batches, lines: first, cost: sc.cost, name: name } });
    }

    // ---------- Cups and spoons to grams ----------
    var STOP = /\b(?:how|many|much|grams?|gr|g|in|into|to|is|are|of|convert|what|whats|what's|does|do|weigh|weighs|weight|the|a|an|me|please|tell|it|there|equal|equals|us|would|be|approx|approximately|about|roughly|hey|bento|can|you|i|need|know|want|that|if|large)\b/g;
    var STOP_SET = {};
    ("how many much grams gram gr g in into to is are of convert what whats what's does do weigh weighs weight the a an me please tell it there equal equals us would be approx approximately about roughly hey bento can you i need know want that if large" +
      " have has my your with for per and or on at by this one so").split(" ").forEach(function (w) { STOP_SET[w] = 1; });
    var origWords = {};
    // the user's own spelling of a word (the engine reads words without accents)
    function original(name) {
      return name.split(" ").map(function (w) { return origWords[w] || w; }).join(" ");
    }
    function nameOf(s) {
      if (lg === "en") return s.replace(/\d+(?:\.\d+)?/g, " ").replace(/[?.!,]/g, " ").replace(STOP, " ").replace(/\s+/g, " ").trim();
      return s.replace(/\d+(?:\.\d+)?/g, " ").replace(/[?.!,;:]/g, " ").split(" ").filter(function (w) { return w && !STOP_SET[w]; }).join(" ");
    }
    function handleUnits(tx, continuing) {
      var amount, unit, name, p = continuing ? pending : null;
      pending = null;
      if (p) { amount = p.amount; unit = p.unit; name = nameOf(tx); }
      else {
        var u = tx.match(RE.unit), e = tx.match(RE.egg), rest;
        if (u && unitKey(u[2])) {
          amount = u[1] != null ? +u[1] : 1; unit = unitKey(u[2]);
          rest = tx.slice(0, u.index) + " " + tx.slice(u.index + u[0].length);
          name = nameOf(rest);
        } else if (e) {
          amount = e[1] != null ? +e[1] : 1; unit = "piece"; name = e[2];
        }
      }
      if (unit === "stick") {
        return reply("units", T("a.stick"), { mood: "worried", chips: [t("c.butter8"), t("c.butterCup"), t("c.priceCookies")] });
      }
      if (!unit) return help("unknown");
      var glass = GLASS_ML[unit] || 0;
      var weight = !glass && C.BASE[unit] && C.BASE[unit][0] === "w";
      if (weight) {
        var gw = C.grams(amount, unit, null), nm = lg === "en" ? name : cap(original(name));
        var wv = { amt: { u: [amount, unit] }, name: nm, g: { g: gw } };
        return reply("units", [name ? seg("a.uWeightName", "a.uWeightName_s", wv) : seg("a.uWeight", "a.uWeight_s", wv)],
          { chips: [t("c.cupsFlour"), t("c.butter3"), t("c.priceCookies")], data: { grams: gw, amount: amount, unit: unit } });
      }
      if (!name) {
        pending = { intent: "units", amount: amount, unit: unit };
        return reply("ask:units", T("a.uAsk"), { mood: "worried", chips: [t("c.flour"), t("c.sugar"), t("c.butter")], data: { ask: "ingredient" } });
      }
      var d = C.findDensity(name, lg);
      var g = d ? (glass ? C.grams(amount * glass, "ml", d) : C.grams(amount, unit, d)) : null;
      if (g == null) {
        return reply("units", T(unit === "piece" ? "a.uUnknownPiece" : "a.uUnknown", { name: lg === "en" ? name : original(name) }),
          { mood: "worried", chips: [t("c.sugarCup"), t("c.butter3"), t("c.priceCookies")], data: { grams: null, name: name } });
      }
      var parts, onlyCup = unit === "cup" && Math.abs(amount - 1) < 1e-9;
      var basis = unit === "piece" ? t("note.basisPiece", { g: C.fmt(d[3], lg) }) : t("note.basisCup", { g: C.fmt(d[2], lg) });
      var shownUnit = glass ? "glass" : unit;
      if (unit === "piece") {
        var what;
        if (lg === "en") {
          var label = d[0].charAt(0).toLowerCase() + d[0].slice(1), lg2 = label.match(/^(.*), large$/), nm2 = lg2 ? "large " + lg2[1] : label;
          what = C.fmt(amount) + " " + (amount <= 1 ? nm2.replace(/s$/, "") : nm2);
        } else {
          var ef = I.D[lg].eggs && I.D[lg].eggs[d[0]];
          what = ef ? I.fill(I.pick(ef, lg, nEn(amount)), { n: C.fmt(amount, lg) }) : [{ u: [amount, "piece"] }, " ", C.ingName(d, lg).toLowerCase()];
        }
        parts = [seg("a.uOkPiece", "a.uOkPiece_s", { amt: what, g: { g: g } })];
      } else {
        var lbl = lg === "en" ? d[0].charAt(0).toLowerCase() + d[0].slice(1) : C.ingName(d, lg);
        parts = [seg("a.uOk", "a.uOk_s", { amt: { u: [amount, shownUnit] }, name: lbl, g: { g: g } })];
      }
      var note = [];
      if (glass) note = [seg("a.uGlassNote", "a.uGlassNote_s", { ml: glass }), " "];
      else if (lg !== "en" && unit === "cup") note = [seg("a.uCupNote", "a.uCupNote_s", {}), " "];
      parts.push(NL, { d: note.concat([T(onlyCup || glass ? "a.uTypicalCup" : "a.uTypical", { basis: basis })]), s: note.concat([T("a.uTypical_s")]) });
      var data = { grams: g, amount: amount, unit: unit, dens: d[0] };
      if (glass) data.ml = glass;
      return reply("units", parts, { chips: [t("c.butter3"), t("c.sugarCup"), t("c.priceCookies")], data: data });
    }

    // ---------- FAQ, Pro, small talk ----------
    function faq(id) {
      if (id === "markup") return reply("faq:markup", T("a.faqMarkup", { one: { m: 1 }, two: { m: 2 } }), { chips: [t("c.priceCookies"), t("c.time"), t("c.deposits")] });
      if (id === "howto") return reply("faq:howto", T("a.faqHowto"), { chips: [t("c.priceCookies"), t("c.margin"), t("c.time")] });
      if (id === "deposit") return reply("faq:deposit", T("a.faqDeposit"), { chips: [t("c.box12"), t("c.priceCookies"), t("c.margin")] });
      if (id === "time") return reply("faq:time", T("a.faqTime"), { chips: [t("c.priceCookies"), t("c.margin"), t("c.deposits")] });
      return reply("faq:cottage", T("a.faqCottage"), { chips: [t("c.priceCookies"), t("c.deposits"), t("c.time")] });
    }
    function pro() {
      return reply("pro", T("a.pro"), { actions: [{ type: "pro", label: t("act.pro") }] });
    }
    function help(kind) {
      if (kind === "greet") return reply("greet", T("a.greet"), { blush: true });
      if (kind === "thanks") return reply("thanks", T("a.thanks"), { blush: true });
      if (kind === "help") return reply("help", T("a.help"));
      if (kind === "cancel") return reply("cancel", T("a.cancel"));
      return reply("unknown", T("a.unknown"), { mood: "worried" });
    }

    function ask(raw) {
      lg = curLang();
      var text = String(raw || "").slice(0, 400);
      origWords = {};
      if (lg !== "en") prep(text, lg).split(" ").forEach(function (w) { var f = I.fold(w); if (!origWords[f]) origWords[f] = w; });
      var tx = normalize(text, lg);
      if (!tx) return help("help");
      var intent = classify(tx, lg), p = pending;
      if (p) {
        if (intent === "cancel") { pending = null; return help("cancel"); }
        var numeric = /\d/.test(tx) || RE.priceRecipe.test(tx);
        if ((p.intent === "price" || p.intent === "box") && (intent === "price" || intent === "box" || (intent === "unknown" && numeric))) return handlePrice(tx, intent === "box", true);
        if (p.intent === "scale" && (intent === "scale" || (intent === "unknown" && numeric))) return handleScale(tx, true);
        if (p.intent === "units" && intent === "unknown" && !numeric) return handleUnits(tx, true);
        // a reply without a number to Bento's question: ask once more, kindly
        if (intent === "unknown" && !numeric) {
          if (p.intent === "scale") { pending = p; return reply("ask:scale", T("a.scaleAgain"), { mood: "worried", chips: ["36", "48", "60"] }); }
          if ((p.intent === "price" || p.intent === "box") && p.ask) {
            var again = askFor(p, p.ask);
            again.text = t("a.needNumber", { q: again.text }); again.speech = t("a.needNumber", { q: again.speech });
            return again;
          }
        }
        pending = null;
      }
      if (intent === "units") return handleUnits(tx);
      if (intent === "pro") return pro();
      if (intent.indexOf("faq:") === 0) return faq(intent.slice(4));
      if (intent === "recipe") return handleRecipe();
      if (intent === "scale") return handleScale(tx);
      if (intent === "box") return handlePrice(tx, true);
      if (intent === "price") return handlePrice(tx, false);
      if (intent === "cancel") return help("cancel");
      return help(intent);
    }

    return {
      ask: ask,
      reset: function () { pending = null; },
      pending: function () { return pending; },
      lang: function () { return curLang(); },
      welcome: function () { lg = curLang(); return reply("welcome", T("a.welcome")); },
      tip: function (i) { lg = curLang(); return reply("tip", T("tip." + (i % 10)), { mood: "happy" }); }
    };
  }

  // =====================================================================
  // The Talk view (browser only)
  // =====================================================================
  var MOODS = ["happy", "thinking", "excited", "worried", "listening", "sleepy"];
  var VOICE_KEY = "bento.voice", CHAT_KEY = "bento.chat";

  function mount(opts) {
    var doc = document, win = window;
    function $(id) { return doc.getElementById(id); }
    var agent = create({ core: opts.core, getState: opts.getState });
    function L() { return agent.lang(); }
    function tr(key, vars) { return I ? I.t(L(), key, vars) : key; }
    var sec = $("tab-talk"), svg = $("talkBento"), hopEl = $("talkHop"), tapBtn = $("bentoTap"), stage = $("talkStage"), berry = svg.querySelector(".tb-berry"), look = svg.querySelector(".tb-look");
    var sayEl = $("talkSay"), actionsEl = $("talkActions"), chipsEl = $("talkChips"), heardEl = $("heard");
    var micBtn = $("micBtn"), micLabel = $("micLabel"), talkForm = $("talkForm"), talkInput = $("talkInput"), tipEl = $("talkTip");
    var speakerBtn = $("speakerBtn"), typeBtn = $("typeBtn"), backBtn = $("backTalk"), mainEl = $("talkMain"), chatEl = $("talkChat");
    var logEl = $("chatLog"), chatForm = $("chatForm"), chatInput = $("chatInput"), chatChips = $("chatChips"), voiceNote = $("voiceNote");
    function mq(q) { return win.matchMedia ? win.matchMedia(q) : { matches: false, addEventListener: function () {} }; }
    var reduceMq = mq("(prefers-reduced-motion: reduce)"), fineMq = mq("(pointer: fine)");
    function reduced() { return !!reduceMq.matches; }

    var mood = "happy", visible = false, mode = "talk", speaking = false, listening = false, thinking = false;
    var T = {};
    function clear(name) { if (T[name]) { win.clearTimeout(T[name]); T[name] = null; } }
    function later(name, ms, fn) { clear(name); T[name] = win.setTimeout(function () { T[name] = null; fn(); }, ms); }

    // ---------- moods ----------
    function setMood(m) {
      if (MOODS.indexOf(m) < 0) m = "happy";
      mood = m;
      MOODS.forEach(function (x) { svg.classList.toggle("mood-" + x, x === m); });
      svg.setAttribute("data-mood", m);
      stage.setAttribute("data-mood", m);
      if (m !== "excited") clear("calm");
    }
    function hop() { hopEl.classList.remove("hop"); void hopEl.offsetWidth; hopEl.classList.add("hop"); }
    function blush() { svg.classList.remove("blush"); void hopEl.offsetWidth; svg.classList.add("blush"); later("blush", 1800, function () { svg.classList.remove("blush"); }); }
    function calmDown(ms) { later("calm", ms, function () { if (mood === "excited" && !speaking) setMood("happy"); }); }

    // ---------- idle life ----------
    function blink() {
      svg.classList.add("blink");
      later("unblink", 150, function () { svg.classList.remove("blink"); });
      scheduleBlink();
    }
    function scheduleBlink() { later("blink", 2000 + Math.random() * 4000, blink); }
    function scheduleWobble() {
      if (reduced()) return;
      later("wobble", 7000 + Math.random() * 7000, function () {
        if (mood !== "sleepy") { berry.classList.remove("wobble"); void hopEl.offsetWidth; berry.classList.add("wobble"); later("unwobble", 900, function () { berry.classList.remove("wobble"); }); }
        scheduleWobble();
      });
    }
    function resetIdle() {
      if (!visible || doc.hidden) { clear("idle"); return; }
      later("idle", 60000, function () {
        if (speaking || listening || thinking) { resetIdle(); return; }
        setMood("sleepy"); lookAt(0, 0);
      });
    }
    function activity() {
      if (mood === "sleepy") setMood("happy");
      resetIdle();
    }
    function startLife() { scheduleBlink(); scheduleWobble(); resetIdle(); }
    function stopLife() { ["blink", "unblink", "wobble", "unwobble", "idle"].forEach(clear); svg.classList.remove("blink"); }

    // eyes follow the pointer (mouse) a little; on touch devices they glance at the text box while typing
    var lookRaf = 0, lookXY = null;
    function lookAt(x, y) { look.style.transform = x || y ? "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px)" : ""; }
    function lookToward(cx, cy) {
      var b = svg.getBoundingClientRect();
      if (!b.width) return;
      var ex = b.left + b.width * (69 / 140), ey = b.top + b.height * (82 / 140);
      var dx = cx - ex, dy = cy - ey, dist = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, dist / 160);
      lookAt(dx / dist * 2.4 * k, dy / dist * 2 * k);
    }
    doc.addEventListener("pointermove", function (e) {
      if (!visible || mode !== "talk" || reduced() || !fineMq.matches || e.pointerType === "touch" || mood === "sleepy") return;
      lookXY = [e.clientX, e.clientY];
      if (!lookRaf) lookRaf = win.requestAnimationFrame(function () { lookRaf = 0; if (lookXY) lookToward(lookXY[0], lookXY[1]); });
    }, { passive: true });
    function glanceAtInput() {
      if (fineMq.matches || reduced()) return;
      var b = talkInput.getBoundingClientRect();
      lookToward(b.left + b.width / 2, b.top + b.height / 2);
      later("unglance", 1500, function () { lookAt(0, 0); });
    }
    talkInput.addEventListener("focus", glanceAtInput);
    talkInput.addEventListener("input", glanceAtInput);
    ["pointerdown", "keydown", "input", "wheel"].forEach(function (ev) { doc.addEventListener(ev, function () { if (visible) activity(); }, { passive: true }); });
    doc.addEventListener("pointermove", function () { if (visible && mood === "sleepy") activity(); else if (visible && T.idle) resetIdle(); }, { passive: true });

    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) { sec.classList.add("paused"); stopLife(); }
      else { sec.classList.remove("paused"); if (visible) startLife(); }
    });

    // ---------- voice out (speechSynthesis) ----------
    var synth = win.speechSynthesis || null, voice = null, unlocked = false, speakId = 0, sawBoundary = false;
    var voiceOn = true, noVoice = false;
    try { voiceOn = win.localStorage.getItem(VOICE_KEY) !== "off"; } catch (e) { voiceOn = true; }
    // A voice for the app's language (the exact locale first, a voice on the device first).
    // When the device lists voices but none for this language, Bento shows a note and stays quiet
    // instead of reading the text with a wrong-language voice. An empty list means "not known yet".
    function pickVoice() {
      voice = null; noVoice = false;
      if (synth && synth.getVoices) {
        var vs = [], lg = L();
        try { vs = synth.getVoices() || []; } catch (e) { vs = []; }
        var code = function (v) { return String(v.lang || "").toLowerCase().replace(/_/g, "-"); };
        if (lg === "en") {
          var us = vs.filter(function (v) { return /^en[-_]us/i.test(v.lang || ""); });
          voice = us.filter(function (v) { return v.localService; })[0] || us[0] || vs.filter(function (v) { return /^en/i.test(v.lang || ""); })[0] || null;
        } else {
          var loc = I.META[lg].sr.toLowerCase();
          var same = vs.filter(function (v) { return code(v).split("-")[0] === lg; });
          var exact = same.filter(function (v) { return code(v) === loc; });
          voice = exact.filter(function (v) { return v.localService; })[0] || exact[0] || same.filter(function (v) { return v.localService; })[0] || same[0] || null;
        }
        noVoice = vs.length > 0 && !voice;
      }
      renderVoiceNote();
    }
    function renderVoiceNote() {
      if (!voiceNote) return;
      voiceNote.textContent = tr("talk.noVoice");
      voiceNote.hidden = !(noVoice && voiceOn);
    }
    if (synth) {
      pickVoice();
      try { if (synth.addEventListener) synth.addEventListener("voiceschanged", pickVoice); else synth.onvoiceschanged = pickVoice; } catch (e) { /* ignore */ }
    }
    // iOS only lets a page speak after a tap, so the first tap "unlocks" speech with a silent utterance.
    function unlockSpeech() {
      if (unlocked || !synth || !win.SpeechSynthesisUtterance) return;
      unlocked = true;
      try {
        if (synth.resume) synth.resume();
        var u = new win.SpeechSynthesisUtterance("ok"); u.lang = "en-US"; u.volume = 0; u.rate = 2;
        synth.speak(u);
      } catch (e) { /* ignore */ }
    }
    function mouthOpen() {
      sawBoundary = true;
      svg.classList.remove("talk-loop");
      svg.classList.add("mouth-open");
      later("mouthClose", 130, function () { svg.classList.remove("mouth-open"); });
    }
    function stopTalking() {
      speakId++;
      speaking = false;
      ["mouthClose", "loop", "talkSafety"].forEach(clear);
      svg.classList.remove("speaking", "mouth-open", "talk-loop");
      if (mood === "excited") calmDown(2500);
      resetIdle();
    }
    function busy() { try { return !!(synth && (synth.speaking || synth.pending)); } catch (e) { return false; } }
    // Safari drops an utterance queued in the same moment as cancel(), so after a real cancel() the next answer waits ~120 ms.
    var cancelledAt = -1e9;
    function cancelSpeech() {
      if (synth && busy()) { try { synth.cancel(); cancelledAt = Date.now(); } catch (e) { /* ignore */ } }
      stopTalking();
    }
    function chunks(text) {
      var parts = String(text).match(/[^.!?]+[.!?]*/g) || [text], out = [], cur = "";
      parts.forEach(function (s) { if ((cur + s).length > 180 && cur) { out.push(cur.trim()); cur = s; } else cur += s; });
      if (cur.trim()) out.push(cur.trim());
      return out;
    }
    function speakOut(text) {
      var wasBusy = busy();
      if (synth && wasBusy) { try { synth.cancel(); } catch (e) { /* ignore */ } }
      if (!wasBusy && Date.now() - cancelledAt < 120) wasBusy = true;
      stopTalking();
      if (!voiceOn || !synth || !unlocked || !win.SpeechSynthesisUtterance || !text || noVoice) return false;
      try { if (synth.resume) synth.resume(); } catch (e) { /* ignore */ }
      var id = ++speakId, list = chunks(text);
      speaking = true; sawBoundary = false;
      svg.classList.add("speaking");
      // no word events (iOS, some voices)? then a steady talk loop until the speech ends
      later("loop", 700, function () { if (id === speakId && !sawBoundary) svg.classList.add("talk-loop"); });
      later("talkSafety", 4000 + text.length * 110, function () { if (id === speakId) stopTalking(); });
      list.forEach(function (c, i) {
        var u = new win.SpeechSynthesisUtterance(c);
        u.lang = I ? I.META[L()].sr : "en-US"; if (voice) { try { u.voice = voice; } catch (e) { /* ignore */ } }
        u.rate = 1.0; u.pitch = 1.2;
        u.onboundary = function (e) { if (id === speakId && (!e || !e.name || e.name === "word")) mouthOpen(); };
        u.onend = function () { if (id === speakId && i === list.length - 1) stopTalking(); };
        u.onerror = function () { if (id === speakId) stopTalking(); };
        var go = function () { if (id === speakId) { try { synth.speak(u); } catch (e) { stopTalking(); } } };
        if (wasBusy) win.setTimeout(go, 120); else go();
      });
      showSoundHint();
      return true;
    }
    var IOS = /iphone|ipad|ipod/i.test(win.navigator.userAgent || "") || (win.navigator.platform === "MacIntel" && win.navigator.maxTouchPoints > 1);
    var hintShown = false;
    function showSoundHint() {
      if (!IOS || hintShown) return;
      hintShown = true;
      var h = doc.getElementById("soundHint");
      if (h) h.hidden = false;
    }
    function renderSpeaker() {
      speakerBtn.setAttribute("aria-pressed", voiceOn ? "true" : "false");
      speakerBtn.setAttribute("aria-label", tr(voiceOn ? "talk.voiceOn" : "talk.voiceOff"));
      speakerBtn.classList.toggle("off", !voiceOn);
      renderVoiceNote();
    }
    speakerBtn.addEventListener("click", function () {
      voiceOn = !voiceOn;
      try { win.localStorage.setItem(VOICE_KEY, voiceOn ? "on" : "off"); } catch (e) { /* ignore */ }
      if (!voiceOn) cancelSpeech(); else unlockSpeech();
      renderSpeaker();
    });
    if (!synth) speakerBtn.hidden = true;
    renderSpeaker();

    // ---------- conversation ----------
    var msgs = [];
    try { var saved = JSON.parse(win.localStorage.getItem(CHAT_KEY) || "[]"); if (Array.isArray(saved)) msgs = saved.slice(-20).filter(function (m) { return m && typeof m.t === "string"; }); } catch (e) { msgs = []; }
    function persist() { try { win.localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-20))); } catch (e) { /* ignore */ } }
    function actionButtons(actions) {
      return (actions || []).map(function (a) {
        var b = doc.createElement("button");
        b.type = "button"; b.className = "btn small"; b.textContent = a.label;
        b.addEventListener("click", function () {
          if (a.type === "price") opts.openPrice(a.values);
          else if (a.type === "recipe") opts.openRecipe();
          else if (a.type === "scale") opts.openScale(a.to);
          else if (a.type === "pro") opts.openPro();
        });
        return b;
      });
    }
    function msgEl(who, text, actions) {
      var el = doc.createElement("div");
      el.className = "cm " + (who === "u" ? "cm-u" : "cm-b");
      var p = doc.createElement("p"); p.textContent = text; el.appendChild(p);
      var btns = actionButtons(actions);
      if (btns.length) { var row = doc.createElement("div"); row.className = "cm-actions"; btns.forEach(function (b) { row.appendChild(b); }); el.appendChild(row); }
      return el;
    }
    function addMsg(who, text, actions) {
      msgs.push({ w: who, t: text });
      while (msgs.length > 30) msgs.shift();
      logEl.appendChild(msgEl(who, text, actions));
      while (logEl.children.length > 30) logEl.removeChild(logEl.firstChild);
      persist();
      if (mode === "chat") scrollChat();
    }
    // newest message sits right above the text box (the box is sticky above the tab bar)
    function scrollChat() { win.scrollTo(0, Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight)); }
    function renderChips(list) {
      [chipsEl, chatChips].forEach(function (box) {
        box.innerHTML = "";
        (list || chipsFor(L())).slice(0, 3).forEach(function (c) {
          var b = doc.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = c;
          b.addEventListener("click", function () { userAsk(c); });
          box.appendChild(b);
        });
      });
    }
    function showReply(rep, opt) {
      opt = opt || {};
      thinking = false;
      var typing = logEl.querySelector(".cm-typing"); if (typing) logEl.removeChild(typing);
      setMood(rep.mood);
      hop();
      if (rep.blush) blush();
      sayEl.textContent = rep.text;
      actionsEl.innerHTML = "";
      actionButtons(rep.actions).forEach(function (b) { actionsEl.appendChild(b); });
      renderChips(rep.chips);
      if (!opt.noLog) addMsg("b", rep.text, rep.actions);
      var talking = speakOut(rep.speech);
      if (rep.mood === "excited" && !talking) calmDown(6000);
      resetIdle();
    }
    var lastReply = null;
    function ask(text, fromTap) {
      text = String(text || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      activity();
      cancelSpeech();
      clear("think");
      addMsg("u", text);
      heardEl.textContent = tr("talk.you", { text: text });
      thinking = true;
      setMood("thinking");
      var typing = doc.createElement("div"); typing.className = "cm cm-b cm-typing"; typing.setAttribute("aria-hidden", "true"); typing.innerHTML = "<span></span><span></span><span></span>";
      logEl.appendChild(typing);
      if (mode === "chat") scrollChat();
      var rep = agent.ask(text);
      lastReply = rep;
      if (fromTap) showReply(rep);
      else later("think", 400, function () { showReply(rep); });
    }
    // every call from a tap/Enter goes through here, so speech can start (iOS needs a user gesture)
    // the answer itself is spoken inside the tap, which is what unlocks speech on iOS
    function markUnlocked() { if (synth) unlocked = true; }
    function userAsk(text) { markUnlocked(); ask(text, true); }

    // ---------- voice in (Web Speech API) ----------
    var SR = win.SpeechRecognition || win.webkitSpeechRecognition || null, rec = null, handled = false, transcript = "", fallback = false, quiet = 0, userStopped = false;
    function setListening(on) {
      listening = on;
      micBtn.classList.toggle("listening", on);
      micBtn.setAttribute("aria-pressed", on ? "true" : "false");
      micBtn.setAttribute("aria-label", fallback && !on ? tr("talk.typeAria") : tr(on ? "talk.listeningAria" : "talk.ask"));
      micLabel.textContent = tr(on ? "talk.listening" : "talk.ask");
      if (on) setMood("listening");
      else if (mood === "listening") setMood("happy");
    }
    function showFallback(why) {
      fallback = true;
      talkForm.hidden = false;
      tipEl.hidden = false;
      micBtn.setAttribute("aria-label", tr("talk.typeAria"));
      if (why) {
        var msg = tr(why === "denied" ? "talk.err.denied" : why === "network" ? "talk.err.network" : why === "nomic" ? "talk.err.nomic"
          : why === "quiet" ? "talk.err.quiet" : "talk.err.other");
        showReply({ text: msg, speech: msg, mood: "worried", actions: [], chips: chipsFor(L()), blush: false }, { noLog: true });
      }
    }
    function stopListening(user) {
      clear("silence"); clear("maxListen"); clear("forceEnd");
      if (rec) { try { if (user) rec.stop(); else rec.abort(); } catch (e) { /* ignore */ } }
      setListening(false);
    }
    function finishListening() {
      clear("silence"); clear("maxListen"); clear("forceEnd");
      var r = rec; rec = null;
      setListening(false);
      if (!handled && transcript.trim()) { handled = true; ask(transcript); }
      else if (!handled && !userStopped) { handled = true; heardNothing(); }
      return r;
    }
    // the session ended with no words at all (no sound, or a browser that never returns results):
    // first time ask to try again, second time switch to typing so the button is never a dead end
    function heardNothing() {
      quiet++;
      if (quiet >= 2) { showFallback("quiet"); return; }
      var msg = tr("talk.heardNothing");
      showReply({ text: msg, speech: msg, mood: "worried", actions: [], chips: chipsFor(L()) }, { noLog: true });
    }
    // stop on silence; if the browser never reports the end, finish anyway so the button is never stuck
    function endSoon() {
      if (!rec) return;
      try { rec.stop(); } catch (er) { /* ignore */ }
      later("forceEnd", 1500, function () { if (listening) { if (rec) { try { rec.abort(); } catch (er) { /* ignore */ } } finishListening(); } });
    }
    function startListening() {
      if (!SR) { showFallback(); talkInput.focus(); return; }
      cancelSpeech();
      handled = false; transcript = ""; userStopped = false;
      try { rec = new SR(); } catch (e) { rec = null; showFallback("error"); return; }
      rec.lang = I ? I.META[L()].sr : "en-US"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onresult = function (e) {
        var interim = "", fin = "";
        for (var i = e.resultIndex || 0; i < e.results.length; i++) {
          var r = e.results[i];
          if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript;
        }
        transcript = (fin || interim).trim();
        if (transcript) quiet = 0;
        heardEl.textContent = transcript ? "“" + transcript + "”" : "";
        if (fin && !handled) { handled = true; var t = fin; stopListening(true); ask(t); return; }
        later("silence", 1600, endSoon);
      };
      rec.onerror = function (e) {
        var err = (e && e.error) || "error";
        handled = handled || err !== "no-speech";
        rec = null;
        stopListening(false);
        if (err === "no-speech") { handled = true; heardNothing(); }
        else if (err === "aborted") { /* user stopped */ }
        else if (err === "not-allowed" || err === "service-not-allowed") showFallback("denied");
        else if (err === "network") showFallback("network");
        else if (err === "audio-capture") showFallback("nomic");
        else showFallback("error");
      };
      rec.onend = function () { finishListening(); };
      heardEl.textContent = "";
      setListening(true);
      later("maxListen", 12000, endSoon);
      try { rec.start(); } catch (e) { rec = null; setListening(false); showFallback("error"); }
    }
    micBtn.addEventListener("click", function () {
      unlockSpeech();
      if (fallback) { talkInput.focus(); return; }
      if (listening) { userStopped = true; stopListening(true); return; }
      startListening();
    });
    if (!SR) showFallback();

    // ---------- forms, modes, tap ----------
    function bindForm(form, input) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = input.value; input.value = "";
        if (v.trim()) userAsk(v);
      });
    }
    bindForm(talkForm, talkInput);
    bindForm(chatForm, chatInput);
    function setMode(m) {
      mode = m;
      mainEl.hidden = m !== "talk";
      chatEl.hidden = m !== "chat";
      if (m === "chat") { stopListening(false); lookAt(0, 0); scrollChat(); chatInput.focus(); }
      else { win.scrollTo(0, 0); typeBtn.focus(); }
    }
    typeBtn.addEventListener("click", function () { setMode("chat"); });
    backBtn.addEventListener("click", function () { setMode("talk"); });
    var lastTip = -1;
    tapBtn.addEventListener("click", function () {
      markUnlocked();
      cancelSpeech();
      tapBtn.classList.remove("squish"); void tapBtn.offsetWidth; tapBtn.classList.add("squish");
      later("unsquish", 500, function () { tapBtn.classList.remove("squish"); });
      var i; do { i = Math.floor(Math.random() * 10); } while (i === lastTip);
      lastTip = i;
      var rep = agent.tip(i);
      rep.mood = "happy";
      showReply(rep);
    });

    // ---------- start ----------
    msgs.forEach(function (m) { logEl.appendChild(msgEl(m.w, m.t)); });
    var hello = agent.welcome();
    sayEl.textContent = hello.text;
    if (!msgs.length) addMsg("b", hello.text);
    renderChips(chipsFor(L()));
    setListening(false);
    setMood("happy");

    // The app's language changed: new voice and words; the bubble starts again with a hello in the new language.
    // A chat that is only the hello is replaced; a real conversation stays as it was written.
    function relang() {
      agent.reset();
      cancelSpeech();
      if (listening) stopListening(false);
      pickVoice();
      renderSpeaker();
      setListening(false);
      var welcomes = I ? I.LANGS.map(function (l) { return I.t(l, "a.welcome"); }) : [];
      var h = agent.welcome();
      if (msgs.length === 1 && msgs[0].w === "b" && welcomes.indexOf(msgs[0].t) >= 0) {
        msgs[0].t = h.text; persist();
        logEl.innerHTML = ""; logEl.appendChild(msgEl("b", h.text));
      }
      sayEl.textContent = h.text;
      actionsEl.innerHTML = "";
      heardEl.textContent = "";
      renderChips(chipsFor(L()));
      setMood("happy");
    }

    return {
      onShow: function () { visible = true; sec.classList.remove("paused"); startLife(); },
      onHide: function () { visible = false; stopLife(); if (listening) stopListening(false); },
      ask: ask, agent: agent, setMood: setMood, setMode: setMode, relang: relang,
      state: function () { return { mood: mood, mode: mode, speaking: speaking, listening: listening, thinking: thinking, voiceOn: voiceOn, fallback: fallback, messages: msgs.length, noVoice: noVoice, voice: voice ? voice.lang : null, lang: L() }; },
      get tips() { return tipsFor(L()); }
    };
  }

  return { create: create, mount: mount, normalize: normalize, extractPrice: extractPrice, classify: classify, spokenMoney: spokenMoney,
    toEnglish: toEnglish, chipsFor: chipsFor, tipsFor: tipsFor, TIPS: TIPS, DEFAULT_CHIPS: DEFAULT_CHIPS };
});
