import { CheckCircle, FilePdf, PresentationChart, WarningCircle } from '@phosphor-icons/react';
import type { Slide } from '@/lib/slides.ts';
import { SLIDE_LABELS } from '@/lib/slides.ts';
import { Button, Note } from './ui.tsx';

type Props = {
  checks: { ok: boolean; text: string }[];
  warnings: string[];
  slides: Slide[];
  busy: 'pdf' | 'pptx' | null;
  status: string;
  onPdf: () => void;
  onPptx: () => void;
};

export function StepExportar({ checks, warnings, slides, busy, status, onPdf, onPptx }: Props) {
  const hidden = slides.filter((s) => s.hidden);
  const ready = checks.every((c) => c.ok);
  return (
    <div className="space-y-space-3">
      <section aria-labelledby="checagem" className="card space-y-2">
        <h3 id="checagem" className="font-sans text-[16px] font-semibold">
          Antes de exportar
        </h3>
        <ul className="space-y-1">
          {checks.map((c) => (
            <li key={c.text} className="flex items-start gap-2 text-[14px]">
              {c.ok ? <CheckCircle className="mt-0.5 size-5 shrink-0 text-success" weight="fill" aria-label="ok" /> : <WarningCircle className="mt-0.5 size-5 shrink-0 text-error" weight="fill" aria-label="pendente" />}
              <span className={c.ok ? '' : 'text-text-primary'}>{c.text}</span>
            </li>
          ))}
        </ul>
      </section>
      {warnings.length > 0 && (
        <Note tone="warn">
          <ul className="list-disc space-y-1 pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Note>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant="accent" onClick={onPdf} disabled={!ready || busy !== null}>
          <FilePdf className="size-5" aria-hidden /> {busy === 'pdf' ? 'Gerando PDF…' : 'Baixar one page (PDF A4)'}
        </Button>
        <Button variant="primary" onClick={onPptx} disabled={!ready || busy !== null}>
          <PresentationChart className="size-5" aria-hidden /> {busy === 'pptx' ? 'Gerando .pptx…' : 'Baixar apresentação (.pptx)'}
        </Button>
      </div>
      <p className="text-[14px] text-text-secondary" aria-live="polite">
        {status}
      </p>
      {hidden.length > 0 && <p className="text-[14px] text-text-secondary">Slides ocultos por falta de dados: {hidden.map((s) => SLIDE_LABELS[s.kind]).join(', ')}.</p>}
      <Note>
        A apresentação usa Montserrat (títulos) e Inter (corpo) pelo nome. Instale as duas (Google Fonts) para ver como na prévia; sem elas, o PowerPoint usa a fonte padrão (reserva da marca: Helvetica, depois Arial). Textos e gráfico são editáveis. Cores em RGB, para tela e envio.
      </Note>
    </div>
  );
}
