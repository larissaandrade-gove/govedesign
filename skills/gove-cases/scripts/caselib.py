"""Modelo do case, indicadores, formatação pt-BR, checagem de números e encaixe de texto.

Tradução fiel de cases/src/data/indicators.ts, cases/src/lib/numbers.ts e
cases/src/lib/scene.ts (app "Gerador de cases"). Sem dependências externas,
exceto make_measure(), que usa o reportlab para medir o texto com as fontes da marca.
"""
import json
import math
import os
import re
from decimal import ROUND_HALF_UP, Decimal

import brand

# ------------------------------------------------------------------ indicadores
# Os ids e as unidades são o contrato com o conector "Gove Grafana".
INDICATORS = [
    {"id": "atendimentos", "label": "Atendimentos", "short": "atendimentos realizados", "unit": "numero", "comparison": True},
    {"id": "ganho_financeiro", "label": "Ganho financeiro", "short": "de ganho financeiro", "unit": "brl", "comparison": False},
    {"id": "arrecadacao_pos_disparo", "label": "Arrecadação após disparo", "short": "arrecadados após o disparo", "unit": "brl", "comparison": True},
    {
        "id": "aumento_arrecadacao_pct",
        "label": "Aumento de arrecadação entre munícipes que receberam disparo (%)",
        "short": "de aumento na arrecadação com disparo",
        "chartLabel": "Aumento de arrecadação",
        "unit": "pct",
        "comparison": False,
    },
    {
        "id": "aumento_arrecadacao_valor",
        "label": "Aumento de arrecadação entre munícipes que receberam disparo (R$)",
        "short": "a mais na arrecadação com disparo",
        "unit": "brl",
        "comparison": False,
    },
    {"id": "taxa_abertura", "label": "Taxa de abertura", "short": "de taxa de abertura", "chartLabel": "Taxa de abertura", "unit": "pct", "comparison": False},
    {"id": "avaliacao_media", "label": "Avaliação média", "short": "de avaliação média", "unit": "nota", "comparison": False},
    {
        "id": "avaliacao_positiva",
        "label": "Índice de avaliação positiva",
        "short": "de avaliações positivas",
        "chartLabel": "Avaliação positiva",
        "unit": "pct",
        "comparison": False,
    },
    {"id": "funcionalidades", "label": "Funcionalidades e casos de uso utilizados", "short": "funcionalidades em uso", "unit": "lista", "comparison": False},
]
INDICATOR_IDS = [d["id"] for d in INDICATORS]
BY_ID = {d["id"]: d for d in INDICATORS}


def is_num(n):
    return isinstance(n, (int, float)) and not isinstance(n, bool) and math.isfinite(n)


# ------------------------------------------------------------------ formatação pt-BR


def dec(n, max_d, min_d=0):
    """Como Intl.NumberFormat('pt-BR'): milhar com ponto, decimal com vírgula, até max_d casas."""
    d = Decimal(repr(float(n))).quantize(Decimal(1).scaleb(-max_d), rounding=ROUND_HALF_UP)
    neg = d < 0 and d != 0
    s = "{:,.{p}f}".format(abs(d), p=max_d)
    if "." in s:
        ip, fp = s.split(".")
    else:
        ip, fp = s, ""
    while len(fp) > min_d and fp.endswith("0"):
        fp = fp[:-1]
    out = ip.replace(",", ".") + ("," + fp if fp else "")
    return ("-" if neg else "") + out


def format_number(n):
    """1.234; a partir de 1 milhão, compacto (1,2 mi)."""
    a = abs(n)
    if a >= 1e9:
        return "%s bi" % dec(n / 1e9, 1)
    if a >= 1e6:
        return "%s mi" % dec(n / 1e6, 1)
    return dec(n, 1 if a < 100 else 0)


