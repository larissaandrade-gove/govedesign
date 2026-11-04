import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, Sparkle, Stop } from '@phosphor-icons/react';
import type { CaseData, Textos } from '@/data/case.ts';
import { generateTexts, getSample } from '@/lib/claude.ts';
import { TEXT_LIMITS, type TextField, type Validated } from '@/lib/prompt.ts';
import { Button, Field, Note } from './ui.tsx';

type Props = { c: CaseData; update: (patch: Partial<CaseData>) => void };

const FIELD_LABEL: Record<string, string> = {
  titulo: 'Título',
  resumo: 'Resumo',
  desafio: 'Desafio',
  solucao: 'Solução',
  resultado: 'Resultado',
  destaque0: 'Destaque 1',
  destaque1: 'Destaque 2',
  destaque2: 'Destaque 3',
};

export function StepTextos({ c, update }: Props) {
  const [canSample, setCanSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [flagged, setFlagged] = useState<Validated['flagged']>([]);
  const [generated, setGenerated] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    void getSample().then((s) => alive && setCanSample(!!s));
    return () => {
      alive = false;
      ctl.current?.abort();
    };
  }, []);

  const setText = (patch: Partial<Textos>) => update({ textos: { ...c.textos, ...patch } });
  const setDestaque = (i: number, s: string) => setText({ destaques: c.textos.destaques.map((d, j) => (j === i ? s : d)) });

  const run = async () => {
    ctl.current?.abort();
    const ac = new AbortController();
    ctl.current = ac;
    setBusy(true);
    setMsg('');
    setFlagged([]);
    const r = await generateTexts(c, ac.signal);
    if (ac.signal.aborted) return;
    setBusy(false);
    if (!r.ok) {
      setMsg(r.message);
      if (r.hide) setCanSample(false);
      return;
    }
    const { accepted, flagged: fl, errors } = r.result;
    setText({ ...accepted, destaques: accepted.destaques ?? c.textos.destaques });
    setFlagged(fl);
    setGenerated(true);
    setMsg(errors.length ? errors.join(' ') : fl.length ? '' : 'Textos gerados. Revise antes de exportar.');
  };

  const applyFlagged = (f: { field: TextField; text: string }) => {
    if (f.field.startsWith('destaque')) setDestaque(Number(f.field.slice(-1)), f.text);
    else setText({ [f.field]: f.text } as Partial<Textos>);
    setFlagged((l) => l.filter((x) => x !== f));
  };

  return (
    <div className="space-y-space-3">
      {canSample && (
        <div className="card space-y-2">
          <p className="text-[14px]">O Claude escreve uma proposta com os indicadores marcados e o contexto. Ele só pode usar os números do case; textos com outros números ficam de fora para você decidir.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={run} disabled={busy || !c.municipio.trim()}>
              {generated ? <ArrowClockwise className="size-5" aria-hidden /> : <Sparkle className="size-5" aria-hidden />}
              {busy ? 'Gerando…' : generated ? 'Gerar novamente' : 'Gerar textos com Claude'}
            </Button>
            {busy && (
              <Button variant="ghost" onClick={() => (ctl.current?.abort(), setBusy(false))}>
                <Stop className="size-5" aria-hidden /> Parar
              </Button>
            )}
          </div>
          <p className="text-[13px] text-text-secondary" aria-live="polite">
            {busy ? 'Pensando… pode levar até um minuto.' : msg}
          </p>
        </div>
      )}
      {flagged.length > 0 && (
        <Note tone="warn">
          <p className="font-semibold">Números que não estão nos dados do case. Estes textos não foram aplicados:</p>
          <ul className="mt-2 space-y-2">
            {flagged.map((f) => (
              <li key={f.field} className="rounded-md bg-background p-2">
                <p className="text-[13px] font-semibold text-text-primary">
                  {FIELD_LABEL[f.field]}: {f.numbers.join(', ')}
                </p>
                <p className="text-[14px]">{f.text}</p>
                <Button variant="ghost" className="mt-1" onClick={() => applyFlagged(f)}>
                  Usar mesmo assim
                </Button>
              </li>
            ))}
          </ul>
        </Note>
      )}

      <Field id="titulo" label="Título" counter={{ n: c.textos.titulo.length, max: TEXT_LIMITS.titulo }}>
        <input id="titulo" className="field" value={c.textos.titulo} placeholder="ex.: frase curta com o principal resultado" onChange={(e) => setText({ titulo: e.target.value })} />
      </Field>
      <Area id="resumo" label="Resumo" value={c.textos.resumo} max={TEXT_LIMITS.resumo} rows={3} onChange={(resumo) => setText({ resumo })} />
      <Area id="desafio" label="Desafio" value={c.textos.desafio} max={TEXT_LIMITS.desafio} onChange={(desafio) => setText({ desafio })} />
      <Area id="solucao" label="Solução" value={c.textos.solucao} max={TEXT_LIMITS.solucao} onChange={(solucao) => setText({ solucao })} />
      <Area id="resultado" label="Resultado" value={c.textos.resultado} max={TEXT_LIMITS.resultado} onChange={(resultado) => setText({ resultado })} />
      <fieldset className="space-y-2">
        <legend className="label">Destaques (até 3)</legend>
        {c.textos.destaques.map((d, i) => (
          <input key={i} aria-label={`Destaque ${i + 1}`} className="field" value={d} maxLength={TEXT_LIMITS.destaque + 40} placeholder="ex.: uma frase curta" onChange={(e) => setDestaque(i, e.target.value)} />
        ))}
      </fieldset>

      <fieldset className="card space-y-space-2">
        <legend className="px-1 font-sans text-[16px] font-semibold text-text-primary">Chamada final e contato</legend>
        <Field id="cta" label="Chamada para ação" counter={{ n: c.contato.cta.length, max: 60 }}>
          <input id="cta" className="field" value={c.contato.cta} onChange={(e) => update({ contato: { ...c.contato, cta: e.target.value } })} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ['nome', 'Nome ou equipe', 'ex.: equipe comercial'],
              ['email', 'E-mail', 'ex.: nome@empresa.com'],
              ['site', 'Site', 'ex.: site da empresa'],
            ] as const
          ).map(([k, label, ph]) => (
            <Field key={k} id={`contato-${k}`} label={label}>
              <input id={`contato-${k}`} className="field" value={c.contato[k]} placeholder={ph} type={k === 'email' ? 'email' : 'text'} onChange={(e) => update({ contato: { ...c.contato, [k]: e.target.value } })} />
            </Field>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function Area({ id, label, value, max, rows = 4, onChange }: { id: string; label: string; value: string; max: number; rows?: number; onChange: (s: string) => void }) {
  return (
    <Field id={id} label={label} counter={{ n: value.length, max }}>
      <textarea id={id} rows={rows} className="field py-3" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
