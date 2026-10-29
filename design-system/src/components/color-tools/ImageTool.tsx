import { useMemo, useRef, useState } from 'react';
import { ImageSquare, UploadSimple } from '@phosphor-icons/react';
import { extractPalette, nearestBrand, type Hex } from '../../lib/color';
import { ExportMenu, Swatch, pill } from './shared';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 128; // a imagem é reduzida antes da extração: rápido e sem travar a página

/** Lê a imagem no navegador (Canvas reduzido) e devolve os pixels RGBA. */
async function pixelsOf(file: File): Promise<Uint8ClampedArray> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Não foi possível abrir a imagem.'));
      i.src = url;
    });
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas indisponível neste navegador.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Paleta de uma imagem levada para a paleta: cada cor dominante vira a cor
 * permitida mais próxima (ΔE 2000), sem repetir; a cor original fica só como
 * referência.
 */
export function ImageTool({ onUse }: { onUse: (hex: Hex) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [colors, setColors] = useState<Hex[]>([]);
  const [count, setCount] = useState(6);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  // Cor permitida → cores da imagem que caíram nela (na ordem de frequência)
  const mapped = useMemo(() => {
    const by = new Map<Hex, { hex: Hex; deltaE: number }[]>();
    for (const c of colors) {
      const n = nearestBrand(c);
      by.set(n.hex, [...(by.get(n.hex) ?? []), { hex: c, deltaE: n.deltaE }]);
    }
    return [...by].map(([hex, from]) => ({ hex, from }));
  }, [colors]);
  const allowed = mapped.map((m) => m.hex);

  async function load(f: File | undefined, n = count) {
    if (!f) return;
    setError('');
    if (!f.type.startsWith('image/')) return setError('Envie um arquivo de imagem (PNG, JPG, WebP, SVG…).');
    if (f.size > MAX_BYTES) return setError('Imagem acima de 10 MB.');
    setBusy(true);
    try {
      setFile(f);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(f);
      });
      setColors(extractPalette(await pixelsOf(f), n));
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível ler a imagem.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-space-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          load(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center justify-center gap-space-1 rounded-lg border-2 border-dashed p-space-3 text-center transition-colors ${drag ? 'border-primary bg-secondary/40' : 'border-secondary'}`}
      >
        {preview ? <img src={preview} alt="Imagem enviada" className="max-h-48 rounded-md object-contain" /> : <ImageSquare className="size-10 text-text-muted" aria-hidden />}
        <p className="text-caption text-text-secondary">Arraste uma imagem para cá ou</p>
        <button type="button" onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-secondary px-space-2 text-caption font-semibold text-text-primary hover:border-primary">
          <UploadSimple className="size-4" aria-hidden /> Escolher imagem
        </button>
        <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => load(e.target.files?.[0])} aria-label="Imagem para extrair a paleta" />
        <p className="text-[11px] text-text-muted">Processada só no seu navegador · até 10 MB</p>
      </div>
      {error && (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      )}
      {busy && <p className="text-caption text-text-secondary">Extraindo cores…</p>}
      {colors.length > 0 && (
        <section className="flex flex-col gap-space-1" aria-label="Paleta da imagem">
          <div className="flex flex-wrap items-center gap-space-1" role="group" aria-label="Quantidade de cores">
            {[4, 6, 8].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={count === n}
                onClick={() => {
                  setCount(n);
                  load(file ?? undefined, n);
                }}
                className={pill(count === n)}
              >
                {n} cores
              </button>
            ))}
          </div>
          <p className="text-caption text-text-secondary">
            {colors.length} cores dominantes na imagem → {allowed.length} {allowed.length === 1 ? 'cor' : 'cores'} da paleta (a mais próxima de cada uma). O original aparece só como referência.
          </p>
          <div className="grid grid-cols-2 gap-space-1 sm:grid-cols-4">
            {mapped.map((m) => (
              <div key={m.hex} className="flex min-w-0 flex-col gap-1">
                <Swatch hex={m.hex} big />
                <span className="flex flex-wrap items-center gap-1 px-1 text-[11px] text-text-secondary">
                  Na imagem:
                  {m.from.map((f) => (
                    <span key={f.hex} className="inline-flex items-center gap-0.5 font-mono" title={`${f.hex.toUpperCase()} · ΔE ${f.deltaE.toLocaleString('pt-BR')} da cor da paleta`}>
                      <span className="size-3 rounded-sm border border-text-primary/25" style={{ background: f.hex }} aria-hidden />
                      {f.hex.toUpperCase()}
                    </span>
                  ))}
                </span>
                <button type="button" onClick={() => onUse(m.hex)} className="min-h-11 rounded-md text-caption font-semibold text-highlight hover:underline">
                  Usar como base
                </button>
              </div>
            ))}
          </div>
          <ExportMenu data={{ name: 'paleta da imagem', colors: allowed }} colors={allowed} />
        </section>
      )}
    </div>
  );
}
