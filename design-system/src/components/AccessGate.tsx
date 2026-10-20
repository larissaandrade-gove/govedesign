import { findClaude } from '../lib/claude';
import { useEffect, useState, type ReactNode } from 'react';
import { LogIn, ShieldAlert } from 'lucide-react';
import { GoveLogo } from './GoveLogo';

type State = 'checking' | 'ok' | 'signed-out' | 'guest';

/**
 * Acesso ao artefato no claude.ai: só pessoas identificadas da organização
 * Gove (conta do claude.ai) entram; visitantes externos e sessões sem login
 * veem a tela de entrada. Fora do artefato, o login fica com o servidor
 * (VPN Gove + e-mail @gove.digital), e a página abre direto.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const claude = findClaude();
  const [state, setState] = useState<State>(claude ? 'checking' : 'ok');

  useEffect(() => {
    if (!claude) return;
    let alive = true;
    (async () => {
      let next: State = 'signed-out';
      try {
        const user = await Promise.race([claude.use('user'), new Promise((r) => setTimeout(() => r(null), 12000))]);
        const me = user ? await (user as any).me() : null;
        if (me?.id) {
          const ps = await (user as any).profiles([me.id]).catch(() => ({}));
          next = ps?.[me.id]?.guest ? 'guest' : 'ok';
        }
      } catch {
        /* sem identidade: tela de entrada */
      }
      if (alive) setState(next);
    })();
    return () => {
      alive = false;
    };
  }, [claude]);

  if (state === 'ok') return <>{children}</>;
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#20133D] px-space-3 text-white">
      <div className="flex max-w-[400px] flex-col items-center gap-space-3 text-center">
        <GoveLogo kind="logotipo" height={44} background="#20133D" />
        {state === 'checking' ? (
          <p className="text-body text-[#E9E1F7]" role="status">
            Verificando acesso…
          </p>
        ) : (
          <>
            {state === 'guest' ? <ShieldAlert className="size-8 text-[#FFC72C]" aria-hidden /> : <LogIn className="size-8 text-[#FFC72C]" aria-hidden />}
            <h1 className="font-display text-h3">{state === 'guest' ? 'Acesso só para a equipe Gove' : 'Entre com sua conta Gove'}</h1>
            <p className="text-body text-[#E9E1F7]">{state === 'guest' ? 'Peça acesso à área de design.' : 'Entre no claude.ai com seu e-mail @gove.digital e abra esta página de novo.'}</p>
          </>
        )}
      </div>
    </main>
  );
}
