import { useMemo, useState } from "react";
import { ICON_LIBRARY } from "./icons";
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(ICON_LIBRARY).filter(
      ([name, meta]) =>
        !q || name.toLowerCase().includes(q) || meta.categoria.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Current className="size-4" aria-hidden /> {value}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Escolher ícone</DialogTitle>
        </DialogHeader>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou categoria (ex.: dados, pessoas)"
          aria-label="Buscar ícone"
        />
        <div className="grid max-h-80 grid-cols-6 gap-2 overflow-y-auto pr-1">
          {results.map(([name, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={name}
                type="button"
                title={`${name} — ${meta.categoria}`}
                aria-label={`${name}, categoria ${meta.categoria}`}
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
      </DialogContent>
    </Dialog>
  );
}