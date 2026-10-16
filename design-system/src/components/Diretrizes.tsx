import { FileText, MonitorSmartphone, Presentation, Printer, Mail, Megaphone } from 'lucide-react';
import guide from '../../../docs/diretrizes-gove.md?raw';
import { DocActions } from './DocActions';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';

const COVERS = [
  { icon: Presentation, label: 'Apresentações' },
  { icon: Megaphone, label: 'Mídia social e anúncios' },
  { icon: Printer, label: 'Impressos' },
  { icon: Mail, label: 'E-mails' },
  { icon: MonitorSmartphone, label: 'Interfaces e páginas' },
  { icon: FileText, label: 'Documentos' },
];

export function Diretrizes() {
  return (
    <section id="diretrizes" className="gutter scroll-mt-[72px] border-t border-secondary/60 py-space-8">
      <SectionHeader id="diretrizes" title="Diretrizes" />
      <Reveal className="flex max-w-[760px] flex-col gap-space-3">
        <p className="text-body-large text-text-secondary">
          Baixe o guia e use-o como base sempre que gerar ativos com inteligência artificial — no Claude ou em outra ferramenta. Anexe o
          arquivo ou cole as instruções no início da conversa: assim cores, logomarca, tipografia e tamanhos saem uniformes em tudo o que a
          Gove produz.
        </p>
        <ul className="flex flex-wrap gap-space-1" aria-label="O guia cobre">
          {COVERS.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-caption text-text-secondary">
              <Icon className="size-4 text-highlight" aria-hidden /> {label}
            </li>
          ))}
        </ul>
        <DocActions doc={guide} filename="diretrizes-gove.md" primary />
      </Reveal>
    </section>
  );
}
