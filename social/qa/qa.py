"""Quality gate before anything is published to @passa.cafe.

Usage: python3 -I social/qa/qa.py social/plan/YYYY-MM-DD.json [rendered_dir]
Checks every item of the day's plan and its rendered JPEG; writes social/qa/last-sheet.jpg (all frames side by side)
for the visual check. Exit code 0 = PASS, 1 = FAIL (nothing may be published), warnings never block.

Item fields read here: id, group, format, layout, photo, ai (true when people/scenes are AI-generated),
caption (post caption; the first item of a carousel group carries it), plus every visible text field.
"""
import json, os, re, sys, urllib.request
from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
DICT = Path.home() / ".cache" / "passa-dict" / "pl_PL"
DICT_URL = "https://raw.githubusercontent.com/LibreOffice/dictionaries/master/pl_PL/pl_PL."

AI_LINE = "Postacie i zdjęcia: AI 🎨"
ALLOWED_ZL = {"0", "9", "15", "25", "39", "65", "99", "179", "299"}          # prices from the product facts
ALLOWED_PCT = {"0", "1", "0,7", "0,5", "30"}                                  # 30% = Passa venues discount on cards
BANNED = ["w dzisiejszym", "dynamicznym świecie", "odkryj", "rewolucj", "przełomow", "nie przegap", "game changer",
          "innowacyjn", r"najlepsz\w* na rynku", r"najlepsz\w* w polsce", "gwarantujemy", "100% skuteczn", "zarabiaj", "polecają nas"]
WORDS_OK = {w.lower() for w in """passa tip tippin tiptip tipx fasttip tipped revolut paypal blik magsafe nfc qr pov ai
    instagram reels kraków krakow kazimierz ola marek tomek krysia szef pani passa.cafe zł gratis online menu kelner
    kelnerka barista napiwek napiwki napiwków ok hej cześć emoji lol xd wifi app apka apki ntag noir espresso masło
    krakowska krakowskiej gastro gastronomia gastrokrakow kawiarniakrakow restauracjakrakow""".split()}

fails, warns = [], []


def fail(item, msg): fails.append(f"FAIL {item}: {msg}")
def warn(item, msg): warns.append(f"warn {item}: {msg}")


def dictionary():
    try:
        from spylls.hunspell import Dictionary
    except ImportError:
        warn("spellcheck", "spylls is not installed (pip install spylls) — spelling NOT checked")
        return None
    DICT.parent.mkdir(parents=True, exist_ok=True)
    for ext in ("aff", "dic"):
        f = Path(str(DICT) + "." + ext)
        if not f.exists():
            urllib.request.urlretrieve(DICT_URL + ext, f)
    return Dictionary.from_files(str(DICT))


def texts(it):
    out = []
    for k in ("eyebrow", "title", "sub", "punch", "label", "number", "body", "contact"):
        if it.get(k): out.append(str(it[k]))
    for k in ("pills", "options"):
        out += [str(x) for x in it.get(k) or []]
    for x in it.get("lines") or []: out.append(str(x.get("text", "")))
    for x in it.get("items") or []: out += [str(x.get("b", "")), str(x.get("t", ""))]
    for x in it.get("boxes") or []: out.append(str(x.get("text", "")))
    return out


def spell(d, name, text):
    if not d: return
    clean = re.sub(r"https?://\S+|\S+\.(cafe|pl|com)\S*|[#@]\S+|\*+|~~", " ", text)
    for w in re.findall(r"[A-Za-zÀ-žĄĆĘŁŃÓŚŹŻąćęłńóśźż]+(?:'[a-z]+)?", clean):
        lw = w.lower().strip("'")
        if len(lw) < 3 or lw in WORDS_OK or w.isupper():
            continue
        if not (d.lookup(w) or d.lookup(lw) or d.lookup(lw.capitalize())):
            sug = list(d.suggest(w))[:3]
            fail(name, f"spelling: «{w}»" + (f" → {', '.join(sug)}?" if sug else ""))


def facts(name, text):
    low = text.lower()
    for b in BANNED:
        if re.search(b, low): fail(name, f"banned phrase «{b}» (sounds like AI or promises too much)")
    for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*zł", text):
        if m.group(1).replace(".", ",") not in ALLOWED_ZL:
            fail(name, f"price «{m.group(0)}» is not in the product facts")
    for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*%", text):
        if m.group(1).replace(".", ",") not in ALLOWED_PCT:
            warn(name, f"percentage «{m.group(0)}» — must have a source in the caption or on the image")
    for m in re.finditer(r"\b([a-z0-9-]+\.(?:pl|com|cafe|app|io|me))\b", low):
        if m.group(1) not in ("passa.cafe", "tippin.pl", "tiptip.com.pl", "tipx.pl", "fasttip.app", "revolut.me", "paypal.me"):
            warn(name, f"link to «{m.group(1)}»")


