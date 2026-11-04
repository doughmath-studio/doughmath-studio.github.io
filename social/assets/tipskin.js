// Passa Tip card skins as SVG (54 × 85.6 mm card = 540 × 856 units), two sides per card:
//   front — NFC side with the name and signature (Noir follows the founder's mock-up page 1);
//   back  — "scan to tip" QR in a frying pan (mock-up page 2), in the skin's colours.
// Skins: noir (graphite + holo), espresso (copper + crema), maslo (butter + ketchup).
// One drawing serves the live preview and the printable PNG.
(function (root) {
  "use strict";
  const W = 540, H = 856;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MONO = "'Space Mono', ui-monospace, Menlo, monospace";
  const SCRIPT = "'Great Vibes', 'Snell Roundhand', cursive";

  const S = {
    noir: {
      bg: "#121013", edge: "#e0457b", ink: "#f2eef0", sub: "#cfc6cc", pattern: "#ffffff", patOp: 0.07, word: "TIP ACCESS",
      tile: [["0", "#3b3b40"], [".45", "#0e0e11"], [".8", "#77777e"], ["1", "#2a2a2e"]], tileStroke: "#a8a8b0", line: "#0b0b0c",
      wm: [["0", "#0b0b0c"], [".55", "#8d8d93"], ["1", "#f4f4f6"]],
      plate: [["0", "#ece8f2"], [".35", "#d4e6ec"], [".7", "#f3e7d8"], ["1", "#dcd6ea"]], plateInk: "#2b2530", tag: "ALL ACCESS",
      back: { bg: "#151214", glow: "#2a2226", ink: "#efe3cf", sub: "#bfae98", panIn: "#0e0c0d", plate: "#eadcc6", plateInk: "#2b1d16" },
    },
    espresso: {
      bg: "#1c120d", edge: "#d08a4e", ink: "#f3e4cf", sub: "#d9b48f", pattern: "#e7b98a", patOp: 0.08, word: "CREMA CLUB",
      tile: [["0", "#e3a66a"], [".3", "#8a4d24"], [".62", "#3a1f10"], ["1", "#c98a52"]], tileStroke: "#f0c08f", line: "#2a160b",
      wm: [["0", "#2a160b"], [".5", "#b8733f"], ["1", "#fbe6c8"]],
      plate: [["0", "#f7ead6"], [".5", "#efd9b9"], ["1", "#f9efe0"]], plateInk: "#3a1f10", tag: "DOUBLE SHOT",
      back: { bg: "#1c120d", glow: "#3a2215", ink: "#f3e4cf", sub: "#d9b48f", panIn: "#140c08", plate: "#f3e4cf", plateInk: "#3a1f10" },
    },
    maslo: {
      bg: "#f6dd8f", edge: "#c43b25", ink: "#2b1d16", sub: "#7a3510", pattern: "#c43b25", patOp: 0.09, word: "FRESH BUTTER",
      tile: [["0", "#fffbe6"], [".4", "#fbe9a9"], [".75", "#f1cd62"], ["1", "#fff3c4"]], tileStroke: "#ffffff", line: "#2b1d16",
      wm: [["0", "#c43b25"], [".6", "#e0573a"], ["1", "#f08a4b"]],
      plate: [["0", "#ffffff"], ["1", "#fff6e4"]], plateInk: "#c43b25", tag: "SALTED · 82%",
      back: { bg: "#f3d77f", glow: "#fbeec4", ink: "#2b1d16", sub: "#7a3510", panIn: "#f8e6a6", plate: "#fffaf0", plateInk: "#c43b25" },
    },
  };
  const stops = (a) => a.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("");

  function qrPath(m, x, y, size) {
    const q = size / (m.n + 2);
    let d = "";
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark(r, c)) d += `M${(x + (c + 1) * q).toFixed(2)},${(y + (r + 1) * q).toFixed(2)}h${q.toFixed(2)}v${q.toFixed(2)}h-${q.toFixed(2)}z`;
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.06}" fill="#fff"/><path d="${d}" fill="#141012" shape-rendering="crispEdges"/>`;
  }
  function wordmark(a, x, y, w, fill) {
    if (!a.wm) return `<text x="${x + w / 2}" y="${y + w * 0.25}" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="800" font-size="${w * 0.3}" fill="${fill}">passa</text>`;
    return `<g transform="translate(${x} ${y}) scale(${(w / a.wm.w).toFixed(4)})"><path d="${a.wm.d}" fill="${fill}"/></g>`;
  }
  function signature(name, x, y, size, fill) {
    return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${SCRIPT}" font-size="${size}" fill="${fill}" textLength="${Math.min(360, Math.max(60, name.length * size * 0.42))}" lengthAdjust="spacingAndGlyphs">${esc(name)}</text>`;
  }
  function nfc(x, y, fill) {
    return `<g transform="translate(${x} ${y})" fill="none" stroke="${fill}" stroke-width="2.4" stroke-linecap="round"><path d="M0 -9a12 12 0 0 1 0 18"/><path d="M6 -15a20 20 0 0 1 0 30"/><path d="M12 -21a28 28 0 0 1 0 42"/></g>`;
  }
  function tap(P, y) {
    return `${nfc(146, y - 6, P.sub)}<text x="290" y="${y}" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="700" fill="${P.ink}" letter-spacing="3">TAP PHONE HERE</text>`;
  }

  // background texture per skin: mono text (noir), crema swirls (espresso), dot grid (maslo)
  function texture(s, P, c) {
    if (s === "espresso") {
      let g = "";
      for (let i = 0; i < 9; i++) g += `<ellipse cx="${410 - i * 6}" cy="${170 + i * 4}" rx="${40 + i * 34}" ry="${26 + i * 24}" transform="rotate(${-18 + i * 3} 410 170)"/>`;
      for (let i = 0; i < 7; i++) g += `<ellipse cx="${110 + i * 4}" cy="${700 - i * 3}" rx="${30 + i * 30}" ry="${22 + i * 20}" transform="rotate(${12 - i * 2} 110 700)"/>`;
      return `<g fill="none" stroke="${P.pattern}" stroke-opacity="${P.patOp + 0.04}" stroke-width="2">${g}</g>`;
    }
    if (s === "maslo") {
      let d = "";
      for (let y = 18; y < H; y += 22) for (let x = 18 + ((y / 22) % 2) * 11; x < W; x += 22) d += `M${x},${y}h0`;
      return `<path d="${d}" stroke="${P.pattern}" stroke-opacity="${P.patOp}" stroke-width="4.5" stroke-linecap="round"/>`;
    }
    const line = "PASSA · " + P.word + " · " + c.n.toUpperCase() + " · ";
    let rows = "";
    for (let i = 0; i < 38; i++) rows += `<text x="${-((i * 37) % 160)}" y="${30 + i * 22}">${esc(line.repeat(6))}</text>`;
    return `<g font-family="${MONO}" font-size="13" fill="${P.pattern}" opacity="${P.patOp}">${rows}</g>`;
  }

  function front(c, a, id, o) {
    const P = S[c.s] || S.noir;
    const sub = [c.r, c.v].filter(Boolean).join(" · ").toUpperCase() || "PASSA TIP";
    const rings = c.s === "maslo" ? "" : `<g fill="none" stroke="#fff" stroke-opacity=".08">${[60, 90, 120, 150, 180].map((r) => `<circle cx="330" cy="300" r="${r}"/>`).join("")}</g>`;
    const butterShine = c.s === "maslo" ? `<path d="M90 190 Q 270 150 450 200" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="10" stroke-linecap="round"/><path d="M110 214 Q 250 186 380 210" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>` : "";
    return `
<defs>
  <linearGradient id="${id}t" x1="0" y1="0" x2="${c.s === "espresso" ? 1 : 0}" y2="1">${stops(P.tile)}</linearGradient>
  <radialGradient id="${id}h" cx=".72" cy=".3" r=".6"><stop offset="0" stop-color="#fff" stop-opacity="${c.s === "maslo" ? 0.6 : 0.22}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}w" x1="0" x2="1">${stops(P.wm)}</linearGradient>
  <linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="1">${stops(P.plate)}</linearGradient>
  <clipPath id="${id}c"><rect width="${W}" height="${H}" rx="34"/></clipPath>
</defs>
<g clip-path="url(#${id}c)">
  <rect width="${W}" height="${H}" fill="${P.bg}"/>
  ${texture(c.s, P, c)}
  ${o && o.noEdge ? "" : `<rect x="5" y="5" width="${W - 10}" height="${H - 10}" rx="30" fill="none" stroke="${P.edge}" stroke-width="3"/>`}
  <g font-family="${MONO}" font-size="19" font-weight="700" fill="${P.ink}" letter-spacing="1">
    <text x="40" y="66">${esc(c.n.toUpperCase())}</text><text x="40" y="92">${esc(sub)}</text><text x="40" y="118">EXCLUSIVE ${esc(P.word)}</text>
  </g>
  <rect x="62" y="150" width="416" height="430" rx="30" fill="url(#${id}t)" stroke="${P.tileStroke}" stroke-opacity=".6" stroke-width="2"/>
  ${rings}${butterShine}
  <rect x="62" y="150" width="416" height="430" rx="30" fill="url(#${id}h)"/>
  ${a.chef ? `<image href="${a.chef}" x="96" y="214" width="200" height="215"/>` : ""}
  <path d="M286 420H458" stroke="${P.line}" stroke-width="3"/>
  ${wordmark(a, 76, 440, 388, `url(#${id}w)`)}
  <rect x="34" y="626" width="472" height="128" rx="18" fill="url(#${id}p)"/>
  <text x="54" y="660" font-family="${MONO}" font-size="16" font-weight="700" fill="${P.plateInk}">1/1</text>
  <text x="486" y="736" text-anchor="end" font-family="${MONO}" font-size="14" font-weight="700" fill="${P.plateInk}">${esc(P.tag)}</text>
  ${signature(c.n, 262, 714, 64, P.plateInk)}
  ${tap(P, 812)}
</g>`;
  }

  function back(c, m, a, id) {
    const P = (S[c.s] || S.noir).back, edge = (S[c.s] || S.noir).edge;
    const sub = [c.n.toUpperCase(), (c.r || "").toUpperCase()].filter(Boolean).join(" • ");
    return `
<defs><clipPath id="${id}c"><rect width="${W}" height="${H}" rx="34"/></clipPath>
<radialGradient id="${id}g" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="${P.glow}"/><stop offset="1" stop-color="${P.bg}"/></radialGradient></defs>
<g clip-path="url(#${id}c)">
  <rect width="${W}" height="${H}" fill="url(#${id}g)"/>
  <rect x="5" y="5" width="${W - 10}" height="${H - 10}" rx="30" fill="none" stroke="${edge}" stroke-width="3"/>
  ${wordmark(a, 150, 52, 240, P.ink)}
  <text x="270" y="190" text-anchor="middle" font-family="${MONO}" font-size="19" font-weight="700" fill="${P.ink}" letter-spacing="2">${esc(sub)}</text>
  ${c.v ? `<text x="270" y="216" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${P.sub}" letter-spacing="2">${esc(c.v.toUpperCase())}</text>` : ""}
  <circle cx="270" cy="410" r="158" fill="none" stroke="${P.ink}" stroke-opacity=".55" stroke-width="3"/>
  <circle cx="270" cy="410" r="134" fill="${P.panIn}" stroke="${P.ink}" stroke-opacity=".25" stroke-width="2"/>
  <rect x="254" y="566" width="32" height="66" rx="16" fill="none" stroke="${P.ink}" stroke-opacity=".55" stroke-width="3"/>
  ${qrPath(m, 200, 330, 140)}
  <text x="270" y="498" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="${P.ink}" letter-spacing="2">SCAN TO TIP</text>
  <rect x="34" y="660" width="472" height="104" rx="16" fill="${P.plate}"/>
  ${signature(c.n, 270, 730, 62, P.plateInk)}
  ${nfc(146, 806, P.sub)}
  <text x="290" y="812" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="700" fill="${P.ink}" letter-spacing="3">TAP PHONE HERE</text>
</g>`;
  }

  // MagSafe format: 60 × 92 mm = 600 × 920 units. The magnet ring (Ø 56 / 46 mm) sits in the middle, the QR frying pan
  // is drawn exactly on it; the NFC inlay (25 × 15 mm, anti-metal) sits at the bottom under "TAP PHONE HERE".
  const MW = 600, MH = 920, RING = { cx: 300, cy: 440, ro: 280, ri: 230 }, NFC = { std: [145, 690, 250, 150], mag: [175, 732, 250, 150] };
  function backMag(c, m, a, id) {
    const P = (S[c.s] || S.noir).back, edge = (S[c.s] || S.noir).edge;
    const sub = [c.n.toUpperCase(), (c.r || "").toUpperCase()].filter(Boolean).join(" • ");
    return `
<defs><clipPath id="${id}c"><rect width="${MW}" height="${MH}" rx="38"/></clipPath>
<radialGradient id="${id}g" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="${P.glow}"/><stop offset="1" stop-color="${P.bg}"/></radialGradient></defs>
<g clip-path="url(#${id}c)">
  <rect width="${MW}" height="${MH}" fill="url(#${id}g)"/>
  <rect x="5" y="5" width="${MW - 10}" height="${MH - 10}" rx="34" fill="none" stroke="${edge}" stroke-width="3"/>
  ${wordmark(a, 205, 34, 190, P.ink)}
  <text x="300" y="138" text-anchor="middle" font-family="${MONO}" font-size="18" font-weight="700" fill="${P.ink}" letter-spacing="2">${esc(sub)}</text>
  <circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.ro - 6}" fill="none" stroke="${P.ink}" stroke-opacity=".55" stroke-width="3"/>
  <circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.ri}" fill="${P.panIn}" stroke="${P.ink}" stroke-opacity=".25" stroke-width="2"/>
  <g fill="${P.ink}" fill-opacity=".35">${Array.from({ length: 36 }, (_, i) => { const t = (i / 36) * Math.PI * 2, r = (RING.ro + RING.ri) / 2 - 3; return `<circle cx="${(RING.cx + r * Math.cos(t)).toFixed(1)}" cy="${(RING.cy + r * Math.sin(t)).toFixed(1)}" r="2.2"/>`; }).join("")}</g>
  ${qrPath(m, 190, 318, 220)}
  <text x="300" y="584" text-anchor="middle" font-family="${MONO}" font-size="14" font-weight="700" fill="${P.ink}" letter-spacing="3">SCAN TO TIP</text>
  ${c.v ? `<text x="300" y="612" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${P.sub}" letter-spacing="2">${esc(c.v.toUpperCase())}</text>` : ""}
  <rect x="40" y="742" width="520" height="96" rx="16" fill="${P.plate}"/>
  ${signature(c.n, 300, 808, 60, P.plateInk)}
  ${nfc(176, 878, P.sub)}
  <text x="320" y="884" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="700" fill="${P.ink}" letter-spacing="3">TAP PHONE HERE</text>
