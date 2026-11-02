# Builds the illustrated Reddit promo (first image of a gallery; pair it with the real-screens promo).
# Run from this folder with Pillow installed: python3 make_promo_art.py
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AV = '/System/Library/Fonts/Avenir Next.ttc'
MONO = '/System/Library/Fonts/SFNSMono.ttf'
f = lambda size, idx: ImageFont.truetype(AV, size, index=idx)
mono = lambda size: ImageFont.truetype(MONO, size)
W, H = 1080, 1350
NAVY, TEAL, TEAL_SOFT, INK, MUTED, VIOLET, AMBER = (4, 7, 15), (62, 230, 200), (127, 243, 220), (246, 249, 255), (190, 202, 222), (214, 200, 255), (255, 197, 102)

bg = Image.new('RGB', (W, H), NAVY)
art = Image.open('shots/anime-art.jpg').convert('RGB')
crop = art.crop((540, 0, 1720, art.height))  # the globe, the player and the city
s = W / crop.width
crop = crop.resize((W, round(crop.height * s)), Image.LANCZOS)
top = 190
# Extend the sky above the art (mirrored and blurred) so the title has open sky to sit on.
sky = crop.crop((0, 0, W, 140)).transpose(Image.FLIP_TOP_BOTTOM).resize((W, top + 80), Image.LANCZOS).filter(ImageFilter.GaussianBlur(28))
bg.paste(sky, (0, 0))
edge = Image.new('L', crop.size, 255); ed = ImageDraw.Draw(edge)
for y in range(80): ed.line((0, y, W, y), fill=int(255 * y / 80))
bg.paste(crop, (0, top), edge)

# Darken the sky behind the title, and fade the bottom of the art into navy.
shade = Image.new('L', (W, H), 0); sd = ImageDraw.Draw(shade)
for y in range(0, 300): sd.line((0, y, W, y), fill=int(150 * (1 - y / 300) ** 1.3))
fade_from, fade_to = 900, 1080
for y in range(fade_from, H): sd.line((0, y, W, y), fill=min(255, int(255 * ((y - fade_from) / (fade_to - fade_from)) ** 1.1)) if y < fade_to else 255)
bg.paste(Image.new('RGB', (W, H), NAVY), (0, 0), shade)
d = ImageDraw.Draw(bg)

def center(text, y, font, fill, spacing=0, shadow=False):
    w = d.textlength(text, font=font) + spacing * (len(text) - 1); x = (W - w) / 2
    if shadow:
        lay = Image.new('RGBA', (W, font.size * 2), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay); xx = x
        for ch in text: ld.text((xx, 0), ch, font=font, fill=(0, 0, 0, 200)); xx += d.textlength(ch, font=font) + spacing
        lay = lay.filter(ImageFilter.GaussianBlur(10)); bg.paste(lay, (0, int(y) + 3), lay)
    for ch in text: d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + spacing

center('A FREE GAME FOR THE LIVING PLANET', 40, mono(22), TEAL_SOFT, spacing=4, shadow=True)
title = f(104, 8); a = d.textlength('PLASTIC ', font=title); tw = a + d.textlength('PULSE', font=title); x = (W - tw) / 2
lay = Image.new('RGBA', (W, 180), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
ld.text((x, 20), 'PLASTIC ', font=title, fill=(0, 0, 0, 220)); ld.text((x + a, 20), 'PULSE', font=title, fill=(0, 0, 0, 220))
lay = lay.filter(ImageFilter.GaussianBlur(14)); bg.paste(lay, (0, 54), lay)
glow = Image.new('RGBA', (W, 180), (0, 0, 0, 0)); ImageDraw.Draw(glow).text((x + a, 20), 'PULSE', font=title, fill=(62, 230, 200, 255))
glow = glow.filter(ImageFilter.GaussianBlur(16)); bg.paste(glow, (0, 50), glow)
d = ImageDraw.Draw(bg)
d.text((x, 70), 'PLASTIC ', font=title, fill=INK); d.text((x + a, 70), 'PULSE', font=title, fill=TEAL)

# Bottom copy
center('The planet’s health is in our hands.', 1040, f(44, 8), INK)
center('Refuse plastic to heal your biome, collect 15 plastics in 3D,', 1100, f(29, 5), MUTED)
center('and watch the real Earth’s vital signs change, live.', 1138, f(29, 5), MUTED)
pill_font = mono(19)
pills = [('LIVE DATA · NOAA · NSIDC · INPE', TEAL_SOFT), ('FREE · NO SIGN-UP · 13+', AMBER)]
widths = [d.textlength(t, font=pill_font) + 36 for t, _ in pills]; gap = 14
x = (W - sum(widths) - gap) / 2; y = 1196
for (t, c), w in zip(pills, widths):
    d.rounded_rectangle((x, y, x + w, y + 40), 20, outline=c, width=2, fill=(10, 20, 34))
    d.text((x + 18, y + 9), t, font=pill_font, fill=c); x += w + gap
center('Play in your browser:  plastic-pulse.vercel.app', 1262, f(36, 0), INK)

bg.save('plastic-pulse-reddit-art-1080x1350.png', optimize=True); print('saved')
