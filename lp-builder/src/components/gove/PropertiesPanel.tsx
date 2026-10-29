import { useEffect, useState } from "react";
import { Warning, ArrowDown, ArrowUp, Trash, ArrowLineDown, CaretDown, Plus } from "@phosphor-icons/react";
import {
  END_ANCHOR,
  TARGET_END,
  TARGET_FORM,
  formSection,
  resolveButtonLink,
  sectionAnchor,
  sectionLabel,
} from "@/lib/gove/anchors";
import { IconPicker } from "./IconPicker";
import { PexelsSearch, creditFor } from "./PexelsSearch";
import { checkContrast } from "@/lib/gove/contrast";
import { BUTTON_VARIANTS } from "@/lib/gove/buttonStyle";
import { BG_ANIMATIONS, BUTTON_ANIMATIONS } from "@/lib/gove/animations";
import { ASPECTS } from "@/lib/gove/video";
import { COUNTDOWN_MODES } from "@/lib/gove/countdown";
import { gradientCss, normalizeBox } from "@/lib/gove/background";
import { CURSOR_PRESETS, normalizeCursor } from "@/lib/gove/cursor";
import {
  BRAND_SWATCHES,
  GRADIENT_PRESETS,
  RADIUS_MAX,
  RADIUS_MIN,
  SPACING_STEPS,
  TYPE_PRESETS,
  TYPE_SCALE,
  type Align,
  type AnyNode,
  type NavLink,
  type RdFieldStyle,
  type RdFormBlock,
  type TimelineItem,
  type BoxDecor,
  type BoxProps,
  type BlockStyle,
  type ButtonBlock,
  type ContentWidth,
  type DeviceHide,
  type HoverEffect,
  type Leaf,
  type SectionBlock,
  type Shadow,
  type TextBlock,
  type Glow,
  type GlowPosition,
  type PageContent,
  type PageCursor,
  type PageLayout,
  type RowBlock,
} from "@/lib/gove/types";
import {
  CONTENT_WIDTHS,
  DEFAULT_CONTENT_WIDTH,
  DEFAULT_GUTTER_MOBILE,
  GLOW_POSITIONS,
  GLOW_SIZES,
  GUTTER_STEPS,
  MAX_GLOWS,
  RATIO_PRESETS,
  ROW_MAX_WIDTHS,
  hasDecor,
  rowRatios,
} from "@/lib/gove/styleRules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaletteField, SchemePicker, TextColorField } from "./BBControls";
import { useBBMode } from "@/lib/gove/bbMode";
import { isNewBlock, type NewBlock } from "@/lib/gove/blockColors";
import { initialsOf } from "@/lib/gove/blocks";
import { FORM_CARD_STYLE, defaultRdFields } from "@/lib/gove/factories";
import {
  BLOCK_MAX_WIDTHS,
  BUTTON_SIZES,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_TRANSITION,
  HOVER_EFFECTS,
  LETTER_SPACINGS,
  LINE_HEIGHTS,
  TRANSITION_SPEEDS,
  highlightColors,
  hoverColor,
  mobilePaddingY,
} from "@/lib/gove/blockStyle";
import {
  BB_FONTS,
  BB_PALETTE,
  graphicColors,
  hex6,
  leafTextContext,
  textContext,
  type BBContext,
  type BBScheme,
} from "@/lib/gove/bb";

interface Props {
  node: AnyNode | null;
  background: string;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onColumns: (count: number) => void;
  /** Mover sem arrastar (toque e teclado); ausente = já está na ponta. */
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
  cursor?: PageCursor | undefined;
  onCursorChange?: ((patch: Partial<PageCursor>) => void) | undefined;
  /** Identidade BB: fundo efetivo do contêiner do bloco selecionado. */
  bbContainer?: BBContext | undefined;
  /** Identidade BB: aplica um esquema à seção/linha (e recolore os blocos). */
  onApplyScheme?: ((scheme: BBScheme | null) => void) | undefined;
  /** Configurações da página (mostradas quando nada está selecionado). */
  pageSettings?: React.ReactNode;
  /** Página inteira (destinos dos botões "Ir para seção"). */
  page?: PageContent | undefined;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold tracking-wide uppercase">{label}</Label>
      {children}
    </div>
  );
}

const SELECT = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

const FILE_INPUT =
  "block min-h-11 w-full text-sm text-muted-foreground file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-secondary file:px-4 file:text-sm file:font-semibold file:text-foreground";

/** Envio de imagem do dispositivo (vira data URL embutida no HTML exportado). */
function ImageUpload({ onLoad }: { onLoad: (dataUrl: string) => void }) {
  return (
    <input
      type="file"
      accept="image/*"
      className={FILE_INPUT}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onLoad(String(reader.result));
        reader.readAsDataURL(file);
      }}
    />
  );
}

function ColorField({
  label,
  value,
  onChange,
  warning,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  warning?: string | null;
}) {
  const bb = useBBMode();
  // Identidade BB: só as 12 cores da paleta, sem seletor livre.
  if (bb) return <PaletteField label={label} value={value} onChange={onChange} />;
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {BRAND_SWATCHES.map(({ hex, nome }) => (
          <button
            key={hex}
            type="button"
            title={`${nome} (${hex})`}
            aria-label={`Usar cor ${nome} (${hex})`}
            aria-pressed={value.toUpperCase() === hex}
            onClick={() => onChange(hex)}
            className="size-11 rounded-lg border border-border"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} — seletor`}
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-12 shrink-0 rounded-lg border border-border"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} hex`} />
      </div>
      {warning ? (
        <p role="alert" className="flex items-start gap-2 text-xs font-semibold text-destructive">
          <Warning className="mt-0.5 size-4 shrink-0" aria-hidden />
          {warning}
        </p>
      ) : null}
    </Field>
  );
}

function StepSelect({
  label,
  value,
  steps,
  suffix = "px",
  onChange,
}: {
  label: string;
  value: number;
  steps: number[];
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <select
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {steps.map((step) => (
          <option key={step} value={step}>
            {step}
            {suffix}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Arredondamento livre de 0 a 100px (slider + valor numérico). */
function RadiusField({
  label = "Arredondamento",
  value,
  onChange,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Number.isFinite(v) ? Math.round(v) : 0));
  return (
    <Field label={`${label} (${clamp(value)}px)`}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={RADIUS_MIN}
          max={RADIUS_MAX}
          step={1}
          value={clamp(value)}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          aria-label={`${label} em px`}
          className="h-11 w-full accent-[var(--gove-primary)]"
        />
        <Input
          type="number"
          min={RADIUS_MIN}
          max={RADIUS_MAX}
          value={clamp(value)}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          aria-label={`${label} — valor em px`}
          className="w-20"
        />
      </div>
    </Field>
  );
}

function BoxEditor({
  box: raw,
  onChange,
  onScheme,
  allowTransparent = false,
  protectedText = false,
}: {
  box: BoxProps;
  onChange: (patch: Partial<BoxProps>) => void;
  onScheme?: ((scheme: BBScheme | null) => void) | undefined;
  allowTransparent?: boolean;
  protectedText?: boolean;
}) {
  const box = normalizeBox(raw);
  const bb = useBBMode();
  // Identidade BB: sem degradê (as cores intermediárias saem da paleta).
  const fills = bb
    ? ([
        ["solid", "Cor sólida"],
        ["image", "Imagem"],
      ] as const)
    : ([
        ["solid", "Cor sólida"],
        ["gradient", "Degradê"],
        ["image", "Imagem"],
      ] as const);
  return (
    <>
      <Field label="Preenchimento do fundo">
        <div className={`grid gap-2 ${bb ? "grid-cols-2" : "grid-cols-3"}`}>
          {fills.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={box.fill === value}
              onClick={() => onChange({ fill: value })}
              className="min-h-11 rounded-lg border-2 px-2 py-2 text-xs font-bold"
              style={{
                borderColor: box.fill === value ? "var(--gove-primary)" : "var(--color-border)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {bb && onScheme ? (
        <SchemePicker value={box.bgColor} onPick={onScheme} allowTransparent={allowTransparent} />
      ) : (
        <ColorField label="Cor de fundo" value={box.bgColor} onChange={(v) => onChange({ bgColor: v })} />
      )}

      {bb && box.fill === "image" ? (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs">
          {protectedText
            ? "Textos sobre a foto ganham caixa de proteção Azul escuro + Branco (8,94:1). Para tirar a caixa, use sobreposição Azul escuro de 80% ou mais."
            : "A sobreposição garante 4,5:1 para os textos sobre a foto."}
        </p>
      ) : null}

      {!bb && box.fill === "gradient" ? (
        <>
          <Field label="Degradês da marca">
            <div className="grid grid-cols-2 gap-2">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      gradientFrom: preset.from,
                      gradientVia: preset.via,
                      gradientTo: preset.to,
                      gradientAngle: preset.angle,
                    })
                  }
                  className="overflow-hidden rounded-md border border-border text-left"
                  aria-label={`Aplicar ${preset.nome}`}
                >
                  <span
                    className="block h-10 w-full"
                    style={{
                      backgroundImage: `linear-gradient(${preset.angle}deg, ${[preset.from, preset.via, preset.to].filter(Boolean).join(", ")})`,
                    }}
                  />
                  <span className="block px-2 py-1 text-xs font-semibold">{preset.nome}</span>
                </button>
              ))}
            </div>
          </Field>
          <ColorField label="Degradê — cor inicial" value={box.gradientFrom} onChange={(v) => onChange({ gradientFrom: v })} />
          <ColorField label="Degradê — cor intermediária" value={box.gradientVia} onChange={(v) => onChange({ gradientVia: v })} />
          <ColorField label="Degradê — cor final" value={box.gradientTo} onChange={(v) => onChange({ gradientTo: v })} />
          <Field label={`Ângulo do degradê: ${box.gradientAngle}°`}>
            <input
              type="range"
              min={0}
              max={360}
              step={15}
              value={box.gradientAngle}
              onChange={(e) => onChange({ gradientAngle: Number(e.target.value) })}
              className="w-full"
              aria-label="Ângulo do degradê"
            />
          </Field>
          <div
            className="h-12 rounded-md border border-border"
            style={{ backgroundImage: gradientCss(box) }}
            aria-hidden
          />
        </>
      ) : null}

      {box.fill === "image" ? (
        <>
          <Field label="Imagem de fundo (URL)">
            <Input
              value={box.bgImage}
              onChange={(e) => onChange({ bgImage: e.target.value, bgCredit: null })}
              placeholder="https://…"
            />
          </Field>
          <PexelsSearch
            orientation="landscape"
            credit={box.bgImage ? box.bgCredit : null}
            onPick={(photo) => onChange({ bgImage: photo.src.large, bgCredit: creditFor(photo) })}
          />
          <Field label="Upload">
            <ImageUpload onLoad={(bgImage) => onChange({ bgImage, bgCredit: null })} />
          </Field>
          <Field label="Ajuste da imagem">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={box.bgSize}
              onChange={(e) => onChange({ bgSize: e.target.value as BoxProps["bgSize"] })}
            >
              <option value="cover">Preencher (cover)</option>
              <option value="contain">Conter (contain)</option>
              <option value="auto">Tamanho original</option>
            </select>
          </Field>
          <Field label="Posição da imagem">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={box.bgPosition}
              onChange={(e) => onChange({ bgPosition: e.target.value as BoxProps["bgPosition"] })}
            >
              <option value="center">Centro</option>
              <option value="top">Topo</option>
              <option value="bottom">Base</option>
              <option value="left">Esquerda</option>
              <option value="right">Direita</option>
            </select>
          </Field>
          <Field label="Repetição">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={box.bgRepeat}
                onChange={(e) => onChange({ bgRepeat: e.target.checked })}
              />
              Repetir imagem (padrão/textura)
            </label>
          </Field>
        </>
      ) : null}

      <ColorField label="Sobreposição de cor" value={box.overlayColor} onChange={(v) => onChange({ overlayColor: v })} />
      <Field label={`Opacidade da sobreposição: ${box.overlay}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={box.overlay}
          onChange={(e) => onChange({ overlay: Number(e.target.value) })}
          className="w-full"
          aria-label="Opacidade da sobreposição"
        />
      </Field>

      <ColorField label="Cor da borda" value={box.borderColor} onChange={(v) => onChange({ borderColor: v })} />
      <StepSelect label="Espessura da borda" value={box.borderWidth} steps={[0, 1, 2, 3, 4]} onChange={(v) => onChange({ borderWidth: v })} />
      <RadiusField value={box.radius} onChange={(v) => onChange({ radius: v })} />
      <Field label="Sombra">
        <select
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={box.shadow}
          onChange={(e) => onChange({ shadow: e.target.value as BoxProps["shadow"] })}
        >
          <option value="none">Nenhuma</option>
          <option value="sm">Leve</option>
          <option value="md">Média</option>
          <option value="lg">Grande</option>
        </select>
      </Field>
      <StepSelect label="Padding vertical" value={box.paddingY} steps={SPACING_STEPS} onChange={(v) => onChange({ paddingY: v })} />
      <StepSelect label="Padding horizontal" value={box.paddingX} steps={SPACING_STEPS} onChange={(v) => onChange({ paddingX: v })} />
      <Field label="Animação do fundo">
        <select
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={box.animation ?? "none"}
          onChange={(e) => onChange({ animation: e.target.value as NonNullable<BoxProps["animation"]> })}
        >
          {BG_ANIMATIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Animações suaves e com respeito a “reduzir movimento” do sistema.
        </p>
      </Field>
    </>
  );
}

/** Patch em que `undefined` remove a opção (volta ao padrão). */
type Patch<T> = { [K in keyof T]?: T[K] | undefined };

/** Aplica o patch e apaga as chaves `undefined` (o documento salvo fica limpo). */
function withPatch<T extends object>(base: T, patch: Patch<T>): T {
  const next = { ...base, ...patch } as Record<string, unknown>;
  for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
  return next as T;
}

/** Grupo recolhível do painel (divulgação progressiva). */
export function PanelGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-bold [&::-webkit-details-marker]:hidden">
        {title}
        <CaretDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 border-t border-border p-4">{children}</div>
    </details>
  );
}

/** Opções em botões (escolha única), no padrão do "Preenchimento do fundo". */
function ChoiceField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  columns = 3,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const cols = columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <Field label={label}>
      <div role="radiogroup" aria-label={label} className={`grid gap-2 ${cols}`}>
        {options.map(([v, text]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className="min-h-11 rounded-lg border-2 px-2 py-2 text-xs font-bold leading-tight"
            style={{ borderColor: value === v ? "var(--gove-primary)" : "var(--color-border)" }}
          >
            {text}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Slider com valor no rótulo. */
function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={`${label}: ${value}${suffix}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-[var(--gove-primary)]"
        aria-label={label}
      />
    </Field>
  );
}

