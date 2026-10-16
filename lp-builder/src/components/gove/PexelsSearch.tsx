import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Campo de busca que abre o banco de imagens Pexels em nova aba. */
export function PexelsSearch() {
  const [term, setTerm] = useState("");

  const open = () => {
    const query = term.trim();
    const url = query
      ? `https://www.pexels.com/pt-br/procurar/${encodeURIComponent(query)}/`
      : "https://www.pexels.com/pt-br/";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold tracking-wide uppercase" htmlFor="pexels-term">
        Banco de imagens
      </Label>
      <div className="flex gap-2">
        <Input
          id="pexels-term"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              open();
            }
          }}
          placeholder="Pesquisar imagem"
          aria-label="Pesquisar imagem"
        />
        <Button
          type="button"
          variant="outline"
          size="iconTouch"
          className="shrink-0"
          onClick={open}
          aria-label="Buscar no banco de imagens"
          title="Buscar no banco de imagens"
        >
          <ExternalLink aria-hidden />
        </Button>
      </div>
    </div>
  );
}