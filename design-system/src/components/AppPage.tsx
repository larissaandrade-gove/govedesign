import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Copy, FolderGit2, Terminal } from 'lucide-react';
import { APPS } from '../data/apps';
import { appHref } from '../lib/router';
import { fadeUp, stagger } from '../lib/motion';
import { EmbeddedApp, hasEmbedded } from './EmbeddedApp';
import { Button } from './ui/Button';
import { Reveal } from './Reveal';

const go = (hash: string) => {
  window.location.hash = hash;
};

export function AppPage({ appId }: { appId: string }) {
  const index = APPS.findIndex((a) => a.id === appId);
  const app = APPS[index];
  const prev = APPS[(index - 1 + APPS.length) % APPS.length];
  const next = APPS[(index + 1) % APPS.length];
  const [copied, setCopied] = useState(false);
  const Icon = app.icon;

  async function copyRun() {
    try {
      await navigator.clipboard.writeText(app.run.split('  →')[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* área de transferência indisponível: o comando continua selecionável */
    }
  }

  return (
    <article className="gutter pb-space-12 pt-[96px] lg:pt-space-8" aria-labelledby="app-title">
      <motion.div key={app.id} variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-space-4">
        {/* Navegação */}
        <motion.nav variants={fadeUp} aria-label="Navegação entre aplicações" className="flex flex-wrap items-center justify-between gap-space-2">
          <Button variant="secondary" onClick={() => go('aplicacoes')}>
            <ArrowLeft className="size-4" aria-hidden /> Todas as aplicações
          </Button>
          <div className="flex flex-wrap gap-space-1">
            <Button variant="secondary" onClick={() => go(`app-${prev.id}`)} aria-label={`Aplicação anterior: ${prev.name}`}>
              <ArrowLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">{prev.name}</span>
            </Button>
            <Button variant="secondary" onClick={() => go(`app-${next.id}`)} aria-label={`Próxima aplicação: ${next.name}`}>
              <span className="hidden sm:inline">{next.name}</span> <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </motion.nav>

        {/* Cabeçalho */}
        <motion.header variants={fadeUp} className="flex flex-col gap-space-2">
          <p className="eyebrow">ecosystem / apps / {app.id}</p>
          <div className="flex flex-wrap items-center gap-space-2">
            <span className="flex size-14 items-center justify-center rounded-lg bg-secondary text-highlight shadow-glow-purple">
              <Icon className="size-7" aria-hidden />
            </span>
            <h1 id="app-title" className="text-[36px] font-black leading-[1.1] sm:text-h1">{app.name}</h1>
          </div>
          <p className="max-w-[720px] text-body-large text-text-secondary">{app.summary}</p>
          <div className="flex flex-wrap items-center gap-space-2 pt-space-1">
            <span className="token rounded-sm border border-secondary px-2 py-1">{app.route}</span>
            <span className="text-caption text-text-secondary">{app.embeddedNote}</span>
          </div>
        </motion.header>

        {/* App em execução aqui dentro */}
        <motion.div variants={fadeUp}>
          <EmbeddedApp id={app.id} name={app.name} />
        </motion.div>

        {/* Capturas */}
        {!hasEmbedded(app.id) && (<>
        <motion.section variants={fadeUp} aria-label="Telas da aplicação" className={`grid grid-cols-1 gap-space-3 ${app.shots.length > 1 ? 'lg:grid-cols-2' : ''}`}>
          {app.shots.map((s) => (
            <figure key={s.src} className="m-0 flex flex-col gap-space-1">
              <div className="overflow-hidden rounded-lg border border-secondary bg-surface shadow-md">
                <img src={s.src} alt={s.caption} loading="lazy" className="block h-auto w-full" />
              </div>
              <figcaption className="text-caption text-text-secondary">{s.caption}</figcaption>
            </figure>
          ))}
        </motion.section>
        <motion.p variants={fadeUp} className="-mt-space-2 text-caption text-text-secondary/80">
          Capturas feitas com dados e logos de exemplo.
        </motion.p>
        </>)}

        {/* Detalhes */}
        <div className="grid grid-cols-1 gap-space-3 lg:grid-cols-3">
          <Reveal className="rounded-lg border border-secondary bg-surface p-space-3">
            <h2 className="mb-space-2 font-display text-h3 font-bold">O que faz</h2>
            <ul className="flex flex-col gap-space-1">
              {app.features.map((f) => (
                <li key={f} className="flex items-start gap-space-1 text-body text-text-secondary">
                  <Check className="mt-1 size-4 shrink-0 text-highlight" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="rounded-lg border border-secondary bg-surface p-space-3">
            <h2 className="mb-space-2 font-display text-h3 font-bold">Tecnologias</h2>
            <ul className="flex flex-wrap gap-space-1">
              {app.stack.map((t) => (
                <li key={t} className="rounded-full bg-background px-3 py-1 text-caption text-text-secondary">
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-space-3 flex items-center gap-space-1 text-caption text-text-secondary">
              <FolderGit2 className="size-4 shrink-0" aria-hidden /> <span className="token min-w-0 break-words">{app.folder}</span>
            </p>
          </Reveal>
          <Reveal className="flex min-w-0 flex-col gap-space-2 rounded-lg border border-secondary bg-surface p-space-3">
            <h2 className="font-display text-h3 font-bold">Como rodar no servidor</h2>
            <div className="flex items-start gap-space-1 rounded-md bg-background p-space-2">
              <Terminal className="mt-0.5 size-4 shrink-0 text-link" aria-hidden />
              <code className="token min-w-0 flex-1 select-all break-words">{app.run}</code>
            </div>
            <Button variant="secondary" onClick={copyRun} className="self-start">
              {copied ? <Check className="size-4 text-highlight" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Copiado' : 'Copiar comando'}
            </Button>
          </Reveal>
        </div>

        {/* Outras aplicações */}
        <Reveal className="flex flex-col gap-space-2 border-t border-secondary/60 pt-space-4">
          <h2 className="font-display text-h3 font-bold">Outras aplicações</h2>
          <div className="flex flex-wrap gap-space-1">
            {APPS.filter((a) => a.id !== app.id).map((a) => {
              const AIcon = a.icon;
              return (
                <a
                  key={a.id}
                  href={appHref(a.id)}
                  className="inline-flex h-12 items-center gap-space-1 rounded-md border border-secondary px-space-2 text-body text-text-primary no-underline transition-[border-color,box-shadow,transform] duration-200 hover:scale-[1.02] hover:border-lilac hover:shadow-glow-purple"
                >
                  <AIcon className="size-4 text-highlight" aria-hidden /> {a.name}
                </a>
              );
            })}
          </div>
        </Reveal>
      </motion.div>
    </article>
  );
}
