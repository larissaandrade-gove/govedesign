"""
Conversor de cores para a identidade Banco do Brasil - Excel/.xlsx (inclui Google Sheets exportado)
GOVE | Design System BB. Uso:  python bb_recolor_xlsx.py entrada.xlsx saida.xlsx
Edita o pacote no nivel XML (preserva graficos, imagens, formulas, larguras, posicoes).
Altera SOMENTE cores e garante texto >= 4.5:1 sobre o preenchimento da celula.
"""
import sys, re, zipfile, copy
from lxml import etree
from openpyxl.styles.colors import COLOR_INDEX
from bb_palette import PALETA, MIN_TEXTO, contraste, mapear_fundo, mapear_texto, texto_pior_caso, hexs, rgb
import bb_recolor_pptx as P  # reaproveita tema e graficos

S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"; X = "{%s}" % S
# ordem dos indices de tema no Excel: lt1, dk1, lt2, dk2, accent1..6, hlink, folHlink
TEMA_IDX = [P.TEMA_BB[k] for k in ("lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3",
                                     "accent4", "accent5", "accent6", "hlink", "folHlink")]
log = P.log

def aplicar_tint(hx, tint):
    if not tint: return hx
    import colorsys
    r, g, b = (v / 255 for v in rgb(hx)); h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = l * (1 + tint) if tint < 0 else l * (1 - tint) + tint
    return hexs(tuple(c * 255 for c in colorsys.hls_to_rgb(h, l, s)))

def resolver(el, padrao):
    if el is None: return padrao
    if el.get("rgb"): return el.get("rgb")[-6:].upper()
    if el.get("theme") is not None:
        return aplicar_tint(TEMA_IDX[int(el.get("theme")) % 12], float(el.get("tint", 0)))
    if el.get("indexed") is not None:
        i = int(el.get("indexed")); return COLOR_INDEX[i][-6:] if i < 64 else padrao
    return padrao

def definir(el, hx):
    for a in ("theme", "tint", "indexed", "auto"): el.attrib.pop(a, None)
    el.set("rgb", "FF" + hx)

def cor_preench(fill):
    """Cor visivel de um <fill>. None = sem preenchimento (fundo branco)."""
    pf = fill.find(X + "patternFill")
    if pf is None or pf.get("patternType") in (None, "none"): return None
    return resolver(pf.find(X + "fgColor"), "FFFFFF")

