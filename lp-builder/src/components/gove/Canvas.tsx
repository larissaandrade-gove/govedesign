import { useEffect, useState, type CSSProperties } from "react";
import { END_ANCHOR, sectionAnchor } from "@/lib/gove/anchors";
import { getIcon } from "./icons";
import { buttonReactStyle } from "@/lib/gove/buttonStyle";
import { backgroundStyle } from "@/lib/gove/background";
import { imageFrameCss } from "@/lib/gove/imageFrame";
import { ANIMATION_CSS, bgAnimClass, btnAnimClass } from "@/lib/gove/animations";
import { cursorCss, followerCss, normalizeCursor } from "@/lib/gove/cursor";
import { embedUrl } from "@/lib/gove/video";
import { countdownMsLeft, countdownUnits, pad } from "@/lib/gove/countdown";
import type { CountdownBlock } from "@/lib/gove/types";
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

/** Identidade da página no canvas (fontes e, na BB, o fundo do contêiner). */
interface Look {
  bb: boolean;
  fonts: PageFonts;
  container?: BBContext;
}

const shadowCss = (shadow: BoxProps["shadow"], bb = false) => {
  const c = bb ? "51,51,189" : "11,32,39";
  return shadow === "sm"
    ? `0 2px 8px rgba(${c},.08)`
    : shadow === "md"
      ? `0 8px 24px rgba(${c},.16)`
      : undefined;
};

function boxStyle(box: BoxProps, bb = false): CSSProperties {
  return {
    ...(backgroundStyle(box) as CSSProperties),
    borderRadius: box.radius || undefined,
    border: box.borderWidth ? `${box.borderWidth}px solid ${box.borderColor}` : undefined,
    boxShadow: shadowCss(box.shadow, bb),
    padding: `${box.paddingY}px ${box.paddingX}px`,
  };
}

