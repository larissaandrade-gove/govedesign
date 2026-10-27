/**
 * Controles da identidade Banco do Brasil no painel de propriedades:
 * seletor de identidade, esquemas BB, amostras só da paleta, cor de texto
 * automática (com a razão de contraste), logomarca e checagem BB.
 */
import { Warning, CheckCircle, MagicWand } from "@phosphor-icons/react";
import {
  BB_LOGO_RULES,
  BB_PALETTE,
  BB_SCHEMES,
  BB_VOICE,
  LOGO_VERSIONS,
  allowedText,
  bbName,
  contrast,
  defaultLogo,
  fmtRatio,
  hex6,
  minRatio,
  type BBContext,
  type BBScheme,
} from "@/lib/gove/bb";
import type { AuditIssue } from "@/lib/gove/audit";
import type { BBLogo, Identity } from "@/lib/gove/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-bold tracking-wide uppercase">
      {children}
    </Label>
  );
}

/** "Identidade: GOVE | Banco do Brasil" — dois botões de 44px. */
export function IdentityToggle({
  value,
  onChange,
}: {
  value: Identity;
  onChange: (value: Identity) => void;
}) {
  const options: [Identity, string][] = [
    ["gove", "GOVE"],
    ["bb", "Banco do Brasil"],
  ];
  return (
    <div className="space-y-2">
      <FieldLabel>Identidade</FieldLabel>
      <div role="radiogroup" aria-label="Identidade" className="grid grid-cols-2 gap-2">
        {options.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => onChange(id)}
            className="min-h-11 rounded-xl border-2 px-3 text-sm font-bold transition-colors"
            style={{
              borderColor: value === id ? "var(--gove-primary)" : "var(--color-border)",
              backgroundColor: value === id ? "var(--color-secondary)" : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Amostra de cor com nome (44px). */
function Swatch({
  color,
  active,
  onClick,
  note,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
  note?: string;
}) {
  const name = bbName(color);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={note ? `${name}, ${note}` : name}
      title={note ? `${name} · ${note}` : name}
      className="flex min-h-11 items-center gap-2 rounded-lg border-2 p-1 pr-2 text-left text-xs"
      style={{ borderColor: active ? "var(--gove-primary)" : "var(--color-border)" }}
    >
      <span
        className="size-8 shrink-0 rounded-md border border-border"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="min-w-0 leading-tight">
        <span className="block font-semibold">{name}</span>
        {note ? <span className="block text-muted-foreground">{note}</span> : null}
      </span>
    </button>
  );
}

/** Cor só da paleta BB (ou de uma lista já filtrada, ex.: formas com 3:1). */
export function PaletteField({
  label,
  value,
  onChange,
  colors,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors?: string[] | undefined;
  hint?: string | undefined;
}) {
  const current = hex6(value);
  const list = colors ?? Object.values(BB_PALETTE);
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-2 gap-1.5">
        {list.map((c) => (
          <Swatch key={c} color={c} active={current === c} onClick={() => onChange(c)} />
        ))}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Cor de texto BB: só pares aprovados para o fundo efetivo, com a razão. */
export function TextColorField({
  label,
  value,
  ctx,
  onChange,
}: {
  label: string;
  value: string;
  ctx: BBContext;
  onChange: (v: string) => void;
}) {
  const allowed = allowedText(ctx);
  const ratio = minRatio(value, ctx);
  const ok = ratio >= 4.5 && allowed.includes(hex6(value) ?? "");
  const bgName = ctx.protected
    ? "caixa de proteção Azul escuro"
    : ctx.samples.length === 1
      ? bbName(ctx.samples[0]!)
      : "foto/degradê (pior caso)";
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <p
        className={`flex items-start gap-2 text-xs font-semibold ${ok ? "text-foreground" : "text-destructive"}`}
        role={ok ? undefined : "alert"}
      >
        {ok ? (
          <CheckCircle className="mt-0.5 size-4 shrink-0 text-[var(--gove-primary)]" aria-hidden />
        ) : (
          <Warning className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <span>
          {bbName(value)} sobre {bgName}: {fmtRatio(ratio)}:1{" "}
          {ok ? "(automática)" : "— abaixo de 4,5:1"}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {allowed.map((c) => (
          <Swatch
            key={c}
            color={c}
            active={hex6(value) === c}
            onClick={() => onChange(c)}
            note={`${fmtRatio(minRatio(c, ctx))}:1`}
          />
        ))}
      </div>
    </div>
  );
}

/** Fundo de seção/linha: só os 6 esquemas BB (linhas também podem herdar). */
export function SchemePicker({
  value,
  onPick,
  allowTransparent,
}: {
  value: string;
  onPick: (scheme: BBScheme | null) => void;
  allowTransparent?: boolean | undefined;
}) {
  const current = hex6(value);
  return (
    <div className="space-y-2">
      <FieldLabel>Esquema BB</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        {allowTransparent ? (
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-pressed={!current}
            className="min-h-11 rounded-lg border-2 border-dashed px-2 text-xs font-bold"
            style={{ borderColor: !current ? "var(--gove-primary)" : "var(--color-border)" }}
          >
            Herdar da seção
          </button>
        ) : null}
        {BB_SCHEMES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s)}
            aria-pressed={current === s.bg}
            aria-label={`Esquema ${s.label}`}
            title={`${s.label}: título ${bbName(s.title)} ${fmtRatio(contrast(s.title, s.bg))}:1`}
            className="overflow-hidden rounded-lg border-2 text-left"
            style={{
              borderColor: current === s.bg ? "var(--gove-primary)" : "var(--color-border)",
            }}
          >
            <span
              className="flex min-h-11 items-center justify-between gap-1 px-2"
              style={{ backgroundColor: s.bg, color: s.title }}
            >
              <span className="text-sm font-bold">Aa</span>
              <span
                className="rounded px-1.5 text-[11px] font-bold"
                style={{ backgroundColor: s.button, color: s.buttonText }}
              >
                Botão
              </span>
            </span>
            <span className="block px-2 py-1 text-[11px] leading-tight font-semibold">
              {s.label} · {fmtRatio(contrast(s.title, s.bg))}:1
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const FILE_INPUT =
  "block min-h-11 w-full text-sm text-muted-foreground file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-secondary file:px-4 file:text-sm file:font-semibold file:text-foreground";

/** Slot da logomarca BB: arquivo oficial, sem recolorir, só nos fundos permitidos. */
export function LogoSettings({
  logo,
  onChange,
}: {
  logo: BBLogo | undefined;
  onChange: (logo: BBLogo | undefined) => void;
}) {
  const value = logo ?? defaultLogo();
  const min = BB_LOGO_RULES.minDigitalPx[value.version] ?? 70;
  const set = (patch: Partial<BBLogo>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <FieldLabel htmlFor="bb-logo-file">Logomarca BB (arquivo oficial)</FieldLabel>
      <input
        id="bb-logo-file"
        type="file"
        accept="image/png,image/svg+xml,image/webp"
        className={FILE_INPUT}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const src = String(reader.result);
            const img = new Image();
            img.onload = () =>
              set({
                src,
                aspect: img.naturalHeight ? img.naturalWidth / img.naturalHeight : value.aspect,
              });
            img.onerror = () => set({ src });
            img.src = src;
          };
          reader.readAsDataURL(file);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Use só o arquivo oficial. A logomarca nunca é recolorida e ganha área de proteção de meia
        altura em volta.
      </p>
      {value.src ? (
        <>
          <div
            className="flex items-center justify-center rounded-lg border border-border p-3"
            style={{ backgroundColor: value.bg }}
          >
            <img src={value.src} alt="Banco do Brasil" className="max-h-16 max-w-full" />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="bb-logo-version">Versão</FieldLabel>
            <select
              id="bb-logo-version"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={value.version}
              onChange={(e) => {
                const version = e.target.value as BBLogo["version"];
                const vmin = BB_LOGO_RULES.minDigitalPx[version] ?? 70;
                set({ version, width: Math.max(vmin, value.width) });
              }}
            >
              {LOGO_VERSIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label} (mín. {BB_LOGO_RULES.minDigitalPx[v.value]}px)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="bb-logo-width">Largura ({value.width}px)</FieldLabel>
            <input
              id="bb-logo-width"
              type="range"
              min={min}
              max={Math.max(min * 3, 320)}
              step={1}
              value={Math.max(min, value.width)}
              onChange={(e) => set({ width: Number(e.target.value) })}
              className="h-11 w-full accent-[var(--gove-primary)]"
            />
          </div>
          <PaletteField
            label="Fundo da faixa"
            value={value.bg}
            colors={BB_LOGO_RULES.centralHorizontalBackgrounds}
            onChange={(bg) => set({ bg })}
          />
          <div className="space-y-2">
            <FieldLabel>Alinhamento</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["left", "Esquerda"],
                  ["center", "Centro"],
                ] as const
              ).map(([align, text]) => (
                <Button
                  key={align}
                  size="touch"
                  variant={value.align === align ? "default" : "outline"}
                  onClick={() => set({ align })}
                >
                  {text}
                </Button>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            size="touch"
            className="w-full"
            onClick={() => onChange(undefined)}
          >
            Remover logomarca
          </Button>
        </>
      ) : null}
    </div>
  );
}

/** Resumo da checagem BB com ajuste automático. */
export function BBStatus({ issues, onAutoFix }: { issues: AuditIssue[]; onAutoFix: () => void }) {
  if (!issues.length)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-semibold">
        <CheckCircle className="size-4 shrink-0 text-[var(--gove-primary)]" aria-hidden />
        Identidade BB ok: textos 4,5:1+ e só cores da paleta.
      </p>
    );
  return (
    <div
      role="alert"
      className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-destructive">
        <Warning className="size-4 shrink-0" aria-hidden />
        {issues.length} pendência(s) da identidade BB
      </p>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-destructive">
        {issues.map((issue) => (
          <li key={issue.id}>
            <strong>{issue.rule}:</strong> {issue.message}
          </li>
        ))}
      </ul>
      <Button variant="cta" size="touch" className="w-full" onClick={onAutoFix}>
        <MagicWand aria-hidden /> Corrigir automaticamente
      </Button>
    </div>
  );
}

/** Dicas do tom de voz BB (para os textos da página). */
export function VoiceTips() {
  return (
    <details className="rounded-xl bg-secondary text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold">
        Tom de voz BB
      </summary>
      <div className="space-y-2 px-3 pb-3 text-muted-foreground">
        <p className="font-semibold text-foreground">{BB_VOICE.traits.join(" · ")}</p>
        <ul className="list-disc space-y-1 pl-4">
          {BB_VOICE.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