def format_brl(n):
    """R$ 950, R$ 12.345, R$ 350 mil, R$ 1,2 mi, R$ 3,4 bi."""
    a = abs(n)
    sign = "-" if n < 0 else ""
    if a >= 1e9:
        return "%sR$ %s bi" % (sign, dec(a / 1e9, 1))
    if a >= 1e6:
        return "%sR$ %s mi" % (sign, dec(a / 1e6, 1))
    if a >= 1e5:
        return "%sR$ %s mil" % (sign, dec(a / 1e3, 1))
    if a >= 1000:
        return "%sR$ %s" % (sign, dec(round(a), 0))
    return "%sR$ %s" % (sign, dec(a, 2, 0 if float(a).is_integer() else 2))


def format_pct(n):
    """12,5%"""
    return "%s%%" % dec(n, 1)


def format_nota(n, max_=None):
    """4,7 (com a escala: "4,7 de 5")."""
    return "%s de %s" % (dec(n, 1, 1), max_) if max_ else dec(n, 1, 1)


def format_value(d, n, nota_max=None):
    u = d["unit"]
    if u == "brl":
        return format_brl(n)
    if u == "pct":
        return format_pct(n)
    if u == "nota":
        return format_nota(n, nota_max)
    return format_number(n)


MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."]


def _ym(s):
    m = re.match(r"^(\d{4})-(\d{2})$", s or "")
    return (int(m.group(1)), int(m.group(2))) if m else None


def format_periodo(inicio, fim):
    """"jan. a jun. de 2026", "nov. de 2025 a abr. de 2026", "maio de 2026"."""
    a, b = _ym(inicio), _ym(fim)
    if not a and not b:
        return ""
    if not a or not b:
        y, m = a or b
        return "%s de %d" % (MESES[m - 1], y)
    if a == b:
        return "%s de %d" % (MESES[a[1] - 1], a[0])
    if a[0] == b[0]:
        return "%s a %s de %d" % (MESES[a[1] - 1], MESES[b[1] - 1], a[0])
    return "%s de %d a %s de %d" % (MESES[a[1] - 1], a[0], MESES[b[1] - 1], b[0])


def variation(before, after):
    return ((after - before) / abs(before)) * 100 if before else None


# ------------------------------------------------------------------ modelo do case


class CaseError(Exception):
    pass


def _num_or_none(v, where):
    if v is None or v == "":
        return None
    if is_num(v):
        return float(v) if isinstance(v, float) else v
    raise CaseError("%s precisa ser um número (sem R$, %% ou texto), veio %r." % (where, v))


def load_case(path):
    """Lê o case.json (formato em scripts/case_schema.json) e devolve o case normalizado."""
    try:
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
    except OSError as e:
        raise CaseError("Não consegui abrir %s: %s" % (path, e.strerror or e))
    except json.JSONDecodeError as e:
        raise CaseError("JSON inválido em %s: %s" % (path, e))
    return normalize_case(raw)


