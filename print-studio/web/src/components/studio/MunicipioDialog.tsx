import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api, type Municipio } from '@/lib/api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  municipio?: Municipio | null;
  onSaved: (m: Municipio) => void;
};

const digits = (s: string) => s.replace(/\D/g, '');

export function MunicipioDialog({ open, onOpenChange, municipio, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [uf, setUf] = useState('');
  const [ddd, setDdd] = useState('');
  const [numero, setNumero] = useState('');
  const [bb, setBb] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setNome(municipio?.nome_municipio ?? '');
    setUf(municipio?.uf ?? '');
    setDdd(municipio?.ddd ?? '');
    setNumero(municipio?.numero_whatsapp ?? '');
    setBb(municipio?.incluir_logo_banco_do_brasil ?? false);
    setLogo(null);
    setError('');
  }, [open, municipio]);

  const numeroOk = digits(numero).length >= 8 && digits(numero).length <= 9;
  const valid = nome.trim() && digits(ddd).length === 2 && numeroOk && (municipio?.tem_logo || logo);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData();
    form.append('nome_municipio', nome.trim());
    form.append('uf', uf.trim());
    form.append('ddd', digits(ddd));
    form.append('numero_whatsapp', digits(numero));
    form.append('incluir_logo_banco_do_brasil', String(bb));
    if (logo) form.append('logo', logo);
    try {
      const saved = await api.saveMunicipio(form, municipio?.id);
      saved.logo_avisos.forEach((a) => toast.warning(a));
      toast.success(municipio ? 'Município atualizado.' : 'Município cadastrado.');
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{municipio ? 'Editar município' : 'Novo município'}</DialogTitle>
            <DialogDescription>O logo da prefeitura deve ser PNG ou SVG com fundo transparente.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mun-nome">Nome do município</Label>
              <Input id="mun-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="São Carlos" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mun-uf">UF</Label>
              <Input id="mun-uf" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
            </div>
          </div>
          <div className="grid grid-cols-[88px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mun-ddd">DDD</Label>
              <Input id="mun-ddd" inputMode="numeric" value={ddd} onChange={(e) => setDdd(digits(e.target.value).slice(0, 2))} placeholder="16" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mun-num">Número do WhatsApp</Label>
              <Input id="mun-num" inputMode="numeric" value={numero} onChange={(e) => setNumero(digits(e.target.value).slice(0, 9))} placeholder="999998888" aria-invalid={!!numero && !numeroOk} required />
              <p className="text-xs text-muted-foreground">Fixo (8 dígitos) ou celular (9 dígitos).</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mun-logo">Logo da prefeitura {municipio?.tem_logo && <span className="text-muted-foreground">(já cadastrado — envie outro para substituir)</span>}</Label>
            <Input id="mun-logo" type="file" accept=".png,.svg,image/png,image/svg+xml" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <Label htmlFor="mun-bb" className="cursor-pointer">Incluir logo do Banco do Brasil por padrão</Label>
            <Switch id="mun-bb" checked={bb} onCheckedChange={setBb} />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!valid || saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? 'Salvando…' : 'Salvar município'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
