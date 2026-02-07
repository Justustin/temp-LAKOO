#!/usr/bin/env python3
"""Generate bazaar_poster.png for WhatsApp outreach."""

from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1080, 1700
OUT = os.path.join(os.path.dirname(__file__), 'bazaar_poster.png')

# --- Colors ---
BG_TOP = (10, 10, 10)
BG_BOT = (22, 33, 62)
WHITE = (255, 255, 255)
DIM = (255, 255, 255, 115)
DIMMER = (255, 255, 255, 80)
ACCENT = (255, 107, 107)
GREEN = (78, 205, 196)
CARD_BG = (255, 255, 255, 13)
CARD_BORDER = (255, 255, 255, 25)
ICON_COLORS = [
    (255, 107, 107, 38),  # red
    (78, 205, 196, 38),   # teal
    (255, 209, 102, 38),  # yellow
    (129, 140, 248, 38),  # purple
]

# --- Fonts ---
def font(size, bold=False):
    name = 'DejaVuSans-Bold' if bold else 'DejaVuSans'
    try:
        return ImageFont.truetype(f'/usr/share/fonts/truetype/dejavu/{name}.ttf', size)
    except OSError:
        return ImageFont.load_default()

f_logo = font(56, bold=True)
f_tagline = font(24)
f_headline = font(68, bold=True)
f_headline_sm = font(64, bold=True)
f_sub = font(26)
f_benefit_title = font(30, bold=True)
f_benefit_desc = font(22)
f_section = font(22, bold=True)
f_comp = font(26)
f_comp_hl = font(34, bold=True)
f_step = font(26)
f_step_num = font(24, bold=True)
f_footer = font(22)

# --- Create image with gradient ---
img = Image.new('RGBA', (W, H), BG_TOP)
draw = ImageDraw.Draw(img)

# gradient
for y in range(H):
    r = int(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * y / H)
    g = int(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * y / H)
    b = int(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * y / H)
    draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

# decorative circle
overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ov_draw = ImageDraw.Draw(overlay)
for r in range(300, 0, -1):
    alpha = int(38 * (r / 300))
    ov_draw.ellipse([W - 100 - r, -100 - r, W - 100 + r, -100 + r], fill=(255, 107, 107, alpha))
img = Image.alpha_composite(img, overlay)
draw = ImageDraw.Draw(img)

PAD_L = 70
PAD_R = W - 70
y = 72

# --- Logo ---
draw.text((PAD_L, y), 'LAKOO', fill=WHITE, font=f_logo)
y += 68

# --- Tagline ---
draw.text((PAD_L, y), 'Social Commerce untuk Fashion Lokal Indonesia', fill=(*WHITE[:3], 115), font=f_tagline)
y += 80

# --- Headline ---
draw.text((PAD_L, y), 'Gabung LAKOO,', fill=WHITE, font=f_headline)
y += 82
draw.text((PAD_L, y), 'Dapat', fill=WHITE, font=f_headline)
# "Rp 1 Juta" in accent color
x_rp = PAD_L + draw.textlength('Dapat ', font=f_headline)
draw.text((x_rp, y), 'Rp 1 Juta', fill=ACCENT, font=f_headline)
y += 100

# --- Subheadline ---
sub_text = 'Kita bantu brand kamu ditemukan ribuan\ncustomer baru lewat platform discovery\nfashion terbesar di Indonesia.'
for line in sub_text.split('\n'):
    draw.text((PAD_L, y), line, fill=(*WHITE[:3], 140), font=f_sub)
    y += 38
y += 40

# --- Benefits ---
benefits = [
    ('Sponsorship Rp 1.000.000', 'Cash langsung transfer ke rekening kamu'),
    ('Toko Online Gratis', 'Tim kita yang set up — kamu tinggal approve'),
    ('Migrasi 10 Post IG', 'Konten kamu langsung tampil di LAKOO'),
    ('Komisi Cuma 0.5%', 'Paling kecil di Indonesia — simpan 99.5%'),
]
icons = ['$', '#', '!', '%']  # placeholder symbols

