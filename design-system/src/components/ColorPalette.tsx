import { ColorCompass } from './ColorCompass';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';

/** Cores: a Bússola de cores reúne as 10 cores oficiais, as pautas e os tons. */
export function ColorPalette() {
  return (
    <section id="cores" className="gutter scroll-mt-[72px] py-space-8">
      <SectionHeader id="cores" title="Cores" />
      <Reveal>
        <ColorCompass />
      </Reveal>
    </section>
  );
}
