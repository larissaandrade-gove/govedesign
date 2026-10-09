import { useId, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { loadImageFromFile, type ExpertMaterial } from "@/lib/creative/renderer";

export function ExpertFields({ value, onChange }: { value: ExpertMaterial; onChange: (value: ExpertMaterial) => void }) {
  const id = useId();
  const [loading, setLoading] = useState(false);
  return <section className="space-y-3 border-b border-border pb-4">
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={`${id}-enabled`}>Material colaborativo? <span className="text-muted-foreground">{value.enabled ? "TRUE" : "FALSE"}</span></Label>
      <Switch id={`${id}-enabled`} checked={value.enabled} onCheckedChange={(enabled) => onChange({ ...value, enabled })} />
    </div>
    {value.enabled && <div className="space-y-3">
      <div className="space-y-1"><Label htmlFor={`${id}-name`}>Nome e sobrenome do especialista</Label><Input id={`${id}-name`} value={value.name} maxLength={80} onChange={(e) => onChange({ ...value, name: e.target.value })} /></div>
      <div className="space-y-1"><Label htmlFor={`${id}-role`}>Cargo</Label><Input id={`${id}-role`} value={value.role} maxLength={100} onChange={(e) => onChange({ ...value, role: e.target.value })} /></div>
      <Label htmlFor={`${id}-photo`}>Foto do especialista</Label>
      <Input id={`${id}-photo`} type="file" accept="image/*" disabled={loading} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try { const photo = await loadImageFromFile(file); onChange({ ...value, photo }); }
        catch { toast.error("Não foi possível carregar a foto do especialista."); }
        finally { setLoading(false); }
      }} />
      {value.photo ? <div className="flex items-center gap-3"><img src={value.photo.src} alt={value.name || "Especialista"} className="size-16 shrink-0 rounded-full object-cover" /><Button variant="ghost" size="icon" aria-label="Remover foto do especialista" onClick={() => onChange({ ...value, photo: null })}><Trash2 className="size-4" /></Button></div> : <Upload className="size-5 text-muted-foreground" aria-hidden="true" />}
      {(!value.name.trim().includes(" ") || !value.role.trim() || !value.photo) && <p className="text-xs text-muted-foreground" role="status">Preencha nome e sobrenome, cargo e foto do especialista.</p>}
    </div>}
  </section>;
}