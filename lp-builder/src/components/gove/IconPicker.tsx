import { useMemo, useState } from "react";
import { ICON_LIBRARY, type IconMeta } from "./icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Current = ICON_LIBRARY[value]?.icon ?? ICON_LIBRARY["Check"]!.icon;
  const currentLabel = ICON_LIBRARY[value]?.label ?? value;

  /** Resultados agrupados por categoria; a busca ignora acentos e caixa. */
  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, [string, IconMeta][]>();
    for (const [name, meta] of Object.entries(ICON_LIBRARY)) {
      if (q && ![name, meta.label, meta.categoria].some((t) => normalize(t).includes(q))) continue;
      const list = map.get(meta.categoria) ?? [];
      list.push([name, meta]);
      map.set(meta.categoria, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Current className="size-4" aria-hidden /> {currentLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Escolher ícone</DialogTitle>
        </DialogHeader>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou categoria (ex.: ouvidoria, serviços públicos)"
          aria-label="Buscar ícone"
        />
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ícone encontrado.</p>
          ) : null}
          {groups.map(([categoria, items]) => (
            <section key={categoria} aria-label={categoria}>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {categoria}
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {items.map(([name, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={name}
                      type="button"
                      title={`${meta.label} — ${meta.categoria}`}
                      aria-label={`${meta.label}, categoria ${meta.categoria}`}
                      aria-pressed={value === name}
                      onClick={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                      className="flex min-h-11 items-center justify-center rounded-lg border border-border p-2 hover:bg-secondary"
                      style={{ borderColor: value === name ? "var(--gove-primary)" : undefined }}
                    >
                      <Icon className="size-5" weight={value === name ? "fill" : "regular"} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
