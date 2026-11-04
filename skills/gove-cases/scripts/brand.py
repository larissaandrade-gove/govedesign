"""Marca Gove para os scripts da skill gove-cases: paleta, fontes, logos e regra do logo.

Tradução de cases/src/data/palette.ts e brand/logos.js (Design System Gove).
As peças usam só estas cores, nunca preto puro (#000000).
Os caminhos dos arquivos são resolvidos a partir desta pasta, então os scripts
funcionam de qualquer diretório.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(HERE)
FONTS_DIR = os.path.join(SKILL_DIR, "assets", "fonts")
LOGOS_DIR = os.path.join(SKILL_DIR, "assets", "logos")

# Paleta institucional (skill gove-design-system)
PALETTE = {
    "branco": "#F4F4F4",
    "brancoPuro": "#FFFFFF",
    "noite": "#20133D",
    "amarelo": "#FFC72C",
    "roxo": "#3D0099",
    "roxoProfundo": "#351F65",
    "grafite": "#2F3539",
    "cinza": "#5B6770",
    "ciano": "#5AC2CD",
    "lavanda": "#A278DA",
    "azul": "#16499F",
}
PALETTE_HEX = set(PALETTE.values())

# Cores da one page (cases/src/lib/onepage.ts)
ONEPAGE_COLORS = {
    "page": PALETTE["brancoPuro"],
    "header": PALETTE["noite"],
    "headerText": PALETTE["branco"],
    "eyebrow": PALETTE["amarelo"],
    "title": PALETTE["noite"],
    "body": PALETTE["grafite"],
    "heading": PALETTE["roxo"],
    "tile": PALETTE["branco"],
    "kpi": PALETTE["roxo"],
    "before": PALETTE["lavanda"],
    "after": PALETTE["roxo"],
    "track": PALETTE["branco"],
    "accent": PALETTE["amarelo"],
    "cta": PALETTE["roxo"],
    "ctaText": PALETTE["branco"],
}

# Cores dos slides (cases/src/lib/slides.ts)
SLIDE_COLORS = {
    "cover": PALETTE["noite"],
    "content": PALETTE["branco"],
    "panel": PALETTE["brancoPuro"],
    "cta": PALETTE["roxo"],
    "onDark": PALETTE["branco"],
    "eyebrowDark": PALETTE["amarelo"],
    "title": PALETTE["noite"],
    "body": PALETTE["grafite"],
    "highlight": PALETTE["roxo"],
    "pageNumber": PALETTE["cinza"],
    "accent": PALETTE["amarelo"],
    "chartBefore": PALETTE["lavanda"],
    "chartAfter": PALETTE["roxo"],
}

# Pisos de legibilidade (pt)
MIN_PT = 11  # one page (documentos)
MIN_SLIDE_PT = 14  # slides (rodapé 12)

# Fontes: chave da cena -> arquivo TTF (PDF e medição) e nome no PowerPoint.
# Só os pesos usados: Montserrat 600/700 (títulos) e Inter 400/600 (corpo). Licença: assets/fonts/OFL.txt.
FONTS = {
    "display-bold": {"file": "Montserrat-Bold.ttf", "face": "Montserrat", "bold": True},
    "display-semibold": {"file": "Montserrat-SemiBold.ttf", "face": "Montserrat SemiBold", "bold": False},
    "body-regular": {"file": "Inter-Regular.ttf", "face": "Inter", "bold": False},
    "body-semibold": {"file": "Inter-SemiBold.ttf", "face": "Inter SemiBold", "bold": False},
}


def font_path(key):
    return os.path.join(FONTS_DIR, FONTS[key]["file"])


# Logomarca: regra de contraste (brand/logos.js). Toda cor da logo precisa de >= 4,5:1 com o fundo.
LOGO_MIN_CONTRAST = 4.5
LOGO_COLORS = {"roxo": "#3E0099", "amarelo": "#FEC526", "branco": "#FFFFFF"}
LOGOTIPO_ASPECT = 2000 / 637
LOGOTIPO_VARIANTS = [
    ("cor", "gove-logo-cor.png", [LOGO_COLORS["roxo"], LOGO_COLORS["amarelo"]]),
    # Preferida em fundos escuros: letras brancas + arco amarelo
    ("branco-amarelo", "gove-logo-branco-amarelo.png", [LOGO_COLORS["branco"], LOGO_COLORS["amarelo"]]),
    ("roxo", "gove-logo-roxo.png", [LOGO_COLORS["roxo"]]),
    ("branco", "gove-logo-branco.png", [LOGO_COLORS["branco"]]),
]


def _lum(hex_color):
    n = int(hex_color.lstrip("#"), 16)
    out = []
    for v in ((n >> 16) & 255, (n >> 8) & 255, n & 255):
        c = v / 255
        out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def contrast(a, b):
    l1, l2 = sorted([_lum(a), _lum(b)], reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def pick_logo(background):
    """Versão do logotipo para um fundo: a primeira em que todas as cores passam de 4,5:1."""
    scored = [(vid, f, min(contrast(c, background) for c in colors)) for vid, f, colors in LOGOTIPO_VARIANTS]
    for vid, f, m in scored:
        if m >= LOGO_MIN_CONTRAST:
            return {"variant": vid, "file": f, "path": os.path.join(LOGOS_DIR, f), "aspect": LOGOTIPO_ASPECT, "contrast": m, "ok": True}
    vid, f, m = max(scored, key=lambda s: s[2])
    return {"variant": vid, "file": f, "path": os.path.join(LOGOS_DIR, f), "aspect": LOGOTIPO_ASPECT, "contrast": m, "ok": False}


def hex_to_rgb(hex_color):
    n = int(hex_color.lstrip("#"), 16)
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


def require(module, pip_name):
    """Importa uma dependência ou encerra com a dica de instalação."""
    try:
        return __import__(module, fromlist=["_"])
    except ImportError:
        sys.stderr.write(
            "ERRO: falta a biblioteca Python '%s'. Instale com:\n"
            "  pip install %s\n"
            "(ou: pip install -r %s)\n" % (pip_name, pip_name, os.path.join(HERE, "requirements.txt"))
        )
        sys.exit(2)
