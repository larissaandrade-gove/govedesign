/**
 * Controles da identidade visual (GOVE | Banco do Brasil), compartilhados pelo
 * Gerador em lote, Studio e Follow-ups: seletor segmentado (lembrado neste
 * navegador), esquemas BB e o espaço da logomarca BB oficial.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, ImageSquare, Trash, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  BB_LOGO_LABEL,
  BB_LOGO_RULES,
  BB_LOGO_WARNING,
  BB_SCHEMES,
  IDENTITIES,
  IDENTITY_EVENT,
  bbLogoVersion,
  bbNorm,
  fileToDataUrl,
  getBBLogoCache,
  imageFromSrc,
  readIdentity,
  readStoredBBLogoSrc,
  setBBLogoCache,
  storeBBLogo,
  writeIdentity,
  type BBScheme,
  type Identity,
} from "@/lib/creative/bb";

/** Identidade escolhida (localStorage, com fallback em memória). */
export function useIdentity(): [Identity, (v: Identity) => void] {
  const [identity, setIdentity] = useState<Identity>(() => readIdentity());
  useEffect(() => {
    const onChange = (e: Event) => {
      const v = (e as CustomEvent<Identity>).detail;
      setIdentity(v === "bb" ? "bb" : "gove");
    };
    window.addEventListener(IDENTITY_EVENT, onChange);
    return () => window.removeEventListener(IDENTITY_EVENT, onChange);
  }, []);
  const set = useCallback((v: Identity) => {
    setIdentity(v);
    writeIdentity(v);
  }, []);
  return [identity, set];
}

const LOGO_EVENT = "gove-criativos:logomarca-bb";

/** Logomarca BB enviada (compartilhada entre telas e lembrada neste navegador). */
export function useBBLogo() {
  const [logo, setLogo] = useState<{ img: HTMLImageElement; name: string } | null>(
    () => getBBLogoCache().cache,
  );
  useEffect(() => {
    let alive = true;
    const sync = () => setLogo(getBBLogoCache().cache);
    window.addEventListener(LOGO_EVENT, sync);
    if (!getBBLogoCache().loaded) {
      const stored = readStoredBBLogoSrc();
      if (stored) {
        imageFromSrc(stored.src)
          .then((img) => {
            setBBLogoCache({ img, name: stored.name, src: stored.src });
            if (alive) sync();
            window.dispatchEvent(new Event(LOGO_EVENT));
          })
          .catch(() => setBBLogoCache(null));
      } else setBBLogoCache(null);
    }
    return () => {
      alive = false;
      window.removeEventListener(LOGO_EVENT, sync);
    };
  }, []);

  const upload = useCallback(async (file: File | undefined) => {
    if (!file) return;
    try {
      const src = await fileToDataUrl(file);
      const img = await imageFromSrc(src);
      setBBLogoCache({ img, name: file.name, src });
      if (!storeBBLogo(src, file.name))
        toast("Logomarca BB aplicada (arquivo grande demais para ficar salvo neste navegador).");
      window.dispatchEvent(new Event(LOGO_EVENT));
    } catch {
      toast.error("Não foi possível ler a logomarca BB.");
    }
  }, []);

  const clear = useCallback(() => {
    setBBLogoCache(null);
    storeBBLogo(null);
    window.dispatchEvent(new Event(LOGO_EVENT));
  }, []);

  return { logo, upload, clear };
}

