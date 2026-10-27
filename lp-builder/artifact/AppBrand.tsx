/**
 * Substitui src/components/gove/AppBrand.tsx no build do artefato: logomarca
 * oficial da Gove + nome do app em texto. A versão da logo vem da regra de
 * contraste de brand/logos.js sobre o fundo real do cabeçalho (bg-card) em
 * cada tema, e troca quando o tema muda.
 */
import { kindForBox, pickLogo } from "../../brand/logos.js";
import simboloCor from "../../brand/logos/gove-simbolo-cor.png";
import simboloRoxo from "../../brand/logos/gove-simbolo-roxo.png";
import simboloBranco from "../../brand/logos/gove-simbolo-branco.png";
import logoCor from "../../brand/logos/gove-logo-cor.webp";
import logoRoxo from "../../brand/logos/gove-logo-roxo.webp";
import logoBranco from "../../brand/logos/gove-logo-branco.webp";
import logoBrancoAmarelo from "../../brand/logos/gove-logo-branco-amarelo.webp";
import { isEmbedded } from "@gove/runtime";
import { useTheme } from "./theme";

const FILES: Record<string, string> = {
  "gove-simbolo-cor.png": simboloCor,
  "gove-simbolo-roxo.png": simboloRoxo,
  "gove-simbolo-branco.png": simboloBranco,
  "gove-logo-cor.webp": logoCor,
  "gove-logo-roxo.webp": logoRoxo,
  "gove-logo-branco.webp": logoBranco,
  "gove-logo-branco-amarelo.webp": logoBrancoAmarelo,
};

/** Fundo do cabeçalho (--card em artifact/app.css). */
const HEADER_BG = { light: "#FFFFFF", dark: "#20133D" } as const;

export function AppBrand() {
  const theme = useTheme();
  const height = 26;
  // No Design System a marca já está no cabeçalho dele.
  if (isEmbedded()) return null;
  const pick = pickLogo(HEADER_BG[theme], kindForBox(82, height)) as { file: string; aspect: number };
  return (
    <div className="flex min-h-11 items-center gap-3">
      <img
        src={FILES[pick.file]}
        alt="Gove"
        data-logo={pick.file}
        height={height}
        width={Math.round(height * pick.aspect)}
        className="block shrink-0"
        style={{ height, width: "auto" }}
      />
      <span className="text-lg font-semibold text-muted-foreground">LP Builder</span>
    </div>
  );
}
