"""Beat-cut teaser Reel: the Passa chef stays in the centre while the object under him changes on every beat,
the cuts speed up, the light goes out and a pink neon line stays on screen.

Usage: python3 -I social/render/reel_beat.py social/plan/<reel>.json out.mp4
Spec: {"bpm": 120, "objects": ["../gen/reel1/o1.webp", …], "final": "../gen/…", "text": "Coś się gotuje.",
       "sub": "passa.cafe · wkrótce", "mascot_scale": 0.36}
Paths in the spec are relative to social/render/. Output: 1080×1920, 30 fps, H.264 + silent AAC (the trending sound
is added in the Instagram app; the cuts sit on the beat of the given BPM).
"""
import json, math, subprocess, sys, tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30


CACHE = Path.home() / ".cache" / "passa-fonts"
TTF = {"outfit": ("Outfit.ttf", "https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/Outfit%5Bwght%5D.ttf"),
       "mono": ("SpaceMono-Bold.ttf", "https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/SpaceMono-Bold.ttf")}


def font(key, size, weight=None):
    """Full TTF fonts (the web subsets in assets/fonts split Polish letters into a separate file)."""
    import urllib.request
    name, url = TTF[key]
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / name
    if not f.exists():
        urllib.request.urlretrieve(url, f)
    ft = ImageFont.truetype(str(f), size)
    if weight:
        ft.set_variation_by_axes([weight])
    return ft


def cover(im):
    im = im.convert("RGB")
    s = max(W / im.width, H / im.height)
    im = im.resize((math.ceil(im.width * s), math.ceil(im.height * s)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def ease_out(t): return 1 - (1 - t) ** 3


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    out = Path(sys.argv[2]).resolve()
    beat = 60.0 / spec.get("bpm", 120)
    objs = [cover(Image.open(HERE / p)) for p in spec["objects"]]
    final = cover(Image.open(HERE / spec.get("final", spec["objects"][-1])))
    chef = Image.open(HERE.parent / "assets" / "chef.webp").convert("RGBA")
    cw = int(W * spec.get("mascot_scale", 0.36))
    chef = chef.resize((cw, int(chef.height * cw / chef.width)), Image.LANCZOS)
    shadow = Image.new("RGBA", chef.size, (0, 0, 0, 0))
    shadow.putalpha(chef.getchannel("A").point(lambda a: int(a * 0.55)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))

    # timeline: (image, duration in seconds)
    cuts = [(o, beat) for o in objs]                                   # one object per beat
    cuts += [(o, beat / 2) for o in objs[:4]]                           # double time
    cuts += [(o, beat / 4) for o in objs[4:8]] if len(objs) >= 8 else []  # quadruple time
    cuts += [(final, beat * 1.5)]                                       # hold on the last object

    title, sub = spec.get("text", "Coś się gotuje."), spec.get("sub", "passa.cafe · wkrótce")
    f_title, f_sub = font("outfit", 104, 800), font("mono", 34)

    tmp = Path(tempfile.mkdtemp())
    n = 0

    def put(frame):
        nonlocal n
        frame.save(tmp / f"f{n:05d}.jpg", quality=92)
        n += 1

    def compose(bg, t_in_cut, light=1.0, bounce=True):
        k = min(1.0, t_in_cut / 0.12)
        zoom = 1.06 - 0.06 * ease_out(k)                               # punch-in on every cut
        if zoom != 1.0:
            zw, zh = int(W * zoom), int(H * zoom)
            bg = bg.resize((zw, zh), Image.BILINEAR).crop(((zw - W) // 2, (zh - H) // 2, (zw - W) // 2 + W, (zh - H) // 2 + H))
        fr = bg.copy()
        s = 1.0 + (0.05 * (1 - ease_out(k)) if bounce else 0)
        c = chef if s == 1.0 else chef.resize((int(chef.width * s), int(chef.height * s)), Image.BILINEAR)
        sh = shadow if s == 1.0 else shadow.resize(c.size, Image.BILINEAR)
        x, y = (W - c.width) // 2, (H - c.height) // 2
        fr.paste(sh, (x + 10, y + 26), sh)
        fr.paste(c, (x, y), c)
        if light < 1.0:
            fr = ImageEnhance.Brightness(fr).enhance(max(0.0, light))
        return fr

    for img, dur in cuts:
        for i in range(max(1, round(dur * FPS))):
            put(compose(img, i / FPS))

    # the light goes out: two flickers, then dark
    for lv in [0.25, 0.9, 0.15, 0.6, 0.05, 0.02]:
        for _ in range(2): put(compose(final, 1, light=lv, bounce=False))
    dark = compose(final, 1, light=0.04, bounce=False)

    def neon(alpha):
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        tw = d.textlength(title, font=f_title)
        ty = int(H * 0.70)
        d.text(((W - tw) / 2, ty), title, font=f_title, fill=(255, 92, 150, int(255 * alpha)))
        glow = layer.filter(ImageFilter.GaussianBlur(22))
        core = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dc = ImageDraw.Draw(core)
        dc.text(((W - tw) / 2, ty), title, font=f_title, fill=(255, 225, 236, int(255 * alpha)))
        sw = dc.textlength(sub, font=f_sub)
        dc.text(((W - sw) / 2, ty + 150), sub, font=f_sub, fill=(244, 237, 228, int(200 * alpha)))
        fr = dark.convert("RGBA")
        for _ in range(2): fr = Image.alpha_composite(fr, glow)
        return Image.alpha_composite(fr, core).convert("RGB")

    for a in [0.0, 0.0, 0.7, 0.1, 0.9, 0.3, 1.0]:                        # neon flickers on
        for _ in range(2): put(neon(a))
    for _ in range(int(2.6 * FPS)): put(neon(1.0))

    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "f%05d.jpg"),
                    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
                    "-shortest", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "slow",
                    "-crf", "18", "-maxrate", "5M", "-bufsize", "10M", "-g", "30", "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart", str(out)], check=True)
    print(f"ok {out} · {n / FPS:.1f} s · {n} frames · cuts on {spec.get('bpm', 120)} BPM")


if __name__ == "__main__":
    main()
