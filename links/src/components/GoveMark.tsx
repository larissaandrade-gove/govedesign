export function GoveMark({ size = "sm" }: { size?: "sm" | "md" }) {
  const box = size === "md" ? "size-8" : "size-6";
  const dot = size === "md" ? "size-3" : "size-2";
  const text = size === "md" ? "text-2xl" : "text-lg";

  return (
    <div className="flex items-center gap-2">
      <div className={`${box} rounded-sm bg-primary flex items-center justify-center`}>
        <div className={`${dot} rounded-full bg-primary-foreground/25`} />
      </div>
      <span className={`${text} font-extrabold uppercase tracking-tighter text-primary`}>
        Gove
      </span>
    </div>
  );
}
