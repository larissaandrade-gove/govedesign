import type { BgAnimation, ButtonAnimation } from "./types";

export const BUTTON_ANIMATIONS: { value: ButtonAnimation; label: string }[] = [
  { value: "none", label: "Sem animação" },
  { value: "pulse", label: "Pulsar suave" },
  { value: "float", label: "Flutuar" },
  { value: "glow", label: "Brilho pulsante" },
  { value: "shine", label: "Reflexo deslizante" },
];

export const BG_ANIMATIONS: { value: BgAnimation; label: string }[] = [
  { value: "none", label: "Sem animação" },
  { value: "pan", label: "Degradê em movimento" },
  { value: "kenburns", label: "Zoom lento (Ken Burns)" },
  { value: "reveal", label: "Revelar ao carregar" },
  { value: "shimmer", label: "Brilho atravessando" },
];

export const btnAnimClass = (a?: ButtonAnimation) =>
  !a || a === "none" ? "" : `gove-a-btn-${a}`;

export const bgAnimClass = (a?: BgAnimation) => (!a || a === "none" ? "" : `gove-a-bg-${a}`);

/** CSS autocontido das animações — usado no canvas e no HTML exportado. */
export const ANIMATION_CSS = `
@keyframes gove-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes gove-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes gove-glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
@keyframes gove-shine{0%{transform:translateX(-160%) skewX(-18deg)}55%,100%{transform:translateX(320%) skewX(-18deg)}}
@keyframes gove-pan{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes gove-kenburns{0%{background-size:110%}100%{background-size:132%}}
@keyframes gove-reveal{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes gove-shimmer{0%{transform:translateX(-70%) skewX(-16deg)}100%{transform:translateX(220%) skewX(-16deg)}}
.gove-a-btn-pulse{animation:gove-pulse 2.2s cubic-bezier(.4,0,.2,1) infinite;will-change:transform}
.gove-a-btn-float{animation:gove-float 3s ease-in-out infinite;will-change:transform}
.gove-a-btn-glow{animation:gove-glow 2s ease-in-out infinite}
.gove-a-btn-shine{position:relative;overflow:hidden;isolation:isolate}
.gove-a-btn-shine::after{content:"";position:absolute;top:-50%;left:0;width:40%;height:200%;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.55) 50%,rgba(255,255,255,0) 100%);animation:gove-shine 2.8s ease-in-out infinite;pointer-events:none}
.gove-a-bg-pan{background-size:220% 220% !important;animation:gove-pan 14s ease-in-out infinite}
.gove-a-bg-kenburns{animation:gove-kenburns 18s ease-in-out infinite alternate}
.gove-a-bg-reveal{animation:gove-reveal .9s cubic-bezier(.16,1,.3,1) both}
.gove-a-bg-shimmer{position:relative;overflow:hidden}
.gove-a-bg-shimmer::before{content:"";position:absolute;inset:-20% auto -20% 0;width:35%;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.18) 50%,rgba(255,255,255,0) 100%);animation:gove-shimmer 6s ease-in-out infinite;pointer-events:none}
@media (prefers-reduced-motion: reduce){
  .gove-a-btn-pulse,.gove-a-btn-float,.gove-a-btn-glow,.gove-a-bg-pan,.gove-a-bg-kenburns,.gove-a-bg-reveal{animation:none !important}
  .gove-a-btn-shine::after,.gove-a-bg-shimmer::before{display:none}
}
`;