def normalize_case(raw):
    if not isinstance(raw, dict):
        raise CaseError("O case precisa ser um objeto JSON.")
    per = raw.get("periodo") or {}
    for k in ("inicio", "fim"):
        v = per.get(k) or ""
        if v and not _ym(v):
            raise CaseError("periodo.%s precisa estar no formato AAAA-MM, veio %r." % (k, v))
    nota_max = raw.get("nota_max", 5)
    if nota_max not in (5, 10):
        raise CaseError("nota_max precisa ser 5 ou 10.")
    values = {}
    for iid, v in (raw.get("indicadores") or {}).items():
        if iid not in BY_ID:
            raise CaseError("Indicador desconhecido: %r. Use um destes: %s." % (iid, ", ".join(INDICATOR_IDS)))
        if not isinstance(v, dict):
            raise CaseError("indicadores.%s precisa ser um objeto." % iid)
        d = BY_ID[iid]
        g = lambda *ks: next((v[k] for k in ks if k in v), None)  # noqa: E731 (aceita os nomes do conector)
        enabled = g("incluir", "enabled")
        entry = {"enabled": enabled is not False}
        if d["unit"] == "lista":
            items = g("itens", "items") or []
            if not isinstance(items, list):
                raise CaseError("indicadores.%s.itens precisa ser uma lista de textos." % iid)
            entry["items"] = [str(s).strip() for s in items if str(s).strip()]
        else:
            entry["value"] = _num_or_none(g("valor", "value"), "indicadores.%s.valor" % iid)
            entry["before"] = _num_or_none(g("antes", "before"), "indicadores.%s.antes" % iid)
            entry["after"] = _num_or_none(g("depois", "after"), "indicadores.%s.depois" % iid)
        values[iid] = entry
    t = raw.get("textos") or {}
    dest = [str(s) for s in (t.get("destaques") or []) if isinstance(s, str)]
    contato = raw.get("contato") or {}
    return {
        "municipio": str(raw.get("municipio") or ""),
        "uf": str(raw.get("uf") or ""),
        "periodo": {"inicio": per.get("inicio") or "", "fim": per.get("fim") or ""},
        "contexto": str(raw.get("contexto") or ""),
        "nota_max": nota_max,
        "values": values,
        "textos": {
            "titulo": str(t.get("titulo") or ""),
            "resumo": str(t.get("resumo") or ""),
            "desafio": str(t.get("desafio") or ""),
            "solucao": str(t.get("solucao") or ""),
            "resultado": str(t.get("resultado") or ""),
            "destaques": (dest + ["", "", ""])[:3],
        },
        "contato": {
            "cta": str(contato.get("cta") or "Leve o Gove para o seu município"),
            "nome": str(contato.get("nome") or ""),
            "email": str(contato.get("email") or ""),
            "site": str(contato.get("site") or ""),
        },
        "fonte": raw.get("fonte") or "manual",
    }


def municipio_label(c):
    return " – ".join(s for s in (c["municipio"].strip(), c["uf"]) if s)


def _v(c, iid):
    return c["values"].get(iid)


def has_data(d, v):
    if not v or not v.get("enabled", True):
        return False
    if d["unit"] == "lista":
        return any(s.strip() for s in v.get("items") or [])
    return is_num(v.get("value")) or (d["comparison"] and is_num(v.get("after")))


def main_value(d, v):
    if is_num(v.get("value")):
        return v["value"]
    if d["comparison"] and is_num(v.get("after")):
        return v["after"]
    return None


def has_comparison(d, v):
    return bool(v) and v.get("enabled", True) and d["comparison"] and is_num(v.get("before")) and is_num(v.get("after"))


KPI_EXCLUDE = {"avaliacao_media", "avaliacao_positiva"}


def kpi_list(c):
    """Indicadores numéricos que viram KPI (até 6)."""
    out = []
    for d in INDICATORS:
        if d["unit"] == "lista" or d["id"] in KPI_EXCLUDE or not has_data(d, _v(c, d["id"])):
            continue
        out.append({"def": d, "value": format_value(d, main_value(d, _v(c, d["id"])), c["nota_max"])})
    return out[:6]


def comparison_of(c):
    """Primeiro indicador com antes e depois (gráfico de comparação)."""
    for d in INDICATORS:
        v = _v(c, d["id"])
        if has_comparison(d, v):
            return {"def": d, "before": v["before"], "after": v["after"]}
    return None


def pct_bars(c):
    return [{"def": d, "value": main_value(d, _v(c, d["id"]))} for d in INDICATORS if d["unit"] == "pct" and has_data(d, _v(c, d["id"]))]


def funcionalidades_of(c):
    v = _v(c, "funcionalidades")
    if not v or not v.get("enabled", True):
        return []
    return [s.strip() for s in v.get("items") or [] if s.strip()]


def avaliacao_of(c):
    m = main_value(BY_ID["avaliacao_media"], _v(c, "avaliacao_media")) if has_data(BY_ID["avaliacao_media"], _v(c, "avaliacao_media")) else None
    p = main_value(BY_ID["avaliacao_positiva"], _v(c, "avaliacao_positiva")) if has_data(BY_ID["avaliacao_positiva"], _v(c, "avaliacao_positiva")) else None
    return None if m is None and p is None else {"media": m, "positiva": p}


# ------------------------------------------------------------------ checagem de números
# Todo número do texto precisa estar nos dados do case, arredondado às casas escritas
# ("1,2 mi" bate com 1.234.567; "12,5%" bate com 12,48).

