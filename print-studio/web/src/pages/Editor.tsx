import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CaretDown, DotsSixVertical, ImageBroken, ImageSquare, Layout as LayoutIcon, ListPlus, SpinnerGap, Crosshair, MapPin, ArrowsOutCardinal, ArrowsHorizontal, Globe, ArrowsVertical, Palette, Phone, Plus, ArrowsClockwise, ArrowCounterClockwise, Shapes, DeviceMobile, Trash, Warning, TextT, type Icon as PhosphorIcon } from '@phosphor-icons/react';
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
import { api, type Check, type Imagem, type LogosFixos, type Model, type Municipio, type PieceOptions, type QueueItem } from '@/lib/api';
import { brandLogoUrl } from '@/lib/brand';
import {
  BB_SCHEMES, DEFAULT_SERVICES, IDENTITIES, LAYOUTS, MAX_SERVICES_RECOMMENDED, MODELS, SERVICE_ICONS, TEXT_LABELS, bbBlockingChecks, buildLayout, defaultTextsFor, formatPhone, measure,
  normalizeSite, siteLabel, type Identity,
} from '@/lib/studio';
import { cn } from '@/lib/utils';

type Props = {
  municipios: Municipio[];
  logosFixos: LogosFixos;
  onMunicipioSaved: (m: Municipio) => void;
  onAddToQueue: (item: QueueItem) => void;
};

/** Captura do site: celular de 390×844 pt com densidade 3 (server/capture.js). */
const CAPTURE_SIZE = { width: 1170, height: 2532 };

