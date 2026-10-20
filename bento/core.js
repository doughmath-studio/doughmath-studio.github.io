/* Bento core: the app's math as pure functions (no DOM).
   Used by the tabs (app.js) and by the talking helper (agent.js), so both always give the same numbers.
   Numbers are the same in every language; only how they are written changes (Intl.NumberFormat for the language).
   Works in the browser (window.BentoCore, after i18n.js) and in Node (require) for tests. */
(function (root, factory) {
  var I = typeof module === "object" && module.exports ? require("./i18n.js") : root.BentoI18n;
  var api = factory(I || null);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BentoCore = api;
})(typeof self !== "undefined" ? self : this, function (I) {
  "use strict";

  var CUP_ML = 236.588;
  var UNITS = ["g", "kg", "oz", "lb", "ml", "l", "tsp", "tbsp", "cup", "fl oz", "piece"];
  var BASE = {
    g: ["w", 1], kg: ["w", 1000], oz: ["w", 28.3495], lb: ["w", 453.592],
    ml: ["v", 1], l: ["v", 1000], tsp: ["v", 4.92892], tbsp: ["v", 14.7868], cup: ["v", CUP_ML], "fl oz": ["v", 29.5735],
    piece: ["c", 1]
  };
  // [display name, match keys (checked in order), grams per US cup, grams per piece]
  var DENS = [
    ["Chocolate chips", ["chocolate chip", "choc chip"], 170],
    ["Almond flour", ["almond flour"], 96],
    ["Cake flour", ["cake flour"], 114],
    ["Bread flour", ["bread flour"], 127],
    ["Whole wheat flour", ["whole wheat", "wholemeal"], 120],
    ["All-purpose flour", ["flour"], 120],
    ["Brown sugar, packed", ["brown sugar"], 213],
    ["Powdered sugar", ["powdered sugar", "icing sugar", "confectioners"], 120],
    ["Granulated sugar", ["sugar"], 200],
    ["Buttermilk", ["buttermilk"], 245],
    ["Peanut butter", ["peanut butter"], 258],
    ["Butter", ["butter"], 227],
    ["Cream of tartar", ["tartar"], 150],
    ["Cream cheese", ["cream cheese"], 232],
    ["Sour cream", ["sour cream"], 242],
    ["Heavy cream", ["cream"], 238],
    ["Sweetened condensed milk", ["condensed"], 306],
    ["Milk", ["milk"], 242],
    ["Yogurt", ["yogurt", "yoghurt"], 245],
    ["Water", ["water"], 237],
    ["Vegetable oil", ["oil"], 218],
    ["Honey", ["honey"], 340],
    ["Maple syrup", ["maple"], 315],
    ["Cocoa powder", ["cocoa"], 85],
    ["Rolled oats", ["oat"], 90],
    ["Cornstarch", ["cornstarch", "corn starch", "cornflour"], 128],
    ["Baking soda", ["baking soda", "bicarbonate"], 230],
    ["Baking powder", ["baking powder"], 192],
    ["Table salt", ["salt"], 288],
    ["Vanilla extract", ["vanilla"], 202],
    ["Chopped walnuts", ["walnut"], 117],
    ["Chopped pecans", ["pecan"], 109],
    ["Egg whites, large", ["egg white"], 243, 30],
    ["Egg yolks, large", ["yolk"], 243, 17],
    ["Eggs, large", ["egg"], 243, 50]
  ];
  var DEFAULT_PRICE = { ing: "9", pcs: "24", loss: "5", pack: "0.15", mins: "60", rate: "18", ovh: "1.5", margin: "35", now: "" };

  // ---------- language ----------
  var LANGS = I ? I.LANGS : ["en"];
  var active = "en";
  function L(lang) { return lang && I && I.has(lang) ? lang : active; }
  function setLang(lang) { if (I && I.has(lang)) active = lang; return active; }
  function getLang() { return active; }
  function tr(lang, key, vars, n) { return I ? I.t(L(lang), key, vars, n) : key; }

  // ---------- numbers: reading what people type ----------
  // Rules (same for the tabs and for Bento):
  //  - "9.50" and "9,50" are both 9.5 in every language.
  //  - With both "." and "," the last one is the decimal mark: "1,234.50" and "1.234,50" are 1234.5.
  //  - A single separator followed by exactly 3 digits after 1-3 leading digits is a thousands group only
  //    when it is the language's group mark: in English "1,500" is 1500 (and "1.500" is 1.5);
  //    in the comma languages "1.500" is 1500 (and "1,500" is 1.5). "0,500" and "0.500" are always 0.5.
  //  - The same mark repeated in groups of 3 is a thousands group ("1,234,567"); a space between groups too ("1 500").
  function parseNum(v, lang) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    lang = L(lang);
    var s = String(v == null ? "" : v).trim().replace(/(\d)[\u00a0\u202f\u2009 ](?=\d{3}(?!\d))/g, "$1");
    var m = s.match(/^[+-]?[\d.,]+/);
    if (!m) return 0;
    var tok = m[0], sign = 1;
    if (tok.charAt(0) === "-") { sign = -1; tok = tok.slice(1); } else if (tok.charAt(0) === "+") tok = tok.slice(1);
    var nd = tok.split(".").length - 1, nc = tok.split(",").length - 1, dec;
    if (nd && nc) dec = tok.lastIndexOf(".") > tok.lastIndexOf(",") ? "." : ",";
    else if (nd + nc === 1) {
      var sep = nd ? "." : ",", p = tok.split(sep), group = lang === "en" ? "," : ".";
      dec = sep === group && /^[1-9]\d{0,2}$/.test(p[0]) && /^\d{3}$/.test(p[1]) ? null : sep;
    } else if (nd + nc > 1) dec = /^\d{1,3}(?:[.,]\d{3})+$/.test(tok) ? null : (nd ? "." : ",");
    else dec = null;
    var clean;
    if (dec === null) clean = tok.replace(/[.,]/g, "");
    else {
      clean = tok.split(dec === "." ? "," : ".").join("");
      var i = clean.indexOf(dec);
      clean = clean.slice(0, i) + "." + clean.slice(i + 1).replace(/[.,].*$/, "");
    }
    var x = parseFloat(clean) * sign;
    return isFinite(x) ? x : 0;
  }
  function num(v, lang) { return parseNum(v, lang); }

  // ---------- numbers: writing them ----------
  var NF = {};
  function nf(lang, minF, maxF) {
    var k = lang + minF + maxF;
    if (!NF[k]) {
      try { NF[k] = new Intl.NumberFormat(I.META[lang].locale, { useGrouping: false, minimumFractionDigits: minF, maximumFractionDigits: maxF }); }
      catch (e) { NF[k] = { format: function (x) { return String(x).replace(".", ","); } }; }
    }
    return NF[k];
  }
  // s is the number as English writes it ("2.25"); the same digits in the language's style ("2,25")
  function localNum(s, lang) {
    if (lang === "en") return s;
    var n = Number(s);
    if (!isFinite(n)) return s;
    var dp = (String(s).split(".")[1] || "").length;
    return nf(lang, dp, dp).format(n);
  }
  function fmtEn(x) {
    if (!isFinite(x)) return "–";
    if (x === 0) return "0";
    if (x >= 100) return String(Math.round(x));
    if (x >= 10) return String(Math.round(x * 10) / 10);
    return String(Math.round(x * 100) / 100);
  }
  function fmt(x, lang) { var s = fmtEn(x); return isFinite(x) ? localNum(s, L(lang)) : s; }
  function money(v, cur, lang) {
    if (v == null || !isFinite(v)) return "–";
    lang = L(lang);
    var neg = v < 0, s = Math.abs(v).toFixed(2), c = cur || "$", out;
    if (lang === "en") out = c === "zł" ? s + " zł" : c + s;
    else out = lang === "pt" ? c + "\u00a0" + localNum(s, lang) : localNum(s, lang) + "\u00a0" + c;
    return neg ? "−" + out : out;
  }
  var PCT = {};
  function pctSuffix(lang) {
    if (PCT[lang] == null) {
      var s = "%";
      try { var f = new Intl.NumberFormat(I.META[lang].locale, { style: "percent" }).format(0.35); if (/^35/.test(f)) s = f.slice(2); } catch (e) { /* keep % */ }
      PCT[lang] = s;
    }
    return PCT[lang];
  }
  function pct(x, lang) {
    lang = L(lang);
    var s = (Math.round(x * 10) / 10).toString().replace(/\.0$/, "");
    return lang === "en" ? s + "%" : localNum(s, lang) + pctSuffix(lang);
  }
  // A stored value like "0.15" shown in an input in the language's style ("0,15"); anything typed stays as typed.
  function inputStr(v, lang) {
    lang = L(lang);
    var s = String(v == null ? "" : v);
    return lang !== "en" && /^-?\d+\.\d+$/.test(s) ? s.replace(".", ",") : s;
  }
  function ceil05(x) { return Math.ceil(x * 20 - 1e-9) / 20; }

  // ---------- units and ingredient names in the language ----------
  function unitLabel(unit, n, lang, spoken) {
    lang = L(lang);
    var d = I && I.D[lang] ? I.D[lang][spoken ? "unitsSp" : "units"] : null;
    var v = d && d[unit] != null ? d[unit] : unit;
    return I ? I.pick(v, lang, n) : v;
  }
  function ingName(row, lang) {
    lang = L(lang);
    var d = I && I.D[lang] && I.D[lang].ingNames;
    return d && d[row[0]] ? d[row[0]] : row[0];
  }
  var ROW = {};
  DENS.forEach(function (d) { ROW[d[0]] = d; });

  function item(name, amt, unit, size, punit, price) {
    return { name: name, amt: String(amt), unit: unit, size: String(size), punit: punit, price: String(price) };
  }
  // The sample recipe, written in the language (names from the app's ingredient table).
  function sampleRecipe(lang) {
    lang = L(lang);
    var n = function (en) { return ingName(ROW[en], lang); };
    return {
      id: null, name: tr(lang, "sample.name"), makes: "24",
      items: [
        item(n("All-purpose flour"), 2.25, "cup", 5, "lb", 4.50),
        item(n("Butter"), 1, "cup", 1, "lb", 5.00),
        item(n("Granulated sugar"), 0.75, "cup", 4, "lb", 3.80),
        item(n("Brown sugar, packed"), 0.75, "cup", 2, "lb", 2.60),
        item(n("Eggs, large"), 2, "piece", 12, "piece", 4.20),
        item(n("Vanilla extract"), 2, "tsp", 2, "fl oz", 6.00),
        item(n("Baking soda"), 1, "tsp", 1, "lb", 1.20),
        item(n("Table salt"), 1, "tsp", 26, "oz", 1.50),
        item(n("Chocolate chips"), 2, "cup", 12, "oz", 3.50)
      ]
    };
  }
  // true when rec is still the untouched sample recipe of some language (so it can follow a language change)
  function isSample(rec) {
    if (!rec) return null;
    var a = JSON.stringify({ n: rec.name, m: rec.makes, i: rec.items });
    for (var i = 0; i < LANGS.length; i++) {
      var s = sampleRecipe(LANGS[i]);
      if (a === JSON.stringify({ n: s.name, m: s.makes, i: s.items })) return LANGS[i];
    }
    return null;
  }

  // ---------- Price per piece (the Price tab) ----------
  // p: { ing, pcs, loss, pack, mins, rate, ovh, margin } as typed (strings or numbers).
  // lang: how to read typed strings (default: the app's language). Bento passes "en" for its own values ("9.5").
  function priceCalc(p, lang) {
    p = p || {};
    var n = function (x) { return num(x, lang); };
    var r = {
      ing: Math.max(0, n(p.ing)), pcs: Math.floor(n(p.pcs)), loss: Math.min(Math.max(n(p.loss), 0), 90),
      pack: Math.max(0, n(p.pack)), mins: Math.max(0, n(p.mins)), rate: Math.max(0, n(p.rate)),
      ovh: Math.max(0, n(p.ovh)), margin: n(p.margin), ok: false, error: null
    };
    if (r.pcs < 1) { r.error = "pcs"; return r; }
    if (r.margin < 0 || r.margin >= 95) { r.error = "margin"; return r; }
    r.sell = Math.max(1, Math.floor(r.pcs * (1 - r.loss / 100)));
    r.cIng = r.ing / r.sell;
    r.cTime = r.mins / 60 * r.rate / r.sell;
    r.cOvh = r.ovh / r.sell;
    r.cost = r.cIng + r.pack + r.cTime + r.cOvh;
    r.exact = r.cost / (1 - r.margin / 100);
    r.price = ceil05(r.exact);
    r.profit = r.price - r.cost;
    r.dozen = r.price * 12;
    r.batch = (r.price - r.cost) * r.sell;
    r.ok = true;
    return r;
  }
  // "What you charge now" check. Returns null when no current price is given.
  function nowCheck(r, nowRaw, lang) {
    var raw = String(nowRaw == null ? "" : nowRaw).trim(), now = num(raw, lang);
    if (!r || !r.ok || raw === "" || !(now > 0)) return null;
    var m = (now - r.cost) / now * 100;
    return { now: now, m: m, perBatch: (now - r.cost) * r.sell, status: now < r.cost ? "bad" : (m < r.margin - 0.05 ? "warn" : "ok") };
  }

  // ---------- Recipe cost (the Recipe tab) ----------
  // English names first for English (exactly as before); other languages: their own words first, then English, then the rest.
  function findDensity(name, lang) {
    lang = L(lang);
    var raw = String(name || "").toLowerCase(), f = null, order = lang === "en" ? LANGS : [lang, "en"].concat(LANGS.filter(function (l) { return l !== lang && l !== "en"; }));
    for (var o = 0; o < order.length; o++) {
      var l = order[o];
      if (l === "en") {
        for (var i = 0; i < DENS.length; i++) {
          for (var j = 0; j < DENS[i][1].length; j++) if (raw.indexOf(DENS[i][1][j]) >= 0) return DENS[i];
        }
      } else if (I && I.D[l] && I.D[l].ingKeys) {
        // keys are matched on the folded name with a space on each side, so " sal " is the whole word only
        if (f === null) f = " " + I.fold(raw).replace(/[^a-z0-9\u0400-\u04ff]+/g, " ") + " ";
        var keys = I.D[l].ingKeys;
        for (var k = 0; k < keys.length; k++) if (f.indexOf(I.fold(keys[k][0])) >= 0) return keys[k][1] ? ROW[keys[k][1]] || null : null;
      }
    }
    return null;
  }
  function toBase(amount, unit) { var b = BASE[unit] || BASE.g; return { dim: b[0], v: amount * b[1] }; }
  // Grams for an amount in any app unit. d = density row from findDensity (needed for cups, spoons and pieces).
  function grams(amount, unit, d) {
    var b = toBase(amount, unit);
    if (b.dim === "w") return b.v;
    if (!d) return null;
    if (b.dim === "v") return b.v / CUP_ML * d[2];
    return d[3] ? b.v * d[3] : null;
  }
  function lineInfo(it, lang) {
    lang = L(lang);
    var amt = num(it.amt, lang), size = num(it.size, lang), pr = num(it.price, lang);
    if (!String(it.name || "").trim() && !amt && !pr) return { cost: 0, note: "" };
    if (amt <= 0) return { cost: 0, note: tr(lang, "note.amount") };
    if (size <= 0 || pr <= 0) return { cost: 0, note: tr(lang, "note.pack") };
    var a = toBase(amt, it.unit), b = toBase(size, it.punit);
    if (a.dim === b.dim) return { cost: a.v / b.v * pr, note: "" };
    var d = findDensity(it.name, lang), ga = grams(amt, it.unit, d), gb = grams(size, it.punit, d);
    if (ga != null && gb != null) {
      var uses = (it.unit === "piece" || it.punit === "piece") && d[3] ? tr(lang, "note.basisPiece", { g: fmt(d[3], lang) }) : tr(lang, "note.basisCup", { g: fmt(d[2], lang) });
      return { cost: ga / gb * pr, note: tr(lang, "note.using", { basis: uses, name: ingName(d, lang) }) };
    }
    return { cost: null, note: tr(lang, "note.cant", { from: unitLabel(it.unit, 1, lang), to: unitLabel(it.punit, 1, lang) }) };
  }
  function recipeTotal(rec, lang) {
    var total = 0, bad = 0;
    ((rec && rec.items) || []).forEach(function (it) { var li = lineInfo(it, lang); if (li.cost == null) bad++; else total += li.cost; });
    return { total: total, bad: bad };
  }

  // ---------- Scale (the Scale tab) ----------
  function scaleRecipe(rec, to, lang) {
    lang = L(lang);
    rec = rec || { items: [] };
    var makes = num(rec.makes, lang), t = num(to, lang);
    if (makes <= 0 || t <= 0) return { ok: false, makes: makes, to: t, lines: [] };
    var f = t / makes, batches = Math.ceil(t / makes - 1e-9), lines = [];
    (rec.items || []).forEach(function (it) {
      var amt = num(it.amt, lang); if (amt <= 0) return;
      var s = amt * f, d = findDensity(it.name, lang), g = grams(s, it.unit, d);
      var unitLbl = lang === "en" ? (it.unit === "piece" && fmt(s, lang) !== "1" ? "pieces" : it.unit) : unitLabel(it.unit, Number(fmtEn(s)), lang);
      var showG = g != null && it.unit !== "g";
      lines.push({
        name: it.name || tr(lang, "scale.ingredient"), amount: s, unit: it.unit, unitLabel: unitLbl, grams: showG ? g : null,
        text: fmt(s, lang) + " " + unitLbl + (showG ? " ≈ " + fmt(g, lang) + " " + unitLabel("g", 2, lang) : "")
      });
    });
    return { ok: true, makes: makes, to: t, f: f, batches: batches, lines: lines, cost: recipeTotal(rec, lang).total * f };
  }

  return {
    CUP_ML: CUP_ML, UNITS: UNITS, BASE: BASE, DENS: DENS, DEFAULT_PRICE: DEFAULT_PRICE, LANGS: LANGS,
    setLang: setLang, getLang: getLang, parseNum: parseNum,
    num: num, fmt: fmt, fmtEn: fmtEn, money: money, ceil05: ceil05, pct: pct, inputStr: inputStr, localNum: localNum,
    unitLabel: unitLabel, ingName: ingName,
    item: item, sampleRecipe: sampleRecipe, isSample: isSample,
    priceCalc: priceCalc, nowCheck: nowCheck,
    findDensity: findDensity, toBase: toBase, grams: grams, lineInfo: lineInfo, recipeTotal: recipeTotal,
    scaleRecipe: scaleRecipe
  };
});