_MULT = [(re.compile(r"^mil$", re.I), 1e3), (re.compile(r"^(mi|milh(ão|ao|ões|oes))$", re.I), 1e6), (re.compile(r"^(bi|bilh(ão|ao|ões|oes))$", re.I), 1e9)]
NUM_RE = re.compile(
    r"(?<![^\W_])(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d+))?(?:\s*(%|mil|mi|milh(?:ão|ao|ões|oes)|bi|bilh(?:ão|ao|ões|oes))(?![^\W\d_]))?",
    re.I,
)


def extract_numbers(text):
    out = []
    for m in NUM_RE.finditer(text or ""):
        ip = m.group(1).replace(".", "")
        frac = m.group(2) or ""
        num = float("%s.%s" % (ip, frac)) if frac else float(ip)
        unit = m.group(3) or ""
        mult = next((k for r, k in _MULT if r.match(unit)), 1)
        out.append({"raw": m.group(0), "num": num, "decimals": len(frac), "mult": mult, "value": num * mult, "index": m.start()})
    return out


def allowed_numbers(c):
    """Números presentes nos dados do case."""
    out = []
    for d in INDICATORS:
        v = _v(c, d["id"])
        if not v or not v.get("enabled", True):
            continue
        if d["unit"] == "lista":
            n = len([s for s in v.get("items") or [] if s.strip()])
            if n:
                out.append(n)
            continue
        for n in (v.get("value"), v.get("before"), v.get("after")):
            if is_num(n):
                out.append(n)
        if d["comparison"] and is_num(v.get("before")) and is_num(v.get("after")):
            out.append(v["after"] - v["before"])
            p = variation(v["before"], v["after"])
            if p is not None:
                out.append(p)
        if d["unit"] == "nota":
            out.append(c["nota_max"])
    for s in (c["periodo"]["inicio"], c["periodo"]["fim"]):
        ym = _ym(s)
        if ym:
            out.extend(ym)
    for t in extract_numbers("%s %s" % (c["contexto"], c["municipio"])):
        out.append(t["value"])
    return out


def _round(n, d):
    return float(Decimal(repr(float(n))).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP))


def token_matches(t, allowed):
    for a in allowed:
        scaled = abs(a) / t["mult"]
        if abs(_round(scaled, t["decimals"]) - t["num"]) < 1e-9:
            return True
    return False


def unknown_numbers(text, allowed):
    return [t["raw"].strip() for t in extract_numbers(text) if not token_matches(t, allowed)]


TEXT_FIELDS = ["titulo", "resumo", "desafio", "solucao", "resultado"]


def check_case_numbers(c):
    """[(campo, texto, [números suspeitos])] para os textos do case."""
    allowed = allowed_numbers(c)
    t = c["textos"]
    fields = [(f, t[f]) for f in TEXT_FIELDS]
    fields += [("destaques[%d]" % i, s) for i, s in enumerate(t["destaques"])]
    fields.append(("contato.cta", c["contato"]["cta"]))
    out = []
    for name, text in fields:
        bad = unknown_numbers(text, allowed)
        if bad:
            out.append((name, text, bad))
    return out


# ------------------------------------------------------------------ medição e encaixe de texto

PT_TO = {"mm": 25.4 / 72, "px": 2}

_registered = False


def register_fonts():
    """Registra as fontes TTF no reportlab (nomes = chaves da cena)."""
    global _registered
    if _registered:
        return
    pdfmetrics = brand.require("reportlab.pdfbase.pdfmetrics", "reportlab")
    ttfonts = brand.require("reportlab.pdfbase.ttfonts", "reportlab")
    for key in brand.FONTS:
        path = brand.font_path(key)
        if not os.path.exists(path):
            raise CaseError("Fonte não encontrada: %s" % path)
        pdfmetrics.registerFont(ttfonts.TTFont(key, path))
    _registered = True


