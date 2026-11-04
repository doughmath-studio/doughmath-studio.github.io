// Renders a day's content spec (JSON) into Instagram-ready JPEGs with the Passa templates (frame.html).
// Usage: node social/render/render.mjs social/plan/2026-11-05.json [outdir]
// Spec: { "date": "YYYY-MM-DD", "items": [ { "id": "post1", "format": "post"|"story", "theme": "noir", "layout": "headline", ... } ] }
// A carousel is several items with the same "group" and "slide": "1/5" … ; they render as group-01.jpg, group-02.jpg …
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(process.argv[2]);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const out = resolve(process.argv[3] || join(here, "..", "p", spec.date));
mkdirSync(out, { recursive: true });

const b = await chromium.launch();
const files = [];
try {
  const counters = {};
  for (const it of spec.items) {
    const story = it.format === "story";
    const ctx = await b.newContext({ viewport: { width: 1080, height: story ? 1920 : 1350 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(join(here, "frame.html")).href);
    await p.evaluate((x) => window.render(x), it);
    await p.waitForTimeout(150);
    if (errs.length) throw new Error(it.id + ": " + errs.join("; "));
    const overflow = await p.evaluate(() => { const f = document.querySelector(".f"); return f.scrollHeight > f.clientHeight + 2; });
    let name = it.id;
    if (it.group) { counters[it.group] = (counters[it.group] || 0) + 1; name = it.group + "-" + String(counters[it.group]).padStart(2, "0"); }
    const file = join(out, name + ".jpg");
    await p.screenshot({ path: file, type: "jpeg", quality: 90 });
    files.push({ id: it.id, file, overflow });
    console.log((overflow ? "TEXT TOO LONG " : "ok ") + file);
    await ctx.close();
  }
} finally {
  await b.close();
}
if (files.some((f) => f.overflow)) { console.log("Shorten the texts marked TEXT TOO LONG and render again."); process.exit(2); }
