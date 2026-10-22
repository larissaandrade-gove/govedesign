import { buttonCss } from "./buttonStyle";
import { backgroundCss } from "./background";
import { imageFrameCss } from "./imageFrame";
import { ANIMATION_CSS, bgAnimClass, btnAnimClass } from "./animations";
import { embedUrl } from "./video";
import type { BoxProps, ImageCredit, Leaf, PageContent, RowBlock, SectionBlock } from "./types";
import { cursorCss, followerCss, followerScript } from "./cursor";
import {
  BB_PALETTE,
  BB_PROTECTION,
  allowedText,
  isBB,
  logoLayout,
  needsProtection,
  pageFonts,
  rowSamples,
  textContext,
  type BBContext,
  type PageFonts,
} from "./bb";
import { BB_FONT_FACE_CSS } from "./bbFonts";

/** Contexto de renderização: identidade, fontes e (BB) o fundo do contêiner. */
interface RenderCtx {
  bb: boolean;
  fonts: PageFonts;
  container?: BBContext;
}

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Sombra; na identidade BB usa o Azul escuro da paleta (translúcido). */
const shadowCss = (shadow: BoxProps["shadow"], bb = false) => {
  const c = bb ? "51,51,189" : "11,32,39";
  return shadow === "sm"
    ? `0 2px 8px rgba(${c},.08)`
    : shadow === "md"
      ? `0 8px 24px rgba(${c},.16)`
      : "none";
};

