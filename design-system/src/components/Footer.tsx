import { Reveal } from './Reveal';

export function Footer() {
  return (
    <footer className="gutter border-t border-secondary/60 py-space-8 pb-[120px] lg:pb-space-8">
      <Reveal className="max-w-[760px]">
        <p className="font-display text-h3 font-bold leading-snug text-text-primary">
          O governo não deveria esperar o cidadão pedir. Deveria saber, antecipar e agir.
        </p>
      </Reveal>
    </footer>
  );
}
