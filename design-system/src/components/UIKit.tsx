import { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Mail, MessageCircle, Plus, Search, Send, User, Workflow } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Reveal, RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';
import { CityBackdrop } from './CityBackdrop';

function Demo({ title, code, children }: { title: string; code: string; children: React.ReactNode }) {
  return (
    <Reveal className="flex min-w-0 flex-col gap-space-2">
      <h3 className="text-h3">{title}</h3>
      <div className="rounded-lg border border-secondary bg-background/70 p-space-3 backdrop-blur-sm md:p-space-4">{children}</div>
      <pre className="overflow-x-auto rounded-md border border-secondary/70 bg-background px-space-2 py-space-2 text-[13px] leading-relaxed text-text-secondary">
        <code>{code}</code>
      </pre>
    </Reveal>
  );
}

const LAYERS = [
  { icon: User, title: 'Cadastro Central', text: 'Fonte única da verdade de cidadãos e empresas, por CPF e CNPJ.' },
  { icon: Workflow, title: 'IA e Automações', text: 'Agentes que interpretam dados, executam regras e orquestram decisões.' },
  { icon: MessageCircle, title: 'Relacionamento', text: 'WhatsApp, Portal Cidadão e disparos multicanal em um só lugar.' },
];

export function UIKit() {
  const [sent, setSent] = useState(false);
  return (
    <section id="componentes" className="relative isolate scroll-mt-[72px] overflow-hidden border-t border-secondary/60">
      {/* Skyline discreto ao fundo, com overlay para não competir com os componentes */}
      <CityBackdrop className="absolute inset-x-0 bottom-0 -z-10 h-[420px] w-full opacity-40" seed={3} density={0.8} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/90 to-background/70" />

      <div className="gutter py-space-12">
        <SectionHeader id="componentes" token="components" title="Componentes">
          Exemplos ao vivo dos componentes base. Passe o mouse, use Tab para navegar e clique nos campos para ver o foco.
        </SectionHeader>

        <div className="grid grid-cols-1 gap-space-8">
          <Demo
            title="Botões"
            code={`<Button variant="primary">Conhecer a plataforma</Button>\n<Button variant="action">Agendar demonstração</Button>\n<Button variant="secondary">Falar com um especialista</Button>`}
          >
            <div className="flex flex-col gap-space-3">
              <div className="flex flex-wrap items-center gap-space-2">
                <Button variant="primary">Conhecer a plataforma</Button>
                <Button variant="action">
                  Agendar demonstração <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button variant="secondary">Falar com um especialista</Button>
              </div>
              <div className="flex flex-wrap items-center gap-space-2">
                <Button variant="primary" size="lg">
                  <Plus className="size-5" aria-hidden /> Novo agente
                </Button>
                <Button variant="secondary" disabled>
                  Indisponível
                </Button>
              </div>
              <p className="text-caption text-text-secondary">
                Primário (roxo) para ações principais · Ação (amarelo) só para a mais importante da tela · Secundário (contorno)
                para as alternativas.
              </p>
            </div>
          </Demo>

          <Demo title="Cards" code={`<Card>\n  <Icon /> <h3>Cadastro Central</h3>\n  <p>…</p>\n</Card>`}>
            <StaggerGrid className="grid grid-cols-1 gap-space-3 md:grid-cols-3">
              {LAYERS.map(({ icon: Icon, title, text }) => (
                <RevealItem key={title}>
                  <Card className="flex h-full flex-col gap-space-2">
                    <span className="flex size-12 items-center justify-center rounded-md bg-secondary text-accent">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <h4 className="font-display text-h3 font-bold text-text-primary">{title}</h4>
                    <p className="text-body text-text-secondary">{text}</p>
                  </Card>
                </RevealItem>
              ))}
            </StaggerGrid>
          </Demo>

          <Demo
            title="Inputs"
            code={`<Input label="E-mail profissional" type="email" placeholder="nome@prefeitura.gov.br" />`}
          >
            <div className="grid grid-cols-1 gap-space-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-space-3">
                <Input label="Buscar cidadão" placeholder="Nome, CPF ou CNPJ" icon={<Search className="size-4" />} />
                <Input label="Município" defaultValue="Divinópolis - MG" icon={<Building2 className="size-4" />} />
                <Input label="Campo desabilitado" placeholder="Somente leitura" disabled hint="Placeholder e desabilitado usam text-muted." />
              </div>

              <Card interactive={false} className="flex flex-col gap-space-3">
                <div>
                  <h4 className="font-display text-h3 font-bold text-text-primary">Agendar demonstração</h4>
                  <p className="text-caption text-text-secondary">Exemplo de formulário — nada é enviado.</p>
                </div>
                {sent ? (
                  <p className="flex items-center gap-space-1 rounded-md bg-background p-space-2 text-body text-text-primary" role="status">
                    <CheckCircle2 className="size-5 text-accent" aria-hidden /> Pedido registrado nesta demonstração.
                  </p>
                ) : (
                  <form
                    className="flex flex-col gap-space-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSent(true);
                    }}
                  >
                    <Input id="demo-nome" label="Nome completo" placeholder="Maria Souza" required />
                    <Input id="demo-email" label="E-mail profissional" type="email" placeholder="maria@prefeitura.gov.br" icon={<Mail className="size-4" />} required />
                    <Button type="submit" variant="action" className="mt-space-1 w-full">
                      Solicitar demonstração <Send className="size-4" aria-hidden />
                    </Button>
                  </form>
                )}
              </Card>
            </div>
          </Demo>
        </div>
      </div>
    </section>
  );
}