</g>`;
  }
  function frontMag(c, a, id) {
    const P = S[c.s] || S.noir;
    return `<defs><clipPath id="${id}o"><rect width="${MW}" height="${MH}" rx="38"/></clipPath></defs>
<g clip-path="url(#${id}o)"><rect width="${MW}" height="${MH}" fill="${P.bg}"/>
  <g transform="translate(30 32)">${front(c, a, id, { noEdge: true })}</g></g>
<rect x="5" y="5" width="${MW - 10}" height="${MH - 10}" rx="34" fill="none" stroke="${P.edge}" stroke-width="3"/>`;
  }
  // print guides: safe zone (3 mm), MagSafe ring, NFC inlay zone; drawn on top, for the print shop only
  function guides(mag, w, h) {
    const n = mag ? NFC.mag : NFC.std, lab = (x, y, t, col) => `<text x="${x}" y="${y}" font-family="${MONO}" font-size="13" font-weight="700" fill="${col}">${t}</text>`;
    let g = `<g fill="none" stroke-width="2.5" stroke-dasharray="10 7">
  <rect x="30" y="30" width="${w - 60}" height="${h - 60}" rx="12" stroke="#00a3ff"/>
  <rect x="${n[0]}" y="${n[1]}" width="${n[2]}" height="${n[3]}" rx="10" stroke="#00c853"/>`;
    if (mag) g += `<circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.ro}" stroke="#ff00c8"/><circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.ri}" stroke="#ff00c8"/>`;
    g += `</g>` + lab(36, 24, "SAFE 3 mm", "#00a3ff") + lab(n[0] + 6, n[1] - 8, "NFC anti-metal 25×15 mm", "#00c853");
    if (mag) g += lab(RING.cx - 120, RING.cy - RING.ro - 10, "MagSafe Ø56/46 mm", "#ff00c8");
    return g;
  }

  // card: {n,r,v,s}; m: QR matrix {n, dark(r,c)}; a: {chef, wm: {d,w,h}, fontCss}; side: "front" | "back";
  // o: {mag: MagSafe 60 × 92 mm, guides: print zones on top}
  function svg(card, m, a, id, side, o) {
    a = a || {}; o = o || {};
    id = id || "k" + Math.random().toString(36).slice(2, 7);
    const c = { n: card.n || "Ola", r: card.r || "", v: card.v || "", s: S[card.s] ? card.s : "noir" };
    const w = o.mag ? MW : W, h = o.mag ? MH : H;
    let body = o.mag ? (side === "back" ? backMag(c, m, a, id) : frontMag(c, a, id)) : side === "back" ? back(c, m, a, id) : front(c, a, id);
    if (o.guides) body += guides(!!o.mag, w, h);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Passa Tip: ${esc(c.n)}">${a.fontCss ? `<style>${a.fontCss}</style>` : ""}${body}</svg>`;
  }
  root.PassaSkin = { svg, W, H, MW, MH, SKINS: Object.keys(S) };
})(typeof window !== "undefined" ? window : globalThis);