function styleString(entries: Record<string, string | undefined>) {
  return Object.entries(entries)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function boxStyle(box: BoxProps, bb = false) {
  return styleString({
    ...backgroundCss(box),
    "border-radius": box.radius ? `${box.radius}px` : undefined,
    border: box.borderWidth ? `${box.borderWidth}px solid ${box.borderColor}` : undefined,
    "box-shadow": box.shadow === "none" ? undefined : shadowCss(box.shadow, bb),
    padding: `${box.paddingY}px ${box.paddingX}px`,
  });
}

/** Caixa de proteção BB (Azul escuro + texto Branco) para texto sobre foto. */
const PROTECTION_STYLE = `background-color:${BB_PROTECTION.bg};padding:12px 16px;border-radius:8px;margin:0 0 16px`;

function leafHtml(leaf: Leaf, ctx: RenderCtx): string {
  const html = leafInner(leaf, ctx);
  if (ctx.bb && ctx.container && html && needsProtection(leaf, ctx.container))
    return `<div class="bb-protecao" style="${PROTECTION_STYLE}">${html.replace(/margin:0 0 16px/, "margin:0")}</div>`;
  return html;
}

function leafInner(leaf: Leaf, ctx: RenderCtx): string {
  const { fonts } = ctx;
  switch (leaf.type) {
    case "text": {
      const heading = leaf.tag !== "p";
      const style = styleString({
        margin: "0 0 16px",
        "font-family": heading ? fonts.heading : fonts.body,
        "font-size": `${leaf.size}px`,
        "font-weight": String(heading ? fonts.headingWeight(leaf.weight === "bold") : fonts.bodyWeight(leaf.weight === "bold")),
        "font-style": leaf.italic ? "italic" : undefined,
        color: leaf.color,
        "text-align": leaf.align,
        "line-height": "1.4",
      });
      return `<${leaf.tag} style="${style}">${esc(leaf.content)}</${leaf.tag}>`;
    }
    case "button": {
      const base: Record<string, string | undefined> = {
        display: "inline-block",
        "font-family": fonts.body,
        "font-size": `${leaf.size}px`,
        "font-weight": String(fonts.bodyWeight(leaf.weight === "bold")),
        "font-style": leaf.italic ? "italic" : undefined,
        // Link de texto na identidade BB: sublinhado (não depende só da cor).
        "text-decoration": ctx.bb && leaf.variant === "text" ? "underline" : "none",
        "border-radius": `${leaf.radius}px`,
        color: leaf.color,
        ...buttonCss(leaf),
      };
      if (base["backdrop-filter"]) base["-webkit-backdrop-filter"] = base["backdrop-filter"];
      const wrapper = styleString({ "text-align": leaf.align, margin: "0 0 16px" });
      // Link visitado em Roxo escuro só onde o par é aprovado (fundos claros).
      const visited =
        ctx.bb && leaf.variant === "text" && ctx.container && allowedText(ctx.container).includes(BB_PALETTE.roxoEscuro)
          ? "bb-link"
          : "";
      const cls = [btnAnimClass(leaf.animation), visited].filter(Boolean).join(" ");
      return `<div style="${wrapper}"><a href="${esc(leaf.href || "#")}"${cls ? ` class="${cls}"` : ""} style="${styleString(base)}">${esc(leaf.label)}</a></div>`;
    }
    case "image": {
      if (!leaf.src) return "";
      const wrapper = styleString({ "text-align": leaf.align, margin: "0 0 16px" });
      const frame = imageFrameCss(leaf);
      const img = styleString({
        "max-width": "100%",
        width: `${leaf.width}%`,
        "border-radius": frame.radius,
        "aspect-ratio": frame.aspectRatio,
        "object-fit": frame.objectFit,
        display: "inline-block",
      });
      const credit = leaf.credit ? creditHtml(leaf.credit, false, ctx.bb) : "";
      const data = leaf.credit ? ` data-pexels-id="${leaf.credit.id}"` : "";
      return `<div style="${wrapper}"><img src="${esc(leaf.src)}" alt="${esc(leaf.alt)}"${data} style="${img}" />${credit}</div>`;
    }
    case "card": {
      const card = styleString({
        "background-color": leaf.bgColor,
        color: leaf.color,
        border: leaf.borderWidth ? `${leaf.borderWidth}px solid ${leaf.borderColor}` : undefined,
        "border-radius": `${leaf.radius}px`,
        "box-shadow": leaf.shadow === "none" ? undefined : shadowCss(leaf.shadow, ctx.bb),
        padding: `${leaf.padding}px`,
        "text-align": leaf.align,
        "font-family": fonts.body,
        margin: "0 0 16px",
      });
      const icon = `<div style="${styleString({ color: leaf.iconColor, "font-size": "24px", "margin-bottom": "8px" })}">${lucideSvg(leaf.icon, leaf.iconColor)}</div>`;
      const h3 = ctx.bb ? `font-family:${fonts.heading};` : "";
      return `<div style="${card}">${icon}<h3 style="margin:0 0 8px;${h3}font-size:${leaf.size + 4}px;font-weight:700;">${esc(leaf.title)}</h3><p style="margin:0;font-size:${leaf.size}px;line-height:1.5;">${esc(leaf.description)}</p></div>`;
    }
    case "rdform":
      // Snippet do RD Station preservado exatamente como colado pelo usuário.
      return leaf.snippet;
    case "video": {
      const src = embedUrl(leaf.url);
      if (!src) return "";
      const wrapper = styleString({ "text-align": leaf.align, margin: "0 0 16px" });
      const frame = styleString({
        display: "inline-block",
        width: `${leaf.width}%`,
        "max-width": "100%",
        "aspect-ratio": leaf.aspect,
        "border-radius": `${leaf.radius}px`,
        overflow: "hidden",
      });
      return `<div style="${wrapper}"><span style="${frame}"><iframe src="${esc(src)}" title="${esc(leaf.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0;display:block;"></iframe></span></div>`;
    }
    case "countdown": {
      const wrapper = styleString({ "text-align": leaf.align, margin: "0 0 16px" });
      const variantCss = buttonCss({ variant: leaf.variant ?? "filled", bgColor: leaf.bgColor });
      if (variantCss["backdrop-filter"]) variantCss["-webkit-backdrop-filter"] = variantCss["backdrop-filter"];
      const boxStyleStr = styleString({
        ...variantCss,
        display: "inline-block",
        color: leaf.color,
        "border-radius": `${leaf.radius}px`,
        padding: "12px 18px",
        "min-width": `${leaf.size * 2}px`,
        "text-align": "center",
      });
      return `<div style="${wrapper}"><div class="gove-countdown" data-target="${esc(leaf.target)}" data-mode="${leaf.mode}" data-expired="${esc(leaf.expiredText)}" data-unit-style="${esc(boxStyleStr)}" data-unit-class="${esc(btnAnimClass(leaf.animation))}" data-num-size="${leaf.size}" data-label-color="${esc(leaf.accentColor)}" data-color="${esc(leaf.color)}"${ctx.bb ? ` data-num-font="${esc(fonts.heading)}"` : ""} style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center;font-family:${ctx.bb ? fonts.body : "Montserrat,Arial,sans-serif"};"></div></div>`;
    }
    default:
      return "";
  }
}

/** SVG simples e genérico para o ícone (sem dependências externas no export). */
function lucideSvg(_name: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
}

function rowHtml(row: RowBlock, section: SectionBlock, base: RenderCtx): string {
  const ctx: RenderCtx = base.bb ? { ...base, container: textContext(rowSamples(section, row)) } : base;
  const cols = row.columns
    .map(
      (col) =>
        `<div class="gove-col" style="flex:1 1 0;min-width:0;">${col.children.map((leaf) => leafHtml(leaf, ctx)).join("")}</div>`,
    )
    .join("");
  const style = styleString({
    display: "flex",
    "flex-wrap": "wrap",
    gap: `${row.gap}px`,
    "align-items":
      row.alignItems === "center"
        ? "center"
        : row.alignItems === "end"
          ? "flex-end"
          : row.alignItems === "stretch"
            ? "stretch"
            : "flex-start",
    ...Object.fromEntries(
      boxStyle(row.box, base.bb)
        .split(";")
        .filter(Boolean)
        .map((pair) => pair.split(/:(.+)/) as [string, string]),
    ),
  });
  const credit = row.box.fill === "image" && row.box.bgImage && row.box.bgCredit ? row.box.bgCredit : null;
  const data = credit ? ` data-pexels-id="${credit.id}"` : "";
  return `<div class="gove-row ${bgAnimClass(row.box.animation)}"${data} style="${credit ? "position:relative;" : ""}${style}">${cols}${credit ? creditHtml(credit, true, base.bb) : ""}</div>`;
}

/**
 * Crédito discreto da foto do Pexels (atribuição recomendada pela licença):
 * comentário + selo pequeno com contraste fixo (branco sobre roxo escuro).
 */
function creditHtml(credit: ImageCredit, overlay: boolean, bb = false): string {
  const chip = styleString({
    display: "inline-block",
    margin: overlay ? undefined : "6px 0 0",
    position: overlay ? "absolute" : undefined,
    right: overlay ? "8px" : undefined,
    bottom: overlay ? "8px" : undefined,
    "font-size": "12px",
    "line-height": "1.4",
    padding: "2px 8px",
    "border-radius": "4px",
    // BB: proteção Azul escuro sólida + Branco (8,94:1), só cores da paleta.
    background: bb ? BB_PROTECTION.bg : "rgba(32,19,61,0.85)",
    color: "#FFFFFF",
  });
  const link = "color:#FFFFFF;text-decoration:underline;";
  const comment = `Foto: ${credit.photographer} no Pexels (${credit.pexelsUrl})`.replace(/--+/g, "-").replace(/[<>]/g, "");
  return `<!-- ${comment} --><small class="gove-credit" style="${chip}">Foto: <a href="${esc(credit.photographerUrl)}" target="_blank" rel="noopener" style="${link}">${esc(credit.photographer)}</a> / <a href="${esc(credit.pexelsUrl)}" target="_blank" rel="noopener" style="${link}">Pexels</a></small>`;
}

function sectionHtml(section: SectionBlock, ctx: RenderCtx): string {
  const cls = bgAnimClass(section.box.animation);
  const credit =
    section.box.fill === "image" && section.box.bgImage && section.box.bgCredit
      ? section.box.bgCredit
      : null;
  const style = credit ? `position:relative;${boxStyle(section.box, ctx.bb)}` : boxStyle(section.box, ctx.bb);
  const data = credit ? ` data-pexels-id="${credit.id}"` : "";
  return `<section${cls ? ` class="${cls}"` : ""}${data} style="${style}"><div class="gove-container" style="max-width:1120px;margin:0 auto;">${section.children.map((row) => rowHtml(row, section, ctx)).join("")}</div>${credit ? creditHtml(credit, true, ctx.bb) : ""}</section>`;
}

/** Faixa da logomarca BB: arquivo oficial sem recolorir, área de proteção x/2. */
function logoHtml(page: PageContent): string {
  const logo = page.bbLogo;
  if (!logo?.src) return "";
  const { width, clear } = logoLayout(logo);
  const style = styleString({
    "background-color": logo.bg,
    padding: `${clear}px ${Math.max(clear, 24)}px`,
    "text-align": logo.align,
  });
  return `<header class="bb-logo" style="${style}"><img src="${esc(logo.src)}" alt="Banco do Brasil" width="${width}" style="display:inline-block;width:${width}px;max-width:none;height:auto;vertical-align:middle;" /></header>`;
}

function hasCountdown(page: PageContent) {
  return page.sections.some((s) =>
    s.children.some((r) => r.columns.some((c) => c.children.some((l) => l.type === "countdown"))),
  );
}

const COUNTDOWN_SCRIPT = `<script>
(function(){
  var pad=function(n){return String(n).padStart(2,"0")};
  var plural=function(v,a,b){return v===1?a:b};
  function units(mode,ms){
    var t=Math.max(0,Math.floor(ms/1000));
    var d=Math.floor(t/86400),h=Math.floor((t%86400)/3600),m=Math.floor((t%3600)/60),s=t%60;
    if(mode==="d")return [[d,plural(d,"Dia","Dias")]];
    if(mode==="dh")return [[d,plural(d,"Dia","Dias")],[h,plural(h,"Hora","Horas")]];
    if(mode==="dhm")return [[d,plural(d,"Dia","Dias")],[h,plural(h,"Hora","Horas")],[m,"Min"]];
    if(mode==="m")return [[Math.floor(t/60),plural(Math.floor(t/60),"Minuto","Minutos")]];
    return [[d,plural(d,"Dia","Dias")],[h,plural(h,"Hora","Horas")],[m,"Min"],[s,"Seg"]];
  }
  function render(el){
    var left=new Date(el.getAttribute("data-target")).getTime()-Date.now();
    if(isNaN(left)||left<=0){
      el.innerHTML='<span style="font-weight:700;color:'+el.getAttribute("data-color")+';font-size:'+(Number(el.getAttribute("data-num-size"))/2)+'px">'+el.getAttribute("data-expired")+'</span>';
      return false;
    }
    var nf=el.getAttribute("data-num-font");
    el.innerHTML=units(el.getAttribute("data-mode"),left).map(function(u){
      return '<span class="'+(el.getAttribute("data-unit-class")||"")+'" style="'+el.getAttribute("data-unit-style")+'"><span style="display:block;'+(nf?'font-family:'+nf+';':'')+'font-size:'+el.getAttribute("data-num-size")+'px;font-weight:700;line-height:1.1">'+pad(u[0])+'</span><span style="display:block;font-size:16px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:'+el.getAttribute("data-label-color")+'">'+u[1]+'</span></span>';
    }).join("");
    return true;
  }
  var nodes=[].slice.call(document.querySelectorAll(".gove-countdown"));
  nodes.forEach(render);
  setInterval(function(){nodes.forEach(render)},1000);
})();
</script>`;

/** CSS extra da identidade BB: @font-face embutido (data URI), fonte base e links visitados. */
function bbCss(fonts: PageFonts): string {
  return `${BB_FONT_FACE_CSS}
.gove-lp[data-identity="bb"]{font-family:${fonts.body};color:${BB_PALETTE.azulEscuro};}
.gove-lp a.bb-link:visited{color:${BB_PALETTE.roxoEscuro} !important;}
@media (max-width:768px){.gove-lp .bb-logo{padding-left:16px !important;padding-right:16px !important;}}`;
}

export function exportHtml(page: PageContent, nome: string): string {
  const bb = isBB(page);
  const ctx: RenderCtx = { bb, fonts: pageFonts(page.identity) };
  const body = page.sections.map((section) => sectionHtml(section, ctx)).join("\n");
  return `<!-- ${nome} — gerado no GOVE LP Builder${bb ? " — identidade Banco do Brasil" : ""} -->
<div class="gove-lp"${bb ? ' data-identity="bb"' : ""}>
<style>
.gove-lp{font-family:Montserrat,Arial,sans-serif;box-sizing:border-box;}
.gove-lp *,.gove-lp *::before,.gove-lp *::after{box-sizing:border-box;}
.gove-lp img{max-width:100%;height:auto;}
@media (max-width:768px){
  .gove-lp .gove-row{flex-direction:column;}
  .gove-lp .gove-col{flex:1 1 100% !important;width:100%;}
  .gove-lp section{padding-left:24px !important;padding-right:24px !important;}
}
${ANIMATION_CSS}
${cursorCss(page.cursor)}
${followerCss(page.cursor)}
${bb ? bbCss(ctx.fonts) : ""}
</style>
${bb ? logoHtml(page) : ""}
${body}
${hasCountdown(page) ? COUNTDOWN_SCRIPT : ""}
${followerScript(page.cursor)}
</div>`;
}

export function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "landing-page"
  );
}

export function collectMissingAlt(page: PageContent): number {
  let count = 0;
  for (const section of page.sections)
    for (const row of section.children)
      for (const col of row.columns)
        for (const leaf of col.children)
          if (leaf.type === "image" && leaf.src && !leaf.alt.trim()) count += 1;
  return count;
}