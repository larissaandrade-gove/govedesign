import { useState } from 'react';
import { Copy, FolderOpen, Plus, Trash } from '@phosphor-icons/react';
import { UFS, type CaseData } from '@/data/case.ts';
import { formatPeriodo } from '@/data/indicators.ts';
import { byMunicipio } from '@/lib/store.ts';
import { GrafanaNote } from './GrafanaNote.tsx';
import { Button, Field } from './ui.tsx';

type Props = {
  c: CaseData;
  update: (patch: Partial<CaseData>) => void;
  saved: CaseData[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (c: CaseData) => void;
  onDelete: (id: string) => void;
};

const when = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export function StepMunicipio({ c, update, saved, onOpen, onNew, onDuplicate, onDelete }: Props) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const groups = byMunicipio(saved);
  return (
    <div className="space-y-space-4">
      <div className="grid gap-space-2 sm:grid-cols-[1fr_120px]">
        <Field id="municipio" label="Município" hint="O nome sai no cabeçalho da página e na capa da apresentação.">
          <input id="municipio" className="field" value={c.municipio} autoComplete="off" placeholder="ex.: nome do município" onChange={(e) => update({ municipio: e.target.value })} />
        </Field>
        <Field id="uf" label="UF">
          <select id="uf" className="field" value={c.uf} onChange={(e) => update({ uf: e.target.value })}>
            <option value="">—</option>
            {UFS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
      </div>

      <GrafanaNote />

      <section aria-labelledby="salvos" className="space-y-space-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="salvos" className="text-h3 leading-tight">
            Cases salvos
          </h2>
          <Button onClick={onNew}>
            <Plus className="size-5" aria-hidden /> Novo case
          </Button>
        </div>
        {!groups.length && <p className="text-[14px] text-text-secondary">Nenhum case salvo ainda. O case é salvo sozinho assim que você digita o município.</p>}
        <ul className="space-y-space-2">
          {groups.map((g) => (
            <li key={g.municipio} className="card p-space-2">
              <p className="font-display text-[16px] font-semibold text-text-primary">{g.municipio}</p>
              <ul className="mt-2 divide-y divide-secondary">
                {g.cases.map((x) => {
                  const periodo = formatPeriodo(x.periodo.inicio, x.periodo.fim) || 'Sem período';
                  const current = x.id === c.id;
                  return (
                    <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] text-text-primary">
                          {periodo}
                          {current && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[12px] font-semibold text-text-primary">aberto</span>}
                        </p>
                        <p className="text-[13px] text-text-secondary">Editado em {when(x.updatedAt)}</p>
                      </div>
                      {confirm === x.id ? (
                        <div className="flex gap-2" role="group" aria-label="Confirmar exclusão">
                          <Button variant="danger" onClick={() => (onDelete(x.id), setConfirm(null))}>
                            Excluir de vez
                          </Button>
                          <Button variant="ghost" onClick={() => setConfirm(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button variant="ghost" onClick={() => onOpen(x.id)} aria-label={`Abrir case ${g.municipio}, ${periodo}`} disabled={current}>
                            <FolderOpen className="size-5" aria-hidden /> Abrir
                          </Button>
                          <Button variant="ghost" onClick={() => onDuplicate(x)} aria-label={`Duplicar case ${g.municipio}, ${periodo}`}>
                            <Copy className="size-5" aria-hidden />
                            <span className="sr-only sm:not-sr-only">Duplicar</span>
                          </Button>
                          <Button variant="ghost" onClick={() => setConfirm(x.id)} aria-label={`Excluir case ${g.municipio}, ${periodo}`}>
                            <Trash className="size-5" aria-hidden />
                            <span className="sr-only sm:not-sr-only">Excluir</span>
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
