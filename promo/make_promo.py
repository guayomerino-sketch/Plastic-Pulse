# Builds the Reddit promo image. Run from this folder with Pillow installed: python3 make_promo.py
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

TR = 'shots/'  # real game screenshots (phone size), captured from the live site
SHOTS = {'pulse': TR + 'pulse.jpg', 'world': TR + 'world.jpg', 'book': TR + 'book.jpg'}
AV = '/System/Library/Fonts/Avenir Next.ttc'
MONO = '/System/Library/Fonts/SFNSMono.ttf'
f = lambda size, idx: ImageFont.truetype(AV, size, index=idx)
mono = lambda size: ImageFont.truetype(MONO, size)
W, H = 1080, 1350
TEAL, TEAL_SOFT, INK, MUTED, VIOLET = (62, 230, 200), (127, 243, 220), (246, 249, 255), (159, 179, 204), (214, 200, 255)

# Background: deep space navy with a teal glow behind the phones and a few stars.
bg = Image.new('RGB', (W, H), (4, 7, 15))
glow = Image.new('RGB', (W, H), (0, 0, 0)); g = ImageDraw.Draw(glow)
g.ellipse((140, 520, 940, 1240), fill=(14, 70, 78)); g.ellipse((320, 300, 760, 700), fill=(28, 22, 70))
bg = Image.blend(bg, glow.filter(ImageFilter.GaussianBlur(160)), 0.85)
d = ImageDraw.Draw(bg); random.seed(4)
for _ in range(160):
    x, y, r = random.randrange(W), random.randrange(H), random.choice([1, 1, 1, 2])
    if 40 < y < 340 and 120 < x < 960: continue  # keep the headline clear
    a = random.randint(90, 230); d.ellipse((x, y, x + r, y + r), fill=(a, a, min(255, a + 20)))

def phone(path, width, crop=None):
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    h = round(width * im.height / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    r = round(width * 0.11)
    mask = Image.new('L', (width, h), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, h - 1), r, fill=255)
    out = Image.new('RGBA', (width + 16, h + 16), (0, 0, 0, 0))
    ImageDraw.Draw(out).rounded_rectangle((0, 0, width + 15, h + 15), r + 8, fill=(22, 30, 46, 255), outline=(90, 110, 140, 255), width=2)
    out.paste(im, (8, 8), mask)
    return out

def place(img, x, y, shadow=True):
    if shadow:
        sh = Image.new('RGBA', (img.width + 120, img.height + 120), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((60, 80, img.width + 60, img.height + 70), 60, fill=(0, 0, 0, 170))
        bg.paste(sh.filter(ImageFilter.GaussianBlur(28)), (x - 60, y - 60), sh.filter(ImageFilter.GaussianBlur(28)))
        hl = Image.new('RGBA', (img.width + 80, img.height + 80), (0, 0, 0, 0))
        ImageDraw.Draw(hl).rounded_rectangle((40, 40, img.width + 40, img.height + 40), 56, outline=(62, 230, 200, 90), width=6)
        hl = hl.filter(ImageFilter.GaussianBlur(14)); bg.paste(hl, (x - 40, y - 40), hl)
    bg.paste(img, (x, y), img)

side_w, mid_w = 300, 392
left = phone(SHOTS['pulse'], side_w); right = phone(SHOTS['book'], side_w); mid = phone(SHOTS['world'], mid_w)
place(left, 40, 452); place(right, W - 40 - right.width, 452); place(mid, (W - mid.width) // 2, 356)

# Fade the bottom of the phones into the background so the text below reads cleanly.
fade = Image.new('L', (W, 360), 0); fd = ImageDraw.Draw(fade)
for i in range(360): fd.line((0, i, W, i), fill=min(255, int(255 * (i / 230) ** 1.4)))
cover = Image.new('RGB', (W, 360), (4, 8, 16)); bg.paste(cover, (0, H - 360), fade)
d = ImageDraw.Draw(bg)

def center(text, y, font, fill, spacing=0):
    w = d.textlength(text, font=font) + spacing * (len(text) - 1)
    x = (W - w) / 2
    if spacing:
        for ch in text: d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + spacing
    else: d.text((x, y), text, font=font, fill=fill)

# Header
center('A FREE GAME FOR THE LIVING PLANET', 64, mono(22), TEAL_SOFT, spacing=4)
title = f(104, 8); tw = d.textlength('PLASTIC ', font=title) + d.textlength('PULSE', font=title); x = (W - tw) / 2
d.text((x, 100), 'PLASTIC ', font=title, fill=INK)
pul = Image.new('RGBA', (W, 200), (0, 0, 0, 0)); ImageDraw.Draw(pul).text((x + d.textlength('PLASTIC ', font=title), 0), 'PULSE', font=title, fill=(62, 230, 200, 255))
bg.paste(pul.filter(ImageFilter.GaussianBlur(14)), (0, 100), pul.filter(ImageFilter.GaussianBlur(14)))
d = ImageDraw.Draw(bg); d.text((x + d.textlength('PLASTIC ', font=title), 100), 'PULSE', font=title, fill=TEAL)
center('Every plastic you refuse keeps a living world alive.', 236, f(34, 2), INK)
center('Then watch the real Earth’s vital signs, live.', 282, f(34, 5), MUTED)

# Footer
pill_font = mono(19)
pills = [('LIVE DATA · NOAA · NSIDC · INPE', TEAL_SOFT), ('15 PLASTICS IN 3D', VIOLET), ('FREE · NO SIGN-UP · 13+', (255, 197, 102))]
widths = [d.textlength(t, font=pill_font) + 36 for t, _ in pills]; gap = 12
x = (W - sum(widths) - gap * (len(pills) - 1)) / 2; y = 1188
for (t, c), w in zip(pills, widths):
    d.rounded_rectangle((x, y, x + w, y + 40), 20, outline=c, width=2, fill=(10, 20, 34))
    d.text((x + 18, y + 9), t, font=pill_font, fill=c); x += w + gap
center('Play in your browser:  plastic-pulse.vercel.app', 1258, f(36, 0), INK)

out = 'plastic-pulse-reddit-1080x1350.png'
bg.save(out, optimize=True); print(out)
