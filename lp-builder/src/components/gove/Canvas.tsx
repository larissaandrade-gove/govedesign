import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { END_ANCHOR, sectionAnchor } from "@/lib/gove/anchors";
import { getIcon } from "./icons";
import { buttonDecls, buttonReactStyle } from "@/lib/gove/buttonStyle";
import {
  DEFAULT_LINE_HEIGHT,
  blockBoxCss,
  blockFill,
  blockMargin,
  fluidFontAt,
  hiddenLabel,
  hiddenOn,
  highlightCss,
  sidedBorder,
  textExtrasCss,
} from "@/lib/gove/blockStyle";
import { parseRich } from "@/lib/gove/richText";
import { imageFrameCss } from "@/lib/gove/imageFrame";
import { ANIMATION_CSS, bgAnimClass, btnAnimClass } from "@/lib/gove/animations";
import { cursorCss, followerCss, normalizeCursor } from "@/lib/gove/cursor";
import { embedUrl } from "@/lib/gove/video";
import { countdownMsLeft, countdownUnits, pad } from "@/lib/gove/countdown";
import type { CountdownBlock, TextBlock } from "@/lib/gove/types";
import type { BoxProps, Leaf, PageContent, RowBlock, SectionBlock } from "@/lib/gove/types";
import {
  BB_PROTECTION,
  isBB,
  logoLayout,
  needsProtection,
  pageFonts,
  rowSamples,
  textContext,
  type BBContext,
  type PageFonts,
} from "@/lib/gove/bb";
import { BB_FONT_FACE_CSS } from "@/lib/gove/bbFonts";
import {
  DEVICE_WIDTH,
  boxCss,
  columnCss,
  containerCss,
  decorLayers,
  desktopCanvasWidth,
  pageSheet,
  reactStyle,
  rowCss,
  shadowCss,
  type Device,
  type Sheet,
} from "@/lib/gove/styleRules";

/** Identidade da página no canvas (fontes e, na BB, o fundo do contêiner). */
interface Look {
  bb: boolean;
  fonts: PageFonts;
  container?: BBContext;
  /** Modo do canvas (tamanho responsivo e itens ocultos). */
  device: Device;
  sheet: Sheet;
  /** Editor: itens ocultos no modo aparecem esmaecidos com aviso; miniatura: somem. */
  showHidden: boolean;
}

/** CSS da caixa (o mesmo do export) como estilo React. */
const boxStyle = (box: BoxProps, bb = false) => reactStyle(boxCss(box, bb)) as CSSProperties;

/** Camadas decorativas (grade e brilhos) atrás do conteúdo, como no export. */
function DecorLayers({ box }: { box: BoxProps }) {
  const layers = decorLayers(box);
  if (!layers) return null;
  return (
    <div className="gove-decor" aria-hidden style={reactStyle(layers.glows) as CSSProperties}>
      {layers.grid ? <div style={reactStyle(layers.grid) as CSSProperties} /> : null}
    </div>
  );
}

/** Aviso dos itens ocultos no modo atual (o export usa @media). */
const HIDDEN_CSS = `.gove-lp [data-gove-hidden]{opacity:.45 !important;outline:2px dashed #5B6770;outline-offset:2px;}
.gove-lp [data-gove-hidden]::after{content:attr(data-gove-hidden);display:block;margin-top:4px;font:600 11px/1.6 Montserrat,sans-serif;color:#5B6770;-webkit-text-fill-color:#5B6770;text-transform:none;letter-spacing:0;text-align:left;}`;

interface CanvasProps {
  page: PageContent;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Computador, tablet (820px) ou celular (390px). */
  device: Device;
  onMove?:
    | ((dragId: string, targetId: string, position: "before" | "after", kind: "leaf" | "row") => void)
    | undefined;
  /** false (miniaturas): itens ocultos no modo somem em vez de aparecer esmaecidos. */
  showHidden?: boolean;
}

const outline = (active: boolean): CSSProperties =>
  active
    ? {
        outline: "3px solid var(--gove-primary)",
        outlineOffset: 2,
        boxShadow:
          "0 0 0 6px color-mix(in srgb, var(--gove-primary) 22%, transparent), 0 0 0 1px var(--gove-accent) inset",
        borderRadius: 4,
        position: "relative",
        zIndex: 1,
      }
    : {};

type LeafProps = { leaf: Leaf; look: Look } & Omit<CanvasProps, "page" | "device" | "showHidden">;

