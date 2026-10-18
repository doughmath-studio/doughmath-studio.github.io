(function () {
  "use strict";

  // The math lives in core.js (pure functions), shared with the talking helper in agent.js.
  var C = window.BentoCore;
  var KEY = "bento.v1";
  var UNITS = C.UNITS, DENS = C.DENS;
  var FORM = "https://docs.google.com/forms/d/e/1FAIpQLSdGNhBHjq77XRkeylev6x1t_Ee0TYMZSW57gnel0fp2LGDk5w/viewform";

  function $(id) { return document.getElementById(id); }
  var num = C.num, fmt = C.fmt, pct = C.pct, item = C.item;
  function money(v) { return C.money(v, state.cur); }
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
  var defaults = {
    cur: guessCur(), tab: "talk",
    price: Object.assign({}, C.DEFAULT_PRICE),
    recipe: null, saved: [], scaleTo: "60", installDismissed: false
  };

  function load() { try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: app still works */ } }

  var tabs = ["talk", "price", "recipe", "scale", "pro"];
  var stored = load() || {};
  var state = {
    cur: stored.cur || defaults.cur,
    // The Talk tab opens on the first visit (also the first visit after this update); after that Bento remembers the last tab.
    tab: stored.talkSeen && tabs.indexOf(stored.tab) >= 0 ? stored.tab : defaults.tab,
    price: Object.assign({}, defaults.price, stored.price || {}),
    recipe: stored.recipe && Array.isArray(stored.recipe.items) ? stored.recipe : C.sampleRecipe(),
    saved: Array.isArray(stored.saved) ? stored.saved : [],
    scaleTo: stored.scaleTo != null ? stored.scaleTo : defaults.scaleTo,
    installDismissed: !!stored.installDismissed,
    talkSeen: true
  };

  // ---------- Bento speaks ----------
  var speech = { price: null, recipe: null, scale: null, pro: { mood: "happy", text: "I'm learning new tricks: photo to recipe, and orders with deposits. Want to be first to try them?" } };
  var mascot = $("mascot"), sayEl = $("say"), lastMood = "happy";
  function speak() {
    if (state.tab === "talk") return;
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
    var p = state.price, r = C.priceCalc(p);
    var rows = ["rSell", "rIng", "rPack", "rTime", "rOvh", "rCost", "rProfit", "rDozen", "rBatch"];
    var nowOut = $("nowOut");
    nowOut.className = "msg"; nowOut.textContent = "";
    function blank(msg) {
      setText("pPrice", "–"); setText("pSub", msg);
      rows.forEach(function (id) { setText(id, "–"); });
      speech.price = { mood: "flat", text: msg };
    }
    if (r.error === "pcs") return blank("Tell me how many pieces your recipe makes.");
    if (r.error === "margin") return blank("Pick a margin between 0 and 94%.");
    var sell = r.sell, cost = r.cost, price = r.price, margin = r.margin;
    setText("pPrice", money(price));
    setText("pSub", "Exact " + money(r.exact) + " at a " + pct(margin) + " margin, rounded up to 0.05");
    setText("rSell", sell + " of " + r.pcs);
    setText("rIng", money(r.cIng)); setText("rPack", money(r.pack)); setText("rTime", money(r.cTime)); setText("rOvh", money(r.cOvh));
    setText("rCost", money(cost)); setText("rProfit", money(r.profit));
    setText("rDozen", money(r.dozen)); setText("rBatch", money(r.batch));

    var chk = C.nowCheck(r, p.now);
    if (chk) {
      var now = chk.now, m = chk.m, perBatch = chk.perBatch;
      if (chk.status === "bad") {
        nowOut.className = "msg bad";
        nowOut.textContent = "You lose " + money(cost - now) + " on every piece, " + money(-perBatch) + " per batch.";
        speech.price = { mood: "sad", text: "Careful: at " + money(now) + " each piece costs you more than you charge. Your true cost is " + money(cost) + "." };
      } else if (chk.status === "warn") {
        nowOut.className = "msg warn";
        nowOut.textContent = "Margin " + pct(m) + ". Profit " + money(perBatch) + " per batch. At " + money(price) + " it would be " + money(r.batch) + ".";
        speech.price = { mood: "flat", text: "At " + money(now) + " you keep " + pct(m) + ". Going to " + money(price) + " gets you to your " + pct(margin) + " target." };
      } else {
        nowOut.className = "msg ok";
        nowOut.textContent = "Margin " + pct(m) + ". Profit " + money(perBatch) + " per batch.";
        speech.price = { mood: "happy", text: "Nice! At " + money(now) + " you keep " + pct(m) + ", right where you want to be." };
      }
    } else if (r.rate === 0) {
      speech.price = { mood: "flat", text: "Your hourly rate is 0, so you'd bake for free. Add a rate and I'll price your time in." };
    } else {
      speech.price = { mood: "happy", text: "Charge at least " + money(price) + " a piece. That covers ingredients, packaging, " + fmt(r.mins) + " min of your time and a " + pct(margin) + " margin." };
    }
  }
  function fillPrice() { Object.keys(P).forEach(function (k) { $(P[k]).value = state.price[k]; }); }
  Object.keys(P).forEach(function (k) {
    $(P[k]).addEventListener("input", function (e) { state.price[k] = e.target.value; calcPrice(); speak(); save(); });
  });

  // ---------- Recipe cost ----------
  function recipeTotal(rec) { return C.recipeTotal(rec || state.recipe); }
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
    var li = C.lineInfo(it);
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
      var tot = recipeTotal(rec).total;
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
    var rec = state.recipe, sc = C.scaleRecipe(rec, state.scaleTo);
    $("sName").textContent = (rec.name ? rec.name : "Your recipe") + " from the Recipe tab.";
    var ul = $("scaled"); ul.innerHTML = "";
    if (!sc.ok) {
      $("sFactor").textContent = "";
      $("sCost").textContent = "–";
      speech.scale = { mood: "flat", text: "Tell me how many your recipe makes and how many you need." };
      return;
    }
    var f = sc.f, batches = sc.batches, makes = sc.makes, to = sc.to;
    $("sFactor").textContent = "Multiply everything by " + fmt(f) + ". Or bake " + batches + " whole batch" + (batches === 1 ? "" : "es") + " = " + fmt(batches * makes) + " pieces.";
    sc.lines.forEach(function (ln) {
      var li = document.createElement("li");
      var a = document.createElement("span"); a.textContent = ln.name;
      var b = document.createElement("span"); b.textContent = ln.text;
      li.appendChild(a); li.appendChild(b); ul.appendChild(li);
    });
    if (!sc.lines.length) { var li = document.createElement("li"); li.textContent = "Add ingredients on the Recipe tab."; ul.appendChild(li); }
    $("sCost").textContent = money(sc.cost);
    speech.scale = { mood: "happy", text: "Need " + fmt(to) + " instead of " + fmt(makes) + "? Multiply by " + fmt(f) + ". I turned cups and spoons into grams too." };
  }
  $("sMakes").addEventListener("input", function (e) { state.recipe.makes = e.target.value; $("rMakes").value = e.target.value; updateRecipe(); calcScale(); speak(); save(); });
  $("sTo").addEventListener("input", function (e) { state.scaleTo = e.target.value; calcScale(); speak(); save(); });

  // ---------- Tabs ----------
  var talk = null;
  function show(tab) {
    var was = state.tab;
    state.tab = tab;
    document.body.setAttribute("data-tab", tab);
    tabs.forEach(function (t) {
      $("tab-" + t).hidden = t !== tab;
      $("t-" + t).setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    if (tab === "scale") { $("sMakes").value = state.recipe.makes || ""; $("sTo").value = state.scaleTo; calcScale(); }
    if (tab === "recipe") updateRecipe();
    if (tab === "price") calcPrice();
    if (talk) { if (tab === "talk") talk.onShow(); else if (was === "talk" || was == null) talk.onHide(); }
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

  // ---------- Talk to Bento (agent.js) ----------
  // The helper reads the same state and math as the tabs; its buttons copy values into the tabs.
  if (window.BentoTalk) {
    talk = window.BentoTalk.mount({
      core: C,
      getState: function () { return state; },
      openPrice: function (values) {
        Object.keys(values || {}).forEach(function (k) { if (k in P) state.price[k] = String(values[k]); });
        fillPrice(); calcPrice(); show("price"); save();
      },
      openRecipe: function () { show("recipe"); },
      openScale: function (to) { if (to != null) state.scaleTo = String(to); show("scale"); save(); },
      openPro: function () { show("pro"); }
    });
  }

  // ---------- Start ----------
  fillPrice(); calcPrice(); fillRecipe(); calcScale();
  show(state.tab);
  window.BentoTest = { state: state, lineInfo: C.lineInfo, recipeTotal: recipeTotal, findDensity: C.findDensity, FORM: FORM, talk: talk };
})();