type SectionProps = { title: string; icon: PhosphorIcon; aside?: React.ReactNode; collapsible?: boolean; children: React.ReactNode };

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
          <CaretDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
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
  // Identidade visual das peças: GOVE (padrão) ou Banco do Brasil; persistida por município
  const [identity, setIdentity] = useState<Identity>('gove');
  const [bbScheme, setBbScheme] = useState<string>('capa');
  // Modelo (pauta): WhatsApp ou Portal Cidadão — mesma diagramação, textos e destino do QR próprios
  const [model, setModel] = useState<Model>('whatsapp');
  // Textos editados por modelo (cada pauta tem os seus)
  const [textsByModel, setTextsByModel] = useState<Record<Model, Record<string, Record<string, string>>>>({ whatsapp: {}, portal: {} });
  const texts = textsByModel[model];
  const setTexts = (fn: (t: Record<string, Record<string, string>>) => Record<string, Record<string, string>>) =>
    setTextsByModel((all) => ({ ...all, [model]: fn(all[model]) }));
  const [services, setServices] = useState<string[]>([...DEFAULT_SERVICES]);
  const [overrides, setOverrides] = useState<PieceOptions['overrides']>({});
  // `source`: 'captura' = captura automática do site (Portal Cidadão); 'envio' = imagem enviada
  const [mockup, setMockup] = useState<(Imagem & { focus: { x: number; y: number }; source?: 'envio' | 'captura' }) | null>(null);
  const [capturing, setCapturing] = useState(false);
  const autoCaptured = useRef(new Set<number>());
  // Tela do celular: sempre a captura enviada (a tela gerada foi removida)
  const mockMode = 'upload' as const;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragFrom = useRef<number | null>(null);

  const municipio = municipios.find((m) => m.id === municipioId) ?? null;
  const activeLayout = selected.includes(active) ? active : selected[0];

  function chooseMunicipio(id: number | null) {
    setMunicipioId(id);
    const m = municipios.find((x) => x.id === id);
    if (m) {
      setIncludeBB(m.incluir_logo_banco_do_brasil);
      setIdentity(m.identidade === 'bb' ? 'bb' : 'gove');
      setBbScheme(m.bb_esquema ?? 'capa');
    }
  }

  /** Troca a identidade/esquema e grava no município selecionado (vale para as próximas sessões). */
  function chooseIdentity(next: Identity, scheme = bbScheme) {
    setIdentity(next);
    setBbScheme(scheme);
    if (!municipio) return;
    api.setIdentidade(municipio.id, next, scheme).then(onMunicipioSaved, (err: Error) => toast.error(err.message));
  }
  const bb = identity === 'bb';
  const defaults = defaultTextsFor(identity, model);
  const portal = model === 'portal';
  const site = municipio ? normalizeSite(municipio.url_domicilio) : '';

  const input = useMemo(() => {
    if (!activeLayout) return null;
    return {
      municipio: municipio ?? { ddd: '', numero_whatsapp: '' },
      model,
      identity,
      bbScheme,
      includeBB: bb || includeBB,
      services,
      texts: texts[activeLayout] ?? {},
      overrides: overrides[activeLayout] ?? {},
      mockup: { mode: mockMode, ...(mockup ? { imageId: mockup.id, width: mockup.width, height: mockup.height, focus: mockup.focus } : {}) },
      assets: {
        gove: logosFixos.gove,
        bb: logosFixos.bb,
        prefeitura: municipio?.logo_largura ? { width: municipio.logo_largura, height: municipio.logo_altura } : null,
      },
    };
  }, [activeLayout, municipio, model, identity, bbScheme, bb, includeBB, services, texts, overrides, mockup, logosFixos]);

  const result = useMemo(() => (input && activeLayout ? buildLayout(activeLayout, input, measure) : null), [input, activeLayout]);
  const checks: Check[] = useMemo(() => {
    const list = (result?.checks ?? []) as Check[];
    return municipio ? list : [{ level: 'error', code: 'municipio', message: 'Selecione ou cadastre um município.' }, ...list.filter((c) => c.code !== 'ddd' && c.code !== 'numero' && c.code !== 'site')];
  }, [result, municipio]);
  const errorBlocks = useMemo(() => new Set(checks.filter((c) => c.level === 'error' && c.blockId).map((c) => c.blockId as string)), [checks]);

  const imageUrl = useCallback(
    (el: { type: string; imageId?: string; which?: string; official?: boolean; file?: string }) => {
      if (el.type === 'mockup-screen') return el.imageId ? api.imagemUrl(el.imageId) || null : null;
      if (el.which === 'gove' && el.official && el.file) return brandLogoUrl(el.file) || null;
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
      setMockup({ ...img, focus: { x: 0.5, y: 0.5 }, source: 'envio' });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const captureAge = municipio?.captura_em ? (Date.now() - Date.parse(municipio.captura_em)) / 864e5 : Infinity;

  /** Captura a tela do celular a partir do site do domicílio eletrônico (servidor ou conector da Gove). */
  async function captureSite(m: Municipio, auto = false) {
    setCapturing(true);
    try {
      const r = await api.capturarSite(m.id);
      onMunicipioSaved({ ...m, captura_imagem_id: r.id, captura_em: r.capturadoEm });
      setMockup({ id: r.id, width: r.width, height: r.height, focus: { x: 0.5, y: 0 }, source: 'captura' });
      if (!auto) toast.success('Captura do site atualizada.');
    } catch (err) {
      toast.error(auto ? 'Captura automática do site não concluída' : 'Captura do site não concluída', { description: (err as Error).message });
    } finally {
      setCapturing(false);
    }
  }

  // Portal Cidadão: a tela do celular é a captura do site do município (a menos que uma imagem
  // tenha sido enviada). Sem captura, ou com mais de 30 dias, o app captura de novo sozinho.
  useEffect(() => {
    if (!portal) {
      if (mockup?.source === 'captura') setMockup(null);
      return;
    }
    if (!municipio || mockup?.source === 'envio') return;
    if (municipio.captura_imagem_id) {
      if (mockup?.id !== municipio.captura_imagem_id) {
        setMockup({ id: municipio.captura_imagem_id, ...CAPTURE_SIZE, focus: { x: 0.5, y: 0 }, source: 'captura' });
      }
    } else if (mockup?.source === 'captura') {
      setMockup(null);
    }
    if (site && (!municipio.captura_imagem_id || captureAge > 30) && !autoCaptured.current.has(municipio.id)) {
      autoCaptured.current.add(municipio.id);
      void captureSite(municipio, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal, municipio?.id, municipio?.captura_imagem_id, site, mockup?.id, mockup?.source]);

  function addToQueue() {
    if (!municipio) return toast.error('Selecione um município antes de adicionar à fila.');
    if (!selected.length) return toast.error('Selecione ao menos um layout.');
    if (bb && input) {
      // Identidade BB: confere paleta, contraste (4,5:1 contra o fundo real) e tipografia de todas as peças
      const blocking = LAYOUTS.filter((l: { id: string }) => selected.includes(l.id)).flatMap((l: { id: string; name: string }) =>
        (bbBlockingChecks(buildLayout(l.id, { ...input, texts: texts[l.id] ?? {}, overrides: overrides[l.id] ?? {} }, measure).checks) as Check[]).map((c) => `${l.name}: ${c.message}`),
      );
      if (blocking.length) {
        toast.error('Fora das regras da identidade Banco do Brasil', { description: blocking.slice(0, 3).join(' · ') });
        return;
      }
    }
    onAddToQueue({
      key: `${Date.now()}-${municipio.id}`,
      municipioId: municipio.id,
      municipioNome: [municipio.nome_municipio, municipio.uf].filter(Boolean).join(' - '),
      layouts: LAYOUTS.map((l: { id: string }) => l.id).filter((id: string) => selected.includes(id)),
      options: {
        model,
        identity,
        bbScheme,
        includeBB: bb || includeBB,
        services,
        texts,
        overrides,
        mockup: { mode: mockMode, ...(mockup ? { imageId: mockup.id, focus: mockup.focus, source: mockup.source ?? 'envio' } : {}) },
      },
    });
    toast.success(`${municipio.nome_municipio}${portal ? ' · Portal Cidadão' : ''}: ${selected.length} peça(s) na fila de exportação.`);
  }

  const errors = checks.filter((c) => c.level === 'error').length;
  const textKeys = activeLayout ? Object.keys(defaults[activeLayout]) : [];
  const bbLogoMissing = bb && !logosFixos.bb;
  const activeName = LAYOUTS.find((l: { id: string }) => l.id === activeLayout)?.name;
  type L = { id: string; name: string; trim: { w: number; h: number } };

  return (
    <div className="relative h-full min-h-0 overflow-y-auto lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden">
      {/* Painel de controles */}
      <aside className="border-b border-border bg-card/40 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r" aria-label="Configurações da peça">
        <Section title="Modelo" icon={Globe}>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Modelo do impresso">
            {MODELS.map((it) => (
              <button
                key={it.id}
                type="button"
                role="radio"
                aria-checked={model === it.id}
                title={it.hint}
                onClick={() => setModel(it.id)}
                className={cn(
                  'min-h-11 rounded-lg px-2 text-sm font-medium transition-colors',
                  model === it.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {it.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{MODELS.find((it) => it.id === model)?.hint}.</p>
          {portal && municipio && !site && (
            <p className="flex gap-1.5 text-xs font-medium text-warning" role="status">
              <Warning className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Cadastre o site do domicílio eletrônico de {municipio.nome_municipio} (Municípios › Editar).
            </p>
          )}
        </Section>

        <Section title="Identidade" icon={Palette}>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Identidade visual">
            {(IDENTITIES as { id: Identity; label: string }[]).map((it) => (
              <button
                key={it.id}
                type="button"
                role="radio"
                aria-checked={identity === it.id}
                onClick={() => chooseIdentity(it.id)}
                className={cn(
                  'min-h-11 rounded-lg px-2 text-sm font-medium transition-colors',
                  identity === it.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {it.label}
              </button>
            ))}
          </div>
          {bb && (
            <>
              <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Esquema de cores BB">
                {BB_SCHEMES.map((sc: { id: string; label: string; bg: string; title: string; accent: string }) => (
                  <button
                    key={sc.id}
                    type="button"
                    role="radio"
                    aria-checked={bbScheme === sc.id}
                    aria-label={sc.label}
                    title={sc.label}
                    onClick={() => chooseIdentity('bb', sc.id)}
                    style={{ background: sc.bg, color: sc.title }}
                    className={cn(
                      'flex min-h-11 items-center justify-center rounded-lg border-2 text-sm font-bold transition-shadow',
                      bbScheme === sc.id ? 'border-foreground ring-2 ring-ring ring-offset-2 ring-offset-background' : 'border-border',
                    )}
                  >
                    Aa
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {BB_SCHEMES.find((sc: { id: string }) => sc.id === bbScheme)?.label} · paleta, fontes e CMYK do Banco do Brasil; textos sempre ≥ 4,5:1.
              </p>
              {bbLogoMissing && (
                <p className="flex gap-1.5 text-xs font-medium text-warning" role="status">
                  <Warning className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Envie a logomarca BB em “Logos fixos”: é obrigatória nesta identidade.
                </p>
              )}
            </>
          )}
        </Section>

        <Section title="Layouts" icon={LayoutIcon}>
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
              {site && (
                <span className="flex min-w-0 items-center gap-1.5" title="Site do domicílio eletrônico">
                  <Globe className="size-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">Site do domicílio eletrônico</span>
                  <span className="truncate font-medium text-foreground">{siteLabel(site)}</span>
                </span>
              )}
              {!municipio.tem_logo && (
                <span className="flex items-center gap-1.5 text-warning">
                  <ImageBroken className="size-3.5" aria-hidden /> sem logo
                </span>
              )}
            </p>
          )}
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3">
            <Label htmlFor="bb" className="flex-1 cursor-pointer py-3 text-sm">
              Incluir logo Banco do Brasil
              {bb && <span className="block text-xs font-normal text-muted-foreground">Obrigatório na identidade BB</span>}
            </Label>
            <Switch id="bb" checked={bb || includeBB} disabled={bb} onCheckedChange={setIncludeBB} />
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
                <DotsSixVertical className="size-4" aria-hidden />
                <span className="flex-1">Ordem</span>
                <CaretDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
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
                      <DotsSixVertical className="size-4 cursor-grab text-muted-foreground" aria-hidden />
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

        <Section title="Tela do celular" icon={DeviceMobile}>
          <>
          {portal && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="size-3.5 shrink-0" aria-hidden />
                {!site
                  ? 'Cadastre o site do domicílio eletrônico para capturar a tela automaticamente.'
                  : capturing
                    ? `Capturando ${siteLabel(site)} no celular…`
                    : municipio?.captura_em
                      ? `Captura de ${siteLabel(site)} · ${new Date(municipio.captura_em).toLocaleDateString('pt-BR')}${mockup?.source === 'envio' ? ' (em uso: imagem enviada)' : ''}`
                      : `Sem captura de ${siteLabel(site)} ainda.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={!site || !municipio || capturing} onClick={() => municipio && captureSite(municipio)}>
                  {capturing ? <SpinnerGap className="animate-spin" aria-hidden /> : <ArrowsClockwise aria-hidden />}
                  {municipio?.captura_imagem_id ? 'Atualizar captura' : 'Capturar do site'}
                </Button>
                {mockup?.source === 'envio' && municipio?.captura_imagem_id && (
                  <Button size="sm" variant="ghost" onClick={() => setMockup(null)}>
                    Usar a captura do site
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <label
              className={cn(
                'relative flex h-24 w-[54px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border text-muted-foreground transition-colors hover:border-primary focus-within:ring-2 focus-within:ring-ring',
                mockup ? 'border-border' : 'border-dashed border-input',
              )}
              title={mockup ? 'Trocar imagem' : 'Enviar imagem'}
            >
              {mockup ? (
                <img src={api.imagemUrl(mockup.id)} alt={mockup.source === 'captura' ? 'Captura do site para o mockup' : 'Imagem enviada para o mockup'} className="h-full w-full object-cover" style={{ objectPosition: `${mockup.focus.x * 100}% ${mockup.focus.y * 100}%` }} />
              ) : (
                <ImageSquare className="size-5" aria-hidden />
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <SpinnerGap className="size-5 animate-spin" aria-hidden />
                </span>
              )}
              <span className="sr-only">{uploading ? 'Enviando…' : mockup ? 'Trocar imagem' : 'Enviar imagem'}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadMockup(e.target.files[0])} />
            </label>
            {mockup ? (
              <>
                <p className="flex-1 text-xs tabular-nums text-muted-foreground">{mockup.width}×{mockup.height} px</p>
                <Button variant="ghost" size="icon" aria-label="Remover imagem" title="Remover imagem" onClick={() => setMockup(null)}>
                  <Trash />
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
                const AxisIcon = axis === 'x' ? ArrowsHorizontal : ArrowsVertical;
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
          </>
        </Section>

        {activeLayout && (
          <Section
            title="Textos"
            icon={TextT}
            collapsible
            aside={<span className="truncate text-xs text-muted-foreground">{activeName}</span>}
          >
            {textKeys.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`t-${key}`} className="text-xs">{(TEXT_LABELS as Record<string, string>)[key]}</Label>
                <Textarea
                  id={`t-${key}`}
                  rows={2}
                  value={texts[activeLayout]?.[key] ?? defaults[activeLayout][key]}
                  onChange={(e) => setTexts((t) => ({ ...t, [activeLayout]: { ...t[activeLayout], [key]: e.target.value } }))}
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Nova linha quebra o texto; **trecho** fica em negrito.</p>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Restaurar textos padrão"
                title="Restaurar textos padrão"
                onClick={() => setTexts((t) => ({ ...t, [activeLayout]: {} }))}
              >
                <ArrowCounterClockwise />
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
                <Crosshair />
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
                <ArrowsOutCardinal className="size-3.5 shrink-0" aria-hidden />
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
