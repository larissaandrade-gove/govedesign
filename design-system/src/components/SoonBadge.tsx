import { Clock } from '@phosphor-icons/react';

/** Selo "Em breve" dos apps que ainda dependem de publicação web. */
export function SoonBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-accent/25 font-semibold text-text-primary ${small ? 'px-1.5 py-0.5 text-[11px] leading-4' : 'min-h-7 px-2 text-caption'}`}>
      <Clock className={small ? 'size-3' : 'size-3.5'} aria-hidden />
      Em breve
    </span>
  );
}
