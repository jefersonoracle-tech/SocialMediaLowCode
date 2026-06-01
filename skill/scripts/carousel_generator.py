#!/usr/bin/env python3
"""
Gerador de Carrossel para Instagram v2
Gera slides em PNG no formato 1080x1350 (4:5 retrato).
Centralização vertical automática + elementos decorativos.
"""

import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1350
MARGIN = 80
CONTENT_WIDTH = WIDTH - (MARGIN * 2)
FOOTER_ZONE = 80  # reservado para paginação + handle

PALETTES = {
    "profissional": {
        "bg": "#1A1A2E", "bg_accent": "#16213E",
        "text_primary": "#FFFFFF", "text_secondary": "#A0AEC0",
        "accent": "#E94560", "accent_soft": "#533483", "card_bg": "#0F3460",
    },
    "moderno": {
        "bg": "#0D1117", "bg_accent": "#161B22",
        "text_primary": "#F0F6FC", "text_secondary": "#8B949E",
        "accent": "#58A6FF", "accent_soft": "#1F6FEB", "card_bg": "#21262D",
    },
    "educativo": {
        "bg": "#FFFBF0", "bg_accent": "#FFF5E1",
        "text_primary": "#1A1A1A", "text_secondary": "#555555",
        "accent": "#FF6B35", "accent_soft": "#FFB563", "card_bg": "#FFF0D4",
    },
    "minimalista": {
        "bg": "#FAFAFA", "bg_accent": "#F0F0F0",
        "text_primary": "#111111", "text_secondary": "#666666",
        "accent": "#000000", "accent_soft": "#333333", "card_bg": "#EEEEEE",
    },
    "ousado": {
        "bg": "#0B0B0F", "bg_accent": "#1A1A2E",
        "text_primary": "#FFFFFF", "text_secondary": "#CCCCCC",
        "accent": "#FFD700", "accent_soft": "#FF6347", "card_bg": "#1E1E30",
    },
    "natureza": {
        "bg": "#1B4332", "bg_accent": "#2D6A4F",
        "text_primary": "#FFFFFF", "text_secondary": "#D8F3DC",
        "accent": "#95D5B2", "accent_soft": "#74C69D", "card_bg": "#40916C",
    },
}


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except (OSError, IOError):
        return ImageFont.load_default()


