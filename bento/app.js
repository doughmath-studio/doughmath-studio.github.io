(function () {
  "use strict";

  // The math lives in core.js (pure functions), shared with the talking helper in agent.js.
  // Every text comes from i18n.js in the app's language; numbers are the same in every language.
  var C = window.BentoCore, I = window.BentoI18n;
  var KEY = "bento.v1", LANG_KEY = "bento.lang";
  var UNITS = C.UNITS, DENS = C.DENS;
  var FORM = "https://docs.google.com/forms/d/e/1FAIpQLSdGNhBHjq77XRkeylev6x1t_Ee0TYMZSW57gnel0fp2LGDk5w/viewform";

  function $(id) { return document.getElementById(id); }
  var fmt = function (x) { return C.fmt(x, lang); }, pct = function (x) { return C.pct(x, lang); }, num = function (x) { return C.num(x, lang); }, item = C.item;
  function money(v) { return C.money(v, state.cur, lang); }
  function t(key, vars, n) { return I.t(lang, key, vars, n); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---------- language: ?lang=xx, then the saved choice, then the browser's languages, else English ----------
  function readSaved() { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } }
  function keepLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* storage unavailable: still works */ } }
  var urlLang = (function () { var m = /[?&]lang=([a-zA-Z]{2})(?:[&#]|$)/.exec(location.search || ""); var l = m && m[1].toLowerCase(); return I.has(l) ? l : null; })();
  var lang = urlLang || (I.has(readSaved()) ? readSaved() : null) || I.detect(navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]);
  if (urlLang) keepLang(urlLang);
  C.setLang(lang);

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
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state, function (k, v) { return k === "lang" ? undefined : v; })); } catch (e) { /* storage unavailable: app still works */ } }

  var tabs = ["talk", "price", "recipe", "scale", "pro"];
  var stored = load() || {};
  var state = {
    cur: stored.cur || defaults.cur,
    // The Talk tab opens on the first visit (also the first visit after this update); after that Bento remembers the last tab.
    tab: stored.talkSeen && tabs.indexOf(stored.tab) >= 0 ? stored.tab : defaults.tab,
    price: Object.assign({}, defaults.price, stored.price || {}),
    recipe: stored.recipe && Array.isArray(stored.recipe.items) ? stored.recipe : C.sampleRecipe(lang),
    saved: Array.isArray(stored.saved) ? stored.saved : [],
    scaleTo: stored.scaleTo != null ? stored.scaleTo : defaults.scaleTo,
    installDismissed: !!stored.installDismissed,
    talkSeen: true,
    lang: lang
  };

  // ---------- texts in the page (data-i18n="key", data-i18n-aria, data-i18n-ph) ----------
  function applyStatic() {
    document.documentElement.lang = I.META[lang].html;
    function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
    each("[data-i18n]", function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    each("[data-i18n-aria]", function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    each("[data-i18n-ph]", function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    $("lang").value = lang;
    $("langShort").textContent = I.META[lang].short;
    var dl = $("ingList");
    dl.innerHTML = "";
    DENS.forEach(function (d) { var o = document.createElement("option"); o.value = C.ingName(d, lang); dl.appendChild(o); });
  }

  // ---------- Bento speaks ----------
  var speech = { price: null, recipe: null, scale: null, pro: null };
  var mascot = $("mascot"), sayEl = $("say"), lastMood = "happy";
  function speak() {
    if (state.tab === "talk") return;
    speech.pro = { mood: "happy", text: t("say.pro") };
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
  function setText(id, x) { $(id).textContent = x; }
  function calcPrice() {
    var p = state.price, r = C.priceCalc(p, lang);
    var rows = ["rSell", "rIng", "rPack", "rTime", "rOvh", "rCost", "rProfit", "rDozen", "rBatch"];
    var nowOut = $("nowOut");
    nowOut.className = "msg"; nowOut.textContent = "";
    function blank(msg) {
      setText("pPrice", "–"); setText("pSub", msg);
      rows.forEach(function (id) { setText(id, "–"); });
      speech.price = { mood: "flat", text: msg };
    }
    if (r.error === "pcs") return blank(t("price.errPcs"));
    if (r.error === "margin") return blank(t("price.errMargin"));
    var sell = r.sell, cost = r.cost, price = r.price, margin = r.margin;
    setText("pPrice", money(price));
    setText("pSub", t("price.sub", { exact: money(r.exact), margin: pct(margin), step: fmt(0.05) }));
    setText("rSell", t("price.sellOf", { sell: sell, pcs: r.pcs }));
    setText("rIng", money(r.cIng)); setText("rPack", money(r.pack)); setText("rTime", money(r.cTime)); setText("rOvh", money(r.cOvh));
    setText("rCost", money(cost)); setText("rProfit", money(r.profit));
    setText("rDozen", money(r.dozen)); setText("rBatch", money(r.batch));

    var chk = C.nowCheck(r, p.now, lang);
    if (chk) {
      var now = chk.now, m = chk.m, perBatch = chk.perBatch;
      if (chk.status === "bad") {
        nowOut.className = "msg bad";
        nowOut.textContent = t("now.bad", { loss: money(cost - now), batch: money(-perBatch) });
        speech.price = { mood: "sad", text: t("say.bad", { now: money(now), cost: money(cost) }) };
      } else if (chk.status === "warn") {
        nowOut.className = "msg warn";
        nowOut.textContent = t("now.warn", { m: pct(m), batch: money(perBatch), price: money(price), target: money(r.batch) });
        speech.price = { mood: "flat", text: t("say.warn", { now: money(now), m: pct(m), price: money(price), margin: pct(margin) }) };
      } else {
        nowOut.className = "msg ok";
        nowOut.textContent = t("now.ok", { m: pct(m), batch: money(perBatch) });
        speech.price = { mood: "happy", text: t("say.ok", { now: money(now), m: pct(m) }) };
      }
    } else if (r.rate === 0) {
      speech.price = { mood: "flat", text: t("say.rate0") };
    } else {
      speech.price = { mood: "happy", text: t("say.price", { price: money(price), mins: fmt(r.mins), margin: pct(margin) }) };
    }
  }
  function fillPrice() { Object.keys(P).forEach(function (k) { $(P[k]).value = C.inputStr(state.price[k], lang); }); }
  Object.keys(P).forEach(function (k) {
    $(P[k]).addEventListener("input", function (e) { state.price[k] = e.target.value; calcPrice(); speak(); save(); });
  });

  // ---------- Recipe cost ----------
  function recipeTotal(rec) { return C.recipeTotal(rec || state.recipe, lang); }
  function unitOptions(sel) {
    var lbl = I.D[lang].unitOpt;
    return UNITS.map(function (u) { return '<option value="' + u + '"' + (u === sel ? " selected" : "") + ">" + (lbl[u] || u) + "</option>"; }).join("");
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function renderItems() {
    var box = $("items");
    box.innerHTML = "";
    state.recipe.items.forEach(function (it, i) {
      var el = document.createElement("div");
      el.className = "ing";
      el.innerHTML =
        '<div class="ing-top"><input class="nm" list="ingList" placeholder="' + esc(t("ing.placeholder")) + '" aria-label="' + esc(t("ing.aria", { i: i + 1 })) + '" autocomplete="off">' +
        '<button class="icon-btn rm" type="button" aria-label="' + esc(t("ing.remove", { i: i + 1 })) + '">×</button></div>' +
        '<div class="ing-grid">' +
        '<div><label>' + esc(t("ing.amount")) + '</label><div class="pair"><input class="amt" inputmode="decimal" aria-label="' + esc(t("ing.amount")) + '" autocomplete="off"><select class="unit" aria-label="' + esc(t("ing.unit")) + '">' + unitOptions(it.unit) + "</select></div></div>" +
        '<div><label>' + esc(t("ing.size")) + '</label><div class="pair"><input class="size" inputmode="decimal" aria-label="' + esc(t("ing.size")) + '" autocomplete="off"><select class="punit" aria-label="' + esc(t("ing.punit")) + '">' + unitOptions(it.punit) + "</select></div></div>" +
        '<div><label>' + esc(t("ing.price")) + '</label><input class="pr" inputmode="decimal" aria-label="' + esc(t("ing.price")) + '" autocomplete="off"></div>' +
        '<div class="lc"><label>' + esc(t("ing.cost")) + '</label><b class="lcv">–</b></div>' +
        '</div><p class="note ln"></p>';
      el.querySelector(".nm").value = it.name;
      el.querySelector(".amt").value = C.inputStr(it.amt, lang);
      el.querySelector(".size").value = C.inputStr(it.size, lang);
      el.querySelector(".pr").value = C.inputStr(it.price, lang);
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
    var li = C.lineInfo(it, lang);
    el.querySelector(".lcv").textContent = li.cost == null ? "?" : money(li.cost);
    el.querySelector(".ln").textContent = li.note;
  }
  function updateRecipe() {
    var r = recipeTotal(), makes = Math.floor(num(state.recipe.makes));
    $("rTotal").textContent = money(r.total);
    $("rPer").textContent = makes > 0 ? t("recipe.per", { per: money(r.total / makes), pieces: t("n.pieces", { n: makes }, makes) }) : t("recipe.needMakes");
    $("rWarn").textContent = r.bad ? t("recipe.warn", { n: r.bad }) : "";
    speech.recipe = r.total > 0 && makes > 0
      ? { mood: r.bad ? "flat" : "happy", text: state.recipe.name ? t("say.recipeNamed", { name: state.recipe.name, total: money(r.total), per: money(r.total / makes) }) : t("say.recipe", { total: money(r.total), per: money(r.total / makes) }) }
      : { mood: "happy", text: t("say.recipeHint") };
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
    state.price.ing = C.inputStr(r.total.toFixed(2), lang);
    if (num(state.recipe.makes) > 0) state.price.pcs = String(Math.floor(num(state.recipe.makes)));
    fillPrice(); calcPrice(); show("price"); save();
  });
  $("fromRecipe").addEventListener("click", function () { $("toPrice").click(); });
  $("saveRecipe").addEventListener("click", function () {
    var rec = JSON.parse(JSON.stringify(state.recipe));
    if (!String(rec.name || "").trim()) rec.name = t("recipe.defaultName");
    state.recipe.name = rec.name; $("rName").value = rec.name;
    if (!rec.id) { rec.id = uid(); state.recipe.id = rec.id; }
    var idx = -1;
    state.saved.forEach(function (s, i) { if (s.id === rec.id) idx = i; });
    if (idx >= 0) state.saved[idx] = rec; else state.saved.unshift(rec);
    save(); renderSaved();
    speech.recipe = { mood: "happy", text: t("say.saved", { name: rec.name }) };
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
      var b = document.createElement("b"); b.textContent = rec.name || t("saved.fallback");
      var tot = recipeTotal(rec).total;
      var sm = document.createElement("small"); sm.textContent = t("saved.meta", { n: rec.makes || "?", cost: money(tot) });
      meta.appendChild(b); meta.appendChild(sm);
      var open = document.createElement("button"); open.type = "button"; open.className = "btn ghost small"; open.textContent = t("saved.open");
      open.addEventListener("click", function () {
        state.recipe = JSON.parse(JSON.stringify(rec)); fillRecipe(); save(); window.scrollTo(0, 0);
      });
      var del = document.createElement("button"); del.type = "button"; del.className = "icon-btn"; del.textContent = "×";
      del.setAttribute("aria-label", t("saved.delete", { name: rec.name || t("saved.deleteFallback") }));
      del.addEventListener("click", function () {
        if (!window.confirm(t("saved.confirm", { name: rec.name || t("saved.confirmFallback") }))) return;
        state.saved = state.saved.filter(function (s) { return s.id !== rec.id; });
        if (state.recipe.id === rec.id) state.recipe.id = null;
        save(); renderSaved();
      });
      li.appendChild(meta); li.appendChild(open); li.appendChild(del);
      ul.appendChild(li);
    });
  }

  // ---------- Scale ----------
  function calcScale() {
    var rec = state.recipe, sc = C.scaleRecipe(rec, state.scaleTo, lang);
    $("sName").textContent = t("scale.from", { name: rec.name ? rec.name : t("scale.yourRecipe") });
    var ul = $("scaled"); ul.innerHTML = "";
    if (!sc.ok) {
      $("sFactor").textContent = "";
      $("sCost").textContent = "–";
      speech.scale = { mood: "flat", text: t("say.scaleNeed") };
      return;
    }
    var f = sc.f, batches = sc.batches, makes = sc.makes, to = sc.to, whole = batches * makes;
    $("sFactor").textContent = t("scale.factor", { f: fmt(f), batches: t("n.wholeBatches", { n: batches }), pieces: t("n.pieces", { n: fmt(whole) }, Number(C.fmtEn(whole))) });
    sc.lines.forEach(function (ln) {
      var li = document.createElement("li");
      var a = document.createElement("span"); a.textContent = ln.name;
      var b = document.createElement("span"); b.textContent = ln.text;
      li.appendChild(a); li.appendChild(b); ul.appendChild(li);
    });
    if (!sc.lines.length) { var li = document.createElement("li"); li.textContent = t("scale.addIng"); ul.appendChild(li); }
    $("sCost").textContent = money(sc.cost);
    speech.scale = { mood: "happy", text: t("say.scale", { to: fmt(to), makes: fmt(makes), f: fmt(f) }) };
  }
  $("sMakes").addEventListener("input", function (e) { state.recipe.makes = e.target.value; $("rMakes").value = e.target.value; updateRecipe(); calcScale(); speak(); save(); });
  $("sTo").addEventListener("input", function (e) { state.scaleTo = e.target.value; calcScale(); speak(); save(); });

  // ---------- Tabs ----------
  var talk = null;
  function show(tab) {
    var was = state.tab;
    state.tab = tab;
    document.body.setAttribute("data-tab", tab);
    tabs.forEach(function (x) {
      $("tab-" + x).hidden = x !== tab;
      $("t-" + x).setAttribute("aria-selected", x === tab ? "true" : "false");
    });
    if (tab === "scale") { $("sMakes").value = state.recipe.makes || ""; $("sTo").value = C.inputStr(state.scaleTo, lang); calcScale(); }
    if (tab === "recipe") updateRecipe();
    if (tab === "price") calcPrice();
    if (talk) { if (tab === "talk") talk.onShow(); else if (was === "talk" || was == null) talk.onHide(); }
    speak(); save();
    window.scrollTo(0, 0);
  }
  tabs.forEach(function (x) { $("t-" + x).addEventListener("click", function () { show(x); }); });

  // ---------- Currency ----------
  $("cur").value = state.cur;
  $("cur").addEventListener("change", function (e) {
    state.cur = e.target.value; save();
    calcPrice(); renderItems(); updateRecipe(); renderSaved(); calcScale(); speak();
  });

  // ---------- Language ----------
  // A number typed in one language keeps its value in the next ("1.500" typed in German stays 1500 in English).
  function keepValue(v, from, to) {
    var s = String(v == null ? "" : v);
    if (!s.trim()) return v;
    var a = C.num(s, from);
    return a === C.num(s, to) ? v : C.inputStr(String(a), to);
  }
  function setLanguage(l) {
    if (!I.has(l)) return;
    keepLang(l);
    if (l === lang) return;
    var from = lang;
    Object.keys(state.price).forEach(function (k) { state.price[k] = keepValue(state.price[k], from, l); });
    state.scaleTo = keepValue(state.scaleTo, from, l);
    var sample = C.isSample(state.recipe);
    if (sample) { var id = state.recipe.id; state.recipe = C.sampleRecipe(l); state.recipe.id = id; }
    else {
      state.recipe.makes = keepValue(state.recipe.makes, from, l);
      state.recipe.items.forEach(function (it) { ["amt", "size", "price"].forEach(function (k) { it[k] = keepValue(it[k], from, l); }); });
    }
    lang = l; state.lang = l; C.setLang(l);
    applyStatic();
    if (!$("install").hidden && installKind) showInstall(installKind);
    fillPrice(); calcPrice(); fillRecipe(); calcScale();
    if (state.tab === "scale") { $("sMakes").value = state.recipe.makes || ""; $("sTo").value = C.inputStr(state.scaleTo, lang); }
    if (talk) talk.relang();
    lastMood = null; speak(); save();
  }
  $("lang").addEventListener("change", function (e) { setLanguage(e.target.value); });

  // ---------- Install hint ----------
  var deferredPrompt = null, installKind = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  function showInstall(kind) {
    if (state.installDismissed || standalone) return;
    installKind = kind;
    $("installText").textContent = t(kind === "ios" ? "install.ios" : "install.other");
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

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  // ---------- Start ----------
  applyStatic();
  if (isIOS) showInstall("ios");

  // ---------- Talk to Bento (agent.js) ----------
  // The helper reads the same state and math as the tabs; its buttons copy values into the tabs.
  if (window.BentoTalk) {
    talk = window.BentoTalk.mount({
      core: C,
      getState: function () { return state; },
      openPrice: function (values) {
        Object.keys(values || {}).forEach(function (k) { if (k in P) state.price[k] = C.inputStr(String(values[k]), lang); });
        fillPrice(); calcPrice(); show("price"); save();
      },
      openRecipe: function () { show("recipe"); },
      openScale: function (to) { if (to != null) state.scaleTo = C.inputStr(String(to), lang); show("scale"); save(); },
      openPro: function () { show("pro"); }
    });
  }

  fillPrice(); calcPrice(); fillRecipe(); calcScale();
  show(state.tab);
  window.BentoTest = { state: state, lineInfo: C.lineInfo, recipeTotal: recipeTotal, findDensity: C.findDensity, FORM: FORM, talk: talk,
    setLanguage: setLanguage, lang: function () { return lang; } };
})();
