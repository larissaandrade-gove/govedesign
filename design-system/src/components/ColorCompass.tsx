import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CaretDown, ChatCircle, Check, Copy, MapPin, User } from '@phosphor-icons/react';
import { ATTRIBUTES, BRAND_COLORS, QUESTIONS, TOPICS, colorByHex, topicReviewPrompt, type BrandColor } from '../data/colorCompass';
import { copy } from './color-tools/shared';
import { FEATURES } from '../data/features';
import { ColorTools } from './color-tools/ColorTools';

const AXIS_ICON = { Pessoa: User, Situação: ChatCircle, Lugar: MapPin } as const;
const STEPS = FEATURES.colorTools ? (['Contexto', 'Pauta', 'Tom', 'Ferramentas'] as const) : (['Contexto', 'Pauta', 'Tom'] as const);
const TOOLS_STEP = 3;
const MAX_WORDS = 3;

/**
 * Bússola de cores: Contexto (as cores e o que comunicam), Pauta (predominância
 * por assunto) e Tom (palavras-chave da nova bússola, até 3 ao mesmo tempo).
 */
export function ColorCompass() {
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState<number | null>(null);
  const [words, setWords] = useState<number[]>([]);

  const topicHexes = useMemo(() => new Set(topic === null ? [] : TOPICS[topic].mix.map((m) => m.hex)), [topic]);

  /** Cores em destaque no círculo, conforme a aba. */
  const highlighted = useMemo(() => {
    if (step === 1) return topicHexes;
    if (step === 2) {
      if (topic !== null) return topicHexes;
      return new Set(words.flatMap((i) => ATTRIBUTES[i].colors));
    }
    return new Set<string>();
  }, [step, topic, topicHexes, words]);

  /** Palavras que remetem às cores da pauta selecionada. */
  const relatedWords = useMemo(() => new Set(topic === null ? [] : ATTRIBUTES.flatMap((a, i) => (a.colors.some((h) => topicHexes.has(h)) ? [i] : []))), [topic, topicHexes]);

  const toggleWord = (i: number) => setWords((ws) => (ws.includes(i) ? ws.filter((w) => w !== i) : [...ws, i].slice(-MAX_WORDS)));

  const showBar = step !== 0 && topic !== null;

  return (
    <div className="overflow-hidden rounded-lg border border-secondary bg-surface">
      <div role="tablist" aria-label="Etapas da bússola" className="flex gap-1 border-b border-secondary bg-background p-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={step === i}
            onClick={() => setStep(i)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-space-1 rounded-md px-space-1 text-caption font-semibold transition-colors ${
              step === i ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="hidden size-5 items-center justify-center rounded-full bg-secondary text-[11px] text-text-primary sm:flex">{i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {FEATURES.colorTools && step === TOOLS_STEP ? (
        <div className="p-space-2 md:p-space-3">
          <ColorTools />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-space-3 p-space-2 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:p-space-3">
          {/* Círculo cromático com as cores da marca na posição da nova bússola */}
          <div className="flex flex-col items-center gap-space-2 md:sticky md:top-space-2 md:self-start">
            <Wheel highlighted={highlighted} />
            {showBar && (
              <div className="flex h-3 w-full max-w-[240px] overflow-hidden rounded-full ring-1 ring-secondary" aria-hidden>
                {TOPICS[topic!].mix.map((m) => (
                  <span key={m.hex} style={{ width: `${m.share}%`, background: m.hex }} />
                ))}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-space-2">
            {step === 0 && <ContextTab />}

            {step === 1 && (
              <>
                <div className="flex flex-wrap gap-space-1" role="group" aria-label="Pauta (clique de novo para limpar)">
                  {TOPICS.map((p, i) => (
                    <button
                      key={p.name}
                      type="button"
                      aria-pressed={topic === i}
                      onClick={() => setTopic(topic === i ? null : i)}
                      className={`min-h-11 rounded-full border px-space-2 text-caption font-medium transition-colors ${
                        topic === i ? 'border-primary bg-primary text-on-primary' : 'border-secondary bg-background text-text-primary hover:border-primary'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                {topic !== null ? <TopicResult index={topic} words={words} /> : <p className="text-caption text-text-secondary">Escolha uma pauta para ver a predominância de cores.</p>}
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-caption text-text-secondary">{topic !== null ? `Palavras em destaque remetem às cores de “${TOPICS[topic].name}”.` : `Escolha até ${MAX_WORDS} palavras para ver as cores na bússola.`}</p>
                <div className="grid grid-cols-3 gap-space-1" role="group" aria-label="Tom">
                  {ATTRIBUTES.map((a, i) => {
                    const on = words.includes(i);
                    const related = relatedWords.has(i);
                    return (
                      <button
                        key={a.name}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleWord(i)}
                        className={`relative min-h-11 rounded-md border px-space-1 text-caption font-semibold transition-colors ${
                          on ? 'border-primary bg-primary text-on-primary' : related ? 'border-accent bg-accent/25 text-text-primary' : 'border-secondary bg-background text-text-primary hover:border-primary'
                        }`}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
                {words.length > 0 && (
                  <ul className="flex flex-col gap-1 rounded-md border border-secondary bg-background p-space-2 text-caption">
                    {words.map((i) => (
                      <li key={i} className="flex flex-wrap items-center gap-space-1">
                        <span className="font-semibold text-text-primary">{ATTRIBUTES[i].name}</span>
                        {ATTRIBUTES[i].colors.map((h) => (
                          <span key={h} className="inline-flex items-center gap-1 text-text-secondary">
                            <span className="size-3 rounded-full border border-text-primary/25" style={{ background: h }} aria-hidden />
                            {colorByHex(h).name}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Wheel({ highlighted }: { highlighted: Set<string> }) {
  const any = highlighted.size > 0;
  return (
    <div
      className="relative aspect-square w-full max-w-[200px] rounded-full md:max-w-[240px]"
      style={{
        background:
          'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 38%, rgba(255,255,255,0) 70%), conic-gradient(from 0deg, #ffe600 0deg, #ff8a00 45deg, #ff1a1a 90deg, #ff00b3 135deg, #8a00ff 165deg, #3b00ff 190deg, #0066ff 215deg, #00e6e6 260deg, #00e65c 300deg, #7dff00 330deg, #ffe600 360deg)',
      }}
      role="img"
      aria-label={any ? `Bússola de cores: ${[...highlighted].map((h) => colorByHex(h).name).join(', ')}` : 'Bússola de cores da marca'}
    >
      {BRAND_COLORS.map((c) => {
        const on = !any || highlighted.has(c.hex);
        return (
          <motion.span
            key={c.hex}
            title={c.name}
            animate={{ scale: any && on ? 1.25 : on ? 1 : 0.8, opacity: on ? 1 : 0.35 }}
            transition={{ duration: 0.25 }}
            className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{ left: `${c.at.x}%`, top: `${c.at.y}%`, background: c.hex }}
          />
        );
      })}
    </div>
  );
}

/** Aba Contexto: as cores (principais e secundárias), com detalhes sob demanda, e as perguntas de partida. */
function ContextTab() {
  const groups = [
    { title: 'Principais', items: BRAND_COLORS.filter((c) => c.group === 'principal') },
    { title: 'Secundárias', items: BRAND_COLORS.filter((c) => c.group === 'secundária') },
  ];
  return (
    <>
      <div className="grid grid-cols-1 gap-space-2 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-1">
            <h4 className="text-caption font-semibold uppercase tracking-wide text-text-secondary">{g.title}</h4>
            {g.items.map((c) => (
              <ColorItem key={c.hex} c={c} />
            ))}
          </div>
        ))}
      </div>
      <details className="rounded-md border border-secondary bg-background">
        <summary className="flex min-h-11 cursor-pointer items-center px-space-2 text-caption font-semibold text-text-primary">Perguntas antes de escolher</summary>
        <div className="grid grid-cols-1 gap-space-2 px-space-2 pb-space-2 sm:grid-cols-3">
          {QUESTIONS.map((q) => {
            const Icon = AXIS_ICON[q.axis as keyof typeof AXIS_ICON];
            return (
              <div key={q.axis}>
                <p className="mb-1 flex items-center gap-1 text-caption font-semibold text-text-primary">
                  <Icon className="size-4 text-highlight" aria-hidden /> {q.axis}
                </p>
                <ul className="flex flex-col gap-0.5 text-caption text-text-secondary">
                  {q.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>
    </>
  );
}

function ColorItem({ c }: { c: BrandColor }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(c.hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* área de transferência indisponível */
    }
  }
  return (
    <div className="rounded-md border border-secondary bg-background">
      <div className="flex items-center gap-space-1 pl-space-1">
        <span className="size-6 shrink-0 rounded-sm border border-text-primary/25" style={{ background: c.hex }} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-caption font-semibold text-text-primary">{c.name}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copiar ${c.hex}`}
          title="Copiar HEX"
          className="flex min-h-11 items-center gap-1 rounded-md px-1 text-caption tabular-nums text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          <span className="token">{c.hex}</span>
          {copied ? <Check className="size-3.5 text-highlight" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? 'Ocultar' : 'Mostrar'} detalhes de ${c.name}`}
          title={open ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          <CaretDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-1 border-t border-secondary px-space-2 py-space-1 text-caption">
          <p className="tabular-nums text-text-secondary">RGB {c.rgb}</p>
          <p className="text-text-primary">{c.use}</p>
          <p className="text-text-secondary">{c.meaning}</p>
          <p className="text-text-secondary">{c.story}</p>
        </div>
      )}
    </div>
  );
}

function TopicResult({ index, words }: { index: number; words: number[] }) {
  const t = TOPICS[index];
  const [copied, setCopied] = useState<boolean | null>(null);
  async function copyPrompt() {
    setCopied(await copy(topicReviewPrompt(index, words)));
    setTimeout(() => setCopied(null), 2000);
  }
  return (
    <div className="flex flex-col gap-space-1 rounded-md border border-secondary bg-background p-space-2">
      <ul className="flex flex-col gap-1">
        {t.mix.map((m) => {
          const c = colorByHex(m.hex);
          return (
            <li key={m.hex} className="flex items-start gap-space-1 text-caption">
              <span className="mt-0.5 size-4 shrink-0 rounded-sm border border-text-primary/25" style={{ background: m.hex }} aria-hidden />
              <span className="w-9 shrink-0 tabular-nums text-text-primary">{m.share}%</span>
              <span className="min-w-0 text-text-secondary">
                <span className="font-semibold text-text-primary">{c.name}</span> · {c.story}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-caption text-text-secondary">
        <span className="font-semibold text-text-primary">Foco:</span> {t.focus}
      </p>
      <div className="mt-space-1 flex flex-wrap items-center gap-space-1 border-t border-secondary pt-space-2">
        <button
          type="button"
          onClick={copyPrompt}
          className="inline-flex min-h-11 items-center gap-space-1 rounded-md border border-secondary bg-surface px-space-2 text-caption font-semibold text-text-primary transition-colors hover:border-primary focus-visible:border-primary focus-visible:shadow-glow-purple focus-visible:outline-none"
        >
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? 'Copiado' : 'Copiar prompt de revisão'}
        </button>
        <span role="status" aria-live="polite" className="text-caption text-text-secondary">
          {copied === false ? 'Não foi possível copiar.' : copied ? `Prompt da pauta “${t.name}” na área de transferência.` : ''}
        </span>
      </div>
    </div>
  );
}
