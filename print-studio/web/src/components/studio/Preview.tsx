// Preview em tempo real (Fabric.js) — desenha exatamente os elementos que o
// servidor coloca no PDF (mesmo desenhista: shared/draw.js), mais as guias de
// sangria, corte e área de segurança. Cada bloco é um objeto do Fabric que
// pinta seus elementos em vetor no canvas; os blocos móveis podem ser arrastados.
import { useEffect, useRef, useState } from 'react';
import { Canvas, FabricObject, Rect } from 'fabric';
import QRCode from 'qrcode';
import { drawElements, walkElements } from '../../../../shared/draw.js';
import { COLORS, FONT_WEIGHTS, ptToMm } from '../../../../shared/tokens.js';
import { FONT_FAMILY } from '@/lib/studio';

/* eslint-disable @typescript-eslint/no-explicit-any */
type LayoutResult = any;
type El = any;
type Img = CanvasImageSource & { width: number; height: number };

const hex = (key: string) => (COLORS as Record<string, { hex: string }>)[key].hex;
const qrCache = new Map<string, any>();
const qrModules = (data: string) => {
  if (!qrCache.has(data)) qrCache.set(data, QRCode.create(data, { errorCorrectionLevel: 'H' }).modules);
  return qrCache.get(data);
};

type Props = {
  result: LayoutResult;
  imageUrl: (el: El) => string | null;
  errorBlocks: Set<string>;
  onMove: (blockId: string, dx: number, dy: number) => void;
};

const base = { originX: 'left' as const, originY: 'top' as const, objectCaching: false };

// ---------------------------------------------------------------- imagens
const imgCache = new Map<string, Promise<Img | null>>();
function loadImage(url: string): Promise<Img | null> {
  if (!imgCache.has(url)) {
    imgCache.set(
      url,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      }),
    );
  }
  return imgCache.get(url)!;
}

// ---------------------------------------------------------------- pintor canvas
function canvasPainter(ctx: CanvasRenderingContext2D, images: Map<El, Img>) {
  const paintOf = (paint: any) => {
    if (typeof paint === 'string') return hex(paint);
    const g =
      paint.kind === 'radial'
        ? ctx.createRadialGradient(paint.cx, paint.cy, 0, paint.cx, paint.cy, paint.r)
        : ctx.createLinearGradient(paint.x1, paint.y1, paint.x2, paint.y2);
    for (const [o, k] of paint.stops) g.addColorStop(o, hex(k));
    return g;
  };
  return {
    save: () => ctx.save(),
    restore: () => ctx.restore(),
    translate: (x: number, y: number) => ctx.translate(x, y),
    rotate: (deg: number) => ctx.rotate((deg * Math.PI) / 180),
    scale: (sx: number, sy: number) => ctx.scale(sx, sy),
    fill(d: string, paint: any, o: { rule?: string; opacity?: number } = {}) {
      ctx.save();
      if (o.opacity != null) ctx.globalAlpha *= o.opacity;
      ctx.fillStyle = paintOf(paint);
      ctx.fill(new Path2D(d), o.rule === 'evenodd' ? 'evenodd' : 'nonzero');
      ctx.restore();
    },
    stroke(d: string, key: string, width: number, o: { opacity?: number } = {}) {
      ctx.save();
      if (o.opacity != null) ctx.globalAlpha *= o.opacity;
      ctx.strokeStyle = hex(key);
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(new Path2D(d));
      ctx.restore();
    },
    clip: (d: string) => ctx.clip(new Path2D(d)),
    text(str: string, x: number, y: number, weight: string, sizePt: number, key: string) {
      ctx.save();
      ctx.translate(x, y);
      const s = ptToMm(sizePt) / 100; // desenha a 100 px e escala (evita o piso de tamanho de fonte)
      ctx.scale(s, s);
      ctx.font = `${(FONT_WEIGHTS as Record<string, number>)[weight] ?? 400} 100px "${FONT_FAMILY}"`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = hex(key);
      ctx.fillText(str, 0, 0);
      ctx.restore();
    },
    image(e: El, x: number, y: number, w: number, h: number) {
      const img = images.get(e);
      if (!img) return;
      if (e.type === 'mockup-screen') {
        const aspect = w / h;
        const cropW = Math.min(img.width, img.height * aspect);
        const cropH = cropW / aspect;
        const sx = (img.width - cropW) * (e.focus?.x ?? 0.5);
        const sy = (img.height - cropH) * (e.focus?.y ?? 0.5);
        ctx.drawImage(img, sx, sy, cropW, cropH, x, y, w, h);
      } else ctx.drawImage(img, x, y, w, h);
    },
  };
}