/** Só as cores da paleta (sem seletor livre): decorações não criam cor nova. */
function SwatchField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const bb = useBBMode();
  if (bb) return <PaletteField label={label} value={value} onChange={onChange} />;
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {BRAND_SWATCHES.map(({ hex, nome }) => (
          <button
            key={hex}
            type="button"
            title={`${nome} (${hex})`}
            aria-label={`Usar cor ${nome} (${hex})`}
            aria-pressed={value.toUpperCase() === hex}
            onClick={() => onChange(hex)}
            className="size-11 rounded-lg border border-border"
            style={{
              backgroundColor: hex,
              outline: value.toUpperCase() === hex ? "3px solid var(--gove-primary)" : undefined,
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
    </Field>
  );
}

const MIN_HEIGHTS: readonly (readonly [string, string])[] = [
  ["0", "Livre"],
  ["320", "320px"],
  ["480", "480px"],
  ["640", "640px"],
  ["screen", "Tela inteira"],
];

/** Layout da caixa: altura mínima e (seção) conteúdo de ponta a ponta. */
function BoxLayoutFields({
  box,
  section,
  onChange,
}: {
  box: BoxProps;
  section: boolean;
  onChange: (patch: Patch<BoxProps>) => void;
}) {
  const current = box.minHeight === "screen" ? "screen" : String(box.minHeight ?? 0);
  return (
    <>
      <Field label="Altura mínima">
        <select
          className={SELECT}
          value={MIN_HEIGHTS.some(([v]) => v === current) ? current : "custom"}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ minHeight: v === "screen" ? "screen" : Number(v) || undefined });
          }}
        >
          {MIN_HEIGHTS.map(([v, text]) => (
            <option key={v} value={v}>
              {text}
            </option>
          ))}
          {!MIN_HEIGHTS.some(([v]) => v === current) ? <option value="custom">{current}px</option> : null}
        </select>
      </Field>
      {section ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!box.fullBleed}
            onChange={(e) => onChange({ fullBleed: e.target.checked || undefined })}
          />
          Conteúdo de ponta a ponta (sem largura máxima)
        </label>
      ) : null}
    </>
  );
}

/** Aparência nova da caixa: bordas por lado, vidro e camadas decorativas. */
function BoxAppearanceFields({ box, onChange }: { box: BoxProps; onChange: (patch: Patch<BoxProps>) => void }) {
  const bb = useBBMode();
  const decor = box.decor ?? {};
  const glows = decor.glows ?? [];
  const setDecor = (patch: Patch<BoxDecor>) => {
    const next = withPatch(decor, patch);
    const empty = !next.grid && !next.glows?.length;
    onChange({ decor: empty ? undefined : next });
  };
  const setGlow = (i: number, patch: Partial<Glow>) =>
    setDecor({ glows: glows.map((g, j) => (j === i ? { ...g, ...patch } : g)) });
  return (
    <>
      <ChoiceField
        label="Lados da borda"
        value={box.borderSides ?? "all"}
        columns={2}
        options={[
          ["all", "Todos"],
          ["block", "Em cima e embaixo"],
          ["left", "Só à esquerda"],
          ["none", "Nenhum"],
        ]}
        onChange={(v) => onChange({ borderSides: v === "all" ? undefined : v, borderWidth: v !== "none" && !box.borderWidth ? 1 : box.borderWidth })}
      />
      <ChoiceField
        label="Estilo da borda"
        value={box.borderStyle ?? "solid"}
        columns={2}
        options={[
          ["solid", "Sólida"],
          ["dashed", "Tracejada"],
        ]}
        onChange={(v) => onChange({ borderStyle: v === "solid" ? undefined : v })}
      />
      <RangeField
        label="Vidro — desfoque do fundo"
        value={box.glassBlur ?? 0}
        min={0}
        max={16}
        suffix="px"
        onChange={(v) => onChange({ glassBlur: v || undefined })}
      />
      <RangeField
        label="Opacidade do preenchimento"
        value={box.fillOpacity ?? 100}
        min={0}
        max={100}
        step={5}
        suffix="%"
        onChange={(v) => onChange({ fillOpacity: v >= 100 ? undefined : v })}
      />
      {bb && (box.fillOpacity ?? 100) < 100 ? (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs">
          Fundo translúcido: a checagem BB passa a considerar a mistura com o fundo de baixo.
        </p>
      ) : null}

      <h4 className="pt-2 text-xs font-bold tracking-wide uppercase">Decoração</h4>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={!!decor.grid} onChange={(e) => setDecor({ grid: e.target.checked || undefined })} />
        Grade de linhas (56px, com esmaecimento)
      </label>
      {decor.grid ? (
        <>
          <SwatchField label="Cor da grade" value={decor.gridColor ?? "#FFFFFF"} onChange={(v) => setDecor({ gridColor: v })} />
          <RangeField
            label="Opacidade da grade"
            value={decor.gridOpacity ?? 5}
            min={1}
            max={20}
            suffix="%"
            onChange={(v) => setDecor({ gridOpacity: v })}
          />
        </>
      ) : null}
      {glows.map((glow, i) => (
        <div key={i} className="space-y-4 rounded-lg bg-secondary/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Brilho {i + 1}</span>
            <Button
              variant="ghost"
              size="iconTouch"
              aria-label={`Remover brilho ${i + 1}`}
              title="Remover brilho"
              onClick={() => setDecor({ glows: glows.filter((_, j) => j !== i) })}
            >
              <Trash aria-hidden />
            </Button>
          </div>
          <SwatchField label="Cor do brilho" value={glow.color} onChange={(v) => setGlow(i, { color: v })} />
          <Field label="Posição">
            <select
              className={SELECT}
              value={glow.position}
              onChange={(e) => setGlow(i, { position: e.target.value as GlowPosition })}
            >
              {GLOW_POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <StepSelect label="Tamanho" value={glow.size} steps={GLOW_SIZES} onChange={(v) => setGlow(i, { size: v })} />
          <RangeField
            label="Intensidade"
            value={glow.intensity}
            min={0}
            max={100}
            step={2}
            suffix="%"
            onChange={(v) => setGlow(i, { intensity: v })}
          />
        </div>
      ))}
      {glows.length < MAX_GLOWS ? (
        <Button
          variant="outline"
          size="touch"
          className="w-full"
          onClick={() =>
            setDecor({
              glows: [
                ...glows,
                {
                  color: bb ? BB_PALETTE.amareloInstitucional : glows.length ? "#A278DA" : "#5AC2CD",
                  position: glows.length ? "top-right" : "top-left",
                  size: 900,
                  intensity: 28,
                },
              ],
            })
          }
        >
          <Plus aria-hidden />
          Adicionar brilho radial
        </Button>
      ) : null}
      {hasDecor(box) ? (
        <p className="text-xs text-muted-foreground">A decoração fica atrás do conteúdo e não vaza da caixa.</p>
      ) : null}
    </>
  );
}

const ratioLabel = (ratios: number[]) => ratios.map((r) => String(r)).join(" / ");

/** Layout da linha: proporção das colunas, espaços, alinhamentos e largura. */
function RowLayoutFields({
  row,
  onChange,
  onColumns,
}: {
  row: RowBlock;
  onChange: (patch: Record<string, unknown>) => void;
  onColumns: (count: number) => void;
}) {
  const count = row.columns.length;
  const ratios = rowRatios(row);
  const presets = RATIO_PRESETS.filter((p) => p.ratios.length === count);
  const active = presets.find((p) => p.ratios.every((r, i) => r === ratios[i]));
  const [draft, setDraft] = useState(ratioLabel(ratios));
  useEffect(() => setDraft(ratioLabel(rowRatios(row))), [row]);
  const applyCustom = () => {
    const list = draft
      .split(/[/:;\s]+/)
      .map((v) => Number(v.replace(",", ".")))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (list.length === count) onChange({ ratios: list.every((v) => v === list[0]) ? undefined : list });
    else setDraft(ratioLabel(ratios));
  };
  return (
    <>
      <StepSelect label="Colunas" value={count} steps={[1, 2, 3, 4]} suffix="" onChange={onColumns} />
      {count > 1 ? (
        <>
          <ChoiceField
            label="Proporção das colunas"
            value={active?.id ?? "custom"}
            columns={presets.length >= 3 ? 3 : 2}
            options={[...presets.map((p) => [p.id, p.label] as const), ["custom", "Outra"] as const]}
            onChange={(id) => {
              const preset = presets.find((p) => p.id === id);
              if (preset) onChange({ ratios: preset.ratios.every((r) => r === 1) ? undefined : preset.ratios });
            }}
          />
          <Field label="Proporção personalizada (fr)">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={applyCustom}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustom();
              }}
              placeholder={count === 2 ? "1.35 / 0.9" : "1 / 1 / 1"}
              aria-label="Proporção personalizada das colunas, em fr"
            />
            <p className="text-xs text-muted-foreground">Um número por coluna, separados por “/”. Ex.: 1.35 / 0.9.</p>
          </Field>
        </>
      ) : null}
      <StepSelect label="Espaço horizontal entre colunas" value={row.gap} steps={SPACING_STEPS} onChange={(v) => onChange({ gap: v })} />
      <Field label="Espaço vertical (colunas empilhadas)">
        <select
          className={SELECT}
          value={row.rowGap === undefined ? "same" : String(row.rowGap)}
          onChange={(e) => onChange({ rowGap: e.target.value === "same" ? undefined : Number(e.target.value) })}
        >
          <option value="same">Igual ao horizontal</option>
          {SPACING_STEPS.map((step) => (
            <option key={step} value={step}>
              {step}px
            </option>
          ))}
        </select>
      </Field>
      <Field label="Alinhamento vertical">
        <select className={SELECT} value={row.alignItems ?? "start"} onChange={(e) => onChange({ alignItems: e.target.value })}>
          <option value="start">Topo</option>
          <option value="center">Centro</option>
          <option value="end">Base</option>
          <option value="stretch">Esticar (mesma altura)</option>
        </select>
      </Field>
      <ChoiceField
        label="Alinhamento horizontal do conteúdo"
        value={row.justify ?? "start"}
        options={[
          ["start", "Esquerda"],
          ["center", "Centro"],
          ["end", "Direita"],
        ]}
        onChange={(v) => onChange({ justify: v === "start" ? undefined : v })}
      />
      <Field label="Largura máxima da linha">
        <select
          className={SELECT}
          value={String(row.maxWidth ?? "full")}
          onChange={(e) => onChange({ maxWidth: e.target.value === "full" ? undefined : Number(e.target.value) })}
        >
          {ROW_MAX_WIDTHS.map((w) => (
            <option key={w} value={String(w)}>
              {w === "full" ? "Total (largura do conteúdo)" : `${w}px`}
            </option>
          ))}
        </select>
      </Field>
      {row.maxWidth && row.maxWidth !== "full" ? (
        <ChoiceField
          label="Posição da linha"
          value={row.rowAlign ?? "center"}
          columns={2}
          options={[
            ["left", "À esquerda"],
            ["center", "Centralizada"],
          ]}
          onChange={(v) => onChange({ rowAlign: v === "center" ? undefined : v })}
        />
      ) : null}
    </>
  );
}

