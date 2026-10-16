import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, ChevronDown, GripVertical, ImageOff, ImagePlus, LayoutTemplate, ListPlus, Loader2, LocateFixed, MapPin, Move, MoveHorizontal,
  MoveVertical, Phone, Plus, RotateCcw, Shapes, Smartphone, Trash2, Type, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MunicipioDialog } from '@/components/studio/MunicipioDialog';
import { Preview } from '@/components/studio/Preview';
import { ServiceIcon } from '@/components/studio/ServiceIcon';
import { CheckList } from '@/components/studio/CheckList';
import { LayoutGlyph, layoutShort } from '@/components/studio/LayoutGlyph';
import { api, type Check, type Imagem, type LogosFixos, type Municipio, type PieceOptions, type QueueItem } from '@/lib/api';
import { DEFAULT_TEXTS, LAYOUTS, MAX_SERVICES_RECOMMENDED, SERVICE_ICONS, TEXT_LABELS, buildLayout, formatPhone, measure } from '@/lib/studio';
import { cn } from '@/lib/utils';

type Props = {
  municipios: Municipio[];
  logosFixos: LogosFixos;
  onMunicipioSaved: (m: Municipio) => void;
  onAddToQueue: (item: QueueItem) => void;
};

type SectionProps = { title: string; icon: LucideIcon; aside?: React.ReactNode; collapsible?: boolean; children: React.ReactNode };

