import { useEffect, useRef } from 'react';

/**
 * Skyline noturno desenhado em canvas (sem imagens externas): prédios em
 * camadas, janelas acesas e letreiros neon. Determinístico — a mesma cidade em
 * toda renderização. Fica atrás de um overlay escuro para não competir com o texto.
 */
type Props = { className?: string; seed?: number; density?: number };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, density: number) {
  const rand = rng(seed);
  ctx.clearRect(0, 0, w, h);

  // Neblina de luz da cidade no horizonte
  const haze = ctx.createLinearGradient(0, h * 0.35, 0, h);
  haze.addColorStop(0, 'rgba(74, 0, 224, 0)');
  haze.addColorStop(0.7, 'rgba(74, 0, 224, 0.22)');
  haze.addColorStop(1, 'rgba(255, 199, 44, 0.08)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);

  const layers = [
    { color: '#2B2358', min: 0.25, max: 0.55, width: [28, 70], windows: 0.05 },
    { color: '#211B47', min: 0.35, max: 0.75, width: [36, 90], windows: 0.09 },
    { color: '#15112F', min: 0.45, max: 0.92, width: [44, 110], windows: 0.14 },
  ];

  for (const [li, L] of layers.entries()) {
    let x = -20;
    while (x < w + 20) {
      const bw = L.width[0] + rand() * (L.width[1] - L.width[0]);
      const bh = h * (L.min + rand() * (L.max - L.min)) * density;
      const top = h - bh;
      ctx.fillStyle = L.color;
      ctx.fillRect(x, top, bw, bh);
      // Antena ocasional
      if (rand() > 0.82) {
        ctx.fillRect(x + bw / 2 - 1, top - 18, 2, 18);
        ctx.fillStyle = 'rgba(255, 90, 120, 0.9)';
        ctx.fillRect(x + bw / 2 - 1.5, top - 20, 3, 3);
      }
      // Janelas acesas
      for (let wy = top + 8; wy < h - 6; wy += 9) {
        for (let wx = x + 5; wx < x + bw - 6; wx += 8) {
          if (rand() < L.windows) {
            const r = rand();
            ctx.fillStyle = r < 0.55 ? 'rgba(255, 199, 44, 0.55)' : r < 0.85 ? 'rgba(234, 234, 234, 0.35)' : 'rgba(157, 140, 255, 0.6)';
            ctx.fillRect(wx, wy, 3, 4);
          }
        }
      }
      // Letreiro neon vertical na camada da frente
      if (li === 2 && rand() > 0.78 && bh > h * 0.35) {
        const neon = rand() > 0.5 ? '#4A00E0' : '#FFC72C';
        ctx.save();
        ctx.shadowColor = neon;
        ctx.shadowBlur = 14;
        ctx.fillStyle = neon;
        ctx.globalAlpha = neon === '#FFC72C' ? 0.55 : 0.9;
        ctx.fillRect(x + bw - 9, top + 14, 3, Math.min(90, bh * 0.4));
        ctx.restore();
      }
      x += bw + rand() * 6;
    }
  }
}

export function CityBackdrop({ className, seed = 7, density = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, width, height, seed, density);
    };
    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [seed, density]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
