"""Beat-cut teaser Reel: the Passa chef stays in the centre while the object behind him changes on every beat,
the cuts speed up, the light goes out and a pink neon line buzzes on.

Usage: python3 -I social/render/reel_beat.py social/plan/<reel>.json out.mp4 [preview_dir]
Spec: {"bpm": 120, "objects": ["../gen/reel1/o1.webp", …], "final": "../gen/…", "text": "Coś się gotuje.",
       "sub": "passa.cafe · wkrótce", "mascot_scale": 0.36}
Paths in the spec are relative to social/render/. Output: 1080×1920, 30 fps, H.264 + silent AAC (the trending sound
is added in the Instagram app; the cuts sit on the beat of the given BPM). With preview_dir, key frames are also
saved there as 1080×1920 JPEG (for QA and for showing the owner).

Look: cinematic grade (warm highlights, deep shadows, vignette), film grain on every frame, a slow push-in inside
every shot plus a punch-in and exposure flash on the cut, the chef bobs on the beat, fast cuts get a little camera
shake, and the ending is a lights-out flicker into a pink neon tube that lights the chef from below.
"""
import json, math, random, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30
PINK = (255, 64, 140)

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


def cover(im, extra=1.12):
    """Scale to cover the frame with a margin for push-in and shake; returns a float32 array."""
    im = im.convert("RGB")
    s = max(W / im.width, H / im.height) * extra
    im = im.resize((math.ceil(im.width * s), math.ceil(im.height * s)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=2.2, percent=60, threshold=2))
    return grade(np.asarray(im, dtype=np.float32) / 255.0)


def grade(a):
    """Filmic grade: gentle S-curve, warm highlights, cool deep shadows."""
    a = np.clip(a, 0, 1)
    a = a * a * (3 - 2 * a) * 0.55 + a * 0.45                      # S-curve
    lum = a.mean(axis=2, keepdims=True)
    warm = np.array([1.04, 1.0, 0.93], dtype=np.float32)
    cool = np.array([0.94, 0.98, 1.06], dtype=np.float32)
    a = a * (lum * warm + (1 - lum) * cool)
    return np.clip(a, 0, 1)