/** Marcação só do preview: logo não cadastrado (tracejado com rótulo). */
function drawMissing(ctx: CanvasRenderingContext2D, elements: El[]) {
  for (const e of elements) {
    if (e.type !== 'logo' || !e.missing) continue;
    ctx.save();
    ctx.strokeStyle = '#C2410C';
    ctx.lineWidth = 0.35;
    ctx.setLineDash([1.6, 1]);
    ctx.strokeRect(e.x, e.y, e.w, e.h);
    const label = ({ gove: 'Logo Gove', prefeitura: 'Logo prefeitura', bb: 'Logo BB' } as Record<string, string>)[e.which] ?? 'Logo';
    const size = Math.max(1.6, Math.min(e.h * 0.28, e.w / 8));
    ctx.font = `500 ${size * 10}px Inter, sans-serif`;
    ctx.scale(0.1, 0.1);
    ctx.fillStyle = '#9A3412';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, (e.x + e.w / 2) * 10, (e.y + e.h / 2) * 10);
    ctx.restore();
  }
}

/** Objeto do Fabric que pinta um bloco do layout (em mm, escala k). */
class BlockObject extends FabricObject {
  block!: El;
  k = 1;
  images!: Map<El, Img>;
  _render(ctx: CanvasRenderingContext2D) {
    const bb = this.block.bbox;
    ctx.save();
    ctx.translate(-(this.width ?? 0) / 2, -(this.height ?? 0) / 2);
    ctx.scale(this.k, this.k);
    ctx.translate(-bb.x, -bb.y);
    drawElements(canvasPainter(ctx, this.images), this.block.elements, { qr: qrModules });
    drawMissing(ctx, this.block.elements);
    ctx.restore();
  }
}

