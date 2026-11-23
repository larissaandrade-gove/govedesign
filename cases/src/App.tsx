import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CloudCheck, Moon, Sun } from '@phosphor-icons/react';
import { currentTheme, isEmbedded, saveFile, saveOutcomeText, setStandaloneTheme, type Theme } from '@gove/runtime';
import { StepExportar } from '@/components/StepExportar.tsx';
import { StepIndicadores } from '@/components/StepIndicadores.tsx';
import { StepMunicipio } from '@/components/StepMunicipio.tsx';
import { StepPeriodo } from '@/components/StepPeriodo.tsx';
import { StepTextos } from '@/components/StepTextos.tsx';
import { ScenePreview } from '@/components/ScenePreview.tsx';
import { Button } from '@/components/ui.tsx';
import { municipioLabel, normalizeCase, type CaseData } from '@/data/case.ts';
import { INDICATORS, formatPeriodo, hasData } from '@/data/indicators.ts';
import { fontBytes, loadFonts, loadLogoPngs } from '@/lib/assets.ts';
import { buildOnePage } from '@/lib/onepage.ts';
import { makeMeasure, renderPdf } from '@/lib/pdf.ts';
import { renderPptx } from '@/lib/pptx.ts';
import type { Measure } from '@/lib/scene.ts';
import { SLIDE_LABELS, buildSlides, slideWarnings } from '@/lib/slides.ts';
import { cases, createCase, duplicateCase, listCases, removeCase, saveCase } from '@/lib/store.ts';

const STEPS = ['Município', 'Período', 'Indicadores', 'Textos', 'Exportar'] as const;

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'municipio';