/** Linha no tablet (até 980px) e no celular (até 640px). */
function RowResponsiveFields({ row, onChange }: { row: RowBlock; onChange: (patch: Record<string, unknown>) => void }) {
  const mode = row.responsive ?? "stack";
  return (
    <>
      <Field label="Colunas no tablet e no celular">
        <select
          className={SELECT}
          value={mode}
          onChange={(e) => onChange({ responsive: e.target.value === "stack" ? undefined : e.target.value })}
        >
          <option value="stack">Empilhar tudo (tablet e celular)</option>
          <option value="tablet2">2 colunas no tablet, empilhar no celular</option>
          <option value="keep">Manter as colunas</option>
        </select>
      </Field>
      {mode !== "keep" ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!row.stackReverse}
            onChange={(e) => onChange({ stackReverse: e.target.checked || undefined })}
          />
          Inverter a ordem ao empilhar
        </label>
      ) : null}
      <p className="text-xs text-muted-foreground">Confira no canvas com os modos Tablet e Celular.</p>
    </>
  );
}

/* ------------------------------------------------- aparência de qualquer bloco */

/** Grava o patch no `blockStyle` do bloco (vazio = sem a chave). */
function useBlockStyle(leaf: Leaf, onChange: (patch: Record<string, unknown>) => void) {
  const bs = leaf.blockStyle ?? {};
  const set = (patch: Patch<BlockStyle>) => {
    const next = withPatch(bs, patch);
    onChange({ blockStyle: Object.keys(next).length ? next : undefined });
  };
  return [bs, set] as const;
}

const MARGIN_STEPS = SPACING_STEPS.filter((s) => s <= 96);

/** Espaços, largura, preenchimento, raio, bordas, sombra, vidro e opacidade do bloco. */
function BlockAppearanceFields({ leaf, onChange }: { leaf: Leaf; onChange: (patch: Record<string, unknown>) => void }) {
  const bb = useBBMode();
  const [bs, set] = useBlockStyle(leaf, onChange);
  // Card e botão têm fundo, borda, raio e sombra próprios (nos campos do bloco).
  const own = leaf.type === "card";
  const box = leaf.type !== "button" && !own;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StepSelect label="Espaço antes" value={bs.marginTop ?? 0} steps={MARGIN_STEPS} onChange={(v) => set({ marginTop: v || undefined })} />
        <StepSelect
          label="Espaço depois"
          value={bs.marginBottom ?? 16}
          steps={MARGIN_STEPS}
          onChange={(v) => set({ marginBottom: v === 16 ? undefined : v })}
        />
      </div>
      <Field label="Largura máxima">
        <select
          className={SELECT}
          value={String(bs.maxWidth ?? "")}
          onChange={(e) => set({ maxWidth: Number(e.target.value) || undefined })}
        >
          <option value="">Sem limite</option>
          {BLOCK_MAX_WIDTHS.map((w) => (
            <option key={w} value={String(w)}>
              {w}px
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">A posição segue o alinhamento do bloco.</p>
      </Field>
      {box ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StepSelect label="Preenchimento vertical" value={bs.paddingY ?? 0} steps={SPACING_STEPS} onChange={(v) => set({ paddingY: v || undefined })} />
            <StepSelect label="Preenchimento lateral" value={bs.paddingX ?? 0} steps={SPACING_STEPS} onChange={(v) => set({ paddingX: v || undefined })} />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!bs.bgColor}
              onChange={(e) =>
                set(
                  e.target.checked
                    ? { bgColor: bb ? BB_PALETTE.branco : "#FFFFFF" }
                    : { bgColor: undefined, fillOpacity: undefined, glassBlur: undefined },
                )
              }
            />
            Fundo próprio
          </label>
          {bs.bgColor ? <SwatchField label="Cor do fundo" value={bs.bgColor} onChange={(v) => set({ bgColor: v })} /> : null}
          <RadiusField value={bs.radius ?? 0} onChange={(v) => set({ radius: v || undefined })} />
          <StepSelect
            label="Espessura da borda"
            value={bs.borderWidth ?? 0}
            steps={[0, 1, 2, 3, 4]}
            onChange={(v) => set({ borderWidth: v || undefined, borderColor: v ? (bs.borderColor ?? (bb ? BB_PALETTE.azulEscuro : "#F4F4F4")) : undefined })}
          />
          {bs.borderWidth ? (
            <SwatchField label="Cor da borda" value={bs.borderColor ?? "#F4F4F4"} onChange={(v) => set({ borderColor: v })} />
          ) : null}
        </>
      ) : null}
      {(box && bs.borderWidth) || (own && leaf.type === "card" && leaf.borderWidth > 0) ? (
        <>
          <ChoiceField
            label="Lados da borda"
            value={bs.borderSides ?? "all"}
            columns={2}
            options={[
              ["all", "Todos"],
              ["block", "Em cima e embaixo"],
              ["left", "Só à esquerda"],
              ["none", "Nenhum"],
            ]}
            onChange={(v) => set({ borderSides: v === "all" ? undefined : v })}
          />
          <ChoiceField
            label="Estilo da borda"
            value={bs.borderStyle ?? "solid"}
            columns={2}
            options={[
              ["solid", "Sólida"],
              ["dashed", "Tracejada"],
            ]}
            onChange={(v) => set({ borderStyle: v === "solid" ? undefined : v })}
          />
        </>
      ) : null}
      {box ? (
        <Field label="Sombra">
          <select className={SELECT} value={bs.shadow ?? "none"} onChange={(e) => set({ shadow: e.target.value === "none" ? undefined : (e.target.value as Shadow) })}>
            <option value="none">Nenhuma</option>
            <option value="sm">Leve</option>
            <option value="md">Média</option>
            <option value="lg">Grande</option>
          </select>
        </Field>
      ) : null}
      {(box && bs.bgColor) || own ? (
        <>
          <RangeField
            label="Vidro — desfoque do fundo"
            value={bs.glassBlur ?? 0}
            min={0}
            max={16}
            suffix="px"
            onChange={(v) => set({ glassBlur: v || undefined })}
          />
          <RangeField
            label="Opacidade do fundo"
            value={bs.fillOpacity ?? 100}
            min={0}
            max={100}
            step={5}
            suffix="%"
            onChange={(v) => set({ fillOpacity: v >= 100 ? undefined : v })}
          />
        </>
      ) : null}
      <RangeField
        label="Opacidade do bloco"
        value={bs.opacity ?? 100}
        min={10}
        max={100}
        step={5}
        suffix="%"
        onChange={(v) => set({ opacity: v >= 100 ? undefined : v })}
      />
    </>
  );
}