function LeafView(props: LeafProps) {
  const { leaf, look } = props;
  if (!look.showHidden && hiddenOn(leaf.blockStyle?.hide, look.device)) return null;
  if (look.bb && look.container && needsProtection(leaf, look.container)) {
    // Caixa de proteção BB: texto sobre foto vai num bloco Azul escuro.
    return (
      <div
        className="bb-protecao"
        style={{ backgroundColor: BB_PROTECTION.bg, padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}
      >
        <LeafBody {...props} />
      </div>
    );
  }
  return <LeafBody {...props} />;
}

/** Texto com **negrito**, ==destaque== e quebras de linha (nunca HTML). */
function RichContent({ leaf, look }: { leaf: TextBlock; look: Look }) {
  const heading = leaf.tag !== "p";
  const bold = heading ? look.fonts.headingWeight(true) : look.fonts.bodyWeight(true);
  const hl = reactStyle(highlightCss(leaf, look.bb)) as CSSProperties;
  return (
    <>
      {parseRich(leaf.content).map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? <br /> : null}
          {line.map((span, j) => {
            let node: React.ReactNode = span.text;
            if (span.bold) node = <strong style={{ fontWeight: bold }}>{node}</strong>;
            if (span.highlight)
              node = (
                <span className="gove-hl" style={hl}>
                  {node}
                </span>
              );
            return <Fragment key={j}>{node}</Fragment>;
          })}
        </Fragment>
      ))}
    </>
  );
}

function LeafBody({ leaf, look, selectedId, onSelect, onMove }: LeafProps) {
  const { fonts } = look;
  const selected = selectedId === leaf.id;
  const hidden = hiddenOn(leaf.blockStyle?.hide, look.device) ? hiddenLabel(leaf.blockStyle?.hide) : null;
  const dnd = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/gove-leaf", leaf.id);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("text/gove-leaf")) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
    },
    onDrop: (e: React.DragEvent) => {
      const dragId = e.dataTransfer.getData("text/gove-leaf");
      if (!dragId || dragId === leaf.id) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      onMove?.(dragId, leaf.id, after ? "after" : "before", "leaf");
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(leaf.id);
    },
    className: look.sheet.classOf(leaf.id) || undefined,
    ...(hidden ? { "data-gove-hidden": hidden } : {}),
  };
  const edit: CSSProperties = { ...outline(selected), cursor: "grab" };
  /** Invólucro (botão, imagem, vídeo, contagem, RD): alinhamento + aparência do bloco. */
  const wrapper = (align: string | undefined): CSSProperties => ({
    ...(reactStyle({ "text-align": align, margin: blockMargin(leaf), ...blockBoxCss(leaf, look.bb) }) as CSSProperties),
    ...edit,
  });

  if (leaf.type === "text") {
    const Tag = leaf.tag;
    const heading = leaf.tag !== "p";
    const style = reactStyle({
      margin: blockMargin(leaf),
      "font-family": heading ? fonts.heading : fonts.body,
      "font-size": `${fluidFontAt(leaf, look.device)}px`,
      "font-weight": String(heading ? fonts.headingWeight(leaf.weight === "bold") : fonts.bodyWeight(leaf.weight === "bold")),
      "font-style": leaf.italic ? "italic" : "normal",
      color: leaf.color,
      "text-align": leaf.align,
      "line-height": String(leaf.lineHeight ?? DEFAULT_LINE_HEIGHT),
      ...textExtrasCss(leaf),
      ...blockBoxCss(leaf, look.bb),
    }) as CSSProperties;
    return (
      <Tag {...dnd} style={{ ...style, ...edit }}>
        <RichContent leaf={leaf} look={look} />
      </Tag>
    );
  }

  if (leaf.type === "button") {
    const Icon = leaf.icon ? getIcon(leaf.icon) : null;
    const icon = Icon ? <Icon size="1.15em" aria-hidden /> : null;
    return (
      <div {...dnd} style={wrapper(leaf.align)}>
        <span
          className={btnAnimClass(leaf.animation)}
          style={reactStyle(buttonDecls(leaf, fonts, look.bb)) as CSSProperties}
        >
          {icon && leaf.iconPos !== "right" ? icon : null}
          {icon ? <span>{leaf.label}</span> : leaf.label}
          {icon && leaf.iconPos === "right" ? icon : null}
        </span>
      </div>
    );
  }

  if (leaf.type === "image") {
    return (
      <div {...dnd} style={wrapper(leaf.align)}>
        {leaf.src ? (
          <img
            src={leaf.src}
            alt={leaf.alt}
            style={{
              width: `${leaf.width}%`,
              display: "inline-block",
              borderRadius: imageFrameCss(leaf).radius,
              aspectRatio: imageFrameCss(leaf).aspectRatio,
              objectFit: imageFrameCss(leaf).objectFit,
            }}
          />
        ) : (
          <span className="inline-flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-slate-400 text-sm text-slate-500">
            [ Imagem — defina uma URL ou faça upload ]
          </span>
        )}
      </div>
    );
  }

  if (leaf.type === "card") {
    const Icon = getIcon(leaf.icon);
    const bs = leaf.blockStyle ?? {};
    const card = reactStyle({
      "background-color": blockFill(leaf.bgColor, bs.fillOpacity),
      color: leaf.color,
      ...(bs.borderSides || bs.borderStyle
        ? sidedBorder(leaf.borderWidth, leaf.borderColor, bs.borderSides, bs.borderStyle)
        : { border: leaf.borderWidth ? `${leaf.borderWidth}px solid ${leaf.borderColor}` : undefined }),
      "border-radius": `${leaf.radius}px`,
      "box-shadow": shadowCss(leaf.shadow, look.bb),
      padding: `${leaf.padding}px`,
      "text-align": leaf.align,
      "font-family": fonts.body,
      margin: blockMargin(leaf),
      ...blockBoxCss(leaf, look.bb),
    }) as CSSProperties;
    return (
      <div {...dnd} style={{ ...card, ...edit }}>
        <Icon size={28} color={leaf.iconColor} aria-hidden />
        <h3 style={{ margin: "8px 0", fontFamily: fonts.heading, fontSize: leaf.size + 4, fontWeight: 700 }}>{leaf.title}</h3>
        <p style={{ margin: 0, fontSize: leaf.size, lineHeight: 1.5 }}>{leaf.description}</p>
      </div>
    );
  }

  if (leaf.type === "video") {
    const src = embedUrl(leaf.url);
    return (
      <div {...dnd} style={wrapper(leaf.align)}>
        {src ? (
          <span
            style={{
              display: "inline-block",
              width: `${leaf.width}%`,
              aspectRatio: leaf.aspect,
              borderRadius: leaf.radius,
              overflow: "hidden",
            }}
          >
            <iframe
              src={src}
              title={leaf.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: 0, display: "block" }}
            />
          </span>
        ) : (
          <span className="inline-flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-slate-400 text-sm text-slate-500">
            [ Vídeo — cole o link de embed no painel à direita ]
          </span>
        )}
      </div>
    );
  }

  if (leaf.type === "countdown") {
    return (
      <div {...dnd} style={wrapper(leaf.align)}>
        <CountdownView leaf={leaf} fonts={fonts} />
      </div>
    );
  }

  return (
    <div {...dnd} style={wrapper(undefined)}>
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-400 bg-white/90 px-6 text-center">
        <span className="text-sm font-bold text-slate-700">
          [ Formulário RD Station será inserido aqui ]
        </span>
        <span className="text-xs text-slate-500">
          {leaf.snippet ? "Snippet colado e preservado no export." : "Cole o snippet no painel à direita."}
        </span>
      </div>
    </div>
  );
}

