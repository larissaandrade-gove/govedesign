/**
 * Logotipos oficiais da GOVE como data URL (?inline), para o cabeçalho e o
 * rodapé do canvas e do HTML exportado (sem depender de rede). No build do
 * artefato, o plugin de brand/logos já devolve versões reduzidas.
 *
 * Exporta o mapa (em vez de registrar como efeito colateral): o pacote tem
 * "sideEffects": false e um import só de efeito sairia do bundle.
 */
import logoCor from "../../../../brand/logos/gove-logo-cor.webp?inline";
import logoRoxo from "../../../../brand/logos/gove-logo-roxo.webp?inline";
import logoBranco from "../../../../brand/logos/gove-logo-branco.webp?inline";
import logoBrancoAmarelo from "../../../../brand/logos/gove-logo-branco-amarelo.webp?inline";

export const GOVE_LOGO_SOURCES: Record<string, string> = {
  "gove-logo-cor.webp": logoCor,
  "gove-logo-roxo.webp": logoRoxo,
  "gove-logo-branco.webp": logoBranco,
  "gove-logo-branco-amarelo.webp": logoBrancoAmarelo,
};
