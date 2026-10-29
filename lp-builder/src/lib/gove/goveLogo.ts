/**
 * Logo oficial da GOVE (brand/logos/) no cabeçalho e no rodapé.
 *
 * A versão segue `pickLogo` (brand/logos.js: contraste >= 4,5:1 de todas as
 * cores do logo com o fundo). Os arquivos entram como data URL, registrados
 * pela camada React (components/gove/goveLogoAssets.ts, import ?inline), para
 * o HTML exportado não depender de servidor. Este módulo fica puro (roda no
 * teste em Node, que registra arquivos de mentira).
 */
import { LOGOS, pickLogo } from "../../../../brand/logos.js";

const sources: Record<string, string> = {};

/** Registra as data URLs dos arquivos de brand/logos (nome do arquivo → URL). */
export function registerGoveLogos(map: Record<string, string>) {
  Object.assign(sources, map);
}

const isHex = (c: string | undefined): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c);

/** Logotipo para o fundo dado: src (ou null, se o arquivo não foi registrado) e proporção. */
export function goveLogoFor(background: string | undefined): { src: string | null; aspect: number } {
  const bg = isHex(background) ? background : "#FFFFFF";
  const pick = pickLogo(bg, "logotipo");
  return { src: sources[pick.file] ?? null, aspect: LOGOS.logotipo.aspect };
}
