// Preview em tempo real (Fabric.js) — desenha exatamente os elementos que o
// servidor coloca no PDF, mais as guias de sangria, corte e área de segurança.
import { useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, FabricObject, FabricText, Gradient, Group, Rect, loadSVGFromString, util } from 'fabric';
import QRCode from 'qrcode';
import { COLORS, FONT_FAMILY, gradientLine } from '@/lib/studio';

/* eslint-disable @typescript-eslint/no-explicit-any */
type LayoutResult = any;
type El = any;

const ptToMm = (pt: number) => pt / 2.834645669;
const hex = (key: string) => (COLORS as Record<string, { hex: string }>)[key].hex;
const BASELINE_FRACTION = 1.13 - 0.222; // posição da linha de base no FabricText (lineHeight 1)

type Props = {
  result: LayoutResult;
  imageUrl: (el: El) => string | null;
  errorBlocks: Set<string>;
  onMove: (blockId: string, dx: number, dy: number) => void;
};

const base = { originX: 'left' as const, originY: 'top' as const, objectCaching: false };

async function svgObject(svg: string, x: number, y: number, scale: number) {
  const { objects, options } = await loadSVGFromString(svg);
  const g = util.groupSVGElements(objects.filter(Boolean) as FabricObject[], options);
  const br = g.getBoundingRect();
  g.set({ ...base, left: x + br.left * scale, top: y + br.top * scale, scaleX: scale, scaleY: scale });
  return g;
}

async function toFabric(e: El, k: number, imageUrl: Props['imageUrl']): Promise<FabricObject[]> {
  const x = e.x * k;
  const y = e.y * k;
  const w = e.w * k;
  const h = e.h * k;
  switch (e.type) {
    case 'gradient': {
      const [x1, y1, x2, y2] = gradientLine(e);
      return [
        new Rect({
          ...base, left: x, top: y, width: w, height: h,
          fill: new Gradient({
            type: 'linear',
            gradientUnits: 'pixels',
            coords: { x1: (x1 - e.x) * k, y1: (y1 - e.y) * k, x2: (x2 - e.x) * k, y2: (y2 - e.y) * k },
            colorStops: [{ offset: 0, color: hex(e.from) }, { offset: 1, color: hex(e.to) }],
          }),
        }),
      ];
    }
    case 'rect':
      return [new Rect({ ...base, left: x, top: y, width: w, height: h, rx: (e.r ?? 0) * k, ry: (e.r ?? 0) * k, fill: hex(e.fill) })];
    case 'text': {
      const size = ptToMm(e.size) * k;
      return e.lines.map(
        (l: El) =>
          new FabricText(l.text, {
            ...base, left: l.x * k, top: l.baseline * k - size * BASELINE_FRACTION,
            fontFamily: FONT_FAMILY, fontWeight: { regular: 400, semibold: 600, bold: 700, black: 900 }[e.weight as string],
            fontSize: size, lineHeight: 1, fill: hex(e.color),
          }),
      );
    }
    case 'icon': {
      const inner = e.inner
        ? `<g transform="translate(${e.inner.offset.join(' ')}) scale(${e.inner.scale})" stroke-width="${e.lineWidth / e.inner.scale}">${e.inner.paths.map((d: string) => `<path d="${d}"/>`).join('')}</g>`
        : '';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><g fill="none" stroke="${hex(e.stroke)}" stroke-opacity="${e.opacity}" stroke-width="${e.lineWidth}" stroke-linecap="round" stroke-linejoin="round">${e.paths.map((d: string) => `<path d="${d}"/>`).join('')}${inner}</g></svg>`;
      return [await svgObject(svg, x, y, w / 24)];
    }
    case 'qr': {
      const qr = QRCode.create(e.data, { errorCorrectionLevel: 'H' });
      const n = qr.modules.size;
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) d += `M${c} ${r}h1.02v1.02h-1.02z`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}"><path fill="${hex(e.color)}" d="${d}"/></svg>`;
      return [await svgObject(svg, x, y, w / n)];
    }
    case 'mockup-screen': {
      const url = imageUrl(e);
      if (!url) {
        const ph = new Rect({ ...base, left: x, top: y, width: w, height: h, rx: e.r * k, ry: e.r * k, fill: hex(e.fill) });
        const label = new FabricText('Imagem do app', { ...base, fontFamily: 'Inter, sans-serif', fontSize: Math.max(9, w / 9), fill: '#5C6B73' });
        label.set({ left: x + (w - (label.width ?? 0)) / 2, top: y + h / 2 - (label.height ?? 0) / 2 });
        return [ph, label];
      }
      const img = await FabricImage.fromURL(url);
      const W = img.width ?? 1;
      const H = img.height ?? 1;
      const cropW = Math.min(W, Math.floor((H * 9) / 16));
      const cropH = Math.floor((cropW * 16) / 9);
      img.set({
        ...base,
        cropX: (W - cropW) * (e.focus?.x ?? 0.5),
        cropY: (H - cropH) * (e.focus?.y ?? 0.5),
        width: cropW, height: cropH, left: x, top: y, scaleX: w / cropW, scaleY: h / cropH,
        clipPath: new Rect({ originX: 'center', originY: 'center', width: cropW, height: cropH, rx: (e.r * k) / (w / cropW), ry: (e.r * k) / (h / cropH) }),
      });
      return [img];
    }
    case 'logo': {
      if (e.missing) {
        const box = new Rect({ ...base, left: x, top: y, width: w, height: h, fill: '', stroke: '#C2410C', strokeDashArray: [5, 3], strokeWidth: 1.5 });
        const label = new FabricText({ gove: 'Logo Gove', prefeitura: 'Logo prefeitura', bb: 'Logo BB' }[e.which as string] ?? 'Logo', {
          ...base, fontFamily: 'Inter, sans-serif', fontSize: Math.max(8, Math.min(h * 0.28, w / 8)), fill: '#9A3412',
        });
        label.set({ left: x + (w - (label.width ?? 0)) / 2, top: y + (h - (label.height ?? 0)) / 2 });
        return [box, label];
      }
      const url = imageUrl(e);
      if (!url) return [];
      const img = await FabricImage.fromURL(url);
      img.set({ ...base, left: x, top: y, scaleX: w / (img.width ?? 1), scaleY: h / (img.height ?? 1) });
      return [img];
    }
    default:
      return [];
  }
}

export function Preview({ result, imageUrl, errorBlocks, onMove }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

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
      const layers: FabricObject[] = [];
      for (const b of result.blocks) {
        const objs = (await Promise.all(b.elements.map((e: El) => toFabric(e, k, imageUrl)))).flat();
        if (cancelled) return;
        if (b.movable && objs.length) {
          const g = new Group(objs, { hasControls: false, hoverCursor: 'move', borderColor: '#FFC72C', padding: 2, objectCaching: false });
          info.set(g, { id: b.id, left: g.left ?? 0, top: g.top ?? 0, bbox: b.bbox });
          layers.push(g);
        } else {
          objs.forEach((o) => o.set({ selectable: false, evented: false }));
          layers.push(...objs);
        }
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
