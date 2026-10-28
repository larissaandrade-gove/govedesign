import { Warning, ArrowDown, ArrowUp, Trash, ArrowLineDown } from "@phosphor-icons/react";
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
  type AnyNode,
  type BoxProps,
  type ButtonBlock,
  type PageContent,
  type PageCursor,
} from "@/lib/gove/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaletteField, SchemePicker, TextColorField } from "./BBControls";
import { useBBMode } from "@/lib/gove/bbMode";
import {
  BB_FONTS,
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

const SELECT = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

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
        <BoxEditor
          box={node.box}
          onChange={(patch) => onChange({ box: { ...normalizeBox(node.box), ...patch } })}
          onScheme={onApplyScheme}
          allowTransparent={node.type === "row"}
          protectedText={bbContainer?.protected ?? false}
        />
      ) : null}

      {node.type === "row" ? (
        <>
          <StepSelect label="Colunas" value={node.columns.length} steps={[1, 2, 3, 4]} suffix="" onChange={onColumns} />
          <StepSelect label="Espaço entre colunas" value={node.gap} steps={SPACING_STEPS} onChange={(v) => onChange({ gap: v })} />
          <Field label="Alinhamento vertical">
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={node.alignItems ?? "start"}
              onChange={(e) => onChange({ alignItems: e.target.value })}
            >
              <option value="start">Topo</option>
              <option value="center">Centro</option>
              <option value="end">Base</option>
              <option value="stretch">Esticar (mesma altura)</option>
            </select>
          </Field>
        </>
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
              <option value="p">Parágrafo</option>
            </select>
          </Field>
          <Field label="Conteúdo">
            <Textarea value={node.content} rows={4} onChange={(e) => onChange({ content: e.target.value })} />
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
              {BUTTON_VARIANTS.filter((v) => !bb || v.value !== "glass").map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          {bb ? (
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
              {BUTTON_VARIANTS.filter((v) => !bb || v.value !== "glass").map((v) => (
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
  };
  return map[type] ?? type;
}