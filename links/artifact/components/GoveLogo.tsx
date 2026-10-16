/**
 * Logomarca oficial da Gove (brand/logos/). A versão vem da regra de contraste
 * de brand/logos.js (`pickLogo`): todas as cores da logo ≥ 4,5:1 com o fundo
 * real. O fundo muda com o tema, então a imagem é trocada junto.
 */
import { useSyncExternalStore } from "react";
import { kindForBox, pickLogo } from "../../../brand/logos.js";
import simboloCor from "../../../brand/logos/gove-simbolo-cor.png";
import simboloRoxo from "../../../brand/logos/gove-simbolo-roxo.png";
import simboloBranco from "../../../brand/logos/gove-simbolo-branco.png";
import logoCor from "../../../brand/logos/gove-logo-cor.webp";
import logoRoxo from "../../../brand/logos/gove-logo-roxo.webp";
import logoBranco from "../../../brand/logos/gove-logo-branco.webp";
import logoBrancoAmarelo from "../../../brand/logos/gove-logo-branco-amarelo.webp";

const FILES: Record<string, string> = {
  "gove-simbolo-cor.png": simboloCor,
  "gove-simbolo-roxo.png": simboloRoxo,
  "gove-simbolo-branco.png": simboloBranco,
  "gove-logo-cor.webp": logoCor,
  "gove-logo-roxo.webp": logoRoxo,
  "gove-logo-branco.webp": logoBranco,
  "gove-logo-branco-amarelo.webp": logoBrancoAmarelo,
};

type Pick = { file: string; aspect: number };

function subscribe(fn: () => void) {
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

/** true quando o tema escuro está ativo (classe .dark no <html>). */
export function useDarkTheme(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}

export function GoveLogo({
  height,
  light,
  dark,
  box,
  className = "",
}: {
  /** Altura em px. */
  height: number;
  /** Fundo real em cada tema (HEX). */
  light: string;
  dark: string;
  /** Espaço disponível [largura, altura]: define símbolo ou logotipo (kindForBox). */
  box: [number, number];
  className?: string;
}) {
  const darkTheme = useDarkTheme();
  const pick = pickLogo(darkTheme ? dark : light, kindForBox(box[0], box[1])) as Pick;
  return (
    <img
      src={FILES[pick.file]}
      alt="Gove"
      data-logo={pick.file}
      height={height}
      width={Math.round(height * pick.aspect)}
      className={`block shrink-0 ${className}`}
      style={{ height, width: "auto" }}
    />
  );
}
