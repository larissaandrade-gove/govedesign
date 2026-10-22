"""Paleta oficial Banco do Brasil (Manual da Logomarca) + motor de contraste WCAG 2.x."""
import math

PALETA = {  # nome: HEX (fonte: Manual da Logomarca BB)
    "amarelo_institucional": "FCFC30", "azul_institucional": "465EFF",
    "azul_escuro": "3333BD", "azul_claro": "54DCFC",
    "verde_escuro": "00EBD0", "verde_claro": "83FFEA",
    "roxo_escuro": "735CC6", "roxo_claro": "BDB6FF",
    "rosa_escuro": "FF6E91", "rosa_claro": "FFA7D3",
    "branco": "FFFFFF", "amarelo_claro": "FFF7B5",
}
PRETO = "000000"  # somente Versao Traco / excecao de contraste (texto sobre Rosa escuro)
MIN_TEXTO = 4.5
MIN_GRAFICO = 3.0

def _lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def rgb(h): h = h.strip("#").upper()[-6:]; return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def hexs(t): return "%02X%02X%02X" % tuple(max(0, min(255, round(v))) for v in t)

def luminancia(h):
    r, g, b = (_lin(v) for v in rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contraste(a, b):
    x, y = sorted((luminancia(a), luminancia(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)

def mistura(frente, fundo, alpha):
    """Cor efetiva de um preenchimento com transparencia (alpha 0..1) sobre o fundo."""
    f, b = rgb(frente), rgb(fundo)
    return hexs(tuple(alpha * f[i] + (1 - alpha) * b[i] for i in range(3)))

def lab(h):
    r, g, b = (_lin(v) for v in rgb(h))
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)

def delta_e(a, b):
    return math.dist(lab(a), lab(b))

def croma(h):
    _, a, b = lab(h); return math.hypot(a, b)

def mapear_fundo(h):
    """Preenchimentos (fundos, formas, celulas): cor da paleta mais proxima.
    Neutros (croma < 12) seguem regra de luminosidade para nao virar cor saturada."""
    h = h.upper()
    if h in PALETA.values(): return h
    if croma(h) < 12:
        L = lab(h)[0]
        if L >= 90: return PALETA["branco"]
        if L >= 60: return PALETA["roxo_claro"]
        return PALETA["azul_escuro"]
    L, C, H = lch(h)
    for ini, fim, variantes in FAMILIAS:
        if (ini <= H < fim) if ini < fim else (H >= ini or H < fim):
            # variantes: lista (limite_L, nome) da mais escura para a mais clara
            for limite, nome in variantes:
                if L < limite:
                    if nome == "amarelo":  # tons pasteis -> amarelo claro; saturados -> institucional
                        return PALETA["amarelo_claro" if C < 50 else "amarelo_institucional"]
                    return PALETA[nome]
    return PALETA["azul_institucional"]

# Familias por angulo de matiz (CIE LCh) -> variantes por luminosidade L*
FAMILIAS = [
    (330, 20,  [(72, "rosa_escuro"), (101, "rosa_claro")]),          # vermelho, magenta, rosa
    (20, 75,   [(101, "rosa_escuro")]),                               # laranja
    (75, 118,  [(101, "amarelo")]),                                   # amarelo, ouro (ver croma)
    (118, 205, [(80, "verde_escuro"), (101, "verde_claro")]),         # verde, verde-agua
    (205, 262, [(55, "azul_institucional"), (101, "azul_claro")]),    # ciano, azul-celeste
    (262, 308, [(38, "azul_escuro"), (68, "azul_institucional"), (101, "roxo_claro")]),  # azul
    (308, 330, [(65, "roxo_escuro"), (101, "roxo_claro")]),           # roxo, violeta
]

def lch(h):
    L, a, b = lab(h); return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360

def distancia_marca(h, c):
    """Distancia orientada por matiz: preserva a 'familia' da cor (vermelho->rosa, verde->verde...)."""
    L1, C1, H1 = lch(h); L2, C2, H2 = lch(c)
    if C2 < 12: return 999  # branco nao recebe cores cromaticas
    dh = min(abs(H1 - H2), 360 - abs(H1 - H2))
    return dh * 1.0 + abs(L1 - L2) * 0.6 + abs(C1 - C2) * 0.15

def pares_texto(fundo):
    """Cores de texto aprovadas (>= 4.5:1) sobre um fundo. Preto so entra se nenhuma cor da paleta passar."""
    ok = [c for c in PALETA.values() if contraste(c, fundo) >= MIN_TEXTO]
    return ok or [PRETO]

def mapear_texto(h, fundo):
    """Texto: cor da paleta mais proxima da intencao original QUE passe 4.5:1 sobre o fundo."""
    h = (h or "3333BD").upper()
    cand = pares_texto(fundo)
    if croma(h) >= 40:  # texto de destaque colorido: manter a familia de cor, se passar 4.5:1
        alvo = mapear_fundo(h)
        if alvo in cand: return alvo
        for nome in ("roxo_escuro", "azul_institucional"):  # preserva o "destaque" sem perder contraste
            if PALETA[nome] in cand and PALETA[nome] != PALETA["azul_escuro"]: return PALETA[nome]
    pref = PREF_ESCURO if lab(h)[0] < 55 else PREF_CLARO
    for nome in pref:
        if PALETA[nome] in cand: return PALETA[nome]
    return max(cand, key=lambda c: contraste(c, fundo))

PREF_ESCURO = ["azul_escuro", "roxo_escuro", "azul_institucional"]
PREF_CLARO = ["branco", "amarelo_claro", "amarelo_institucional", "verde_claro", "azul_claro",
              "rosa_claro", "roxo_claro", "verde_escuro"]

def texto_pior_caso(fundos, preferida=None):
    """Para fundos variaveis (gradiente, foto): cor que maximiza o MENOR contraste."""
    cands = list(PALETA.values())
    melhor = max(cands, key=lambda c: min(contraste(c, f) for f in fundos))
    if preferida:
        passa = [c for c in cands if min(contraste(c, f) for f in fundos) >= MIN_TEXTO]
        if passa: return min(passa, key=lambda c: delta_e(preferida, c))
    return melhor if min(contraste(melhor, f) for f in fundos) >= MIN_TEXTO else None

def serie_grafico(fundo):
    """Ordem de cores para series de graficos com >= 3:1 contra o fundo da area de plotagem."""
    ordem = ["azul_institucional", "azul_escuro", "roxo_escuro", "amarelo_institucional",
             "verde_escuro", "azul_claro", "rosa_escuro", "roxo_claro", "verde_claro", "rosa_claro"]
    return [PALETA[n] for n in ordem if contraste(PALETA[n], fundo) >= MIN_GRAFICO]
