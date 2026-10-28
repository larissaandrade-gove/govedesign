import logoRoxo from "@/assets/logos/gove-logo-roxo.webp";
import logoBrancoAmarelo from "@/assets/logos/gove-logo-branco-amarelo.webp";

/**
 * Logomarca oficial da Gove (brand/logos): roxa no tema claro, branca com
 * amarelo no escuro — as versões com contraste ≥ 4,5:1 sobre cada fundo.
 */
export function GoveMark({ size = "sm" }: { size?: "sm" | "md" }) {
  const h = size === "md" ? "h-8" : "h-6";
  return (
    <span className="inline-flex items-center" role="img" aria-label="Gove">
      <img src={logoRoxo} alt="" className={`${h} w-auto dark:hidden`} />
      <img src={logoBrancoAmarelo} alt="" className={`${h} hidden w-auto dark:block`} />
    </span>
  );
}