/** Seletor segmentado "Identidade: GOVE | Banco do Brasil" (alvos ≥ 44px). */
export function IdentitySwitch({
  value,
  onChange,
}: {
  value: Identity;
  onChange: (v: Identity) => void;
}) {
  return (
    <div className="space-y-1">
      <p id="identity-label" className="text-xs font-semibold text-muted-foreground">
        Identidade
      </p>
      <div
        role="group"
        aria-labelledby="identity-label"
        className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
      >
        {IDENTITIES.map((i) => (
          <button
            key={i.key}
            type="button"
            aria-pressed={value === i.key}
            onClick={() => onChange(i.key)}
            className={`inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              value === i.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatch({ s }: { s: BBScheme }) {
  return (
    <span
      className="flex h-10 w-14 shrink-0 items-center justify-center gap-1 rounded-lg border border-border"
      style={{ background: s.bg }}
      aria-hidden="true"
    >
      <span className="text-sm font-bold" style={{ color: s.title }}>
        Aa
      </span>
      <span className="h-3 w-3 rounded-full" style={{ background: s.button }} />
    </span>
  );
}

/** Esquemas BB, escolha única (Studio e Follow-ups). */
export function BBSchemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Esquema de cores BB" className="space-y-1">
      {BB_SCHEMES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          onClick={() => onChange(s.id)}
          className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors ${
            value === s.id ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted"
          }`}
        >
          <Swatch s={s} />
          <span className="flex-1">{s.label}</span>
          {value === s.id && <Check className="size-4 shrink-0" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

/** Esquemas BB habilitados no lote (vários). */
export function BBSchemeToggles({
  enabled,
  onToggle,
}: {
  enabled: string[];
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <ul className="space-y-1">
      {BB_SCHEMES.map((s) => (
        <li key={s.id} className="flex min-h-12 items-center gap-3">
          <Swatch s={s} />
          <label htmlFor={`bb-scheme-${s.id}`} className="flex min-h-11 flex-1 cursor-pointer items-center text-sm">
            {s.label}
          </label>
          <Switch
            id={`bb-scheme-${s.id}`}
            checked={enabled.includes(s.id)}
            onCheckedChange={(on) => onToggle(s.id, on)}
          />
        </li>
      ))}
    </ul>
  );
}

/** Fundo dos esquemas BB em que a versão Central/Horizontal pode ser aplicada. */
export const bbLogoBgAllowed = (bg: string) =>
  BB_LOGO_RULES.centralHorizontalBackgrounds.map(bbNorm).includes(bbNorm(bg));

/**
 * Espaço "Logomarca BB (arquivo oficial)": o arquivo é aplicado como enviado
 * (nunca recolorido). `warn` mostra o aviso de fundo não permitido.
 */
export function BBLogoSlot({
  logo,
  onUpload,
  onClear,
  warn,
}: {
  logo: { img: HTMLImageElement; name: string } | null;
  onUpload: (f: File | undefined) => void;
  onClear: () => void;
  warn: boolean;
}) {
  const version = logo ? bbLogoVersion(logo.img) : null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm font-medium text-primary transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted">
          <ImageSquare className="size-5 shrink-0" aria-hidden="true" />
          {logo ? "Trocar logomarca BB" : "Logomarca BB (arquivo oficial)"}
          <input
            type="file"
            accept="image/png,image/svg+xml,image/webp"
            aria-label="Logomarca BB (arquivo oficial)"
            className="sr-only"
            onChange={(e) => {
              onUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {logo && (
          <button
            type="button"
            aria-label="Remover logomarca BB"
            title="Remover logomarca BB"
            onClick={onClear}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Trash className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {logo && version && (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-1">
          <span className="flex h-10 w-20 shrink-0 items-center justify-center rounded border border-border bg-white">
            <img src={logo.img.src} alt="" className="max-h-8 max-w-[72px] object-contain" />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs" title={logo.name}>
            Versão {BB_LOGO_LABEL[version]} · aplicada sem alterações
          </span>
        </div>
      )}
      {logo && warn && (
        <p
          role="status"
          className="inline-flex items-start gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900"
        >
          <Warning className="mt-px size-4 shrink-0" aria-hidden="true" />
          {BB_LOGO_WARNING}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {logo
          ? "A logomarca BB substitui a GOVE no topo da peça, com área de proteção de meia altura."
          : "Sem o arquivo oficial, a peça usa a logomarca GOVE. A logomarca BB nunca é recriada nem recolorida."}
      </p>
    </div>
  );
}
