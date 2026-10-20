import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pexelsAvailable, pexelsSearch } from "@/lib/gove/pexelsClient";
import type { PexelsOrientation, PexelsPage, PexelsPhoto } from "@/lib/gove/pexels.types";
import type { ImageCredit } from "@/lib/gove/types";

const PER_PAGE = 12;

const ORIENTATIONS: { value: PexelsOrientation; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "landscape", label: "Horizontal" },
  { value: "portrait", label: "Vertical" },
  { value: "square", label: "Quadrada" },
];

/** Crédito a guardar junto da imagem (exportado no HTML). */
export function creditFor(photo: PexelsPhoto): ImageCredit {
  return {
    source: "pexels",
    id: photo.id,
    photographer: photo.photographer,
    photographerUrl: photo.photographerUrl,
    pexelsUrl: photo.pexelsUrl,
  };
}

/**
 * Banco de imagens Pexels: busca (com orientação e paginação), grade de
 * miniaturas e aplicação direta no campo de imagem. A chave da API fica no
 * servidor; sem servidor disponível, só aparece um aviso curto.
 */
export function PexelsSearch({
  onPick,
  orientation: initialOrientation = "",
  credit,
}: {
  onPick: (photo: PexelsPhoto) => void;
  orientation?: PexelsOrientation;
  credit?: ImageCredit | null | undefined;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [term, setTerm] = useState("");
  const [orientation, setOrientation] = useState<PexelsOrientation>(initialOrientation);
  const [result, setResult] = useState<PexelsPage | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  useEffect(() => {
    let alive = true;
    void pexelsAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);

  async function run(q: string, page: number, orient = orientation) {
    if (!q.trim()) return;
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const data = await pexelsSearch({ q: q.trim(), page, orientation: orient, perPage: PER_PAGE });
      if (id !== request.current) return;
      setQuery(q.trim());
      setResult(data);
    } catch (e) {
      if (id !== request.current) return;
      setError(e instanceof Error && e.message ? e.message : "Não foi possível buscar imagens agora. Use a URL ou o upload.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }

  const label = (
    <Label className="text-xs font-bold tracking-wide uppercase" htmlFor="pexels-term">
      Banco de imagens (Pexels)
    </Label>
  );

  if (available === false) {
    return (
      <div className="space-y-1">
        {label}
        <p className="text-xs text-muted-foreground" role="status">
          Indisponível aqui. Use a URL ou o upload.
        </p>
      </div>
    );
  }

  const pages = result ? Math.max(1, Math.ceil(result.total / PER_PAGE)) : 1;

  return (
    <div className="space-y-2">
      {label}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(term, 1);
        }}
      >
        <Input
          id="pexels-term"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Pesquisar foto"
          disabled={available === null}
        />
        <Button
          type="submit"
          variant="outline"
          size="iconTouch"
          className="shrink-0"
          disabled={available === null || !term.trim() || loading}
          aria-label="Buscar fotos"
          title="Buscar fotos"
        >
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
        </Button>
      </form>
      <select
        aria-label="Orientação"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={orientation}
        onChange={(e) => {
          const next = e.target.value as PexelsOrientation;
          setOrientation(next);
          if (query) void run(query, 1, next);
        }}
      >
        {ORIENTATIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {error ? (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        result.photos.length ? (
          <>
            <ul className="grid grid-cols-3 gap-1.5" aria-label="Resultados do Pexels" aria-busy={loading}>
              {result.photos.map((photo) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => onPick(photo)}
                    aria-label={`Usar foto de ${photo.photographer}${photo.alt ? `: ${photo.alt}` : ""}`}
                    title={`Foto de ${photo.photographer}`}
                    className="block aspect-square w-full overflow-hidden rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-ring"
                    style={{ backgroundColor: photo.avgColor ?? undefined }}
                  >
                    <img
                      src={photo.src.thumb}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="iconTouch"
                disabled={loading || result.page <= 1}
                onClick={() => void run(query, result.page - 1)}
                aria-label="Página anterior"
                title="Página anterior"
              >
                <ChevronLeft aria-hidden />
              </Button>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {result.page} / {pages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="iconTouch"
                disabled={loading || !result.next}
                onClick={() => void run(query, result.page + 1)}
                aria-label="Próxima página"
                title="Próxima página"
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground" role="status">
            Nenhuma foto para “{query}”.
          </p>
        )
      ) : null}

      {credit ? (
        <p className="text-xs text-muted-foreground">
          Foto:{" "}
          <a href={credit.photographerUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {credit.photographer}
          </a>{" "}
          /{" "}
          <a href={credit.pexelsUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Pexels
          </a>
        </p>
      ) : null}
    </div>
  );
}
