#!/usr/bin/env python3
"""One page A4 do case em PDF vetorial (210 × 297 mm), com fontes TTF embutidas e logo PNG.

Uso:  python scripts/build_onepage.py case.json saida.pdf

Tradução fiel de cases/src/lib/onepage.ts e pdf.ts. Encaixe: tenta níveis de tamanho
cada vez menores (nada abaixo de 11 pt) e, se ainda não couber, encurta os textos longos
com reticências e avisa. Cores em RGB (tela e envio), não CMYK.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import brand  # noqa: E402
import caselib as cl  # noqa: E402

A4 = {"w": 210, "h": 297, "margin": 14}
K = cl.PT_TO["mm"]
C = brand.ONEPAGE_COLORS
MIN_PT = brand.MIN_PT
CW = A4["w"] - 2 * A4["margin"]
CTA_H = 26

# (title, resumo, kpi, body) = (max, min); gap em mm; lh = altura de linha
LEVELS = [
    {"title": (24, 19), "resumo": (12.5, 12), "kpi": (20, 13), "body": (12, 11.5), "gap": 7, "lh": 1.38},
    {"title": (21, 17), "resumo": (12, 11.5), "kpi": (18, 13), "body": (11.5, 11), "gap": 6, "lh": 1.32},
    {"title": (19, 16), "resumo": (11.5, 11), "kpi": (17, 13), "body": (11, 11), "gap": 5, "lh": 1.28},
    {"title": (17, 16), "resumo": (11, 11), "kpi": (16, 12), "body": (11, 11), "gap": 4, "lh": 1.24},
]

ROLE_LABEL = {
    "municipio": "Nome do município",
    "titulo": "Título",
    "resumo": "Resumo",
    "desafio": "Desafio",
    "solucao": "Solução",
    "resultado": "Resultado",
    "destaques": "Destaques",
    "kpi": "Rótulo de um indicador",
    "funcionalidades": "Funcionalidades",
    "cta": "Chamada final",
    "contato": "Contato",
}


class Ctx:
    def __init__(self, measure):
        self.measure = measure
        self.items = []
        self.warn = []

    def add_warn(self, role):
        if role not in self.warn:
            self.warn.append(role)

    def text(self, role, s, x, y, w, font, max, maxLines, lh, color, min=None, align="left"):  # noqa: A002
        fit = cl.fit_text(s, font, max, max if min is None else min, w, maxLines, lh, self.measure, K)
        if fit["truncated"]:
            self.add_warn(role)
        if fit["lines"]:
            self.items.append({"type": "text", "role": role, "x": x, "y": y, "w": w, "lines": fit["lines"], "text": s.strip(), "font": font, "size": fit["size"], "lineHeight": fit["lineHeight"], "color": color, "align": align})
        return len(fit["lines"]) * fit["lineHeight"]


def layout(c, measure, L, body_lines, resumo_lines):
    ctx = Ctx(measure)
    M = A4["margin"]
    items = ctx.items
    periodo = cl.format_periodo(c["periodo"]["inicio"], c["periodo"]["fim"])

    # Cabeçalho (Noite) com município e logotipo pela regra de contraste
    HEADER_H = 46
    items.append({"type": "rect", "x": 0, "y": 0, "w": A4["w"], "h": HEADER_H, "fill": C["header"]})
    logo = brand.pick_logo(C["header"])
    logo_h = 10
    logo_w = logo_h * logo["aspect"]
    items.append({"type": "image", "x": A4["w"] - M - logo_w, "y": 13, "w": logo_w, "h": logo_h, "path": logo["path"]})
    y = 12
    y += ctx.text("eyebrow", "CASE DE SUCESSO", M, y, CW - logo_w - 8, "body-semibold", 11, 1, 1.3, C["eyebrow"]) + 1.5
    y += ctx.text("municipio", cl.municipio_label(c) or "Município", M, y, CW - logo_w - 8, "display-bold", 26, 1, 1.15, C["headerText"], min=18) + 1
    if periodo:
        ctx.text("periodo", "Resultados de %s" % periodo, M, y, CW, "body-regular", 12, 1, 1.3, C["headerText"], min=11)

    y = HEADER_H + 8
    t = c["textos"]
    if t["titulo"].strip():
        y += ctx.text("titulo", t["titulo"], M, y, CW, "display-bold", L["title"][0], 2, 1.18, C["title"], min=L["title"][1]) + 3
    if t["resumo"].strip():
        y += ctx.text("resumo", t["resumo"], M, y, CW, "body-regular", L["resumo"][0], resumo_lines, L["lh"], C["body"], min=max(MIN_PT, L["resumo"][1]))
    y += L["gap"]

    # KPIs: até 4 numa linha; 5 ou 6 em duas linhas de 3
    kpis = cl.kpi_list(c)
    if kpis:
        per_row = len(kpis) if len(kpis) <= 4 else 3
        gap = 4
        tw = (CW - gap * (per_row - 1)) / per_row
        rows = -(-len(kpis) // per_row)
        for r in range(rows):
            row = kpis[r * per_row:(r + 1) * per_row]
            pad = 4
            fits = [
                {
                    "v": cl.fit_text(k["value"], "display-bold", L["kpi"][0], L["kpi"][1], tw - 2 * pad, 1, 1.1, measure, K),
                    "l": cl.fit_text(k["def"]["short"], "body-regular", MIN_PT, MIN_PT, tw - 2 * pad, 2, 1.25, measure, K),
                }
                for k in row
            ]
            v_size = min(f["v"]["size"] for f in fits)
            v_h = v_size * 1.1 * K
            l_h = max(len(f["l"]["lines"]) * f["l"]["lineHeight"] for f in fits)
            h = pad + v_h + 1.5 + l_h + pad
            for i, k in enumerate(row):
                x = M + i * (tw + gap)
                items.append({"type": "rect", "x": x, "y": y, "w": tw, "h": h, "fill": C["tile"], "radius": 3})
                vf = cl.fit_text(k["value"], "display-bold", v_size, v_size, tw - 2 * pad, 1, 1.1, measure, K)
                if vf["truncated"]:
                    ctx.add_warn("kpi")
                items.append({"type": "text", "role": "kpi-valor", "x": x + pad, "y": y + pad, "w": tw - 2 * pad, "lines": vf["lines"], "text": k["value"], "font": "display-bold", "size": v_size, "lineHeight": v_h, "color": C["kpi"], "align": "left"})
                lf = fits[i]["l"]
                if lf["truncated"]:
                    ctx.add_warn("kpi")
                items.append({"type": "text", "role": "kpi", "x": x + pad, "y": y + pad + v_h + 1.5, "w": tw - 2 * pad, "lines": lf["lines"], "text": k["def"]["short"], "font": "body-regular", "size": lf["size"], "lineHeight": lf["lineHeight"], "color": C["body"], "align": "left"})
            y += h + (gap if r < rows - 1 else 0)
        y += L["gap"]

    # Desafio -> Solução -> Resultado (as colunas presentes dividem a largura)
    dsr = [(role, label, s) for role, label, s in (("desafio", "Desafio", t["desafio"]), ("solucao", "Solução", t["solucao"]), ("resultado", "Resultado", t["resultado"])) if s.strip()]
    if dsr:
        gap = 6
        col_w = (CW - gap * (len(dsr) - 1)) / len(dsr)
        max_h = 0
        for i, (role, label, s) in enumerate(dsr):
            x = M + i * (col_w + gap)
            items.append({"type": "rect", "x": x, "y": y, "w": 10, "h": 1.2, "fill": C["accent"]})
            yy = y + 3.5
            yy += ctx.text(role + "-titulo", label, x, yy, col_w, "display-semibold", 13, 1, 1.25, C["heading"]) + 1.2
            yy += ctx.text(role, s, x, yy, col_w, "body-regular", L["body"][0], body_lines, L["lh"], C["body"], min=max(MIN_PT, L["body"][1]))
            max_h = max(max_h, yy - y)
        y += max_h + L["gap"]

    # Gráfico | avaliação + funcionalidades
    cmp_ = cl.comparison_of(c)
    bars = [] if cmp_ else cl.pct_bars(c)
    aval = cl.avaliacao_of(c)
    funcs = cl.funcionalidades_of(c)
    has_chart = bool(cmp_) or len(bars) > 0
    has_side = bool(aval) or len(funcs) > 0
    if has_chart or has_side:
        gap = 8
        chart_w = 86 if has_side else CW
        side_x = M + chart_w + gap if has_chart else M
        side_w = CW - chart_w - gap if has_chart else CW
        chart_h = 0
        if has_chart:
            yy = y
            title = "%s: antes e depois" % cmp_["def"]["label"] if cmp_ else "Indicadores em percentual"
            yy += ctx.text("grafico-titulo", title, M, yy, chart_w, "display-semibold", 13, 2, 1.25, C["heading"], min=MIN_PT) + 2
            if cmp_:
                d = cmp_["def"]
                chart = {
                    "type": "chart", "x": M, "y": yy, "w": chart_w, "h": 50,
                    "categories": [d["label"]],
                    "series": [
                        {"name": "Antes", "color": C["before"], "values": [cmp_["before"]], "labels": [cl.format_value(d, cmp_["before"], c["nota_max"])]},
                        {"name": "Depois", "color": C["after"], "values": [cmp_["after"]], "labels": [cl.format_value(d, cmp_["after"], c["nota_max"])]},
                    ],
                    "ink": C["body"], "labelSize": MIN_PT,
                }
                items.append(chart)
                yy += chart["h"]
            else:
                for b in bars[:4]:
                    val = cl.format_pct(b["value"])
                    val_w = measure(val, "body-semibold", MIN_PT) * K
                    yy += ctx.text("grafico-rotulo", b["def"].get("chartLabel") or b["def"]["label"], M, yy, chart_w - val_w - 3, "body-regular", MIN_PT, 2, 1.25, C["body"])
                    items.append({"type": "text", "role": "grafico-valor", "x": M + chart_w - val_w, "y": yy - MIN_PT * 1.25 * K, "w": val_w, "lines": [val], "text": val, "font": "body-semibold", "size": MIN_PT, "lineHeight": MIN_PT * 1.25 * K, "color": C["kpi"], "align": "right"})
                    items.append({"type": "rect", "x": M, "y": yy + 1, "w": chart_w, "h": 4, "fill": C["track"], "radius": 2})
                    items.append({"type": "rect", "x": M, "y": yy + 1, "w": max(1, (chart_w * min(100, max(0, b["value"]))) / 100), "h": 4, "fill": C["after"], "radius": 2})
                    yy += 9
            chart_h = yy - y
        yy = y
        if aval:
            yy += ctx.text("avaliacao-titulo", "Avaliação dos munícipes", side_x, yy, side_w, "display-semibold", 13, 1, 1.25, C["heading"]) + 1.5
            if aval["media"] is not None:
                nota = cl.format_value(cl.BY_ID["avaliacao_media"], aval["media"])
                n_w = measure(nota, "display-bold", 28) * K
                items.append({"type": "text", "role": "avaliacao-nota", "x": side_x, "y": yy, "w": n_w + 1, "lines": [nota], "text": nota, "font": "display-bold", "size": 28, "lineHeight": 28 * 1.1 * K, "color": C["title"], "align": "left"})
                ctx.text("avaliacao-escala", "de %s na avaliação média" % c["nota_max"], side_x + n_w + 3, yy + 28 * 1.1 * K - 12 * 1.3 * K - 1.2, side_w - n_w - 3, "body-regular", 12, 1, 1.3, C["body"], min=MIN_PT)
                yy += 28 * 1.1 * K + 1
            if aval["positiva"] is not None:
                yy += ctx.text("avaliacao-positiva", "%s de avaliações positivas" % cl.format_pct(aval["positiva"]), side_x, yy, side_w, "body-semibold", 12, 2, 1.3, C["body"], min=MIN_PT)
            yy += 5
        if funcs:
            yy += ctx.text("funcionalidades-titulo", "Funcionalidades usadas", side_x, yy, side_w, "display-semibold", 13, 1, 1.25, C["heading"]) + 2
            chip_h = 7
            pad_x = 2.5
            cx = side_x
            row = 0
            max_rows = 4
            shown = 0
            for f in funcs:
                fit = cl.fit_text(f, "body-semibold", MIN_PT, MIN_PT, side_w - 2 * pad_x, 1, 1.2, measure, K)
                w = measure(fit["lines"][0] if fit["lines"] else "", "body-semibold", MIN_PT) * K + 2 * pad_x
                if cx > side_x and cx + w > side_x + side_w:
                    row += 1
                    cx = side_x
                if row >= max_rows:
                    break
                if fit["truncated"]:
                    ctx.add_warn("funcionalidades")
                cy = yy + row * (chip_h + 2)
                items.append({"type": "rect", "x": cx, "y": cy, "w": w, "h": chip_h, "fill": C["tile"], "radius": 2})
                items.append({"type": "text", "role": "funcionalidade", "x": cx + pad_x, "y": cy + (chip_h - MIN_PT * 1.2 * K) / 2, "w": w - 2 * pad_x, "lines": fit["lines"], "text": f, "font": "body-semibold", "size": MIN_PT, "lineHeight": MIN_PT * 1.2 * K, "color": C["kpi"], "align": "left"})
                cx += w + 2
                shown += 1
            if shown < len(funcs):
                ctx.add_warn("funcionalidades")
            yy += (row + 1) * (chip_h + 2)
        y += max(chart_h, yy - y) + L["gap"]

    # Destaques
    for d in [s.strip() for s in t["destaques"] if s.strip()]:
        x = M + 4
        h = ctx.text("destaques", d, x, y, CW - 4, "body-semibold", 12, 2, 1.3, C["title"], min=MIN_PT)
        items.append({"type": "rect", "x": M, "y": y + 0.6, "w": 1.2, "h": max(3, h - 1.2), "fill": C["accent"]})
        y += h + 2.5

    # Chamada final (faixa Roxo)
    cta_y = A4["h"] - CTA_H
    items.append({"type": "rect", "x": 0, "y": cta_y, "w": A4["w"], "h": CTA_H, "fill": C["cta"]})
    cy = cta_y + 6
    cy += ctx.text("cta", c["contato"]["cta"] or "Leve o Gove para o seu município", M, cy, CW, "display-bold", 16, 1, 1.2, C["ctaText"], min=13) + 1.5
    contato = "  ·  ".join(s.strip() for s in (c["contato"]["nome"], c["contato"]["email"], c["contato"]["site"]) if s.strip())
    if contato:
        ctx.text("contato", contato, M, cy, CW, "body-regular", 12, 1, 1.3, C["ctaText"], min=MIN_PT)

    return {"items": items, "bottom": y - L["gap"], "limit": cta_y - 6, "warn": ctx.warn}


def build_onepage(c, measure):
    """Cena da one page (em mm) + avisos. Mede com as fontes do PDF."""
    res = layout(c, measure, LEVELS[0], 14, 4)
    for L in LEVELS[1:]:
        if res["bottom"] <= res["limit"]:
            break
        res = layout(c, measure, L, 14, 4)
    last = LEVELS[-1]
    body_lines, resumo_lines = 14, 4
    while res["bottom"] > res["limit"] and body_lines > 3:
        body_lines -= 1
        if body_lines < 8 and resumo_lines > 2:
            resumo_lines -= 1
        res = layout(c, measure, last, body_lines, resumo_lines)
    warnings = ["%s: texto longo demais, encurtado na página." % ROLE_LABEL[r] for r in res["warn"] if r in ROLE_LABEL]
    overflow = res["bottom"] > res["limit"]
    if overflow:
        warnings.insert(0, "O conteúdo não cabe na página A4. Desmarque indicadores ou encurte os textos.")
    return {"unit": "mm", "w": A4["w"], "h": A4["h"], "background": C["page"], "items": res["items"], "warnings": warnings, "overflow": overflow or bool(res["warn"])}


def render_pdf(scene, out_path, title):
    canvas_mod = brand.require("reportlab.pdfgen.canvas", "reportlab")
    from reportlab.lib.colors import HexColor

    MM = 72 / 25.4
    W, H = scene["w"] * MM, scene["h"] * MM

    def p(mm):
        return mm * MM

    cl.register_fonts()
    cv = canvas_mod.Canvas(out_path, pagesize=(W, H), pageCompression=1, initialFontName="body-regular", initialFontSize=11)
    cv.setTitle(title)
    cv.setAuthor("Gove Digital")
    cv.setCreator("Gove Cases (skill)")
    cv.setProducer("Gove Digital")

    def fill(color):
        cv.setFillColor(HexColor(color))

    def rect(x, y, w, h, color, radius=0):
        fill(color)
        if radius:
            cv.roundRect(p(x), H - p(y) - p(h), p(w), p(h), p(radius), stroke=0, fill=1)
        else:
            cv.rect(p(x), H - p(y) - p(h), p(w), p(h), stroke=0, fill=1)

    def draw_line(s, font, size, color, x, top, w, lh, align):
        asc, desc = cl.font_metrics(font)
        content_h = (asc - desc) / 1000 * size
        y_top = p(top) + (p(lh) - content_h) / 2
        baseline = H - (y_top + asc / 1000 * size)
        cv.setFont(font, size)
        fill(color)
        tw = cv.stringWidth(s, font, size)
        x0 = p(x + w) - tw if align == "right" else p(x) + (p(w) - tw) / 2 if align == "center" else p(x)
        cv.drawString(x0, baseline, s)

    rect(0, 0, scene["w"], scene["h"], scene["background"])
    for it in scene["items"]:
        if it["type"] == "rect":
            rect(it["x"], it["y"], it["w"], it["h"], it["fill"], it.get("radius", 0))
        elif it["type"] == "text":
            for i, line in enumerate(it["lines"]):
                draw_line(line, it["font"], it["size"], it["color"], it["x"], it["y"] + i * it["lineHeight"], it["w"], it["lineHeight"], it.get("align", "left"))
        elif it["type"] == "image":
            cv.drawImage(it["path"], p(it["x"]), H - p(it["y"]) - p(it["h"]), p(it["w"]), p(it["h"]), mask="auto")
        elif it["type"] == "chart":
            g = cl.bar_geometry(it, K)
            for b in g["bars"]:
                if b["h"] > 0:
                    rect(b["x"], b["y"], b["w"], b["h"], b["color"])
                draw_line(b["label"], "body-semibold", it["labelSize"], it["ink"], b["x"] - 10, b["y"] - g["labelH"] - 0.5, b["w"] + 20, g["labelH"], "center")
            fill(it["ink"])
            cv.rect(p(it["x"]), H - p(g["baseline"]) - 0.6, p(it["w"]), 0.6, stroke=0, fill=1)
            for n in g["names"]:
                draw_line(n["text"], "body-regular", it["labelSize"], it["ink"], n["x"] - 25, g["baseline"] + 1, 50, g["labelH"], "center")
    cv.showPage()
    cv.save()


def main(argv):
    if len(argv) != 3:
        sys.stderr.write("Uso: python %s case.json saida.pdf\n" % os.path.relpath(__file__))
        return 2
    try:
        c = cl.load_case(argv[1])
        scene = build_onepage(c, cl.make_measure())
    except cl.CaseError as e:
        sys.stderr.write("ERRO: %s\n" % e)
        return 1
    title = "Case de sucesso – %s" % (cl.municipio_label(c) or "Município")
    render_pdf(scene, argv[2], title)
    print("One page A4 gerada: %s" % argv[2])
    for w in scene["warnings"]:
        print("AVISO: %s" % w)
    if not scene["warnings"]:
        print("Tudo coube na página, sem cortes.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