/** Seção do painel. `collapsible` = divulgação progressiva (fechada por padrão). */
function Section({ title, icon: Icon, aside, collapsible, children }: SectionProps) {
  const head = (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <h2 className="flex-1 text-sm font-semibold text-foreground">{title}</h2>
    </>
  );
  if (collapsible) {
    return (
      <details className="group border-b border-border/70 px-4 last:border-b-0">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-1 [&::-webkit-details-marker]:hidden">
          {head}
          {aside}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 pb-4">{children}</div>
      </details>
    );
  }
  return (
    <section className="space-y-3 border-b border-border/70 px-4 py-4 last:border-b-0">
      <div className="flex min-h-6 items-center gap-2">
        {head}
        {aside}
      </div>
      {children}
    </section>
  );
}

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
      if (el.type === 'mockup-screen') return el.imageId ? api.imagemUrl(el.imageId) || null : null;
      if (el.which === 'prefeitura') return municipio ? api.municipioLogoUrl(municipio) || null : null;
      if (el.which === 'gove' || el.which === 'bb') return api.logoFixoUrl(el.which, logosFixos[el.which]?.atualizado ?? '') || null;
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
  const activeName = LAYOUTS.find((l: { id: string }) => l.id === activeLayout)?.name;
  type L = { id: string; name: string; trim: { w: number; h: number } };

  return (
    <div className="h-full min-h-0 overflow-y-auto lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden">
      {/* Painel de controles */}
      <aside className="border-b border-border bg-card/40 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r" aria-label="Configurações da peça">
        <Section title="Layouts" icon={LayoutTemplate}>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Layouts a gerar">
            {LAYOUTS.map((l: L) => {
              const on = selected.includes(l.id);
              const full = `${l.name} · ${l.trim.w}×${l.trim.h} mm`;
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  title={full}
                  onClick={() => setSelected((s) => (on ? s.filter((x) => x !== l.id) : [...s, l.id]))}
                  className={cn(
                    'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-lg border-2 px-1 py-2 text-xs font-medium transition-colors',
                    on ? 'border-primary bg-secondary text-secondary-foreground dark:border-accent' : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground',
                  )}
                >
                  <LayoutGlyph id={l.id} trim={l.trim} />
                  <span aria-hidden>{layoutShort(l.name)}</span>
                  <span className="sr-only">{full}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Município" icon={MapPin}>
          <div className="flex gap-2">
            <select
              aria-label="Município"
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
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
            <Button variant="secondary" size="icon" aria-label="Cadastrar município" title="Cadastrar município" onClick={() => setDialogOpen(true)}>
              <Plus className="size-5" />
            </Button>
          </div>
          {municipio && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5" title="WhatsApp">
                <Phone className="size-3.5" aria-hidden />
                <span className="sr-only">WhatsApp</span>
                <span className="font-medium tabular-nums text-foreground">{formatPhone(municipio.ddd, municipio.numero_whatsapp)}</span>
              </span>
              {!municipio.tem_logo && (
                <span className="flex items-center gap-1.5 text-warning">
                  <ImageOff className="size-3.5" aria-hidden /> sem logo
                </span>
              )}
            </p>
          )}
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3">
            <Label htmlFor="bb" className="flex-1 cursor-pointer py-3 text-sm">Incluir logo Banco do Brasil</Label>
            <Switch id="bb" checked={includeBB} onCheckedChange={setIncludeBB} />
          </div>
        </Section>

        <Section
          title="Ícones de serviços"
          icon={Shapes}
          aside={
            <span className={cn('text-xs tabular-nums', services.length > MAX_SERVICES_RECOMMENDED ? 'font-semibold text-warning' : 'text-muted-foreground')}>
              {services.length}/{MAX_SERVICES_RECOMMENDED}
              <span className="sr-only"> recomendados, usados nos flyers</span>
            </span>
          }
        >
          <div className="grid grid-cols-5 gap-2">
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
                    'flex aspect-square min-h-11 items-center justify-center rounded-lg border-2 transition-colors',
                    on ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-foreground hover:border-primary',
                  )}
                >
                  <ServiceIcon paths={s.paths} />
                </button>
              );
            })}
          </div>
          {services.length > MAX_SERVICES_RECOMMENDED && (
            <p className="text-xs text-warning">Mais de {MAX_SERVICES_RECOMMENDED} ícones: acima do recomendado para os flyers.</p>
          )}
          {services.length > 1 && (
            <details className="group rounded-md border border-border">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <GripVertical className="size-4" aria-hidden />
                <span className="flex-1">Ordem</span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ol className="space-y-1 px-1 pb-1" aria-label="Ordem dos ícones">
                {services.map((id, i) => {
                  const s = SERVICE_ICONS.find((x: { id: string }) => x.id === id)!;
                  return (
                    <li
                      key={id}
                      draggable
                      onDragStart={() => (dragFrom.current = i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dragFrom.current != null && moveService(dragFrom.current, i)}
                      className="flex items-center gap-2 rounded-md bg-background/60 pl-2 text-sm"
                    >
                      <GripVertical className="size-4 cursor-grab text-muted-foreground" aria-hidden />
                      <ServiceIcon paths={s.paths} size={16} />
                      <span className="flex-1 truncate">{s.label}</span>
                      <Button variant="ghost" size="icon" aria-label={`Subir ${s.label}`} title="Subir" onClick={() => moveService(i, i - 1)} disabled={i === 0}>
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Descer ${s.label}`} title="Descer" onClick={() => moveService(i, i + 1)} disabled={i === services.length - 1}>
                        <ArrowDown />
                      </Button>
                    </li>
                  );
                })}
              </ol>
            </details>
          )}
        </Section>

        <Section title="Imagem do mockup" icon={Smartphone} aside={<span className="text-xs text-muted-foreground">recorte 9:16</span>}>
          <div className="flex items-center gap-3">
            <label
              className={cn(
                'relative flex h-24 w-[54px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border text-muted-foreground transition-colors hover:border-primary focus-within:ring-2 focus-within:ring-ring',
                mockup ? 'border-border' : 'border-dashed border-input',
              )}
              title={mockup ? 'Trocar imagem' : 'Enviar imagem'}
            >
              {mockup ? (
                <img src={api.imagemUrl(mockup.id)} alt="Imagem enviada para o mockup" className="h-full w-full object-cover" style={{ objectPosition: `${mockup.focus.x * 100}% ${mockup.focus.y * 100}%` }} />
              ) : (
                <ImagePlus className="size-5" aria-hidden />
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                </span>
              )}
              <span className="sr-only">{uploading ? 'Enviando…' : mockup ? 'Trocar imagem' : 'Enviar imagem'}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadMockup(e.target.files[0])} />
            </label>
            {mockup ? (
              <>
                <p className="flex-1 text-xs tabular-nums text-muted-foreground">{mockup.width}×{mockup.height} px</p>
                <Button variant="ghost" size="icon" aria-label="Remover imagem" title="Remover imagem" onClick={() => setMockup(null)}>
                  <Trash2 />
                </Button>
              </>
            ) : (
              <p className="flex-1 text-xs text-muted-foreground">PNG, JPG ou WebP</p>
            )}
          </div>
          {mockup && (
            <div className="space-y-1">
              {(['x', 'y'] as const).map((axis) => {
                const label = axis === 'x' ? 'Enquadramento horizontal' : 'Enquadramento vertical';
                const AxisIcon = axis === 'x' ? MoveHorizontal : MoveVertical;
                return (
                  <div key={axis} className="flex items-center gap-3" title={label}>
                    <AxisIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <Slider
                      value={[mockup.focus[axis] * 100]}
                      min={0}
                      max={100}
                      step={1}
                      aria-label={label}
                      onValueChange={([v]) => setMockup((m) => m && { ...m, focus: { ...m.focus, [axis]: v / 100 } })}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {activeLayout && (
          <Section
            title="Textos"
            icon={Type}
            collapsible
            aside={<span className="truncate text-xs text-muted-foreground">{activeName}</span>}
          >
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Hierarquia tipográfica fixa.</p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Restaurar textos padrão"
                title="Restaurar textos padrão"
                onClick={() => setTexts((t) => ({ ...t, [activeLayout]: {} }))}
              >
                <RotateCcw />
              </Button>
            </div>
          </Section>
        )}
      </aside>

      {/* Preview e verificações */}
      <section className="flex flex-col lg:min-h-0" aria-label="Preview">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1" role="tablist" aria-label="Layout em edição">
            {LAYOUTS.filter((l: { id: string }) => selected.includes(l.id)).map((l: L) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={l.id === activeLayout}
                title={l.name}
                onClick={() => setActive(l.id)}
                className={cn(
                  'flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                  l.id === activeLayout ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span aria-hidden>{layoutShort(l.name)}</span>
                <span className="sr-only">{l.name}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {activeLayout && Object.keys(overrides[activeLayout] ?? {}).length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Restaurar posições originais"
                title="Restaurar posições originais"
                onClick={() => setOverrides((o) => ({ ...o, [activeLayout]: {} }))}
              >
                <LocateFixed />
              </Button>
            )}
            <Button onClick={addToQueue} className="bg-accent font-semibold text-accent-foreground shadow-[0_0_15px_rgba(255,199,44,0.35)] hover:bg-accent/90">
              <ListPlus className="size-5" aria-hidden /> Adicionar à fila
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col xl:grid xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex h-[70vh] min-h-[360px] flex-col gap-2 p-4 xl:h-auto xl:min-h-0">
            <div className="min-h-0 flex-1">
              {result ? (
                <Preview result={result} imageUrl={imageUrl} errorBlocks={errorBlocks} onMove={onMove} />
              ) : (
                <p className="text-sm text-muted-foreground">Selecione ao menos um layout.</p>
              )}
            </div>
            {result && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Move className="size-3.5 shrink-0" aria-hidden />
                Arraste os blocos; eles ficam dentro da área de segurança (tracejado amarelo).
              </p>
            )}
          </div>
          <div className="border-t border-border p-4 xl:min-h-0 xl:overflow-y-auto xl:border-l xl:border-t-0">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Verificações</h2>
            <CheckList checks={checks} empty="Nenhum problema nesta peça." />
            {errors > 0 && (
              <p className="mt-4 rounded-md bg-destructive/10 p-2.5 text-xs font-medium text-destructive" role="status">
                {errors} {errors === 1 ? 'item bloqueia' : 'itens bloqueiam'} a exportação sem confirmação.
              </p>
            )}
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