def make_measure():
    """measure(texto, fonte, tamanho_pt) -> largura em pt, com as mesmas fontes do PDF."""
    register_fonts()
    from reportlab.pdfbase.pdfmetrics import stringWidth

    cache = {}

    def measure(text, font, size):
        k = (text, font, size)
        w = cache.get(k)
        if w is None:
            w = stringWidth(text, font, size)
            cache[k] = w
        return w

    return measure


def font_metrics(font):
    """(ascender, descender) em unidades de 1000, como o pdfkit usa para centralizar a linha."""
    register_fonts()
    from reportlab.pdfbase.pdfmetrics import getFont

    face = getFont(font).face
    return face.ascent, face.descent


def wrap(text, font, size, max_w, measure, k):
    def width(s):
        return measure(s, font, size) * k

    lines = []
    for para in text.split("\n"):
        words = [w for w in re.split(r"\s+", para) if w]
        if not words:
            if lines:
                lines.append("")
            continue
        cur = ""
        for w in words:
            if width(w) > max_w:
                if cur:
                    lines.append(cur)
                cur = ""
                while len(w) > 1 and width(w) > max_w:
                    cut = len(w) - 1
                    while cut > 1 and width(w[:cut]) > max_w:
                        cut -= 1
                    lines.append(w[:cut])
                    w = w[cut:]
            nxt = "%s %s" % (cur, w) if cur else w
            if width(nxt) <= max_w or not cur:
                cur = nxt
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
    while lines and lines[-1] == "":
        lines.pop()
    return lines


def _ellipsize(line, font, size, max_w, measure, k):
    s = re.sub(r"[\s.,;:]+$", "", line)
    while s and measure(s + "…", font, size) * k > max_w:
        s = s[:-1].rstrip()
    return s + "…"


def fit_text(text, font, max_size, min_size, max_w, max_lines, lh, measure, k):
    """Maior tamanho (de max a min, passos de 0,5 pt) em que o texto cabe em max_lines linhas.
    Abaixo do piso não diminui: corta com reticências e marca truncated."""
    t = text.strip()
    size = max_size
    while size >= min_size - 1e-9:
        lines = wrap(t, font, size, max_w, measure, k) if t else []
        if len(lines) <= max_lines:
            return {"size": size, "lines": lines, "lineHeight": size * lh * k, "truncated": False}
        size -= 0.5
    size = min_size
    lines = wrap(t, font, size, max_w, measure, k)[: max(0, max_lines)]
    if lines:
        lines[-1] = _ellipsize(lines[-1], font, size, max_w, measure, k)
    return {"size": size, "lines": lines, "lineHeight": size * lh * k, "truncated": True}


def bar_geometry(c, k):
    """Retângulos das barras do gráfico antes/depois (cases/src/lib/scene.ts)."""
    label_h = c["labelSize"] * 1.3 * k
    top = c["y"] + label_h + 1 * k
    bottom = c["y"] + c["h"] - label_h - 2 * k
    plot_h = max(1, bottom - top)
    mx = max([0] + [v for s in c["series"] for v in s["values"]])
    n_cat = len(c["categories"])
    n_ser = len(c["series"])
    group_w = c["w"] / max(1, n_cat)
    bar_w = min((group_w * 0.7) / max(1, n_ser), group_w * 0.45)
    bars, names = [], []
    for ci, cat in enumerate(c["categories"]):
        gx = c["x"] + ci * group_w + (group_w - bar_w * n_ser) / 2
        for si, s in enumerate(c["series"]):
            v = s["values"][ci] if ci < len(s["values"]) else 0
            h = (max(0, v) / mx) * plot_h if mx > 0 else 0
            x = gx + si * bar_w
            bars.append({"x": x, "y": bottom - h, "w": bar_w * 0.86, "h": h, "color": s["color"], "label": s["labels"][ci] if ci < len(s["labels"]) else "", "name": s["name"]})
            if n_cat == 1:
                names.append({"x": x + (bar_w * 0.86) / 2, "text": s["name"]})
        if n_cat > 1:
            names.append({"x": c["x"] + ci * group_w + group_w / 2, "text": cat})
    return {"bars": bars, "names": names, "baseline": bottom, "labelH": label_h, "groupW": group_w}
