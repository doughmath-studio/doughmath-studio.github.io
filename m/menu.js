/* DoughMath Studio · QR table menu · guest viewer
 * No tracking, no cookies, no analytics, no third-party scripts.
 * Two ways to get the menu (both static):
 *   A) link mode : /m/#1<base64url(deflate-raw(JSON))>   (the menu lives inside the link)
 *   B) live mode : /m/?s=<published sheet id>&g=<gid>    (CSV of the owner's published Google Sheet)
 * All owner text is inserted with textContent only (never innerHTML).
 */
(function (global) {
  "use strict";

  var HOME = "https://doughmath-studio.github.io/qr/";
  var LANGS = ["en", "es", "pt", "fr", "de", "pl", "uk", "ru"];
  var LOCALES = { en: "en-US", es: "es-ES", pt: "pt-PT", fr: "fr-FR", de: "de-DE", pl: "pl-PL", uk: "uk-UA", ru: "ru-RU" };
  var THEMES = ["espresso", "pistachio", "berry", "mono"];
  var THEME_COLORS = { espresso: "#2a1d17", pistachio: "#f2f5e8", berry: "#fff3f6", mono: "#ffffff" };
  var TAGS = ["V", "VG", "GF", "spicy"];
  var LIMITS = { sections: 60, items: 600, name: 160, title: 120, desc: 600, footer: 400, priceText: 40, json: 1048576 };

  // ---------- Labels (8 languages). Menu content itself is the owner's text. ----------
  var T = {
    en: {
      name: "English", menu: "Menu", allergens: "Allergens", soldOut: "Sold out", loading: "Loading the menu…", retry: "Try again",
      ask: "Allergy or special diet? Please ask our staff.",
      oldBrowser: "Update your browser to see this menu.",
      badLink: "This menu link looks damaged or incomplete. Please ask for a new QR code.",
      noMenu: "There is no menu to show here yet.",
      netErr: "The menu could not be loaded. Check your connection and try again.",
      csvErr: "The menu could not be read. Please let the staff know.",
      empty: "No dishes on this menu yet.",
      framed: "For your safety, this menu is shown only on its own page.", open: "Open the menu",
      scan: "Scan for the menu", table: "Table",
      tags: { V: "Vegetarian", VG: "Vegan", GF: "Gluten-free", spicy: "Spicy" },
      a: ["Cereals containing gluten", "Crustaceans", "Eggs", "Fish", "Peanuts", "Soybeans", "Milk", "Tree nuts", "Celery", "Mustard", "Sesame", "Sulphites", "Lupin", "Molluscs"]
    },
    es: {
      name: "Español", menu: "Carta", allergens: "Alérgenos", soldOut: "Agotado", loading: "Cargando la carta…", retry: "Reintentar",
      ask: "¿Alergia o dieta especial? Pregunta a nuestro personal.",
      oldBrowser: "Actualiza tu navegador para ver esta carta.",
      badLink: "El enlace de esta carta parece dañado o incompleto. Pide un código QR nuevo.",
      noMenu: "Todavía no hay carta que mostrar.",
      netErr: "No se pudo cargar la carta. Comprueba tu conexión e inténtalo de nuevo.",
      csvErr: "No se pudo leer la carta. Avisa al personal.",
      empty: "Todavía no hay platos en esta carta.",
      framed: "Por tu seguridad, esta carta solo se muestra en su propia página.", open: "Abrir la carta",
      scan: "Escanea para ver la carta", table: "Mesa",
      tags: { V: "Vegetariano", VG: "Vegano", GF: "Sin gluten", spicy: "Picante" },
      a: ["Cereales con gluten", "Crustáceos", "Huevos", "Pescado", "Cacahuetes", "Soja", "Leche", "Frutos de cáscara", "Apio", "Mostaza", "Sésamo", "Sulfitos", "Altramuces", "Moluscos"]
    },
    pt: {
      name: "Português", menu: "Menu", allergens: "Alergénios", soldOut: "Esgotado", loading: "A carregar o menu…", retry: "Tentar novamente",
      ask: "Alergia ou dieta especial? Pergunte à nossa equipa.",
      oldBrowser: "Atualize o seu navegador para ver este menu.",
      badLink: "O link deste menu parece danificado ou incompleto. Peça um novo código QR.",
      noMenu: "Ainda não há menu para mostrar.",
      netErr: "Não foi possível carregar o menu. Verifique a ligação e tente novamente.",
      csvErr: "Não foi possível ler o menu. Avise a equipa.",
      empty: "Ainda não há pratos neste menu.",
      framed: "Para sua segurança, este menu só é mostrado na sua própria página.", open: "Abrir o menu",
      scan: "Digitalize para ver o menu", table: "Mesa",
      tags: { V: "Vegetariano", VG: "Vegano", GF: "Sem glúten", spicy: "Picante" },
      a: ["Cereais com glúten", "Crustáceos", "Ovos", "Peixe", "Amendoins", "Soja", "Leite", "Frutos de casca rija", "Aipo", "Mostarda", "Sésamo", "Sulfitos", "Tremoços", "Moluscos"]
    },
    fr: {
      name: "Français", menu: "Carte", allergens: "Allergènes", soldOut: "Épuisé", loading: "Chargement de la carte…", retry: "Réessayer",
      ask: "Allergie ou régime particulier ? Demandez à notre équipe.",
      oldBrowser: "Mettez à jour votre navigateur pour voir cette carte.",
      badLink: "Le lien de cette carte semble abîmé ou incomplet. Demandez un nouveau QR code.",
      noMenu: "Aucune carte à afficher pour le moment.",
      netErr: "Impossible de charger la carte. Vérifiez votre connexion et réessayez.",
      csvErr: "Impossible de lire la carte. Prévenez l’équipe.",
      empty: "Aucun plat sur cette carte pour le moment.",
      framed: "Pour votre sécurité, cette carte s’affiche uniquement sur sa propre page.", open: "Ouvrir la carte",
      scan: "Scannez pour voir la carte", table: "Table",
      tags: { V: "Végétarien", VG: "Végan", GF: "Sans gluten", spicy: "Épicé" },
      a: ["Céréales contenant du gluten", "Crustacés", "Œufs", "Poisson", "Arachides", "Soja", "Lait", "Fruits à coque", "Céleri", "Moutarde", "Sésame", "Sulfites", "Lupin", "Mollusques"]
    },
    de: {
      name: "Deutsch", menu: "Speisekarte", allergens: "Allergene", soldOut: "Ausverkauft", loading: "Speisekarte wird geladen…", retry: "Erneut versuchen",
      ask: "Allergie oder besondere Ernährung? Bitte fragen Sie unser Personal.",
      oldBrowser: "Aktualisieren Sie Ihren Browser, um diese Speisekarte zu sehen.",
      badLink: "Der Link zu dieser Speisekarte scheint beschädigt oder unvollständig zu sein. Bitte fragen Sie nach einem neuen QR-Code.",
      noMenu: "Hier gibt es noch keine Speisekarte.",
      netErr: "Die Speisekarte konnte nicht geladen werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      csvErr: "Die Speisekarte konnte nicht gelesen werden. Bitte sagen Sie dem Personal Bescheid.",
      empty: "Diese Speisekarte enthält noch keine Gerichte.",
      framed: "Zu Ihrer Sicherheit wird diese Speisekarte nur auf ihrer eigenen Seite angezeigt.", open: "Speisekarte öffnen",
      scan: "Scannen für die Speisekarte", table: "Tisch",
      tags: { V: "Vegetarisch", VG: "Vegan", GF: "Glutenfrei", spicy: "Scharf" },
      a: ["Glutenhaltiges Getreide", "Krebstiere", "Eier", "Fisch", "Erdnüsse", "Soja", "Milch", "Schalenfrüchte", "Sellerie", "Senf", "Sesam", "Sulfite", "Lupine", "Weichtiere"]
    },
    pl: {
      name: "Polski", menu: "Menu", allergens: "Alergeny", soldOut: "Wyprzedane", loading: "Ładowanie menu…", retry: "Spróbuj ponownie",
      ask: "Alergia lub specjalna dieta? Zapytaj obsługę.",
      oldBrowser: "Zaktualizuj przeglądarkę, aby zobaczyć to menu.",
      badLink: "Link do tego menu wygląda na uszkodzony lub niepełny. Poproś o nowy kod QR.",
      noMenu: "Nie ma tu jeszcze menu do wyświetlenia.",
      netErr: "Nie udało się wczytać menu. Sprawdź połączenie i spróbuj ponownie.",
      csvErr: "Nie udało się odczytać menu. Powiadom obsługę.",
      empty: "W tym menu nie ma jeszcze dań.",
      framed: "Dla Twojego bezpieczeństwa to menu wyświetla się tylko na własnej stronie.", open: "Otwórz menu",
      scan: "Zeskanuj, aby zobaczyć menu", table: "Stolik",
      tags: { V: "Wegetariańskie", VG: "Wegańskie", GF: "Bez glutenu", spicy: "Ostre" },
      a: ["Zboża zawierające gluten", "Skorupiaki", "Jaja", "Ryby", "Orzeszki ziemne", "Soja", "Mleko", "Orzechy", "Seler", "Gorczyca", "Sezam", "Siarczyny", "Łubin", "Mięczaki"]
    },
    uk: {
      name: "Українська", menu: "Меню", allergens: "Алергени", soldOut: "Закінчилось", loading: "Завантаження меню…", retry: "Спробувати ще раз",
      ask: "Алергія чи особлива дієта? Запитайте наш персонал.",
      oldBrowser: "Оновіть браузер, щоб побачити це меню.",
      badLink: "Посилання на це меню виглядає пошкодженим або неповним. Попросіть новий QR-код.",
      noMenu: "Меню тут ще немає.",
      netErr: "Не вдалося завантажити меню. Перевірте з’єднання й спробуйте ще раз.",
      csvErr: "Не вдалося прочитати меню. Повідомте персонал.",
      empty: "У цьому меню ще немає страв.",
      framed: "Для вашої безпеки це меню відображається лише на власній сторінці.", open: "Відкрити меню",
      scan: "Скануйте, щоб побачити меню", table: "Столик",
      tags: { V: "Вегетаріанське", VG: "Веганське", GF: "Без глютену", spicy: "Гостре" },
      a: ["Злаки, що містять глютен", "Ракоподібні", "Яйця", "Риба", "Арахіс", "Соя", "Молоко", "Горіхи", "Селера", "Гірчиця", "Кунжут", "Сульфіти", "Люпин", "Молюски"]
    },
    ru: {
      name: "Русский", menu: "Меню", allergens: "Аллергены", soldOut: "Закончилось", loading: "Загрузка меню…", retry: "Повторить",
      ask: "Аллергия или особая диета? Спросите наш персонал.",
      oldBrowser: "Обновите браузер, чтобы увидеть это меню.",
      badLink: "Ссылка на это меню выглядит повреждённой или неполной. Попросите новый QR-код.",
      noMenu: "Меню здесь пока нет.",
      netErr: "Не удалось загрузить меню. Проверьте соединение и попробуйте ещё раз.",
      csvErr: "Не удалось прочитать меню. Сообщите персоналу.",
      empty: "В этом меню пока нет блюд.",
      framed: "Для вашей безопасности это меню показывается только на своей странице.", open: "Открыть меню",
      scan: "Сканируйте, чтобы увидеть меню", table: "Столик",
      tags: { V: "Вегетарианское", VG: "Веганское", GF: "Без глютена", spicy: "Острое" },
      a: ["Злаки, содержащие глютен", "Ракообразные", "Яйца", "Рыба", "Арахис", "Соя", "Молоко", "Орехи", "Сельдерей", "Горчица", "Кунжут", "Сульфиты", "Люпин", "Моллюски"]
    }
  };

  // ---------- small helpers ----------
  function clip(v, n) { v = v == null ? "" : String(v); v = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ""); return v.length > n ? v.slice(0, n) : v; }
  function pickLang(l) {
    l = String(l || "").toLowerCase().slice(0, 2);
    return LANGS.indexOf(l) >= 0 ? l : "en";
  }
  function browserLang() {
    var nav = (typeof navigator !== "undefined") ? navigator : {};
    var list = nav.languages && nav.languages.length ? nav.languages : [nav.language || "en"];
    for (var i = 0; i < list.length; i++) { var l = String(list[i]).toLowerCase().slice(0, 2); if (LANGS.indexOf(l) >= 0) return l; }
    return "en";
  }

  // ---------- normalize: the only gate between untrusted data and the page ----------
  function normalize(raw) {
    var r = raw && typeof raw === "object" ? raw : {};
    var out = {
      v: 1,
      n: clip(r.n, LIMITS.name),
      c: clip(r.c, 12).trim(),
      l: pickLang(r.l),
      t: THEMES.indexOf(r.t) >= 0 ? r.t : "espresso",
      f: clip(r.f, LIMITS.footer),
      s: []
    };
    var total = 0;
    var secs = Array.isArray(r.s) ? r.s.slice(0, LIMITS.sections) : [];
    secs.forEach(function (sec) {
      if (!sec || typeof sec !== "object") return;
      var o = { t: clip(sec.t, LIMITS.title), i: [] };
      (Array.isArray(sec.i) ? sec.i : []).forEach(function (it) {
        if (!it || typeof it !== "object" || total >= LIMITS.items) return;
        var n = clip(it.n, LIMITS.name);
        if (!n.trim()) return;
        total++;
        var x = { n: n };
        if (typeof it.p === "number" && isFinite(it.p) && it.p >= 0) x.p = it.p;
        else if (typeof it.p === "string" && it.p.trim()) x.p = clip(it.p, LIMITS.priceText);
        var d = clip(it.d, LIMITS.desc);
        if (d.trim()) x.d = d;
        var a = [];
        (Array.isArray(it.a) ? it.a : []).forEach(function (k) {
          k = parseInt(k, 10);
          if (k >= 1 && k <= 14 && a.indexOf(k) < 0) a.push(k);
        });
        a.sort(function (p, q) { return p - q; });
        if (a.length) x.a = a;
        var g = [];
        (Array.isArray(it.g) ? it.g : []).forEach(function (k) { if (TAGS.indexOf(k) >= 0 && g.indexOf(k) < 0) g.push(k); });
        if (g.length) x.g = g;
        if (it.x === 1 || it.x === true || it.x === "1") x.x = 1;
        o.i.push(x);
      });
      out.s.push(o);
    });
    return out;
  }

  // ---------- link codec: base64url(deflate-raw(JSON)); "0" prefix = same JSON without compression ----------
  function bytesToB64url(bytes) {
    var s = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlToBytes(str) {
    str = String(str).replace(/[^A-Za-z0-9_\-+\/]/g, "").replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function pump(bytes, ts, cap) {
    var w = ts.writable.getWriter();
    w.write(bytes).catch(function () {});
    w.close().catch(function () {});
    var rd = ts.readable.getReader(), chunks = [], total = 0;
    function step() {
      return rd.read().then(function (res) {
        if (res.done) {
          var out = new Uint8Array(total), off = 0;
          chunks.forEach(function (c) { out.set(c, off); off += c.length; });
          return out;
        }
        total += res.value.length;
        if (cap && total > cap) { try { rd.cancel(); } catch (e) { /* ignore */ } throw new Error("too big"); }
        chunks.push(res.value);
        return step();
      });
    }
    return step();
  }
  function canCompress() { try { return typeof CompressionStream === "function" && !!new CompressionStream("deflate-raw"); } catch (e) { return false; } }
  function canDecompress() { try { return typeof DecompressionStream === "function" && !!new DecompressionStream("deflate-raw"); } catch (e) { return false; } }
  function utf8Bytes(s) { return new TextEncoder().encode(s); }

  // menu object (schema keys) -> payload string ("1..." or "0..." when the browser cannot compress)
  function encodePayload(menu) {
    var raw = utf8Bytes(JSON.stringify(menu));
    if (!canCompress()) return Promise.resolve("0" + bytesToB64url(raw));
    return pump(raw, new CompressionStream("deflate-raw")).then(function (z) { return "1" + bytesToB64url(z); });
  }
  function fail(code) { var e = new Error(code); e.code = code; return e; }
  // payload string -> Promise<menu object>, rejects with .code = "old" | "bad"
  function decodePayload(payload) {
    return new Promise(function (resolve, reject) {
      var kind = payload.charAt(0), body = payload.slice(1);
      if ((kind !== "0" && kind !== "1") || !body) return reject(fail("bad"));
      var bytes;
      try { bytes = b64urlToBytes(body); } catch (e) { return reject(fail("bad")); }
      function finish(u8) {
        try {
          var obj = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(u8));
          if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw 0;
          resolve(obj);
        } catch (e) { reject(fail("bad")); }
      }
      if (kind === "0") {
        if (bytes.length > LIMITS.json) return reject(fail("bad"));
        return finish(bytes);
      }
      if (!canDecompress()) return reject(fail("old"));
      pump(bytes, new DecompressionStream("deflate-raw"), LIMITS.json).then(finish, function () { reject(fail("bad")); });
    });
  }

  // ---------- CSV (RFC 4180: quotes, commas and newlines inside quotes, "" escapes) ----------
  function parseCsv(text) {
    text = String(text == null ? "" : text).replace(/^﻿/, "");
    var rows = [], row = [], cell = "", i = 0, n = text.length, q = false;
    while (i < n) {
      var ch = text.charAt(i);
      if (q) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { cell += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        cell += ch; i++; continue;
      }
      if (ch === '"' && cell === "") { q = true; i++; continue; }
      if (ch === ",") { row.push(cell); cell = ""; i++; continue; }
      if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && text.charAt(i + 1) === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = ""; i++; continue;
      }
      cell += ch; i++;
    }
    if (q) throw new Error("unterminated quote");
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  var LANG_NAMES = { english: "en", spanish: "es", "español": "es", espanol: "es", portuguese: "pt", "português": "pt", portugues: "pt", french: "fr", "français": "fr", francais: "fr", german: "de", deutsch: "de", polish: "pl", polski: "pl", ukrainian: "uk", "українська": "uk", russian: "ru", "русский": "ru" };
  var TAG_ALIASES = { v: "V", veg: "V", vegetarian: "V", vegetarisch: "V", vg: "VG", vegan: "VG", gf: "GF", "gluten-free": "GF", glutenfree: "GF", "gluten free": "GF", spicy: "spicy", hot: "spicy" };
  var HEAD_ALIASES = { section: "section", category: "section", item: "item", name: "item", dish: "item", price: "price", description: "description", desc: "description", allergens: "allergens", allergen: "allergens", tags: "tags", tag: "tags", diet: "tags", sold_out: "sold_out", "sold out": "sold_out", soldout: "sold_out", "sold-out": "sold_out" };
  var SET_ALIASES = { name: "name", cafe: "name", "café": "name", title: "name", currency: "currency", language: "language", lang: "language", theme: "theme", footer: "footer" };
  var SOLD_RE = /^(yes|y|true|1|x|tak|да|si|sí|oui|ja|sim)$/i;

  // A price cell: a number with "," or "." decimals, optional thousands separators, optionally with a currency sign or code before or after it
  // ("12,50 zł", "€ 4.25", "1 200 Ft", "PLN 9"). Anything else ("from 12", "2 for 5", "market price") stays as text.
  var CUR_TOKEN = /^(?:[€$£¥₴₽₺₹₸₪]|[a-z]{3}|zł|zl|kč|kc|ft|kr|грн|руб|р|лв|lei|fr|c\$|a\$|r\$|us\$)\.?$/i;
  function numOf(t) {
    var m;
    if ((m = t.match(/^([1-9]\d{0,2}(?:[ '’]\d{3})+)(?:[.,](\d{1,2}))?$/))) return parseFloat(m[1].replace(/[ '’]/g, "") + (m[2] ? "." + m[2] : ""));   // 1 200,50
    if ((m = t.match(/^([1-9]\d{0,2}(?:,\d{3})+)(?:\.(\d{1,2}))?$/))) return parseFloat(m[1].replace(/,/g, "") + (m[2] ? "." + m[2] : ""));            // 1,200.50
    if ((m = t.match(/^([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d{1,2}))?$/))) return parseFloat(m[1].replace(/\./g, "") + (m[2] ? "." + m[2] : ""));            // 1.200,50
    if ((m = t.match(/^(\d+)(?:[.,](\d{1,3}))?$/))) return parseFloat(m[1] + (m[2] ? "." + m[2] : ""));                                                  // 12  12,5  12.50  0,250
    return null;
  }
  function parsePrice(s) {
    s = String(s == null ? "" : s).replace(/[   ]/g, " ").trim();
    if (!s) return undefined;
    var m = s.match(/^(\S*?)\s*(\d[\d .,'’]*\d|\d)\s*(\S*)$/);
    if (m) {
      var pre = m[1], suf = m[3], v = numOf(m[2]);
      var okPre = !pre || CUR_TOKEN.test(pre), okSuf = !suf || CUR_TOKEN.test(suf) || /^[.,]?[-–—]?$/.test(suf);
      if (v !== null && isFinite(v) && okPre && okSuf) return v;
    }
    return clip(s, LIMITS.priceText);
  }
  function cellTags(text) {
    var g = [];
    String(text).split(/[,;\/|]+/).forEach(function (piece) {
      piece = piece.trim().toLowerCase();
      if (!piece) return;
      var t = TAG_ALIASES[piece];
      if (t) { if (g.indexOf(t) < 0) g.push(t); return; }
      piece.split(/\s+/).forEach(function (w) { var u = TAG_ALIASES[w]; if (u && g.indexOf(u) < 0) g.push(u); });   // "V GF", "vegan spicy"
    });
    return g;
  }
  function cellAllergens(text) {
    var a = [];
    String(text).split(/[,;\/.\s]+/).forEach(function (x) { if (!/^\d{1,2}$/.test(x)) return; x = parseInt(x, 10); if (x >= 1 && x <= 14 && a.indexOf(x) < 0) a.push(x); });
    return a;
  }

  // rows (arrays of cells) -> menu object (schema keys). Throws Error("csv") when no header row is found.
  // Official layout (Google Sheets template): row 1 "#settings,name,currency,language,theme,footer", row 2 the values in the same columns,
  // a blank row, then "section,item,price,description,allergens,tags,sold_out" and one item per row.
  // Also accepted: settings as vertical "key,value" rows above the header row.
  function menuFromRows(rows) {
    var settings = {}, hi = -1, i, r;
    function cell0(row) { return String(row && row[0] != null ? row[0] : "").trim().toLowerCase(); }
    function isHeader(row) {   // a row naming a section column and an item column (extra columns may come before them)
      var sec = false, item = false;
      (row || []).forEach(function (h) { var a = HEAD_ALIASES[String(h).trim().toLowerCase()]; if (a === "section") sec = true; if (a === "item") item = true; });
      return sec && item;
    }
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      var k = cell0(r);
      if (isHeader(r)) { hi = i; break; }
      if (k === "#settings" || k === "settings") {
        var vals = rows[i + 1] || [];
        if (!isHeader(vals)) {
          r.forEach(function (h, idx) {
            var a = idx > 0 && SET_ALIASES[String(h).trim().toLowerCase()];
            if (a && idx < vals.length) settings[a] = String(vals[idx] == null ? "" : vals[idx]).trim();
          });
          i++;
        }
        continue;
      }
      if (SET_ALIASES[k] && r.length > 1) settings[SET_ALIASES[k]] = String(r[1] == null ? "" : r[1]).trim();
    }
    if (hi < 0) throw new Error("csv");
    var col = {};
    rows[hi].forEach(function (h, idx) { var a = HEAD_ALIASES[String(h).trim().toLowerCase()]; if (a && !(a in col)) col[a] = idx; });
    if (!("item" in col)) throw new Error("csv");
    function cellOf(row, key) { return key in col && row[col[key]] != null ? String(row[col[key]]).trim() : ""; }

    var lc = (settings.language || "").toLowerCase();
    var lang = lc ? (LANG_NAMES[lc] || lc.slice(0, 2)) : "en";
    var theme = (settings.theme || "").toLowerCase();
    var menu = { v: 1, n: settings.name || "", c: settings.currency || "", l: pickLang(lang), t: THEMES.indexOf(theme) >= 0 ? theme : "espresso", f: settings.footer || "", s: [] };
    var cur = null, byTitle = {};
    function section(title) {
      if (byTitle[title]) return byTitle[title];
      var s = { t: title, i: [] };
      byTitle[title] = s; menu.s.push(s);
      return s;
    }
    for (i = hi + 1; i < rows.length; i++) {
      r = rows[i];
      if (!r.some(function (c) { return String(c).trim() !== ""; })) continue;      // empty row
      var st = cellOf(r, "section"), name = cellOf(r, "item");
      if (st) cur = section(st);                                                    // a row with a section but no item only opens the section
      if (!name) continue;                                                          // no item name: no item
      if (!cur) cur = section("");
      var it = { n: name };
      var p = parsePrice(cellOf(r, "price")); if (p !== undefined) it.p = p;
      var d = cellOf(r, "description"); if (d) it.d = d;
      var a = cellAllergens(cellOf(r, "allergens")); if (a.length) it.a = a;
      var g = cellTags(cellOf(r, "tags")); if (g.length) it.g = g;
      if (SOLD_RE.test(cellOf(r, "sold_out"))) it.x = 1;
      cur.i.push(it);
    }
    menu.s = menu.s.filter(function (s) { return s.i.length; });                    // sections without items are dropped
    return menu;
  }
  function menuFromCsv(text) { return menuFromRows(parseCsv(text)); }

  // ---------- money ----------
  var SYMBOLS = { "zł": "PLN", "zl": "PLN", "€": "EUR", "$": "USD", "£": "GBP", "₴": "UAH", "грн": "UAH", "Kč": "CZK", "kc": "CZK", "Ft": "HUF", "₽": "RUB", "руб": "RUB", "lei": "RON", "лв": "BGN", "₺": "TRY", "C$": "CAD", "A$": "AUD", "¥": "JPY", "₹": "INR", "R$": "BRL", "Fr.": "CHF", "Fr": "CHF" };
  var SYMBOLS_LC = {}; Object.keys(SYMBOLS).forEach(function (k) { SYMBOLS_LC[k.toLowerCase()] = SYMBOLS[k]; });
  function currencyCode(c) {
    c = String(c || "").trim();
    if (!c) return "";
    var k = c.toLowerCase().replace(/\.$/, "");
    if (SYMBOLS_LC[c.toLowerCase()]) return SYMBOLS_LC[c.toLowerCase()];
    if (SYMBOLS_LC[k]) return SYMBOLS_LC[k];
    if (/^[A-Za-z]{3}$/.test(c)) return c.toUpperCase();
    return "";
  }
  // Where the currency sign goes. Suffix ("12,50 zł") for zł, Kč, Ft, kr, lei, ₴ and for € whenever the menu language is not English.
  // Prefix ("$4.50") for $, £, C$, A$, R$, ¥, ₹, CHF and for € in English. A non-breaking space joins the number and a suffix.
  var NB = "\u00a0";
  var SIGNS = { PLN: "z\u0142", CZK: "K\u010d", HUF: "Ft", SEK: "kr", NOK: "kr", DKK: "kr", RON: "lei", UAH: "\u20b4", EUR: "\u20ac", USD: "$", GBP: "\u00a3", CAD: "C$", AUD: "A$", BRL: "R$", JPY: "\u00a5", INR: "\u20b9", CHF: "CHF" };
  var SUFFIX_CODES = { PLN: 1, CZK: 1, HUF: 1, SEK: 1, NOK: 1, DKK: 1, RON: 1, UAH: 1 };
  var PREFIX_SPACE = { CHF: 1, BRL: 1 };
  // Returns {format(v)}. Whole prices everywhere -> no decimals ("9 zł"), otherwise always 2 decimals. The number follows the menu language
  // (decimal comma in every language except English).
  function priceFormatter(lang, cur, allWhole) {
    var l = pickLang(lang), loc = LOCALES[l], fd = allWhole ? 0 : 2;
    var code = currencyCode(cur);
    var nf = new Intl.NumberFormat(loc, { minimumFractionDigits: fd, maximumFractionDigits: fd });
    if (SIGNS[code]) {
      var after = !!SUFFIX_CODES[code] || (code === "EUR" && l !== "en"), sign = SIGNS[code];
      return { format: function (v) { var n = nf.format(v); return after ? n + NB + sign : sign + (PREFIX_SPACE[code] ? NB : "") + n; } };
    }
    if (code) {
      // other currencies (RUB, BGN, TRY, ...): the browser's own pattern, with the narrow sign
      try { return new Intl.NumberFormat(loc, { style: "currency", currency: code, currencyDisplay: "narrowSymbol", minimumFractionDigits: fd, maximumFractionDigits: fd }); } catch (e) { /* fall through */ }
      try { return new Intl.NumberFormat(loc, { style: "currency", currency: code, minimumFractionDigits: fd, maximumFractionDigits: fd }); } catch (e) { /* fall through */ }
    }
    return { format: function (v) { var n = nf.format(v); return cur ? (/^[\u00a3$\u20ac\u00a5]/.test(cur) ? cur + n : n + NB + cur) : n; } };
  }

  // ---------- rendering ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function allWhole(menu) {
    var any = false;
    for (var i = 0; i < menu.s.length; i++) for (var j = 0; j < menu.s[i].i.length; j++) {
      var p = menu.s[i].i[j].p;
      if (typeof p === "number") { any = true; if (Math.round(p * 100) % 100 !== 0) return false; }
    }
    return any;
  }

  function setMeta(m, L) {
    var de = document.documentElement;
    de.setAttribute("data-theme", m.t);
    de.setAttribute("lang", m.l);
    document.title = (m.n ? m.n + " · " : "") + L.menu;
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", THEME_COLORS[m.t]);
  }

  // Render a (raw or normalized) menu into root. Returns the normalized menu.
  function render(root, raw) {
    var m = normalize(raw), L = T[m.l];
    setMeta(m, L);
    root.textContent = "";
    root.removeAttribute("aria-busy");
    var fmt = priceFormatter(m.l, m.c, allWhole(m));

    var head = el("header", "mn-head");
    head.appendChild(el("h1", "mn-title", m.n || L.menu));
    head.appendChild(el("div", "mn-rule"));
    root.appendChild(head);

    var sections = m.s.filter(function (s) { return s.i.length; });
    var used = {};
    var chipBox = null, chips = [], secEls = [];

    if (sections.length > 1) {
      var nav = el("nav", "mn-nav");
      nav.setAttribute("aria-label", L.menu);
      chipBox = el("div", "mn-chips");
      nav.appendChild(chipBox);
      root.appendChild(nav);
    }

    var main = el("main", "mn-main");
    if (!sections.length) main.appendChild(el("p", "mn-empty", L.empty));

    sections.forEach(function (sec, si) {
      var id = "sec-" + si;
      var s = el("section", "mn-sec"); s.id = id;
      if (sec.t) { var h = el("h2", "mn-sh", sec.t); h.id = id + "-h"; s.setAttribute("aria-labelledby", h.id); s.appendChild(h); }
      var ul = el("ul", "mn-list");
      sec.i.forEach(function (it) {
        var li = el("li", "mn-item" + (it.x ? " is-sold" : ""));
        li.setAttribute("data-name", it.n);
        if (typeof it.p === "number") li.setAttribute("data-price", String(it.p));
        if (it.a) li.setAttribute("data-allergens", it.a.join(","));
        if (it.x) li.setAttribute("data-sold", "1");
        var row = el("div", "mn-row");
        row.appendChild(el("h3", "mn-iname", it.n));
        if (it.p !== undefined) {
          var pr = el("span", "mn-price", typeof it.p === "number" ? fmt.format(it.p) : it.p);
          row.appendChild(pr);
        }
        li.appendChild(row);
        if (it.d) li.appendChild(el("p", "mn-desc", it.d));
        var meta = el("div", "mn-meta");
        if (it.a) {
          var al = el("span", "mn-al");
          al.setAttribute("role", "img");
          al.setAttribute("aria-label", L.allergens + ": " + it.a.map(function (k) { return k + " " + L.a[k - 1]; }).join(", "));
          it.a.forEach(function (k) { used[k] = 1; var b = el("span", "mn-num", String(k)); b.setAttribute("aria-hidden", "true"); al.appendChild(b); });
          meta.appendChild(al);
        }
        (it.g || []).forEach(function (g) { var t = el("span", "mn-tag", L.tags[g]); t.setAttribute("data-tag", g); meta.appendChild(t); });
        if (it.x) meta.appendChild(el("span", "mn-sold", L.soldOut));
        if (meta.childNodes.length) li.appendChild(meta);
        ul.appendChild(li);
      });
      s.appendChild(ul);
      main.appendChild(s);
      secEls.push(s);

      if (chipBox) {
        var chip = el("button", "mn-chip", sec.t || String(si + 1));
        chip.type = "button";
        chip.addEventListener("click", function () {
          var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
          s.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        });
        chipBox.appendChild(chip); chips.push(chip);
      }
    });
    root.appendChild(main);

    var usedNums = Object.keys(used).map(Number).sort(function (a, b) { return a - b; });
    if (usedNums.length) {
      var lg = el("section", "mn-legend");
      lg.appendChild(el("h2", "mn-lh", L.allergens));
      var ol = el("ul", "mn-ll");
      usedNums.forEach(function (k) {
        var li = el("li", "mn-lli");
        li.appendChild(el("span", "mn-num", String(k)));
        li.appendChild(el("span", "mn-lname", L.a[k - 1]));
        ol.appendChild(li);
      });
      lg.appendChild(ol);
      lg.appendChild(el("p", "mn-ask", L.ask));
      root.appendChild(lg);
    }

    var foot = el("footer", "mn-foot");
    if (m.f) foot.appendChild(el("p", "mn-ft", m.f));
    var a = el("a", "mn-brand", "Free QR menu by DoughMath Studio");
    a.href = HOME; a.rel = "noopener";
    foot.appendChild(a);
    root.appendChild(foot);

    if (chips.length) trackChips(chipBox, chips, secEls);
    return m;
  }

  var scrollOff = null;
  function trackChips(chipBox, chips, secEls) {
    if (scrollOff) scrollOff();
    var active = -1, ticking = false;
    function setActive(i) {
      if (i === active) return;
      active = i;
      chips.forEach(function (c, k) {
        if (k === i) { c.setAttribute("aria-current", "true"); c.classList.add("on"); } else { c.removeAttribute("aria-current"); c.classList.remove("on"); }
      });
      var c = chips[i];
      if (c && chipBox.scrollWidth > chipBox.clientWidth) {
        var target = c.offsetLeft - (chipBox.clientWidth - c.offsetWidth) / 2;
        if (typeof chipBox.scrollTo === "function") chipBox.scrollTo({ left: target, behavior: "auto" }); else chipBox.scrollLeft = target;
      }
    }
    function update() {
      ticking = false;
      var navH = chipBox.parentNode.offsetHeight || 0, idx = 0;
      for (var i = 0; i < secEls.length; i++) { if (secEls[i].getBoundingClientRect().top <= navH + 24) idx = i; }
      var atEnd = (global.innerHeight + global.scrollY) >= document.documentElement.scrollHeight - 4;
      if (atEnd && global.scrollY > 0) idx = secEls.length - 1;
      setActive(idx);
    }
    function onScroll() { if (!ticking) { ticking = true; global.requestAnimationFrame(update); } }
    global.addEventListener("scroll", onScroll, { passive: true });
    global.addEventListener("resize", onScroll);
    scrollOff = function () { global.removeEventListener("scroll", onScroll); global.removeEventListener("resize", onScroll); };
    update();
  }

  // ---------- boot (viewer page only) ----------
  function isLocalHost() { var h = global.location && global.location.hostname; return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1"; }
  function liveUrl(s, g) {
    return "https://docs.google.com/spreadsheets/d/e/" + s + "/pub?" + (g ? "gid=" + g + "&" : "") + "single=true&output=csv";
  }

  // Share-link mode (?d=<doc id>): a normal Google Sheets sharing link ("Anyone with the link" + Viewer), read through the gviz CSV endpoint.
  var DOC_RE = /^[A-Za-z0-9_\-]{25,100}$/;
  var DEFAULT_TAB = "Publish this tab";
  function cleanTab(t) { t = String(t == null ? "" : t).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 100); return t || DEFAULT_TAB; }
  function docUrl(id, tab) {
    return "https://docs.google.com/spreadsheets/d/" + id + "/gviz/tq?tqx=out:csv&headers=0&sheet=" + encodeURIComponent(cleanTab(tab));
  }

  // Pasted Google Sheets link -> one of
  //   {ok:true, kind:"share", doc}              any normal sharing link (/edit, /view, ?usp=sharing, #gid=, /u/0/, long mobile links) or the bare id
  //   {ok:true, kind:"pub"|"pubhtml", id, gid}  a "publish to web" link (/d/e/.../pub...) or the whole embed code
  //   {ok:false, reason}                        empty | other | wronghost | drive | notsheet | copy
  function parseSheetLink(text) {
    text = String(text == null ? "" : text).trim();
    if (!text) return { ok: false, reason: "empty" };
    if (DOC_RE.test(text)) return /^2PACX-/.test(text) ? { ok: true, id: text, gid: "", kind: "pub" } : { ok: true, kind: "share", doc: text };
    if (/^(javascript|data|vbscript|file|blob|ftp)\s*:/i.test(text)) return { ok: false, reason: "other" };
    var src = text, fr = text.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
    if (fr) src = fr[1].replace(/&amp;/g, "&");
    var um = src.match(/https?:\/\/[^\s"'<>]+/);
    if (!um && /^(docs|drive)\.google\.com\//i.test(src.trim())) um = ["https://" + src.trim().split(/[\s"'<>]/)[0]];
    if (!um) return { ok: false, reason: "other" };
    var u;
    try { u = new URL(um[0]); } catch (e) { return { ok: false, reason: "other" }; }
    if (u.protocol !== "https:") return { ok: false, reason: "other" };
    if (u.hostname === "drive.google.com") return { ok: false, reason: "drive" };
    if (u.hostname !== "docs.google.com") return { ok: false, reason: "wronghost" };
    var parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "u" && /^\d{1,2}$/.test(parts[1] || "")) parts = parts.slice(2);        // /u/0/spreadsheets/...  (account switcher)
    else if (parts[0] === "a" && /^[A-Za-z0-9.\-]{1,100}$/.test(parts[1] || "")) parts = parts.slice(2);   // /a/example.com/spreadsheets/...  (Workspace)
    if (parts[0] !== "spreadsheets") return { ok: false, reason: /^(forms|document|presentation|drawings)$/.test(parts[0] || "") ? "notsheet" : "other" };
    var i = 1;
    if (parts[i] === "u" && /^\d{1,2}$/.test(parts[i + 1] || "")) i += 2;                  // /spreadsheets/u/0/d/...
    if (parts[i] !== "d") return { ok: false, reason: "other" };
    i++;
    if (parts[i] === "e") {
      var pid = parts[i + 1] || "", kind = parts[i + 2];
      if (!/^[A-Za-z0-9_\-]{20,200}$/.test(pid) || (kind !== "pub" && kind !== "pubhtml")) return { ok: false, reason: "other" };
      var g = (u.search + "&" + u.hash).match(/[?&#]gid=(\d{1,12})(?=[&#]|$)/);
      return { ok: true, id: pid, gid: g ? g[1] : "", kind: kind };
    }
    var id = parts[i] || "", tail = parts[i + 1];
    if (!DOC_RE.test(id)) return { ok: false, reason: "other" };
    if (tail === "copy") return { ok: false, reason: "copy" };
    if (tail !== undefined && !/^(edit|view|htmlview|preview|mobilebasic)$/.test(tail)) return { ok: false, reason: "other" };
    return { ok: true, kind: "share", doc: id };
  }

  function status(root, text, cls) {
    root.textContent = "";
    var p = el("p", "mn-status " + (cls || ""), text);
    p.setAttribute("role", cls === "err" ? "alert" : "status");
    root.appendChild(p);
    return p;
  }
  var OWNER_HINTS = {
    share: "Owner: in Google Sheets choose Share \u2192 Anyone with the link \u2192 Viewer.",
    tab: "Owner: the sheet needs a tab with this menu\u2019s name (\u201cPublish this tab\u201d unless you chose another) laid out like the template."
  };
  function showError(root, lang, key, retry, hint) {
    var L = T[lang];
    setMeta({ n: "", l: lang, t: document.documentElement.getAttribute("data-theme") || "mono" }, L);
    root.textContent = "";
    root.removeAttribute("aria-busy");
    var box = el("div", "mn-error");
    box.setAttribute("role", "alert");
    box.appendChild(el("p", "mn-etext", L[key]));
    if (hint && OWNER_HINTS[hint]) box.appendChild(el("p", "mn-owner", OWNER_HINTS[hint]));
    if (retry) {
      var b = el("button", "mn-btn", L.retry); b.type = "button";
      b.addEventListener("click", retry);
      box.appendChild(b);
    }
    root.appendChild(box);
    var foot = el("footer", "mn-foot");
    var a = el("a", "mn-brand", "Free QR menu by DoughMath Studio");
    a.href = HOME; a.rel = "noopener"; foot.appendChild(a);
    box.appendChild(foot);
  }

  // GitHub Pages cannot send frame-ancestors headers, so the page checks for itself:
  // framed by another origin -> show a short notice and a link instead of the menu.
  function framedByOtherOrigin() {
    if (global.top === global.self) return false;
    try { return global.parent.location.origin !== global.location.origin; } catch (e) { return true; }
  }

  function boot() {
    var root = document.getElementById("menu-root");
    if (!root) return;
    if (framedByOtherOrigin()) {
      var fl = pickLang(new URLSearchParams(global.location.search).get("l") || browserLang()), FL = T[fl];
      root.textContent = ""; root.removeAttribute("aria-busy");
      var fb = el("div", "mn-error");
      fb.appendChild(el("p", "mn-etext", FL.framed));
      var fa = el("a", "mn-btn mn-link", FL.open);
      fa.href = global.location.href; fa.target = "_blank"; fa.rel = "noopener noreferrer";
      fb.appendChild(fa);
      root.appendChild(fb);
      return;
    }
    var q = new URLSearchParams(global.location.search);
    if (q.get("preview") === "1") { root.textContent = ""; root.removeAttribute("aria-busy"); return; } // builder preview: the parent page calls render()
    var hash = global.location.hash.replace(/^#/, "");
    var uiLang = pickLang(q.get("l") || browserLang());
    var started = 0;

    // builder preview (?embed=1): tell the same-origin parent page what was loaded, so it can show the result next to the preview
    var embed = q.get("embed") === "1" && global.parent && global.parent !== global.self;
    function tell(msg) {
      if (!embed) return;
      try { msg.q = global.location.search; global.parent.postMessage(msg, global.location.origin); } catch (e) { /* no listener: nothing to do */ }
    }

    function load() {
      var my = ++started;
      root.setAttribute("aria-busy", "true");
      var s = q.get("s"), g = q.get("g"), d = q.get("d"), t = q.get("t");
      var override = isLocalHost() ? q.get("csv") : null; // test-only: honoured on localhost only

      if (hash) {
        decodePayload(hash).then(function (obj) {
          if (my !== started) return;
          render(root, obj);
        }, function (err) {
          if (my !== started) return;
          showError(root, uiLang, err && err.code === "old" ? "oldBrowser" : "badLink");
        });
        return;
      }
      if (override || d || s) {
        var mode = override ? "csv" : d ? "d" : "s";   // priority: test override, share link (?d=), published link (?s=)
        if (mode === "d" && !DOC_RE.test(d)) { tell({ dmLive: 1, ok: false, key: "badLink" }); return showError(root, uiLang, "badLink"); }
        if (mode === "s" && !/^[A-Za-z0-9_\-]{20,200}$/.test(s)) return showError(root, uiLang, "badLink");
        if (mode === "s" && g && !/^\d{1,12}$/.test(g)) return showError(root, uiLang, "badLink");
        var url = mode === "csv" ? override : mode === "d" ? docUrl(d, t) : liveUrl(s, g);
        var hint = mode === "d" ? "share" : "";
        var ctrl = (typeof AbortController === "function") ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : 0;
        var retry = function () { status(root, T[uiLang].loading, "load"); load(); };
        fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", redirect: "follow", signal: ctrl ? ctrl.signal : undefined }).then(function (res) {
          if (!res.ok) throw fail("net");
          return res.text();
        }).then(function (text) {
          clearTimeout(timer);
          if (my !== started) return;
          // a sign-in or "no access" page comes back as HTML with status 200: that is an access problem, not a menu problem
          if (mode === "d" && /^\s*</.test(text)) throw fail("net");
          var menu;
          try { menu = menuFromCsv(text); } catch (e) { tell({ dmLive: 1, ok: false, key: "csvErr" }); return showError(root, uiLang, "csvErr", retry, mode === "d" ? "tab" : ""); }
          render(root, menu);
          tell({ dmLive: 1, ok: true, menu: normalize(menu) });
        }).catch(function () {
          clearTimeout(timer);
          if (my !== started) return;
          tell({ dmLive: 1, ok: false, key: "netErr" });
          showError(root, uiLang, "netErr", retry, hint);
        });
        return;
      }
      showError(root, uiLang, "noMenu");
    }
    status(root, T[uiLang].loading, "load");
    load();
    global.addEventListener("hashchange", function () { hash = global.location.hash.replace(/^#/, ""); status(root, T[uiLang].loading, "load"); load(); });
  }

  var api = {
    LANGS: LANGS, LOCALES: LOCALES, THEMES: THEMES, TAGS: TAGS, T: T, HOME: HOME,
    normalize: normalize, encodePayload: encodePayload, decodePayload: decodePayload,
    canCompress: canCompress, canDecompress: canDecompress,
    parseCsv: parseCsv, menuFromRows: menuFromRows, menuFromCsv: menuFromCsv, parsePrice: parsePrice,
    priceFormatter: priceFormatter, parseSheetLink: parseSheetLink, docUrl: docUrl, cleanTab: cleanTab, DOC_RE: DOC_RE, DEFAULT_TAB: DEFAULT_TAB, currencyCode: currencyCode, allWhole: allWhole, liveUrl: liveUrl,
    render: render, boot: boot, bytesToB64url: bytesToB64url, b64urlToBytes: b64urlToBytes
  };
  global.DMMenu = api;
  if (typeof module === "object" && module && module.exports) module.exports = api;

  if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-dm-viewer")) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  }
})(typeof window !== "undefined" ? window : this);
