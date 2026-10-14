CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT 'Nova Landing Page',
  conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
  autor UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  autor_email TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT ALL ON public.landing_pages TO service_role;

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time autenticado pode ver landing pages"
  ON public.landing_pages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autor pode criar landing pages"
  ON public.landing_pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor);

CREATE POLICY "Autor pode editar suas landing pages"
  ON public.landing_pages FOR UPDATE TO authenticated USING (auth.uid() = autor) WITH CHECK (auth.uid() = autor);

CREATE POLICY "Autor pode excluir suas landing pages"
  ON public.landing_pages FOR DELETE TO authenticated USING (auth.uid() = autor);

CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER landing_pages_atualizado_em
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();