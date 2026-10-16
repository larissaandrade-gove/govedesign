import { Check, X } from 'lucide-react';
import { LOGOS, LOGO_MIN_CONTRAST, contrast } from '../../../brand/logos.js';
import { GoveLogo, logoSrc } from './GoveLogo';
import { Reveal, RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';

const BACKGROUNDS = [
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Gelo', hex: '#F4F4F4' },
  { name: 'Amarelo Ouro', hex: '#FFC72C' },
  { name: 'Roxo Gove', hex: '#3D0099' },
  { name: 'Roxo Noite', hex: '#20133D' },
  { name: 'Grafite', hex: '#2F3539' },
];

/** Versões oficiais e a regra de aplicação: todas as cores da logo com contraste ≥ 4,5:1 com o fundo. */
export function Logomarca() {
  return (
    <section id="logomarca" className="gutter scroll-mt-[72px] border-t border-secondary/60 py-space-8">
      <SectionHeader id="logomarca" title="Logomarca">
        Todas as cores da logo com contraste mínimo de {LOGO_MIN_CONTRAST.toString().replace('.', ',')}:1 com o fundo. Símbolo em espaços 1:1;
        logotipo em espaços horizontais.
      </SectionHeader>

      <StaggerGrid className="grid grid-cols-1 gap-space-2 sm:grid-cols-2 xl:grid-cols-3">
        {BACKGROUNDS.map((bg) => (
          <RevealItem key={bg.hex}>
            <figure className="m-0 flex flex-col overflow-hidden rounded-lg border border-secondary">
              <div className="flex h-32 items-center justify-center gap-space-4 px-space-3" style={{ background: bg.hex }}>
                <GoveLogo kind="simbolo" height={56} background={bg.hex} />
                <GoveLogo kind="logotipo" height={40} background={bg.hex} />
              </div>
              <figcaption className="flex items-center justify-between gap-space-1 bg-background px-space-2 py-space-1 text-caption text-text-secondary">
                <span className="font-semibold text-text-primary">{bg.name}</span>
                <span className="token tabular-nums">{bg.hex}</span>
              </figcaption>
            </figure>
          </RevealItem>
        ))}
      </StaggerGrid>

      <Reveal className="mt-space-4 overflow-x-auto rounded-lg border border-secondary">
        <table className="w-full min-w-[560px] border-collapse text-caption">
          <caption className="sr-only">Contraste de cada versão por fundo</caption>
          <thead>
            <tr className="bg-surface text-left text-text-primary">
              <th scope="col" className="px-space-2 py-space-1 font-semibold">Versão</th>
              {BACKGROUNDS.map((bg) => (
                <th key={bg.hex} scope="col" className="px-space-1 py-space-1 font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="size-4 shrink-0 rounded-sm border border-secondary" style={{ background: bg.hex }} aria-hidden />
                    {bg.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['simbolo', 'logotipo'] as const).flatMap((kind) =>
              LOGOS[kind].variants.map((v) => (
                <tr key={v.file} className="border-t border-secondary">
                  <th scope="row" className="px-space-2 py-space-1 text-left font-normal">
                    <span className="flex items-center gap-space-1">
                      <span className={`flex h-8 w-12 items-center justify-center rounded-sm ${v.id.startsWith('branco') ? 'bg-[#20133D]' : 'bg-surface'}`}>
                        <img src={logoSrc(v.file)} alt="" className="max-h-6 max-w-10" style={v.id.startsWith('branco') ? { filter: 'drop-shadow(0 0 1px #20133D)' } : undefined} />
                      </span>
                      <span className="text-text-primary">{kind === 'simbolo' ? 'Símbolo' : 'Logotipo'} {v.id.replace('-', ' + ')}</span>
                    </span>
                  </th>
                  {BACKGROUNDS.map((bg) => (
                    <td key={bg.hex} className="px-space-1 py-space-1 align-top tabular-nums">
                      <span className="flex flex-col gap-0.5">
                        {v.colors.map((c) => {
                          const ratio = contrast(c, bg.hex);
                          const ok = ratio >= LOGO_MIN_CONTRAST;
                          return (
                            <span key={c} className={`inline-flex items-center gap-1 ${ok ? 'text-text-primary' : 'text-text-muted'}`} title={`${c} sobre ${bg.hex}`}>
                              <span className="size-3 shrink-0 rounded-full border border-secondary" style={{ background: c }} aria-hidden />
                              {ratio.toFixed(1).replace('.', ',')}
                              {ok ? <Check className="size-3.5 text-highlight" aria-label="Aprovado" /> : <X className="size-3.5" aria-label="Reprovado" />}
                            </span>
                          );
                        })}
                      </span>
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </Reveal>
    </section>
  );
}