def wrap_text(text, font, max_width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = f"{cur} {w}".strip()
        if font.getbbox(test)[2] - font.getbbox(test)[0] <= max_width:
            cur = test
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines


def text_block_height(text, font, max_width, line_spacing=1.4):
    lines = wrap_text(text, font, max_width)
    a, d = font.getmetrics()
    return int((a + d) * line_spacing) * len(lines)


def draw_text_block(draw, text, font, color, x, y, max_width, line_spacing=1.4, align="left"):
    lines = wrap_text(text, font, max_width)
    rgb = hex_to_rgb(color)
    a, d = font.getmetrics()
    lh = int((a + d) * line_spacing)
    for line in lines:
        tw = font.getbbox(line)[2] - font.getbbox(line)[0]
        if align == "center":
            lx = x + (max_width - tw) // 2
        elif align == "right":
            lx = x + max_width - tw
        else:
            lx = x
        draw.text((lx, y), line, font=font, fill=rgb)
        y += lh
    return y


def draw_pagination(draw, current, total, y, palette):
    dot_r, spacing = 6, 24
    sx = (WIDTH - (total - 1) * spacing) // 2
    for i in range(total):
        cx = sx + i * spacing
        c = hex_to_rgb(palette["accent"] if i == current else palette["text_secondary"])
        draw.ellipse((cx-dot_r, y-dot_r, cx+dot_r, y+dot_r), fill=c)


def draw_accent_bar(draw, palette, position="top"):
    c = hex_to_rgb(palette["accent"])
    if position == "top":
        draw.rectangle([(0, 0), (WIDTH, 8)], fill=c)
    elif position == "left":
        draw.rectangle([(0, 0), (8, HEIGHT)], fill=c)


def draw_decorative_shape(draw, palette, shape_type="corner_accent"):
    """Adiciona elementos decorativos sutis para preencher espaço."""
    accent = hex_to_rgb(palette["accent_soft"])
    # Opacity trick: use uma cor mais próxima do fundo
    bg = hex_to_rgb(palette["bg"])
    # Blend 85% bg + 15% accent
    blended = tuple(int(bg[i] * 0.85 + accent[i] * 0.15) for i in range(3))

    if shape_type == "corner_accent":
        # Círculo grande translúcido no canto inferior direito
        draw.ellipse((WIDTH - 300, HEIGHT - 400, WIDTH + 100, HEIGHT), fill=blended)
    elif shape_type == "side_line":
        # Linha vertical fina na lateral
        draw.rectangle((WIDTH - MARGIN + 20, MARGIN, WIDTH - MARGIN + 24, HEIGHT - MARGIN), fill=blended)
    elif shape_type == "diagonal":
        # Linha diagonal sutil
        draw.line([(WIDTH - 200, 0), (WIDTH, 200)], fill=blended, width=3)


def create_base(palette):
    img = Image.new("RGB", (WIDTH, HEIGHT), hex_to_rgb(palette["bg"]))
    return img, ImageDraw.Draw(img)


def draw_footer(draw, config, slide_index, total, palette, fonts):
    footer_y = HEIGHT - MARGIN
    draw_pagination(draw, slide_index, total, footer_y - 10, palette)
    if config.get("handle"):
        draw.text((MARGIN, footer_y - 16), config["handle"],
                  font=fonts["small"], fill=hex_to_rgb(palette["text_secondary"]))


def generate_slide_hook(config, fonts, palette, output_path):
    """Slide 1: Gancho — centralizado verticalmente."""
    img, draw = create_base(palette)
    slide = config["slides"][0]
    total = len(config["slides"])

    draw_accent_bar(draw, palette, "top")
    draw_decorative_shape(draw, palette, "corner_accent")

    # Calcular altura total do conteúdo para centralizar
    content_h = 0
    badge_h = 0
    if slide.get("badge"):
        bb = fonts["body_bold"].getbbox(slide["badge"].upper())
        badge_h = (bb[3] - bb[1]) + 28 + 50  # badge + gap
        content_h += badge_h

    title_h = text_block_height(slide["title"], fonts["display"], CONTENT_WIDTH, 1.2)
    content_h += title_h

    sub_h = 0
    if slide.get("subtitle"):
        sub_h = text_block_height(slide["subtitle"], fonts["body"], CONTENT_WIDTH, 1.5) + 30
        content_h += sub_h

    # Área disponível: entre margem top e zona do footer
    available_h = HEIGHT - MARGIN * 2 - FOOTER_ZONE
    start_y = MARGIN + (available_h - content_h) // 2
    start_y = max(start_y, MARGIN + 30)  # nunca colar no topo

    y = start_y

    # Badge
    if slide.get("badge"):
        btxt = slide["badge"].upper()
        bb = fonts["body_bold"].getbbox(btxt)
        bw = bb[2] - bb[0] + 40
        bh = bb[3] - bb[1] + 20
        draw.rounded_rectangle((MARGIN, y, MARGIN + bw, y + bh), radius=8,
                                fill=hex_to_rgb(palette["accent"]))
        draw.text((MARGIN + 20, y + 8), btxt, font=fonts["body_bold"],
                  fill=hex_to_rgb(palette["bg"]))
        y += bh + 50

    # Título
    y = draw_text_block(draw, slide["title"], fonts["display"],
                        palette["text_primary"], MARGIN, y, CONTENT_WIDTH, 1.2)

    # Subtítulo
    if slide.get("subtitle"):
        y += 30
        draw_text_block(draw, slide["subtitle"], fonts["body"],
                        palette["text_secondary"], MARGIN, y, CONTENT_WIDTH, 1.5)

    draw_footer(draw, config, 0, total, palette, fonts)
    img.save(output_path, "PNG", quality=95)
    print(f"  ✓ Slide 1 (gancho): {output_path}")


def generate_slide_body(config, idx, fonts, palette, output_path):
    """Slides 2-3: Conteúdo — centralizado verticalmente."""
    img, draw = create_base(palette)
    slide = config["slides"][idx]
    total = len(config["slides"])

    draw_decorative_shape(draw, palette, "side_line")

    # Calcular altura do conteúdo
    num_h = 100  # altura do número decorativo
    gap_after_num = 20
    title_h = text_block_height(slide["title"], fonts["heading"], CONTENT_WIDTH, 1.3)
    gap_after_title = 40

    items_h = 0
    body_h = 0
    if slide.get("items"):
        for item in slide["items"]:
            items_h += text_block_height(item, fonts["body"], CONTENT_WIDTH - 30, 1.5) + 24
    elif slide.get("body"):
        body_h = text_block_height(slide["body"], fonts["body"], CONTENT_WIDTH, 1.6)

    total_h = num_h + gap_after_num + title_h + gap_after_title + max(items_h, body_h)
    available_h = HEIGHT - MARGIN * 2 - FOOTER_ZONE
    start_y = MARGIN + (available_h - total_h) // 2
    start_y = max(start_y, MARGIN + 20)

    y = start_y

    # Número decorativo
    num_text = f"0{idx + 1}"
    accent_soft = hex_to_rgb(palette["accent_soft"])
    draw.text((MARGIN, y), num_text, font=fonts["display_large"], fill=accent_soft)
    y += num_h + gap_after_num

    # Título
    y = draw_text_block(draw, slide["title"], fonts["heading"],
                        palette["accent"], MARGIN, y, CONTENT_WIDTH, 1.3)
    y += gap_after_title

    # Itens
    if slide.get("items"):
        for item in slide["items"]:
            accent_rgb = hex_to_rgb(palette["accent"])
            draw.rounded_rectangle((MARGIN, y + 12, MARGIN + 8, y + 20), radius=4, fill=accent_rgb)
            y = draw_text_block(draw, item, fonts["body"],
                                palette["text_primary"], MARGIN + 30, y, CONTENT_WIDTH - 30, 1.5)
            y += 24
    elif slide.get("body"):
        draw_text_block(draw, slide["body"], fonts["body"],
                        palette["text_primary"], MARGIN, y, CONTENT_WIDTH, 1.6)

    draw_footer(draw, config, idx, total, palette, fonts)
    img.save(output_path, "PNG", quality=95)
    print(f"  ✓ Slide {idx + 1}: {output_path}")


def generate_slide_cta(config, fonts, palette, output_path):
    """Slide final: Solução + CTA — centralizado."""
    img, draw = create_base(palette)
    slide = config["slides"][-1]
    idx = len(config["slides"]) - 1
    total = len(config["slides"])

    draw_accent_bar(draw, palette, "left")

    # Calcular conteúdo
    title_h = text_block_height(slide["title"], fonts["heading"], CONTENT_WIDTH, 1.3)
    gap1 = 40

    body_h = 0
    if slide.get("body"):
        body_h = text_block_height(slide["body"], fonts["body"], CONTENT_WIDTH, 1.6) + 40

    items_h = 0
    if slide.get("items"):
        for item in slide["items"]:
            items_h += text_block_height(item, fonts["body"], CONTENT_WIDTH - 42, 1.5) + 20

    cta_h = 120 if slide.get("cta") else 0
    gap_cta = 50 if cta_h else 0

    total_h = title_h + gap1 + body_h + items_h + gap_cta + cta_h
    available_h = HEIGHT - MARGIN * 2 - FOOTER_ZONE
    start_y = MARGIN + (available_h - total_h) // 2
    start_y = max(start_y, MARGIN + 20)

    y = start_y

    # Título
    y = draw_text_block(draw, slide["title"], fonts["heading"],
                        palette["accent"], MARGIN, y, CONTENT_WIDTH, 1.3)
    y += gap1

    # Body
    if slide.get("body"):
        y = draw_text_block(draw, slide["body"], fonts["body"],
                            palette["text_primary"], MARGIN, y, CONTENT_WIDTH, 1.6)
        y += 40

    # Items com check desenhado
    if slide.get("items"):
        accent_rgb = hex_to_rgb(palette["accent"])
        for item in slide["items"]:
            # Desenhar checkmark com linhas (independente da fonte)
            cx, cy = MARGIN + 4, y + 16
            draw.line([(cx, cy), (cx + 6, cy + 8)], fill=accent_rgb, width=3)
            draw.line([(cx + 6, cy + 8), (cx + 16, cy - 4)], fill=accent_rgb, width=3)
            y = draw_text_block(draw, item, fonts["body"],
                                palette["text_primary"], MARGIN + 42, y, CONTENT_WIDTH - 42, 1.5)
            y += 20

    # CTA button
    if slide.get("cta"):
        y += gap_cta
        cta_y = min(y, HEIGHT - MARGIN - FOOTER_ZONE - cta_h - 20)
        draw.rounded_rectangle(
            (MARGIN, cta_y, WIDTH - MARGIN, cta_y + 100),
            radius=16, fill=hex_to_rgb(palette["accent"])
        )
        bb = fonts["body_bold"].getbbox(slide["cta"])
        tw = bb[2] - bb[0]
        th = bb[3] - bb[1]
        draw.text(((WIDTH - tw) // 2, cta_y + (100 - th) // 2),
                  slide["cta"], font=fonts["body_bold"],
                  fill=hex_to_rgb(palette["bg"]))

    draw_footer(draw, config, idx, total, palette, fonts)
    img.save(output_path, "PNG", quality=95)
    print(f"  ✓ Slide {idx + 1} (CTA): {output_path}")


def generate_carousel(config_path, output_dir):
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    os.makedirs(output_dir, exist_ok=True)

    p = config.get("palette", "profissional")
    palette = p if isinstance(p, dict) else PALETTES.get(p, PALETTES["profissional"])

    fc = config.get("fonts", {})
    fonts = {
        "display": load_font(fc.get("display", ""), 72),
        "display_large": load_font(fc.get("display", ""), 120),
        "heading": load_font(fc.get("heading", fc.get("display", "")), 52),
        "body": load_font(fc.get("body", ""), 36),
        "body_bold": load_font(fc.get("body_bold", fc.get("body", "")), 36),
        "small": load_font(fc.get("body", ""), 24),
    }

    n = len(config["slides"])
    print(f"\nGerando carrossel com {n} slides...")

    generate_slide_hook(config, fonts, palette, os.path.join(output_dir, "slide_1.png"))
    for i in range(1, n - 1):
        generate_slide_body(config, i, fonts, palette, os.path.join(output_dir, f"slide_{i+1}.png"))
    generate_slide_cta(config, fonts, palette, os.path.join(output_dir, f"slide_{n}.png"))

    print(f"\n✓ Carrossel completo: {output_dir}/")


if __name__ == "__main__":
    config_file = out_dir = None
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--config" and i+1 < len(args): config_file = args[i+1]
        elif a == "--output-dir" and i+1 < len(args): out_dir = args[i+1]
    if not config_file:
        print("Uso: python carousel_generator.py --config config.json --output-dir ./slides")
        sys.exit(1)
    generate_carousel(config_file, out_dir or "./slides")
