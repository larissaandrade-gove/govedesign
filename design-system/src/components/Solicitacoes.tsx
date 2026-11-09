import { useState } from 'react';
import { ArrowSquareOut, Clock, Gift, Ticket, WarningCircle } from '@phosphor-icons/react';
import { LEAD_HOURS, RAR_URL, TICKET_TYPES } from '../../../shared/tickets.js';
import { useRequests } from '../lib/requests';
import type { StoredTicket } from '../lib/tickets';
import { ExpedienteCard } from './ExpedienteCard';
import { Forecast, RecentList, TICKET_ICONS, useForecasts } from './RequestDialog';
import { SectionHeader } from './SectionHeader';

/**
 * Página Solicitações: os pedidos de quem vê (todos, para a responsável) e,
 * só para a responsável, o horário de trabalho. As demais pessoas veem o prazo
 * mínimo e a entrega prevista. O pedido novo abre pelo botão flutuante.
 */
export function Solicitacoes({ level = 2 }: { level?: 1 | 2 }) {
  const { mode, expediente, list, retry } = useRequests();
  const owner = Boolean(expediente?.canEdit);
  const forecast = useForecasts(true);
  const [retryNote, setRetryNote] = useState('');

  const onRetry = async (t: StoredTicket) => {
    setRetryNote('');
    try {
      const r = await retry(t);
      setRetryNote(r.notes.join(' ') || `${t.id}: reenviado.`);
    } catch (e: any) {
      setRetryNote(e?.message ?? 'Não foi possível reenviar.');
    }
  };

  return (
    <section id="solicitacoes" className="gutter scroll-mt-[72px] py-space-8">
      <SectionHeader id="solicitacoes" title="Solicitações" level={level}>
        Peça ao time de design o que os apps não resolvem. Para abrir um pedido, use o botão redondo no canto inferior da tela, em qualquer página.
      </SectionHeader>

      {expediente?.fallback && (
        <p role="status" className="mb-space-2 flex items-center gap-space-1 text-caption text-text-secondary">
          <WarningCircle className="size-4 shrink-0" aria-hidden />
          Prazos estimados com o expediente padrão: não foi possível ler o expediente atual.
        </p>
      )}

      {owner ? (
        <ExpedienteCard mode={mode} state={expediente} />
      ) : (
        <div className="flex flex-col gap-space-2 rounded-lg border border-secondary p-space-3" data-prazos>
          <div className="flex min-w-0 gap-space-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
              <Clock className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-display text-body-large font-semibold">Prazos</h2>
              <p className="text-body text-text-primary">
                Prazo mínimo: {LEAD_HOURS.normal} h úteis ({LEAD_HOURS.alta} h na prioridade alta). Edição de vídeo leva o dobro.
              </p>
            </div>
          </div>
          <ul className="grid gap-space-1 sm:grid-cols-2">
            {TICKET_TYPES.map((t) => {
              const Icon = TICKET_ICONS[t.id] ?? Gift;
              return (
                <li key={t.id} className="flex min-w-0 gap-space-1 rounded-md bg-secondary/40 px-space-2 py-space-1">
                  <Icon className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-caption font-semibold text-text-primary">{t.label}</span>
                    <Forecast date={forecast[t.id]} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-space-6 flex flex-col gap-space-2">
        <div className="flex flex-wrap items-center justify-between gap-space-1">
          <h2 className="font-display text-h3">{owner ? 'Todos os pedidos' : 'Seus pedidos'}</h2>
          {owner && (
            <a href={RAR_URL} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1 text-caption font-semibold">
              Planilha RAR
              <ArrowSquareOut className="size-4" aria-hidden />
            </a>
          )}
        </div>
        {retryNote && (
          <p role="status" className="text-caption text-text-secondary">
            {retryNote}
          </p>
        )}
        {list.length ? (
          <RecentList list={list} onRetry={mode && mode !== 'local' ? onRetry : undefined} />
        ) : (
          <p className="flex items-center gap-space-1 rounded-lg border border-dashed border-secondary p-space-3 text-body text-text-secondary">
            <Ticket className="size-5 shrink-0 text-highlight" aria-hidden />
            {owner ? 'Nenhum pedido ainda.' : 'Você ainda não abriu solicitações. Use o botão redondo no canto inferior.'}
          </p>
        )}
      </div>
    </section>
  );
}
