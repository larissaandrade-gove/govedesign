import { buttonCss } from "./buttonStyle";
import { backgroundCss } from "./background";
import { imageFrameCss } from "./imageFrame";
import { ANIMATION_CSS, bgAnimClass, btnAnimClass } from "./animations";
import { embedUrl } from "./video";
import type { BoxProps, ImageCredit, Leaf, PageContent, RowBlock, SectionBlock } from "./types";
import { cursorCss, followerCss, followerScript } from "./cursor";

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const shadowCss = (shadow: BoxProps["shadow"]) =>
  shadow === "sm"
    ? "0 2px 8px rgba(11,32,39,.08)"
    : shadow === "md"
      ? "0 8px 24px rgba(11,32,39,.16)"
      : "none";

function styleString(entries: Record<string, string | undefined>) {
  return Object.entries(entries)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function boxStyle(box: BoxProps) {
  return styleString({
    ...backgroundCss(box),
    "border-radius": box.radius ? `${box.radius}px` : undefined,
    border: box.borderWidth ? `${box.borderWidth}px solid ${box.borderColor}` : undefined,
    "box-shadow": box.shadow === "none" ? undefined : shadowCss(box.shadow),
    padding: `${box.paddingY}px ${box.paddingX}px`,
  });
}

function leafHtml(leaf: Leaf): string {
  switch (leaf.type) {
    case "text": {
      const style = styleString({
        margin: "0 0 16px",
        "font-family": "Montserrat, Arial, sans-serif",
        "font-size": `${leaf.size}px`,
        "font-weight": leaf.weight === "bold" ? "700" : "400",
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
        "font-family": "Montserrat, Arial, sans-serif",
        "font-size": `${leaf.size}px`,
        "font-weight": leaf.weight === "bold" ? "700" : "400",
        "font-style": leaf.italic ? "italic" : undefined,
        "text-decoration": "none",
        "border-radius": `${leaf.radius}px`,
        color: leaf.color,
        ...buttonCss(leaf),
      };
      if (base["backdrop-filter"]) base["-webkit-backdrop-filter"] = base["backdrop-filter"];
      const wrapper = styleString({ "text-align": leaf.align, margin: "0 0 16px" });
      const cls = btnAnimClass(leaf.animation);
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
      const credit = leaf.credit ? creditHtml(leaf.credit, false) : "";
      const data = leaf.credit ? ` data-pexels-id="${leaf.credit.id}"` : "";
      return `<div style="${wrapper}"><img src="${esc(leaf.src)}" alt="${esc(leaf.alt)}"${data} style="${img}" />${credit}</div>`;
    }
    case "card": {
      const card = styleString({
        "background-color": leaf.bgColor,
        color: leaf.color,
        border: leaf.borderWidth ? `${leaf.borderWidth}px solid ${leaf.borderColor}` : undefined,
        "border-radius": `${leaf.radius}px`,
        "box-shadow": leaf.shadow === "none" ? undefined : shadowCss(leaf.shadow),
        padding: `${leaf.padding}px`,
        "text-align": leaf.align,
        "font-family": "Montserrat, Arial, sans-serif",
        margin: "0 0 16px",
      });
      const icon = `<div style="${styleString({ color: leaf.iconColor, "font-size": "24px", "margin-bottom": "8px" })}">${lucideSvg(leaf.icon, leaf.iconColor)}</div>`;
      return `<div style="${card}">${icon}<h3 style="margin:0 0 8px;font-size:${leaf.size + 4}px;font-weight:700;">${esc(leaf.title)}</h3><p style="margin:0;font-size:${leaf.size}px;line-height:1.5;">${esc(leaf.description)}</p></div>`;
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
      return `<div style="${wrapper}"><div class="gove-countdown" data-target="${esc(leaf.target)}" data-mode="${leaf.mode}" data-expired="${esc(leaf.expiredText)}" data-unit-style="${esc(boxStyleStr)}" data-unit-class="${esc(btnAnimClass(leaf.animation))}" data-num-size="${leaf.size}" data-label-color="${esc(leaf.accentColor)}" data-color="${esc(leaf.color)}" style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center;font-family:Montserrat,Arial,sans-serif;"></div></div>`;
    }
    default:
      return "";
  }
}

/** SVG simples e genérico para o ícone (sem dependências externas no export). */
function lucideSvg(_name: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
}

function rowHtml(row: RowBlock): string {
  const cols = row.columns
    .map(
      (col) =>
        `<div class="gove-col" style="flex:1 1 0;min-width:0;">${col.children.map(leafHtml).join("")}</div>`,
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
      boxStyle(row.box)
        .split(";")
        .filter(Boolean)
        .map((pair) => pair.split(/:(.+)/) as [string, string]),
    ),
  });
  const credit = row.box.fill === "image" && row.box.bgImage && row.box.bgCredit ? row.box.bgCredit : null;
  const data = credit ? ` data-pexels-id="${credit.id}"` : "";
  return `<div class="gove-row ${bgAnimClass(row.box.animation)}"${data} style="${credit ? "position:relative;" : ""}${style}">${cols}${credit ? creditHtml(credit, true) : ""}</div>`;
}

