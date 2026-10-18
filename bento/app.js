(function () {
  "use strict";

  var KEY = "bento.v1";
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
  var FORM = "https://docs.google.com/forms/d/e/1FAIpQLSdGNhBHjq77XRkeylev6x1t_Ee0TYMZSW57gnel0fp2LGDk5w/viewform";

  function $(id) { return document.getElementById(id); }
  function num(v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : 0; }
  function fmt(x) {
    if (!isFinite(x)) return "–";
    if (x === 0) return "0";
    if (x >= 100) return String(Math.round(x));
    if (x >= 10) return String(Math.round(x * 10) / 10);
    return String(Math.round(x * 100) / 100);
  }
  function money(v) {
    if (v == null || !isFinite(v)) return "–";
    var neg = v < 0, s = Math.abs(v).toFixed(2), c = state.cur;
    var out = c === "zł" ? s + " zł" : c + s;
    return neg ? "−" + out : out;
  }
  function ceil05(x) { return Math.ceil(x * 20 - 1e-9) / 20; }
  function pct(x) { return (Math.round(x * 10) / 10).toString().replace(/\.0$/, "") + "%"; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function guessCur() {
    var l = ((navigator.languages && navigator.languages[0]) || navigator.language || "en-US").toLowerCase();
    if (l.indexOf("pl") === 0) return "zł";
    if (l === "en-gb") return "£";
    if (l === "en-ca" || l === "fr-ca") return "C$";
    if (l === "en-au") return "A$";
    if (l === "en-ie" || /^(de|fr|es|it|nl|pt|fi|el|sk|sl|et|lv|lt|mt|hr)\b/.test(l)) return "€";
    return "$";
  }
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
  var defaults = {
    cur: guessCur(), tab: "price",
    price: { ing: "9", pcs: "24", loss: "5", pack: "0.15", mins: "60", rate: "18", ovh: "1.5", margin: "35", now: "" },
    recipe: null, saved: [], scaleTo: "60", installDismissed: false
  };

  function load() { try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: app still works */ } }

  var stored = load() || {};
  var state = {
    cur: stored.cur || defaults.cur,
    tab: ["price", "recipe", "scale", "pro"].indexOf(stored.tab) >= 0 ? stored.tab : "price",
    price: Object.assign({}, defaults.price, stored.price || {}),
    recipe: stored.recipe && Array.isArray(stored.recipe.items) ? stored.recipe : sampleRecipe(),
    saved: Array.isArray(stored.saved) ? stored.saved : [],
    scaleTo: stored.scaleTo != null ? stored.scaleTo : defaults.scaleTo,
    installDismissed: !!stored.installDismissed
  };

  // ---------- Bento speaks ----------
  var speech = { price: null, recipe: null, scale: null, pro: { mood: "happy", text: "I'm learning new tricks: photo to recipe, and orders with deposits. Want to be first to try them?" } };
  var mascot = $("mascot"), sayEl = $("say"), lastMood = "happy";
  function speak() {
    var s = speech[state.tab] || { mood: "happy", text: "" };
    sayEl.textContent = s.text;
    if (s.mood !== lastMood) {
      mascot.setAttribute("data-mood", s.mood);
      mascot.classList.remove("hop"); void mascot.getBBox(); mascot.classList.add("hop");
      lastMood = s.mood;
    }
  }

  // ---------- Price per piece ----------
  var P = { ing: "pIng", pcs: "pPcs", loss: "pLoss", pack: "pPack", mins: "pMins", rate: "pRate", ovh: "pOvh", margin: "pMargin", now: "pNow" };
  function setText(id, t) { $(id).textContent = t; }
  function calcPrice() {
    var p = state.price;
    var ing = Math.max(0, num(p.ing)), pcs = Math.floor(num(p.pcs)), loss = Math.min(Math.max(num(p.loss), 0), 90),
        pack = Math.max(0, num(p.pack)), mins = Math.max(0, num(p.mins)), rate = Math.max(0, num(p.rate)),
        ovh = Math.max(0, num(p.ovh)), margin = num(p.margin);
    var rows = ["rSell", "rIng", "rPack", "rTime", "rOvh", "rCost", "rProfit", "rDozen", "rBatch"];
    var nowOut = $("nowOut");
    nowOut.className = "msg"; nowOut.textContent = "";
    function blank(msg) {
      setText("pPrice", "–"); setText("pSub", msg);
      rows.forEach(function (r) { setText(r, "–"); });
      speech.price = { mood: "flat", text: msg };
    }
    if (pcs < 1) return blank("Tell me how many pieces your recipe makes.");
    if (margin < 0 || margin >= 95) return blank("Pick a margin between 0 and 94%.");
    var sell = Math.max(1, Math.floor(pcs * (1 - loss / 100)));
    var cIng = ing / sell, cTime = mins / 60 * rate / sell, cOvh = ovh / sell;
    var cost = cIng + pack + cTime + cOvh;
    var exact = cost / (1 - margin / 100), price = ceil05(exact);
    setText("pPrice", money(price));
    setText("pSub", "Exact " + money(exact) + " at a " + pct(margin) + " margin, rounded up to 0.05");
    setText("rSell", sell + " of " + pcs);
    setText("rIng", money(cIng)); setText("rPack", money(pack)); setText("rTime", money(cTime)); setText("rOvh", money(cOvh));
    setText("rCost", money(cost)); setText("rProfit", money(price - cost));
    setText("rDozen", money(price * 12)); setText("rBatch", money((price - cost) * sell));

    var nowRaw = String(p.now || "").trim(), now = num(nowRaw);
    if (nowRaw !== "" && now > 0) {
      var m = (now - cost) / now * 100, perBatch = (now - cost) * sell;
      if (now < cost) {
        nowOut.className = "msg bad";
        nowOut.textContent = "You lose " + money(cost - now) + " on every piece, " + money(-perBatch) + " per batch.";
        speech.price = { mood: "sad", text: "Careful: at " + money(now) + " each piece costs you more than you charge. Your true cost is " + money(cost) + "." };
      } else if (m < margin - 0.05) {
        nowOut.className = "msg warn";
        nowOut.textContent = "Margin " + pct(m) + ". Profit " + money(perBatch) + " per batch. At " + money(price) + " it would be " + money((price - cost) * sell) + ".";
        speech.price = { mood: "flat", text: "At " + money(now) + " you keep " + pct(m) + ". Going to " + money(price) + " gets you to your " + pct(margin) + " target." };
      } else {
        nowOut.className = "msg ok";
        nowOut.textContent = "Margin " + pct(m) + ". Profit " + money(perBatch) + " per batch.";
        speech.price = { mood: "happy", text: "Nice! At " + money(now) + " you keep " + pct(m) + ", right where you want to be." };
      }
    } else if (rate === 0) {
      speech.price = { mood: "flat", text: "Your hourly rate is 0, so you'd bake for free. Add a rate and I'll price your time in." };
    } else {
      speech.price = { mood: "happy", text: "Charge at least " + money(price) + " a piece. That covers ingredients, packaging, " + fmt(mins) + " min of your time and a " + pct(margin) + " margin." };
    }
  }
  function fillPrice() { Object.keys(P).forEach(function (k) { $(P[k]).value = state.price[k]; }); }
  Object.keys(P).forEach(function (k) {
    $(P[k]).addEventListener("input", function (e) { state.price[k] = e.target.value; calcPrice(); speak(); save(); });
  });

  // ---------- Recipe cost ----------
  function findDensity(name) {
    var n = String(name || "").toLowerCase();
    for (var i = 0; i < DENS.length; i++) {
      for (var j = 0; j < DENS[i][1].length; j++) if (n.indexOf(DENS[i][1][j]) >= 0) return DENS[i];
    }
    return null;
  }
  function toBase(amount, unit) { var b = BASE[unit] || BASE.g; return { dim: b[0], v: amount * b[1] }; }
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
  function recipeTotal() {
    var total = 0, bad = 0;
    state.recipe.items.forEach(function (it) { var li = lineInfo(it); if (li.cost == null) bad++; else total += li.cost; });
    return { total: total, bad: bad };
  }
  function unitOptions(sel) {
    return UNITS.map(function (u) { return '<option value="' + u + '"' + (u === sel ? " selected" : "") + ">" + u + "</option>"; }).join("");
  }
  function renderItems() {
    var box = $("items");
    box.innerHTML = "";
    state.recipe.items.forEach(function (it, i) {
      var el = document.createElement("div");
      el.className = "ing";
      el.innerHTML =
        '<div class="ing-top"><input class="nm" list="ingList" placeholder="Ingredient" aria-label="Ingredient ' + (i + 1) + '" autocomplete="off">' +
        '<button class="icon-btn rm" type="button" aria-label="Remove ingredient ' + (i + 1) + '">×</button></div>' +
        '<div class="ing-grid">' +
        '<div><label>Amount used</label><div class="pair"><input class="amt" inputmode="decimal" aria-label="Amount used" autocomplete="off"><select class="unit" aria-label="Unit used">' + unitOptions(it.unit) + "</select></div></div>" +
        '<div><label>Pack size</label><div class="pair"><input class="size" inputmode="decimal" aria-label="Pack size" autocomplete="off"><select class="punit" aria-label="Pack unit">' + unitOptions(it.punit) + "</select></div></div>" +
        '<div><label>Pack price</label><input class="pr" inputmode="decimal" aria-label="Pack price" autocomplete="off"></div>' +
        '<div class="lc"><label>Cost in recipe</label><b class="lcv">–</b></div>' +
        '</div><p class="note ln"></p>';
      el.querySelector(".nm").value = it.name;
      el.querySelector(".amt").value = it.amt;
      el.querySelector(".size").value = it.size;
      el.querySelector(".pr").value = it.price;
      var map = { nm: "name", amt: "amt", unit: "unit", size: "size", punit: "punit", pr: "price" };
      Object.keys(map).forEach(function (cls) {
        var input = el.querySelector("." + cls);
        var handler = function () { it[map[cls]] = input.value; updateLine(el, it); updateRecipe(); save(); };
        input.addEventListener("input", handler);
        input.addEventListener("change", handler);
      });
      el.querySelector(".rm").addEventListener("click", function () {
        state.recipe.items.splice(i, 1);
        if (!state.recipe.items.length) state.recipe.items.push(item("", "", "cup", "", "lb", ""));
        renderItems(); updateRecipe(); save();
      });
      box.appendChild(el);
      updateLine(el, it);
    });
  }
  function updateLine(el, it) {
    var li = lineInfo(it);
    el.querySelector(".lcv").textContent = li.cost == null ? "?" : money(li.cost);
    el.querySelector(".ln").textContent = li.note;
  }
  function updateRecipe() {
    var r = recipeTotal(), makes = Math.floor(num(state.recipe.makes));
    $("rTotal").textContent = money(r.total);
    $("rPer").textContent = makes > 0 ? money(r.total / makes) + " per piece in ingredients (" + makes + " pieces)" : "Add how many pieces the recipe makes.";
    $("rWarn").textContent = r.bad ? r.bad + (r.bad === 1 ? " ingredient isn't" : " ingredients aren't") + " counted yet. See the note on " + (r.bad === 1 ? "it" : "them") + "." : "";
    speech.recipe = r.total > 0 && makes > 0
      ? { mood: r.bad ? "flat" : "happy", text: (state.recipe.name ? state.recipe.name + ": " : "") + "one batch costs " + money(r.total) + " in ingredients, " + money(r.total / makes) + " a piece. Tap Price it and I'll add your time and margin." }
      : { mood: "happy", text: "Type what you paid for each pack. I'll work out the cost of what you actually use, even cups from a 5 lb bag." };
    if (state.tab === "recipe") speak();
  }
  function fillRecipe() {
    $("rName").value = state.recipe.name || "";
    $("rMakes").value = state.recipe.makes || "";
    renderItems(); updateRecipe(); renderSaved();
  }
  $("rName").addEventListener("input", function (e) { state.recipe.name = e.target.value; updateRecipe(); save(); });
  $("rMakes").addEventListener("input", function (e) { state.recipe.makes = e.target.value; updateRecipe(); save(); });
  $("addItem").addEventListener("click", function () {
    state.recipe.items.push(item("", "", "cup", "", "lb", ""));
    renderItems(); updateRecipe(); save();
    var all = document.querySelectorAll("#items .nm"); if (all.length) all[all.length - 1].focus();
  });
  $("toPrice").addEventListener("click", function () {
    var r = recipeTotal();
    state.price.ing = r.total.toFixed(2);
    if (num(state.recipe.makes) > 0) state.price.pcs = String(Math.floor(num(state.recipe.makes)));
    fillPrice(); calcPrice(); show("price"); save();
  });
  $("fromRecipe").addEventListener("click", function () { $("toPrice").click(); });
  $("saveRecipe").addEventListener("click", function () {
    var rec = JSON.parse(JSON.stringify(state.recipe));
    if (!String(rec.name || "").trim()) rec.name = "My recipe";
    state.recipe.name = rec.name; $("rName").value = rec.name;
    if (!rec.id) { rec.id = uid(); state.recipe.id = rec.id; }
    var idx = -1;
    state.saved.forEach(function (s, i) { if (s.id === rec.id) idx = i; });
    if (idx >= 0) state.saved[idx] = rec; else state.saved.unshift(rec);
    save(); renderSaved();
    speech.recipe = { mood: "happy", text: "Saved “" + rec.name + "”. It stays on this device." };
    speak();
  });
  $("newRecipe").addEventListener("click", function () {
    state.recipe = { id: null, name: "", makes: "", items: [item("", "", "cup", "", "lb", "")] };
    fillRecipe(); save(); $("rName").focus();
  });
  function renderSaved() {
    var ul = $("savedList");
    ul.innerHTML = "";
    $("savedEmpty").hidden = state.saved.length > 0;
    state.saved.forEach(function (rec) {
      var li = document.createElement("li");
      var meta = document.createElement("div"); meta.className = "meta";
      var b = document.createElement("b"); b.textContent = rec.name || "Recipe";
      var cur = state.recipe; state.recipe = rec; var tot = recipeTotal().total; state.recipe = cur;
      var sm = document.createElement("small"); sm.textContent = "Makes " + (rec.makes || "?") + " · " + money(tot) + " a batch";
      meta.appendChild(b); meta.appendChild(sm);
      var open = document.createElement("button"); open.type = "button"; open.className = "btn ghost small"; open.textContent = "Open";
      open.addEventListener("click", function () {
        state.recipe = JSON.parse(JSON.stringify(rec)); fillRecipe(); save(); window.scrollTo(0, 0);
      });
      var del = document.createElement("button"); del.type = "button"; del.className = "icon-btn"; del.textContent = "×";
      del.setAttribute("aria-label", "Delete " + (rec.name || "recipe"));
      del.addEventListener("click", function () {
        if (!window.confirm("Delete “" + (rec.name || "this recipe") + "” from this device?")) return;
        state.saved = state.saved.filter(function (s) { return s.id !== rec.id; });
        if (state.recipe.id === rec.id) state.recipe.id = null;
        save(); renderSaved();
      });
      li.appendChild(meta); li.appendChild(open); li.appendChild(del);
      ul.appendChild(li);
    });
  }
  (function () {
    var dl = $("ingList");
    DENS.forEach(function (d) { var o = document.createElement("option"); o.value = d[0]; dl.appendChild(o); });
  })();

  // ---------- Scale ----------
  function calcScale() {
    var rec = state.recipe, makes = num(rec.makes), to = num(state.scaleTo);
    $("sName").textContent = (rec.name ? rec.name : "Your recipe") + " from the Recipe tab.";
    var ul = $("scaled"); ul.innerHTML = "";
    if (makes <= 0 || to <= 0) {
      $("sFactor").textContent = "";
      $("sCost").textContent = "–";
      speech.scale = { mood: "flat", text: "Tell me how many your recipe makes and how many you need." };
      return;
    }
    var f = to / makes, batches = Math.ceil(to / makes - 1e-9);
    $("sFactor").textContent = "Multiply everything by " + fmt(f) + ". Or bake " + batches + " whole batch" + (batches === 1 ? "" : "es") + " = " + fmt(batches * makes) + " pieces.";
    var shown = 0;
    rec.items.forEach(function (it) {
      var amt = num(it.amt); if (amt <= 0) return;
      var s = amt * f, d = findDensity(it.name), g = grams(s, it.unit, d);
      var li = document.createElement("li");
      var a = document.createElement("span"); a.textContent = it.name || "Ingredient";
      var unitLabel = it.unit === "piece" && fmt(s) !== "1" ? "pieces" : it.unit;
      var b = document.createElement("span"); b.textContent = fmt(s) + " " + unitLabel + (g != null && it.unit !== "g" ? " ≈ " + fmt(g) + " g" : "");
      li.appendChild(a); li.appendChild(b); ul.appendChild(li); shown++;
    });
    if (!shown) { var li = document.createElement("li"); li.textContent = "Add ingredients on the Recipe tab."; ul.appendChild(li); }
    $("sCost").textContent = money(recipeTotal().total * f);
    speech.scale = { mood: "happy", text: "Need " + fmt(to) + " instead of " + fmt(makes) + "? Multiply by " + fmt(f) + ". I turned cups and spoons into grams too." };
  }
  $("sMakes").addEventListener("input", function (e) { state.recipe.makes = e.target.value; $("rMakes").value = e.target.value; updateRecipe(); calcScale(); speak(); save(); });
  $("sTo").addEventListener("input", function (e) { state.scaleTo = e.target.value; calcScale(); speak(); save(); });

  // ---------- Tabs ----------
  var tabs = ["price", "recipe", "scale", "pro"];
  function show(tab) {
    state.tab = tab;
    tabs.forEach(function (t) {
      $("tab-" + t).hidden = t !== tab;
      $("t-" + t).setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    if (tab === "scale") { $("sMakes").value = state.recipe.makes || ""; $("sTo").value = state.scaleTo; calcScale(); }
    if (tab === "recipe") updateRecipe();
    if (tab === "price") calcPrice();
    speak(); save();
    window.scrollTo(0, 0);
  }
  tabs.forEach(function (t) { $("t-" + t).addEventListener("click", function () { show(t); }); });

  // ---------- Currency ----------
  $("cur").value = state.cur;
  $("cur").addEventListener("change", function (e) {
    state.cur = e.target.value; save();
    calcPrice(); renderItems(); updateRecipe(); renderSaved(); calcScale(); speak();
  });

  // ---------- Install hint ----------
  var deferredPrompt = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  function showInstall(kind) {
    if (state.installDismissed || standalone) return;
    $("installText").textContent = kind === "ios"
      ? "Keep Bento on your Home Screen: tap Share, then “Add to Home Screen”."
      : "Install Bento on this device for one-tap access. It works offline.";
    $("installBtn").hidden = kind !== "prompt";
    $("install").hidden = false;
  }
  window.addEventListener("beforeinstallprompt", function (e) {
    if (isIOS) return;
    e.preventDefault(); deferredPrompt = e; showInstall("prompt");
  });
  $("installBtn").addEventListener("click", function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); deferredPrompt = null; $("install").hidden = true;
  });
  $("installClose").addEventListener("click", function () { state.installDismissed = true; save(); $("install").hidden = true; });
  if (isIOS) showInstall("ios");

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  // ---------- Start ----------
  fillPrice(); calcPrice(); fillRecipe(); calcScale();
  show(state.tab);
  window.BentoTest = { state: state, lineInfo: lineInfo, recipeTotal: recipeTotal, findDensity: findDensity, FORM: FORM };
})();