def converter(entrada, saida):
    zin = zipfile.ZipFile(entrada); out = {}
    st = etree.fromstring(zin.read("xl/styles.xml"))
    fonts = st.find(X + "fonts"); fills = st.find(X + "fills"); xfs = st.find(X + "cellXfs")
    # 1) preenchimentos -> paleta BB
    fundo_fill = []
    for i, f in enumerate(fills):
        c = None if i < 2 else cor_preench(f)  # fills 0 e 1 sao reservados pelo Excel (none, gray125)
        if c is None: fundo_fill.append("FFFFFF"); continue
        alvo = mapear_fundo(c); pf = f.find(X + "patternFill")
        for tag in ("fgColor", "bgColor"):
            el = pf.find(X + tag)
            if el is not None: definir(el, alvo)
        if pf.get("patternType") != "solid":
            log.append({"onde": f"styles fill {i}", "de": "padrao " + pf.get("patternType"), "para": alvo,
                        "motivo": "REVISAR: preenchimento com textura; contraste calculado sobre a cor solida"})
        if c != alvo: log.append({"onde": f"styles fill {i}", "de": c, "para": alvo, "motivo": "celula -> paleta BB"})
        fundo_fill.append(alvo)
    for gf in st.iter(X + "gradientFill"):
        for el in gf.iter(X + "color"): definir(el, mapear_fundo(resolver(el, "FFFFFF")))
    # 2) cada combinacao fonte+preenchimento (xf) -> cor de texto com >= 4.5:1
    clones = {}
    for k, xf in enumerate(xfs):
        fid, flid = int(xf.get("fontId", 0)), int(xf.get("fillId", 0))
        fundo = fundo_fill[flid] if flid < len(fundo_fill) else "FFFFFF"
        fonte = fonts[fid]; cel = fonte.find(X + "color")
        atual = resolver(cel, P.TEMA_BB["dk1"])
        alvo = mapear_texto(atual, fundo)
        chave = (fid, alvo)
        if chave not in clones:
            nova = copy.deepcopy(fonte); c = nova.find(X + "color")
            if c is None:
                c = etree.Element(X + "color"); nova.insert(len(nova.findall(X + "b")) + len(nova.findall(X + "i")), c)
            definir(c, alvo); fonts.append(nova); clones[chave] = len(fonts) - 1
        xf.set("fontId", str(clones[chave])); xf.set("applyFont", "1")
        if atual != alvo: log.append({"onde": f"estilo de celula {k}", "de": atual, "para": alvo,
                                      "motivo": f"texto >= 4.5:1 sobre {fundo}"})
    fonts.set("count", str(len(fonts)))
    # 3) formatacao condicional (dxf): preenchimento + fonte garantida
    for j, dxf in enumerate(st.iter(X + "dxf")):
        fundo = None
        fill = dxf.find(X + "fill")
        if fill is not None:
            pf = fill.find(X + "patternFill")
            if pf is not None:
                for tag in ("bgColor", "fgColor"):
                    el = pf.find(X + tag)
                    if el is not None:
                        fundo = mapear_fundo(resolver(el, "FFFFFF")); definir(el, fundo)
        font = dxf.find(X + "font")
        if fundo:
            if font is None: font = etree.Element(X + "font"); dxf.insert(0, font)
            c = font.find(X + "color")
            if c is None: c = etree.SubElement(font, X + "color")
            definir(c, mapear_texto(resolver(c, P.TEMA_BB["dk1"]), fundo))
        elif font is not None and font.find(X + "color") is not None:
            c = font.find(X + "color"); definir(c, mapear_texto(resolver(c, "3333BD"), "FFFFFF"))
            log.append({"onde": f"formatacao condicional {j}", "de": "fonte", "para": c.get("rgb"),
                        "motivo": "REVISAR: regra so de fonte; validada contra fundo Branco"})
    out["xl/styles.xml"] = etree.tostring(st, xml_declaration=True, encoding="UTF-8", standalone=True)
    # 4) abas, escalas de cor, barras de dados
    for n in zin.namelist():
        if re.match(r"xl/worksheets/sheet\d+\.xml$", n):
            root = etree.fromstring(zin.read(n))
            for tc in root.iter(X + "tabColor"): definir(tc, mapear_fundo(resolver(tc, "465EFF")))
            for cs in root.iter(X + "colorScale"):
                for c in cs.iter(X + "color"): definir(c, mapear_fundo(resolver(c, "FFFFFF")))
                log.append({"onde": n, "de": "escala de cor", "para": "extremos na paleta BB",
                            "motivo": "REVISAR: escala gera tons intermediarios fora do manual; prefira regras discretas"})
            for db in root.iter(X + "dataBar"):
                for c in db.iter(X + "color"): definir(c, PALETA["azul_institucional"])
            out[n] = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
        elif re.match(r"xl/theme/theme\d+\.xml$", n): out[n] = P.recolorir_tema(zin.read(n))
        elif re.match(r"xl/charts/chart\d+\.xml$", n): out[n] = P.recolorir_grafico(zin.read(n), n)
        elif n == "xl/sharedStrings.xml":
            root = etree.fromstring(zin.read(n))
            for c in root.iter(X + "color"):  # texto rico: validado contra Branco (fundo mais comum)
                definir(c, mapear_texto(resolver(c, "3333BD"), "FFFFFF"))
            out[n] = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
    with zipfile.ZipFile(saida, "w", zipfile.ZIP_DEFLATED) as z:
        for n in zin.namelist(): z.writestr(zin.getinfo(n), out.get(n, zin.read(n)))
    rel = saida.rsplit(".", 1)[0] + "_relatorio.md"
    with open(rel, "w", encoding="utf-8") as f:
        f.write("# Relatorio de conversao BB (planilha)\n\n| Onde | De | Para | Motivo |\n|---|---|---|---|\n")
        for l in log: f.write(f"| {l['onde']} | {l['de']} | {l['para']} | {l['motivo']} |\n")

if __name__ == "__main__":
    converter(sys.argv[1], sys.argv[2])
    print(f"{len(log)} alteracoes. Itens REVISAR: {sum('REVISAR' in l['motivo'] for l in log)}")
