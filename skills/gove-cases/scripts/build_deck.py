#!/usr/bin/env python3
"""Apresentação 16:9 do case em .pptx editável (13,333 × 7,5 pol = 1920 × 1080 px).

Uso:  python scripts/build_deck.py case.json saida.pptx

Tradução fiel de cases/src/lib/slides.ts e pptx.ts. Até 8 slides (capa, contexto, desafio,
solução, resultados, gráfico, avaliação, próximos passos); slides sem dados ficam de fora.
Caixas de texto editáveis com as fontes pelo nome (Montserrat e Inter: o .pptx não embute
fontes) e gráfico de barras nativo, editável no PowerPoint.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import brand  # noqa: E402
import caselib as cl  # noqa: E402

SLIDE = {"w": 1920, "h": 1080, "margin": 96, "pxPerIn": 144}
K = cl.PT_TO["px"]  # 1 pt = 2 px
M = SLIDE["margin"]
CW = SLIDE["w"] - 2 * M
C = brand.SLIDE_COLORS
BOTTOM_LIMIT = SLIDE["h"] - 140
BODY = {"font": "body-regular", "max": 24, "min": 18, "lh": 1.4}

SLIDE_LABELS = {
    "capa": "Capa",
    "contexto": "Contexto do município",
    "desafio": "Desafio",
    "solucao": "Solução e funcionalidades",
    "resultados": "Resultados",
    "grafico": "Gráfico",
    "avaliacao": "Avaliação",
    "cta": "Próximos passos",
}


class Ctx:
    def __init__(self, measure):
        self.measure = measure
        self.items = []
        self.warn = []

    def text(self, role, s, x, y, w, font, max, maxLines, lh, color, min=None, align="left"):  # noqa: A002
        if not s.strip():
            return 0
        fit = cl.fit_text(s, font, max, max if min is None else min, w, maxLines, lh, self.measure, K)
        if fit["truncated"]:
            self.warn.append(role)
        self.items.append({"type": "text", "role": role, "x": x, "y": y, "w": w, "lines": fit["lines"], "text": " ".join(fit["lines"]) if fit["truncated"] else s.strip(), "font": font, "size": fit["size"], "lineHeight": fit["lineHeight"], "color": color, "align": align})
        return len(fit["lines"]) * fit["lineHeight"]


def scene(bg, ctx):
    return {"background": bg, "items": ctx.items, "warnings": ctx.warn}


def footer(ctx, bg, page):
    """Rodapé dos slides de conteúdo: logotipo pela regra de contraste e número da página."""
    logo = brand.pick_logo(bg)
    h = 40
    w = h * logo["aspect"]
    ctx.items.append({"type": "image", "x": SLIDE["w"] - M - w, "y": SLIDE["h"] - 48 - h, "w": w, "h": h, "path": logo["path"]})
    ctx.text("pagina", str(page), M, SLIDE["h"] - 48 - 30, 200, "body-regular", 12, 1, 1.25, C["pageNumber"])


def content_slide(measure, title, page, body):
    ctx = Ctx(measure)
    ctx.items.append({"type": "rect", "x": M, "y": M - 8, "w": 64, "h": 8, "fill": C["accent"]})
    h = ctx.text("titulo", title, M, M + 16, CW, "display-bold", 44, 1, 1.15, C["title"], min=40)
    body(ctx, M + 16 + h + 40)
    footer(ctx, C["content"], page)
    return scene(C["content"], ctx)


def build_slides(c, measure):
    t = c["textos"]
    periodo = cl.format_periodo(c["periodo"]["inicio"], c["periodo"]["fim"])
    kpis = cl.kpi_list(c)
    cmp_ = cl.comparison_of(c)
    bars = cl.pct_bars(c)
    aval = cl.avaliacao_of(c)
    funcs = cl.funcionalidades_of(c)
    dest = [s.strip() for s in t["destaques"] if s.strip()]
    nome = cl.municipio_label(c) or "Município"

    plan = [
        ("capa", True),
        ("contexto", bool(c["contexto"].strip() or t["resumo"].strip())),
        ("desafio", bool(t["desafio"].strip())),
        ("solucao", bool(t["solucao"].strip() or funcs)),
        ("resultados", bool(kpis) or bool(t["resultado"].strip())),
        ("grafico", bool(cmp_) or bool(bars)),
        ("avaliacao", bool(aval) or bool(dest)),
        ("cta", True),
    ]
    slides = []
    page = 0
    for kind, show in plan:
        if show:
            page += 1
        n = page
        chart = None
        if kind == "capa":
            ctx = Ctx(measure)
            y = 300
            y += ctx.text("eyebrow", "CASE DE SUCESSO", M, y, CW, "body-semibold", 20, 1, 1.3, C["eyebrowDark"]) + 24
            y += ctx.text("municipio", nome, M, y, CW, "display-bold", 48, 2, 1.12, C["onDark"], min=40) + 28
            y += ctx.text("subtitulo", t["titulo"], M, y, CW * 0.8, "body-regular", 28, 3, 1.3, C["onDark"], min=24) + 20
            if periodo:
                ctx.text("periodo", "Resultados de %s" % periodo, M, y, CW, "body-regular", 20, 1, 1.3, C["onDark"])
            logo = brand.pick_logo(C["cover"])
            lh = 64
            ctx.items.append({"type": "image", "x": M, "y": SLIDE["h"] - M - lh, "w": lh * logo["aspect"], "h": lh, "path": logo["path"]})
            sc = scene(C["cover"], ctx)
        elif kind == "contexto":
            def body(ctx, top):
                y = top
                if t["resumo"].strip():
                    y += ctx.text("resumo", t["resumo"], M, y, CW * 0.85, "body-semibold", 28, 4, 1.35, C["title"], min=24) + 32
                ctx.text("contexto", c["contexto"], M, y, CW * 0.85, BODY["font"], BODY["max"], int((BOTTOM_LIMIT - y) // (18 * BODY["lh"] * K)), BODY["lh"], C["body"], min=BODY["min"])

            sc = content_slide(measure, "Contexto do município", n, body)
        elif kind == "desafio":
            sc = content_slide(measure, "Desafio", n, lambda ctx, top: ctx.text("desafio", t["desafio"], M, top, CW * 0.8, "body-regular", 32, 7, 1.4, C["body"], min=20))
        elif kind == "solucao":
            def body(ctx, top):
                col_w = (CW - 64) / 2 if funcs and t["solucao"].strip() else CW
                if t["solucao"].strip():
                    ctx.text("solucao", t["solucao"], M, top, col_w, BODY["font"], 28, 9, BODY["lh"], C["body"], min=BODY["min"])
                if funcs:
                    x = M + col_w + 64 if t["solucao"].strip() else M
                    shown = funcs[:8]
                    panel_h = 48 + 30 * 1.3 * K + 16 + len(shown) * 22 * 1.35 * K + 40
                    ctx.items.append({"type": "rect", "x": x, "y": top, "w": col_w, "h": min(panel_h, BOTTOM_LIMIT - top), "fill": C["panel"], "radius": 16})
                    y = top + 40
                    y += ctx.text("funcionalidades-titulo", "Funcionalidades usadas", x + 40, y, col_w - 80, "display-semibold", 28, 1, 1.3, C["highlight"]) + 16
                    for f in shown:
                        ctx.items.append({"type": "rect", "x": x + 40, "y": y + 16, "w": 12, "h": 12, "fill": C["accent"], "radius": 6})
                        y += ctx.text("funcionalidade", f, x + 68, y, col_w - 108, "body-regular", 22, 1, 1.35, C["body"], min=18)
                    if len(funcs) > len(shown):
                        ctx.warn.append("funcionalidades")

            sc = content_slide(measure, "Solução e funcionalidades", n, body)
        elif kind == "resultados":
            def body(ctx, top):
                y = top
                if t["resultado"].strip():
                    y += ctx.text("resultado", t["resultado"], M, y, CW * 0.85, BODY["font"], 24, 3 if kpis else 8, BODY["lh"], C["body"], min=BODY["min"]) + 40
                if not kpis:
                    return
                per_row = len(kpis) if len(kpis) <= 4 else 3
                rows = -(-len(kpis) // per_row)
                gap = 32
                tw = (CW - gap * (per_row - 1)) / per_row
                th = min(260, (BOTTOM_LIMIT - y - gap * (rows - 1)) / rows)
                for i, k in enumerate(kpis):
                    x = M + (i % per_row) * (tw + gap)
                    ty = y + (i // per_row) * (th + gap)
                    ctx.items.append({"type": "rect", "x": x, "y": ty, "w": tw, "h": th, "fill": C["panel"], "radius": 16})
                    vh = ctx.text("kpi-valor", k["value"], x + 32, ty + 28, tw - 64, "display-bold", 44 if rows > 1 else 54, 1, 1.1, C["highlight"], min=28)
                    ctx.text("kpi", k["def"]["short"], x + 32, ty + 28 + vh + 8, tw - 64, "body-regular", 20, 2, 1.3, C["body"], min=16)

            sc = content_slide(measure, "Resultados", n, body)
        elif kind == "grafico":
            top = M + 16 + 44 * 1.15 * K + 40
            box = {"x": M, "y": top, "w": CW, "h": BOTTOM_LIMIT - top}
            if cmp_:
                d = cmp_["def"]
                item = dict(box, type="chart", categories=[d["label"]], ink=C["body"], labelSize=20, series=[
                    {"name": "Antes", "color": C["chartBefore"], "values": [cmp_["before"]], "labels": [cl.format_value(d, cmp_["before"], c["nota_max"])]},
                    {"name": "Depois", "color": C["chartAfter"], "values": [cmp_["after"]], "labels": [cl.format_value(d, cmp_["after"], c["nota_max"])]},
                ])
                fmt = '"R$" #,##0' if d["unit"] == "brl" else '0.0"%"' if d["unit"] == "pct" else "#,##0"
                chart = {"series": [("Antes", [cmp_["before"]]), ("Depois", [cmp_["after"]])], "categories": [d["label"]], "colors": [C["chartBefore"], C["chartAfter"]], "formatCode": fmt, "item": item}
                title = "%s: antes e depois" % d["label"]
            else:
                lst = bars[:5]
                cats = [b["def"].get("chartLabel") or b["def"]["label"] for b in lst]
                vals = [b["value"] for b in lst]
                item = dict(box, type="chart", categories=cats, ink=C["body"], labelSize=20, series=[{"name": "Percentual", "color": C["chartAfter"], "values": vals, "labels": [cl.format_pct(v) for v in vals]}])
                chart = {"series": [("Percentual", vals)], "categories": cats, "colors": [C["chartAfter"]], "formatCode": '0.0"%"', "item": item}
                title = "Indicadores em percentual"
            sc = content_slide(measure, title, n, lambda ctx, top: None)
        elif kind == "avaliacao":
            def body(ctx, top):
                col_w = (CW - 64) / 2 if aval and dest else CW
                if aval:
                    y = top
                    if aval["media"] is not None:
                        nota = cl.format_value(cl.BY_ID["avaliacao_media"], aval["media"])
                        y += ctx.text("avaliacao-nota", nota, M, y, col_w, "display-bold", 96, 1, 1.1, C["highlight"]) + 8
                        y += ctx.text("avaliacao-escala", "de %s na avaliação média" % c["nota_max"], M, y, col_w, "body-regular", 24, 1, 1.3, C["body"]) + 40
                    if aval["positiva"] is not None:
                        y += ctx.text("avaliacao-positiva", cl.format_pct(aval["positiva"]), M, y, col_w, "display-bold", 72, 1, 1.1, C["highlight"]) + 8
                        ctx.text("avaliacao-positiva-rotulo", "de avaliações positivas", M, y, col_w, "body-regular", 24, 1, 1.3, C["body"])
                if dest:
                    x = M + col_w + 64 if aval else M
                    y = top
                    for d in dest:
                        h = ctx.text("destaques", d, x + 32, y, col_w - 32, "body-semibold", 28, 3, 1.3, C["title"], min=20)
                        ctx.items.append({"type": "rect", "x": x, "y": y + 6, "w": 8, "h": max(24, h - 12), "fill": C["accent"]})
                        y += h + 40

            sc = content_slide(measure, "Avaliação dos munícipes" if aval else "Destaques", n, body)
        else:  # cta
            ctx = Ctx(measure)
            y = 330
            y += ctx.text("eyebrow", "PRÓXIMOS PASSOS", M, y, CW, "body-semibold", 20, 1, 1.3, C["eyebrowDark"]) + 24
            y += ctx.text("cta", c["contato"]["cta"] or "Leve o Gove para o seu município", M, y, CW * 0.85, "display-bold", 48, 2, 1.15, C["onDark"], min=40) + 40
            for s in [v.strip() for v in (c["contato"]["nome"], c["contato"]["email"], c["contato"]["site"]) if v.strip()]:
                y += ctx.text("contato", s, M, y, CW, "body-regular", 24, 1, 1.4, C["onDark"], min=20)
            logo = brand.pick_logo(C["cta"])
            lh = 64
            ctx.items.append({"type": "image", "x": M, "y": SLIDE["h"] - M - lh, "w": lh * logo["aspect"], "h": lh, "path": logo["path"]})
            sc = scene(C["cta"], ctx)
        slides.append({"kind": kind, "hidden": not show, "scene": sc, "chart": chart})
    return slides


# ------------------------------------------------------------------ .pptx


def _set_theme_fonts(prs):
    """Fontes do tema: Montserrat nos títulos, Inter no corpo (como o pptxgenjs do app)."""
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT

    theme = prs.slide_master.part.part_related_by(RT.THEME)
    xml = theme.blob.decode("utf-8")
    xml = re.sub(r'(<a:majorFont>\s*<a:latin typeface=")[^"]*"', r'\1Montserrat"', xml, count=1)
    xml = re.sub(r'(<a:minorFont>\s*<a:latin typeface=")[^"]*"', r'\1Inter"', xml, count=1)
    theme._blob = xml.encode("utf-8")


def render_pptx(slides, out_path, title, subject=None):
    pptx = brand.require("pptx", "python-pptx")
    from pptx.chart.data import CategoryChartData
    from pptx.dml.color import RGBColor
    from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
    from pptx.oxml.ns import qn
    from pptx.util import Emu, Pt

    def emu(px):
        return Emu(int(round(px * 914400 / SLIDE["pxPerIn"])))

    def rgb(c):
        return RGBColor(*brand.hex_to_rgb(c))

    prs = pptx.Presentation()
    prs.slide_width = Emu(12192000)  # 13,333 pol
    prs.slide_height = Emu(6858000)  # 7,5 pol
    prs._element.sldSz.attrib.pop("type", None)  # o modelo padrão marca 4:3; aqui é 16:9 personalizado
    _set_theme_fonts(prs)
    cp = prs.core_properties
    cp.title = title
    cp.author = "Gove Digital"
    if subject:
        cp.subject = subject
    blank = prs.slide_layouts[6]
    align_map = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}

    for sl in slides:
        if sl["hidden"]:
            continue
        s = prs.slides.add_slide(blank)
        sc = sl["scene"]
        bg = s.background.fill
        bg.solid()
        bg.fore_color.rgb = rgb(sc["background"])
        for it in sc["items"]:
            if it["type"] == "rect":
                radius = it.get("radius", 0)
                shp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, emu(it["x"]), emu(it["y"]), emu(it["w"]), emu(it["h"]))
                if radius:
                    shp.adjustments[0] = min(0.5, radius / max(1e-6, min(it["w"], it["h"])))
                shp.fill.solid()
                shp.fill.fore_color.rgb = rgb(it["fill"])
                shp.line.fill.background()
                shp.shadow.inherit = False
                # Sem o estilo padrão do tema (sombra e contorno): só o preenchimento da paleta
                style = shp._element.find(qn("p:style"))
                if style is not None:
                    shp._element.remove(style)
            elif it["type"] == "text":
                f = brand.FONTS[it["font"]]
                h = len(it["lines"]) * it["lineHeight"]
                # Pequena folga: a métrica do PowerPoint difere um pouco da medição do script
                w = min(it["w"] * 1.04 + 4, SLIDE["w"] - it["x"])
                tb = s.shapes.add_textbox(emu(it["x"]), emu(it["y"]), emu(w), emu(h + 6))
                tf = tb.text_frame
                tf.word_wrap = True
                tf.auto_size = MSO_AUTO_SIZE.NONE
                tf.vertical_anchor = MSO_ANCHOR.TOP
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                for i, para in enumerate(it["text"].split("\n")):
                    p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
                    p.alignment = align_map[it.get("align", "left")]
                    p.line_spacing = Pt(it["lineHeight"] / K)
                    p.space_before = Pt(0)
                    p.space_after = Pt(0)
                    r = p.add_run()
                    r.text = para
                    r.font.name = f["face"]
                    r.font.bold = f["bold"]
                    r.font.size = Pt(it["size"])
                    r.font.color.rgb = rgb(it["color"])
            elif it["type"] == "image":
                pic = s.shapes.add_picture(it["path"], emu(it["x"]), emu(it["y"]), emu(it["w"]), emu(it["h"]))
                pic.name = "Logo Gove"
                pic._element.nvPicPr.cNvPr.set("descr", "Gove")
        ch = sl["chart"]
        if ch:
            it = ch["item"]
            data = CategoryChartData(number_format=ch["formatCode"])
            data.categories = ch["categories"]
            for name, vals in ch["series"]:
                data.add_series(name, vals)
            gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, emu(it["x"]), emu(it["y"]), emu(it["w"]), emu(it["h"]), data)
            chart = gf.chart
            chart.has_title = False  # o título fica no slide
            chart.font.name = "Inter"
            chart.font.size = Pt(18)
            chart.font.color.rgb = rgb(it["ink"])
            plot = chart.plots[0]
            plot.gap_width = 60
            plot.vary_by_categories = False
            for ser, color in zip(plot.series, ch["colors"]):
                ser.format.fill.solid()
                ser.format.fill.fore_color.rgb = rgb(color)
                ser.invert_if_negative = False
            plot.has_data_labels = True
            dl = plot.data_labels
            dl.number_format = ch["formatCode"]
            dl.number_format_is_linked = False
            dl.position = XL_LABEL_POSITION.OUTSIDE_END
            dl.show_value = True
            dl.font.name = "Inter"
            dl.font.size = Pt(it["labelSize"])
            dl.font.color.rgb = rgb(it["ink"])
            cat = chart.category_axis
            cat.tick_labels.font.name = "Inter"
            cat.tick_labels.font.size = Pt(18)
            cat.tick_labels.font.color.rgb = rgb(it["ink"])
            cat.format.line.color.rgb = rgb(it["ink"])
            cat.has_major_gridlines = False
            val = chart.value_axis
            val.visible = False
            val.has_major_gridlines = False
            val.has_minor_gridlines = False
            chart.has_legend = len(ch["series"]) > 1
            if chart.has_legend:
                chart.legend.position = XL_LEGEND_POSITION.BOTTOM
                chart.legend.include_in_layout = False
                chart.legend.font.name = "Inter"
                chart.legend.font.size = Pt(18)
                chart.legend.font.color.rgb = rgb(it["ink"])
    prs.save(out_path)


def main(argv):
    if len(argv) != 3:
        sys.stderr.write("Uso: python %s case.json saida.pptx\n" % os.path.relpath(__file__))
        return 2
    brand.require("pptx", "python-pptx")
    try:
        c = cl.load_case(argv[1])
        slides = build_slides(c, cl.make_measure())
    except cl.CaseError as e:
        sys.stderr.write("ERRO: %s\n" % e)
        return 1
    nome = cl.municipio_label(c) or "Município"
    render_pptx(slides, argv[2], "Case de sucesso – %s" % nome, subject=c["textos"]["titulo"] or None)
    shown = [s for s in slides if not s["hidden"]]
    print("Apresentação gerada: %s (%d slides, 16:9)" % (argv[2], len(shown)))
    print("Slides: " + ", ".join(SLIDE_LABELS[s["kind"]] for s in shown))
    hidden = [SLIDE_LABELS[s["kind"]] for s in slides if s["hidden"]]
    if hidden:
        print("Omitidos por falta de dados: " + ", ".join(hidden))
    for s in shown:
        if s["scene"]["warnings"]:
            print("AVISO: %s: texto longo demais, encurtado no slide." % SLIDE_LABELS[s["kind"]])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