export function Preview({ result, imageUrl, errorBlocks, onMove }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => {
    const c = new Canvas(elRef.current!, { selection: false, preserveObjectStacking: true, renderOnAddRemove: false });
    canvasRef.current = c;
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(wrapRef.current!);
    return () => {
      ro.disconnect();
      void c.dispose();
    };
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !result || !box.w || !box.h) return;
    let cancelled = false;
    const { page, trim, safe } = result;
    const k = Math.min(box.w / page.w, box.h / page.h);
    const info = new WeakMap<FabricObject, { id: string; left: number; top: number; bbox: El }>();

    (async () => {
      // Pré-carrega as imagens (logos, logomarca oficial, foto do mockup)
      const images = new Map<El, Img>();
      const pending: Promise<void>[] = [];
      for (const b of result.blocks) {
        for (const e of walkElements(b.elements)) {
          if (!((e.type === 'logo' && !e.missing) || (e.type === 'mockup-screen' && e.imageId))) continue;
          const url = imageUrl(e);
          if (url) pending.push(loadImage(url).then((img) => void (img && images.set(e, img))));
        }
      }
      await Promise.all(pending);
      if (cancelled) return;

      const layers: FabricObject[] = [];
      for (const b of result.blocks) {
        const o = new BlockObject({ ...base, left: b.bbox.x * k, top: b.bbox.y * k, width: b.bbox.w * k, height: b.bbox.h * k, strokeWidth: 0 });
        o.block = b;
        o.k = k;
        o.images = images;
        if (b.movable) {
          o.set({ hasControls: false, hoverCursor: 'move', borderColor: '#FFC72C', padding: 2 });
          info.set(o, { id: b.id, left: o.left ?? 0, top: o.top ?? 0, bbox: b.bbox });
        } else o.set({ selectable: false, evented: false });
        layers.push(o);
      }
      // Guias: sangria esmaecida, linha de corte e área de segurança tracejada
      const tint = { fill: 'rgba(26,21,58,0.55)', selectable: false, evented: false, ...base };
      const guides: FabricObject[] = [
        new Rect({ ...tint, left: 0, top: 0, width: page.w * k, height: trim.y * k }),
        new Rect({ ...tint, left: 0, top: (trim.y + trim.h) * k, width: page.w * k, height: (page.h - trim.y - trim.h) * k }),
        new Rect({ ...tint, left: 0, top: trim.y * k, width: trim.x * k, height: trim.h * k }),
        new Rect({ ...tint, left: (trim.x + trim.w) * k, top: trim.y * k, width: (page.w - trim.x - trim.w) * k, height: trim.h * k }),
        new Rect({ ...base, left: trim.x * k, top: trim.y * k, width: trim.w * k, height: trim.h * k, fill: '', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 1, selectable: false, evented: false }),
        new Rect({ ...base, left: safe.x * k, top: safe.y * k, width: safe.w * k, height: safe.h * k, fill: '', stroke: '#FFC72C', strokeDashArray: [6, 4], strokeWidth: 1, selectable: false, evented: false }),
      ];
      for (const b of result.blocks) {
        if (!errorBlocks.has(b.id)) continue;
        guides.push(new Rect({ ...base, left: b.bbox.x * k - 2, top: b.bbox.y * k - 2, width: b.bbox.w * k + 4, height: b.bbox.h * k + 4, fill: '', stroke: '#FF6B7A', strokeWidth: 2, selectable: false, evented: false }));
      }
      if (cancelled) return;
      c.clear();
      c.setDimensions({ width: Math.round(page.w * k), height: Math.round(page.h * k) });
      c.backgroundColor = '#0E0B22';
      [...layers, ...guides].forEach((o) => c.add(o));
      c.requestRenderAll();
    })();

    // Arraste limitado à área de segurança (bloqueio visual, não só no export)
    const clamp = (o: FabricObject) => {
      const i = info.get(o);
      if (!i) return null;
      let dx = ((o.left ?? 0) - i.left) / k;
      let dy = ((o.top ?? 0) - i.top) / k;
      const minDx = Math.min(0, safe.x - i.bbox.x);
      const maxDx = Math.max(0, safe.x + safe.w - (i.bbox.x + i.bbox.w));
      const minDy = Math.min(0, safe.y - i.bbox.y);
      const maxDy = Math.max(0, safe.y + safe.h - (i.bbox.y + i.bbox.h));
      dx = Math.min(maxDx, Math.max(minDx, dx));
      dy = Math.min(maxDy, Math.max(minDy, dy));
      o.set({ left: i.left + dx * k, top: i.top + dy * k });
      return { id: i.id, dx, dy };
    };
    const moving = (e: { target?: FabricObject }) => e.target && clamp(e.target);
    const modified = (e: { target?: FabricObject }) => {
      const r = e.target && clamp(e.target);
      if (r && (Math.abs(r.dx) > 0.05 || Math.abs(r.dy) > 0.05)) onMoveRef.current(r.id, r.dx, r.dy);
    };
    c.on('object:moving', moving);
    c.on('object:modified', modified);
    return () => {
      cancelled = true;
      c.off('object:moving', moving);
      c.off('object:modified', modified);
    };
  }, [result, box, imageUrl, errorBlocks]);

  return (
    <div ref={wrapRef} className="relative flex h-full w-full items-start justify-center overflow-hidden">
      <canvas ref={elRef} aria-label={`Preview de ${result?.layout?.name ?? 'layout'}`} />
    </div>
  );
}
