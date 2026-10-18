/* Bento core: the app's math as pure functions (no DOM).
   Used by the tabs (app.js) and by the talking helper (agent.js), so both always give the same numbers.
   Works in the browser (window.BentoCore) and in Node (require) for tests. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BentoCore = api;
})(typeof self !== "undefined" ? self : this, function () {
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

  function num(v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : 0; }
  function fmt(x) {
    if (!isFinite(x)) return "–";
    if (x === 0) return "0";
    if (x >= 100) return String(Math.round(x));
    if (x >= 10) return String(Math.round(x * 10) / 10);
    return String(Math.round(x * 100) / 100);
  }
  function money(v, cur) {
    if (v == null || !isFinite(v)) return "–";
    var neg = v < 0, s = Math.abs(v).toFixed(2), c = cur || "$";
    var out = c === "zł" ? s + " zł" : c + s;
    return neg ? "−" + out : out;
  }
  function ceil05(x) { return Math.ceil(x * 20 - 1e-9) / 20; }
  function pct(x) { return (Math.round(x * 10) / 10).toString().replace(/\.0$/, "") + "%"; }

  function item(name, amt, unit, size, punit, price) {
    return { name: name, amt: String(amt), unit: unit, size: String(size), punit: punit, price: String(price) };
  }
  function sampleRecipe() {
    return {
      id: null, name: "Chocolate chip cookies", makes: "24",
      items: [
        item("All-purpose flour", 2.25, "cup", 5, "lb", 4.50),
        item("Butter", 1, "cup", 1, "lb", 5.00),
        item("Granulated sugar", 0.75, "cup", 4, "lb", 3.80),
        item("Brown sugar, packed", 0.75, "cup", 2, "lb", 2.60),
        item("Eggs, large", 2, "piece", 12, "piece", 4.20),
        item("Vanilla extract", 2, "tsp", 2, "fl oz", 6.00),
        item("Baking soda", 1, "tsp", 1, "lb", 1.20),
        item("Table salt", 1, "tsp", 26, "oz", 1.50),
        item("Chocolate chips", 2, "cup", 12, "oz", 3.50)
      ]
    };
  }

  // ---------- Price per piece (the Price tab) ----------
  // p: { ing, pcs, loss, pack, mins, rate, ovh, margin } as typed (strings or numbers).
  function priceCalc(p) {
    p = p || {};
    var r = {
      ing: Math.max(0, num(p.ing)), pcs: Math.floor(num(p.pcs)), loss: Math.min(Math.max(num(p.loss), 0), 90),
      pack: Math.max(0, num(p.pack)), mins: Math.max(0, num(p.mins)), rate: Math.max(0, num(p.rate)),
      ovh: Math.max(0, num(p.ovh)), margin: num(p.margin), ok: false, error: null
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
  function nowCheck(r, nowRaw) {
    var raw = String(nowRaw == null ? "" : nowRaw).trim(), now = num(raw);
    if (!r || !r.ok || raw === "" || !(now > 0)) return null;
    var m = (now - r.cost) / now * 100;
    return { now: now, m: m, perBatch: (now - r.cost) * r.sell, status: now < r.cost ? "bad" : (m < r.margin - 0.05 ? "warn" : "ok") };
  }

  // ---------- Recipe cost (the Recipe tab) ----------
  function findDensity(name) {
    var n = String(name || "").toLowerCase();
    for (var i = 0; i < DENS.length; i++) {
      for (var j = 0; j < DENS[i][1].length; j++) if (n.indexOf(DENS[i][1][j]) >= 0) return DENS[i];
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
  function lineInfo(it) {
    var amt = num(it.amt), size = num(it.size), pr = num(it.price);
    if (!String(it.name || "").trim() && !amt && !pr) return { cost: 0, note: "" };
    if (amt <= 0) return { cost: 0, note: "Add the amount you use." };
    if (size <= 0 || pr <= 0) return { cost: 0, note: "Add the pack size and what you paid for it." };
    var a = toBase(amt, it.unit), b = toBase(size, it.punit);
    if (a.dim === b.dim) return { cost: a.v / b.v * pr, note: "" };
    var d = findDensity(it.name), ga = grams(amt, it.unit, d), gb = grams(size, it.punit, d);
    if (ga != null && gb != null) {
      var uses = (it.unit === "piece" || it.punit === "piece") && d[3] ? "1 piece ≈ " + d[3] + " g" : "1 cup ≈ " + d[2] + " g";
      return { cost: ga / gb * pr, note: "Using " + uses + " (" + d[0] + ")." };
    }
    return { cost: null, note: "I can't turn " + it.unit + " into " + it.punit + " for this one. Pick a name from the list, or use the same kind of unit for both." };
  }
  function recipeTotal(rec) {
    var total = 0, bad = 0;
    ((rec && rec.items) || []).forEach(function (it) { var li = lineInfo(it); if (li.cost == null) bad++; else total += li.cost; });
    return { total: total, bad: bad };
  }

  // ---------- Scale (the Scale tab) ----------
  function scaleRecipe(rec, to) {
    rec = rec || { items: [] };
    var makes = num(rec.makes), t = num(to);
    if (makes <= 0 || t <= 0) return { ok: false, makes: makes, to: t, lines: [] };
    var f = t / makes, batches = Math.ceil(t / makes - 1e-9), lines = [];
    (rec.items || []).forEach(function (it) {
      var amt = num(it.amt); if (amt <= 0) return;
      var s = amt * f, d = findDensity(it.name), g = grams(s, it.unit, d);
      var unitLabel = it.unit === "piece" && fmt(s) !== "1" ? "pieces" : it.unit;
      var showG = g != null && it.unit !== "g";
      lines.push({
        name: it.name || "Ingredient", amount: s, unit: it.unit, unitLabel: unitLabel, grams: showG ? g : null,
        text: fmt(s) + " " + unitLabel + (showG ? " ≈ " + fmt(g) + " g" : "")
      });
    });
    return { ok: true, makes: makes, to: t, f: f, batches: batches, lines: lines, cost: recipeTotal(rec).total * f };
  }

  return {
    CUP_ML: CUP_ML, UNITS: UNITS, BASE: BASE, DENS: DENS, DEFAULT_PRICE: DEFAULT_PRICE,
    num: num, fmt: fmt, money: money, ceil05: ceil05, pct: pct,
    item: item, sampleRecipe: sampleRecipe,
    priceCalc: priceCalc, nowCheck: nowCheck,
    findDensity: findDensity, toBase: toBase, grams: grams, lineInfo: lineInfo, recipeTotal: recipeTotal,
    scaleRecipe: scaleRecipe
  };
});
