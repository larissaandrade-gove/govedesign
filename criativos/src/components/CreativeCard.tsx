import { useEffect, useRef, useState } from "react";
import { Check, Download, Palette, RefreshCw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { validateCreative, type ComplianceReport } from "@/lib/creative/brand";
import { buildAltText } from "@/lib/creative/alt";
import { renderCreative, type CreativeSpec } from "@/lib/creative/renderer";


type Props = {
  spec: CreativeSpec;
  index: number;
  onReload: (index: number) => void;
  onRecolor: (index: number) => void;
};

export function CreativeCard({ spec, index, onReload, onRecolor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const draw = () => {
      if (cancelled || !canvasRef.current) return;
      const result = renderCreative(canvasRef.current, spec);
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
    };
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(draw).catch(draw);
    } else {
      draw();
    }
    return () => {
      cancelled = true;
    };
  }, [spec]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gove-criativo-${index + 1}-${canvas.width}x${canvas.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const copyAlt = async () => {
    await navigator.clipboard.writeText(buildAltText(spec));
    toast.success("Texto alternativo copiado para as redes");
  };


  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="relative bg-muted">
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 pt-2 text-[11px]">
        <span className="font-medium text-muted-foreground">{spec.layout}</span>
        {report?.pass && (
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <Check className="size-3" aria-hidden="true" />
            Conforme com o manual de marca
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 p-3">
        <Button size="sm" onClick={download} className="min-h-11 flex-1">
          <Download aria-hidden="true" />
          PNG
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={copyAlt}
          className="min-h-11 flex-1"
          title="Copiar texto alternativo (alt) da imagem"
        >
          <Type aria-hidden="true" />
          Texto alt
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onRecolor(index)}
          className="min-h-11"
          aria-label={`Aleatorizar cores do card ${index + 1}`}
          title="Aleatorizar apenas as cores"
        >
          <Palette aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReload(index)}
          className="min-h-11"
          aria-label={`Recarregar combinação do card ${index + 1}`}
          title="Sortear novo criativo"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>

    </article>
  );
}
