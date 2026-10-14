import type { PageCursor } from "./types";

export const DEFAULT_CURSOR: PageCursor = {
  mode: "default",
  url: "",
  size: 40,
  hotspot: "topleft",
  hideNative: true,
};

export const normalizeCursor = (c?: PageCursor): PageCursor => ({ ...DEFAULT_CURSOR, ...(c ?? {}) });

const svg = (markup: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(markup.replace(/\s+/g, " ").trim())}`;

/** Presets embutidos (SVG inline — sem dependência externa no HTML exportado). */
export const CURSOR_PRESETS: { label: string; url: string; hotspot: PageCursor["hotspot"] }[] = [
  {
    label: "Seta GOVE",
    hotspot: "topleft",
    url: svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path d="M4 2l14 8.5-6.2 1.4L9.6 20z" fill="#FFC72C" stroke="#20133D" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    ),
  },
  {
    label: "Ponto roxo",
    hotspot: "center",
    url: svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="#3D0099" stroke="#FFC72C" stroke-width="2"/></svg>`,
    ),
  },
  {
    label: "Brilho",
    hotspot: "center",
    url: svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path d="M12 2l2.2 6.4L21 11l-6.8 2.6L12 22l-2.2-8.4L3 11l6.8-2.6z" fill="#FFC72C" stroke="#351F65" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    ),
  },
];

/** CSS do cursor via propriedade `cursor` (ícones estáticos: SVG/PNG). */
export function cursorCss(cursor?: PageCursor): string {
  const c = normalizeCursor(cursor);
  if (c.mode !== "image" || !c.url.trim()) return "";
  const offset = c.hotspot === "center" ? Math.round(c.size / 2) : 0;
  return `.gove-lp,.gove-lp *{cursor:url("${c.url}") ${offset} ${offset}, auto;}`;
}

/** CSS do cursor que segue o mouse (funciona com GIF animado). */
export function followerCss(cursor?: PageCursor): string {
  const c = normalizeCursor(cursor);
  if (c.mode !== "follower" || !c.url.trim()) return "";
  return `${c.hideNative ? ".gove-lp,.gove-lp *{cursor:none;}" : ""}
.gove-cursor{position:fixed;top:0;left:0;width:${c.size}px;height:${c.size}px;background:url("${c.url}") center/contain no-repeat;pointer-events:none;z-index:9999;transform:translate(-9999px,-9999px);will-change:transform;transition:transform .04s linear;}
@media (hover:none){.gove-cursor{display:none}.gove-lp,.gove-lp *{cursor:auto !important}}
@media (prefers-reduced-motion:reduce){.gove-cursor{transition:none}}`;
}

export function followerScript(cursor?: PageCursor): string {
  const c = normalizeCursor(cursor);
  if (c.mode !== "follower" || !c.url.trim()) return "";
  const off = c.hotspot === "center" ? c.size / 2 : 0;
  return `<script>
(function(){
  if(window.matchMedia&&window.matchMedia("(hover:none)").matches)return;
  var el=document.createElement("div");el.className="gove-cursor";el.setAttribute("aria-hidden","true");
  document.body.appendChild(el);
  document.addEventListener("mousemove",function(e){
    el.style.transform="translate("+(e.clientX-${off})+"px,"+(e.clientY-${off})+"px)";
  },{passive:true});
})();
</script>`;
}