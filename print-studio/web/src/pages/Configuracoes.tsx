import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, type LogosFixos } from '@/lib/api';

type Props = { logos: LogosFixos; onChanged: () => void };

const ITEMS = [
  { chave: 'gove' as const, titulo: 'Logo da Gove', texto: 'Aparece no rodapé de todas as peças.' },
  { chave: 'bb' as const, titulo: 'Logo do Banco do Brasil', texto: 'Aparece quando "Incluir logo Banco do Brasil" está ativo.' },
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
    <div className="h-full overflow-y-auto px-8 py-8">
      <h1 className="text-2xl font-semibold">Logos fixos</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Valem para todos os municípios. Envie PNG ou SVG com fundo transparente; o sistema guarda uma versão em alta resolução para impressão a 300 dpi.
      </p>
      <div className="mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
        {ITEMS.map(({ chave, titulo, texto }) => {
          const l = logos[chave];
          return (
            <div key={chave} className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-base font-semibold">{titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
              <div className="mt-4 flex h-28 items-center justify-center rounded-md bg-white p-4">
                {l ? (
                  <img src={api.logoFixoUrl(chave, l.atualizado)} alt={titulo} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-sm text-[#5C6B73]">Nenhum arquivo enviado</span>
                )}
              </div>
              {l && <p className="mt-2 text-xs text-muted-foreground">{l.width}×{l.height} px</p>}
              {l?.avisos.map((a) => <p key={a} className="mt-1 text-xs text-accent">{a}</p>)}
              <Button asChild variant="secondary" className="mt-4" disabled={busy === chave}>
                <label className="cursor-pointer">
                  <Upload className="mr-2 size-4" /> {busy === chave ? 'Enviando…' : l ? 'Substituir arquivo' : 'Enviar arquivo'}
                  <input type="file" accept=".png,.svg,image/png,image/svg+xml" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(chave, e.target.files[0])} />
                </label>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