def ease_out(t): return 1 - (1 - t) ** 3


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIGNETTE = (1 - 0.55 * (((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.47) / (H * 0.62)) ** 2)).clip(0.25, 1)[..., None]
RNG = np.random.default_rng(7)
GRAIN = [RNG.normal(0, 1, (H // 2, W // 2)).astype(np.float32) for _ in range(6)]


def crop(src, zoom, dx=0.0, dy=0.0):
    """Crop a W×H window out of the oversized shot at the given zoom (1 = full margin) and offset in px."""
    sh, sw = src.shape[:2]
    cw, ch = int(sw / zoom), int(sh / zoom)
    cw, ch = max(cw, W), max(ch, H)
    x = int((sw - cw) / 2 + dx); y = int((sh - ch) / 2 + dy)
    x = min(max(x, 0), sw - cw); y = min(max(y, 0), sh - ch)
    win = src[y:y + ch, x:x + cw]
    if (cw, ch) != (W, H):
        win = np.asarray(Image.fromarray((win * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR), np.float32) / 255
    return win


def finish(a, n, grain=0.035):
    a = a * VIGNETTE
    g = GRAIN[n % len(GRAIN)]
    g = np.repeat(np.repeat(g, 2, 0), 2, 1)[..., None]
    a = a + g * grain * (0.35 + 0.65 * (1 - a))                    # grain mostly in the shadows, like film
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    out = Path(sys.argv[2]).resolve()
    prev_dir = Path(sys.argv[3]).resolve() if len(sys.argv) > 3 else None
    beat = 60.0 / spec.get("bpm", 120)
    cache = {}
    def load(p):
        if p not in cache: cache[p] = cover(Image.open(HERE / p))
        return cache[p]
    objs = [load(p) for p in spec["objects"]]
    final = load(spec.get("final", spec["objects"][-1]))

    chef0 = Image.open(HERE.parent / "assets" / "chef.webp").convert("RGBA")
    cw = int(W * spec.get("mascot_scale", 0.36))
    chef = chef0.resize((cw, int(chef0.height * cw / chef0.width)), Image.LANCZOS)
    PAD = 80                                                                 # room for the soft shadow
    def padded(im):
        p = Image.new("RGBA", (im.width + 2 * PAD, im.height + 2 * PAD), (0, 0, 0, 0)); p.paste(im, (PAD, PAD)); return p
    chef = padded(chef)
    chef_a = np.asarray(chef, np.float32) / 255
    shadow = np.asarray(chef.getchannel("A").filter(ImageFilter.GaussianBlur(26)), np.float32)[..., None] / 255 * 0.6

    # timeline: (shot, duration in s, shake)
    cuts = [(o, beat, 0) for o in objs]                                     # one object per beat
    cuts += [(o, beat / 2, 4) for o in objs[:4]]                             # double time
    cuts += [(o, beat / 4, 9) for o in objs[4:8]] if len(objs) >= 8 else []  # quadruple time
    cuts += [(final, beat * 1.5, 0)]                                        # hold on the last object

    title, sub = spec.get("text", "Coś się gotuje."), spec.get("sub", "passa.cafe · wkrótce")
    f_title, f_sub = font("outfit", 112, 600), font("mono", 32)

    tmp = Path(tempfile.mkdtemp())
    n = 0
    keep = {}

    def put(img, tag=None):
        nonlocal n
        img.save(tmp / f"f{n:05d}.jpg", quality=93)
        if tag and tag not in keep: keep[tag] = img
        n += 1

    def chef_on(a, bob=0.0, light=1.0, tint=None):
        """Composite the chef (numpy, premultiplied) with a soft shadow; bob squashes him on the beat."""
        c, s = chef_a, shadow
        if bob:
            sx, sy = 1 + 0.035 * bob, 1 - 0.045 * bob
            im = padded(chef0.resize((int(cw * sx), int(chef0.height * cw / chef0.width * sy)), Image.BILINEAR))
            c = np.asarray(im, np.float32) / 255
            s = np.asarray(im.getchannel("A").filter(ImageFilter.GaussianBlur(26)), np.float32)[..., None] / 255 * 0.6
        h, w = c.shape[:2]
        x, y = (W - w) // 2, int(H * 0.47) - h + (chef_a.shape[0] // 2)
        sy0, sx0 = y + 34, x + 6
        a[sy0:sy0 + h, sx0:sx0 + w] *= 1 - s * light
        rgb, al = c[..., :3], c[..., 3:4]
        rgb = rgb * light
        if tint is not None: rgb = rgb * tint
        a[y:y + h, x:x + w] = a[y:y + h, x:x + w] * (1 - al) + rgb * al
        return a

    total_beat_t = 0.0
    for img, dur, shake in cuts:
        frames = max(1, round(dur * FPS))
        for i in range(frames):
            t = i / FPS
            k = min(1.0, t / 0.16)
            zoom = 1.0 + 0.07 * (1 - ease_out(k)) + 0.05 * (t / max(dur, 0.5))      # punch-in, then slow push
            dx = dy = 0.0
            if shake:
                dx, dy = random.uniform(-shake, shake), random.uniform(-shake, shake)
            a = crop(img, zoom, dx, dy).copy()
            a = a * (1 + 0.55 * max(0.0, 1 - t / 0.10))                              # exposure flash on the cut
            bob = max(0.0, 1 - ((total_beat_t + t) % beat) / (beat * 0.35))           # squash on every beat
            a = chef_on(a, bob=bob)
            put(finish(a, n), tag=f"cut{len(keep):02d}" if i == frames // 2 else None)
        total_beat_t += frames / FPS

    # the light goes out: flickers, then dark
    base = crop(final, 1.05)
    for lv in [0.3, 1.0, 0.18, 0.7, 0.06, 0.4, 0.03, 0.02]:
        for _ in range(2):
            put(finish(chef_on(base * lv, light=max(lv, 0.05)), n))

    # neon
    def text_layer(fill_rgb, fill_a, ty):
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        tw = d.textlength(title, font=f_title)
        d.text(((W - tw) / 2, ty), title, font=f_title, fill=fill_rgb + (fill_a,))
        return layer

    ty = int(H * 0.665)
    mask = np.asarray(text_layer((255, 255, 255), 255, ty).getchannel("A"), np.float32) / 255
    m_img = Image.fromarray((mask * 255).astype(np.uint8))
    glow_t = np.asarray(m_img.filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
    glow_m = np.asarray(m_img.filter(ImageFilter.GaussianBlur(22)), np.float32) / 255
    glow_w = np.asarray(m_img.filter(ImageFilter.GaussianBlur(90)), np.float32) / 255
    core = np.asarray(m_img.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
    sub_l = Image.new("L", (W, H), 0)
    ds = ImageDraw.Draw(sub_l)
    sw = ds.textlength(sub, font=f_sub)
    ds.text(((W - sw) / 2, ty + 178), sub, font=f_sub, fill=255)
    sub_m = np.asarray(sub_l, np.float32)[..., None] / 255
    pink = np.array(PINK, np.float32) / 255
    # pink light spill from the tube onto the scene (stronger towards the text)
    spill = np.clip(1 - np.abs(yy - (ty + 60)) / (H * 0.55), 0, 1)[..., None] ** 2
    dark = base * 0.035

    def neon(alpha, sub_a):
        a = dark + spill * pink * 0.20 * alpha
        a = chef_on(a.copy(), light=0.10 + 0.32 * alpha, tint=np.array([1.0, 0.55, 0.75], np.float32))
        a = a + pink * (glow_w * 0.55 + glow_m * 0.9 + glow_t * 1.0)[..., None] * alpha
        a = a + (np.array([1.0, 0.86, 0.92], np.float32) - a) * (core[..., None] * alpha)
        a = a + (np.array([0.96, 0.93, 0.89], np.float32) - a) * sub_m * 0.85 * sub_a
        return finish(a, n, grain=0.03)

    for al in [0, 0, 0.8, 0.05, 0.05, 0.95, 0.2, 1.0, 0.6, 1.0]:              # tube strikes
        put(neon(al, 0.0))
    for i in range(int(2.8 * FPS)):
        buzz = 1.0 - (0.35 if i in (34, 35, 61) else 0) - 0.04 * random.random()
        put(neon(buzz, min(1.0, i / 12)), tag="neon" if i == 60 else None)

    if prev_dir:
        prev_dir.mkdir(parents=True, exist_ok=True)
        for tag, im in keep.items():
            im.save(prev_dir / f"{tag}.jpg", quality=92)

    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "f%05d.jpg"),
                    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
                    "-shortest", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "slow",
                    "-crf", "18", "-maxrate", "6M", "-bufsize", "12M", "-g", "30", "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart", str(out)], check=True)
    print(f"ok {out} · {n / FPS:.1f} s · {n} frames · cuts on {spec.get('bpm', 120)} BPM")


if __name__ == "__main__":
    random.seed(7)
    main()
