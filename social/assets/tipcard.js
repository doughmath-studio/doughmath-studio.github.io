// Passa Tip: the card data lives in the link itself (passa.cafe/t/#<data>), after "#", so it never reaches the server.
// The tip goes straight to the waiter's own tip service (Tippin', TipTip, TipX, FastTip, Revolut, PayPal, BLIK
// to a phone number…). Passa never touches the money and keeps no account for the card.
// Works in the browser (window.PassaTip) and in Node tests (globalThis.PassaTip).
(function (root) {
  "use strict";
  // known tip services: the guest sees a check mark and the service name next to the button
  const KNOWN = {
    "tippin.pl": "Tippin'", "tiptip.com.pl": "TipTip", "tipx.pl": "TipX", "fasttip.app": "FastTip", "tipped.pl": "Tipped",
    "revolut.me": "Revolut", "paypal.me": "PayPal", "buycoffee.to": "buycoffee.to", "suppi.pl": "Suppi",
    "zrzutka.pl": "Zrzutka", "pomagam.pl": "Pomagam", "send.monobank.ua": "monobank", "wise.com": "Wise",
  };
  const MAX = { n: 40, r: 40, v: 60, l: 300, g: 300, s: 12 };
  const SKINS = ["noir", "espresso", "maslo"];

  function cleanText(s, max) {
    const t = String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, " ")
      .replace(/\s+/g, " ").trim();
    return t.slice(0, max);
  }
  // https links only; BLIK: a Polish phone number "blik:+48XXXXXXXXX"
  function cleanLink(s) {
    const t = String(s == null ? "" : s).trim();
    if (!t) return "";
    const blik = /^blik:\s*(\+?48)?\s*([0-9][0-9 \-]{7,13})$/i.exec(t) || /^(\+48)?\s*([0-9]{3}[ \-]?[0-9]{3}[ \-]?[0-9]{3})$/.exec(t);
    if (blik) {
      const d = blik[2].replace(/\D/g, "");
      return d.length === 9 ? "blik:+48" + d : null;
    }
    let u;
    try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : "https://" + t); } catch (e) { return null; }
    if (u.protocol !== "https:" || !u.hostname.includes(".") || u.username || u.password) return null;
    const out = u.href;
    return out.length > MAX.l ? null : out;
  }
  function host(link) {
    if (!link || link.startsWith("blik:")) return "";
    try { return new URL(link).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }
  function provider(link) {
    if (!link) return null;
    if (link.startsWith("blik:")) return { name: "BLIK", known: true, host: "" };
    const h = host(link);
    for (const k of Object.keys(KNOWN)) if (h === k || h.endsWith("." + k)) return { name: KNOWN[k], known: true, host: h };
    return { name: h, known: false, host: h };
  }
  // card -> {ok, data} or {ok:false, error}
  function normalize(c) {
    c = c || {};
    const card = {
      n: cleanText(c.n, MAX.n), r: cleanText(c.r, MAX.r), v: cleanText(c.v, MAX.v),
      l: cleanLink(c.l), g: c.g ? cleanLink(c.g) : "", s: SKINS.includes(c.s) ? c.s : "noir",
    };
    if (!card.n) return { ok: false, error: "name" };
    if (!card.l) return { ok: false, error: "link" };
    if (card.g === null || (card.g && card.g.startsWith("blik:"))) return { ok: false, error: "review" };
    return { ok: true, card };
  }
  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b + "===".slice((b.length + 3) % 4));
    return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
  }
  function encode(c) {
    const r = normalize(c);
    if (!r.ok) return r;
    const o = {};
    for (const k of ["n", "r", "v", "l", "g", "s"]) if (r.card[k] && !(k === "s" && r.card[k] === "noir")) o[k] = r.card[k];
    return { ok: true, card: r.card, hash: b64urlEncode(JSON.stringify(o)) };
  }
  function decode(hash) {
    try {
      const raw = String(hash || "").replace(/^#/, "");
      if (!raw || raw.length > 1200 || !/^[A-Za-z0-9_-]+$/.test(raw)) return { ok: false, error: "empty" };
      return normalize(JSON.parse(b64urlDecode(raw)));
    } catch (e) { return { ok: false, error: "bad" }; }
  }
  function cardUrl(base, c) {
    const r = encode(c);
    return r.ok ? { ok: true, url: String(base).replace(/\/+$/, "") + "/t/#" + r.hash, card: r.card } : r;
  }
  root.PassaTip = { normalize, encode, decode, cardUrl, cleanLink, provider, host, SKINS, KNOWN };
})(typeof window !== "undefined" ? window : globalThis);
