import { ArrowRight, Mail, Workflow } from 'lucide-react';
import guide from '../../../docs/componentes-gove.md?raw';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { DocActions } from './DocActions';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';

/** Componentes base, ao vivo e em uma única faixa; o detalhamento fica no guia para baixar. */
export function UIKit() {
  return (
    <section id="componentes" className="gutter scroll-mt-[72px] border-t border-secondary/60 py-space-8">
      <SectionHeader id="componentes" title="Componentes">
        Botões, campos e cards ao vivo. Especificações completas no guia.
      </SectionHeader>
      <Reveal className="flex flex-col gap-space-3">
        <div className="grid grid-cols-1 items-start gap-space-3 rounded-lg border border-secondary bg-surface p-space-3 lg:grid-cols-3">
          <div className="flex flex-col gap-space-1">
            <Button variant="action">
              Agendar demonstração <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button variant="primary">Conhecer a plataforma</Button>
            <Button variant="secondary">Falar com um especialista</Button>
          </div>
          <Input label="E-mail profissional" type="email" placeholder="nome@prefeitura.gov.br" icon={<Mail className="size-4" aria-hidden />} />
          <Card>
            <span className="mb-space-2 flex size-12 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
              <Workflow className="size-6" />
            </span>
            <h3 className="text-h3">IA e Automações</h3>
            <p className="text-body text-text-secondary">Agentes que interpretam dados e orquestram decisões.</p>
          </Card>
        </div>
        <DocActions doc={guide} filename="componentes-gove.md" />
      </Reveal>
    </section>
  );
}
