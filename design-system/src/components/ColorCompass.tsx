import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, MapPin, MessageCircle, User } from 'lucide-react';
import { ATTRIBUTES, BRAND_COLORS, QUESTIONS, TOPICS, colorByHex } from '../data/colorCompass';
import { Reveal } from './Reveal';

const AXIS_ICON = { Pessoa: User, Situação: MessageCircle, Lugar: MapPin } as const;

const STEPS = ['Contexto', 'Pauta', 'Tom'] as const;

/**
 * Navegador da nova bússola de cores: a narrativa do estudo de predominância —
 * entender o contexto (pessoa, situação, lugar), escolher a pauta e ajustar o tom —
 * e o resultado em proporções de cor.
 */
export function ColorCompass() {
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState(0);
  const [attr, setAttr] = useState<number | null>(null);

  const t = TOPICS[topic];
  const highlighted = useMemo(() => {
    const set = new Set(t.mix.map((m) => m.hex));
    if (attr !== null) ATTRIBUTES[attr].colors.forEach((h) => set.add(h));
    return set;
  }, [t, attr]);

  const tab = (i: number) =>
    `flex min-h-11 flex-1 items-center justify-center gap-space-1 rounded-md px-space-2 text-caption font-semibold transition-colors ${
      step === i ? 'bg-background text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
    }`;

  return (
    <Reveal className="mt-space-6 overflow-hidden rounded-lg border border-secondary bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-space-2 border-b border-secondary bg-background px-space-3 py-space-2">
        <h3 className="flex items-center gap-space-1 font-display text-h3 font-bold">
          <Compass className="size-6 text-highlight" aria-hidden /> Bússola de cores
        </h3>
        <div role="tablist" aria-label="Etapas" className="flex w-full gap-1 rounded-lg bg-surface p-1 sm:w-auto">
          {STEPS.map((s, i) => (
            <button key={s} type="button" role="tab" aria-selected={step === i} onClick={() => setStep(i)} className={tab(i)}>
              <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-[11px] text-text-primary">{i + 1}</span>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-space-4 p-space-3 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Roda: as cores da marca na posição da nova bússola */}
        <div className="flex flex-col items-center gap-space-2">
          <div
            className="relative aspect-square w-full max-w-[320px] rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 38%, rgba(255,255,255,0) 70%), conic-gradient(from 0deg, #ffe600 0deg, #ff8a00 45deg, #ff1a1a 90deg, #ff00b3 135deg, #8a00ff 165deg, #3b00ff 190deg, #0066ff 215deg, #00e6e6 260deg, #00e65c 300deg, #7dff00 330deg, #ffe600 360deg)',
            }}
            role="img"
            aria-label={`Bússola de cores: destaque para ${[...highlighted].map((h) => colorByHex(h).name).join(', ')}`}
          >
            {BRAND_COLORS.map((c) => {
              const on = highlighted.has(c.hex);
              return (
                <motion.span
                  key={c.hex}
                  title={c.name}
                  animate={{ scale: on ? 1.25 : 0.85, opacity: on ? 1 : 0.45 }}
                  transition={{ duration: 0.25 }}
                  className="absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
                  style={{ left: `${c.at.x}%`, top: `${c.at.y}%`, background: c.hex }}
                />
              );
            })}
          </div>
          <div className="flex h-4 w-full max-w-[320px] overflow-hidden rounded-full ring-1 ring-secondary" aria-hidden>
            {t.mix.map((m) => (
              <span key={m.hex} style={{ width: `${m.share}%`, background: m.hex }} />
            ))}
          </div>
        </div>

        {/* Narrativa */}
        <div className="flex min-w-0 flex-col gap-space-3">
          {step === 0 && (
            <>
              <p className="text-body text-text-secondary">
                Antes da cor, o contexto. Responda às perguntas para definir a pauta e o tom da peça.
              </p>
              <div className="grid grid-cols-1 gap-space-2 sm:grid-cols-3">
                {QUESTIONS.map((q) => {
                  const Icon = AXIS_ICON[q.axis as keyof typeof AXIS_ICON];
                  return (
                    <div key={q.axis} className="rounded-md border border-secondary bg-background p-space-2">
                      <p className="mb-space-1 flex items-center gap-space-1 font-semibold text-text-primary">
                        <Icon className="size-4 text-highlight" aria-hidden /> {q.axis}
                      </p>
                      <ul className="flex flex-col gap-1 text-caption text-text-secondary">
                        {q.items.map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => setStep(1)} className="min-h-11 self-start rounded-md bg-accent px-space-3 font-semibold text-on-accent shadow-glow-yellow">
                Escolher a pauta
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex flex-wrap gap-space-1" role="radiogroup" aria-label="Pauta">
                {TOPICS.map((p, i) => (
                  <button
                    key={p.name}
                    type="button"
                    role="radio"
                    aria-checked={topic === i}
                    onClick={() => setTopic(i)}
                    className={`min-h-11 rounded-full border px-space-2 text-caption font-medium transition-colors ${
                      topic === i ? 'border-primary bg-primary text-on-primary' : 'border-secondary bg-background text-text-primary hover:border-primary'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <TopicResult index={topic} />
              <button type="button" onClick={() => setStep(2)} className="min-h-11 self-start rounded-md bg-accent px-space-3 font-semibold text-on-accent shadow-glow-yellow">
                Ajustar o tom
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-body text-text-secondary">Que sensação a peça precisa passar? O atributo reforça cores na bússola.</p>
              <div className="grid grid-cols-3 gap-space-1" role="radiogroup" aria-label="Tom">
                {ATTRIBUTES.map((a, i) => (
                  <button
                    key={a.name}
                    type="button"
                    role="radio"
                    aria-checked={attr === i}
                    onClick={() => setAttr(attr === i ? null : i)}
                    className={`min-h-11 rounded-md border px-space-1 text-caption font-semibold transition-colors ${
                      attr === i ? 'border-primary bg-primary text-on-primary' : 'border-secondary bg-background text-text-primary hover:border-primary'
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
              <TopicResult index={topic} attr={attr} />
            </>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function TopicResult({ index, attr = null }: { index: number; attr?: number | null }) {
  const t = TOPICS[index];
  const extra = attr === null ? [] : ATTRIBUTES[attr].colors.filter((h) => !t.mix.some((m) => m.hex === h));
  return (
    <div className="flex flex-col gap-space-2 rounded-md border border-secondary bg-background p-space-2">
      <p className="font-semibold text-text-primary">{t.name}</p>
      <ul className="flex flex-col gap-1">
        {t.mix.map((m) => {
          const c = colorByHex(m.hex);
          return (
            <li key={m.hex} className="flex items-center gap-space-1 text-caption">
              <span className="size-4 shrink-0 rounded-sm border border-secondary" style={{ background: m.hex }} aria-hidden />
              <span className="w-10 shrink-0 tabular-nums text-text-primary">{m.share}%</span>
              <span className="min-w-0 text-text-secondary">
                <span className="font-semibold text-text-primary">{c.name}</span> · {c.story}
              </span>
            </li>
          );
        })}
      </ul>
      {attr !== null && (
        <p className="text-caption text-text-secondary">
          Tom <span className="font-semibold text-text-primary">{ATTRIBUTES[attr].name}</span>:{' '}
          {extra.length ? `reforce com ${extra.map((h) => colorByHex(h).name).join(' e ')} em detalhes.` : 'a pauta já carrega esse tom.'}
        </p>
      )}
      <p className="text-caption text-text-secondary">
        <span className="font-semibold text-text-primary">Foco:</span> {t.focus}
      </p>
    </div>
  );
}
