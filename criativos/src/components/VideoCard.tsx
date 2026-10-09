import { useEffect, useRef, useState } from "react";
import { Check, Download, Film, Palette, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { validateCreative, type ComplianceReport } from "@/lib/creative/brand";
import { renderCreative, type CreativeFormat, type CreativeSpec } from "@/lib/creative/renderer";
import {
  VIDEO_DURATION,
  VIDEO_FORMATS,
  animationSpec,
  drawVideoFrame,
  renderMp4,
} from "@/lib/creative/video";

type Props = {
  spec: CreativeSpec;
  index: number;
  onReload: (index: number) => void;
  onRecolor: (index: number) => void;
};

const FORMAT_LABEL: Record<string, string> = {
  "feed-45": "1080x1350",
  "story-916": "1080x1920",
  "square-11": "1080x1080",
};

const PREVIEW_SCALE = 0.3;
const PREVIEW_FPS = 20;

export function VideoCard({ spec, index, onReload, onRecolor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<CreativeFormat>("feed-45");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Só anima o que está realmente visível na tela.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Preview animado em loop (Ken Burns + fade-in de texto e CTA), em baixa resolução.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!visible) {
      // Mantém o quadro final estático quando o card sai da viewport.
      drawVideoFrame(canvas, spec, preview, VIDEO_DURATION, PREVIEW_SCALE);
      return;
    }
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const frameGap = 1000 / PREVIEW_FPS;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < frameGap) return;
      last = now;
      if (document.hidden || !canvasRef.current) return;
      const t = ((now - start) / 1000) % (VIDEO_DURATION + 1.5);
      drawVideoFrame(canvasRef.current, spec, preview, Math.min(t, VIDEO_DURATION), PREVIEW_SCALE);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spec, preview, visible]);

  // Validação de marca no estado final da animação (mesma função do modo Imagem).
  useEffect(() => {
    const probe = document.createElement("canvas");
    const result = renderCreative(probe, {
      ...animationSpec(spec, preview, VIDEO_DURATION),
      renderScale: 0.25,
    });
    setReport(
      validateCreative({
        logoIsWordmark: true,
        usedColors: result.usedColors,
        textColor: result.textColor,
        textBackgroundColor: result.textBackgroundColor,
        ctaText: spec.cta,
        headline: spec.headline,
        subhead: spec.subhead,
      }),
    );
  }, [spec, preview]);

  const downloadFormat = async (format: CreativeFormat) => {
    if (busy) return;
    if (!report?.pass) {
      toast.error("Peça fora do manual de marca — recarregue a combinação.");
      return;
    }
    setBusy(format);
    const id = toast.loading(`Gravando ${FORMAT_LABEL[format]} (15s)...`);
    try {
      const name = `gove-video-${index + 1}-${FORMAT_LABEL[format]}`;
      const blob = await renderMp4(spec, format, name, (r) =>
        toast.loading(`Gravando ${FORMAT_LABEL[format]} — ${Math.round(r * 100)}%`, { id }),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${FORMAT_LABEL[format]} exportado em MP4`, { id });
    } catch {
      toast.error("Não foi possível gerar o MP4.", { id });
    } finally {
      setBusy(null);
    }
  };

  const downloadAllFormats = async () => {
    for (const f of VIDEO_FORMATS) {
      await downloadFormat(f);
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="relative bg-muted">
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 pt-2 text-[11px]">
        <span className="font-medium text-muted-foreground">
          {spec.layout} · 15s · sem áudio
        </span>
        {report?.pass && (
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <Check className="size-3" aria-hidden="true" />
            Conforme com o manual de marca
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 px-3 pt-2">
        {VIDEO_FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={preview === f}
            onClick={() => setPreview(f)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
              preview === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-secondary"
            }`}
          >
            {FORMAT_LABEL[f]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 p-3">
        <Button
          size="sm"
          onClick={() => downloadFormat(preview)}
          disabled={!!busy}
          className="min-h-11 flex-1"
        >
          <Download aria-hidden="true" />
          MP4 {FORMAT_LABEL[preview]}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={downloadAllFormats}
          disabled={!!busy}
          className="min-h-11 flex-1"
          title="Gera os 3 formatos em MP4"
        >
          <Film aria-hidden="true" />
          3 formatos
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRecolor(index)}
          disabled={!!busy}
          className="min-h-11"
          aria-label={`Aleatorizar cores do vídeo ${index + 1}`}
          title="Aleatorizar apenas as cores"
        >
          <Palette aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReload(index)}
          disabled={!!busy}
          className="min-h-11"
          aria-label={`Recarregar combinação do vídeo ${index + 1}`}
          title="Sortear nova combinação de texto"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
