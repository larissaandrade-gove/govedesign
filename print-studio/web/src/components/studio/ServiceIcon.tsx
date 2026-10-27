// Ícone de serviço desenhado com os mesmos paths que vão para o PDF.
export function ServiceIcon({ paths, size = 20, className }: { paths: string[]; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden className={className}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
