// Miniatura proporcional do formato da peça (identifica o layout sem texto longo).
import { FileText, Presentation, Sticker } from 'lucide-react';

const ICON: Record<string, typeof FileText> = { 'adesivo-5x10': Sticker, 'display-a6': Presentation };

/** Rótulo curto: "Flyer A4" → "A4", "Adesivo 5x10cm" → "5×10". */
export function layoutShort(name: string) {
  return name.replace(/^(Flyer|Adesivo|Display Acrílico)\s+/i, '').replace(/cm$/i, '').replace('x', '×');
}

export function LayoutGlyph({ id, trim }: { id: string; trim: { w: number; h: number } }) {
  const Icon = ICON[id] ?? FileText;
  const h = 30;
  const w = Math.max(14, Math.round((trim.w / trim.h) * h));
  return (
    <span aria-hidden className="flex h-[30px] items-center justify-center rounded-[3px] border-[1.5px] border-current bg-background/60" style={{ width: w }}>
      <Icon className="size-3.5" strokeWidth={2} />
    </span>
  );
}
