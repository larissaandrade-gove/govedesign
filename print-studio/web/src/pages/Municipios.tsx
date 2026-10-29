import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ImageBroken, ListMagnifyingGlass, MapPinPlus, PencilSimple, Plus, MagnifyingGlass, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MunicipioDialog } from '@/components/studio/MunicipioDialog';
import { api, type Municipio } from '@/lib/api';
import { formatPhone } from '@/lib/studio';
import { cn } from '@/lib/utils';

type Props = {
  municipios: Municipio[];
  /** false enquanto a primeira leitura da lista não terminou (evita o aviso de "nenhum cadastrado"). */
  loaded: boolean;
  onChanged: () => void;
  /** Município da produção em andamento, se já escolhido. */
  currentId: number | null;
  /** Conclui a etapa inicial: abre o editor com este município selecionado. */
  onStart: (id: number) => void;
};

const label = (m: Municipio) => `${m.nome_municipio}${m.uf ? ` - ${m.uf}` : ''}`;

export function Municipios({ municipios, loaded, onChanged, currentId, onStart }: Props) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Municipio | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  /** O formulário aberto veio da etapa inicial: ao salvar, segue para o editor. */
  const [fromStart, setFromStart] = useState(false);
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

  const current = municipios.find((m) => m.id === currentId) ?? null;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <h1 className="sr-only">Municípios</h1>
      <StartStep
        municipios={municipios}
        loaded={loaded}
        current={current}
        onPick={onStart}
        onCreate={() => (setEditing(null), setFromStart(true), setFormOpen(true))}
      />

      <h2 id="gerenciar-municipios" className="mb-3 mt-10 font-display text-lg font-bold text-foreground">Gerenciar municípios</h2>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" aria-label="Buscar município" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => (setEditing(null), setFromStart(false), setFormOpen(true))} className="ml-auto bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
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
                      <ImageBroken className="size-4" aria-hidden />
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
                  <Button variant="ghost" size="icon" title="Editar" aria-label={`Editar ${m.nome_municipio}`} onClick={() => (setEditing(m), setFromStart(false), setFormOpen(true))}>
                    <PencilSimple />
                  </Button>
                  <Button variant="ghost" size="icon" title="Excluir" aria-label={`Excluir ${m.nome_municipio}`} onClick={() => setRemoving(m)} className="hover:bg-destructive/10 hover:text-destructive">
                    <Trash />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MunicipioDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        municipio={editing}
        onSaved={(m) => {
          onChanged();
          if (fromStart) onStart(m.id);
        }}
      />

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {removing?.nome_municipio}?</DialogTitle>
            <DialogDescription>O cadastro e o logo deixam de estar disponíveis para novas peças.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={remove}>
              <Trash aria-hidden /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type StartProps = {
  municipios: Municipio[];
  loaded: boolean;
  current: Municipio | null;
  onPick: (id: number) => void;
  onCreate: () => void;
};

/** Etapa inicial: a produção é para um município já cadastrado ou para um novo? */
function StartStep({ municipios, loaded, current, onPick, onCreate }: StartProps) {
  const [mode, setMode] = useState<'existente' | null>(null);
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const empty = loaded && municipios.length === 0;

  useEffect(() => {
    if (mode === 'existente') searchRef.current?.focus();
  }, [mode]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? municipios.filter((m) => label(m).toLowerCase().includes(t)) : municipios;
  }, [municipios, q]);

  const choice =
    'flex min-h-11 w-full items-start gap-4 rounded-lg border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <section aria-labelledby="inicio-titulo" className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nova produção</p>
      <h2 id="inicio-titulo" className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
        A produção será para um município já cadastrado ou um novo?
      </h2>

      {current && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-muted px-4 py-2 text-sm">
          <span className="text-muted-foreground">
            Produção atual: <strong className="font-semibold text-foreground">{label(current)}</strong>
          </span>
          <Button variant="link" className="ml-auto h-auto px-0 dark:text-accent" onClick={() => onPick(current.id)}>
            Continuar no editor <ArrowRight aria-hidden />
          </Button>
        </div>
      )}

      {!loaded ? (
        <p className="mt-5 text-sm text-muted-foreground" role="status">Carregando municípios…</p>
      ) : empty ? (
        <div className="mt-5 space-y-4">
          <p className="max-w-prose text-sm text-muted-foreground">
            Ainda não há municípios cadastrados. Cadastre o primeiro: ao salvar, o editor abre com ele selecionado.
          </p>
          <Button onClick={onCreate} className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
            <MapPinPlus className="size-5" aria-hidden /> Cadastrar novo município
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-expanded={mode === 'existente'}
              aria-controls="inicio-lista"
              onClick={() => setMode((m) => (m === 'existente' ? null : 'existente'))}
              className={cn(choice, mode === 'existente' ? 'border-primary bg-secondary dark:border-accent' : 'border-border hover:border-primary/60 dark:hover:border-accent/60')}
            >
              <ListMagnifyingGlass className="mt-0.5 size-6 shrink-0 text-primary dark:text-accent" aria-hidden />
              <span>
                <span className="block font-semibold text-foreground">Município existente</span>
                <span className="block text-sm text-muted-foreground">
                  Escolha entre os {municipios.length} {municipios.length === 1 ? 'cadastrado' : 'cadastrados'}.
                </span>
              </span>
            </button>
            <button type="button" onClick={onCreate} className={cn(choice, 'border-border hover:border-primary/60 dark:hover:border-accent/60')}>
              <MapPinPlus className="mt-0.5 size-6 shrink-0 text-primary dark:text-accent" aria-hidden />
              <span>
                <span className="block font-semibold text-foreground">Cadastrar novo município</span>
                <span className="block text-sm text-muted-foreground">Preencha os dados e o logo; ao salvar, o editor abre com ele.</span>
              </span>
            </button>
          </div>

          {mode === 'existente' && (
            <div id="inicio-lista" className="mt-4 space-y-2">
              <div className="relative sm:max-w-sm">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  ref={searchRef}
                  type="search"
                  aria-label="Buscar município cadastrado"
                  placeholder="Buscar município"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9"
                />
              </div>
              {list.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nenhum município encontrado.</p>
              ) : (
                <ul aria-label="Municípios cadastrados" className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {list.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => onPick(m.id)}
                        className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        {m.tem_logo && api.municipioLogoUrl(m) ? (
                          <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-white p-0.5">
                            <img src={api.municipioLogoUrl(m)} alt="" className="max-h-full max-w-full object-contain" />
                          </span>
                        ) : (
                          <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded border border-dashed border-border text-muted-foreground" aria-hidden>
                            <ImageBroken className="size-4" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{label(m)}</span>
                        <span className="flex shrink-0 items-center gap-1 text-primary dark:text-accent">
                          <span className="hidden sm:inline">Produzir</span> <ArrowRight className="size-4" aria-hidden />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <p className="mt-5 text-sm">
        <a href="#gerenciar-municipios" className="font-medium text-primary underline underline-offset-4 dark:text-accent hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Gerenciar municípios
        </a>
      </p>
    </section>
  );
}
