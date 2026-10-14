import { Reveal } from './Reveal';

export function Footer() {
  return (
    <footer className="gutter border-t border-secondary/60 py-space-8">
      <Reveal className="flex max-w-[760px] flex-col gap-space-2">
        <p className="eyebrow">Manifesto</p>
        <p className="font-display text-h3 font-bold leading-snug text-text-primary">
          O governo não deveria esperar o cidadão pedir. Deveria saber, antecipar e agir.
        </p>
        <p className="text-caption text-text-secondary">Gove · Governo Zero Clique · Design System v1.0</p>
      </Reveal>
    </footer>
  );
}