/** Efeitos: hover, velocidade da transição e clique. */
function BlockEffectsFields({ leaf, onChange }: { leaf: Leaf; onChange: (patch: Record<string, unknown>) => void }) {
  const [bs, set] = useBlockStyle(leaf, onChange);
  const hover = bs.hover ?? "none";
  return (
    <>
      <Field label="Ao passar o mouse">
        <select className={SELECT} value={hover} onChange={(e) => set({ hover: e.target.value === "none" ? undefined : (e.target.value as HoverEffect) })}>
          {HOVER_EFFECTS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
      </Field>
      {hover === "topBar" || hover === "borderHighlight" ? (
        <SwatchField
          label={hover === "topBar" ? "Cor da barra" : "Cor do destaque"}
          value={hoverColor(leaf)}
          onChange={(v) => set({ hoverColor: v })}
        />
      ) : null}
      {hover !== "none" || bs.press ? (
        <ChoiceField
          label="Velocidade da transição"
          value={bs.transition ?? DEFAULT_TRANSITION}
          options={TRANSITION_SPEEDS.map((t) => [t, `${String(t).replace(".", ",")}s`] as const)}
          onChange={(v) => set({ transition: v === DEFAULT_TRANSITION ? undefined : v })}
        />
      ) : null}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={!!bs.press} onChange={(e) => set({ press: e.target.checked || undefined })} />
        Afundar 1px ao clicar
      </label>
      <p className="text-xs text-muted-foreground">
        Quem pede menos movimento no sistema vê só a troca de sombra e de cor, sem deslocamento.
      </p>
    </>
  );
}

/** Ocultar em computador, tablet e/ou celular. */
function HideFields({ hide, onChange }: { hide: DeviceHide | undefined; onChange: (hide: DeviceHide | undefined) => void }) {
  const set = (key: keyof DeviceHide, on: boolean) => {
    const next = withPatch(hide ?? {}, { [key]: on || undefined });
    onChange(Object.keys(next).length ? next : undefined);
  };
  const options: [keyof DeviceHide, string][] = [
    ["desktop", "Ocultar no computador (acima de 980px)"],
    ["tablet", "Ocultar no tablet (641 a 980px)"],
    ["mobile", "Ocultar no celular (até 640px)"],
  ];
  return (
    <div className="space-y-1">
      {options.map(([key, label]) => (
        <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={!!hide?.[key]} onChange={(e) => set(key, e.target.checked)} />
          {label}
        </label>
      ))}
    </div>
  );
}

/** Seção no celular: espaçamento vertical e ocultar. */
function SectionResponsiveFields({ section, onChange }: { section: SectionBlock; onChange: (patch: Record<string, unknown>) => void }) {
  const box = normalizeBox(section.box);
  const value = box.paddingYMobile === undefined ? "same" : String(box.paddingYMobile);
  const auto = mobilePaddingY({ paddingY: box.paddingY, paddingYMobile: "auto" });
  return (
    <>
      <Field label="Espaçamento vertical no celular">
        <select
          className={SELECT}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ box: withPatch(box, { paddingYMobile: v === "same" ? undefined : v === "auto" ? "auto" : Number(v) }) });
          }}
        >
          <option value="same">Igual ao computador ({box.paddingY}px)</option>
          <option value="auto">Automático: 72% ({auto}px)</option>
          {SPACING_STEPS.map((step) => (
            <option key={step} value={String(step)}>
              {step}px
            </option>
          ))}
        </select>
      </Field>
      <HideFields hide={section.hide} onChange={(hide) => onChange({ hide })} />
    </>
  );
}