for i, (title, desc) in enumerate(benefits):
    # icon bg
    icon_col = ICON_COLORS[i]
    draw.rounded_rectangle(
        [PAD_L, y, PAD_L + 80, y + 80],
        radius=16, fill=icon_col
    )
    # icon text
    icon_labels = ['Rp', 'WA', 'IG', '0.5']
    iw = draw.textlength(icon_labels[i], font=font(20, bold=True))
    draw.text((PAD_L + 40 - iw / 2, y + 26), icon_labels[i], fill=(*icon_col[:3], 200), font=font(20, bold=True))

    # text
    draw.text((PAD_L + 100, y + 10), title, fill=WHITE, font=f_benefit_title)
    draw.text((PAD_L + 100, y + 48), desc, fill=(*WHITE[:3], 115), font=f_benefit_desc)
    y += 100

y += 20

# --- Commission Comparison card ---
card_top = y
card_h = 340
# card background
card_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
cd = ImageDraw.Draw(card_overlay)
cd.rounded_rectangle(
    [PAD_L, card_top, PAD_R, card_top + card_h],
    radius=24, fill=(255, 255, 255, 13), outline=(255, 255, 255, 25), width=1
)
img = Image.alpha_composite(img, card_overlay)
draw = ImageDraw.Draw(img)

y = card_top + 28
draw.text((PAD_L + 30, y), 'PERBANDINGAN KOMISI', fill=(*WHITE[:3], 115), font=f_section)
y += 48

comps = [
    ('Shopee', '5 – 15%'),
    ('Tokopedia', '5 – 10%'),
    ('TikTok Shop', '5 – 8%'),
    ('Instagram', 'Tidak bisa checkout'),
]

for name, rate in comps:
    draw.text((PAD_L + 30, y), name, fill=(*WHITE[:3], 100), font=f_comp)
    rw = draw.textlength(rate, font=f_comp)
    draw.text((PAD_R - 30 - rw, y), rate, fill=(*WHITE[:3], 100), font=f_comp)
    y += 42
    # separator line
    draw.line([(PAD_L + 30, y), (PAD_R - 30, y)], fill=(*WHITE[:3], 15), width=1)
    y += 10

# LAKOO highlight row
draw.text((PAD_L + 30, y), 'LAKOO', fill=WHITE, font=f_comp_hl)
rw = draw.textlength('0.5%', font=f_comp_hl)
draw.text((PAD_R - 30 - rw, y), '0.5%', fill=GREEN, font=f_comp_hl)

y = card_top + card_h + 40

# --- Steps ---
draw.text((PAD_L, y), 'PROSESNYA GAMPANG', fill=(*WHITE[:3], 115), font=f_section)
y += 50

steps = [
    'Setuju gabung — kita transfer Rp 1 juta',
    'Tim LAKOO set up toko kamu',
    'Kamu review & approve — langsung live!',
]

for i, text in enumerate(steps):
    num = str(i + 1)
    # circle with number
    cx, cy = PAD_L + 24, y + 18
    step_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(step_overlay)
    sd.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=(255, 255, 255, 40))
    img = Image.alpha_composite(img, step_overlay)
    draw = ImageDraw.Draw(img)
    nw = draw.textlength(num, font=f_step_num)
    draw.text((cx - nw / 2, cy - 16), num, fill=WHITE, font=f_step_num)
    # text
    draw.text((PAD_L + 64, y + 2), text, fill=(*WHITE[:3], 200), font=f_step)
    y += 60

y += 20

# --- Footer ---
footer = 'Kamu nggak perlu ngapa-ngapain — kita yang handle semuanya.'
fw = draw.textlength(footer, font=f_footer)
draw.text(((W - fw) / 2, y + 20), footer, fill=(*WHITE[:3], 80), font=f_footer)

# --- Save ---
img = img.convert('RGB')
img.save(OUT, 'PNG', quality=95)
print(f'Saved: {OUT} ({os.path.getsize(OUT)} bytes)')
