import { useEffect, useRef, useState } from "react";
import { Download, Palette, RefreshCw, ShieldCheck, TriangleAlert, Type } from "lucide-react";
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

  const failing =
    report && !report.pass
      ? report.checks
          .filter((c) => !c.pass)
          .map((c) => c.label)
          .join(" · ")
      : "";
  const iconBtn = "size-11 shrink-0";

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="relative bg-muted">
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>
      <div className="flex items-center gap-1 p-2">
        <span className="flex min-w-0 flex-1 items-center pl-1">
          {report?.pass ? (
            <span
              className="inline-flex items-center text-primary"
              title="Conforme com o manual de marca"
            >
              <ShieldCheck className="size-5" aria-hidden="true" />
              <span className="sr-only">Conforme com o manual de marca</span>
            </span>
          ) : report ? (
            <span className="inline-flex items-center text-amber-700" title={failing}>
              <TriangleAlert className="size-5" aria-hidden="true" />
              <span className="sr-only">Fora do manual: {failing}</span>
            </span>
          ) : null}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={download}
          className={iconBtn}
          aria-label={`Baixar PNG do criativo ${index + 1}`}
          title="Baixar PNG"
        >
          <Download aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={copyAlt}
          className={iconBtn}
          aria-label={`Copiar texto alternativo do criativo ${index + 1}`}
          title="Copiar texto alternativo (alt)"
        >
          <Type aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRecolor(index)}
          className={iconBtn}
          aria-label={`Aleatorizar cores do card ${index + 1}`}
          title="Aleatorizar apenas as cores"
        >
          <Palette aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onReload(index)}
          className={iconBtn}
          aria-label={`Recarregar combinação do card ${index + 1}`}
          title="Sortear novo criativo"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