export default function App() {
  const [saved, setSaved] = useState<CaseData[]>(() => listCases());
  const [c, setC] = useState<CaseData>(() => createCase());
  const [step, setStep] = useState(0);
  const [view, setView] = useState<'a4' | 'slides'>('a4');
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [busy, setBusy] = useState<'pdf' | 'pptx' | null>(null);
  const [status, setStatus] = useState('');
  const [theme, setTheme] = useState<Theme>(() => currentTheme());
  const dirty = useRef(false);
  const embedded = useMemo(() => isEmbedded(), []);

  useEffect(() => {
    void cases.ready.then(() => setSaved(listCases()));
    return cases.subscribe(() => setSaved(listCases()));
  }, []);

  useEffect(() => {
    let alive = true;
    void loadFonts().then(() => alive && setMeasure(() => makeMeasure(fontBytes())));
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<CaseData>) => {
    dirty.current = true;
    setC((prev) => ({ ...prev, ...patch }));
  }, []);

  // Salva sozinho (depois que o município é digitado)
  useEffect(() => {
    if (!dirty.current || !c.municipio.trim()) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      dirty.current = false;
      saveCase(c).then(
        () => setSaveState('saved'),
        () => setSaveState('error'),
      );
    }, 600);
    return () => clearTimeout(t);
  }, [c]);

  const open = (id: string) => {
    const doc = cases.get(id);
    if (!doc) return;
    dirty.current = false;
    setC(normalizeCase(doc));
    setSaveState('idle');
    setStep(1);
  };

  const view_c = useDeferredValue(c);
  const page = useMemo(() => (measure ? buildOnePage(view_c, measure) : null), [view_c, measure]);
  const slides = useMemo(() => (measure ? buildSlides(view_c, measure) : []), [view_c, measure]);
  const visibleSlides = slides.filter((s) => !s.hidden);

  const included = INDICATORS.filter((d) => hasData(d, c.values[d.id])).length;
  const checks = [
    { ok: !!c.municipio.trim(), text: c.municipio.trim() ? `Município: ${municipioLabel(c)}` : 'Informe o município (etapa 1).' },
    { ok: included > 0, text: included ? `${included} indicador(es) com dados.` : 'Preencha ao menos um indicador (etapa 3).' },
  ];
  const warnings = [
    ...(!c.periodo.inicio && !c.periodo.fim ? ['Sem período: a peça não diz a que meses os números se referem.'] : []),
    ...(page?.warnings ?? []),
    ...slideWarnings(slides),
  ];

  const fileBase = `case-${slug(c.municipio)}${c.periodo.inicio ? `-${c.periodo.inicio}` : ''}${c.periodo.fim && c.periodo.fim !== c.periodo.inicio ? `-a-${c.periodo.fim}` : ''}`;
  const title = `Case ${municipioLabel(c)}${formatPeriodo(c.periodo.inicio, c.periodo.fim) ? ` — ${formatPeriodo(c.periodo.inicio, c.periodo.fim)}` : ''}`;

  const exportPdf = async () => {
    if (!measure) return;
    setBusy('pdf');
    setStatus('');
    try {
      const logo = await loadLogoPngs();
      const bytes = await renderPdf(buildOnePage(c, measure), fontBytes(), logo, { title });
      const r = await saveFile(`${fileBase}.pdf`, new Blob([bytes], { type: 'application/pdf' }));
      setStatus(r === 'saved' ? 'PDF pronto.' : (saveOutcomeText(r) ?? 'Não foi possível baixar o PDF.'));
    } catch {
      setStatus('Não foi possível gerar o PDF.');
    } finally {
      setBusy(null);
    }
  };
  const exportPptx = async () => {
    if (!measure) return;
    setBusy('pptx');
    setStatus('');
    try {
      const logo = await loadLogoPngs();
      const bytes = await renderPptx(buildSlides(c, measure), logo, { title });
      const r = await saveFile(`${fileBase}.pptx`, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
      setStatus(r === 'saved' ? 'Apresentação pronta.' : (saveOutcomeText(r) ?? 'Não foi possível baixar a apresentação.'));
    } catch {
      setStatus('Não foi possível gerar a apresentação.');
    } finally {
      setBusy(null);
    }
  };

  const saveLabel = !c.municipio.trim()
    ? 'Digite o município para salvar'
    : saveState === 'saving'
      ? 'Salvando…'
      : saveState === 'error'
        ? 'Erro ao salvar'
        : cases.mode() === 'db'
          ? 'Salvo no Design System'
          : 'Salvo neste navegador';

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-secondary px-4 py-3 sm:px-6">
        <div className="min-w-0">
          {!embedded && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-highlight">Vendas e pré-vendas</p>}
          <h1 className="truncate text-[20px] font-bold leading-tight sm:text-[24px]">{c.municipio.trim() ? `Case ${municipioLabel(c)}` : 'Gerador de cases'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[13px] text-text-secondary" role="status">
            <CloudCheck className="size-5" aria-hidden /> {saveLabel}
          </span>
          {!embedded && (
            <Button
              variant="ghost"
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              onClick={() => {
                const t = theme === 'dark' ? 'light' : 'dark';
                setStandaloneTheme(t);
                setTheme(t);
              }}
            >
              {theme === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <main className="min-w-0">
          <nav aria-label="Etapas">
            <ol className="grid grid-cols-5 gap-1">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={step === i ? 'step' : undefined}
                    className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[12px] font-semibold transition sm:flex-row sm:text-[14px] ${step === i ? 'bg-primary text-on-primary' : 'bg-surface text-text-secondary hover:text-text-primary'}`}
                  >
                    <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] ${step === i ? 'bg-on-primary text-primary' : 'bg-secondary text-text-primary'}`}>
                      {i + 1}
                    </span>
                    <span className={step === i ? '' : 'max-sm:sr-only'}>{s}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <section className="mt-4" aria-labelledby="etapa">
            <h2 id="etapa" className="mb-3 text-h3 leading-tight">
              {step + 1}. {STEPS[step]}
            </h2>
            {step === 0 && (
              <StepMunicipio
                c={c}
                update={update}
                saved={saved}
                onOpen={open}
                onNew={() => {
                  dirty.current = false;
                  setC(createCase());
                  setSaveState('idle');
                }}
                onDuplicate={async (x) => open((await duplicateCase(x)).id)}
                onDelete={(id) => {
                  void removeCase(id);
                  if (id === c.id) {
                    dirty.current = false;
                    setC(createCase());
                  }
                }}
              />
            )}
            {step === 1 && <StepPeriodo c={c} update={update} />}
            {step === 2 && <StepIndicadores c={c} update={update} />}
            {step === 3 && <StepTextos c={c} update={update} />}
            {step === 4 && <StepExportar checks={checks} warnings={warnings} slides={slides} busy={busy} status={status} onPdf={exportPdf} onPptx={exportPptx} />}
          </section>

          <div className="mt-6 flex justify-between gap-2 border-t border-secondary pt-4">
            <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="size-5" aria-hidden /> Voltar
            </Button>
            {step < STEPS.length - 1 && (
              <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
                Próximo: {STEPS[step + 1]} <ArrowRight className="size-5" aria-hidden />
              </Button>
            )}
          </div>
        </main>

        <aside aria-label="Prévia" className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-32px)] lg:self-start lg:overflow-y-auto">
          <div role="tablist" aria-label="Formato da prévia" className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-surface p-1">
            {(
              [
                ['a4', 'One page A4'],
                ['slides', `Apresentação (${visibleSlides.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={`min-h-11 rounded-md text-caption font-semibold transition ${view === id ? 'bg-background text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {!measure && <p className="text-[14px] text-text-secondary">Carregando fontes…</p>}
          {page && view === 'a4' && (
            <div className="space-y-2">
              {page.warnings.length > 0 && <p className="text-[13px] font-semibold text-error">{page.warnings[0]}</p>}
              <ScenePreview scene={page} label={`Prévia da one page A4 do case ${municipioLabel(c) || ''}`} className="mx-auto max-w-[620px]" />
              <p className="text-center text-[12px] text-text-secondary">210 × 297 mm — mesma diagramação do PDF.</p>
            </div>
          )}
          {measure && view === 'slides' && (
            <ol className="space-y-3">
              {visibleSlides.map((s, i) => (
                <li key={s.kind}>
                  <p className="mb-1 text-[12px] font-semibold text-text-secondary">
                    {i + 1}. {SLIDE_LABELS[s.kind]}
                    {s.scene.warnings.length > 0 && <span className="ml-2 text-error">texto encurtado</span>}
                  </p>
                  <ScenePreview scene={s.scene} label={`Slide ${i + 1}: ${SLIDE_LABELS[s.kind]}`} />
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