/**
 * Crédito discreto da foto do Pexels (atribuição recomendada pela licença):
 * comentário + selo pequeno com contraste fixo (branco sobre roxo escuro).
 */
function creditHtml(credit: ImageCredit, overlay: boolean): string {
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
    background: "rgba(32,19,61,0.85)",
    color: "#FFFFFF",
  });
  const link = "color:#FFFFFF;text-decoration:underline;";
  const comment = `Foto: ${credit.photographer} no Pexels (${credit.pexelsUrl})`.replace(/--+/g, "-").replace(/[<>]/g, "");
  return `<!-- ${comment} --><small class="gove-credit" style="${chip}">Foto: <a href="${esc(credit.photographerUrl)}" target="_blank" rel="noopener" style="${link}">${esc(credit.photographer)}</a> / <a href="${esc(credit.pexelsUrl)}" target="_blank" rel="noopener" style="${link}">Pexels</a></small>`;
}

function sectionHtml(section: SectionBlock): string {
  const cls = bgAnimClass(section.box.animation);
  const credit =
    section.box.fill === "image" && section.box.bgImage && section.box.bgCredit
      ? section.box.bgCredit
      : null;
  const style = credit ? `position:relative;${boxStyle(section.box)}` : boxStyle(section.box);
  const data = credit ? ` data-pexels-id="${credit.id}"` : "";
  return `<section${cls ? ` class="${cls}"` : ""}${data} style="${style}"><div class="gove-container" style="max-width:1120px;margin:0 auto;">${section.children.map(rowHtml).join("")}</div>${credit ? creditHtml(credit, true) : ""}</section>`;
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
    el.innerHTML=units(el.getAttribute("data-mode"),left).map(function(u){
      return '<span class="'+(el.getAttribute("data-unit-class")||"")+'" style="'+el.getAttribute("data-unit-style")+'"><span style="display:block;font-size:'+el.getAttribute("data-num-size")+'px;font-weight:700;line-height:1.1">'+pad(u[0])+'</span><span style="display:block;font-size:16px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:'+el.getAttribute("data-label-color")+'">'+u[1]+'</span></span>';
    }).join("");
    return true;
  }
  var nodes=[].slice.call(document.querySelectorAll(".gove-countdown"));
  nodes.forEach(render);
  setInterval(function(){nodes.forEach(render)},1000);
})();
</script>`;

export function exportHtml(page: PageContent, nome: string): string {
  const body = page.sections.map(sectionHtml).join("\n");
  return `<!-- ${nome} — gerado no GOVE LP Builder -->
<div class="gove-lp">
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
</style>
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