function CountdownView({ leaf, fonts }: { leaf: CountdownBlock; fonts: PageFonts }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = countdownMsLeft(leaf, now);
  if (left <= 0) {
    return (
      <span style={{ fontSize: leaf.size / 2, fontWeight: 700, color: leaf.color }}>
        {leaf.expiredText}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", fontFamily: fonts.body }}>
      {countdownUnits(leaf.mode, left).map((unit) => (
        <span
          key={unit.key}
          className={btnAnimClass(leaf.animation)}
          style={{
            ...buttonReactStyle({ variant: leaf.variant ?? "filled", bgColor: leaf.bgColor, color: leaf.color }),
            color: leaf.color,
            borderRadius: leaf.radius,
            padding: "12px 18px",
            minWidth: leaf.size * 2,
            textAlign: "center",
            display: "inline-block",
          }}
        >
          <span style={{ display: "block", fontFamily: fonts.heading, fontSize: leaf.size, fontWeight: 700, lineHeight: 1.1 }}>
            {pad(unit.value)}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 16,
              fontWeight: 600,
              color: leaf.accentColor,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {unit.label}
          </span>
        </span>
      ))}
    </span>
  );
}

function RowView({
  row,
  section,
  look: base,
  sheet,
  selectedId,
  onSelect,
  onMove,
}: { row: RowBlock; section: SectionBlock; look: Look; sheet: Sheet } & Omit<CanvasProps, "page" | "device" | "showHidden">) {
  const look: Look = base.bb ? { ...base, container: textContext(rowSamples(section, row)) } : base;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/gove-row", row.id);
      }}
      className={["gove-row", bgAnimClass(row.box.animation), sheet.classOf(row.id)].filter(Boolean).join(" ")}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("text/gove-row")) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        const dragId = e.dataTransfer.getData("text/gove-row");
        if (!dragId || dragId === row.id) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        onMove?.(dragId, row.id, after ? "after" : "before", "row");
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(row.id);
      }}
      style={{
        ...(reactStyle(rowCss(row, look.bb)) as CSSProperties),
        ...outline(selectedId === row.id),
        cursor: "grab",
      }}
    >
      <DecorLayers box={row.box} />
      {row.columns.map((col, index) => (
        <div
          key={col.id}
          className="gove-col"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(col.id);
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("text/gove-leaf")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            const dragId = e.dataTransfer.getData("text/gove-leaf");
            if (!dragId) return;
            e.preventDefault();
            e.stopPropagation();
            onMove?.(dragId, col.id, "after", "leaf");
          }}
          style={reactStyle(columnCss(row, index)) as CSSProperties}
        >
          {col.children.length ? (
            col.children.map((leaf) => (
              <LeafView key={leaf.id} leaf={leaf} look={look} selectedId={selectedId} onSelect={onSelect} onMove={onMove} />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
              Coluna vazia — clique em um bloco na biblioteca
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Canvas({ page, selectedId, onSelect, device, onMove, showHidden = true }: CanvasProps) {
  const mobile = device !== "desktop";
  const sheet = pageSheet(page);
  const bb = isBB(page);
  const look: Look = { bb, fonts: pageFonts(page.identity), device, sheet, showHidden };
  const logo = bb && page.bbLogo?.src ? page.bbLogo : null;
  const logoBox = logo ? logoLayout(logo) : null;
  const cursor = normalizeCursor(page.cursor);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const follower = cursor.mode === "follower" && !!cursor.url.trim();
  const off = cursor.hotspot === "center" ? cursor.size / 2 : 0;
  return (
    <div
      className="gove-lp relative mx-auto w-full bg-white shadow-sm transition-all"
      data-identity={bb ? "bb" : undefined}
      data-device={device}
      style={{ maxWidth: device === "desktop" ? desktopCanvasWidth(page.layout) : DEVICE_WIDTH[device], fontFamily: bb ? look.fonts.body : "Montserrat, sans-serif" }}
      onMouseMove={
        follower
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
            }
          : undefined
      }
      onMouseLeave={follower ? () => setPos(null) : undefined}
    >
      <style>{`${sheet.toCanvas(device)}\n${ANIMATION_CSS}\n${cursorCss(page.cursor)}\n${followerCss(page.cursor)}${showHidden ? `\n${HIDDEN_CSS}` : ""}${bb ? `\n${BB_FONT_FACE_CSS}` : ""}`}</style>
      {logo && logoBox ? (
        <header
          className="bb-logo"
          style={{
            backgroundColor: logo.bg,
            padding: `${logoBox.clear}px ${Math.max(logoBox.clear, mobile ? 16 : 24)}px`,
            textAlign: logo.align,
          }}
        >
          <img
            src={logo.src}
            alt="Banco do Brasil"
            width={logoBox.width}
            style={{ display: "inline-block", width: logoBox.width, maxWidth: "none", height: "auto", verticalAlign: "middle" }}
          />
        </header>
      ) : null}
      {follower && pos ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-50"
          style={{
            width: cursor.size,
            height: cursor.size,
            left: pos.x - off,
            top: pos.y - off,
            background: `url("${cursor.url}") center/contain no-repeat`,
          }}
        />
      ) : null}
      {page.sections.map((section: SectionBlock) => {
        const hidden = hiddenOn(section.hide, device);
        if (hidden && !showHidden) return null;
        return (
        <section
          key={section.id}
          id={sectionAnchor(section)}
          {...(hidden ? { "data-gove-hidden": hiddenLabel(section.hide) ?? "" } : {})}
          className={[bgAnimClass(section.box.animation), sheet.classOf(section.id)].filter(Boolean).join(" ") || undefined}
          onClick={() => onSelect(section.id)}
          style={{
            ...boxStyle(section.box, bb),
            ...outline(selectedId === section.id),
            cursor: cursor.mode !== "default" && cursor.url.trim() ? "inherit" : "pointer",
          }}
        >
          <DecorLayers box={section.box} />
          <div className="gove-container" style={reactStyle(containerCss(page, section)) as CSSProperties}>
            {section.children.map((row) => (
              <RowView
                key={row.id}
                row={row}
                section={section}
                look={look}
                sheet={sheet}
                selectedId={selectedId}
                onSelect={onSelect}
                onMove={onMove}
              />
            ))}
          </div>
        </section>
        );
      })}
      <div id={END_ANCHOR} aria-hidden />
    </div>
  );
}