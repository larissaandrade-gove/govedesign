import { useMemo, useState } from 'react';
import { Check, ImageOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <h1 className="sr-only">Municípios</h1>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" aria-label="Buscar município" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => (setEditing(null), setFormOpen(true))} className="ml-auto bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
          <Plus className="size-5" aria-hidden /> Novo município
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Logo</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead className="hidden md:table-cell">Banco do Brasil</TableHead>
              <TableHead className="hidden md:table-cell">Atualizado</TableHead>
              <TableHead className="w-24 text-right"><span className="sr-only">Ações</span></TableHead>
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
                  {m.tem_logo && api.municipioLogoUrl(m) ? (
                    <div className="flex h-10 w-16 items-center justify-center rounded bg-white p-1">
                      <img src={api.municipioLogoUrl(m)} alt={`Logo de ${m.nome_municipio}`} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <span className="flex h-10 w-16 items-center justify-center rounded border border-dashed border-destructive/60 text-destructive" title="Sem logo">
                      <ImageOff className="size-4" aria-hidden />
                      <span className="sr-only">Sem logo</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {m.nome_municipio}{m.uf ? ` - ${m.uf}` : ''}
                  {m.logo_avisos.length > 0 && <p className="text-xs font-normal text-warning">{m.logo_avisos[0]}</p>}
                </TableCell>
                <TableCell className="tabular-nums">{formatPhone(m.ddd, m.numero_whatsapp)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {m.incluir_logo_banco_do_brasil ? (
                    <span className="inline-flex items-center gap-1.5 text-success"><Check className="size-4" aria-hidden /> Sim</span>
                  ) : (
                    <span className="text-muted-foreground">Não</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{new Date(m.data_atualizacao).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="icon" title="Editar" aria-label={`Editar ${m.nome_municipio}`} onClick={() => (setEditing(m), setFormOpen(true))}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" title="Excluir" aria-label={`Excluir ${m.nome_municipio}`} onClick={() => setRemoving(m)} className="hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 />
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
            <Button variant="destructive" onClick={remove}>
              <Trash2 aria-hidden /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
