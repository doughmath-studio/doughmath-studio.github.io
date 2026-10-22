/* DoughMath Studio · QR table menu builder
 * Everything runs in this browser. No uploads, no cookies, no third-party requests.
 * Draft: localStorage "dm.qrmenu.draft.v1" (this browser only). Reads Bento's "bento.v1" only when you press "Import from Bento".
 */
(function () {
  "use strict";

  // The paid Google Sheets template lives in the Etsy shop. CEO: swap in the exact listing URL here (one place only).
  var TEMPLATE_URL = "https://www.etsy.com/listing/4600023124";

  var D = window.DMMenu;
  var DRAFT_KEY = "dm.qrmenu.draft.v1";
  var BENTO_KEY = "bento.v1";
  var LONG_LINK = 1400;       // above this the QR gets dense (warning)
  var MAX_SECTIONS = 60, MAX_ITEMS = 600, MAX_TABLES = 200;
  var DEFAULT_TIPS_TEXT = "10, 15, 20";
  var SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif';
  var SANS_PS = "Arial, Helvetica, sans-serif";
  var PT = 25.4 / 72; // mm per point

  var ALLERGENS = ["Gluten", "Crustaceans", "Eggs", "Fish", "Peanuts", "Soy", "Milk", "Nuts", "Celery", "Mustard", "Sesame", "Sulphites", "Lupin", "Molluscs"];
  var ALLERGEN_FULL = ["Cereals containing gluten", "Crustaceans", "Eggs", "Fish", "Peanuts", "Soybeans", "Milk", "Tree nuts", "Celery", "Mustard", "Sesame", "Sulphites", "Lupin", "Molluscs"];
  var TAG_LABELS = { V: "Vegetarian", VG: "Vegan", GF: "Gluten-free", spicy: "Spicy" };
  var CURS = [["PLN", "zł · PLN"], ["EUR", "€ · EUR"], ["USD", "$ · USD"], ["GBP", "£ · GBP"], ["UAH", "₴ · UAH"], ["CZK", "Kč · CZK"], ["HUF", "Ft · HUF"], ["CHF", "CHF"], ["CAD", "C$ · CAD"], ["AUD", "A$ · AUD"], ["BRL", "R$ · BRL"], ["SEK", "SEK"], ["NOK", "NOK"], ["DKK", "DKK"], ["RON", "lei · RON"], ["TRY", "₺ · TRY"], ["JPY", "¥ · JPY"], ["INR", "₹ · INR"], ["__other", "Other…"]];
  var THEME_NAMES = { amber: "Amber", espresso: "Espresso", pistachio: "Pistachio", berry: "Berry", mono: "Mono" };
  var THEME_NOTES = { amber: "Light grey, navy, amber", espresso: "Dark brown, cream", pistachio: "Sage, cream", berry: "Pink, plum", mono: "Black, white" };

  var EXAMPLE = {"v":1,"n":"Maple Street Café (example)","c":"EUR","l":"en","t":"espresso","f":"Example menu. Wi-Fi: maplestreet · password: coffee2026","s":[{"t":"Coffee","i":[{"n":"Espresso","p":2.4},{"n":"Flat white","p":3.8,"d":"Double shot, steamed milk.","a":[7],"g":["V"]},{"n":"Oat cappuccino","p":4.2,"d":"Barista oat drink, microfoam.","a":[1],"g":["VG"]},{"n":"Iced latte","p":4.5,"d":"Espresso over ice, cold milk.","a":[7],"g":["V"]},{"n":"Hot chocolate","p":4,"d":"Dark chocolate, whole milk, no cream.","a":[6,7],"g":["V"]}]},{"t":"Breakfast","i":[{"n":"Avocado toast","p":8.9,"d":"Sourdough, smashed avocado, chilli flakes, lemon, sesame.","a":[1,11],"g":["VG","spicy"]},{"n":"Scrambled eggs on rye","p":7.5,"d":"Three eggs, chives, rye bread, butter.","a":[1,3,7],"g":["V"]},{"n":"Granola bowl","p":6.9,"d":"Oat granola, yoghurt, seasonal fruit, honey.","a":[1,7,8],"g":["V"]},{"n":"Smoked salmon bagel","p":9.8,"d":"Cream cheese, capers, red onion, dill.","a":[1,3,4,7,11]}]},{"t":"From the bakery","i":[{"n":"Butter croissant","p":3.2,"d":"Baked every morning.","a":[1,3,7],"g":["V"]},{"n":"Cinnamon roll","p":3.9,"d":"Brown sugar glaze, soft dough.","a":[1,3,7],"g":["V"]},{"n":"Almond financier","p":3.4,"d":"Gluten-free almond cake with browned butter.","a":[3,7,8],"g":["V","GF"]},{"n":"Lemon tart","p":4.6,"d":"Sweet pastry, lemon curd.","a":[1,3,7],"g":["V"],"x":1},{"n":"Sourdough loaf","p":5.5,"d":"Whole loaf to take home. Ask for it sliced.","a":[1],"g":["VG"]}]},{"t":"Lunch and cold drinks","i":[{"n":"Tomato soup","p":6.5,"d":"Roasted tomatoes, basil, olive oil. Served with bread.","a":[1,9],"g":["VG"]},{"n":"Chicken pesto sandwich","p":8.9,"d":"Ciabatta, grilled chicken, basil pesto, rocket.","a":[1,7,8]},{"n":"Fresh lemonade","p":3.9,"d":"Lemon, mint, sparkling water.","g":["VG","GF"]},{"n":"Still or sparkling water","p":2.5}]}]};

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  var SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function slug(t) { t = String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); return t.slice(0, 40) || "menu"; }
  function num(n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toString(); }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function download(blob, name) {
    var url = URL.createObjectURL(blob), a = h("a", { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function debounce(fn, ms) { var t; var f = function () { clearTimeout(t); t = setTimeout(fn, ms); }; f.cancel = function () { clearTimeout(t); }; return f; }
  var mctx = document.createElement("canvas").getContext("2d");
  // width in mm of text set at pt points
  function textW(text, weight, pt, family) { mctx.font = weight + " 100px " + family; return mctx.measureText(text).width / 100 * pt * PT; }
  function lineMm(pt) { return pt * PT * 1.15; }

  // ---------- state ----------
  function newItem() { return { n: "", p: "", d: "", a: [], g: [], x: false, open: false }; }
  function newSection() { return { t: "", i: [newItem()] }; }
  function guessCur() {
    var l = (navigator.language || "en-US").toLowerCase();
    if (l.indexOf("pl") === 0) return "PLN";
    if (l === "en-gb") return "GBP";
    if (l === "en-ca" || l === "fr-ca") return "CAD";
    if (l === "en-au") return "AUD";
    if (l.indexOf("uk") === 0) return "UAH";
    if (l === "en-ie" || /^(de|fr|es|it|nl|pt|fi|el|sk|sl|et|lv|lt|mt|hr)\b/.test(l)) return "EUR";
    return "USD";
  }
  function guessLang() { var l = (navigator.language || "en").toLowerCase().slice(0, 2); return D.LANGS.indexOf(l) >= 0 ? l : "en"; }
  function blankState() {
    return {
      menu: { n: "", c: guessCur(), l: guessLang(), t: "amber", f: "", s: [newSection()] },
      out: { mode: "link", ec: "M", live: "", tab: "", bt: "" },
      pay: { on: false, tips: DEFAULT_TIPS_TEXT, terminal: true, link: "", blik: "", note: "", review: "", whatsapp: "", email: "" },
      print: { layout: "tent", numbers: false, count: 10, line: "", nfc: false, head: false, style: "light", acc: "", accOn: true, logo: false },
      shop: { size: "s6" }
    };
  }
  var st = blankState();

  function fromSchema(raw) {
    var m = D.normalize(raw);
    return {
      n: m.n, c: m.c || "EUR", l: m.l, t: m.t, f: m.f,
      s: m.s.map(function (sec) {
        return {
          t: sec.t, i: sec.i.map(function (it) {
            return { n: it.n, p: it.p === undefined ? "" : String(it.p), d: it.d || "", a: (it.a || []).slice(), g: (it.g || []).slice(), x: !!it.x, open: false };
          })
        };
      })
    };
  }
  // editing state -> schema JSON (empty items and sections dropped, empty fields omitted)
  // forFile: the Export JSON keeps a switched-off payment setup too (so nothing typed is lost); links and previews carry it only when it works
  function toSchema(forFile) {
    var m = st.menu, out = { v: 1, n: m.n.trim(), c: (m.c || "").trim(), l: m.l, t: m.t };
    var f = m.f.trim(); if (f) out.f = f;
    var pc = payConfig(forFile); if (pc) out.p = pc;
    out.s = [];
    m.s.forEach(function (sec) {
      var items = [];
      sec.i.forEach(function (it) {
        var name = it.n.trim(); if (!name) return;
        var o = { n: name };
        var p = D.parsePrice(it.p); if (p !== undefined) o.p = p;
        var d = it.d.trim(); if (d) o.d = d;
        if (it.a.length) o.a = it.a.slice().sort(function (x, y) { return x - y; });
        if (it.g.length) o.g = D.TAGS.filter(function (t) { return it.g.indexOf(t) >= 0; });
        if (it.x) o.x = 1;
        items.push(o);
      });
      if (items.length) out.s.push({ t: sec.t.trim(), i: items });
    });
    return out;
  }
  function countItems() { var n = 0; st.menu.s.forEach(function (sec) { n += sec.i.length; }); return n; }

  // ---------- payments: what the guest page gets (step 3) ----------
  // Checks use the guest page's own functions (DMMenu), so the builder and the page can never disagree about what is valid.
  function payCheck() {
    var P = st.pay, link = P.link.trim(), blik = P.blik.trim(), rv = P.review.trim(), wa = P.whatsapp.trim(), em = P.email.trim();
    var lk = link ? D.checkPayLink(link) : null, bk = blik ? D.checkBlik(blik) : null;
    return { tips: D.parseTips(P.tips), lk: lk, bk: bk, rv: rv ? D.checkPayLink(rv) : null, wa: wa ? D.checkBlik(wa) : null, em: em ? D.checkEmail(em) : null,
      any: !!(P.terminal || (lk && lk.ok) || (bk && bk.ok)) };
  }
  // The "p" object of the menu JSON. Normal use: only when switched on AND at least one way of paying is valid (otherwise null: the page stays as it is).
  function payConfig(forFile) {
    var P = st.pay, c = payCheck();
    if (forFile) { if (!(P.on || P.link.trim() || P.blik.trim() || P.note.trim() || P.review.trim() || P.whatsapp.trim() || P.email.trim())) return null; }
    else if (!(P.on && c.any)) return null;
    var out = { e: P.on ? 1 : 0 };
    if (c.tips.join(",") !== DEFAULT_TIPS_TEXT.replace(/ /g, "")) out.t = c.tips;
    if (P.terminal) out.x = 1;
    if (c.lk && c.lk.ok) out.l = c.lk.url;
    if (c.bk && c.bk.ok) out.b = c.bk.value;
    var n = P.note.trim().slice(0, 200); if (n) out.n = n;
    if (c.rv && c.rv.ok) out.r = c.rv.url;
    if (c.wa && c.wa.ok) out.w = c.wa.value;
    if (c.em && c.em.ok) out.m = c.em.value;
    return out;
  }
  // a menu file / link -> the editing state of step 3 (null when the file has no payment setup)
  function payFromSchema(raw) {
    var p = D.normalize(raw).p; if (!p) return null;
    return { on: p.e === 1, tips: (p.t || []).join(", "), terminal: p.x === 1, link: p.l || "", blik: p.b || "", note: p.n || "", review: p.r || "", whatsapp: p.w || "", email: p.m || "", bad: p.bad || [] };
  }

  // ---------- draft (this browser only) ----------
  var draftOk = true;
  function saveDraftNow() {
    try {
      var d = clone(st); localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      draftOk = true;
      $("draftState").textContent = "Draft saved in this browser.";
    } catch (e) { draftOk = false; $("draftState").textContent = "Your browser blocks storage, so the draft is not saved. Export JSON to keep your work."; }
  }
  var saveDraft = debounce(saveDraftNow, 400);
  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY); if (!raw) return;
      var d = JSON.parse(raw); if (!d || !d.menu) return;
      var b = blankState(), dm = d.menu;
      var head = D.normalize({ n: dm.n, c: dm.c, l: dm.l, t: dm.t, f: dm.f, s: [] });
      var secs = (Array.isArray(dm.s) ? dm.s : []).slice(0, MAX_SECTIONS).map(function (sec) {
        sec = sec || {};
        return { t: String(sec.t || "").slice(0, 120), i: (Array.isArray(sec.i) ? sec.i : []).slice(0, MAX_ITEMS).map(function (it) {
          it = it || {};
          return { n: String(it.n || "").slice(0, 160), p: String(it.p == null ? "" : it.p).slice(0, 40), d: String(it.d || "").slice(0, 600),
            a: (Array.isArray(it.a) ? it.a : []).filter(function (k) { return k >= 1 && k <= 14; }),
            g: (Array.isArray(it.g) ? it.g : []).filter(function (k) { return D.TAGS.indexOf(k) >= 0; }), x: !!it.x, open: false };
        }) };
      });
      secs.forEach(function (sec) { if (!sec.i.length) sec.i.push(newItem()); });
      b.menu = { n: head.n, c: head.c || b.menu.c, l: head.l, t: head.t, f: head.f, s: secs.length ? secs : [newSection()] };
      if (d.out) { b.out.mode = d.out.mode === "live" ? "live" : "link"; b.out.ec = ["L", "M", "Q", "H"].indexOf(d.out.ec) >= 0 ? d.out.ec : "M"; b.out.live = String(d.out.live || "").slice(0, 600); b.out.tab = String(d.out.tab || "").slice(0, 100); b.out.bt = String(d.out.bt || "").slice(0, 100); }
      if (d.pay && typeof d.pay === "object") {
        b.pay.on = d.pay.on === true; b.pay.terminal = d.pay.terminal !== false;
        b.pay.tips = d.pay.tips == null ? DEFAULT_TIPS_TEXT : String(d.pay.tips).slice(0, 40);
        b.pay.link = String(d.pay.link || "").slice(0, 400); b.pay.blik = String(d.pay.blik || "").slice(0, 40); b.pay.note = String(d.pay.note || "").slice(0, 200);
        b.pay.review = String(d.pay.review || "").slice(0, 400); b.pay.whatsapp = String(d.pay.whatsapp || "").slice(0, 40); b.pay.email = String(d.pay.email || "").slice(0, 100);
      }
      if (d.print) { b.print.layout = ["tent", "s6", "s5", "poster"].indexOf(d.print.layout) >= 0 ? d.print.layout : "tent"; b.print.numbers = !!d.print.numbers; b.print.count = Math.max(1, Math.min(MAX_TABLES, parseInt(d.print.count, 10) || 10)); b.print.line = String(d.print.line || "").slice(0, 80); b.print.nfc = d.print.nfc === true; b.print.head = d.print.head === true; b.print.style = d.print.style === "dark" ? "dark" : "light"; b.print.acc = String(d.print.acc || "").slice(0, 40); b.print.accOn = d.print.accOn !== false; b.print.logo = d.print.logo === true; }
      if (d.shop && PS[d.shop.size]) b.shop.size = d.shop.size;
      st = b;
    } catch (e) { /* ignore a broken draft */ }
  }
  function deleteDraft() {
    if (!window.confirm("Delete your draft from this browser and start over?")) return;
    saveDraft.cancel();
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    st = blankState();
    applyAll(true);
    $("draftState").textContent = "Draft deleted from this browser.";
    showMsg("Draft deleted. Nothing was ever stored anywhere else.", true);
  }

  // ---------- messages ----------
  function showMsg(text, ok) {
    var m = $("menuMsg"); m.textContent = text; m.hidden = !text; m.className = "note qb-msg" + (ok ? " ok" : "");
  }

  // ---------- step 1: cafe settings ----------
  function buildStep1() {
    var cur = $("cur");
    CURS.forEach(function (c) { cur.appendChild(h("option", { value: c[0] }, c[1])); });
    var lang = $("lang");
    D.LANGS.forEach(function (l) { lang.appendChild(h("option", { value: l }, D.T[l].name)); });
    var box = $("themes");
    D.THEMES.forEach(function (t) {
      var lab = h("label", { class: "qb-theme" });
      var inp = h("input", { type: "radio", name: "theme", value: t });
      var sw = h("span", { class: "sw sw-" + t }, THEME_NAMES[t]);
      sw.appendChild(h("small", null, THEME_NOTES[t]));
      sw.appendChild(h("i"));
      lab.appendChild(inp); lab.appendChild(sw); box.appendChild(lab);
      inp.addEventListener("change", function () { st.menu.t = t; changed(); });
    });
    $("cafeName").addEventListener("input", function (e) { st.menu.n = e.target.value; changed(); });
    $("footer").addEventListener("input", function (e) { st.menu.f = e.target.value; footerHint(); changed(); });
    $("lang").addEventListener("change", function (e) { st.menu.l = e.target.value; changed(); });
    $("cur").addEventListener("change", function (e) {
      if (e.target.value === "__other") { $("curOther").hidden = false; st.menu.c = $("curOther").value.trim(); $("curOther").focus(); }
      else { $("curOther").hidden = true; st.menu.c = e.target.value; }
      renderPayStep(); changed();   // the PayPal hint in step 3 depends on the currency
    });
    $("curOther").addEventListener("input", function (e) { st.menu.c = e.target.value.trim(); renderPayStep(); changed(); });
  }
  function footerHint() {
    var f = st.menu.f, bad = /\b(javascript|vbscript)\s*:|\bdata\s*:\s*(text|image|application)\//i.test(f);
    var hint = $("footerHint");
    hint.textContent = bad ? "This looks like a script link. The footer is plain text and is never made clickable, so it will just show as words." : "Plain text only. Links are not clickable.";
    hint.className = "hint" + (bad ? " qb-badhint" : "");
  }
  function applyStep1() {
    $("cafeName").value = st.menu.n;
    $("footer").value = st.menu.f;
    $("lang").value = st.menu.l;
    var known = CURS.some(function (c) { return c[0] === st.menu.c && c[0] !== "__other"; });
    $("cur").value = known ? st.menu.c : "__other";
    $("curOther").hidden = known; $("curOther").value = known ? "" : st.menu.c;
    Array.prototype.forEach.call(document.querySelectorAll('#themes input'), function (i) { i.checked = i.value === st.menu.t; });
    footerHint();
  }

  // ---------- step 2: sections and items ----------
  function itemSummary(it) {
    var parts = [];
    if (it.a.length) parts.push("allergens " + it.a.slice().sort(function (x, y) { return x - y; }).join(","));
    D.TAGS.forEach(function (t) { if (it.g.indexOf(t) >= 0) parts.push(t); });
    if (it.x) parts.push("sold out");
    if (it.d.trim()) parts.push("note");
    return parts.join(" · ");
  }
  function chipGroup(label, kind, list, it) {
    var wrap = h("div");
    wrap.appendChild(h("span", { class: "qb-chiplabel" }, label));
    var g = h("div", { class: "qb-chips", role: "group", "aria-label": label });
    list.forEach(function (c) {
      var on = (kind === "a" ? it.a.indexOf(c.v) : it.g.indexOf(c.v)) >= 0;
      var b = h("button", { type: "button", class: "qb-chip", "data-chip": kind, "data-v": String(c.v), "aria-pressed": on ? "true" : "false", title: c.title }, c.text);
      g.appendChild(b);
    });
    wrap.appendChild(g);
    return wrap;
  }
  function iconBtn(act, label, text, disabled, cls) {
    var b = h("button", { type: "button", class: "qb-ib" + (cls ? " " + cls : ""), "data-act": act, "aria-label": label, title: label }, text);
    if (disabled) b.disabled = true;
    return b;
  }
  var focusAfter = null;
  function renderEditor() {
    var box = $("sections"); box.textContent = "";
    st.menu.s.forEach(function (sec, si) {
      var secEl = h("section", { class: "qb-sec", "data-s": String(si), "aria-label": "Section " + (si + 1) });
      var head = h("div", { class: "qb-shead" });
      var ti = h("input", { type: "text", maxlength: "120", placeholder: "Section name, e.g. Coffee", "aria-label": "Section name", "data-f": "st", autocomplete: "off" });
      ti.value = sec.t;
      head.appendChild(ti);
      var bt = h("div", { class: "qb-ibtns" });
      bt.appendChild(iconBtn("s-up", "Move section up", "↑", si === 0));
      bt.appendChild(iconBtn("s-down", "Move section down", "↓", si === st.menu.s.length - 1));
      bt.appendChild(iconBtn("s-del", "Delete section", "×", false, "del"));
      head.appendChild(bt); secEl.appendChild(head);

      sec.i.forEach(function (it, ii) {
        var el = h("div", { class: "qb-item" + (it.x ? " is-sold" : ""), "data-i": String(ii) });
        var row = h("div", { class: "qb-irow" });
        var n = h("input", { type: "text", class: "f-n", maxlength: "160", placeholder: "Item name", "aria-label": "Item name", "data-f": "n", autocomplete: "off" }); n.value = it.n;
        var p = h("input", { type: "text", class: "f-p", maxlength: "40", inputmode: "decimal", placeholder: "Price", "aria-label": "Price", "data-f": "p", autocomplete: "off" }); p.value = it.p;
        row.appendChild(n); row.appendChild(p);
        var ib = h("div", { class: "qb-ibtns" });
        ib.appendChild(iconBtn("i-up", "Move item up", "↑", ii === 0));
        ib.appendChild(iconBtn("i-down", "Move item down", "↓", ii === sec.i.length - 1));
        ib.appendChild(iconBtn("i-del", "Delete item", "×", false, "del"));
        row.appendChild(ib);
        el.appendChild(row);

        var det = h("details", { class: "qb-more" });
        if (it.open) det.open = true;
        var sum = h("summary", null, "Details");
        sum.appendChild(h("span", { class: "qb-sum" }, itemSummary(it)));
        det.appendChild(sum);
        var ta = h("textarea", { rows: "2", maxlength: "600", placeholder: "Description (optional)", "aria-label": "Description", "data-f": "d" }); ta.value = it.d;
        det.appendChild(ta);
        det.appendChild(chipGroup("Allergens (EU list of 14)", "a", ALLERGENS.map(function (a, k) { return { v: k + 1, text: (k + 1) + " " + a, title: ALLERGEN_FULL[k] }; }), it));
        det.appendChild(chipGroup("Tags", "g", D.TAGS.map(function (t) { return { v: t, text: TAG_LABELS[t], title: TAG_LABELS[t] }; }), it));
        var lab = h("label", { class: "qb-check" });
        var cb = h("input", { type: "checkbox", "data-f": "x" }); cb.checked = it.x;
        lab.appendChild(cb); lab.appendChild(document.createTextNode(" Sold out today"));
        det.appendChild(lab);
        el.appendChild(det);
        secEl.appendChild(el);
      });
      var add = h("button", { type: "button", class: "btn secondary small", "data-act": "i-add" }, "+ Add item");
      secEl.appendChild(h("p")).appendChild(add);
      box.appendChild(secEl);
    });
    if (focusAfter) {
      var t = box.querySelector(focusAfter);
      if (t && t.disabled) t = t.parentNode.querySelector("button:not(:disabled)");   // moved to an end: focus the other arrow
      if (t) t.focus();
      focusAfter = null;
    }
  }
  function onEditorClick(e) {
    var chip = e.target.closest("[data-chip]");
    var secEl = e.target.closest(".qb-sec"); if (!secEl) return;
    var si = +secEl.dataset.s, sec = st.menu.s[si];
    var itemEl = e.target.closest(".qb-item"), ii = itemEl ? +itemEl.dataset.i : -1, it = ii >= 0 ? sec.i[ii] : null;
    if (chip && it) {
      var kind = chip.dataset.chip, v = kind === "a" ? parseInt(chip.dataset.v, 10) : chip.dataset.v, arr = kind === "a" ? it.a : it.g, k = arr.indexOf(v);
      if (k >= 0) arr.splice(k, 1); else arr.push(v);
      chip.setAttribute("aria-pressed", k >= 0 ? "false" : "true");
      itemEl.querySelector(".qb-sum").textContent = itemSummary(it);
      changed(); return;
    }
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.dataset.act;
    function swap(arr, i, j) { var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    if (act === "s-up" && si > 0) { swap(st.menu.s, si, si - 1); focusAfter = '.qb-sec[data-s="' + (si - 1) + '"] [data-act="s-up"]'; }
    else if (act === "s-down" && si < st.menu.s.length - 1) { swap(st.menu.s, si, si + 1); focusAfter = '.qb-sec[data-s="' + (si + 1) + '"] [data-act="s-down"]'; }
    else if (act === "s-del") {
      var cnt = sec.i.filter(function (x) { return x.n.trim(); }).length;
      if (cnt && !window.confirm("Delete this section and its " + cnt + " item" + (cnt === 1 ? "" : "s") + "?")) return;
      st.menu.s.splice(si, 1); if (!st.menu.s.length) st.menu.s.push(newSection());
    }
    else if (act === "i-up" && ii > 0) { swap(sec.i, ii, ii - 1); focusAfter = '.qb-sec[data-s="' + si + '"] .qb-item[data-i="' + (ii - 1) + '"] [data-act="i-up"]'; }
    else if (act === "i-down" && ii < sec.i.length - 1) { swap(sec.i, ii, ii + 1); focusAfter = '.qb-sec[data-s="' + si + '"] .qb-item[data-i="' + (ii + 1) + '"] [data-act="i-down"]'; }
    else if (act === "i-del") { sec.i.splice(ii, 1); if (!sec.i.length) sec.i.push(newItem()); }
    else if (act === "i-add") {
      if (countItems() >= MAX_ITEMS) { showMsg("A menu can have up to " + MAX_ITEMS + " items.", false); return; }
      sec.i.push(newItem()); focusAfter = '.qb-sec[data-s="' + si + '"] .qb-item[data-i="' + (sec.i.length - 1) + '"] .f-n';
    }
    else return;
    renderEditor(); changed();
  }
  function onEditorInput(e) {
    var f = e.target.dataset && e.target.dataset.f; if (!f) return;
    var secEl = e.target.closest(".qb-sec"); if (!secEl) return;
    var sec = st.menu.s[+secEl.dataset.s], itemEl = e.target.closest(".qb-item");
    if (f === "st") { sec.t = e.target.value; changed(); return; }
    if (!itemEl) return;
    var it = sec.i[+itemEl.dataset.i];
    if (f === "n") it.n = e.target.value;
    else if (f === "p") it.p = e.target.value;
    else if (f === "d") { it.d = e.target.value; itemEl.querySelector(".qb-sum").textContent = itemSummary(it); }
    else if (f === "x") { it.x = e.target.checked; itemEl.classList.toggle("is-sold", it.x); itemEl.querySelector(".qb-sum").textContent = itemSummary(it); }
    changed();
  }
  function onEditorToggle(e) {
    var det = e.target; if (!det.classList || !det.classList.contains("qb-more")) return;
    var secEl = det.closest(".qb-sec"), itemEl = det.closest(".qb-item"); if (!secEl || !itemEl) return;
    var it = st.menu.s[+secEl.dataset.s].i[+itemEl.dataset.i]; if (it) it.open = det.open;
  }

  // ---------- step 3: payments ----------
  var PAY_LINK_MSG = {
    http: "Use a link that starts with https:// (plain http:// links are not allowed).",
    scheme: "Only https:// links are allowed.",
    credentials: "Links with a user name or password in them are not allowed.",
    port: "Links with a port number are not allowed.",
    host: "That does not look like a web address. Use a link such as https://paypal.me/yourcafe",
    long: "Links can be at most 300 characters.",
    invalid: "That does not look like a link. Use one that starts with https://"
  };
  var PAY_BLIK_MSG = { chars: "Use only a + sign, digits and spaces.", digits: "A phone number has 9 to 15 digits." };
  var PAY_MAIL_MSG = "That does not look like an e-mail address. Use one address such as manager@yourcafe.com";
  function reviewMsg(reason) { return reason === "host" || reason === "invalid" ? "That does not look like a web address. Use the review link from your Google Business Profile, such as https://g.page/r/your-cafe/review" : PAY_LINK_MSG[reason] || PAY_LINK_MSG.invalid; }
  function setHint(id, text, cls) { var e = $(id); e.textContent = text; e.className = "hint" + (cls ? " " + cls : ""); }
  function applyPay() {
    var P = st.pay;
    $("payOn").checked = P.on; $("payTips").value = P.tips; $("payTerminal").checked = P.terminal;
    $("payLink").value = P.link; $("payBlik").value = P.blik; $("payNote").value = P.note; $("billsTab").value = st.out.bt;
    $("payReview").value = P.review; $("payWhatsapp").value = P.whatsapp; $("payEmail").value = P.email;
    renderPayStep();
  }
  function renderPayStep() {
    var P = st.pay, c = payCheck(), live = st.out.mode === "live";
    // live mode: the sheet decides, so the switch is gone and the box always shows what the sheet says
    $("payToggle").hidden = live; $("payBox").hidden = !live && !P.on; $("payLocal").hidden = live; $("payLive").hidden = !live;
    var toks = P.tips.split(/[,;\/\s]+/).filter(Boolean).map(function (t) { return t.replace(/%$/, ""); });
    var ignored = toks.filter(function (t) { return !(/^\d{1,2}$/.test(t) && c.tips.indexOf(parseInt(t, 10)) >= 0); });
    var shown = c.tips.length ? c.tips.join("%, ") + "%" : "none";
    if (ignored.length) setHint("payTipsHint", "Buttons: " + shown + ". Left out: " + ignored.join(", ") + ". Use up to 4 whole numbers from 1 to 50.", "qb-badhint");
    else setHint("payTipsHint", c.tips.length ? "Guests get buttons for " + shown + " and No tip, and can type their own tip." : "No percent buttons. Guests can still type their own tip.");
    if (!P.link.trim()) setHint("payLinkHint", "Guests tap it to pay on your own payment page. Only https:// links. Example: https://paypal.me/yourcafe");
    else if (c.lk.ok) {
      var extra = D.isPayPalName(c.lk.url)
        ? (D.paypalCode(st.menu.c) ? " The total is added to the link for them." : " Your currency is not one a PayPal link can name, so only the amount is added to the link.")
        : " Guests get a Copy amount button and are asked to enter the total there.";
      setHint("payLinkHint", "Guests will be sent to " + c.lk.host + "." + extra, "qb-okhint");
    } else setHint("payLinkHint", PAY_LINK_MSG[c.lk.reason] || PAY_LINK_MSG.invalid, "qb-badhint");
    if (!P.blik.trim()) setHint("payBlikHint", "The phone number guests send a BLIK phone transfer to. Only a + sign, digits and spaces.");
    else if (c.bk.ok) setHint("payBlikHint", "Guests will see " + c.bk.value + ", the amount, and the table as the transfer title.", "qb-okhint");
    else setHint("payBlikHint", PAY_BLIK_MSG[c.bk.reason] || PAY_BLIK_MSG.chars, "qb-badhint");
    if (!P.review.trim()) setHint("payReviewHint", "After paying, guests can tap a button that opens this page to describe their visit on Google. Only https:// links.");
    else if (c.rv.ok) setHint("payReviewHint", "Guests will be sent to " + c.rv.host + " to describe their visit.", "qb-okhint");
    else setHint("payReviewHint", reviewMsg(c.rv.reason), "qb-badhint");
    if (!P.whatsapp.trim()) setHint("payWhatsappHint", "Use the international format, for example +48 600 111 222. Guests get a “Message the manager” button that opens WhatsApp with their message ready.");
    else if (c.wa.ok) setHint("payWhatsappHint", "Guests can write to " + c.wa.value + " from their own WhatsApp.", "qb-okhint");
    else setHint("payWhatsappHint", PAY_BLIK_MSG[c.wa.reason] || PAY_BLIK_MSG.chars, "qb-badhint");
    if (!P.email.trim()) setHint("payEmailHint", "Guests get a “Message the manager” button that opens their e-mail app with their message ready.");
    else if (c.em.ok) setHint("payEmailHint", "Guests can write to " + c.em.value + " from their own e-mail app.", "qb-okhint");
    else setHint("payEmailHint", PAY_MAIL_MSG, "qb-badhint");
    var w = $("payWarn"), wt = "", bads = [];
    if (P.link.trim() && !c.lk.ok) bads.push("payment link");
    if (P.blik.trim() && !c.bk.ok) bads.push("BLIK number");
    if (P.review.trim() && !c.rv.ok) bads.push("Google review link");
    if (P.whatsapp.trim() && !c.wa.ok) bads.push("WhatsApp number");
    if (P.email.trim() && !c.em.ok) bads.push("e-mail address");
    if (P.on && !live) {
      if (!c.any) wt = "Nothing to pay with yet. Tick the card terminal box, or add a valid payment link or BLIK number. Until then guests see the menu only.";
      else if (bads.length) wt = "The " + bads.join(" and the ") + " above " + (bads.length > 1 ? "are" : "is") + " not valid, so guests will not see " + (bads.length > 1 ? "them" : "it") + ".";
    }
    w.hidden = !wt; w.textContent = wt;
    renderPayRead();
  }
  function readRow(dl, k, v, bad) { dl.appendChild(h("dt", null, k)); dl.appendChild(h("dd", bad ? { class: "bad" } : null, v)); }
  // Live mode: what the guest page read from the sheet's #pay block (the sheet is the source of truth)
  function renderPayRead() {
    var dl = $("payRead"), msg = $("payReadMsg"); dl.textContent = "";
    if (st.out.mode !== "live") { msg.textContent = ""; return; }
    var r = liveRes && liveShown.key && liveRes.key === liveShown.key ? liveRes : null;
    if (!liveWant) { msg.textContent = "Paste your Google Sheets link in step 4. This box then shows what your sheet says about payments."; return; }
    if (!r) { msg.textContent = "Reading your sheet…"; return; }
    if (!r.ok) { msg.textContent = "The sheet could not be read yet, so there is nothing to show. See step 4."; return; }
    var p = r.pay;
    if (!p) { msg.textContent = "Your sheet has no #pay block, so guests see the menu only. To switch on “Pay the bill”, add the #pay rows described under “Build your own sheet” in step 4."; return; }
    var bad = p.bad || [];
    msg.textContent = D.payActive({ p: p }) ? "Your sheet turns on “Pay the bill”. This is what guests get:"
      : p.e !== 1 ? "Your sheet has a #pay block, but enabled is not “yes”, so guests see the menu only."
        : "Your sheet has a #pay block, but nothing valid to pay with is in it, so guests see the menu only.";
    readRow(dl, "Enabled", p.e === 1 ? "yes" : "no");
    readRow(dl, "Tip buttons", p.t.length ? p.t.join("%, ") + "%" : "none");
    readRow(dl, "Card terminal", p.x === 1 ? "yes" : "no");
    var lk = p.l ? D.checkPayLink(p.l) : null;
    readRow(dl, "Payment link", lk && lk.ok ? p.l + " (guests go to " + lk.host + ")" : bad.indexOf("link") >= 0 ? "not valid, so guests do not see it" : "none", bad.indexOf("link") >= 0);
    readRow(dl, "BLIK phone", p.b ? p.b : bad.indexOf("blik") >= 0 ? "not valid, so guests do not see it" : "none", bad.indexOf("blik") >= 0);
    readRow(dl, "Note", p.n || "none");
    var rk = p.r ? D.checkPayLink(p.r) : null;
    readRow(dl, "Google review link", rk && rk.ok ? p.r + " (guests go to " + rk.host + ")" : bad.indexOf("review") >= 0 ? "not valid, so guests do not see it" : "none", bad.indexOf("review") >= 0);
    readRow(dl, "Manager WhatsApp", p.w ? p.w : bad.indexOf("whatsapp") >= 0 ? "not valid, so guests do not see it" : "none", bad.indexOf("whatsapp") >= 0);
    readRow(dl, "Manager e-mail", p.m ? p.m : bad.indexOf("email") >= 0 ? "not valid, so guests do not see it" : "none", bad.indexOf("email") >= 0);
  }

  // ---------- menu tools: example, Bento, JSON ----------
  function hasContent() { return st.menu.s.some(function (sec) { return sec.i.some(function (it) { return it.n.trim(); }); }); }
  function loadExample() {
    if (hasContent() && !window.confirm("Replace your current menu with the example?")) return;
    st.menu = fromSchema(EXAMPLE);
    applyAll();
    showMsg("Example loaded. It is only an example: replace it with your own cafe, prices and allergens.", true);
  }
  function importBento() {
    var raw;
    try { raw = localStorage.getItem(BENTO_KEY); } catch (e) { return showMsg("Your browser blocks storage, so Bento's recipes cannot be read.", false); }
    if (!raw) return showMsg("Nothing to import yet. Open Bento, save a recipe on the Recipe tab, then come back. (Bento must be opened in this same browser.)", false);
    var b; try { b = JSON.parse(raw); } catch (e) { return showMsg("Bento's data could not be read.", false); }
    var names = [];
    (Array.isArray(b && b.saved) ? b.saved : []).forEach(function (r) {
      var n = r && typeof r.name === "string" ? r.name.trim().slice(0, 160) : "";
      if (n && names.indexOf(n) < 0) names.push(n);
    });
    if (!names.length) return showMsg("Bento is there, but it has no saved recipes yet. Save a recipe on Bento's Recipe tab first.", false);
    var existing = {};
    st.menu.s.forEach(function (sec) { sec.i.forEach(function (it) { if (it.n.trim()) existing[it.n.trim().toLowerCase()] = 1; }); });
    var fresh = names.filter(function (n) { return !existing[n.toLowerCase()]; }), skipped = names.length - fresh.length;
    if (!fresh.length) return showMsg("All " + names.length + " Bento recipes are already in your menu.", true);
    if (countItems() + fresh.length > MAX_ITEMS) return showMsg("That would be more than " + MAX_ITEMS + " items.", false);
    var wasEmpty = !hasContent();
    var sec = { t: "Bakery", i: fresh.map(function (n) { var it = newItem(); it.n = n; return it; }) };
    if (wasEmpty) st.menu.s = [sec]; else st.menu.s.push(sec);
    if (wasEmpty && b && typeof b.cur === "string") { var code = D.currencyCode(b.cur); if (code) st.menu.c = code; }
    applyAll();
    showMsg("Added " + fresh.length + " recipe" + (fresh.length === 1 ? "" : "s") + " from Bento to a new section called “Bakery”" + (skipped ? " (" + skipped + " already in your menu were skipped)" : "") + ". Bento keeps ingredient costs, not selling prices, so the prices are blank: add them here.", true);
  }
  function exportJson() {
    var json = JSON.stringify(toSchema(true), null, 1);
    download(new Blob([json], { type: "application/json" }), "qr-menu-" + slug(st.menu.n) + ".json");
  }
  function importJsonFile(file) {
    if (!file) return;
    if (file.size > 1048576) return showMsg("That file is too big to be a menu.", false);
    var r = new FileReader();
    r.onload = function () {
      var obj; try { obj = JSON.parse(String(r.result)); } catch (e) { return showMsg("That file is not valid JSON.", false); }
      if (!obj || typeof obj !== "object" || Array.isArray(obj) || !Array.isArray(obj.s)) return showMsg("That file is not a menu file from this tool.", false);
      st.menu = fromSchema(obj);
      if (!st.menu.s.length) st.menu.s = [newSection()];
      var pp = payFromSchema(obj), dropped = "";
      if (pp) {
        st.pay = { on: pp.on, tips: pp.tips, terminal: pp.terminal, link: pp.link, blik: pp.blik, note: pp.note, review: pp.review, whatsapp: pp.whatsapp, email: pp.email };
        if (pp.bad.length) {
          var BAD_NAMES = { link: "payment link", blik: "BLIK number", review: "Google review link", whatsapp: "WhatsApp number", email: "e-mail address" };
          var nm = pp.bad.map(function (k) { return BAD_NAMES[k]; });
          dropped = " The " + (nm.length > 1 ? nm.slice(0, -1).join(", the ") + " and the " + nm[nm.length - 1] + " in that file were" : nm[0] + " in that file was") + " not valid and left out.";
        }
      }
      applyAll();
      var n = countItems();
      showMsg("Imported " + (hasContent() ? n : 0) + " items" + (pp ? " and the payment setup" : "") + "." + dropped, true);
    };
    r.onerror = function () { showMsg("The file could not be read.", false); };
    r.readAsText(file);
  }
  function clearMenu() {
    if (hasContent() && !window.confirm("Remove all sections and items?")) return;
    st.menu.s = [newSection()];
    applyAll(); showMsg("", false);
  }

  // ---------- QR ----------
  function makeQr(text, level) {
    var seq = ["H", "Q", "M", "L"];
    for (var i = Math.max(0, seq.indexOf(level)); i < seq.length; i++) {
      try {
        var qr = window.qrcode(0, seq[i]); qr.addData(text); qr.make();
        var n = qr.getModuleCount();
        return { qr: qr, n: n, version: (n - 17) / 4, level: seq[i], asked: level };
      } catch (e) { /* too long for this level: try a lower one */ }
    }
    return null;
  }
  // The same QR is asked for again and again (preview, print, sticker file), and one QR per table adds up: keep what was made.
  var qrCache = {}, qrCacheN = 0;
  function qrFor(link, level) {
    var k = level + "|" + link;
    if (!Object.prototype.hasOwnProperty.call(qrCache, k)) {
      if (qrCacheN >= 500) { qrCache = {}; qrCacheN = 0; }
      qrCache[k] = makeQr(link, level); qrCacheN++;
    }
    return qrCache[k];
  }
  // The link of table N: tb=N goes before the # of a link-mode menu (the # part is never sent anywhere) or after the other parameters of a live link.
  function withTable(link, n) {
    var i = link.indexOf("#"), base = i < 0 ? link : link.slice(0, i), hash = i < 0 ? "" : link.slice(i);
    return base + (base.indexOf("?") < 0 ? "?" : "&") + "tb=" + n + hash;
  }
  function qrPath(qr, quiet) {
    var n = qr.getModuleCount(), d = [];
    for (var r = 0; r < n; r++) {
      var c = 0;
      while (c < n) {
        if (qr.isDark(r, c)) { var a = c; while (c < n && qr.isDark(r, c)) c++; d.push("M" + (a + quiet) + " " + (r + quiet) + "h" + (c - a) + "v1h-" + (c - a) + "z"); }
        else c++;
      }
    }
    return d.join("");
  }
  var QUIET = 4;
  function qrSvgEl(q, px) {
    var N = q.n + 2 * QUIET;
    var svg = s("svg", { xmlns: SVGNS, viewBox: "0 0 " + N + " " + N, "shape-rendering": "crispEdges" });
    if (px) { svg.setAttribute("width", px); svg.setAttribute("height", px); }
    svg.appendChild(s("rect", { width: N, height: N, fill: "#ffffff" }));
    svg.appendChild(s("path", { fill: "#000000", d: qrPath(q.qr, QUIET) }));
    return svg;
  }
  function qrSvgFile(q) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(qrSvgEl(q, 1024));
  }
  function qrPngBlob(q, cb) {
    var N = q.n + 2 * QUIET, scale = Math.floor(1024 / N), size = 1024;
    var cv = document.createElement("canvas"); cv.width = size; cv.height = size;
    var c = cv.getContext("2d");
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, size, size);
    var off = Math.floor((size - q.n * scale) / 2);
    c.fillStyle = "#000000";
    for (var r = 0; r < q.n; r++) for (var k = 0; k < q.n; k++) if (q.qr.isDark(r, k)) c.fillRect(off + k * scale, off + r * scale, scale, scale);
    cv.toBlob(cb, "image/png");
  }

  // ---------- output (step 3) ----------
  var cur = null;            // {link, q, ...} for the chosen mode and error correction
  var seq = 0;
  function baseUrl() { return /^https?:$/.test(location.protocol) ? location.origin : "https://doughmath-studio.github.io"; }
  function domainOf(link) { try { var u = new URL(link); return u.host + "/m"; } catch (e) { return "doughmath-studio.github.io/m"; } }

  function setOutput(link, extra) {
    var info = $("qrInfo"), warn = $("qrWarn"), box = $("qrBox");
    warn.hidden = true; warn.textContent = "";
    box.textContent = "";
    if (!link) {
      cur = null;
      $("linkOut").value = "";
      box.textContent = extra && extra.text ? extra.text : "";
      info.textContent = "";
      $("qrInfo").removeAttribute("data-len");
      $("btnOpen").setAttribute("href", "#");
      toggleOff(["btnCopy", "btnSvg", "btnPng", "btnOpen"], true);
      afterOutput();
      return;
    }
    var q = qrFor(link, st.out.ec);
    $("linkOut").value = link;
    if (!q) {
      cur = null;
      box.textContent = "Too long for a QR code";
      info.textContent = "Link length: " + thousands(link.length) + " characters.";
      warn.hidden = false;
      warn.textContent = st.out.mode === "link"
        ? "This menu is too big for one QR code. Shorten descriptions, remove some items, or use Live mode (the QR stays small however long the menu is)."
        : "This link is too long for a QR code.";
      toggleOff(["btnSvg", "btnPng"], true); toggleOff(["btnCopy", "btnOpen"], false);
      $("btnOpen").setAttribute("href", link);
      afterOutput();
      return;
    }
    cur = { link: link, q: q, extra: extra || {} };
    box.appendChild(qrSvgEl(q));
    var side = q.n + " × " + q.n + " dots";
    var txt = "Link length: " + thousands(link.length) + " characters · QR version " + q.version + " (" + side + ") · error correction " + q.level;
    if (extra && extra.raw) txt += " · menu data " + thousands(extra.raw) + " bytes, packed to about " + thousands(extra.zip) + " bytes";
    info.textContent = txt;
    info.setAttribute("data-len", String(link.length)); info.setAttribute("data-version", String(q.version)); info.setAttribute("data-level", q.level);
    if (extra && extra.raw) { info.setAttribute("data-raw", String(extra.raw)); info.setAttribute("data-zip", String(extra.zip)); }
    var msgs = [];
    if (q.level !== q.asked) msgs.push("The link is too long for error correction " + q.asked + ", so the QR uses " + q.level + ".");
    if (st.out.mode === "link" && link.length > LONG_LINK) msgs.push("This link is long (" + thousands(link.length) + " characters), so the QR gets dense and is harder to scan when printed small. Use shorter descriptions, or use Live mode.");
    if (msgs.length) { warn.hidden = false; warn.textContent = msgs.join(" "); }
    $("btnOpen").setAttribute("href", link);
    toggleOff(["btnCopy", "btnSvg", "btnPng", "btnOpen"], false);
    afterOutput();
  }
  function toggleOff(ids, off) { ids.forEach(function (id) { var e = $(id); e.classList.toggle("is-off", off); if (e.tagName === "BUTTON") e.disabled = off; else e.setAttribute("aria-disabled", off ? "true" : "false"); }); }

  function refreshOutput() {
    var my = ++seq, menu = toSchema();
    syncPvSwitch();
    if (st.out.mode === "link") {
      livePreview(null);
      if (!menu.s.length) { setOutput(null, { text: "Add at least one menu item to get a QR code." }); return; }
      D.encodePayload(menu).then(function (payload) {
        if (my !== seq) return;
        var raw = new TextEncoder().encode(JSON.stringify(menu)).length;
        setOutput(baseUrl() + "/m/#" + payload, { raw: raw, zip: Math.round((payload.length - 1) * 3 / 4), payload: payload });
      }, function () { if (my === seq) setOutput(null, { text: "Your browser cannot build the link." }); });
    } else {
      var p = D.parseSheetLink(st.out.live), msg = $("liveMsg");
      msg.className = "hint";
      if (!p.ok) {
        var text = p.reason in LIVE_BAD ? LIVE_BAD[p.reason] : LIVE_BAD.other;
        msg.textContent = text; if (text) msg.className = "hint qb-badhint";
        livePreview(null);
        setOutput(null, { text: "Paste your Google Sheets link to get the QR code." });
        renderPayRead();
        return;
      }
      var tab = D.cleanTab(st.out.tab), link, key, query, what;
      if (p.kind === "share") {
        var bt = st.out.bt.trim() ? D.cleanTab(st.out.bt) : "";   // the Bills tab; "Bills" is the default and is not written into the link
        query = "d=" + p.doc + (tab !== D.DEFAULT_TAB ? "&t=" + encodeURIComponent(tab) : "") + (bt && bt !== D.DEFAULT_BILLS ? "&bt=" + encodeURIComponent(bt) : "");
        key = "d|" + p.doc + "|" + tab + (bt && bt !== D.DEFAULT_BILLS ? "|" + bt : "");
        what = "Google Sheet " + p.doc.slice(0, 8) + "…, tab “" + tab + "”";
      } else {
        query = "s=" + p.id + (p.gid ? "&g=" + p.gid : "");
        key = "s|" + p.id + "|" + p.gid;
        what = "published sheet " + p.id.slice(0, 8) + "…" + (p.gid ? ", tab " + p.gid : ", first tab");
      }
      link = baseUrl() + "/m/?" + query + "&l=" + menu.l;
      if (st.print.numbers) key += "|tb";   // numbered cards: the preview page is opened as table 1 (its own address, so it reloads)
      livePreview({ key: key, query: query, tb: st.print.numbers });
      var res = liveRes && liveRes.key === key ? liveRes : null;
      msg.textContent = res ? res.text : "Link understood: " + what + ". Checking it now…";
      if (res && !res.ok) msg.className = "hint qb-badhint"; else if (res) msg.className = "hint qb-okhint";
      setOutput(link, { live: p });
      renderPayRead();
    }
  }

  // Live mode: the preview iframe loads the real guest page with the pasted link (?embed=1), and that page tells us what it read.
  // The builder itself never contacts Google; its own CSP stays connect-src 'self'.
  var LIVE_BAD = {
    empty: "",
    wronghost: "That link is not from Google Sheets. Copy it with the Share button in Google Sheets. It starts with https://docs.google.com/spreadsheets/",
    drive: "That is a Google Drive link. Open the spreadsheet itself, tap Share and copy its link. It starts with https://docs.google.com/spreadsheets/",
    notsheet: "That is a Google Docs, Forms or Slides link. The menu has to be a Google Sheet.",
    copy: "That link makes a copy of the sheet for everyone who opens it. In Google Sheets use Share → General access → Anyone with the link → Viewer → Copy link instead.",
    other: "That does not look like a Google Sheets link. Copy it with the Share button in Google Sheets. It starts with https://docs.google.com/spreadsheets/d/"
  };
  var LIVE_FAIL = {
    d: {
      netErr: "Google did not let us read the sheet. In Google Sheets choose Share → General access → Anyone with the link → Viewer, then try again.",
      csvErr: "The sheet opened, but the menu could not be read from it. Check that the tab name is right and that the tab is laid out like the format below.",
      badLink: "That link does not contain a usable sheet id."
    },
    s: {
      netErr: "Google did not return the published sheet. Check that it is still published: File → Share → Publish to web.",
      csvErr: "The published sheet opened, but the menu could not be read from it. Check that the published tab is laid out like the format below.",
      badLink: "That link does not contain a usable sheet id."
    }
  };
  var liveShown = { key: "", search: "" };   // what the preview iframe currently shows ("" = the local menu)
  var liveWant = null, liveTimer = 0, liveRes = null;
  function livePreview(want) {
    liveWant = want;
    clearTimeout(liveTimer);
    var f = $("previewFrame");
    if (!want) {
      $("btnPrevReload").hidden = true;
      $("prevNote").textContent = PREV_LOCAL;
      if (liveShown.key) { liveShown = { key: "", search: "" }; liveRes = null; f.src = "/m/?preview=1"; }
      return;
    }
    $("btnPrevReload").hidden = false;
    if (liveShown.key === want.key) return;
    liveTimer = setTimeout(function () {
      if (!liveWant || liveWant.key === liveShown.key) return;
      var search = "?" + liveWant.query + "&l=" + st.menu.l + (liveWant.tb ? "&tb=1" : "") + "&embed=1";
      liveShown = { key: liveWant.key, search: search }; liveRes = null;
      $("prevNote").textContent = PREV_LIVE;
      f.src = "/m/" + search;
    }, 450);
  }
  var PREV_LOCAL = "This is the real guest page, as a phone shows it.";
  var PREV_LIVE = "This is the real guest page, reading your Google Sheet as guests will see it.";
  function onLiveMessage(ev) {
    var f = $("previewFrame");
    if (ev.origin !== location.origin || ev.source !== f.contentWindow) return;
    var d = ev.data;
    if (d && typeof d === "object" && typeof d.dmView === "string" && liveShown.key && d.q === liveShown.search) {   // the guest page changed screen (someone tapped inside the phone)
      if (["start", "menu", "pay"].indexOf(d.dmView) >= 0) { pvView = d.dmView; syncPvSwitch(); }
      return;
    }
    if (!d || typeof d !== "object" || d.dmLive !== 1 || !liveShown.key || d.q !== liveShown.search) return;   // only the answer for the page we asked for
    var mode = liveShown.key.charAt(0) === "d" ? "d" : "s", key = liveShown.key;
    if (d.ok !== true) {
      var k = d.key === "csvErr" || d.key === "badLink" ? d.key : "netErr";
      liveRes = { key: key, ok: false, text: LIVE_FAIL[mode][k] };
      refreshOutput();
      return;
    }
    var m = D.normalize(d.menu), dishes = 0;
    m.s.forEach(function (sec) { dishes += sec.i.length; });
    var text = dishes ? "Read your sheet just now: " + dishes + " dish" + (dishes === 1 ? "" : "es") + " in " + m.s.length + " section" + (m.s.length === 1 ? "" : "s") + "."
      : "The sheet opened, but it has no dishes yet. Add dishes under the header row.";
    if (!st.menu.n.trim() && m.n.trim()) {   // a fresh builder: take the cafe name and language from the sheet
      st.menu.n = m.n; st.menu.l = m.l; applyStep1(); changed();
      text += " The cafe name and menu language were filled in from it.";
    }
    liveRes = { key: key, ok: true, text: text, dishes: dishes, pay: m.p || null };   // the sheet's #pay block, as the guest page read it (.bad names what it dropped as invalid)
    syncPvSwitch(true);   // the page was just (re)loaded: it opens on its start screen when payments are on
    refreshOutput();
  }

  // ---------- preview iframe ----------
  // The Start / Menu / Pay switch above the phone. It only shows when payments are on and something valid is set up
  // (link mode: step 3; live mode: what the sheet's #pay block says). The phone itself is the real guest page.
  var pvView = "menu", pvWasActive = false;
  var pvOpts = { view: "menu", tb: 0, onView: function (v) { pvView = v; syncPvSwitch(); } };   // tapping inside the phone moves the switch too
  function pvActive() {
    if (st.out.mode === "live") return !!(liveRes && liveRes.ok && liveShown.key && liveRes.key === liveShown.key && D.payActive({ p: liveRes.pay }));
    return !!payConfig();
  }
  function syncPvSwitch(reset) {
    var on = pvActive(), sw = $("pvSwitch");
    if (!on) pvView = "menu"; else if (!pvWasActive || reset) pvView = "start";
    pvWasActive = on; sw.hidden = !on;
    Array.prototype.forEach.call(sw.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === pvView ? "true" : "false"); });
  }
  function setPvView(v) {
    if (["start", "menu", "pay"].indexOf(v) < 0) return;
    pvView = v; syncPvSwitch();
    if (liveShown.key) { try { var w = $("previewFrame").contentWindow; if (w && w.DMMenu) w.DMMenu.setView(v); } catch (e) { /* frame not ready */ } }
    else previewUpdate();
  }
  function previewUpdate() {
    var f = $("previewFrame");
    syncPvSwitch();
    if (liveShown.key) return;   // the frame shows the live sheet, not the local menu
    try {
      var w = f.contentWindow, root = w && w.document && w.document.getElementById("menu-root");
      if (w && w.DMMenu && root) { pvOpts.view = pvView; pvOpts.tb = st.print.numbers ? 1 : 0; w.DMMenu.render(root, toSchema(), pvOpts); }
    } catch (e) { /* frame not ready yet: the load handler renders */ }
  }

  // ---------- NFC tag panel (step 4) ----------
  // The exact links to write to the tags: the link of the QR code, or one link per table (tb=N) when the cards are numbered (the same links as the QR codes).
  function nfcLinks() {
    if (!cur) return [];
    if (!st.print.numbers) return [cur.link];
    var out = [];
    for (var n = 1; n <= st.print.count; n++) out.push(withTable(cur.link, n));
    return out;
  }
  // Bytes a link takes on a tag: an NDEF URL record ("https://" is stored as one byte) inside a TLV block, plus the end marker.
  function ndefBytes(url) {
    var rest = /^https:\/\//.test(url) ? url.length - 8 : url.length, payload = 1 + rest;
    var rec = 3 + 1 + payload + (payload > 255 ? 3 : 0);
    return 1 + (rec < 255 ? 1 : 3) + rec + 1;
  }
  var NFC_CAP = { ntag213: 144, ntag215: 504, ntag216: 888 };
  function renderNfc() {
    var ta = $("nfcUrls"), info = $("nfcInfo"), warn = $("nfcWarn"), links = nfcLinks();
    syncNumControls();
    warn.hidden = true; warn.textContent = "";
    ta.value = links.join("\n"); ta.rows = Math.max(2, Math.min(8, links.length || 1));
    toggleOff(["btnNfcCopy"], !links.length);
    info.removeAttribute("data-bytes");
    if (!links.length) { info.textContent = "The links appear when the QR code is ready."; return; }
    var longest = links.reduce(function (a, l) { return l.length > a.length ? l : a; }, ""), bytes = ndefBytes(longest);
    info.textContent = links.length + " link" + (links.length === 1 ? "" : "s") + ". The longest has " + thousands(longest.length) + " characters, about " + bytes + " bytes on the tag. NTAG213 holds " + NFC_CAP.ntag213 + " bytes, NTAG215 " + NFC_CAP.ntag215 + ", NTAG216 " + NFC_CAP.ntag216 + ".";
    info.setAttribute("data-bytes", String(bytes));
    var msg = "";
    if (bytes > NFC_CAP.ntag216) msg = "This link is too long for any common NFC tag. Use Live mode: the QR and the tag then carry a short link.";
    else if (bytes > NFC_CAP.ntag215) msg = "This link is too long for NTAG213 and NTAG215. Use Live mode (a short link), or NTAG216 tags (" + NFC_CAP.ntag216 + " bytes).";
    else if (bytes > NFC_CAP.ntag213) msg = "This link does not fit on NTAG213. Use NTAG215 tags (" + NFC_CAP.ntag215 + " bytes), or Live mode for a shorter link.";
    if (msg) { warn.hidden = false; warn.textContent = msg; }
  }
  function copyNfc() {
    var ta = $("nfcUrls"), text = ta.value; if (!text) return;
    var b = $("btnNfcCopy"), done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy all links"; }, 1600); };
    function fallback() { ta.focus(); ta.select(); try { if (document.execCommand("copy")) done(); } catch (e) { /* the guest of this page can copy by hand */ } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  // The table numbering (step 5) is also offered next to the tag links. One state, two sets of controls.
  function syncNumControls() {
    var on = st.print.numbers;
    $("numOn").checked = on; $("nfcNumOn").checked = on;
    $("numBox").hidden = !on; $("nfcNumBox").hidden = !on;
    ["numCount", "nfcCount"].forEach(function (id) { if (document.activeElement !== $(id)) $(id).value = st.print.count; });
  }
  // "Show NFC sign" and the headline are offered in step 5 (cards) and step 6 (sticker file); the headline only when payments are on.
  function syncNfcBoxes() {
    var canHead = pvActive();
    ["nfcSign", "shopNfcSign"].forEach(function (id) { $(id).checked = !!st.print.nfc; });
    ["nfcHead", "shopNfcHead"].forEach(function (id) { $(id).checked = !!st.print.head; });
    $("nfcHeadRow").hidden = !canHead; $("shopHeadRow").hidden = !canHead;
    syncDarkBoxes(canHead);
  }
  // Card style, the accepted-payments line and the QR-centre logo are offered in step 5 (cards) and step 6 (sticker file). One state, two sets of controls.
  function syncDarkBoxes(pay) {
    var dark = darkOn(), T = darkT(), letter = logoLetter(), cq = printLongest();
    ["styleSel", "shopStyleSel"].forEach(function (id) { $(id).value = st.print.style; });
    ["darkOpts", "shopDarkOpts"].forEach(function (id) { $(id).hidden = !dark; });
    ["accOn", "shopAccOn"].forEach(function (id) { $(id).checked = st.print.accOn; $(id).disabled = !pay; });
    ["accText", "shopAccText"].forEach(function (id) {
      if (document.activeElement !== $(id)) $(id).value = st.print.acc;
      $(id).placeholder = T.acc; $(id).disabled = !pay || !st.print.accOn;
    });
    ["accHint", "shopAccHint"].forEach(function (id) {
      $(id).textContent = pay ? "Plain text, no logos. Leave it empty for the default in the menu language." : "Turn on payments in step 3 to show this line. Without payments the dark card shows your cafe name and “" + D.T[st.menu.l].scan + "”.";
    });
    // logo: cards need the code at error correction H, stickers always have it
    var cardMod = cq ? cardQrMm(st.print.layout) / (cq.n + 8) : 0, sp = shopQr ? currentPlan() : null;
    var small = function (m) { return "The dots would be only " + num(m, 2) + " mm here. A logo needs at least " + LOGO_MIN_MOD + " mm: choose a bigger size, or Live mode (a shorter link)."; };
    var cardWhy = !letter ? "Type your cafe name in step 1 first." : !cq ? "Needs a QR code first." : cq.level !== "H" ? "Needs error correction H: choose it in step 4 (a bigger code, but it can lose parts)." : cardMod < LOGO_MIN_MOD ? small(cardMod) : "";
    var shopWhy = !letter ? "Type your cafe name in step 1 first." : !shopQr ? "Needs a QR code first." : sp && !sp.unsupported && sp.mod < LOGO_MIN_MOD ? small(sp.mod) : "";
    var OK = "The first letter of your cafe name goes in the middle of the code, in an amber square that covers less than 8% of it. Always scan a test print with two phones.";
    $("logoOn").checked = st.print.logo && !cardWhy; $("logoOn").disabled = !!cardWhy; $("logoHint").textContent = cardWhy || OK;
    $("shopLogoOn").checked = st.print.logo && !shopWhy; $("shopLogoOn").disabled = !!shopWhy; $("shopLogoHint").textContent = shopWhy || OK;
  }

  // ---------- NFC sign and headline on cards and stickers (texts follow the menu language; translations are mine) ----------
  var NFC_T = {
    en: { cap: "Scan or tap your phone", head: "Pay without waiting for the waiter" },
    es: { cap: "Escanea o acerca tu móvil", head: "Paga sin esperar al camarero" },
    pt: { cap: "Digitalize ou aproxime o telemóvel", head: "Pague sem esperar pelo empregado" },
    fr: { cap: "Scannez ou approchez votre téléphone", head: "Payez sans attendre le serveur" },
    de: { cap: "Scannen oder Handy anhalten", head: "Bezahlen, ohne auf den Kellner zu warten" },
    pl: { cap: "Zeskanuj lub przyłóż telefon", head: "Szybka płatność bez czekania na kelnera" },
    uk: { cap: "Скануйте або прикладіть телефон", head: "Платіть, не чекаючи офіціанта" },
    ru: { cap: "Сканируйте или приложите телефон", head: "Платите, не дожидаясь официанта" }
  };
  function nfcT() { return NFC_T[st.menu.l] || NFC_T.en; }
  // the headline needs payments to be on (link mode: step 3 works; live mode: the sheet's #pay block works)
  function headOn() { return st.print.head && pvActive(); }
  // the small contactless sign: three arcs. Used as HTML/SVG on the cards and as plain paths on the sticker file.
  var NFC_ARCS = ["M8 8.5a5 5 0 010 7", "M12 5.5a9 9 0 010 13", "M16 2.5a13 13 0 010 19"];
  function nfcIcon(cls) {
    var svg = s("svg", { class: cls, viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" });
    NFC_ARCS.forEach(function (d) { svg.appendChild(s("path", { d: d, fill: "none", stroke: "currentColor", "stroke-width": "2.4", "stroke-linecap": "round" })); });
    return svg;
  }
  var HEAD_FIT = { a6: { max: 12, min: 8, w: 89 }, s6: { max: 6.2, min: 4.6, w: 54 }, s5: { max: 5.2, min: 4.2, w: 45 }, poster: { max: 24, min: 14, w: 172 } };
  function fitHeadPt(kind, text) {
    var f = HEAD_FIT[kind], w = textW(text, "700", f.max, SANS_PS);
    if (w <= f.w) return f.max;
    return Math.max(f.min, Math.floor(f.max * f.w / w * 10) / 10);
  }

  // ---------- Dark card (PAY-3): navy card or sticker, a white QR panel, amber text. Texts follow the menu language; translations are mine. ----------
  var DARK_T = {
    en: { title: "Quick payment", sub: "No waiting for the waiter", nfc: "Tap your phone (NFC)", acc: "BLIK \u00b7 card \u00b7 phone" },
    es: { title: "Pago r\u00e1pido", sub: "Sin esperar al camarero", nfc: "Acerca tu m\u00f3vil (NFC)", acc: "BLIK \u00b7 tarjeta \u00b7 m\u00f3vil" },
    pt: { title: "Pagamento r\u00e1pido", sub: "Sem esperar pelo empregado", nfc: "Aproxime o telem\u00f3vel (NFC)", acc: "BLIK \u00b7 cart\u00e3o \u00b7 telem\u00f3vel" },
    fr: { title: "Paiement rapide", sub: "Sans attendre le serveur", nfc: "Approchez votre t\u00e9l\u00e9phone (NFC)", acc: "BLIK \u00b7 carte \u00b7 t\u00e9l\u00e9phone" },
    de: { title: "Schnell bezahlen", sub: "Ohne auf den Kellner zu warten", nfc: "Handy anhalten (NFC)", acc: "BLIK \u00b7 Karte \u00b7 Handy" },
    pl: { title: "Szybka p\u0142atno\u015b\u0107", sub: "Bez czekania na kelnera", nfc: "Przy\u0142\u00f3\u017c telefon (NFC)", acc: "BLIK \u00b7 karta \u00b7 telefon" },
    uk: { title: "\u0428\u0432\u0438\u0434\u043a\u0430 \u043e\u043f\u043b\u0430\u0442\u0430", sub: "\u0411\u0435\u0437 \u043e\u0447\u0456\u043a\u0443\u0432\u0430\u043d\u043d\u044f \u043e\u0444\u0456\u0446\u0456\u0430\u043d\u0442\u0430", nfc: "\u041f\u0440\u0438\u043a\u043b\u0430\u0434\u0456\u0442\u044c \u0442\u0435\u043b\u0435\u0444\u043e\u043d (NFC)", acc: "BLIK \u00b7 \u043a\u0430\u0440\u0442\u043a\u0430 \u00b7 \u0442\u0435\u043b\u0435\u0444\u043e\u043d" },
    ru: { title: "\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u043e\u043f\u043b\u0430\u0442\u0430", sub: "\u0411\u0435\u0437 \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u044f \u043e\u0444\u0438\u0446\u0438\u0430\u043d\u0442\u0430", nfc: "\u041f\u0440\u0438\u043b\u043e\u0436\u0438\u0442\u0435 \u0442\u0435\u043b\u0435\u0444\u043e\u043d (NFC)", acc: "BLIK \u00b7 \u043a\u0430\u0440\u0442\u0430 \u00b7 \u0442\u0435\u043b\u0435\u0444\u043e\u043d" }
  };
  var NAVY = "#0f172a", AMBER = "#fbbf24", SPACED = 0.12;   // letter-spacing of the small amber subtitle, in em
  function darkOn() { return st.print.style === "dark"; }
  function darkT() { return DARK_T[st.menu.l] || DARK_T.en; }
  // What the dark card says. Payments on: "Quick payment / no waiting for the waiter" and the accepted-payments line.
  // Payments off: the cafe name and "Scan for the menu" (the payment texts would promise something the menu page cannot do).
  function darkTexts() {
    var l = st.menu.l, L = D.T[l], T = darkT(), pay = pvActive(), up = function (x) { return x.toLocaleUpperCase(l); };
    return {
      pay: pay, title: pay ? T.title : st.menu.n.trim(), sub: up(pay ? T.sub : L.scan), nfc: st.print.nfc ? T.nfc : "",
      acc: pay && st.print.accOn ? (st.print.acc.trim() || T.acc) : ""
    };
  }
  // Single-line text size so that it fits maxMm (letter-spaced text counts its spacing); 0 when even minPt does not fit.
  function spacedW(text, weight, pt, sp) { return textW(text, weight, pt, SANS_PS) + (sp ? (text.length - 1) * sp * pt * PT : 0); }
  function fitSpaced(text, weight, maxPt, minPt, maxMm, sp, orBig) {
    var w = spacedW(text, weight, maxPt, sp);
    if (w <= maxMm) return maxPt;
    var pt = Math.floor(maxPt * maxMm / w * 10) / 10;
    return pt >= minPt ? pt : (orBig ? minPt : 0);
  }
  var DARK_FIT = { a6: { w: 89, title: [26, 13], sub: [9, 6], acc: [12, 7] }, s6: { w: 54, title: [10.5, 6.5], sub: [4.8, 3.4], acc: [5.6, 3.8] },
    s5: { w: 45, title: [8.5, 5.5], sub: [4.1, 3], acc: [4.6, 3.3] }, poster: { w: 172, title: [52, 26], sub: [18, 11], acc: [24, 14] } };

  // Logo in the QR centre: the first letter of the cafe name in an amber rounded square. Only at error correction H, the square covers at most 8% of the code,
  // and only where the dots are at least 0.4 mm (the decode tests: both decoders read the code at every version from 5 to 40 down to that size).
  var LOGO_MAX_AREA = 0.08, LOGO_MIN_K = 7, LOGO_MIN_MOD = 0.4;   // area: at most 8% of the code (the limit is 12%: at 12% some versions did not decode, at 10% a few sizes were flaky, at 8% every one did); dots at least 0.4 mm
  function logoLetter() { var m = st.menu.n.trim().match(/[\p{L}\p{N}]/u); return m ? m[0].toLocaleUpperCase(st.menu.l) : ""; }
  // side of the square in modules: the same parity as the code (so it sits on the module grid), at most 8% of n x n (LOGO_MAX_AREA; 12% failed the decode sweep); 0 = not offered
  function logoModules(q, area) {
    if (!q || q.level !== "H") return 0;
    var k = Math.floor(Math.sqrt(area || LOGO_MAX_AREA) * q.n);
    if ((k - q.n) % 2) k--;
    return k >= LOGO_MIN_K ? k : 0;
  }
  function logoEls(parent, N, k, letter) {
    var x = (N - k) / 2, r = k * 0.22, fs = k * 0.62;
    parent.appendChild(s("rect", { x: num(x, 3), y: num(x, 3), width: k, height: k, rx: num(r, 3), ry: num(r, 3), fill: AMBER }));
    parent.appendChild(s("text", { x: num(N / 2, 3), y: num(N / 2 + fs * 0.358, 3), "text-anchor": "middle", "font-family": SANS_PS, "font-weight": "700", "font-size": num(fs, 3), fill: NAVY }, letter));
  }

  // ---------- A4 print layouts (step 5) ----------
  var LAYOUTS = {
    tent: { label: "Table tent A6", note: "2 tents per A4. Cut in the middle, fold on the dashed line.", per: 2, qr: 68, dqr: [74, 68] },
    s6: { label: "Stickers 6 × 6 cm", note: "12 per A4 with cut marks.", per: 12, qr: 34, dqr: [34, 30], cols: 3, rows: 4, cell: 60 },
    s5: { label: "Stickers 5 × 5 cm", note: "20 per A4. Small text, short menus only.", per: 20, qr: 28, dqr: [28, 25], cols: 4, rows: 5, cell: 50 },
    poster: { label: "A4 poster", note: "One big card per page.", per: 1, qr: 136, dqr: [150, 136] }
  };
  // Width of the QR (with its quiet zone) on a card. The dark card has a bigger QR when there is no table number / small line row.
  function cardQrMm(key) {
    var L = LAYOUTS[key];
    if (!darkOn()) return L.qr;
    return L.dqr[st.print.numbers || st.print.line.trim() ? 1 : 0];
  }
  var NAME_FIT = { a6: { max: 22, min: 11, w: 89 }, s6: { max: 8.5, min: 5, w: 54 }, s5: { max: 7, min: 4.5, w: 45 }, poster: { max: 40, min: 20, w: 172 } };
  function fitNamePt(kind, name) {
    var f = NAME_FIT[kind], w = textW(name, "700", f.max, SERIF), room = f.w * 1.7; // up to two lines, with slack for word wrapping
    if (w <= room) return f.max;
    return Math.max(f.min, Math.floor(f.max * room / w * 10) / 10);
  }
  // One hidden svg holding every QR the sheets use: a single one, or one per table when the cards are numbered.
  function defsSvg(entries) {
    var svg = s("svg", { class: "qb-defs", width: 0, height: 0, "aria-hidden": "true", focusable: "false" });
    var defs = s("defs");
    entries.forEach(function (e) {
      var N = e.q.n + 2 * QUIET, g = s("g", { id: e.id });
      g.appendChild(s("rect", { width: N, height: N, fill: "#ffffff" }));
      g.appendChild(s("path", { fill: "#000000", d: qrPath(e.q.qr, QUIET) }));
      defs.appendChild(g);
    });
    svg.appendChild(defs);
    return svg;
  }
  function qrUse(id, q, logo) {
    var N = q.n + 2 * QUIET, k = logo ? logoModules(q) : 0;
    var svg = s("svg", { class: "c-qr", viewBox: "0 0 " + N + " " + N, "aria-hidden": "true", "shape-rendering": "crispEdges" });
    svg.appendChild(s("use", { href: "#" + id }));
    if (k) logoEls(svg, N, k, logo);
    return svg;
  }
  // The dark card: title, small amber subtitle, white QR panel, NFC line, a divider, the accepted-payments line, the web address, then the table number and small line.
  function buildDarkCard(kind, ctx, number) {
    var c = h("div", { class: "card card-" + kind + " card-dark" }), d = ctx.dark, F = DARK_FIT[kind];
    if (d.title) { var t = h("div", { class: "c-title" }, d.title); t.style.fontSize = fitSpaced(d.title, "700", F.title[0], F.title[1], F.w * (d.pay ? 0.96 : 1.7), 0, true) + "pt"; c.appendChild(t); }
    if (d.sub) { var u = h("div", { class: "c-sub" }, d.sub); u.style.fontSize = fitSpaced(d.sub, "700", F.sub[0], F.sub[1], F.w * 0.96, SPACED, true) + "pt"; c.appendChild(u); }
    var sy = ctx.sym(number), pan = h("div", { class: "c-panel" });
    pan.style.width = ctx.qrMm + "mm"; pan.style.height = ctx.qrMm + "mm";
    pan.appendChild(qrUse(sy.id, sy.q, ctx.logo));
    c.appendChild(pan);
    if (d.nfc) {
      var nl = h("div", { class: "c-nfcl" });
      nl.appendChild(nfcIcon("c-nfc flip")); nl.appendChild(h("span", null, d.nfc)); nl.appendChild(nfcIcon("c-nfc"));
      c.appendChild(nl);
    }
    if (d.acc) {
      c.appendChild(h("i", { class: "c-rule" }));
      var a = h("div", { class: "c-acc" }, d.acc); a.style.fontSize = fitSpaced(d.acc, "700", F.acc[0], F.acc[1], F.w * 0.96, 0, true) + "pt"; c.appendChild(a);
    }
    c.appendChild(h("div", { class: "c-dom" }, ctx.domain));
    if (number != null || ctx.line) {
      var f = h("div", { class: "c-foot" });
      if (number != null) f.appendChild(h("span", { class: "c-tbl" }, ctx.tableWord + " " + number));
      if (ctx.line) f.appendChild(h("span", { class: "c-line" }, ctx.line));
      c.appendChild(f);
    }
    return c;
  }
  function buildCard(kind, ctx, number) {
    if (ctx.dark) return buildDarkCard(kind, ctx, number);
    var c = h("div", { class: "card card-" + kind });
    if (ctx.name) { var nm = h("div", { class: "c-name" }, ctx.name); nm.style.fontSize = fitNamePt(kind, ctx.name) + "pt"; c.appendChild(nm); }
    if (ctx.head) { var hd = h("div", { class: "c-head" }, ctx.head); hd.style.fontSize = fitHeadPt(kind, ctx.head) + "pt"; c.appendChild(hd); }
    var sy = ctx.sym(number);
    c.appendChild(qrUse(sy.id, sy.q, ctx.logo));
    var cap = h("div", { class: "c-cap" });
    if (ctx.nfc) cap.appendChild(nfcIcon("c-nfc"));
    cap.appendChild(h("span", null, ctx.caption));
    c.appendChild(cap);
    c.appendChild(h("div", { class: "c-dom" }, ctx.domain));
    if (number != null || ctx.line) {
      var f = h("div", { class: "c-foot" });
      if (number != null) f.appendChild(h("span", { class: "c-tbl" }, ctx.tableWord + " " + number));
      if (ctx.line) f.appendChild(h("span", { class: "c-line" }, ctx.line));
      c.appendChild(f);
    }
    return c;
  }
  function addMarks(sheet, x0, y0, cols, rows, cell, tickLen, tickGap, sideTicks) {
    var W = cols * cell, H = rows * cell, i, el;
    for (i = 0; i <= cols; i++) {
      el = h("i", { class: "mark-v" }); el.style.left = (x0 + i * cell) + "mm"; el.style.top = y0 + "mm"; el.style.height = H + "mm"; sheet.appendChild(el);
      el = h("i", { class: "tick-v" }); el.style.left = (x0 + i * cell) + "mm"; el.style.top = (y0 - tickGap - tickLen) + "mm"; el.style.height = tickLen + "mm"; sheet.appendChild(el);
      el = h("i", { class: "tick-v" }); el.style.left = (x0 + i * cell) + "mm"; el.style.top = (y0 + H + tickGap) + "mm"; el.style.height = tickLen + "mm"; sheet.appendChild(el);
    }
    for (i = 0; i <= rows; i++) {
      el = h("i", { class: "mark-h" }); el.style.top = (y0 + i * cell) + "mm"; el.style.left = x0 + "mm"; el.style.width = W + "mm"; sheet.appendChild(el);
      if (sideTicks) {
        el = h("i", { class: "tick-h" }); el.style.top = (y0 + i * cell) + "mm"; el.style.left = (x0 - tickGap - tickLen) + "mm"; el.style.width = tickLen + "mm"; sheet.appendChild(el);
        el = h("i", { class: "tick-h" }); el.style.top = (y0 + i * cell) + "mm"; el.style.left = (x0 + W + tickGap) + "mm"; el.style.width = tickLen + "mm"; sheet.appendChild(el);
      }
    }
  }
  // The letter for the QR-centre logo on cards, or "" (off, no letter, or the code is not at error correction H)
  function cardLogo() {
    if (!st.print.logo) return "";
    var q = printLongest();
    return q && logoModules(q) && cardQrMm(st.print.layout) / (q.n + 8) >= LOGO_MIN_MOD - 1e-9 ? logoLetter() : "";
  }
  // Numbered cards: every card has its own QR, with tb=N in the link. ctx.sym(n) makes (and remembers) the QR of table n; null = the plain QR.
  function printContext(prefix) {
    var l = st.menu.l, L = D.T[l], used = {}, order = [];
    return {
      name: st.menu.n.trim(), caption: st.print.nfc ? nfcT().cap : L.scan, nfc: !!st.print.nfc, head: headOn() ? nfcT().head : "", tableWord: L.table, line: st.print.line.trim(), domain: domainOf(cur ? cur.link : baseUrl() + "/m/"),
      dark: darkOn() ? darkTexts() : null, qrMm: cardQrMm(st.print.layout), logo: cardLogo(),
      order: order,
      sym: function (n) {
        var k = n == null ? 0 : n;
        if (!used[k]) { used[k] = { id: prefix + "-" + k, q: n == null ? cur.q : qrFor(withTable(cur.link, n), st.out.ec) }; order.push(used[k]); }
        return used[k];
      }
    };
  }
  // The QR with the longest link on the sheets (the highest table number): the dots are smallest there, so every size check uses it. null = does not fit.
  function printLongest() {
    if (!cur) return null;
    return st.print.numbers ? qrFor(withTable(cur.link, st.print.count), st.out.ec) : cur.q;
  }
  function pageCount(key) {
    var L = LAYOUTS[key], numbers = st.print.numbers ? st.print.count : 0;
    return numbers ? Math.ceil(numbers / L.per) : 1;
  }
  // Returns {pages: [.sheet elements], defs: <svg with the QRs>} (first page only when firstOnly).
  function buildSheets(key, prefix, firstOnly) {
    var L = LAYOUTS[key], ctx = printContext(prefix), nums = [];
    if (st.print.numbers) for (var k = 1; k <= st.print.count; k++) nums.push(k);
    var pages = [], total = nums.length ? Math.ceil(nums.length / L.per) : 1;
    if (firstOnly) total = 1;
    for (var p = 0; p < total; p++) {
      var chunk = nums.length ? nums.slice(p * L.per, (p + 1) * L.per) : null;
      var sheet = h("div", { class: "sheet sheet-" + key }), i;
      function numAt(idx) { return chunk ? (idx < chunk.length ? chunk[idx] : undefined) : null; }
      if (key === "tent") {
        for (i = 0; i < 2; i++) {
          var n = numAt(i); if (n === undefined) continue;
          var tent = h("div", { class: "tent" }); tent.style.top = (i * 148.3) + "mm";
          ["l", "r"].forEach(function (side) {
            var face = h("div", { class: "face " + side }); face.appendChild(buildCard("a6", ctx, n)); tent.appendChild(face);
          });
          sheet.appendChild(tent);
          var fold = h("i", { class: "mark-fold" }); fold.style.top = (i * 148.3) + "mm"; sheet.appendChild(fold);
          var tag = h("span", { class: "mark-tag" }, "fold"); tag.style.left = "99mm"; tag.style.top = (i * 148.3 + 3) + "mm"; sheet.appendChild(tag);
          var tag2 = h("span", { class: "mark-tag" }, "fold"); tag2.style.left = "99mm"; tag2.style.top = (i * 148.3 + 142) + "mm"; sheet.appendChild(tag2);
        }
        var cut = h("i", { class: "mark-cut-h" }); cut.style.top = "148.3mm"; sheet.appendChild(cut);
        var ct = h("span", { class: "mark-tag" }, "cut here"); ct.style.left = "2mm"; ct.style.top = "145.5mm"; sheet.appendChild(ct);
      } else if (key === "poster") {
        var card = buildCard("poster", ctx, numAt(0) === undefined ? null : numAt(0)); sheet.appendChild(card);
      } else {
        var kind = key, grid = h("div", { class: "grid-cards" });
        var gw = L.cols * L.cell, gh = L.rows * L.cell, x0 = (210 - gw) / 2, y0 = (296.6 - gh) / 2;
        grid.style.left = x0 + "mm"; grid.style.top = y0 + "mm"; grid.style.width = gw + "mm"; grid.style.height = gh + "mm";
        grid.style.gridTemplateColumns = "repeat(" + L.cols + ", " + L.cell + "mm)"; grid.style.gridAutoRows = L.cell + "mm";
        for (i = 0; i < L.per; i++) {
          var nn = numAt(i);
          if (nn === undefined) { grid.appendChild(h("div")); continue; }
          grid.appendChild(buildCard(kind, ctx, nn));
        }
        sheet.appendChild(grid);
        addMarks(sheet, x0, y0, L.cols, L.rows, L.cell, key === "s6" ? 4 : 2.5, key === "s6" ? 2 : 1, key === "s6");
      }
      pages.push(sheet);
    }
    return { pages: pages, defs: defsSvg(ctx.order) };
  }

  function renderSheetPreview() {
    var box = $("sheetPrev"); box.textContent = "";
    var key = st.print.layout, info = $("printInfo"), warn = $("printWarn");
    warn.hidden = true; warn.textContent = "";
    if (!cur) {
      box.appendChild(h("p", { class: "qb-muted qb-center" }, "The print preview appears when the QR code is ready."));
      info.textContent = ""; toggleOff(["btnPrint"], true); return;
    }
    var longQ = printLongest();   // numbered cards: the QR of the highest table number (longest link, smallest dots)
    if (!longQ) {
      box.appendChild(h("p", { class: "qb-muted qb-center" }, "The table numbers make the link too long for a QR code."));
      info.textContent = ""; toggleOff(["btnPrint"], true);
      warn.hidden = false; warn.textContent = "With the table number added, the link is too long for a QR code. Shorten the menu, or use Live mode (a short link).";
      return;
    }
    toggleOff(["btnPrint"], false);
    var L = LAYOUTS[key];
    var built = buildSheets(key, "qrg-prev", true);
    box.appendChild(built.defs);
    var sheet = built.pages[0]; box.appendChild(sheet);
    var k = box.clientWidth / 793.7; sheet.style.transformOrigin = "0 0"; sheet.style.transform = "scale(" + k + ")";
    sheet.style.position = "absolute"; sheet.style.left = "0"; sheet.style.top = "0";
    var np = pageCount(key), cards = st.print.numbers ? st.print.count : null;
    var qrMm = cardQrMm(key), mod = qrMm / (longQ.n + 8);
    info.textContent = (cards ? cards + " numbered card" + (cards === 1 ? "" : "s") + ", each with its own QR code (table number inside) · " : "") + np + " page" + (np === 1 ? "" : "s") + " (A4). QR is " + qrMm + " mm wide, each dot about " + num(mod, 2) + " mm.";
    info.setAttribute("data-module-mm", num(mod, 3));
    var notes = [];
    if (mod < 0.3) notes.push("The dots are only " + num(mod, 2) + " mm wide. That may be hard to scan. Choose a bigger layout, or shorten the menu, or use Live mode.");
    var ov = cardsOverflow(sheet, k, key);
    if (ov) notes.push("The cafe name or the small line is too long for this layout: it comes too close to the edge and could be cut off. Shorten it, or choose a bigger layout.");
    if (notes.length) { warn.hidden = false; warn.textContent = notes.join(" "); }
    info.setAttribute("data-overflow", ov ? "1" : "0");
  }
  // True when something inside a card comes closer to the card edge than the safe margin (mm). Cards clip what sticks out, and stickers are cut by hand.
  var EDGE_MM = { tent: 3, s6: 1, s5: 1, poster: 8 };
  function cardsOverflow(sheet, scale, key) {
    var bad = false, mm = (96 / 25.4) * (scale || 1), m = (EDGE_MM[key] || 1) * mm - 0.5;
    Array.prototype.forEach.call(sheet.querySelectorAll(".card"), function (c) {
      var r = c.getBoundingClientRect();
      Array.prototype.forEach.call(c.children, function (k) {
        var q = k.getBoundingClientRect();
        if (q.top < r.top + m || q.bottom > r.bottom - m || q.left < r.left + m || q.right > r.right - m) bad = true;
      });
    });
    return bad;
  }

  function doPrint() {
    if (!cur) return;
    var root = $("printRoot"); root.textContent = "";
    if (!printLongest()) return;
    var built = buildSheets(st.print.layout, "qrg-print", false);
    root.appendChild(built.defs);
    built.pages.forEach(function (sh) { root.appendChild(sh); });
    window.print();
  }

  // ---------- sticker file for a print shop (step 5) ----------
  var BLEED = 3, SAFE = 3, MIN_MOD = 0.5;
  var PS = {
    s5: { label: "5 × 5 cm", shape: "sq", size: 50, r: 4, cls: "ps5", nameMax: 6.5, capMax: 5.5, domMax: 5, d: { title: 8.4, sub: 3.9, nfc: 4.6, acc: 4.4 } },
    s6: { label: "6 × 6 cm", shape: "sq", size: 60, r: 4, cls: "ps6", nameMax: 8, capMax: 6.5, domMax: 6, d: { title: 10.4, sub: 4.7, nfc: 5.6, acc: 5.3 } },
    s8: { label: "8 × 8 cm", shape: "sq", size: 80, r: 5, cls: "ps8", nameMax: 11, capMax: 8.5, domMax: 7.5, d: { title: 14, sub: 6.3, nfc: 7.4, acc: 7 } },
    r6: { label: "Ø 6 cm round", shape: "round", size: 60, cls: "pr6", domMax: 5.5 }
  };
  var shopQr = null;   // QR at error correction H for the current link (numbered stickers: the one with the highest table number, which has the smallest dots)
  var shopTable = 1;   // the table whose sticker the preview and the SVG show
  function fitPt(text, weight, maxPt, minPt, maxMm) {
    var w = textW(text, weight, maxPt, SANS_PS);
    if (w <= maxMm) return maxPt;
    var pt = Math.floor(maxPt * maxMm / w * 10) / 10;
    return pt >= minPt ? pt : 0;
  }
  // Layout of one sticker. All numbers in mm, artwork box = size + 2 * bleed.
  function stickerPlan(key, n, texts) {
    if (texts.dark) return stickerPlanDark(key, n, texts);
    var P = PS[key], W = P.size + 2 * BLEED, N = n + 2 * QUIET, i;
    var plan = { key: key, W: W, n: n, ok: false, mod: 0, q: 0, lines: [], omitted: [], tblWord: texts.tblWord || "", nfc: !!texts.nfc, logo: texts.logo || null };
    if (P.shape === "round") {
      var Rs = P.size / 2 - SAFE, c = W / 2, g = 1, gt = 0.4, span = 2 * Rs * 0.75;
      var mk = function (text, maxPt, maxW, kind) { var pt = fitPt(text, "700", maxPt, 3.5, maxW) || 3.5; return { kind: kind, text: text, pt: pt, h: lineMm(pt), w: textW(text, "700", pt, SANS_PS) }; };
      // the largest QR above a stack of text lines such that every box (QR, each line) has its farthest corner inside the circle
      var fitStack = function (ls) {
        var below = 0; ls.forEach(function (l, k) { below += l.h + (k ? gt : 0); });
        for (var q = 44; q >= 10; q -= 0.05) {
          var H = q + g + below, mid = H / 2, ok = true, y = q + g, boxes = [[q / 2, 0, q]];
          ls.forEach(function (l) { boxes.push([l.w / 2, y, y + l.h]); y += l.h + gt; });
          boxes.forEach(function (b) { var dy = Math.max(Math.abs(b[1] - mid), Math.abs(b[2] - mid)); if (Math.sqrt(b[0] * b[0] + dy * dy) > Rs) ok = false; });
          if (ok) return { q: q, H: H, ls: ls };
        }
        return { q: 0, H: g + below, ls: ls };
      };
      // numbered stickers: "Table N" above the web address, or both on one line when that leaves a bigger QR
      var cands = texts.tbl
        ? [fitStack([mk(texts.tbl, P.domMax + 1.5, 2 * Rs * 0.7, "tbl"), mk(texts.dom, P.domMax, span, "dom")]), fitStack([mk(texts.tbl + " \u00b7 " + texts.dom, P.domMax, span, "tbldom")])]
        : [fitStack([mk(texts.dom, P.domMax, span, "dom")])];
      var pick = cands.reduce(function (a, b) { return b.q > a.q ? b : a; }, cands[0]);
      var top = c - pick.H / 2, yy = top + pick.q + g;
      plan.q = pick.q; plan.qx = c - pick.q / 2; plan.qy = top;
      pick.ls.forEach(function (l) {
        plan.lines.push({ kind: l.kind, text: l.text, pt: l.pt, w: l.w, x: c, y: yy + 0.92 * l.pt * PT, weight: "700", dom: texts.dom });
        yy += l.h + gt;
      });
      plan.omitted = ["cafe name", texts.nfc ? "the NFC sign" : "“Scan for the menu”"];
      if (texts.head) plan.omitted.push("the headline");
    } else {
      var A = P.size - 2 * SAFE, gq = 1.2, gl = 0.5;
      var iconAllow = texts.nfc ? P.capMax * PT * 1.55 : 0;   // room kept for the tap icon in front of the caption
      var fits = { name: texts.name ? fitPt(texts.name, "700", P.nameMax, 4.5, A) : 0, cap: texts.cap ? fitPt(texts.cap, "600", P.capMax, 4.5, A - iconAllow) : 0, dom: fitPt(texts.dom, "700", P.domMax, 3.5, A) || 3.5,
        tbl: texts.tbl ? fitPt(texts.tbl, "700", P.nameMax, 4.5, A) || 4.5 : 0, head: texts.head ? fitPt(texts.head, "700", P.capMax, 4.2, A) : 0 };
      var combos = texts.tbl ? [["name", "tbl", "cap", "dom"], ["tbl", "cap", "dom"], ["tbl", "dom"]] : [["name", "cap", "dom"], ["cap", "dom"], ["dom"]];
      if (fits.head) combos.unshift(texts.name ? ["name", "head"].concat(combos[0].slice(1)) : ["head"].concat(combos[1]));   // the headline goes in when it fits; it is the first thing dropped when the dots get too small
      var chosen = null;
      for (i = 0; i < combos.length; i++) {
        var cb = combos[i];
        if (cb.some(function (k) { return !fits[k]; })) continue;
        var hs = 0, below = 0, tops = 0;
        cb.forEach(function (k) { hs += lineMm(fits[k]); if (k === "name" || k === "head") tops++; else below++; });
        var qq = Math.min(A, A - hs - (tops ? gq + (tops - 1) * gl : 0) - gq - (below - 1) * gl);
        var m = qq / N;
        chosen = { cb: cb, q: qq, mod: m, hasName: tops > 0 };
        if (m >= MIN_MOD) break;
      }
      if (!chosen) chosen = texts.tbl ? { cb: ["tbl", "dom"], q: Math.min(A, A - lineMm(fits.tbl) - lineMm(fits.dom) - gq - gl), mod: 0, hasName: false } : { cb: ["dom"], q: Math.min(A, A - lineMm(fits.dom) - gq), mod: 0, hasName: false };
      chosen.mod = chosen.q / N;
      if (texts.tbl && chosen.mod < MIN_MOD) {   // "Table 5 \u00b7 web address" on one line saves a line, so the QR can be bigger
        var mtxt = texts.tbl + " \u00b7 " + texts.dom, mpt = fitPt(mtxt, "700", P.domMax, 3.5, A);
        if (mpt) { var mq = Math.min(A, A - lineMm(mpt) - gq); if (mq / N > chosen.mod) { chosen = { cb: ["tbldom"], q: mq, mod: mq / N, hasName: false }; fits.tbldom = mpt; texts.tbldom = mtxt; } }
      }
      var cx = W / 2, y = BLEED + SAFE;
      var weights = { name: "700", head: "700", cap: "600", dom: "700", tbl: "700", tbldom: "700" }, texts2 = { name: texts.name, head: texts.head, cap: texts.cap, dom: texts.dom, tbl: texts.tbl, tbldom: texts.tbldom };
      var lines = [], topKeys = chosen.cb.filter(function (k) { return k === "name" || k === "head"; });
      topKeys.forEach(function (k, idx) {
        lines.push({ kind: k, text: texts2[k], pt: fits[k], w: textW(texts2[k], "700", fits[k], SANS_PS), x: cx, y: y + 0.92 * fits[k] * PT, weight: "700" });
        y += lineMm(fits[k]) + (idx === topKeys.length - 1 ? gq : gl);
      });
      plan.qx = cx - chosen.q / 2; plan.qy = y; y += chosen.q + gq;
      chosen.cb.forEach(function (k) {
        if (k === "name" || k === "head") return;
        lines.push({ kind: k, text: texts2[k], pt: fits[k], w: textW(texts2[k], weights[k], fits[k], SANS_PS), x: cx, y: y + 0.92 * fits[k] * PT, weight: weights[k], dom: texts.dom });
        y += lineMm(fits[k]) + gl;
      });
      plan.q = chosen.q; plan.lines = lines;
      ["name", "head", "cap"].forEach(function (k) {
        if (chosen.cb.indexOf(k) < 0 && texts2[k]) plan.omitted.push(k === "name" ? "cafe name" : k === "head" ? "the headline" : texts.nfc ? "the NFC sign and its caption" : "“Scan for the menu”");
      });
    }
    plan.mod = plan.q / N;
    plan.ok = plan.mod >= MIN_MOD - 1e-9;
    return logoGuard(plan);
  }
  // the logo is left out where the dots are too small for it
  function logoGuard(plan) {
    if (plan.logo && plan.mod < LOGO_MIN_MOD - 1e-9) { plan.logo = null; plan.logoOff = true; }
    return plan;
  }
  // Width of the NFC line: the text with an arc sign on each side
  function fitNfc(text, maxPt, minPt, maxMm) {
    var w = textW(text, "700", maxPt, SANS_PS) + 2 * maxPt * PT * 1.5;
    if (w <= maxMm) return maxPt;
    var pt = Math.floor(maxPt * maxMm / w * 10) / 10;
    return pt >= minPt ? pt : 0;
  }
  // The dark sticker: navy, title, amber subtitle, white QR panel, NFC line, divider, accepted-payments line, web address, table number.
  // When the dots get too small it drops, in this order: the accepted-payments line (with its divider), the subtitle, the title, the NFC line.
  // The web address (the anti-fake check) is never dropped. Round stickers are not offered in this style.
  var DARK_FILL = { title: "#ffffff", sub: AMBER, nfc: AMBER, acc: "#e2e8f0", dom: "#cbd5e1", tbl: AMBER, tbldom: "#cbd5e1" };
  var DARK_OMIT = { title: "the title", sub: "the subtitle", nfc: "the NFC line", acc: "the accepted-payments line" };
  function stickerPlanDark(key, n, texts) {
    var P = PS[key], W = P.size + 2 * BLEED, N = n + 2 * QUIET, A = P.size - 2 * SAFE, T = texts.dark, DP = P.d, i;
    var plan = { key: key, W: W, n: n, ok: false, mod: 0, q: 0, lines: [], omitted: [], tblWord: texts.tblWord || "", nfc: !!texts.nfc, dark: true, logo: texts.logo || null };
    if (P.shape === "round") { plan.unsupported = true; return plan; }
    var fits = {
      title: T.title ? fitSpaced(T.title, "700", DP.title, 5, A, 0) : 0,
      sub: T.sub ? fitSpaced(T.sub, "700", DP.sub, 3.2, A, SPACED) : 0,
      nfc: T.nfc ? fitNfc(T.nfc, DP.nfc, 4, A) : 0,
      acc: T.acc ? fitSpaced(T.acc, "700", DP.acc, 3.6, A, 0) : 0,
      dom: fitSpaced(texts.dom, "700", P.domMax, 3.5, A, 0, true),
      tbl: texts.tbl ? fitSpaced(texts.tbl, "700", P.nameMax, 4.5, A, 0, true) : 0
    };
    var texts2 = { title: T.title, sub: T.sub, nfc: T.nfc, acc: T.acc, dom: texts.dom, tbl: texts.tbl };
    var ORDER = ["title", "sub", "qr", "nfc", "rule", "acc", "dom", "tbl"], RULE_H = 0.2;
    var DROPS = [[], ["acc"], ["acc", "sub"], ["acc", "sub", "title"], ["acc", "sub", "title", "nfc"]];
    function itemsFor(drop, merged) {
      return ORDER.filter(function (k) {
        if (drop.indexOf(k) >= 0) return false;
        if (k === "rule") return !!fits.acc && drop.indexOf("acc") < 0;
        if (k === "qr" || k === "dom") return !merged || k === "qr" ? true : false;
        if (k === "tbl") return !!fits.tbl && !merged;
        return !!fits[k];
      }).concat(merged ? ["tbldom"] : []);
    }
    var gapOf = function (a, b) { return a === "qr" || b === "qr" ? 1.2 : a === "rule" || b === "rule" ? 0.8 : a === "title" && b === "sub" ? 0.3 : 0.5; };
    function plan1(items, tbldomPt) {
      // dom / tbldom sit after the QR; sizes
      var hs = 0, gaps = 0, prev = null;
      items.forEach(function (k) {
        var hh = k === "qr" ? 0 : k === "rule" ? RULE_H : lineMm(k === "tbldom" ? tbldomPt : fits[k]);
        hs += hh; if (prev) gaps += gapOf(prev, k); prev = k;
      });
      var q = Math.min(A, A - hs - gaps);
      return { items: items, q: q, mod: q / N, tbldomPt: tbldomPt };
    }
    var chosen = null;
    for (i = 0; i < DROPS.length; i++) {
      var cand = plan1(itemsFor(DROPS[i], false), 0);
      chosen = cand; chosen.drop = DROPS[i];
      if (cand.mod >= MIN_MOD) break;
    }
    if (chosen.mod < MIN_MOD && texts.tbl) {   // "Table 5 \u00b7 web address" on one line saves a line, so the QR can be bigger
      var mtxt = texts.tbl + " \u00b7 " + texts.dom, mpt = fitSpaced(mtxt, "700", P.domMax, 3.5, A, 0);
      if (mpt) {
        var alt = plan1(itemsFor(DROPS[DROPS.length - 1], true), mpt);
        if (alt.mod > chosen.mod) { chosen = alt; chosen.drop = DROPS[DROPS.length - 1]; texts2.tbldom = mtxt; fits.tbldom = mpt; }
      }
    }
    var cx = W / 2, y = BLEED + SAFE, prevK = null, q = chosen.q;
    chosen.items.forEach(function (k) {
      if (prevK) y += gapOf(prevK, k);
      prevK = k;
      if (k === "qr") { plan.qx = cx - q / 2; plan.qy = y; y += q; return; }
      if (k === "rule") { var rw = Math.min(A, q) * 0.8; plan.rule = { x1: cx - rw / 2, x2: cx + rw / 2, y: y + RULE_H / 2 }; y += RULE_H; return; }
      var pt = k === "tbldom" ? chosen.tbldomPt : fits[k], tx = texts2[k], sp = k === "sub" ? SPACED : 0;
      plan.lines.push({ kind: k, text: tx, pt: pt, w: spacedW(tx, "700", pt, sp), x: cx, y: y + 0.92 * pt * PT, weight: "700", fill: DARK_FILL[k], sp: sp, dom: texts.dom });
      y += lineMm(pt);
    });
    plan.q = q;
    ["title", "sub", "nfc", "acc"].forEach(function (k) { if (texts2[k] && chosen.items.indexOf(k) < 0) plan.omitted.push(DARK_OMIT[k]); });
    plan.mod = plan.q / N;
    plan.ok = plan.mod >= MIN_MOD - 1e-9;
    return logoGuard(plan);
  }
  function stickerTexts() {
    var L = D.T[st.menu.l], t = { name: st.menu.n.trim(), cap: st.print.nfc ? nfcT().cap : L.scan, nfc: !!st.print.nfc, head: headOn() ? nfcT().head : "", dom: domainOf(cur ? cur.link : baseUrl() + "/m/") };
    if (st.print.numbers) { t.tblWord = L.table; t.tbl = L.table + " " + st.print.count; }   // sized for the highest table number; digits are all equally wide
    if (darkOn()) t.dark = darkTexts();
    if (st.print.logo && shopQr && logoModules(shopQr)) { var lt = logoLetter(); if (lt) t.logo = { letter: lt }; }
    return t;
  }
  // mode: "file" (SVG download: artwork + CutContour), "print" (PDF: artwork only), "preview" (adds guides)
  function stickerSvg(plan, q, mode, tableNo) {
    var P = PS[plan.key], W = plan.W, N = q.n + 2 * QUIET, m = plan.q / N, dark = !!plan.dark;
    var svg = s("svg", { xmlns: SVGNS, "xmlns:inkscape": "http://www.inkscape.org/namespaces/inkscape", width: W + "mm", height: W + "mm", viewBox: "0 0 " + W + " " + W });
    svg.appendChild(s("title", null, "QR menu sticker " + P.label));
    svg.appendChild(s("desc", null, "Artwork with " + BLEED + " mm bleed. Layer CutContour: 100% magenta stroke 0.25 pt, no fill, die-cut line at the trim edge."));
    var art = s("g", { id: "Artwork", "inkscape:groupmode": "layer", "inkscape:label": "Artwork" });
    art.appendChild(s("rect", { x: 0, y: 0, width: W, height: W, fill: dark ? NAVY : "#ffffff" }));
    // dark: the QR sits on a white panel with rounded corners (3 dots, so the rounding only cuts into the quiet zone)
    if (dark) art.appendChild(s("rect", { x: num(plan.qx, 4), y: num(plan.qy, 4), width: num(plan.q, 4), height: num(plan.q, 4), rx: num(3 * m, 4), ry: num(3 * m, 4), fill: "#ffffff" }));
    var qg = s("g", { transform: "translate(" + num(plan.qx, 4) + " " + num(plan.qy, 4) + ") scale(" + num(m, 5) + ")", "shape-rendering": "crispEdges" });
    if (!dark) qg.appendChild(s("rect", { width: N, height: N, fill: "#ffffff" }));
    qg.appendChild(s("path", { fill: "#000000", d: qrPath(q.qr, QUIET) }));
    var lk = plan.logo ? logoModules(q) : 0;
    if (lk) logoEls(qg, N, lk, plan.logo.letter);
    art.appendChild(qg);
    if (plan.rule) art.appendChild(s("line", { x1: num(plan.rule.x1, 3), x2: num(plan.rule.x2, 3), y1: num(plan.rule.y, 3), y2: num(plan.rule.y, 3), stroke: "#ffffff", "stroke-opacity": "0.25", "stroke-width": "0.2" }));
    plan.lines.forEach(function (ln) {
      var text = ln.text, w = ln.w;
      if (tableNo && (ln.kind === "tbl" || ln.kind === "tbldom")) {   // the plan is sized for the widest label; this table's own text is set at the same size
        text = plan.tblWord + " " + tableNo + (ln.kind === "tbldom" ? " \u00b7 " + ln.dom : ""); w = textW(text, ln.weight, ln.pt, SANS_PS);
      }
      var tx = ln.x;
      if (ln.kind === "nfc") {   // dark sticker: the text with the tap sign ((( ))) on both sides
        var dz = ln.pt * PT * 1.15, dg = ln.pt * PT * 0.35, dt = dz + dg + w + dg + dz, d0 = ln.x - dt / 2, ty = ln.y - 0.92 * ln.pt * PT;
        [[d0 + dz, -1], [d0 + dz + dg + w + dg, 1]].forEach(function (a, ix) {
          var ng = s("g", { id: ix ? "NFCSignR" : "NFCSignL", transform: "translate(" + num(a[0], 3) + " " + num(ty, 3) + ") scale(" + num(a[1] * dz / 24, 5) + " " + num(dz / 24, 5) + ")", fill: "none", stroke: AMBER, "stroke-width": "2.4", "stroke-linecap": "round" });
          NFC_ARCS.forEach(function (dd) { ng.appendChild(s("path", { d: dd })); });
          art.appendChild(ng);
        });
      }
      if (ln.kind === "cap" && plan.nfc) {   // the tap sign sits in front of the caption; the pair is centred
        var isz = ln.pt * PT * 1.15, gp = ln.pt * PT * 0.35, tot = isz + gp + w, sx = ln.x - tot / 2;
        tx = sx + isz + gp + w / 2;
        var ig = s("g", { id: "NFCSign", transform: "translate(" + num(sx, 3) + " " + num(ln.y - 0.92 * ln.pt * PT, 3) + ") scale(" + num(isz / 24, 5) + ")", fill: "none", stroke: "#000000", "stroke-width": "2.4", "stroke-linecap": "round" });
        NFC_ARCS.forEach(function (d) { ig.appendChild(s("path", { d: d })); });
        art.appendChild(ig);
      }
      var t = s("text", { x: num(tx, 3), y: num(ln.y, 3), "text-anchor": "middle", "font-family": SANS_PS, "font-weight": ln.weight, "font-size": num(ln.pt * PT, 3), fill: ln.fill || "#000000", textLength: num(w, 3), lengthAdjust: ln.sp ? "spacing" : "spacingAndGlyphs" }, text);
      art.appendChild(t);
    });
    svg.appendChild(art);
    if (mode !== "print") {
      var cut = s("g", { id: "CutContour", "inkscape:groupmode": "layer", "inkscape:label": "CutContour", fill: "none", stroke: "#ff00ff", "stroke-width": "0.0882" });
      if (P.shape === "round") cut.appendChild(s("circle", { cx: W / 2, cy: W / 2, r: P.size / 2 }));
      else cut.appendChild(s("rect", { x: BLEED, y: BLEED, width: P.size, height: P.size, rx: P.r, ry: P.r }));
      svg.appendChild(cut);
    }
    if (mode === "preview") {
      var gd = s("g", { id: "Guides", fill: "none", "stroke-width": "0.2", "stroke-dasharray": "1 1" });
      gd.appendChild(s("rect", { x: 0.1, y: 0.1, width: W - 0.2, height: W - 0.2, stroke: "#d33" }));
      if (P.shape === "round") gd.appendChild(s("circle", { cx: W / 2, cy: W / 2, r: P.size / 2 - SAFE, stroke: "#1a73e8" }));
      else gd.appendChild(s("rect", { x: BLEED + SAFE, y: BLEED + SAFE, width: P.size - 2 * SAFE, height: P.size - 2 * SAFE, rx: Math.max(0, P.r - SAFE), stroke: "#1a73e8" }));
      svg.appendChild(gd);
    }
    return svg;
  }
  function currentPlan() {
    if (!shopQr) return null;
    return stickerPlan(st.shop.size, shopQr.n, stickerTexts());
  }
  function renderShop() {
    var box = $("shopPrev"), info = $("shopInfo"), warn = $("shopWarn"), grid = $("shopSizes");
    warn.hidden = true; warn.textContent = ""; box.textContent = "";
    shopQr = null; var overflow = false, nums = st.print.numbers;
    shopTable = Math.max(1, Math.min(st.print.count, shopTable));
    $("shopTableBox").hidden = !nums; $("shopTable").max = String(st.print.count);
    if (document.activeElement !== $("shopTable")) $("shopTable").value = shopTable;
    if (cur) {
      var lq = qrFor(nums ? withTable(cur.link, st.print.count) : cur.link, "H");
      if (lq && lq.level === "H") shopQr = lq; else overflow = true;
    }
    Array.prototype.forEach.call(grid.querySelectorAll("label.qb-layout"), function (lab) {
      var k = lab.querySelector("input").value, sm = lab.querySelector("small");
      lab.querySelector("input").checked = st.shop.size === k;
      sm.className = ""; sm.removeAttribute("data-ok"); sm.removeAttribute("data-mod");
      if (shopQr) {
        var pl = stickerPlan(k, shopQr.n, stickerTexts());
        sm.textContent = pl.unsupported ? "Light style only" : pl.ok ? "Dots " + num(pl.mod, 2) + " mm \u00b7 fits" : "Dots " + num(pl.mod, 2) + " mm \u00b7 too small";
        if (!pl.ok) sm.className = "bad";
        sm.setAttribute("data-ok", pl.ok ? "1" : "0"); sm.setAttribute("data-mod", num(pl.mod, 3));
      } else sm.textContent = overflow ? "Link too long for H" : "Needs a QR code first";
    });
    if (!shopQr) {
      info.textContent = "";
      toggleOff(["btnShopPdf", "btnShopSvg"], true);
      box.appendChild(h("p", { class: "qb-muted qb-center" }, "The sticker preview appears when the QR code is ready."));
      if (overflow) {
        warn.hidden = false;
        warn.textContent = "This menu link is too long for a sticker QR at error correction H. Use Live mode (a short link) or a bigger sticker.";
      }
      return;
    }
    var plan = currentPlan();
    if (plan.unsupported) {   // the round sticker has no dark version
      box.appendChild(h("p", { class: "qb-muted qb-center" }, "The dark card comes in square sizes."));
      info.textContent = ""; info.removeAttribute("data-module-mm"); info.setAttribute("data-ok", "0");
      warn.hidden = false; warn.textContent = "The round sticker comes in the light style only. Choose a square size for the dark card, or set the style to Light.";
      toggleOff(["btnShopPdf", "btnShopSvg"], true);
      return;
    }
    box.appendChild(stickerSvg(plan, shopQrFor(shopTable), "preview", nums ? shopTable : 0));
    info.textContent = "QR version " + shopQr.version + " at error correction H · " + shopQr.n + " × " + shopQr.n + " dots · each dot " + num(plan.mod, 2) + " mm (minimum " + MIN_MOD + " mm) · QR " + num(plan.q, 1) + " mm wide incl. quiet zone · page " + plan.W + " × " + plan.W + " mm (sticker + " + BLEED + " mm bleed)."
      + (nums ? " Numbered: " + st.print.count + " stickers, each with its own QR code. The size check uses table " + st.print.count + ", the longest link." : "");
    info.setAttribute("data-module-mm", num(plan.mod, 3)); info.setAttribute("data-ok", plan.ok ? "1" : "0");
    var notes = [];
    if (!plan.ok) {
      notes.push("The dots would be only " + num(plan.mod, 2) + " mm wide, below the " + MIN_MOD + " mm minimum for a sticker. Choose a bigger sticker, or use Live mode (a shorter link, so bigger dots).");
    } else if (plan.omitted.length) notes.push("To keep the dots big, this sticker leaves out: " + plan.omitted.join(" and ") + ".");
    if (notes.length) { warn.hidden = false; warn.textContent = notes.join(" "); }
    toggleOff(["btnShopPdf", "btnShopSvg"], !plan.ok);
  }
  // the QR (error correction H) of one table's sticker; table 0 = the plain link
  function shopQrFor(n) { return qrFor(n ? withTable(cur.link, n) : cur.link, "H"); }
  // One page per sticker. Numbered: one page per table, each with its own QR and its "Table N" line.
  function shopPrint() {
    var plan = currentPlan(); if (!plan || !plan.ok) return;
    var P = PS[plan.key], root = $("printRoot"); root.textContent = "";
    var nums = st.print.numbers, count = nums ? st.print.count : 1;
    for (var n = 1; n <= count; n++) {
      var sheet = h("div", { class: "sheet sheet-ps " + P.cls });
      sheet.style.width = plan.W + "mm"; sheet.style.height = plan.W + "mm";
      sheet.appendChild(stickerSvg(plan, nums ? shopQrFor(n) : shopQr, "print", nums ? n : 0));
      root.appendChild(sheet);
    }
    window.print();
  }
  function shopSvgDownload() {
    var plan = currentPlan(); if (!plan || !plan.ok) return;
    var nums = st.print.numbers;
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(stickerSvg(plan, nums ? shopQrFor(shopTable) : shopQr, "file", nums ? shopTable : 0));
    download(new Blob([xml], { type: "image/svg+xml" }), "sticker-" + plan.key + (plan.dark ? "-dark-" : "-") + slug(st.menu.n) + (nums ? "-table-" + shopTable : "") + ".svg");
  }

  // ---------- tabs, layouts, wiring ----------
  function applyMode() {
    var live = st.out.mode === "live";
    $("tabLink").setAttribute("aria-selected", live ? "false" : "true");
    $("tabLive").setAttribute("aria-selected", live ? "true" : "false");
    $("panelLink").hidden = live; $("panelLive").hidden = !live;
    $("liveLink").value = st.out.live; $("liveTab").value = st.out.tab; $("ec").value = st.out.ec; $("billsTab").value = st.out.bt;
    if (st.out.tab) $("tabBox").open = true;
    renderPayStep();
  }
  function buildShopSizes() {
    var grid = $("shopSizes"); grid.textContent = "";
    Object.keys(PS).forEach(function (k) {
      var lab = h("label", { class: "qb-layout" });
      var inp = h("input", { type: "radio", name: "shopsize", value: k });
      var bx = h("span", { class: "box" }); bx.appendChild(h("b", null, PS[k].label)); bx.appendChild(h("small", null, ""));
      lab.appendChild(inp); lab.appendChild(bx); grid.appendChild(lab);
      inp.addEventListener("change", function () { st.shop.size = k; renderShop(); syncNfcBoxes(); saveDraft(); });
    });
  }
  function buildLayouts() {
    var box = $("layouts"); box.textContent = "";
    Object.keys(LAYOUTS).forEach(function (k) {
      var L = LAYOUTS[k], lab = h("label", { class: "qb-layout" });
      var inp = h("input", { type: "radio", name: "layout", value: k }); inp.checked = st.print.layout === k;
      var bx = h("span", { class: "box" }); bx.appendChild(h("b", null, L.label)); bx.appendChild(h("small", null, L.note));
      lab.appendChild(inp); lab.appendChild(bx); box.appendChild(lab);
      inp.addEventListener("change", function () { st.print.layout = k; renderSheetPreview(); syncNfcBoxes(); saveDraft(); });
    });
  }
  function applyPrint() {
    syncNumControls(); syncNfcBoxes();
    $("printLine").value = st.print.line;
    buildLayouts();
  }
  function afterOutput() { syncNfcBoxes(); renderSheetPreview(); renderShop(); syncNfcBoxes(); renderNfc(); }

  var changed = (function () {
    var t = null;
    return function () {
      saveDraft();
      clearTimeout(t);
      t = setTimeout(function () { previewUpdate(); refreshOutput(); }, 130);
    };
  })();
  function applyAll(skipSave) {
    applyStep1(); applyPay(); applyMode(); applyPrint(); renderEditor();
    previewUpdate(); refreshOutput(); if (!skipSave) saveDraft();
  }

  function copyLink() {
    if (!cur) return;
    var text = cur.link, done = function () { var b = $("btnCopy"); b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy link"; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var ta = $("linkOut"); ta.focus(); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { /* user can copy by hand */ } }
  }

  function init() {
    loadDraft();
    buildStep1();
    buildShopSizes();
    var box = $("sections");
    box.addEventListener("click", onEditorClick);
    box.addEventListener("input", onEditorInput);
    box.addEventListener("change", onEditorInput);
    box.addEventListener("toggle", onEditorToggle, true);
    $("btnAddSection").addEventListener("click", function () {
      if (st.menu.s.length >= MAX_SECTIONS) return showMsg("A menu can have up to " + MAX_SECTIONS + " sections.", false);
      st.menu.s.push(newSection()); focusAfter = '.qb-sec[data-s="' + (st.menu.s.length - 1) + '"] [data-f="st"]'; renderEditor(); changed();
    });
    $("btnExample").addEventListener("click", loadExample);
    $("btnBento").addEventListener("click", importBento);
    $("btnImport").addEventListener("click", function () { $("fileImport").click(); });
    $("fileImport").addEventListener("change", function (e) { importJsonFile(e.target.files[0]); e.target.value = ""; });
    $("btnExport").addEventListener("click", exportJson);
    $("btnClear").addEventListener("click", clearMenu);
    $("btnDeleteDraft").addEventListener("click", deleteDraft);

    $("tabLink").addEventListener("click", function () { st.out.mode = "link"; applyMode(); refreshOutput(); saveDraft(); });
    $("tabLive").addEventListener("click", function () { st.out.mode = "live"; applyMode(); refreshOutput(); saveDraft(); });
    $("liveLink").addEventListener("input", function (e) { st.out.live = e.target.value.slice(0, 600); refreshOutput(); saveDraft(); });
    $("liveTab").addEventListener("input", function (e) { st.out.tab = e.target.value.slice(0, 100); refreshOutput(); saveDraft(); });
    $("btnPrevReload").addEventListener("click", function () {
      if (!liveWant) return;
      liveShown = { key: "", search: "" }; liveRes = null; livePreview(liveWant); refreshOutput();
    });
    window.addEventListener("message", onLiveMessage);
    $("ec").addEventListener("change", function (e) { st.out.ec = e.target.value; refreshOutput(); saveDraft(); });
    $("btnCopy").addEventListener("click", copyLink);
    $("btnSvg").addEventListener("click", function () { if (cur) download(new Blob([qrSvgFile(cur.q)], { type: "image/svg+xml" }), "qr-menu-" + slug(st.menu.n) + ".svg"); });
    $("btnPng").addEventListener("click", function () { if (cur) qrPngBlob(cur.q, function (b) { download(b, "qr-menu-" + slug(st.menu.n) + ".png"); }); });
    $("btnOpen").addEventListener("click", function (e) { if (!cur) e.preventDefault(); });

    // Numbered cards change the QR codes on the sheets and stickers (tb=N), and in live mode the address of the preview page
    function numbersChanged() { renderSheetPreview(); renderShop(); syncNfcBoxes(); renderNfc(); if (st.out.mode === "live") refreshOutput(); previewUpdate(); saveDraft(); }
    ["numOn", "nfcNumOn"].forEach(function (id) { $(id).addEventListener("change", function (e) { st.print.numbers = e.target.checked; numbersChanged(); }); });
    ["numCount", "nfcCount"].forEach(function (id) {
      $(id).addEventListener("input", function (e) {
        var v = parseInt(e.target.value, 10); if (!(v >= 1)) v = 1; if (v > MAX_TABLES) v = MAX_TABLES;
        st.print.count = v; numbersChanged();
      });
    });
    function nfcChanged() { syncNfcBoxes(); renderSheetPreview(); renderShop(); saveDraft(); }
    ["nfcSign", "shopNfcSign"].forEach(function (id) { $(id).addEventListener("change", function (e) { st.print.nfc = e.target.checked; nfcChanged(); }); });
    ["nfcHead", "shopNfcHead"].forEach(function (id) { $(id).addEventListener("change", function (e) { st.print.head = e.target.checked; nfcChanged(); }); });
    function styleChanged() { syncNfcBoxes(); renderSheetPreview(); renderShop(); syncNfcBoxes(); saveDraft(); }
    ["styleSel", "shopStyleSel"].forEach(function (id) { $(id).addEventListener("change", function (e) { st.print.style = e.target.value === "dark" ? "dark" : "light"; styleChanged(); }); });
    ["accOn", "shopAccOn"].forEach(function (id) { $(id).addEventListener("change", function (e) { st.print.accOn = e.target.checked; styleChanged(); }); });
    ["accText", "shopAccText"].forEach(function (id) { $(id).addEventListener("input", function (e) { st.print.acc = e.target.value.slice(0, 40); styleChanged(); }); });
    ["logoOn", "shopLogoOn"].forEach(function (id) { $(id).addEventListener("change", function (e) { st.print.logo = e.target.checked; styleChanged(); }); });
    $("btnNfcCopy").addEventListener("click", copyNfc);
    $("shopTable").addEventListener("input", function (e) { var v = parseInt(e.target.value, 10); if (v >= 1) { shopTable = Math.min(v, st.print.count); renderShop(); } });
    $("shopTable").addEventListener("change", function () { $("shopTable").value = shopTable; });

    $("payOn").addEventListener("change", function (e) { st.pay.on = e.target.checked; renderPayStep(); changed(); });
    $("payTerminal").addEventListener("change", function (e) { st.pay.terminal = e.target.checked; renderPayStep(); changed(); });
    [["payTips", "tips"], ["payLink", "link"], ["payBlik", "blik"], ["payNote", "note"], ["payReview", "review"], ["payWhatsapp", "whatsapp"], ["payEmail", "email"]].forEach(function (f) {
      $(f[0]).addEventListener("input", function (e) { st.pay[f[1]] = e.target.value; renderPayStep(); changed(); });
    });
    $("billsTab").addEventListener("input", function (e) { st.out.bt = e.target.value.slice(0, 100); refreshOutput(); saveDraft(); });
    $("pvSwitch").addEventListener("click", function (e) { var b = e.target.closest("button[data-view]"); if (b) setPvView(b.getAttribute("data-view")); });
    $("printLine").addEventListener("input", function (e) { st.print.line = e.target.value; renderSheetPreview(); renderShop(); syncNfcBoxes(); saveDraft(); });
    $("btnPrint").addEventListener("click", doPrint);
    $("btnShopPdf").addEventListener("click", shopPrint);
    $("btnShopSvg").addEventListener("click", shopSvgDownload);
    window.addEventListener("afterprint", function () { $("printRoot").textContent = ""; });
    if (window.ResizeObserver) new ResizeObserver(debounce(renderSheetPreview, 120)).observe($("sheetPrev"));

    var tpl = $("tplLine");
    if (/^https:\/\//.test(TEMPLATE_URL)) { var a = h("a", { href: TEMPLATE_URL, target: "_blank", rel: "noopener noreferrer" }, "Get the ready-made template (Etsy)"); tpl.appendChild(a); }

    var f = $("previewFrame");
    f.addEventListener("load", previewUpdate);
    applyAll(true);
  }

  window.QRB = {
    getMenu: toSchema, getPay: payConfig, withTable: withTable, tableQr: function (n, level) { if (!cur) return null; var l = withTable(cur.link, n), q = qrFor(l, level || st.out.ec); return q ? { link: l, n: q.n, level: q.level } : null; }, getLongestQr: printLongest, getLink: function () { return cur ? cur.link : ""; }, getQr: function () { return cur ? cur.q : null; },
    example: function () { return clone(EXAMPLE); }, state: function () { return st; }, live: function () { return { shown: liveShown.search, result: liveRes }; }, TEMPLATE_URL: TEMPLATE_URL,
    stickerPlan: function (key, n, texts) { return stickerPlan(key, n, texts); }, PS: PS, LAYOUTS: LAYOUTS,
    logoModules: function (q) { return logoModules(q); }, DARK_T: DARK_T, cardQrMm: cardQrMm,
    // for tests: the QR of any text at error correction H with the centre logo, as the cards draw it (SVG text)
    qrWithLogo: function (text, letter, area) {
      var q = makeQr(text, "H"); if (!q || q.level !== "H") return null;
      var svg = qrSvgEl(q, 0), k = letter ? logoModules(q, area) : 0;
      if (k) logoEls(svg, q.n + 2 * QUIET, k, letter);
      return { svg: new XMLSerializer().serializeToString(svg), n: q.n, k: k, version: q.version };
    }
  };
  init();
})();
