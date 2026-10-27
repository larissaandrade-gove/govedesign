import { useId, useState } from "react";
import { ImageSquare, Trash, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { loadImageFromFile, type ExpertMaterial } from "@/lib/creative/renderer";

export function ExpertFields({
  value,
  onChange,
}: {
  value: ExpertMaterial;
  onChange: (value: ExpertMaterial) => void;
}) {
  const id = useId();
  const [loading, setLoading] = useState(false);
  const missing = !value.name.trim().includes(" ") || !value.role.trim() || !value.photo;
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex min-h-12 items-center gap-3 px-3">
        <User className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <Label
          htmlFor={`${id}-enabled`}
          className="flex min-h-12 flex-1 cursor-pointer items-center text-sm font-semibold"
        >
          Material colaborativo
        </Label>
        <Switch
          id={`${id}-enabled`}
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>
      {value.enabled && (
        <div className="space-y-3 border-t border-border p-3">
          <div className="space-y-1">
            <Label htmlFor={`${id}-name`}>Nome e sobrenome do especialista</Label>
            <Input
              id={`${id}-name`}
              className="h-11"
              value={value.name}
              maxLength={80}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-role`}>Cargo</Label>
            <Input
              id={`${id}-role`}
              className="h-11"
              value={value.role}
              maxLength={100}
              onChange={(e) => onChange({ ...value, role: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3">
            {value.photo && (
              <img
                src={value.photo.src}
                alt={value.name || "Especialista"}
                className="size-12 shrink-0 rounded-full object-cover"
              />
            )}
            <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm font-medium text-primary transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted">
              <ImageSquare className="size-5" aria-hidden="true" />
              <span>{value.photo ? "Trocar foto" : "Foto do especialista"}</span>
              <input
                id={`${id}-photo`}
                type="file"
                accept="image/*"
                aria-label="Foto do especialista"
                className="sr-only"
                disabled={loading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLoading(true);
                  try {
                    const photo = await loadImageFromFile(file);
                    onChange({ ...value, photo });
                  } catch {
                    toast.error("Não foi possível carregar a foto do especialista.");
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </label>
            {value.photo && (
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Remover foto do especialista"
                title="Remover foto"
                onClick={() => onChange({ ...value, photo: null })}
              >
                <Trash className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          {missing && (
            <p className="text-xs text-muted-foreground" role="status">
              Preencha nome e sobrenome, cargo e foto do especialista.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
