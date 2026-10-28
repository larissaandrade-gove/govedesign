import { useEffect, useRef, useState } from "react";
import { Canvas } from "./Canvas";
import type { PageContent } from "@/lib/gove/types";

const WIDTH = 1120;
const noop = () => {};

/** Miniatura da página (o próprio canvas, reduzido e sem interação). */
export function PageThumb({ page }: { page: PageContent }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width) setScale(entry.contentRect.width / WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="relative h-32 w-full overflow-hidden rounded-lg border border-border bg-white"
    >
      <div
        inert
        // Absoluto: os 1120px do canvas não entram no cálculo de largura do card.
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        <Canvas page={page} selectedId={null} onSelect={noop} device="desktop" showHidden={false} />
      </div>
    </div>
  );
}