def caption_checks(name, cap, ai):
    if len(cap) > 2200: fail(name, f"caption {len(cap)} > 2200 characters")
    first = cap.strip().split("\n")[0]
    if len(first) > 90: warn(name, f"first line is {len(first)} characters — the hook should fit before «…więcej» (≤ 90)")
    tags = re.findall(r"#\w+", cap)
    if not 3 <= len(tags) <= 6: fail(name, f"{len(tags)} hashtags — use 3 to 6")
    if ai and not cap.rstrip().endswith(AI_LINE): fail(name, f"AI content: the caption must end with «{AI_LINE}»")
    if not ai and "AI" in cap.split("\n")[-1]: warn(name, "AI line on a post without AI people?")


def image_checks(name, path, story, it):
    if not path.exists(): return fail(name, f"rendered file missing: {path}")
    im = Image.open(path)
    if im.format != "JPEG": fail(name, f"format {im.format}, Instagram needs JPEG")
    want = (1080, 1920) if story else (1080, 1350)
    if im.size != want: fail(name, f"size {im.size}, expected {want}")
    if path.stat().st_size > 8 * 1024 * 1024: fail(name, "file over 8 MB")
    if max(ImageStat.Stat(im.convert("L")).stddev) < 12: fail(name, "image looks blank or flat")
    if it.get("layout") == "photo":
        src = (ROOT / "render" / it["photo"]).resolve()
        if not src.exists(): fail(name, f"photo missing: {it['photo']}")
        else:
            s = Image.open(src)
            if min(s.size) < 1024: fail(name, f"source photo too small {s.size} (needs ≥ 1024 px on the short side)")


def main():
    spec_path = Path(sys.argv[1]).resolve()
    spec = json.load(open(spec_path, encoding="utf-8"))
    out = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT / "p" / spec["date"]
    d = dictionary()
    counters, frames = {}, []
    groups_with_caption = set()
    for it in spec["items"]:
        story = it.get("format") == "story"
        if it.get("group"):
            counters[it["group"]] = counters.get(it["group"], 0) + 1
            fname = f"{it['group']}-{counters[it['group']]:02d}.jpg"
            if it.get("caption"): groups_with_caption.add(it["group"])
        else:
            fname = it["id"] + ".jpg"
        name = f"{it['id']} ({fname})"
        frames.append(out / fname)
        image_checks(name, out / fname, story, it)
        for t in texts(it):
            spell(d, name, t); facts(name, t)
            if len(t) > 160: warn(name, "long text on the image — people read 1–2 short lines")
        if it.get("caption"):
            spell(d, name + " caption", it["caption"]); facts(name + " caption", it["caption"])
            caption_checks(name, it["caption"], bool(it.get("ai")))
        elif not story and not it.get("group"):
            fail(name, "feed post without a caption")
        if it.get("layout") == "photo" and not it.get("ai") and not it.get("credit"):
            warn(name, "photo without «ai»: true and without a credit — whose photo is it?")
    for g in counters:
        if g not in groups_with_caption: fail(g, "carousel without a caption on its first slide")
    # contact sheet for the visual check (hands, faces, cut text, the card)
    ims = [Image.open(f).convert("RGB") for f in frames if f.exists()]
    if ims:
        h = 640
        row = [im.resize((int(im.width * h / im.height), h)) for im in ims]
        sheet = Image.new("RGB", (sum(i.width for i in row) + 12 * (len(row) + 1), h + 24), (32, 32, 32))
        x = 12
        for i in row: sheet.paste(i, (x, 12)); x += i.width + 12
        sheet.save(ROOT / "qa" / "last-sheet.jpg", quality=85)
    for line in fails + warns: print(line)
    print(f"QA {'PASS' if not fails else 'FAIL'}: {len(fails)} errors, {len(warns)} warnings · sheet: social/qa/last-sheet.jpg")
    print("Now LOOK at the sheet: hands and fingers, faces, cut or covered text, extra objects, the Passa card. Fix and re-run if anything is off.")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
