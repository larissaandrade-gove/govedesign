import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { LOGO_WEBP } from '@/lib/assets.ts';
import { PT_TO, barGeometry, type FontKey, type Scene } from '@/lib/scene.ts';

const FONT_CSS: Record<FontKey, CSSProperties> = {
  'display-bold': { fontFamily: 'Montserrat, Helvetica, Arial, sans-serif', fontWeight: 700 },
  'display-semibold': { fontFamily: 'Montserrat, Helvetica, Arial, sans-serif', fontWeight: 600 },
  'body-regular': { fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontWeight: 400 },
  'body-semibold': { fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontWeight: 600 },
};

/**
 * Prévia fiel de uma cena (A4 em mm ou slide em px): as mesmas linhas, posições e
 * fontes do arquivo exportado, em escala para a largura disponível.
 */
export function ScenePreview({ scene, label, className = '' }: { scene: Scene; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const s = width / scene.w;
  const k = PT_TO[scene.unit];
  return (
    <div ref={ref} className={`w-full ${className}`}>
      <div
        role="img"
        aria-label={label}
        className="relative overflow-hidden shadow-md"
        style={{ width: '100%', aspectRatio: `${scene.w} / ${scene.h}`, background: scene.background }}
      >
        {width > 0 &&
          scene.items.map((it, i) => {
            if (it.type === 'rect')
              return <div key={i} aria-hidden className="absolute" style={{ left: it.x * s, top: it.y * s, width: it.w * s, height: it.h * s, background: it.fill, borderRadius: (it.radius ?? 0) * s }} />;
            if (it.type === 'image')
              return <img key={i} alt="" aria-hidden src={LOGO_WEBP[it.file]} className="absolute" style={{ left: it.x * s, top: it.y * s, width: it.w * s, height: it.h * s }} />;
            if (it.type === 'text')
              return (
                <div key={i} className="absolute" style={{ left: it.x * s, top: it.y * s, width: it.w * s, color: it.color, fontSize: it.size * k * s, lineHeight: `${it.lineHeight * s}px`, textAlign: it.align ?? 'left', ...FONT_CSS[it.font] }}>
                  {it.lines.map((l, j) => (
                    <div key={j} style={{ whiteSpace: 'pre', height: it.lineHeight * s }}>
                      {l}
                    </div>
                  ))}
                </div>
              );
            const g = barGeometry(it, k);
            const fs = it.labelSize * k * s;
            return (
              <svg key={i} aria-hidden className="absolute left-0 top-0 overflow-visible" width={scene.w * s} height={scene.h * s}>
                {g.bars.map((b, j) => (
                  <g key={j}>
                    {b.h > 0 && <rect x={b.x * s} y={b.y * s} width={b.w * s} height={b.h * s} fill={b.color} />}
                    <text x={(b.x + b.w / 2) * s} y={(b.y - 1 * k) * s} textAnchor="middle" fill={it.ink} style={{ ...FONT_CSS['body-semibold'], fontSize: fs } as CSSProperties}>
                      {b.label}
                    </text>
                  </g>
                ))}
                <rect x={it.x * s} y={g.baseline * s} width={it.w * s} height={Math.max(1, 0.6 * k * s)} fill={it.ink} />
                {g.names.map((n, j) => (
                  <text key={j} x={n.x * s} y={(g.baseline + 1) * s + fs} textAnchor="middle" fill={it.ink} style={{ ...FONT_CSS['body-regular'], fontSize: fs } as CSSProperties}>
                    {n.text}
                  </text>
                ))}
              </svg>
            );
          })}
      </div>
    </div>
  );
}
