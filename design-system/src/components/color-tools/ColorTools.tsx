import { useState } from 'react';
import { CirclesThreePlus, Drop, Eye, Gradient, ImageSquare } from '@phosphor-icons/react';
import { nearestBrand, type Hex } from '../../lib/color';
import { BaseColorPicker } from './BaseColorPicker';
import { GradientTool } from './GradientTool';
import { ImageTool } from './ImageTool';
import { MixTool } from './MixTool';
import { PalettesTool } from './PalettesTool';
import { VisionTool } from './VisionTool';

const TOOLS = [
  { id: 'paletas', label: 'Paletas', icon: CirclesThreePlus },
  { id: 'mistura', label: 'Mistura', icon: Drop },
  { id: 'gradientes', label: 'Gradientes', icon: Gradient },
  { id: 'imagem', label: 'Imagem', icon: ImageSquare },
  { id: 'daltonismo', label: 'Daltonismo', icon: Eye },
] as const;
type Tool = (typeof TOOLS)[number]['id'];

/**
 * Ferramentas de cor da Bússola: partem de uma cor oficial (ou qualquer HEX,
 * com o aviso de fora da paleta). Lógica em lib/color; aqui só a interface.
 */
export function ColorTools() {
  const [tool, setTool] = useState<Tool>('paletas');
  const [base, setBase] = useState<Hex>('#3d0099');
  const name = nearestBrand(base).exact ? nearestBrand(base).name : `cor ${base.slice(1)}`;
  return (
    <div className="flex min-w-0 flex-col gap-space-3">
      <div role="tablist" aria-label="Ferramentas de cor" className="-mx-space-2 flex gap-1 overflow-x-auto px-space-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tool === id}
            onClick={() => setTool(id)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-space-2 text-caption font-semibold transition-colors ${
              tool === id ? 'border-primary bg-primary text-on-primary' : 'border-secondary bg-background text-text-primary hover:border-primary'
            }`}
          >
            <Icon className="size-4" weight={tool === id ? 'fill' : 'regular'} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      {tool !== 'imagem' && <BaseColorPicker value={base} onChange={setBase} />}
      <div role="tabpanel" aria-label={TOOLS.find((t) => t.id === tool)?.label}>
        {tool === 'paletas' && <PalettesTool base={base} name={name} />}
        {tool === 'mistura' && <MixTool base={base} />}
        {tool === 'gradientes' && <GradientTool base={base} />}
        {tool === 'imagem' && (
          <ImageTool
            onUse={(hex) => {
              setBase(hex);
              setTool('paletas');
            }}
          />
        )}
        {tool === 'daltonismo' && <VisionTool base={base} />}
      </div>
    </div>
  );
}
