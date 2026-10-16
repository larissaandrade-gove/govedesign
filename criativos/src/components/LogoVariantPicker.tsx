import { Switch } from "@/components/ui/switch";
import { LOGO_VARIANTS, type LogoVariantId, type VariantStatus } from "@/lib/creative/logos";

/** Fundo de amostra em que cada versão aparece com contraste na prévia. */
const SWATCH: Record<LogoVariantId, string> = {
  cor: "#FFFFFF",
  roxo: "#F4F4F4",
  branco: "#20133D",
};

/**
 * Seletor das versões oficiais da logomarca (colorida, roxa, branca). Versões
 * sem contraste ≥ 4,5:1 no fundo atual ficam bloqueadas, com o motivo.
 */
export function LogoVariantPicker({
  idPrefix,
  enabled,
  statuses,
  onToggle,
  chosen,
}: {
  idPrefix: string;
  enabled: LogoVariantId[];
  statuses: VariantStatus[];
  onToggle: (id: LogoVariantId, on: boolean) => void;
  chosen?: LogoVariantId | undefined;
}) {
  return (
    <ul className="space-y-1">
      {LOGO_VARIANTS.map((v) => {
        const st = statuses.find((s) => s.id === v.id);
        const blocked = st?.status === "blocked";
        const id = `${idPrefix}-logo-${v.id}`;
        return (
          <li key={v.id} className="flex min-h-12 items-center gap-3">
            <span
              className="flex h-10 w-20 shrink-0 items-center justify-center rounded-lg border border-border"
              style={{ background: SWATCH[v.id] }}
              aria-hidden="true"
            >
              <img src={v.urls.logotipo} alt="" className="h-5 w-auto" />
            </span>
            <label
              htmlFor={id}
              className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center"
            >
              <span className="text-sm text-foreground">
                {v.label}
                {chosen === v.id && (
                  <span className="ml-2 text-xs font-semibold text-primary">em uso</span>
                )}
              </span>
              {st && (
                <span className={`text-xs ${blocked ? "text-amber-700" : "text-muted-foreground"}`}>
                  {st.note}
                </span>
              )}
            </label>
            <Switch
              id={id}
              checked={!blocked && enabled.includes(v.id)}
              disabled={blocked}
              onCheckedChange={(on) => onToggle(v.id, on)}
            />
          </li>
        );
      })}
    </ul>
  );
}
