"""Generate a clean, professional OG/social preview image (1200x630) with the brand logo above the text metadata."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

W, H = 1200, 630
NAVY_DARK = (20, 18, 58)
NAVY_MID = (30, 27, 75)
NAVY_LIGHT = (55, 48, 163)
GREEN = (52, 211, 153)
YELLOW = (250, 204, 21)
INDIGO_LIGHT = (199, 210, 254)
WHITE = (255, 255, 255)

FONT_DIR = r"C:\Windows\Fonts"


def font(name, size):
    return ImageFont.truetype(f"{FONT_DIR}\\{name}", size)


def radial_gradient(size, center, radius, inner, outer):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    px = layer.load()
    cx, cy = center
    for y in range(size[1]):
        for x in range(0, size[0], 2):
            d = math.hypot(x - cx, y - cy) / radius
            d = min(d, 1.0)
            r = int(inner[0] + (outer[0] - inner[0]) * d)
            g = int(inner[1] + (outer[1] - inner[1]) * d)
            b = int(inner[2] + (outer[2] - inner[2]) * d)
            a = int(255 * (1 - d) ** 1.4)
            px[x, y] = (r, g, b, a)
            if x + 1 < size[0]:
                px[x + 1, y] = (r, g, b, a)
    return layer


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size[0], size[1]], radius=radius, fill=255)
    return mask


def main():
    base = Image.new("RGB", (W, H), NAVY_MID)

    # Base vertical gradient navy
    grad = Image.new("RGB", (1, H), NAVY_MID)
    top = (25, 22, 68)
    bottom = (16, 15, 46)
    px = grad.load()
    for y in range(H):
        t = y / H
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        px[0, y] = (r, g, b)
    base = grad.resize((W, H))

    # Soft glow accents
    glow1 = radial_gradient((W, H), (int(W * 0.88), int(H * 0.12)), 420, (16, 185, 129), (16, 15, 46))
    glow2 = radial_gradient((W, H), (int(W * 0.06), int(H * 1.02)), 380, (250, 204, 21), (16, 15, 46))
    base = base.convert("RGBA")
    base.alpha_composite(glow1)
    base.alpha_composite(glow2)

    draw = ImageDraw.Draw(base)

    # Logo card (clean rounded white card) centered horizontally, upper area
    card_size = 168
    card_x = (W - card_size) // 2
    card_y = 64
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(
        [card_x - 6, card_y + 14, card_x + card_size + 6, card_y + card_size + 26],
        radius=40, fill=(0, 0, 0, 110),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    base.alpha_composite(shadow)

    card = Image.new("RGBA", (card_size, card_size), (255, 255, 255, 255))
    card_mask = rounded_mask((card_size, card_size), 38)
    base.paste(card, (card_x, card_y), card_mask)

    logo = Image.open(r"C:\Users\toshiba\Downloads\DoukoureImport-main\public\logo.png").convert("RGBA")
    inner = card_size - 36
    logo = logo.resize((inner, inner), Image.LANCZOS)
    logo_mask = rounded_mask((inner, inner), 24)
    base.paste(logo, (card_x + 18, card_y + 18), logo_mask)

    # Title
    title_font = font("segoeuib.ttf", 58)
    subtitle_font = font("segoeuib.ttf", 28)
    tagline_font = font("segoeui.ttf", 24)
    desc_font = font("segoeui.ttf", 22)

    def center_text(text, y, f, fill):
        bbox = draw.textbbox((0, 0), text, font=f)
        w = bbox[2] - bbox[0]
        draw.text(((W - w) / 2, y), text, font=f, fill=fill)

    center_text("Doukouré Import", 258, title_font, WHITE)
    center_text("Achat & Logistique", 332, subtitle_font, GREEN)
    center_text("Trouvez vos produits, payez 2/3 à la commande,", 384, desc_font, INDIGO_LIGHT)
    center_text("solde à la livraison.", 412, desc_font, INDIGO_LIGHT)

    route = "Chine  →  Sénégal   ·   Import direct"
    center_text(route, 468, tagline_font, (148, 163, 184))

    # Thin accent divider
    line_w = 120
    draw.rounded_rectangle(
        [(W - line_w) / 2, 520, (W + line_w) / 2, 526], radius=3, fill=GREEN
    )

    base.convert("RGB").save(
        r"C:\Users\toshiba\Downloads\DoukoureImport-main\public\og-image.png", "PNG", optimize=True
    )
    print("Saved og-image.png", base.size)


if __name__ == "__main__":
    main()
