/**
 * Fontes corporativas BB embutidas como data URI (woff2), para o canvas e para
 * o HTML exportado renderizarem as fontes BB sem depender de servidor.
 * O "Alfabeto Especial" da logomarca nunca é usado.
 */
import titulosMedium from "../../../../brand/fonts/bb/BancoDoBrasilTitulos-Medium.woff2?inline";
import titulosBold from "../../../../brand/fonts/bb/BancoDoBrasilTitulos-Bold.woff2?inline";
import titulosXBold from "../../../../brand/fonts/bb/BancoDoBrasilTitulos-XBold.woff2?inline";
import textosRegular from "../../../../brand/fonts/bb/BancoDoBrasilTextos-Regular.woff2?inline";
import textosMedium from "../../../../brand/fonts/bb/BancoDoBrasilTextos-Medium.woff2?inline";
import textosBold from "../../../../brand/fonts/bb/BancoDoBrasilTextos-Bold.woff2?inline";
import { fontFaceCss } from "./bb";

/** Garante o tipo MIME correto mesmo se o bundler não souber o de .woff2. */
const woff2 = (uri: string) => uri.replace(/^data:[^;,]*/, "data:font/woff2");

export const BB_FONT_FACE_CSS = fontFaceCss({
  "BancoDoBrasilTitulos-Medium": woff2(titulosMedium),
  "BancoDoBrasilTitulos-Bold": woff2(titulosBold),
  "BancoDoBrasilTitulos-XBold": woff2(titulosXBold),
  "BancoDoBrasilTextos-Regular": woff2(textosRegular),
  "BancoDoBrasilTextos-Medium": woff2(textosMedium),
  "BancoDoBrasilTextos-Bold": woff2(textosBold),
});
