import { useMemo, useState } from 'react';
import { Check, Copy, DownloadSimple, Plus, Trash } from '@phosphor-icons/react';
import { colorName, meshCss, meshSvg, textGradientCss, toCss, type GradientKind, type GradientStop, type Hex, type MeshPoint, type Space } from '../../lib/color';
import { downloadText } from '../../lib/download';
import { BaseColorPicker } from './BaseColorPicker';
import { Choice, Field, copy } from './shared';

const KINDS = [
  ['linear', 'Linear'],
  ['radial', 'Radial'],
  ['conico', 'Cônico'],
  ['mesh', 'Mesh'],
] as const;
const SPACES = [
  ['oklch', 'OKLCH'],
  ['hsl', 'HSL'],
  ['rgb', 'RGB'],
] as const;

function CopyBlock({ code, file }: { code: string; file?: [string, string, string] }) {
  const [done, setDone] = useState(false);
  return (
    <div className="relative">
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md border border-secondary bg-background p-space-2 pr-24 font-mono text-[12px] text-text-primary">{code}</pre>
      <div className="absolute right-1 top-1 flex">
        <button
          type="button"
          aria-label="Copiar código"
          title="Copiar"
          onClick={async () => {
            if (await copy(code)) {
              setDone(true);
              setTimeout(() => setDone(false), 1200);
            }
          }}
          className="flex size-11 items-center justify-center rounded-md text-text-secondary hover:text-text-primary"
        >
          {done ? <Check className="size-4 text-highlight" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
        {file && (
          <button type="button" aria-label={`Baixar ${file[0]}`} title={`Baixar ${file[0]}`} onClick={() => downloadText(file[0], file[1], file[2])} className="flex size-11 items-center justify-center rounded-md text-text-secondary hover:text-text-primary">
            <DownloadSimple className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Gradientes linear, radial, cônico e mesh (CSS com fallback + SVG) e texto com
 * gradiente. As paradas são só cores da paleta; a transição entre elas é derivada.
 */
export function GradientTool({ base }: { base: Hex }) {
  const [kind, setKind] = useState<GradientKind>('linear');
  const [space, setSpace] = useState<Space>('oklch');
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<GradientStop[]>([
    { hex: base, at: 0 },
    { hex: '#ffc72c', at: 100 },
  ]);
  // A primeira parada acompanha a cor base escolhida
  const list = useMemo(() => [{ ...stops[0], hex: base }, ...stops.slice(1)], [stops, base]);
  const spec = { kind: kind === 'mesh' ? 'linear' : kind, angle, stops: list, space } as const;
  const mesh: MeshPoint[] = useMemo(
    () => [
      { hex: '#20133d', x: 0, y: 0, r: 0 },
      ...list.map((s, i) => ({ hex: s.hex, x: [18, 82, 30, 75, 50][i % 5], y: [22, 30, 80, 78, 50][i % 5], r: 55 })),
    ],
    [list],
  );
  const bg = kind === 'mesh' ? meshCss(mesh) : { background: toCss(spec), backgroundColor: list[0].hex };
  const css = kind === 'mesh' ? `background-color: ${bg.backgroundColor}; /* fallback */\nbackground-image: ${bg.background};` : `background: ${list[0].hex}; /* fallback */\nbackground: ${bg.background};`;
  const setStop = (i: number, p: Partial<GradientStop>) => setStops((s) => s.map((x, k) => (k === i ? { ...x, ...p } : x)));

  return (
    <div className="flex flex-col gap-space-3">
      <div className="flex flex-wrap items-center gap-space-2">
        <Choice label="Tipo de gradiente" value={kind} options={KINDS} onChange={setKind} />
        {kind !== 'mesh' && <Choice label="Espaço de interpolação" value={space} options={SPACES} onChange={setSpace} />}
      </div>

      <div className="h-48 rounded-lg border border-secondary" style={{ backgroundColor: bg.backgroundColor, backgroundImage: bg.background }} role="img" aria-label="Prévia do gradiente" />

      <div className="grid gap-space-2 sm:grid-cols-2">
        {kind !== 'radial' && kind !== 'mesh' && (
          <Field label={`${kind === 'conico' ? 'Início' : 'Ângulo'}: ${angle}°`}>
            <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="h-11" />
          </Field>
        )}
      </div>

      <fieldset className="flex flex-col gap-space-1">
        <legend className="mb-space-1 text-caption text-text-secondary">Cores da paleta ({kind === 'mesh' ? 'manchas sobre Noite' : 'paradas'}) · só a transição entre elas fica fora da paleta</legend>
        {list.map((s, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-md border border-secondary p-space-1">
            {i === 0 ? (
              <span className="text-caption text-text-secondary">
                Cor 1 · <span className="font-semibold text-text-primary">{colorName(s.hex)}</span> <span className="font-mono">{s.hex.toUpperCase()}</span> · cor base (troque acima)
              </span>
            ) : (
              <BaseColorPicker label={`Cor ${i + 1}`} value={s.hex} onChange={(hex) => setStop(i, { hex })} compact />
            )}
            {(kind !== 'mesh' || i > 0) && (
              <div className="flex items-center gap-space-1">
                {kind !== 'mesh' && <input type="range" min={0} max={100} value={s.at} onChange={(e) => setStop(i, { at: Number(e.target.value) })} aria-label={`Posição da cor ${i + 1}`} className="h-11 min-w-0 flex-1" />}
                {kind !== 'mesh' && <span className="w-10 text-right font-mono text-caption text-text-secondary">{s.at}%</span>}
                {i > 0 && list.length > 2 && (
                  <button type="button" aria-label={`Remover cor ${i + 1}`} title="Remover" onClick={() => setStops((st) => st.filter((_, k) => k !== i))} className="ml-auto flex size-11 items-center justify-center rounded-md text-text-secondary hover:text-text-primary">
                    <Trash className="size-5" aria-hidden />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {list.length < 5 && (
          <button type="button" onClick={() => setStops((s) => [...s, { hex: '#5ac2cd', at: 50 }])} className="inline-flex min-h-11 items-center gap-1 self-start text-caption font-semibold text-highlight">
            <Plus className="size-4" aria-hidden /> Adicionar cor
          </button>
        )}
      </fieldset>

      <CopyBlock code={css} file={kind === 'mesh' ? ['gradiente-mesh.svg', meshSvg(mesh), 'image/svg+xml'] : undefined} />

      {kind !== 'mesh' && (
        <section className="flex flex-col gap-space-1" aria-label="Texto com gradiente">
          <h4 className="font-display text-body font-semibold text-text-primary">Texto com gradiente</h4>
          <p className="font-display text-[40px] font-bold leading-tight" style={{ color: list[0].hex, backgroundImage: toCss(spec), WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Governo Zero Clique
          </p>
          <CopyBlock code={textGradientCss(spec)} />
        </section>
      )}
    </div>
  );
}
