import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MunicipioDialog } from '@/components/studio/MunicipioDialog';
import { api, type Municipio } from '@/lib/api';
import { formatPhone } from '@/lib/studio';

type Props = { municipios: Municipio[]; onChanged: () => void };

export function Municipios({ municipios, onChanged }: Props) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Municipio | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<Municipio | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? municipios.filter((m) => `${m.nome_municipio} ${m.uf ?? ''}`.toLowerCase().includes(t)) : municipios;
  }, [municipios, q]);

  async function remove() {
    if (!removing) return;
    try {
      await api.deleteMunicipio(removing.id);
      toast.success(`${removing.nome_municipio} excluído.`);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Municípios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Logo da prefeitura, DDD e WhatsApp de cada município atendido.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Buscar município" placeholder="Buscar município" value={q} onChange={(e) => setQ(e.target.value)} className="w-64 pl-9" />
          </div>
          <Button onClick={() => (setEditing(null), setFormOpen(true))} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-1.5 size-4" /> Novo município
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Logo</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Banco do Brasil</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="w-28 text-right"><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {municipios.length ? 'Nenhum município encontrado.' : 'Nenhum município cadastrado ainda.'}
                </TableCell>
              </TableRow>
            )}
            {list.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  {m.tem_logo ? (
                    <div className="flex h-10 w-16 items-center justify-center rounded bg-white p-1">
                      <img src={api.municipioLogoUrl(m)} alt={`Logo de ${m.nome_municipio}`} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <span className="text-xs text-destructive">sem logo</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-white">
                  {m.nome_municipio}{m.uf ? ` - ${m.uf}` : ''}
                  {m.logo_avisos.length > 0 && <p className="text-xs font-normal text-accent">{m.logo_avisos[0]}</p>}
                </TableCell>
                <TableCell className="tabular-nums">{formatPhone(m.ddd, m.numero_whatsapp)}</TableCell>
                <TableCell>{m.incluir_logo_banco_do_brasil ? 'Sim' : 'Não'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(m.data_atualizacao).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label={`Editar ${m.nome_municipio}`} onClick={() => (setEditing(m), setFormOpen(true))}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Excluir ${m.nome_municipio}`} onClick={() => setRemoving(m)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MunicipioDialog open={formOpen} onOpenChange={setFormOpen} municipio={editing} onSaved={() => onChanged()} />

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {removing?.nome_municipio}?</DialogTitle>
            <DialogDescription>O cadastro e o logo deixam de estar disponíveis para novas peças.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={remove}>Excluir município</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
