/* Bento's talking helper.
   1) create(): an on-device dialog engine (no network, no AI service). It reuses the app's own math
      from core.js, so every number it says is the number the tabs show.
   2) mount(): the Talk view (animated Bento, voice in and out, chat). Browser only.
   Works in Node for tests: require("./agent.js").create({ core: require("./core.js"), getState }). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.BentoAgent = api; root.BentoTalk = { mount: api.mount }; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // =====================================================================
  // Text normalising: number words, fractions, dozens, money, durations
  // =====================================================================
  var SMALL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
  var TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function r4(x) { return Math.round(x * 10000) / 10000; }

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
  var MONEY_W = "(?:dollars?|bucks?|usd|cad|aud|euros?|eur|gbp|quid|zlotys?|złoty|zł|zl|pln|cents?|pence|pounds?)";
  var MONEY_ANY = "(?:" + CUR_SYM + "\\s?\\d+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?\\s?(?:" + CUR_SYM + "|" + MONEY_W + "))";
  var VOL = "cups?|tablespoons?|tbsps?|tbsp|tbs|teaspoons?|tsps?|tsp|pounds?|lbs?|lb|kilos?|kg|liters?|litres?|sticks?|ounces?|oz";

  function normalize(raw) {
    var t = " " + String(raw == null ? "" : raw).toLowerCase() + " ";
    t = t.replace(/[’`´]/g, "'").replace(/[“”"«»]/g, " ").replace(/[–—]/g, " ");
    t = t.replace(/½/g, " 1/2").replace(/¼/g, " 1/4").replace(/¾/g, " 3/4").replace(/⅓/g, " 1/3").replace(/⅔/g, " 2/3").replace(/⅛/g, " 1/8");
    t = t.replace(/(\d),(\d{3})(?!\d)/g, "$1$2").replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2");
    t = t.replace(/([a-z])-(?=[a-z])/g, "$1 ");
    t = t.replace(/([,;!?()])/g, " $1 ").replace(/\.(?!\d)/g, " . ").replace(/\s+/g, " ");
    t = " " + wordsToDigits(t.trim()) + " ";
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
    t = t.replace(new RegExp(" (?:an?|1) (hours?|hrs?|minutes?|mins?|cups?|tablespoons?|tbsps?|tbsp|tbs|teaspoons?|tsps?|tsp|pounds?|lbs?|lb|ounces?|oz|kilos?|kg|kilograms?|liters?|litres?|ml|sticks?|egg|large egg) ", "g"), " 1 $1 ");
    // 1 hour 30 minutes -> 90 minutes
    t = t.replace(/(\d+(?:\.\d+)?) ?(?:hours?|hrs?|h) (?:and )?(\d+(?:\.\d+)?) ?(?:minutes?|mins?|min|m)\b/g, function (m, h, mi) { return r4(h * 60 + +mi) + " minutes"; });
    return t.replace(/\s+/g, " ").trim();
  }

  // =====================================================================
  // Finding numbers and what they belong to
  // =====================================================================
  var NOUNS = "cookies?|cupcakes?|pieces?|pcs|muffins?|brownies?|blondies?|bars?|cinnamon rolls?|rolls?|cake pops?|cakes?|cheesecakes?|whoopie pies?|pies?|macarons?|macaroons?|donuts?|doughnuts?|loaves|loaf|slices?|scones?|buns?|croissants?|biscuits?|treats?|items?|servings?|portions?|tartlets?|tarts?|bagels?|pretzels?|truffles?|eclairs?|cannoli|breads?|baguettes?|brookies?|bites?|squares?|minis?";
  var NOUN_RE = new RegExp("\\b(" + NOUNS + ")\\b");
  var NOUN_AFTER = new RegExp("^ ?(?:(?!(?:for|of|to|in|on|at|with|and|per|is|are|cost|costs|a|the|each|from)\\b)[a-z']+ ){0,3}?(?:" + NOUNS + ")\\b");
  var BOX_BEFORE = /(?:box|boxes|bundles?|packs?|sets?|trays?|platters?|assortments?|tins?|bags?) (?:of |with )?(?:about )?$/;
  var BOX_AFTER = /^ ?(?:pieces? |pcs |pc |count |ct )?(?:[a-z]+ )?(?:box|boxes|bundles?|trays?|platters?|assortments?)\b/;

  function plural(n) {
    if (!n) return "pieces";
    if (n === "pcs" || n === "piece") return "pieces";
    if (n === "loaf") return "loaves";
    if (/(?:s|cannoli)$/.test(n)) return n;
    return n + "s";
  }

  function mentions(t, cur) {
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
        if (BOX_BEFORE.test(before) || BOX_AFTER.test(after)) o.box = true;
        else if (NOUN_AFTER.test(after)) o.noun = true;
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

  // Pulls price inputs out of a sentence. ctx: { cur, box (bool), prefer (slot to fill first) }
  function extractPrice(t, ctx) {
    ctx = ctx || {};
    var ms = mentions(t, ctx.cur), clause = clauseOf(t), vals = {}, mins = 0, hasMins = false, notes = {};
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
    unit: new RegExp("(\\d+(?:\\.\\d+)?)? ?\\b(fl oz|fluid ounces?|cups?|tablespoons?|tbsps?|tbsp|tbs|tbl|teaspoons?|tsps?|tsp|milliliters?|millilitres?|ml|liters?|litres?|ounces?|oz|pounds?|lbs?|lb|kilograms?|kilos?|kg|sticks?)\\b"),
    egg: /(\d+(?:\.\d+)?)? ?\b(?:large )?(egg whites?|egg yolks?|yolks?|eggs?)\b/,
    grams: /\b(?:grams?|gr|g|weigh\w*|weight|convert)\b/
  };
  var UNIT_MAP = [
    [/^(?:cups?)$/, "cup"], [/^(?:tablespoons?|tbsps?|tbsp|tbs|tbl)$/, "tbsp"], [/^(?:teaspoons?|tsps?|tsp)$/, "tsp"],
    [/^(?:ml|milliliters?|millilitres?)$/, "ml"], [/^(?:liters?|litres?)$/, "l"], [/^(?:fl oz|fluid ounces?)$/, "fl oz"],
    [/^(?:ounces?|oz)$/, "oz"], [/^(?:pounds?|lbs?|lb)$/, "lb"], [/^(?:kg|kilos?|kilograms?)$/, "kg"], [/^sticks?$/, "stick"]
  ];
  function unitKey(w) { for (var i = 0; i < UNIT_MAP.length; i++) if (UNIT_MAP[i][0].test(w)) return UNIT_MAP[i][1]; return null; }
  var UNIT_NAMES = { cup: ["cup", "cups", "cup", "cups"], tbsp: ["tbsp", "tbsp", "tablespoon", "tablespoons"], tsp: ["tsp", "tsp", "teaspoon", "teaspoons"],
    ml: ["ml", "ml", "milliliter", "milliliters"], l: ["l", "l", "liter", "liters"], "fl oz": ["fl oz", "fl oz", "fluid ounce", "fluid ounces"],
    oz: ["oz", "oz", "ounce", "ounces"], lb: ["lb", "lb", "pound", "pounds"], kg: ["kg", "kg", "kilogram", "kilograms"], g: ["g", "g", "gram", "grams"],
    piece: ["piece", "pieces", "piece", "pieces"] };
  function unitLabel(u, n, spoken) { var a = UNIT_NAMES[u] || [u, u, u, u]; var one = n <= 1 + 1e-9; return spoken ? (one ? a[2] : a[3]) : (one ? a[0] : a[1]); }

  function hasData(t) { return new RegExp(MONEY_ANY).test(t) || /\d\s?(?:%|percent)/.test(t); }
  function isUnits(t) {
    var u = t.match(RE.unit);
    if (u && unitKey(u[2]) && !hasData(t) && (RE.grams.test(t) || /\bhow (?:much|many)\b/.test(t) || new RegExp("^(?:\\d+(?:\\.\\d+)? )?" + u[2] + " (?:of )?[a-z ]+$").test(t))) return true;
    return RE.egg.test(t) && /\b(?:grams?|g|weigh\w*)\b/.test(t) && !hasData(t);
  }

  function classify(t) {
    var data = hasData(t);
    if (RE.cancel.test(t)) return "cancel";
    if (isUnits(t)) return "units";
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
    var ms = mentions(t);
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
  function spokenMoney(v, cur) {
    var neg = v < 0, c = Math.round(Math.abs(v) * 100), whole = Math.floor(c / 100), cents = c % 100, w = CUR_WORDS[cur] || CUR_WORDS.$, out = [];
    if (whole > 0 || cents === 0) out.push(whole + " " + (whole === 1 ? w[0] : w[1]));
    if (cents > 0) out.push(cents + " " + (cents === 1 ? w[2] : w[3]));
    return (neg ? "minus " : "") + out.join(" and ");
  }

  var DEFAULT_CHIPS = ["Price my cookies", "2 cups flour in grams", "Scale my recipe"];
  var TIPS = [
    "Weigh your flour instead of using cups. It's the easiest way to get the same cookie every time.",
    "Count your packaging. Boxes, bags and stickers add up faster than you think.",
    "Time a whole batch once, from mixing to washing up. That's the time you should charge for.",
    "Let cookies cool on the tray for a few minutes before you move them. They break less.",
    "Take a deposit for big orders before you buy the ingredients.",
    "Check your prices every few months. Ingredient prices change, and your price should follow.",
    "Take butter and eggs out early. Room-temperature ingredients mix more evenly.",
    "Plan for a few pieces you can't sell, like broken ones and tasters. That's what the loss percent is for.",
    "Label every box with what's inside, the date and the allergens.",
    "Bake a test batch before a big order and time it. Then price the order from real numbers."
  ];

  // =====================================================================
  // The engine
  // =====================================================================
  function create(opts) {
    var C = opts.core;
    var getState = opts.getState;
    var pending = null;

    function cur() { return (getState() || {}).cur || "$"; }
    function render(parts) {
      var d = "", s = "", c = cur();
      parts.forEach(function (p) {
        if (p == null || p === false) return;
        if (typeof p === "string") { d += p; s += p; return; }
        if (p.m != null) { d += C.money(p.m, c); s += spokenMoney(p.m, c); }
        else if (p.p != null) { d += C.pct(p.p); s += C.pct(p.p).replace("%", " percent"); }
        else if (p.g != null) { d += C.fmt(p.g) + " g"; s += C.fmt(p.g) + " grams"; }
        else if (p.min != null) { d += C.fmt(p.min) + " min"; s += C.fmt(p.min) + (p.min === 1 ? " minute" : " minutes"); }
        else if (p.u) { d += C.fmt(p.u[0]) + " " + unitLabel(p.u[1], p.u[0]); s += C.fmt(p.u[0]) + " " + unitLabel(p.u[1], p.u[0], true); }
        else { d += p.d || ""; s += p.s || ""; }
      });
      s = s.replace(/≈/g, "about").replace(/×/g, "times").replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
      return { text: d.trim(), speech: s };
    }
    function reply(intent, parts, o) {
      o = o || {};
      var r = render(parts);
      return { intent: intent, text: r.text, speech: r.speech, mood: o.mood || "happy", actions: o.actions || [], chips: o.chips || DEFAULT_CHIPS.slice(), data: o.data || null, blush: !!o.blush };
    }

    // ---------- Price per piece / box ----------
    var LABELS = { pcs: "pieces", ing: "ingredients", loss: "loss", pack: "packaging", mins: "your time", rate: "hourly rate", ovh: "overhead", margin: "margin" };
    // Says which values came from the Price tab: listed on screen, named (not read out) in speech.
    function priceDefaultsText(used, v) {
      var c = cur(), M = function (k) { return C.money(C.num(v[k]), c); }, bits = [];
      if (used.pcs && used.ing) bits.push(C.num(v.pcs) + " pieces from " + M("ing") + " of ingredients");
      else if (used.pcs) bits.push(C.num(v.pcs) + " pieces a batch");
      else if (used.ing) bits.push(M("ing") + " of ingredients");
      if (used.loss) bits.push(C.pct(C.num(v.loss)) + " loss");
      if (used.pack) bits.push(M("pack") + " packaging a piece");
      if (used.mins && used.rate) bits.push(C.fmt(C.num(v.mins)) + " min at " + M("rate") + " an hour");
      else if (used.mins) bits.push(C.fmt(C.num(v.mins)) + " min of your time");
      else if (used.rate) bits.push(M("rate") + " an hour");
      if (used.ovh) bits.push(M("ovh") + " overhead");
      if (used.margin) bits.push(C.pct(C.num(v.margin)) + " margin");
      if (!bits.length) return [];
      var names = Object.keys(used).filter(function (k) { return used[k]; }).map(function (k) { return LABELS[k]; });
      var said = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
      return [{ d: "\nFrom your Price tab: " + bits.join(", ") + ".", s: " For the " + said + " I used your Price tab." }];
    }

    function askFor(p, slot) {
      p.ask = slot;
      pending = p;
      var noun = p.noun || "pieces";
      if (slot === "pcs") return reply("ask:pcs", ["How many " + noun + " does one batch make?"], { mood: "worried", chips: ["12 " + noun, "24 " + noun, "36 " + noun], data: { ask: slot } });
      if (slot === "ing") return reply("ask:ing", ["What do the ingredients for one batch cost? For example, ", { m: 9.5 }, "."], { mood: "worried", chips: [C.money(5, cur()), C.money(10, cur()), "Use my recipe cost"], data: { ask: slot } });
      if (slot === "box") return reply("ask:box", ["How many pieces go in the box?"], { mood: "worried", chips: ["6", "12", "24"], data: { ask: slot } });
      if (slot === "margin") return reply("ask:margin", ["That margin is too high. Pick one between 0 and 94%. Which margin do you want?"], { mood: "worried", chips: ["30%", "35%", "40%"], data: { ask: slot } });
      return null;
    }

    function handlePrice(t, isBox, continuing) {
      var st = getState(), p = continuing ? pending : { intent: isBox ? "box" : "price", given: {}, noun: null, box: null, boxPack: null };
      if (isBox) p.intent = "box";
      pending = null;
      var ex = extractPrice(t, { cur: st.cur, box: p.intent === "box", prefer: continuing ? p.ask : null });
      var g = ex.vals;
      ["pcs", "ing", "loss", "pack", "mins", "rate", "ovh", "margin", "now", "lossPcs"].forEach(function (k) { if (g[k] != null) p.given[k] = g[k]; });
      if (g.box != null) p.box = g.box;
      if (g.boxPack != null) p.boxPack = g.boxPack;
      if (ex.noun && ex.noun !== "pieces") p.noun = ex.noun;
      else if (!p.noun && ex.noun) p.noun = ex.noun;
      if (ex.notes.markup != null) p.markup = ex.notes.markup;
      var fromRecipe = false;
      if (RE.priceRecipe.test(t) && p.given.ing == null) {
        var rt = C.recipeTotal(st.recipe), mk = Math.floor(C.num(st.recipe.makes));
        if (rt.total > 0) {
          p.given.ing = Math.round(rt.total * 100) / 100;
          if (p.given.pcs == null && mk > 0) p.given.pcs = mk;
          fromRecipe = st.recipe.name || "your recipe";
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
        else { v[k] = String(st.price[k] == null ? "" : st.price[k]); used[k] = true; }
      });
      var r = C.priceCalc(v);
      if (!r.ok) {
        if (r.error === "margin") return askFor(p, "margin");
        return askFor(p, "pcs");
      }
      var values = Object.assign({}, v);
      var noun = p.noun || "pieces", mood = "excited", parts;
      if (p.intent === "box") {
        var n = Math.floor(p.box), bp = p.boxPack || 0, total = r.price * n + bp, cost = r.cost * n + bp, keep = total - cost;
        parts = ["Charge ", { m: total }, " for a box of " + n + ": " + n + " × ", { m: r.price }, " a piece",
          bp ? ", plus " : "", bp ? { m: bp } : null, bp ? " for the box" : "", ".",
          { d: "\nYour cost is ", s: " Your cost is " }, { m: cost }, ", so you keep ", { m: keep }, " per box."];
        parts = parts.concat(priceDefaultsText(used, v));
        return reply("box", parts, { mood: mood, actions: [{ type: "price", label: "Open in Price tab", values: values }],
          chips: ["Price a box of 6", "Deposits for big orders", "Margin vs markup"],
          data: { values: values, result: r, used: used, count: n, boxPack: bp, total: total, cost: cost, keep: keep } });
      }
      parts = [fromRecipe ? "For " + fromRecipe + " (" + r.pcs + " " + noun + ", " : "For " + r.pcs + " " + noun + " with ",
        { m: r.ing }, fromRecipe ? " of ingredients):" : " of ingredients:",
        { d: "\nTrue cost ", s: " Your true cost is " }, { m: r.cost }, " a piece.",
        { d: "\nCharge at least ", s: " Charge at least " }, { m: r.price }, { d: " a piece, ", s: " a piece, or " }, { m: r.dozen }, " a dozen.",
        { d: "\nProfit ", s: " You keep " }, { m: r.profit }, { d: " a piece, ", s: " a piece and " }, { m: r.batch }, " a batch."];
      if (p.given.lossPcs != null && r.pcs > 0) {
        var an = /^(?:8|11|18)/.test(C.pct(r.loss)) ? "an " : "a ";
        parts.push({ d: "\nLosing " + C.fmt(p.given.lossPcs) + " of " + r.pcs + " is " + an + C.pct(r.loss) + " loss.", s: " Losing " + C.fmt(p.given.lossPcs) + " of " + r.pcs + " is " + an + C.pct(r.loss).replace("%", " percent") + " loss." });
      }
      if (p.markup != null) parts.push({ d: "\nA " + C.pct(p.markup) + " markup is a " + C.pct(r.margin) + " margin.", s: " A " + p.markup + " percent markup is a " + C.pct(r.margin).replace("%", " percent") + " margin." });
      parts = parts.concat(priceDefaultsText(used, v));
      var chk = null;
      if (p.given.now != null) {
        values.now = String(p.given.now);
        chk = C.nowCheck(r, values.now);
        if (chk && chk.status === "bad") { mood = "worried"; parts.push({ d: "\n", s: " " }, "At ", { m: chk.now }, " you lose ", { m: r.cost - chk.now }, " on every piece."); }
        else if (chk && chk.status === "warn") { mood = "worried"; parts.push({ d: "\n", s: " " }, "At ", { m: chk.now }, " you keep ", { p: chk.m }, ", below your ", { p: r.margin }, " target."); }
        else if (chk) parts.push({ d: "\n", s: " " }, "At ", { m: chk.now }, " you keep ", { p: chk.m }, ". That's on target.");
      }
      if (r.rate === 0) { mood = "worried"; parts.push({ d: "\n", s: " " }, "Your hourly rate is 0, so your time isn't paid. Add a rate in the Price tab."); }
      return reply("price", parts, { mood: mood, actions: [{ type: "price", label: "Open in Price tab", values: values }],
        chips: ["Price a box of 12", "Margin vs markup", "What does my recipe cost?"],
        data: { values: values, result: r, used: used, now: chk, noun: noun } });
    }

    // ---------- Recipe cost ----------
    function handleRecipe() {
      var st = getState(), rec = st.recipe || { items: [] }, rt = C.recipeTotal(rec), makes = Math.floor(C.num(rec.makes));
      var name = String(rec.name || "").trim() || "Your recipe";
      if (!(rt.total > 0)) {
        return reply("recipe", ["Your Recipe tab is empty. Open it, add each ingredient with the amount you use, the pack size and what you paid for the pack, and I'll add it up."],
          { mood: "worried", actions: [{ type: "recipe", label: "Open Recipe tab" }], data: { total: 0, makes: makes } });
      }
      var parts = [name + ": one batch costs ", { m: rt.total }, " in ingredients"];
      if (makes > 0) parts.push(", ", { m: rt.total / makes }, " a piece (" + makes + " pieces).");
      else parts.push(". Add how many pieces it makes on the Recipe tab and I'll give you the cost per piece.");
      if (rt.bad) parts.push({ d: "\n", s: " " }, rt.bad + (rt.bad === 1 ? " ingredient isn't" : " ingredients aren't") + " counted yet. See the Recipe tab.");
      return reply("recipe", parts, { mood: rt.bad ? "worried" : "happy", actions: [{ type: "recipe", label: "Open Recipe tab" }],
        chips: ["Price my recipe", "Scale my recipe", "Price a box of 12"],
        data: { name: name, total: rt.total, perPiece: makes > 0 ? rt.total / makes : null, makes: makes, bad: rt.bad } });
    }

    // ---------- Scale ----------
    function scaleTarget(t, makes) {
      var m;
      if (/\bdouble\b/.test(t)) return makes * 2;
      if (/\btriple\b/.test(t)) return makes * 3;
      if (/\bquadruple\b/.test(t)) return makes * 4;
      if (/\bhalve\b|\bhalf\b/.test(t)) return makes / 2;
      if ((m = t.match(/\bx ?(\d+(?:\.\d+)?)\b|\b(\d+(?:\.\d+)?) ?(?:x|times)\b/))) return makes * +(m[1] || m[2]);
      if ((m = t.match(/\b(?:to|need|make|making|for|into|get)\s(?:about\s)?(\d+(?:\.\d+)?)\b/))) return +m[1];
      if ((m = t.match(new RegExp("(\\d+(?:\\.\\d+)?) ?(?:" + NOUNS + ")\\b")))) return +m[1];
      if ((m = t.match(/(\d+(?:\.\d+)?)/))) return +m[1];
      return null;
    }
    function handleScale(t, continuing) {
      var st = getState(), rec = st.recipe || { items: [] }, makes = C.num(rec.makes);
      pending = null;
      if (!(makes > 0)) {
        return reply("scale", ["Tell me on the Recipe tab how many pieces your recipe makes, then I can scale it."],
          { mood: "worried", actions: [{ type: "recipe", label: "Open Recipe tab" }] });
      }
      var to = scaleTarget(t, makes);
      if (!(to > 0)) {
        pending = { intent: "scale", ask: "to" };
        return reply("ask:scale", ["How many pieces do you need? Your recipe makes " + C.fmt(makes) + "."], { mood: "worried", chips: ["36", "48", "60"], data: { ask: "to" } });
      }
      var sc = C.scaleRecipe(rec, to), name = String(rec.name || "").trim() || "your recipe";
      if (Math.abs(sc.f - 1) < 1e-9) {
        return reply("scale", [name.charAt(0).toUpperCase() + name.slice(1) + " already makes " + C.fmt(sc.makes) + ", so you don't need to change anything."], { mood: "happy", chips: ["Scale to 36", "Scale to 60", "What does my recipe cost?"], data: { to: sc.to, makes: sc.makes, f: 1 } });
      }
      var parts = ["To make " + C.fmt(sc.to) + " instead of " + C.fmt(sc.makes) + ", multiply everything by " + C.fmt(sc.f) + ".",
        { d: " Or bake " + sc.batches + " whole batch" + (sc.batches === 1 ? "" : "es") + " = " + C.fmt(sc.batches * sc.makes) + " pieces." }];
      var first = sc.lines.slice(0, 5);
      if (first.length) {
        first.forEach(function (ln) {
          var g = ln.grams != null ? { d: " ≈ " + C.fmt(ln.grams) + " g", s: ", about " + C.fmt(ln.grams) + " grams" } : null;
          parts.push({ d: "\n• " + ln.name + ": ", s: " " + ln.name + ": " }, ln.unit === "piece" ? C.fmt(ln.amount) + " " + ln.unitLabel : { u: [ln.amount, ln.unit] }, g, { s: "." });
        });
        if (sc.lines.length > 5) parts.push({ d: "\n…and " + (sc.lines.length - 5) + " more in the Scale tab.", s: " The rest is in the Scale tab." });
      }
      parts.push({ d: "\nIngredients for " + C.fmt(sc.to) + ": ", s: " Ingredients for " + C.fmt(sc.to) + " cost " }, { m: sc.cost }, ".");
      return reply("scale", parts, { mood: "happy", actions: [{ type: "scale", label: "Open in Scale tab", to: sc.to }],
        chips: ["What does my recipe cost?", "Scale to 36", "2 cups flour in grams"],
        data: { to: sc.to, makes: sc.makes, f: sc.f, batches: sc.batches, lines: first, cost: sc.cost, name: name } });
    }

    // ---------- Cups and spoons to grams ----------
    var STOP = /\b(?:how|many|much|grams?|gr|g|in|into|to|is|are|of|convert|what|whats|what's|does|do|weigh|weighs|weight|the|a|an|me|please|tell|it|there|equal|equals|us|would|be|approx|approximately|about|roughly|hey|bento|can|you|i|need|know|want|that|if|large)\b/g;
    function handleUnits(t, continuing) {
      var amount, unit, name, p = continuing ? pending : null;
      pending = null;
      if (p) { amount = p.amount; unit = p.unit; name = t.replace(/[?.!,]/g, " ").replace(STOP, " ").replace(/\s+/g, " ").trim(); }
      else {
        var u = t.match(RE.unit), e = t.match(RE.egg), rest;
        if (u && unitKey(u[2])) {
          amount = u[1] != null ? +u[1] : 1; unit = unitKey(u[2]);
          rest = t.slice(0, u.index) + " " + t.slice(u.index + u[0].length);
          name = rest.replace(/\d+(?:\.\d+)?/g, " ").replace(/[?.!,]/g, " ").replace(STOP, " ").replace(/\s+/g, " ").trim();
        } else if (e) {
          amount = e[1] != null ? +e[1] : 1; unit = "piece"; name = e[2];
        }
      }
      if (unit === "stick") {
        return reply("units", ["I don't have sticks in my unit list. Ask me in cups or tablespoons instead, for example 8 tbsp butter in grams."], { mood: "worried", chips: ["8 tbsp butter in grams", "1 cup butter in grams", "Price my cookies"] });
      }
      if (!unit) return help("unknown");
      var weight = C.BASE[unit] && C.BASE[unit][0] === "w";
      if (weight) {
        var gw = C.grams(amount, unit, null);
        return reply("units", [{ u: [amount, unit] }, name ? " of " + name : "", { d: " ≈ ", s: " is about " }, { g: gw }, "."],
          { chips: ["2 cups flour in grams", "3 tbsp butter in grams", "Price my cookies"], data: { grams: gw, amount: amount, unit: unit } });
      }
      if (!name) {
        pending = { intent: "units", amount: amount, unit: unit };
        return reply("ask:units", ["Which ingredient? A cup of flour and a cup of sugar weigh very differently."], { mood: "worried", chips: ["flour", "sugar", "butter"], data: { ask: "ingredient" } });
      }
      var d = C.findDensity(name);
      var g = d ? C.grams(amount, unit, d) : null;
      if (g == null) {
        return reply("units", ["I don't have a typical weight for “" + name + "”" + (unit === "piece" ? "." : " in my table.") + " Cup and spoon weights change a lot from one ingredient to another, so weigh it once and write the grams down."],
          { mood: "worried", chips: ["1 cup sugar in grams", "3 tbsp butter in grams", "Price my cookies"], data: { grams: null, name: name } });
      }
      var label = d[0].charAt(0).toLowerCase() + d[0].slice(1), what;
      if (unit === "piece") {
        var lg = label.match(/^(.*), large$/), nm = lg ? "large " + lg[1] : label;
        what = C.fmt(amount) + " " + (amount <= 1 ? nm.replace(/s$/, "") : nm);
      }
      var basis = unit === "piece" ? "1 piece ≈ " + d[3] + " g" : "1 cup ≈ " + d[2] + " g";
      var onlyCup = unit === "cup" && Math.abs(amount - 1) < 1e-9;
      return reply("units", [what || { u: [amount, unit] }, what ? "" : " of " + label, { d: " ≈ ", s: " is about " }, { g: g }, ".",
        { d: "\nTypical value" + (onlyCup ? "" : " (" + basis + ")") + ". Weigh it for the most consistent results.", s: " That's a typical value, so weigh it if you can." }],
        { chips: ["3 tbsp butter in grams", "1 cup sugar in grams", "Price my cookies"], data: { grams: g, amount: amount, unit: unit, dens: d[0] } });
    }

    // ---------- FAQ, Pro, small talk ----------
    function faq(id) {
      if (id === "markup") return reply("faq:markup", ["Markup is what you add on top of your cost. Margin is the part of the price you keep. If a cookie costs ", { m: 1 }, " and you sell it for ", { m: 2 }, ", the markup is 100% but the margin is 50%. My Price tab works with margin."], { chips: ["Price my cookies", "What to charge for my time", "Deposits for big orders"] });
      if (id === "howto") return reply("faq:howto", ["Add up four things for one batch: ingredients, packaging, your time and overhead like electricity. Divide by the pieces you can sell to get your true cost per piece. Then add the margin you want to keep. Tell me your batch and I'll do the math."], { chips: ["Price my cookies", "Margin vs markup", "What to charge for my time"] });
      if (id === "deposit") return reply("faq:deposit", ["For big or custom orders, ask for a deposit before you buy the ingredients. A simple rule is a deposit that covers at least your ingredients and packaging, with the rest due at pickup. Put your deposit and cancellation terms in writing and send them with every order."], { chips: ["Price a box of 12", "Price my cookies", "Margin vs markup"] });
      if (id === "time") return reply("faq:time", ["Pay yourself an hourly rate, the same way you would pay a helper. Pick a rate you would accept for similar work where you live, then count every minute: mixing, baking, cooling, decorating, packing and washing up. I add it to the price as minutes per batch times your rate, divided by the pieces."], { chips: ["Price my cookies", "Margin vs markup", "Deposits for big orders"] });
      return reply("faq:cottage", ["Rules for selling food you bake at home are different from place to place. They can cover what you may sell, labels, permits and where you can sell. Please check your local rules with your local food safety office. I can't give legal advice."], { chips: ["Price my cookies", "Deposits for big orders", "What to charge for my time"] });
    }
    function pro() {
      return reply("pro", ["Photo to recipe and orders with bookkeeping are coming soon in Bento Pro. Join the free waitlist and you'll get one email when it's ready."],
        { actions: [{ type: "pro", label: "Join the Pro waitlist" }] });
    }
    function help(kind) {
      if (kind === "greet") return reply("greet", ["Hi, I'm Bento! I can price your bakes, cost your recipe, scale it and turn cups into grams. Try one of these, or just ask."], { blush: true });
      if (kind === "thanks") return reply("thanks", ["You're welcome! Happy baking."], { blush: true });
      if (kind === "help") return reply("help", ["I can work out a price per piece or per box, what your recipe costs, how to scale it, and cups or spoons to grams. I can also explain margin, deposits and pricing your time. Try one of these:"]);
      if (kind === "cancel") return reply("cancel", ["Okay, let's start over. What would you like to work out?"]);
      return reply("unknown", ["Sorry, I don't know that one. I can work out prices per piece and per box, your recipe cost, scaling, and cups or spoons to grams. Try one of these:"], { mood: "worried" });
    }

    function ask(raw) {
      var t = normalize(String(raw || "").slice(0, 400));
      if (!t) return help("help");
      var intent = classify(t), p = pending;
      if (p) {
        if (intent === "cancel") { pending = null; return help("cancel"); }
        var numeric = /\d/.test(t) || RE.priceRecipe.test(t);
        if ((p.intent === "price" || p.intent === "box") && (intent === "price" || intent === "box" || (intent === "unknown" && numeric))) return handlePrice(t, intent === "box", true);
        if (p.intent === "scale" && (intent === "scale" || (intent === "unknown" && numeric))) return handleScale(t, true);
        if (p.intent === "units" && intent === "unknown" && !numeric) return handleUnits(t, true);
        // a reply without a number to Bento's question: ask once more, kindly
        if (intent === "unknown" && !numeric) {
          if (p.intent === "scale") { pending = p; return reply("ask:scale", ["I need a number for that. How many pieces do you need? Say cancel to stop."], { mood: "worried", chips: ["36", "48", "60"] }); }
          if ((p.intent === "price" || p.intent === "box") && p.ask) {
            var again = askFor(p, p.ask);
            again.text = "I need a number for that. " + again.text; again.speech = "I need a number for that. " + again.speech;
            return again;
          }
        }
        pending = null;
      }
      if (intent === "units") return handleUnits(t);
      if (intent === "pro") return pro();
      if (intent.indexOf("faq:") === 0) return faq(intent.slice(4));
      if (intent === "recipe") return handleRecipe();
      if (intent === "scale") return handleScale(t);
      if (intent === "box") return handlePrice(t, true);
      if (intent === "price") return handlePrice(t, false);
      if (intent === "cancel") return help("cancel");
      return help(intent);
    }

    return {
      ask: ask,
      reset: function () { pending = null; },
      pending: function () { return pending; },
      welcome: function () { return reply("welcome", ["Hi, I'm Bento! Ask me what to charge, what your recipe costs, how to scale it, or how many grams are in a cup."]); },
      tip: function (i) { var tx = TIPS[i % TIPS.length]; return reply("tip", [tx], { mood: "happy" }); }
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
    var sec = $("tab-talk"), svg = $("talkBento"), hopEl = $("talkHop"), tapBtn = $("bentoTap"), stage = $("talkStage"), berry = svg.querySelector(".tb-berry"), look = svg.querySelector(".tb-look");
    var sayEl = $("talkSay"), actionsEl = $("talkActions"), chipsEl = $("talkChips"), heardEl = $("heard");
    var micBtn = $("micBtn"), micLabel = $("micLabel"), talkForm = $("talkForm"), talkInput = $("talkInput"), tipEl = $("talkTip");
    var speakerBtn = $("speakerBtn"), typeBtn = $("typeBtn"), backBtn = $("backTalk"), mainEl = $("talkMain"), chatEl = $("talkChat");
    var logEl = $("chatLog"), chatForm = $("chatForm"), chatInput = $("chatInput"), chatChips = $("chatChips");
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
    var voiceOn = true;
    try { voiceOn = win.localStorage.getItem(VOICE_KEY) !== "off"; } catch (e) { voiceOn = true; }
    function pickVoice() {
      if (!synth || !synth.getVoices) return;
      var vs = [];
      try { vs = synth.getVoices() || []; } catch (e) { vs = []; }
      var us = vs.filter(function (v) { return /^en[-_]us/i.test(v.lang || ""); });
      voice = us.filter(function (v) { return v.localService; })[0] || us[0] || vs.filter(function (v) { return /^en/i.test(v.lang || ""); })[0] || null;
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
    function cancelSpeech() {
      if (synth && busy()) { try { synth.cancel(); } catch (e) { /* ignore */ } }
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
      stopTalking();
      if (!voiceOn || !synth || !unlocked || !win.SpeechSynthesisUtterance || !text) return false;
      try { if (synth.resume) synth.resume(); } catch (e) { /* ignore */ }
      var id = ++speakId, list = chunks(text);
      speaking = true; sawBoundary = false;
      svg.classList.add("speaking");
      // no word events (iOS, some voices)? then a steady talk loop until the speech ends
      later("loop", 700, function () { if (id === speakId && !sawBoundary) svg.classList.add("talk-loop"); });
      later("talkSafety", 4000 + text.length * 110, function () { if (id === speakId) stopTalking(); });
      list.forEach(function (c, i) {
        var u = new win.SpeechSynthesisUtterance(c);
        u.lang = "en-US"; if (voice) { try { u.voice = voice; } catch (e) { /* ignore */ } }
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
      speakerBtn.setAttribute("aria-label", voiceOn ? "Bento's voice is on" : "Bento's voice is off");
      speakerBtn.classList.toggle("off", !voiceOn);
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
        (list || DEFAULT_CHIPS).slice(0, 3).forEach(function (c) {
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
      heardEl.textContent = "You: " + text;
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
      micBtn.setAttribute("aria-label", on ? "Listening. Tap to stop" : "Ask Bento");
      micLabel.textContent = on ? "Listening…" : "Ask Bento";
      if (on) setMood("listening");
      else if (mood === "listening") setMood("happy");
    }
    function showFallback(why) {
      fallback = true;
      talkForm.hidden = false;
      tipEl.hidden = false;
      micBtn.setAttribute("aria-label", "Ask Bento: type your question");
      if (why) {
        var msg = why === "denied" ? "I can't use the microphone here, so let's type."
          : why === "network" ? "Voice input needs your browser's speech service, and it isn't reachable right now. You can type instead."
          : why === "nomic" ? "I can't find a microphone. You can type instead."
          : why === "quiet" ? "I still can't hear anything, so let's type instead."
          : "Voice input isn't working in this browser. You can type instead.";
        showReply({ text: msg, speech: msg, mood: "worried", actions: [], chips: DEFAULT_CHIPS, blush: false }, { noLog: true });
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
      var msg = "I didn't hear anything. Tap the button and try again.";
      showReply({ text: msg, speech: msg, mood: "worried", actions: [], chips: DEFAULT_CHIPS }, { noLog: true });
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
      rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
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
      var i; do { i = Math.floor(Math.random() * TIPS.length); } while (i === lastTip && TIPS.length > 1);
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
    renderChips(DEFAULT_CHIPS);
    setMood("happy");

    return {
      onShow: function () { visible = true; sec.classList.remove("paused"); startLife(); },
      onHide: function () { visible = false; stopLife(); if (listening) stopListening(false); },
      ask: ask, agent: agent, setMood: setMood, setMode: setMode,
      state: function () { return { mood: mood, mode: mode, speaking: speaking, listening: listening, thinking: thinking, voiceOn: voiceOn, fallback: fallback, messages: msgs.length }; },
      tips: TIPS
    };
  }

  return { create: create, mount: mount, normalize: normalize, extractPrice: extractPrice, classify: classify, spokenMoney: spokenMoney, TIPS: TIPS, DEFAULT_CHIPS: DEFAULT_CHIPS };
});
