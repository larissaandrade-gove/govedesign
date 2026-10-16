import { useState } from 'react';
import { ImageOff, Loader2, Upload } from 'lucide-react';
import { StatusIcon } from '@/components/studio/CheckList';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, type LogosFixos } from '@/lib/api';

type Props = { logos: LogosFixos; onChanged: () => void };

const ITEMS = [
  { chave: 'gove' as const, titulo: 'Logo da Gove', texto: 'Rodapé de todas as peças.' },
  { chave: 'bb' as const, titulo: 'Logo do Banco do Brasil', texto: 'Quando "Incluir logo Banco do Brasil" estiver ativo.' },
];

export function Configuracoes({ logos, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(chave: 'gove' | 'bb', file: File) {
    setBusy(chave);
    try {
      const r = await api.saveLogoFixo(chave, file);
      r.avisos.forEach((a) => toast.warning(a));
      toast.success('Logo atualizado.');
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <h1 className="sr-only">Logos fixos</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">Valem para todos os municípios · PNG ou SVG com fundo transparente.</p>
      <div className="mt-4 grid max-w-4xl gap-4 md:grid-cols-2">
        {ITEMS.map(({ chave, titulo, texto }) => {
          const l = logos[chave];
          return (
            <div key={chave} className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-base font-semibold">{titulo}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{texto}</p>
              <div className="mt-4 flex h-28 items-center justify-center rounded-md bg-white p-4">
                {l && api.logoFixoUrl(chave, l.atualizado) ? (
                  <img src={api.logoFixoUrl(chave, l.atualizado)} alt={titulo} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-xs text-[#5B6770]">
                    <ImageOff className="size-6" aria-hidden /> Nenhum arquivo
                  </span>
                )}
              </div>
              {l?.avisos.map((a) => (
                <p key={a} className="mt-2 flex gap-2 text-xs text-warning">
                  <StatusIcon level="warn" /> {a}
                </p>
              ))}
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">{l ? `${l.width}×${l.height} px` : ''}</span>
                <Button asChild variant="secondary" disabled={busy === chave}>
                  <label className="cursor-pointer">
                    {busy === chave ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />} {busy === chave ? 'Enviando…' : l ? 'Substituir' : 'Enviar'}
                    <input type="file" accept=".png,.svg,image/png,image/svg+xml" className="sr-only" aria-label={`${l ? 'Substituir' : 'Enviar'} ${titulo}`} onChange={(e) => e.target.files?.[0] && upload(chave, e.target.files[0])} />
                  </label>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