interface CanvasProps {
  page: PageContent;
  selectedId: string | null;
  onSelect: (id: string) => void;
  mobile: boolean;
  onMove?:
    | ((dragId: string, targetId: string, position: "before" | "after", kind: "leaf" | "row") => void)
    | undefined;
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

function LeafView(props: { leaf: Leaf; look: Look } & Omit<CanvasProps, "page" | "mobile">) {
  const { leaf, look } = props;
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

function LeafBody({
  leaf,
  look,
  selectedId,
  onSelect,
  onMove,
}: { leaf: Leaf; look: Look } & Omit<CanvasProps, "page" | "mobile">) {
  const { fonts } = look;
  const selected = selectedId === leaf.id;
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
  };
  const common: CSSProperties = { ...outline(selected), cursor: "grab", marginBottom: 16 };

  if (leaf.type === "text") {
    const Tag = leaf.tag;
    return (
      <Tag
        {...dnd}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onSelect(leaf.id);
        }}
        style={{
          ...common,
          fontFamily: leaf.tag === "p" ? fonts.body : fonts.heading,
          fontSize: leaf.size,
          fontWeight:
            leaf.tag === "p"
              ? fonts.bodyWeight(leaf.weight === "bold")
              : fonts.headingWeight(leaf.weight === "bold"),
          fontStyle: leaf.italic ? "italic" : "normal",
          color: leaf.color,
          textAlign: leaf.align,
          lineHeight: 1.4,
          margin: "0 0 16px",
        }}
      >
        {leaf.content}
      </Tag>
    );
  }

  if (leaf.type === "button") {
    return (
      <div
        {...dnd}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(leaf.id);
        }}
        style={{ ...common, textAlign: leaf.align }}
      >
        <span
          className={btnAnimClass(leaf.animation)}
          style={{
            display: "inline-block",
            borderRadius: leaf.radius,
            fontFamily: fonts.body,
            fontSize: leaf.size,
            fontWeight: fonts.bodyWeight(leaf.weight === "bold"),
            fontStyle: leaf.italic ? "italic" : "normal",
            textDecoration: look.bb && leaf.variant === "text" ? "underline" : undefined,
            color: leaf.color,
            ...buttonReactStyle(leaf),
          }}
        >
          {leaf.label}
        </span>
      </div>
    );
  }

  if (leaf.type === "image") {
    return (
      <div
        {...dnd}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(leaf.id);
        }}
        style={{ ...common, textAlign: leaf.align }}
      >
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
    return (
      <div
        {...dnd}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(leaf.id);
        }}
        style={{
          ...common,
          backgroundColor: leaf.bgColor,
          color: leaf.color,
          borderRadius: leaf.radius,
          border: leaf.borderWidth ? `${leaf.borderWidth}px solid ${leaf.borderColor}` : undefined,
          boxShadow: shadowCss(leaf.shadow, look.bb),
          padding: leaf.padding,
          textAlign: leaf.align,
          fontFamily: fonts.body,
        }}
      >
        <Icon size={28} color={leaf.iconColor} aria-hidden />
        <h3 style={{ margin: "8px 0", fontFamily: fonts.heading, fontSize: leaf.size + 4, fontWeight: 700 }}>{leaf.title}</h3>
        <p style={{ margin: 0, fontSize: leaf.size, lineHeight: 1.5 }}>{leaf.description}</p>
      </div>
    );
  }

  if (leaf.type === "video") {
    const src = embedUrl(leaf.url);
    return (
      <div
        {...dnd}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(leaf.id);
        }}
        style={{ ...common, textAlign: leaf.align }}
      >
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
      <div
        {...dnd}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(leaf.id);
        }}
        style={{ ...common, textAlign: leaf.align }}
      >
        <CountdownView leaf={leaf} fonts={fonts} />
      </div>
    );
  }

  return (
    <div
      {...dnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(leaf.id);
      }}
      style={{ ...common }}
    >
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
            ...buttonReactStyle({ variant: leaf.variant ?? "filled", bgColor: leaf.bgColor }),
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
  selectedId,
  onSelect,
  mobile,
  onMove,
}: { row: RowBlock; section: SectionBlock; look: Look } & Omit<CanvasProps, "page">) {
  const look: Look = base.bb ? { ...base, container: textContext(rowSamples(section, row)) } : base;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/gove-row", row.id);
      }}
      className={bgAnimClass(row.box.animation)}
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
        ...boxStyle(row.box, look.bb),
        ...outline(selectedId === row.id),
        display: "flex",
        flexDirection: mobile ? "column" : "row",
        gap: row.gap,
        alignItems:
          row.alignItems === "center"
            ? "center"
            : row.alignItems === "end"
              ? "flex-end"
              : row.alignItems === "stretch"
                ? "stretch"
                : "flex-start",
        cursor: "grab",
      }}
    >
      {row.columns.map((col) => (
        <div
          key={col.id}
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
          style={{ flex: "1 1 0", minWidth: 0, width: mobile ? "100%" : undefined }}
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

export function Canvas({ page, selectedId, onSelect, mobile, onMove }: CanvasProps) {
  const bb = isBB(page);
  const look: Look = { bb, fonts: pageFonts(page.identity) };
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
      style={{ maxWidth: mobile ? 390 : 1120, fontFamily: bb ? look.fonts.body : "Montserrat, sans-serif" }}
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
      <style>{`${ANIMATION_CSS}\n${cursorCss(page.cursor)}\n${followerCss(page.cursor)}${bb ? `\n${BB_FONT_FACE_CSS}` : ""}`}</style>
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
      {page.sections.map((section: SectionBlock) => (
        <section
          key={section.id}
          id={sectionAnchor(section)}
          className={bgAnimClass(section.box.animation)}
          onClick={() => onSelect(section.id)}
          style={{
            ...boxStyle(section.box, bb),
            ...outline(selectedId === section.id),
            cursor: cursor.mode !== "default" && cursor.url.trim() ? "inherit" : "pointer",
          }}
        >
          {section.children.map((row) => (
            <RowView
              key={row.id}
              row={row}
              section={section}
              look={look}
              selectedId={selectedId}
              onSelect={onSelect}
              mobile={mobile}
              onMove={onMove}
            />
          ))}
        </section>
      ))}
      <div id={END_ANCHOR} aria-hidden />
    </div>
  );
}