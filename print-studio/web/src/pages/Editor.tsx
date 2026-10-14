import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CircleCheck, GripVertical, ImagePlus, ListPlus, OctagonX, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MunicipioDialog } from '@/components/studio/MunicipioDialog';
import { Preview } from '@/components/studio/Preview';
import { ServiceIcon } from '@/components/studio/ServiceIcon';
import { api, type Check, type Imagem, type LogosFixos, type Municipio, type PieceOptions, type QueueItem } from '@/lib/api';
import { DEFAULT_TEXTS, LAYOUTS, MAX_SERVICES_RECOMMENDED, SERVICE_ICONS, TEXT_LABELS, buildLayout, formatPhone, measure } from '@/lib/studio';
import { cn } from '@/lib/utils';

type Props = {
  municipios: Municipio[];
  logosFixos: LogosFixos;
  onMunicipioSaved: (m: Municipio) => void;
  onAddToQueue: (item: QueueItem) => void;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-border/70 px-5 py-5 last:border-b-0">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const LEVEL_ICON = {
  error: <OctagonX className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />,
  warn: <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />,
  ok: <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />,
};

export function Editor({ municipios, logosFixos, onMunicipioSaved, onAddToQueue }: Props) {
  const [selected, setSelected] = useState<string[]>(LAYOUTS.map((l: { id: string }) => l.id));
  const [active, setActive] = useState<string>('flyer-a4');
  const [municipioId, setMunicipioId] = useState<number | null>(null);
  const [includeBB, setIncludeBB] = useState(false);
  const [services, setServices] = useState<string[]>(['iptu', 'certidoes', 'agendamento', 'saude']);
  const [texts, setTexts] = useState<Record<string, Record<string, string>>>({});
  const [overrides, setOverrides] = useState<PieceOptions['overrides']>({});
  const [mockup, setMockup] = useState<(Imagem & { focus: { x: number; y: number } }) | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragFrom = useRef<number | null>(null);

  const municipio = municipios.find((m) => m.id === municipioId) ?? null;
  const activeLayout = selected.includes(active) ? active : selected[0];

  function chooseMunicipio(id: number | null) {
    setMunicipioId(id);
    const m = municipios.find((x) => x.id === id);
    if (m) setIncludeBB(m.incluir_logo_banco_do_brasil);
  }

  const input = useMemo(() => {
    if (!activeLayout) return null;
    return {
      municipio: municipio ?? { ddd: '', numero_whatsapp: '' },
      includeBB,
      services,
      texts: texts[activeLayout] ?? {},
      overrides: overrides[activeLayout] ?? {},
      mockup: mockup ? { imageId: mockup.id, width: mockup.width, height: mockup.height, focus: mockup.focus } : null,
      assets: {
        gove: logosFixos.gove,
        bb: logosFixos.bb,
        prefeitura: municipio?.logo_largura ? { width: municipio.logo_largura, height: municipio.logo_altura } : null,
      },
    };
  }, [activeLayout, municipio, includeBB, services, texts, overrides, mockup, logosFixos]);

  const result = useMemo(() => (input && activeLayout ? buildLayout(activeLayout, input, measure) : null), [input, activeLayout]);
  const checks: Check[] = useMemo(() => {
    const list = (result?.checks ?? []) as Check[];
    return municipio ? list : [{ level: 'error', code: 'municipio', message: 'Selecione ou cadastre um município.' }, ...list.filter((c) => c.code !== 'ddd' && c.code !== 'numero')];
  }, [result, municipio]);
  const errorBlocks = useMemo(() => new Set(checks.filter((c) => c.level === 'error' && c.blockId).map((c) => c.blockId as string)), [checks]);

  const imageUrl = useCallback(
    (el: { type: string; imageId?: string; which?: string }) => {
      if (el.type === 'mockup-screen') return el.imageId ? api.imagemUrl(el.imageId) : null;
      if (el.which === 'prefeitura') return municipio ? api.municipioLogoUrl(municipio) : null;
      if (el.which === 'gove' || el.which === 'bb') return api.logoFixoUrl(el.which, logosFixos[el.which]?.atualizado ?? '');
      return null;
    },
    [municipio, logosFixos],
  );

  const onMove = useCallback(
    (blockId: string, dx: number, dy: number) => {
      if (!activeLayout) return;
      setOverrides((o) => {
        const cur = o[activeLayout]?.[blockId] ?? { dx: 0, dy: 0 };
        return { ...o, [activeLayout]: { ...o[activeLayout], [blockId]: { dx: cur.dx + dx, dy: cur.dy + dy } } };
      });
    },
    [activeLayout],
  );

  function toggleService(id: string) {
    setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function moveService(from: number, to: number) {
    setServices((s) => {
      if (to < 0 || to >= s.length) return s;
      const next = [...s];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  async function uploadMockup(file: File) {
    setUploading(true);
    try {
      const img = await api.uploadImagem(file);
      setMockup({ ...img, focus: { x: 0.5, y: 0.5 } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function addToQueue() {
    if (!municipio) return toast.error('Selecione um município antes de adicionar à fila.');
    if (!selected.length) return toast.error('Selecione ao menos um layout.');
    onAddToQueue({
      key: `${Date.now()}-${municipio.id}`,
      municipioId: municipio.id,
      municipioNome: [municipio.nome_municipio, municipio.uf].filter(Boolean).join(' - '),
      layouts: LAYOUTS.map((l: { id: string }) => l.id).filter((id: string) => selected.includes(id)),
      options: {
        includeBB,
        services,
        texts,
        overrides,
        mockup: mockup ? { imageId: mockup.id, focus: mockup.focus } : null,
      },
    });
    toast.success(`${municipio.nome_municipio}: ${selected.length} peça(s) na fila de exportação.`);
  }

  const errors = checks.filter((c) => c.level === 'error').length;
  const textKeys = activeLayout ? Object.keys(DEFAULT_TEXTS[activeLayout]) : [];

  return (
    <div className="grid h-full min-h-0 grid-cols-[380px_minmax(0,1fr)]">
      {/* Painel de controles */}
      <aside className="min-h-0 overflow-y-auto border-r border-border bg-card/40" aria-label="Configurações da peça">
        <Section title="1. Layouts" hint="Gere um ou vários para o mesmo município.">
          <div className="space-y-2">
            {LAYOUTS.map((l: { id: string; name: string; trim: { w: number; h: number } }) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-secondary/40">
                <Checkbox
                  checked={selected.includes(l.id)}
                  onCheckedChange={(v) => setSelected((s) => (v ? [...s, l.id] : s.filter((x) => x !== l.id)))}
                />
                <span className="flex-1 text-sm">{l.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{l.trim.w}×{l.trim.h} mm</span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="2. Município" hint="Preenche o logo da prefeitura, o DDD e o número.">
          <div className="flex gap-2">
            <select
              aria-label="Município"
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={municipioId ?? ''}
              onChange={(e) => chooseMunicipio(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Selecione…</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome_municipio}{m.uf ? ` - ${m.uf}` : ''}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="icon" aria-label="Cadastrar município" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
            </Button>
          </div>
          {municipio && (
            <p className="text-xs text-muted-foreground">
              WhatsApp <span className="font-medium text-foreground">{formatPhone(municipio.ddd, municipio.numero_whatsapp)}</span>
              {municipio.tem_logo ? ' · logo cadastrado' : ' · sem logo'}
            </p>
          )}
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <Label htmlFor="bb" className="cursor-pointer text-sm">Incluir logo Banco do Brasil</Label>
            <Switch id="bb" checked={includeBB} onCheckedChange={setIncludeBB} />
          </div>
        </Section>

        <Section title="3. Ícones de serviços" hint={`Até ${MAX_SERVICES_RECOMMENDED} por peça. Arraste para ordenar.`}>
          <div className="grid grid-cols-5 gap-1.5">
            {SERVICE_ICONS.map((s: { id: string; label: string; paths: string[] }) => {
              const on = services.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  title={s.label}
                  aria-pressed={on}
                  aria-label={s.label}
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-md border transition-colors',
                    on ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-foreground hover:border-primary',
                  )}
                >
                  <ServiceIcon paths={s.paths} />
                </button>
              );
            })}
          </div>
          {services.length > 0 && (
            <ol className="space-y-1" aria-label="Ordem dos ícones">
              {services.map((id, i) => {
                const s = SERVICE_ICONS.find((x: { id: string }) => x.id === id)!;
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => (dragFrom.current = i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dragFrom.current != null && moveService(dragFrom.current, i)}
                    className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1 text-sm"
                  >
                    <GripVertical className="size-4 cursor-grab text-muted-foreground" aria-hidden />
                    <ServiceIcon paths={s.paths} size={16} />
                    <span className="flex-1 truncate">{s.label}</span>
                    <Button variant="ghost" size="icon" className="size-7" aria-label={`Subir ${s.label}`} onClick={() => moveService(i, i - 1)} disabled={i === 0}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" aria-label={`Descer ${s.label}`} onClick={() => moveService(i, i + 1)} disabled={i === services.length - 1}>
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ol>
          )}
          <p className={cn('text-xs', services.length > MAX_SERVICES_RECOMMENDED ? 'text-accent' : 'text-muted-foreground')}>
            {services.length} de {MAX_SERVICES_RECOMMENDED} recomendados · usados nos flyers
          </p>
        </Section>

        <Section title="4. Imagem do mockup" hint="Qualquer proporção: o recorte 9:16 é automático. Ajuste o enquadramento abaixo.">
          <div className="flex items-start gap-3">
            {mockup ? (
              <img src={api.imagemUrl(mockup.id)} alt="Imagem enviada para o mockup" className="h-24 w-[54px] rounded border border-border object-cover" style={{ objectPosition: `${mockup.focus.x * 100}% ${mockup.focus.y * 100}%` }} />
            ) : (
              <div className="flex h-24 w-[54px] items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                <ImagePlus className="size-5" aria-hidden />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <Button asChild variant="secondary" size="sm" disabled={uploading}>
                <label className="cursor-pointer">
                  {uploading ? 'Enviando…' : mockup ? 'Trocar imagem' : 'Enviar imagem'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadMockup(e.target.files[0])} />
                </label>
              </Button>
              {mockup && (
                <>
                  <p className="text-xs text-muted-foreground">{mockup.width}×{mockup.height} px</p>
                  <Button variant="ghost" size="sm" onClick={() => setMockup(null)}>
                    <Trash2 className="mr-1.5 size-3.5" /> Remover
                  </Button>
                </>
              )}
            </div>
          </div>
          {mockup && (
            <div className="space-y-3 pt-1">
              {(['x', 'y'] as const).map((axis) => (
                <div key={axis} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{axis === 'x' ? 'Enquadramento horizontal' : 'Enquadramento vertical'}</Label>
                  <Slider
                    value={[mockup.focus[axis] * 100]}
                    min={0}
                    max={100}
                    step={1}
                    aria-label={axis === 'x' ? 'Enquadramento horizontal' : 'Enquadramento vertical'}
                    onValueChange={([v]) => setMockup((m) => m && { ...m, focus: { ...m.focus, [axis]: v / 100 } })}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        {activeLayout && (
          <Section title="5. Textos" hint={`Do layout em edição (${LAYOUTS.find((l: { id: string }) => l.id === activeLayout)?.name}). A hierarquia tipográfica é fixa.`}>
            {textKeys.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`t-${key}`} className="text-xs">{(TEXT_LABELS as Record<string, string>)[key]}</Label>
                <Textarea
                  id={`t-${key}`}
                  rows={2}
                  value={texts[activeLayout]?.[key] ?? DEFAULT_TEXTS[activeLayout][key]}
                  onChange={(e) => setTexts((t) => ({ ...t, [activeLayout]: { ...t[activeLayout], [key]: e.target.value } }))}
                />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setTexts((t) => ({ ...t, [activeLayout]: {} }))}>
              <RotateCcw className="mr-1.5 size-3.5" /> Restaurar textos padrão
            </Button>
          </Section>
        )}
      </aside>

      {/* Preview e alertas */}
      <section className="flex min-h-0 flex-col" aria-label="Preview">
        <div className="flex items-center gap-1 border-b border-border px-4 pt-3" role="tablist">
          {LAYOUTS.filter((l: { id: string }) => selected.includes(l.id)).map((l: { id: string; name: string }) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={l.id === activeLayout}
              onClick={() => setActive(l.id)}
              className={cn(
                '-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors',
                l.id === activeLayout ? 'border-accent text-white' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {l.name}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pb-2">
            {activeLayout && Object.keys(overrides[activeLayout] ?? {}).length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setOverrides((o) => ({ ...o, [activeLayout]: {} }))}>
                <RotateCcw className="mr-1.5 size-3.5" /> Posições originais
              </Button>
            )}
            <Button onClick={addToQueue} className="bg-accent font-semibold text-accent-foreground shadow-[0_0_15px_rgba(255,199,44,0.35)] hover:bg-accent/90">
              <ListPlus className="mr-2 size-4" /> Adicionar à fila de exportação
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-h-0 p-5">
            {result ? (
              <Preview result={result} imageUrl={imageUrl} errorBlocks={errorBlocks} onMove={onMove} />
            ) : (
              <p className="text-sm text-muted-foreground">Selecione ao menos um layout.</p>
            )}
          </div>
          <div className="min-h-0 overflow-y-auto border-l border-border p-4">
            <h2 className="mb-1 text-sm font-semibold text-white">Verificações</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Arraste os blocos no preview; eles não saem da área de segurança (tracejado amarelo).
            </p>
            {checks.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-300"><CircleCheck className="size-4" /> Nenhum problema nesta peça.</p>
            ) : (
              <ul className="space-y-2">
                {checks.map((c, i) => (
                  <li key={`${c.code}-${i}`} className="flex gap-2 text-sm leading-snug">
                    {LEVEL_ICON[c.level]}
                    <span>{c.message}</span>
                  </li>
                ))}
              </ul>
            )}
            {errors > 0 && <p className="mt-4 rounded-md bg-destructive/15 p-2.5 text-xs text-destructive">{errors} item(ns) bloqueiam a exportação sem confirmação.</p>}
          </div>
        </div>
      </section>

      <MunicipioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={(m) => {
          onMunicipioSaved(m);
          chooseMunicipio(m.id);
          setIncludeBB(m.incluir_logo_banco_do_brasil);
        }}
      />
    </div>
  );
}
