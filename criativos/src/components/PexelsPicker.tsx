import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchPexelsImage,
  pexelsStatus,
  searchPexels,
  type PexelsOrientation,
  type PexelsPhoto,
} from "@/lib/pexels.functions";

/** Orientação de busca adequada à proporção da peça. */
export function orientationFor(w: number, h: number): PexelsOrientation {
  const r = w / h;
  return r > 1.15 ? "landscape" : r < 0.87 ? "portrait" : "square";
}

let statusPromise: Promise<boolean> | null = null;
/** Disponibilidade da busca (consultada uma vez por sessão). */
function pexelsAvailable() {
  statusPromise ??= pexelsStatus()
    .then((r) => !!r?.available)
    .catch(() => false);
  return statusPromise;
}

/** Carrega a foto escolhida de forma segura para o canvas (sem "taint"). */
export async function loadPexelsImage(photo: PexelsPhoto): Promise<HTMLImageElement> {
  const { src } = await fetchPexelsImage({ data: { url: photo.src.large } });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

/** Crédito exigido pela licença do Pexels: fotógrafo + link para o Pexels. */
export function PexelsCredit({ photo }: { photo: PexelsPhoto }) {
  return (
    <p className="text-xs text-muted-foreground">
      Foto de{" "}
      <a href={photo.photographerUrl} target="_blank" rel="noreferrer" className="underline">
        {photo.photographer || "autor"}
      </a>{" "}
      no{" "}
      <a href={photo.pexelsUrl} target="_blank" rel="noreferrer" className="underline">
        Pexels
      </a>
    </p>
  );
}

/**
 * Busca no Pexels com paginação, grade de miniaturas e crédito do fotógrafo.
 * Ao escolher, entrega a foto já carregada (segura para o canvas).
 */
export function PexelsPicker({
  orientation,
  onPick,
  label = "Buscar no Pexels",
  placeholder = "Buscar no Pexels (ex: prefeitura, cidade)",
}: {
  orientation: PexelsOrientation;
  onPick: (img: HTMLImageElement, photo: PexelsPhoto) => void;
  label?: string;
  placeholder?: string;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    let alive = true;
    void pexelsAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (q: string, page: number) => {
    const id = ++reqId.current;
    setSearching(true);
    try {
      const r = await searchPexels({ data: { q, page, orientation, perPage: 12 } });
      if (id !== reqId.current) return;
      setPhotos((prev) => (page === 1 ? r.photos : [...prev, ...r.photos]));
      setNext(r.next);
      setTotal(r.total);
      setError(null);
    } catch {
      if (id !== reqId.current) return;
      setError("Busca indisponível no momento. Envie uma imagem do dispositivo.");
    } finally {
      if (id === reqId.current) setSearching(false);
    }
  };

  // Debounce de 500ms; nova busca ao mudar termo ou orientação.
  useEffect(() => {
    if (!available) return;
    const term = query.trim();
    if (term.length < 2) {
      reqId.current++;
      setPhotos([]);
      setNext(null);
      setTotal(0);
      setError(null);
      setSearching(false);
      return;
    }
    const t = setTimeout(() => void run(term, 1), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, orientation, available]);

  const pick = async (p: PexelsPhoto) => {
    setPicking(p.id);
    try {
      onPick(await loadPexelsImage(p), p);
    } catch {
      toast.error("Não foi possível carregar essa imagem.");
    } finally {
      setPicking(null);
    }
  };

  if (available === null) return null;
  if (!available) {
    return (
      <p className="text-xs text-muted-foreground" role="note">
        Busca no Pexels indisponível aqui. Envie imagens do dispositivo.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-11 pl-9"
          aria-label={label}
        />
      </div>
      {searching && !photos.length && <p className="text-xs text-muted-foreground">Buscando…</p>}
      {error && <p className="text-xs text-amber-700">{error}</p>}
      {!searching && !error && query.trim().length >= 2 && photos.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma imagem encontrada. Tente outro termo.
        </p>
      )}
      {photos.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2" aria-label={`Resultados: ${label}`}>
            {photos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  title={`${p.alt || "Foto"} — ${p.photographer}`}
                  aria-label={`Usar foto de ${p.photographer}${p.alt ? `: ${p.alt}` : ""}`}
                  onClick={() => void pick(p)}
                  disabled={picking !== null}
                  className="relative block w-full overflow-hidden rounded-lg border-2 border-border hover:border-primary focus-visible:border-primary focus-visible:outline-none"
                  style={{ background: p.avgColor }}
                >
                  <img
                    src={p.src.thumb}
                    alt=""
                    className="h-16 w-full object-cover"
                    loading="lazy"
                  />
                  {picking === p.id && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="size-5 animate-spin text-white" aria-hidden="true" />
                    </span>
                  )}
                </button>
                <a
                  href={p.photographerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block truncate text-[11px] text-muted-foreground underline"
                >
                  {p.photographer}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {photos.length} de {total} ·{" "}
              <a
                href="https://www.pexels.com"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Fotos do Pexels
              </a>
            </p>
            {next && (
              <Button
                variant="outline"
                className="min-h-11"
                disabled={searching}
                onClick={() => void run(query.trim(), next)}
              >
                {searching ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Mais fotos
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