/** Texto: caixa alta, espaçamento entre letras, altura de linha, tamanho responsivo e destaque. */
function TypographyFields({
  node,
  onChange,
  bbCtx,
}: {
  node: TextBlock;
  onChange: (patch: Record<string, unknown>) => void;
  bbCtx: BBContext | null;
}) {
  const fluid = !!node.sizeMin && node.sizeMin < node.size;
  const marked = node.content.includes("==");
  const hl = highlightColors(node);
  return (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={!!node.uppercase} onChange={(e) => onChange({ uppercase: e.target.checked || undefined })} />
        Caixa alta
      </label>
      <Field label="Espaçamento entre letras">
        <select
          className={SELECT}
          value={String(node.letterSpacing ?? 0)}
          onChange={(e) => onChange({ letterSpacing: Number(e.target.value) || undefined })}
        >
          {LETTER_SPACINGS.map((v) => (
            <option key={v} value={String(v)}>
              {v === 0 ? "Normal" : `${String(v).replace(".", ",")}em`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Altura de linha">
        <select
          className={SELECT}
          value={String(node.lineHeight ?? DEFAULT_LINE_HEIGHT)}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({ lineHeight: v === DEFAULT_LINE_HEIGHT ? undefined : v });
          }}
        >
          {LINE_HEIGHTS.map((v) => (
            <option key={v} value={String(v)}>
              {String(v).replace(".", ",")}
              {v === DEFAULT_LINE_HEIGHT ? " (padrão)" : ""}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={fluid}
          onChange={(e) =>
            onChange({ sizeMin: e.target.checked ? Math.max(16, Math.min(node.size - 1, Math.round(node.size * 0.6))) : undefined })
          }
        />
        Tamanho responsivo (menor no celular)
      </label>
      {fluid ? (
        <Field label={`Tamanho mínimo (o máximo é ${node.size}px)`}>
          <Input
            type="number"
            min={8}
            max={node.size}
            value={node.sizeMin}
            onChange={(e) => onChange({ sizeMin: Number(e.target.value) || undefined })}
            aria-label="Tamanho mínimo em px"
          />
          <p className="text-xs text-muted-foreground">
            O tamanho acompanha a largura da tela: {node.sizeMin}px no celular, {node.size}px a partir de 1200px.
          </p>
        </Field>
      ) : null}
      {marked || node.highlightFrom ? (
        bbCtx ? (
          <TextColorField
            label="Cor do destaque (==texto==)"
            value={hl.from}
            ctx={bbCtx}
            onChange={(v) => onChange({ highlightFrom: v, highlightTo: v })}
          />
        ) : (
          <>
            <SwatchField label="Destaque: cor inicial do degradê" value={hl.from} onChange={(v) => onChange({ highlightFrom: v })} />
            <SwatchField label="Destaque: cor final do degradê" value={hl.to} onChange={(v) => onChange({ highlightTo: v })} />
          </>
        )
      ) : null}
    </>
  );
}

/** Botão: tamanho, largura total, ícone e quebra de linha. */
function ButtonExtraFields({ node, onChange }: { node: ButtonBlock; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <>
      <ChoiceField
        label="Tamanho"
        value={node.btnSize ?? "lg"}
        options={BUTTON_SIZES.map((b) => [b.value, `${b.label} (${b.padding.replace(/px/g, "").replace(" ", "×")})`] as const)}
        onChange={(v) => onChange({ btnSize: v === "lg" ? undefined : v })}
      />
      <ChoiceField
        label="Largura total"
        value={node.fullWidth ?? "never"}
        options={[
          ["never", "Nunca"],
          ["always", "Sempre"],
          ["mobile", "Só no celular"],
        ]}
        onChange={(v) => onChange({ fullWidth: v === "never" ? undefined : v })}
      />
      <Field label="Ícone">
        {node.icon ? (
          <>
            <IconPicker value={node.icon} onChange={(icon) => onChange({ icon })} />
            <ChoiceField
              label="Posição do ícone"
              value={node.iconPos ?? "left"}
              columns={2}
              options={[
                ["left", "À esquerda"],
                ["right", "À direita"],
              ]}
              onChange={(v) => onChange({ iconPos: v === "left" ? undefined : v })}
            />
            <Button variant="outline" size="touch" className="w-full" onClick={() => onChange({ icon: undefined, iconPos: undefined })}>
              Remover ícone
            </Button>
          </>
        ) : (
          <Button variant="outline" size="touch" className="w-full" onClick={() => onChange({ icon: "ArrowRight" })}>
            <Plus aria-hidden />
            Adicionar ícone
          </Button>
        )}
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={!!node.nowrap} onChange={(e) => onChange({ nowrap: e.target.checked || undefined })} />
        Sem quebra de linha no texto
      </label>
    </>
  );
}

/** Layout da página: largura do conteúdo, margens laterais e rolagem até as âncoras. */
/* ----------------------------------------------------------- blocos novos */

/** Um item por linha (lista, etiquetas, subitens). */
function LinesField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  hint?: string;
}) {
  return (
    <Field label={label}>
      <Textarea
        rows={Math.min(8, Math.max(3, value.length + 1))}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        onBlur={(e) => onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
      />
      <p className="text-xs text-muted-foreground">{hint ?? "Um item por linha."}</p>
    </Field>
  );
}

type RecordField<T> = { key: keyof T & string; label: string; multiline?: boolean };

/** Lista de registros (linhas de informação, estatísticas, perguntas, itens do cronograma). */
function RecordsField<T extends object>({
  label,
  items,
  fields,
  make,
  onChange,
  itemLabel,
  extra,
}: {
  label: string;
  items: T[];
  fields: RecordField<T>[];
  make: () => T;
  onChange: (items: T[]) => void;
  itemLabel: string;
  extra?: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const set = (i: number, patch: Partial<T>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <Field label={label}>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {itemLabel} {i + 1}
              </span>
              <div className="flex shrink-0">
                <Button variant="ghost" size="iconTouch" aria-label={`Subir ${itemLabel} ${i + 1}`} title="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button variant="ghost" size="iconTouch" aria-label={`Descer ${itemLabel} ${i + 1}`} title="Descer" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="iconTouch"
                  aria-label={`Remover ${itemLabel} ${i + 1}`}
                  title="Remover"
                  className="hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                >
                  <Trash aria-hidden />
                </Button>
              </div>
            </div>
            {fields.map((f) =>
              f.multiline ? (
                <Textarea
                  key={f.key}
                  rows={2}
                  aria-label={`${f.label} (${itemLabel} ${i + 1})`}
                  placeholder={f.label}
                  value={String(item[f.key] ?? "")}
                  onChange={(e) => set(i, { [f.key]: e.target.value } as Partial<T>)}
                />
              ) : (
                <Input
                  key={f.key}
                  aria-label={`${f.label} (${itemLabel} ${i + 1})`}
                  placeholder={f.label}
                  value={String(item[f.key] ?? "")}
                  onChange={(e) => set(i, { [f.key]: e.target.value } as Partial<T>)}
                />
              ),
            )}
            {extra ? extra(item, (patch) => set(i, patch)) : null}
          </div>
        ))}
        <Button variant="outline" size="touch" className="w-full" onClick={() => onChange([...items, make()])}>
          <Plus aria-hidden />
          Adicionar {itemLabel.toLowerCase()}
        </Button>
      </div>
    </Field>
  );
}

/** Destinos de link: seções da página (pelas âncoras), formulário ou final. */
function TargetSelect({
  label,
  value,
  page,
  onChange,
}: {
  label: string;
  value: string;
  page: PageContent | undefined;
  onChange: (v: string) => void;
}) {
  const sections = page?.sections.filter((s) => s.role !== "header") ?? [];
  const exists = value === TARGET_FORM || value === TARGET_END || sections.some((s) => s.id === value);
  return (
    <select aria-label={label} className={SELECT} value={exists ? value : ""} onChange={(e) => onChange(e.target.value)}>
      {!exists ? (
        <option value="" disabled>
          Seção excluída — escolha outra
        </option>
      ) : null}
      <option value={TARGET_FORM}>Formulário de inscrição</option>
      {page
        ? sections.map((section) => (
            <option key={section.id} value={section.id}>
              {sectionLabel(page, section)}
            </option>
          ))
        : null}
      <option value={TARGET_END}>Final da página</option>
    </select>
  );
}

/** Links do menu/rodapé: texto + seção de destino. */
function LinksField({
  links,
  page,
  onChange,
}: {
  links: NavLink[];
  page: PageContent | undefined;
  onChange: (links: NavLink[]) => void;
}) {
  return (
    <RecordsField<NavLink>
      label="Links para as seções"
      itemLabel="Link"
      items={links}
      fields={[{ key: "label", label: "Texto do link" }]}
      make={() => ({ label: "Seção", target: TARGET_FORM })}
      onChange={onChange}
      extra={(item, set) => (
        <TargetSelect label="Seção de destino" value={item.target} page={page} onChange={(target) => set({ target })} />
      )}
    />
  );
}

function AlignField({ value, onChange }: { value: Align; onChange: (v: Align) => void }) {
  return (
    <ChoiceField
      label="Alinhamento"
      value={value}
      options={[
        ["left", "Esquerda"],
        ["center", "Centro"],
        ["right", "Direita"],
      ]}
      onChange={onChange}
    />
  );
}

/** Tamanho do texto (mínimo de 16px, regra do guia). */
function SizeField({ label = "Tamanho do texto", value, onChange }: { label?: string; value: number; onChange: (v: number) => void }) {
  return <StepSelect label={label} value={value} steps={[16, 18, 20, 24]} onChange={onChange} />;
}

/** Conteúdo e estilo dos blocos novos. */
function NewBlockFields({
  node,
  page,
  onChange,
}: {
  node: NewBlock;
  page: PageContent | undefined;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  let content: React.ReactNode = null;
  let style: React.ReactNode = null;
  switch (node.type) {
    case "badge":
      content = (
        <>
          <Field label="Texto">
            <Input value={node.text} onChange={(e) => onChange({ text: e.target.value })} />
            <p className="text-xs text-muted-foreground">Fica em caixa alta. Use poucas palavras.</p>
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={!!node.dot} onChange={(e) => onChange({ dot: e.target.checked || undefined })} />
            Ponto pulsante
          </label>
          <p className="text-xs text-muted-foreground">Quem pede menos movimento no sistema vê o ponto parado.</p>
        </>
      );
      style = (
        <>
          <ChoiceField label="Estilo" value={node.variant} columns={2} options={[["pill", "Pílula"], ["text", "Só texto"]]} onChange={(variant) => onChange({ variant })} />
          <SwatchField label="Cor do texto" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor do ponto e da pílula" value={node.accentColor} onChange={(v) => onChange({ accentColor: v })} />
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
          <AlignField value={node.align} onChange={(align) => onChange({ align })} />
        </>
      );
      break;
    case "list":
      content = <LinesField label="Itens" value={node.items} onChange={(items) => onChange({ items })} hint="Um item por linha. Use **negrito**." />;
      style = (
        <>
          <ChoiceField
            label="Marcador"
            value={node.marker}
            options={[
              ["checkCircle", "Check em círculo"],
              ["check", "Check"],
              ["dot", "Ponto"],
              ["dash", "Traço"],
              ["number", "Número"],
            ]}
            onChange={(marker) => onChange({ marker })}
          />
          <StepSelect label="Espaço entre itens" value={node.gap} steps={[4, 8, 12, 16, 20, 24]} onChange={(gap) => onChange({ gap })} />
          <ChoiceField label="Divisória entre itens" value={node.divider} options={[["none", "Nenhuma"], ["line", "Linha"], ["dashed", "Tracejada"]]} onChange={(divider) => onChange({ divider })} />
          <SwatchField label="Cor do texto" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor dos marcadores" value={node.accentColor} onChange={(v) => onChange({ accentColor: v })} />
          {node.divider !== "none" ? <SwatchField label="Cor da divisória" value={node.dividerColor} onChange={(v) => onChange({ dividerColor: v })} /> : null}
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
        </>
      );
      break;
    case "infolist":
      content = (
        <RecordsField
          label="Linhas"
          itemLabel="Linha"
          items={node.rows}
          fields={[
            { key: "label", label: "Rótulo" },
            { key: "value", label: "Valor" },
          ]}
          make={() => ({ label: "Rótulo", value: "Valor" })}
          onChange={(rows) => onChange({ rows })}
        />
      );
      style = (
        <>
          <SwatchField label="Cor dos rótulos" value={node.labelColor} onChange={(v) => onChange({ labelColor: v })} />
          <SwatchField label="Cor dos valores" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor do tracejado" value={node.dividerColor} onChange={(v) => onChange({ dividerColor: v })} />
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
        </>
      );
      break;
    case "tags":
      content = <LinesField label="Etiquetas" value={node.items} onChange={(items) => onChange({ items })} hint="Uma etiqueta por linha." />;
      style = (
        <>
          <StepSelect label="Espaço entre etiquetas" value={node.gap} steps={[8, 12, 16, 20]} onChange={(gap) => onChange({ gap })} />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={node.hover !== false} onChange={(e) => onChange({ hover: e.target.checked ? undefined : false })} />
            Destacar ao passar o mouse
          </label>
          <SwatchField label="Cor do texto" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor da borda e do fundo" value={node.accentColor} onChange={(v) => onChange({ accentColor: v })} />
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
          <AlignField value={node.align} onChange={(align) => onChange({ align })} />
        </>
      );
      break;
    case "stats":
      content = (
        <RecordsField
          label="Números"
          itemLabel="Número"
          items={node.items}
          fields={[
            { key: "value", label: "Número (ex.: +500)" },
            { key: "label", label: "Rótulo" },
          ]}
          make={() => ({ value: "0", label: "Rótulo" })}
          onChange={(items) => onChange({ items })}
        />
      );
      style = (
        <>
          <ChoiceField label="Por linha no computador" value={node.perRow} options={[[2, "2"], [3, "3"], [4, "4"]]} onChange={(perRow) => onChange({ perRow })} />
          <p className="text-xs text-muted-foreground">No tablet e no celular ficam 2 por linha.</p>
          <StepSelect label="Tamanho dos números" value={node.numberSize} steps={[24, 28, 32, 40, 48, 56]} onChange={(numberSize) => onChange({ numberSize })} />
          <SizeField label="Tamanho dos rótulos" value={node.size} onChange={(size) => onChange({ size })} />
          <SwatchField label="Cor dos números" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor dos rótulos" value={node.labelColor} onChange={(v) => onChange({ labelColor: v })} />
          <AlignField value={node.align} onChange={(align) => onChange({ align })} />
        </>
      );
      break;
    case "timeline":
      content = (
        <RecordsField<TimelineItem>
          label="Itens"
          itemLabel="Item"
          items={node.items}
          fields={[
            { key: "time", label: "Horário" },
            { key: "who", label: "Responsável" },
            { key: "title", label: "Título" },
            { key: "text", label: "Texto", multiline: true },
          ]}
          make={() => ({ time: "00h00", who: "", title: "Título", text: "", subitems: [] })}
          onChange={(items) => onChange({ items })}
          extra={(item, set) => (
            <Textarea
              rows={2}
              aria-label="Subitens (um por linha)"
              placeholder="Subitens (um por linha)"
              value={item.subitems.join("\n")}
              onChange={(e) => set({ subitems: e.target.value.split("\n") })}
              onBlur={(e) => set({ subitems: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) })}
            />
          )}
        />
      );
      style = (
        <>
          <StepSelect label="Largura da coluna de horário" value={node.timeWidth} steps={[64, 76, 86, 100, 120, 140]} onChange={(timeWidth) => onChange({ timeWidth })} />
          <p className="text-xs text-muted-foreground">No celular, a coluna fica com até 64px e o texto mais perto da linha.</p>
          <SwatchField label="Cor dos horários e títulos" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor dos textos" value={node.textColor} onChange={(v) => onChange({ textColor: v })} />
          <SwatchField label="Cor da linha e dos marcadores" value={node.accentColor} onChange={(v) => onChange({ accentColor: v })} />
          <SwatchField label="Miolo dos marcadores" value={node.markerBg} onChange={(v) => onChange({ markerBg: v })} />
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
        </>
      );
      break;
    case "faq":
      content = (
        <>
          <RecordsField
            label="Perguntas"
            itemLabel="Pergunta"
            items={node.items}
            fields={[
              { key: "q", label: "Pergunta" },
              { key: "a", label: "Resposta", multiline: true },
            ]}
            make={() => ({ q: "Nova pergunta?", a: "Resposta." })}
            onChange={(items) => onChange({ items })}
          />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={node.single} onChange={(e) => onChange({ single: e.target.checked })} />
            Um aberto por vez
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={node.firstOpen} onChange={(e) => onChange({ firstOpen: e.target.checked })} />
            Primeira pergunta aberta
          </label>
          <p className="text-xs text-muted-foreground">
            Sem JavaScript: em navegadores antigos, “um aberto por vez” vira livre.
          </p>
        </>
      );
      style = (
        <>
          <SwatchField label="Cor das perguntas" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor das respostas" value={node.textColor} onChange={(v) => onChange({ textColor: v })} />
          <SwatchField label="Cor da seta" value={node.accentColor} onChange={(v) => onChange({ accentColor: v })} />
          <SwatchField label="Cor das divisórias" value={node.dividerColor} onChange={(v) => onChange({ dividerColor: v })} />
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
        </>
      );
      break;
    case "date":
      content = (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dia">
              <Input value={node.day} onChange={(e) => onChange({ day: e.target.value })} />
            </Field>
            <Field label="Mês">
              <Input value={node.month} onChange={(e) => onChange({ month: e.target.value })} />
            </Field>
          </div>
          <Field label="Dia da semana">
            <Input value={node.weekday} onChange={(e) => onChange({ weekday: e.target.value })} />
          </Field>
          <Field label="Horário">
            <Input value={node.time} onChange={(e) => onChange({ time: e.target.value })} />
          </Field>
        </>
      );
      style = (
        <>
          <SwatchField label="Fundo do dia" value={node.bgColor} onChange={(v) => onChange({ bgColor: v })} />
          <SwatchField label="Texto do dia e do mês" value={node.boxColor} onChange={(v) => onChange({ boxColor: v })} />
          <SwatchField label="Cor do dia da semana" value={node.labelColor} onChange={(v) => onChange({ labelColor: v })} />
          <SwatchField label="Cor do horário" value={node.color} onChange={(v) => onChange({ color: v })} />
          <AlignField value={node.align} onChange={(align) => onChange({ align })} />
        </>
      );
      break;
    case "person":
      content = (
        <>
          <Field label="Nome">
            <Input value={node.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Função (pílula)">
            <Input value={node.role} onChange={(e) => onChange({ role: e.target.value })} />
          </Field>
          <Field label="Organização">
            <Input value={node.org} onChange={(e) => onChange({ org: e.target.value })} />
          </Field>
          <Field label="Bio">
            <Textarea rows={3} value={node.bio} onChange={(e) => onChange({ bio: e.target.value })} />
          </Field>
          <Field label="Foto (URL)">
            <Input value={node.photo} onChange={(e) => onChange({ photo: e.target.value })} placeholder="https://… (vazio = iniciais)" />
          </Field>
          <Field label="Upload da foto">
            <ImageUpload onLoad={(photo) => onChange({ photo })} />
          </Field>
          {!node.photo ? (
            <Field label="Iniciais">
              <Input value={node.initials ?? ""} maxLength={3} placeholder={initialsOf(node.name)} onChange={(e) => onChange({ initials: e.target.value || undefined })} />
            </Field>
          ) : (
            <Button variant="outline" size="touch" className="w-full" onClick={() => onChange({ photo: "" })}>
              Usar iniciais
            </Button>
          )}
        </>
      );
      style = (
        <>
          <SwatchField label={node.photo ? "Cor do anel" : "Cor do avatar e do anel"} value={node.accentColor} onChange={(v) => onChange({ accentColor: v })} />
          {!node.photo ? <SwatchField label="Cor das iniciais" value={node.avatarColor} onChange={(v) => onChange({ avatarColor: v })} /> : null}
          <SwatchField label="Cor da função" value={node.roleColor} onChange={(v) => onChange({ roleColor: v })} />
          <SwatchField label="Cor do nome" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor dos textos" value={node.textColor} onChange={(v) => onChange({ textColor: v })} />
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
          <AlignField value={node.align} onChange={(align) => onChange({ align })} />
        </>
      );
      break;
    case "divider":
      content = (
        <ChoiceField
          label="Tipo"
          value={node.variant}
          options={[
            ["solid", "Linha sólida"],
            ["dashed", "Tracejada"],
            ["space", "Só espaço"],
          ]}
          onChange={(variant) => onChange({ variant })}
        />
      );
      style =
        node.variant === "space" ? (
          <StepSelect label="Altura do espaço" value={node.height} steps={[8, 16, 24, 32, 48, 64, 80, 96, 128]} onChange={(height) => onChange({ height })} />
        ) : (
          <>
            <StepSelect label="Espessura" value={node.thickness} steps={[1, 2, 3, 4]} onChange={(thickness) => onChange({ thickness })} />
            <SwatchField label="Cor da linha" value={node.color} onChange={(v) => onChange({ color: v })} />
          </>
        );
      break;
    case "navbar":
      content = (
        <>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={node.logo} onChange={(e) => onChange({ logo: e.target.checked })} />
            Mostrar o logo oficial
          </label>
          <LinksField links={node.links} page={page} onChange={(links) => onChange({ links })} />
          <Field label="Botão de ação">
            <Input value={node.ctaLabel} placeholder="Vazio = sem botão" onChange={(e) => onChange({ ctaLabel: e.target.value })} />
          </Field>
          {node.ctaLabel.trim() ? (
            <TargetSelect label="Destino do botão" value={node.ctaTarget} page={page} onChange={(ctaTarget) => onChange({ ctaTarget })} />
          ) : null}
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={node.sticky} onChange={(e) => onChange({ sticky: e.target.checked })} />
            Fixo no topo
          </label>
          <p className="text-xs text-muted-foreground">
            O fundo, o vidro (desfoque) e o espaçamento ficam na seção do cabeçalho. No tablet e no celular o menu
            some e ficam o logo e o botão.
          </p>
        </>
      );
      style = (
        <>
          {node.logo ? <StepSelect label="Altura do logo" value={node.logoHeight} steps={[24, 28, 32, 36, 40, 48]} onChange={(logoHeight) => onChange({ logoHeight })} /> : null}
          <SwatchField label="Cor dos links" value={node.linkColor} onChange={(v) => onChange({ linkColor: v })} />
          {node.ctaLabel.trim() ? (
            <>
              <ChoiceField label="Estilo do botão" value={node.ctaVariant} columns={2} options={[["filled", "Preenchido"], ["outline", "Contorno"]]} onChange={(ctaVariant) => onChange({ ctaVariant })} />
              <SwatchField label={node.ctaVariant === "filled" ? "Cor do botão" : "Cor da borda"} value={node.ctaBgColor} onChange={(v) => onChange({ ctaBgColor: v })} />
              <SwatchField label="Cor do texto do botão" value={node.ctaColor} onChange={(v) => onChange({ ctaColor: v })} />
            </>
          ) : null}
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
        </>
      );
      break;
    case "footer":
      content = (
        <>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={node.logo} onChange={(e) => onChange({ logo: e.target.checked })} />
            Mostrar o logo oficial
          </label>
          <Field label="Texto">
            <Textarea rows={2} value={node.text} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>
          <LinksField links={node.links} page={page} onChange={(links) => onChange({ links })} />
          <p className="text-xs text-muted-foreground">No celular, tudo fica empilhado e centralizado.</p>
        </>
      );
      style = (
        <>
          {node.logo ? <StepSelect label="Altura do logo" value={node.logoHeight} steps={[20, 24, 28, 32, 40]} onChange={(logoHeight) => onChange({ logoHeight })} /> : null}
          <SwatchField label="Cor do texto" value={node.color} onChange={(v) => onChange({ color: v })} />
          <SwatchField label="Cor dos links" value={node.linkColor} onChange={(v) => onChange({ linkColor: v })} />
          <SizeField value={node.size} onChange={(size) => onChange({ size })} />
        </>
      );
      break;
  }
  return (
    <div className="space-y-3">
      <PanelGroup title="Conteúdo" defaultOpen>
        {content}
      </PanelGroup>
      <PanelGroup title="Estilo do bloco">{style}</PanelGroup>
    </div>
  );
}

/** Card do formulário RD: fundo, raio, preenchimento e sombra + CSS dos campos. */
function RdCardFields({ node, onChange }: { node: RdFormBlock; onChange: (patch: Record<string, unknown>) => void }) {
  const bb = useBBMode();
  const [bs, set] = useBlockStyle(node, onChange);
  const card = !!bs.bgColor;
  const fields = node.fields;
  const setFields = (patch: Partial<RdFieldStyle>) => onChange({ fields: { ...(fields ?? defaultRdFields()), ...patch } });
  return (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={card}
          onChange={(e) =>
            set(
              e.target.checked
                ? { ...FORM_CARD_STYLE, ...(bb ? { bgColor: BB_PALETTE.branco } : {}) }
                : { bgColor: undefined, radius: undefined, paddingY: undefined, paddingX: undefined, shadow: undefined, fillOpacity: undefined, glassBlur: undefined },
            )
          }
        />
        Mostrar o formulário num card
      </label>
      {card ? (
        <>
          <SwatchField label="Fundo do card" value={bs.bgColor ?? "#FFFFFF"} onChange={(v) => set({ bgColor: v })} />
          <RadiusField label="Raio do card" value={bs.radius ?? 0} onChange={(v) => set({ radius: v || undefined })} />
          <StepSelect label="Preenchimento do card" value={bs.paddingX ?? 0} steps={[16, 24, 32, 40, 48]} onChange={(v) => set({ paddingX: v, paddingY: v })} />
          <Field label="Sombra do card">
            <select className={SELECT} value={bs.shadow ?? "none"} onChange={(e) => set({ shadow: e.target.value === "none" ? undefined : (e.target.value as Shadow) })}>
              <option value="none">Nenhuma</option>
              <option value="sm">Leve</option>
              <option value="md">Média</option>
              <option value="lg">Grande</option>
            </select>
          </Field>
        </>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!fields}
          onChange={(e) => onChange({ fields: e.target.checked ? (bb ? { ...defaultRdFields(), borderColor: BB_PALETTE.azulEscuro, focusColor: BB_PALETTE.azulEscuro, bgColor: BB_PALETTE.branco } : defaultRdFields()) : undefined })}
        />
        Estilizar os campos do RD
      </label>
      {fields ? (
        <>
          <p className="text-xs text-muted-foreground">Preenchimento 13×15, borda de 1,5px e anel de foco. Vale no HTML exportado, dentro do RD Station.</p>
          <RadiusField label="Raio dos campos" value={fields.radius} onChange={(radius) => setFields({ radius })} />
          <SwatchField label="Borda dos campos" value={fields.borderColor} onChange={(borderColor) => setFields({ borderColor })} />
          <SwatchField label="Cor do foco" value={fields.focusColor} onChange={(focusColor) => setFields({ focusColor })} />
          <SwatchField label="Fundo dos campos" value={fields.bgColor} onChange={(bgColor) => setFields({ bgColor })} />
        </>
      ) : null}
    </>
  );
}

export function PageLayoutEditor({
  layout = {},
  onChange,
}: {
  layout?: PageLayout | undefined;
  onChange: (layout: PageLayout | undefined) => void;
}) {
  const set = (patch: Patch<PageLayout>) => {
    const next = withPatch(layout, patch);
    onChange(Object.keys(next).length ? next : undefined);
  };
  return (
    <PanelGroup title="Layout da página">
      <Field label="Largura do conteúdo">
        <select
          className={SELECT}
          value={String(layout.maxWidth ?? DEFAULT_CONTENT_WIDTH)}
          onChange={(e) => {
            const v = e.target.value === "full" ? "full" : (Number(e.target.value) as ContentWidth);
            set({ maxWidth: v === DEFAULT_CONTENT_WIDTH ? undefined : v });
          }}
        >
          {CONTENT_WIDTHS.map((w) => (
            <option key={w} value={String(w)}>
              {w === "full" ? "Largura total" : `${w}px${w === DEFAULT_CONTENT_WIDTH ? " (padrão)" : ""}`}
            </option>
          ))}
        </select>
      </Field>
      <StepSelect
        label="Margem lateral do conteúdo (computador)"
        value={layout.gutter ?? 0}
        steps={GUTTER_STEPS}
        onChange={(v) => set({ gutter: v || undefined })}
      />
      <StepSelect
        label="Margem lateral no celular (até 640px)"
        value={layout.gutterMobile ?? DEFAULT_GUTTER_MOBILE}
        steps={GUTTER_STEPS.filter((s) => s > 0)}
        onChange={(v) => set({ gutterMobile: v === DEFAULT_GUTTER_MOBILE ? undefined : v })}
      />
      <p className="text-xs text-muted-foreground">
        No tablet (até 980px) as seções usam 24px de margem lateral e as colunas empilham, salvo outra escolha na linha.
      </p>
      <Field label="Compensação ao rolar até as seções">
        <select
          className={SELECT}
          value={String(layout.scrollOffset ?? "auto")}
          onChange={(e) => set({ scrollOffset: e.target.value === "auto" ? undefined : Number(e.target.value) })}
        >
          <option value="auto">Automática (altura do cabeçalho fixo)</option>
          {[0, 64, 72, 90, 120].map((v) => (
            <option key={v} value={String(v)}>
              {v}px
            </option>
          ))}
        </select>
      </Field>
    </PanelGroup>
  );
}

function CursorEditor({
  cursor,
  onCursorChange,
}: {
  cursor: PageCursor;
  onCursorChange: (patch: Partial<PageCursor>) => void;
}) {
  const bb = useBBMode();
  return (
    <div className="space-y-4 border-t border-border p-6">
      <h3 className="text-sm font-bold">Cursor do mouse</h3>
      <Field label="Modo">
        <select
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={cursor.mode}
          onChange={(e) => onCursorChange({ mode: e.target.value as PageCursor["mode"] })}
        >
          <option value="default">Padrão do navegador</option>
          <option value="image">Ícone personalizado (estático)</option>
          <option value="follower">Imagem/GIF que segue o mouse</option>
        </select>
      </Field>
      {cursor.mode !== "default" ? (
        <>
          {bb ? null : <Field label="Presets">
            <div className="grid grid-cols-3 gap-2">
              {CURSOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onCursorChange({ url: preset.url, hotspot: preset.hotspot })}
                  aria-pressed={cursor.url === preset.url}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-[11px] ${
                    cursor.url === preset.url ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <img src={preset.url} alt="" className="size-6" />
                  {preset.label}
                </button>
              ))}
            </div>
          </Field>}
          <Field label="URL da imagem ou GIF">
            <Input
              value={cursor.url}
              onChange={(e) => onCursorChange({ url: e.target.value })}
              placeholder="https://.../cursor.gif"
              aria-label="URL do cursor"
            />
            {cursor.mode === "image" ? (
              <p className="text-xs text-muted-foreground">
                GIFs não animam neste modo — use “segue o mouse” para animação. Tamanho máximo
                recomendado: 64px.
              </p>
            ) : null}
          </Field>
          <Field label="Tamanho (px)">
            <div className="flex flex-wrap gap-2">
              {[24, 32, 40, 48, 64].map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={cursor.size === size}
                  onClick={() => onCursorChange({ size })}
                  className={`min-h-11 rounded-md border px-3 text-sm ${
                    cursor.size === size ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Ponto de clique">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={cursor.hotspot}
              onChange={(e) => onCursorChange({ hotspot: e.target.value as PageCursor["hotspot"] })}
            >
              <option value="topleft">Canto superior esquerdo (setas)</option>
              <option value="center">Centro (ícones e GIFs)</option>
            </select>
          </Field>
          {cursor.mode === "follower" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cursor.hideNative}
                onChange={(e) => onCursorChange({ hideNative: e.target.checked })}
              />
              Esconder o cursor original do sistema
            </label>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Acessibilidade: em telas de toque o cursor personalizado é desativado automaticamente e o
            cursor padrão permanece disponível para navegação por teclado.
          </p>
        </>
      ) : null}
    </div>
  );
}

/** Ação do botão: URL externa ou rolar até uma seção da página (âncora, sem JS). */
function ButtonLinkField({
  node,
  page,
  onChange,
}: {
  node: ButtonBlock;
  page: PageContent | undefined;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const mode = node.linkMode === "section" ? "section" : "url";
  const options: [typeof mode, string][] = [
    ["url", "URL externa"],
    ["section", "Ir para seção da página"],
  ];
  const link = page ? resolveButtonLink(page, node) : null;
  const target = node.target || TARGET_FORM;
  const exists = target === TARGET_FORM || target === TARGET_END || !!page?.sections.some((s) => s.id === target);
  const noForm = !!page && target === TARGET_FORM && !formSection(page);
  const goTo = () => {
    if (!link) return;
    const id = link.sectionId ? sectionAnchor({ id: link.sectionId }) : END_ANCHOR;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <Field label="Ação do botão">
      <div role="radiogroup" aria-label="Ação do botão" className="grid grid-cols-2 gap-2">
        {options.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            onClick={() =>
              onChange(
                id === "section"
                  ? { linkMode: "section", target: node.target || TARGET_FORM }
                  : { linkMode: "url" },
              )
            }
            className="min-h-11 rounded-xl border-2 px-2 text-sm font-bold leading-tight transition-colors"
            style={{
              borderColor: mode === id ? "var(--gove-primary)" : "var(--color-border)",
              backgroundColor: mode === id ? "var(--color-secondary)" : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "url" ? (
        <Input
          aria-label="Link do botão"
          value={node.href}
          onChange={(e) => onChange({ href: e.target.value })}
          placeholder="https://"
        />
      ) : (
        <>
          <select
            aria-label="Seção de destino"
            className={SELECT}
            value={exists ? target : ""}
            onChange={(e) => onChange({ target: e.target.value })}
          >
            {!exists ? (
              <option value="" disabled>
                Seção excluída — escolha outra
              </option>
            ) : null}
            <option value={TARGET_FORM}>Formulário de inscrição</option>
            {page?.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {sectionLabel(page, section)}
              </option>
            ))}
            <option value={TARGET_END}>Final da página</option>
          </select>
          {link?.missing ? (
            <p role="alert" className="flex items-start gap-2 text-xs font-semibold text-destructive">
              <Warning className="mt-0.5 size-4 shrink-0" aria-hidden />
              A seção de destino foi excluída. Por enquanto o botão leva para: {link.label}.
            </p>
          ) : noForm ? (
            <p className="text-xs text-muted-foreground">
              A página ainda não tem formulário RD Station: o botão leva ao final da página.
            </p>
          ) : null}
          {link ? (
            <Button variant="outline" size="touch" className="w-full" onClick={goTo}>
              <ArrowLineDown aria-hidden />
              Ver destino no canvas
            </Button>
          ) : null}
        </>
      )}
    </Field>
  );
}

export function PropertiesPanel({
  node,
  background,
  onChange,
  onDelete,
  onColumns,
  onMoveUp,
  onMoveDown,
  cursor,
  onCursorChange,
  bbContainer,
  onApplyScheme,
  pageSettings,
  page,
}: Props) {
  const bb = useBBMode();
  if (!node) {
    return (
      <div>
        {pageSettings}
        <p className="p-6 text-sm text-muted-foreground">
          Selecione um elemento no canvas para editar suas propriedades.
        </p>
        {onCursorChange ? (
          <CursorEditor cursor={normalizeCursor(cursor)} onCursorChange={onCursorChange} />
        ) : null}
      </div>
    );
  }

  const textish = node.type === "text" || node.type === "button";
  const contrast =
    textish
      ? checkContrast(
          (node as { color: string }).color,
          node.type === "button" && node.variant === "filled" ? node.bgColor : background,
          (node as { size: number }).size,
          (node as { weight: string }).weight === "bold",
        )
      : null;
  const contrastWarning =
    contrast && !contrast.pass && contrast.ratio
      ? `Contraste ${contrast.ratio.toFixed(2)}:1 — abaixo do mínimo WCAG AA (${contrast.required}:1).`
      : null;

  // Identidade BB: contexto do texto e cores de forma (>= 3:1) sobre o fundo do contêiner.
  const leafNode = node.type !== "section" && node.type !== "row" ? node : null;
  const bbCtx = bb && bbContainer && leafNode ? leafTextContext(leafNode, bbContainer) : null;
  const containerBg =
    bbContainer && bbContainer.solid ? bbContainer.samples[0] : undefined;
  const shapeColors = containerBg ? graphicColors(containerBg) : undefined;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[20px] font-bold">{labelFor(node.type)}</h2>
        <div className="flex shrink-0">
          <Button
            variant="ghost"
            size="iconTouch"
            aria-label="Mover para cima"
            title="Mover para cima"
            disabled={!onMoveUp}
            onClick={onMoveUp}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="iconTouch"
            aria-label="Mover para baixo"
            title="Mover para baixo"
            disabled={!onMoveDown}
            onClick={onMoveDown}
          >
            <ArrowDown aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="iconTouch"
            aria-label="Remover elemento"
            title="Remover elemento"
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash aria-hidden />
          </Button>
        </div>
      </div>

      {node.type === "section" || node.type === "row" ? (
        <PanelGroup title="Layout" defaultOpen={node.type === "row"}>
          {node.type === "row" ? <RowLayoutFields row={node} onChange={onChange} onColumns={onColumns} /> : null}
          <BoxLayoutFields
            box={node.box}
            section={node.type === "section"}
            onChange={(patch) => onChange({ box: withPatch(normalizeBox(node.box), patch) })}
          />
        </PanelGroup>
      ) : null}

      {node.type === "section" || node.type === "row" ? (
        <BoxEditor
          box={node.box}
          onChange={(patch) => onChange({ box: { ...normalizeBox(node.box), ...patch } })}
          onScheme={onApplyScheme}
          allowTransparent={node.type === "row"}
          protectedText={bbContainer?.protected ?? false}
        />
      ) : null}

      {node.type === "section" || node.type === "row" ? (
        <div className="space-y-3">
          <PanelGroup title="Aparência">
            <BoxAppearanceFields
              box={node.box}
              onChange={(patch) => onChange({ box: withPatch(normalizeBox(node.box), patch) })}
            />
          </PanelGroup>
          <PanelGroup title="Celular e tablet">
            {node.type === "row" ? (
              <RowResponsiveFields row={node} onChange={onChange} />
            ) : (
              <SectionResponsiveFields section={node} onChange={onChange} />
            )}
          </PanelGroup>
        </div>
      ) : null}

      {node.type === "text" ? (
        <>
          <Field label="Tipo">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.tag}
              onChange={(e) => onChange({ tag: e.target.value })}
            >
              <option value="h1">Título H1</option>
              <option value="h2">Título H2</option>
              <option value="h3">Título H3</option>
              <option value="h4">Título H4</option>
              <option value="p">Parágrafo</option>
            </select>
          </Field>
          <Field label="Conteúdo">
            <Textarea value={node.content} rows={4} onChange={(e) => onChange({ content: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              Use **negrito** e ==destaque em degradê==. Enter quebra a linha.
            </p>
          </Field>
        </>
      ) : null}

      {node.type === "button" ? (
        <>
          <Field label="Texto do botão">
            <Input value={node.label} onChange={(e) => onChange({ label: e.target.value })} />
          </Field>
          <ButtonLinkField node={node} page={page} onChange={onChange} />
          <Field label="Estilo">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.variant}
              onChange={(e) => onChange({ variant: e.target.value })}
            >
              {BUTTON_VARIANTS.filter((v) => !bb || (v.value !== "glass" && v.value !== "ghost")).map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <ButtonExtraFields node={node} onChange={onChange} />
          {node.variant === "ghost" ? (
            <p className="text-xs text-muted-foreground">Fantasma: fundo transparente e borda translúcida na cor do texto.</p>
          ) : bb ? (
            node.variant === "text" ? null : (
              <PaletteField
                label={node.variant === "outline" ? "Cor da borda" : "Cor do botão"}
                value={node.bgColor}
                colors={shapeColors}
                onChange={(v) => onChange({ bgColor: v })}
                hint={shapeColors ? "Só cores com 3:1 ou mais sobre o fundo da seção." : undefined}
              />
            )
          ) : (
            <ColorField label="Cor do botão" value={node.bgColor} onChange={(v) => onChange({ bgColor: v })} />
          )}
          <RadiusField value={node.radius} onChange={(v) => onChange({ radius: v })} />
          <Field label="Animação">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.animation ?? "none"}
              onChange={(e) => onChange({ animation: e.target.value })}
            >
              {BUTTON_ANIMATIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
        </>
      ) : null}

      {textish ? (
        <>
          <Field label="Fonte">
            <Input
              value={
                bb
                  ? node.type === "text" && node.tag !== "p"
                    ? `${BB_FONTS.title.family} (identidade BB)`
                    : `${BB_FONTS.text.family} (identidade BB)`
                  : "Montserrat (travada pelo design system)"
              }
              readOnly
              aria-readonly
            />
          </Field>
          <Field label="Peso">
            <div className="flex gap-2">
              {(["regular", "bold"] as const).map((weight) => (
                <Button
                  key={weight}
                  type="button"
                  size="touch"
                  variant={(node as { weight: string }).weight === weight ? "default" : "outline"}
                  onClick={() => onChange({ weight })}
                >
                  {weight === "regular" ? "Regular" : "Bold"}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Estilo do texto">
            <Button
              type="button"
              size="touch"
              variant={(node as { italic: boolean }).italic ? "default" : "outline"}
              aria-pressed={(node as { italic: boolean }).italic}
              onClick={() => onChange({ italic: !(node as { italic: boolean }).italic })}
            >
              Itálico
            </Button>
          </Field>
          <Field label="Tamanho">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={TYPE_SCALE.includes((node as { size: number }).size) ? (node as { size: number }).size : "custom"}
              onChange={(e) =>
                e.target.value !== "custom" && onChange({ size: Number(e.target.value) })
              }
            >
              {TYPE_PRESETS.map((preset) => (
                <option key={preset.size} value={preset.size}>
                  {preset.label} — {preset.size}px
                </option>
              ))}
              <option value="custom">Customizado</option>
            </select>
            <Input
              type="number"
              min={8}
              max={120}
              value={(node as { size: number }).size}
              onChange={(e) => onChange({ size: Number(e.target.value) })}
              aria-label="Tamanho customizado em px"
            />
          </Field>
          {bbCtx ? (
            <TextColorField
              label="Cor do texto"
              value={(node as { color: string }).color}
              ctx={bbCtx}
              onChange={(v) => onChange({ color: v })}
            />
          ) : (
            <ColorField
              label="Cor do texto"
              value={(node as { color: string }).color}
              onChange={(v) => onChange({ color: v })}
              warning={contrastWarning}
            />
          )}
          <Field label="Alinhamento">
            <div className="flex gap-2">
              {(["left", "center", "right"] as const).map((align) => (
                <Button
                  key={align}
                  size="touch"
                  variant={(node as { align: string }).align === align ? "default" : "outline"}
                  onClick={() => onChange({ align })}
                >
                  {align === "left" ? "Esquerda" : align === "center" ? "Centro" : "Direita"}
                </Button>
              ))}
            </div>
          </Field>
        </>
      ) : null}

      {node.type === "text" ? (
        <PanelGroup title="Tipografia">
          <TypographyFields node={node} onChange={onChange} bbCtx={bbCtx} />
        </PanelGroup>
      ) : null}

      {node.type === "image" ? (
        <>
          <Field label="URL da imagem">
            <Input
              value={node.src}
              onChange={(e) => onChange({ src: e.target.value, credit: null })}
              placeholder="https://…"
            />
          </Field>
          <PexelsSearch
            credit={node.src ? node.credit : null}
            onPick={(photo) =>
              onChange({
                src: photo.src.large,
                alt: node.alt.trim() ? node.alt : photo.alt,
                credit: creditFor(photo),
              })
            }
          />
          <Field label="Upload">
            <ImageUpload onLoad={(src) => onChange({ src, credit: null })} />
          </Field>
          <Field label="Texto alternativo (obrigatório)">
            <Input value={node.alt} onChange={(e) => onChange({ alt: e.target.value })} />
            {!node.alt.trim() ? (
              <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive">
                <Warning className="size-4" aria-hidden /> Informe o alt text antes de exportar.
              </p>
            ) : null}
          </Field>
          <StepSelect label="Largura (%)" value={node.width} steps={[25, 50, 75, 100]} suffix="%" onChange={(v) => onChange({ width: v })} />
          <Field label="Moldura">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["free", "Forma livre"],
                  ["square", "Quadrada 1:1"],
                  ["circle", "Circular"],
                  ["rounded", "Cantos arredondados"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={(node.frame ?? "free") === value}
                  onClick={() => onChange({ frame: value })}
                  className="min-h-11 rounded-lg border-2 px-2 py-2 text-xs font-bold"
                  style={{
                    borderColor: (node.frame ?? "free") === value ? "var(--gove-primary)" : "var(--color-border)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          {(node.frame ?? "free") !== "circle" ? (
            <RadiusField value={node.radius} onChange={(v) => onChange({ radius: v })} />
          ) : null}
        </>
      ) : null}

      {node.type === "card" ? (
        <>
          <Field label="Ícone">
            <IconPicker value={node.icon} onChange={(icon) => onChange({ icon })} />
          </Field>
          {bb ? (
            <PaletteField
              label="Cor do ícone"
              value={node.iconColor}
              colors={graphicColors(node.bgColor)}
              onChange={(v) => onChange({ iconColor: v })}
              hint="Só cores com 3:1 ou mais sobre o fundo do card."
            />
          ) : (
            <ColorField label="Cor do ícone" value={node.iconColor} onChange={(v) => onChange({ iconColor: v })} />
          )}
          <Field label="Título">
            <Input value={node.title} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <Textarea rows={3} value={node.description} onChange={(e) => onChange({ description: e.target.value })} />
          </Field>
          {bb ? (
            <TextColorField
              label="Cor do texto"
              value={node.color}
              ctx={textContext([hex6(node.bgColor) ?? "#FFFFFF"])}
              onChange={(v) => onChange({ color: v })}
            />
          ) : (
            <ColorField
              label="Cor do texto"
              value={node.color}
              onChange={(v) => onChange({ color: v })}
              warning={
                checkContrast(node.color, node.bgColor, node.size, false).pass
                  ? null
                  : "Contraste abaixo do mínimo WCAG AA (4.5:1)."
              }
            />
          )}
          <ColorField label="Cor de fundo" value={node.bgColor} onChange={(v) => onChange({ bgColor: v })} />
          <ColorField label="Cor da borda" value={node.borderColor} onChange={(v) => onChange({ borderColor: v })} />
          <StepSelect label="Espessura da borda" value={node.borderWidth} steps={[0, 1, 2, 3, 4]} onChange={(v) => onChange({ borderWidth: v })} />
          <RadiusField value={node.radius} onChange={(v) => onChange({ radius: v })} />
          <StepSelect label="Padding interno" value={node.padding} steps={SPACING_STEPS} onChange={(v) => onChange({ padding: v })} />
          <Field label="Sombra">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.shadow}
              onChange={(e) => onChange({ shadow: e.target.value })}
            >
              <option value="none">Nenhuma</option>
              <option value="sm">Leve</option>
              <option value="md">Média</option>
              <option value="lg">Grande</option>
            </select>
          </Field>
        </>
      ) : null}

      {node.type === "video" ? (
        <>
          <Field label="Link do vídeo (YouTube, Vimeo ou embed)">
            <Input
              value={node.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            <p className="text-xs text-muted-foreground">
              Links do YouTube e Vimeo são convertidos automaticamente para embed.
            </p>
          </Field>
          <Field label="Título acessível do vídeo (obrigatório)">
            <Input value={node.title} onChange={(e) => onChange({ title: e.target.value })} />
            {!node.title.trim() ? (
              <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive">
                <Warning className="size-4" aria-hidden /> Informe o título antes de exportar.
              </p>
            ) : null}
          </Field>
          <Field label="Proporção">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.aspect}
              onChange={(e) => onChange({ aspect: e.target.value })}
            >
              {ASPECTS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <StepSelect label="Largura (%)" value={node.width} steps={[25, 50, 75, 100]} suffix="%" onChange={(v) => onChange({ width: v })} />
          <RadiusField value={node.radius} onChange={(v) => onChange({ radius: v })} />
          <Field label="Alinhamento">
            <div className="flex gap-2">
              {(["left", "center", "right"] as const).map((align) => (
                <Button key={align} size="touch" variant={node.align === align ? "default" : "outline"} onClick={() => onChange({ align })}>
                  {align === "left" ? "Esquerda" : align === "center" ? "Centro" : "Direita"}
                </Button>
              ))}
            </div>
          </Field>
        </>
      ) : null}

      {node.type === "countdown" ? (
        <>
          <Field label="Data e hora final">
            <Input
              type="datetime-local"
              value={node.target.slice(0, 16)}
              onChange={(e) => onChange({ target: e.target.value })}
            />
          </Field>
          <Field label="Unidades exibidas">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.mode}
              onChange={(e) => onChange({ mode: e.target.value })}
            >
              {COUNTDOWN_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Texto quando encerrar">
            <Input value={node.expiredText} onChange={(e) => onChange({ expiredText: e.target.value })} />
          </Field>
          {bbCtx ? (
            <>
              <TextColorField label="Cor dos números" value={node.color} ctx={bbCtx} onChange={(v) => onChange({ color: v })} />
              <TextColorField label="Cor dos rótulos" value={node.accentColor} ctx={bbCtx} onChange={(v) => onChange({ accentColor: v })} />
              <PaletteField
                label="Cor de fundo dos blocos"
                value={node.bgColor}
                colors={shapeColors}
                onChange={(v) => onChange({ bgColor: v })}
              />
            </>
          ) : (
            <>
              <ColorField
                label="Cor dos números"
                value={node.color}
                onChange={(v) => onChange({ color: v })}
                warning={
                  checkContrast(node.color, node.bgColor, node.size, true).pass
                    ? null
                    : "Contraste abaixo do mínimo WCAG AA (4.5:1)."
                }
              />
              <ColorField
                label="Cor dos rótulos"
                value={node.accentColor}
                onChange={(v) => onChange({ accentColor: v })}
                warning={
                  checkContrast(node.accentColor, node.bgColor, 16, true).pass
                    ? null
                    : "Contraste abaixo do mínimo WCAG AA (4.5:1)."
                }
              />
              <ColorField label="Cor de fundo dos blocos" value={node.bgColor} onChange={(v) => onChange({ bgColor: v })} />
            </>
          )}
          <Field label="Estilo dos blocos">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.variant ?? "filled"}
              onChange={(e) => onChange({ variant: e.target.value })}
            >
              {BUTTON_VARIANTS.filter((v) => !bb || (v.value !== "glass" && v.value !== "ghost")).map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Animação">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.animation ?? "none"}
              onChange={(e) => onChange({ animation: e.target.value })}
            >
              {BUTTON_ANIMATIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tamanho dos números">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={TYPE_SCALE.includes(node.size) ? node.size : "custom"}
              onChange={(e) => e.target.value !== "custom" && onChange({ size: Number(e.target.value) })}
            >
              {TYPE_PRESETS.map((preset) => (
                <option key={preset.size} value={preset.size}>
                  {preset.label} — {preset.size}px
                </option>
              ))}
              <option value="custom">Customizado</option>
            </select>
            <Input
              type="number"
              min={16}
              max={160}
              value={node.size}
              onChange={(e) => onChange({ size: Number(e.target.value) })}
              aria-label="Tamanho dos números em px"
            />
          </Field>
          <RadiusField value={node.radius} onChange={(v) => onChange({ radius: v })} />
          <Field label="Alinhamento">
            <div className="flex gap-2">
              {(["left", "center", "right"] as const).map((align) => (
                <Button key={align} size="touch" variant={node.align === align ? "default" : "outline"} onClick={() => onChange({ align })}>
                  {align === "left" ? "Esquerda" : align === "center" ? "Centro" : "Direita"}
                </Button>
              ))}
            </div>
          </Field>
        </>
      ) : null}

      {leafNode && isNewBlock(leafNode) ? <NewBlockFields node={leafNode} page={page} onChange={onChange} /> : null}

      {node.type === "rdform" ? (
        <PanelGroup title="Card do formulário">
          <RdCardFields node={node} onChange={onChange} />
        </PanelGroup>
      ) : null}

      {node.type === "rdform" ? (
        <Field label="Snippet do formulário RD Station">
          <Textarea
            rows={8}
            value={node.snippet}
            onChange={(e) => onChange({ snippet: e.target.value })}
            placeholder='<div role="main" id="formulario-xxxx"></div><script …></script>'
          />
          <p className="text-xs text-muted-foreground">
            O código é preservado exatamente como colado e só é executado na plataforma final.
          </p>
        </Field>
      ) : null}

      {leafNode ? (
        <div className="space-y-3">
          <PanelGroup title="Aparência">
            <BlockAppearanceFields leaf={leafNode} onChange={onChange} />
          </PanelGroup>
          <PanelGroup title="Efeitos">
            <BlockEffectsFields leaf={leafNode} onChange={onChange} />
          </PanelGroup>
          <PanelGroup title="Celular e tablet">
            <HideFields
              hide={leafNode.blockStyle?.hide}
              onChange={(hide) => {
                const next = withPatch(leafNode.blockStyle ?? {}, { hide });
                onChange({ blockStyle: Object.keys(next).length ? next : undefined });
              }}
            />
            <p className="text-xs text-muted-foreground">
              No canvas, o bloco oculto aparece esmaecido com um aviso no modo correspondente.
            </p>
          </PanelGroup>
        </div>
      ) : null}
    </div>
  );
}

function labelFor(type: string) {
  const map: Record<string, string> = {
    section: "Seção",
    row: "Linha",
    text: "Texto",
    button: "Botão (CTA)",
    image: "Imagem",
    card: "Card com ícone",
    rdform: "Formulário RD Station",
    video: "Vídeo (embed)",
    countdown: "Contagem regressiva",
    badge: "Selo",
    list: "Lista",
    infolist: "Lista de informações",
    tags: "Etiquetas",
    stats: "Estatísticas",
    timeline: "Cronograma",
    faq: "Perguntas frequentes (FAQ)",
    date: "Bloco de data",
    person: "Card de pessoa",
    divider: "Divisória / espaçador",
    navbar: "Cabeçalho com menu",
    footer: "Rodapé",
  };
  return map[type] ?? type;
}