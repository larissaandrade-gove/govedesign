import type { HeroPresetId } from "@/lib/gove/presets";

const bar = (w: string, dark = false) => (
  <span
    className="block h-2 rounded-sm"
    style={{ width: w, backgroundColor: dark ? "rgba(255,255,255,.85)" : "rgba(11,79,108,.35)" }}
  />
);

export function PresetThumb({ id }: { id: HeroPresetId }) {
  if (id === "centered") {
    return (
      <div
        className="flex h-28 flex-col items-center justify-center gap-2 rounded-lg p-4"
        style={{ backgroundColor: "var(--gove-primary)" }}
        aria-hidden
      >
        {bar("70%", true)}
        {bar("50%", true)}
        <span
          className="mt-1 block h-4 w-20 rounded"
          style={{ backgroundColor: "var(--gove-accent)" }}
        />
      </div>
    );
  }
  if (id === "split") {
    return (
      <div className="flex h-28 gap-3 rounded-lg bg-secondary p-4" aria-hidden>
        <div className="flex flex-1 flex-col justify-center gap-2">
          {bar("90%")}
          {bar("70%")}
          <span
            className="mt-1 block h-4 w-16 rounded"
            style={{ backgroundColor: "var(--gove-accent)" }}
          />
        </div>
        <div className="flex-1 rounded-md" style={{ backgroundColor: "rgba(11,79,108,.25)" }} />
      </div>
    );
  }
  if (id === "form") {
    return (
      <div
        className="flex h-28 gap-3 rounded-lg p-4"
        style={{ backgroundColor: "var(--gove-primary)" }}
        aria-hidden
      >
        <div className="flex flex-1 flex-col justify-center gap-2">
          {bar("90%", true)}
          {bar("60%", true)}
        </div>
        <div className="flex flex-1 flex-col gap-2 rounded-md bg-white p-2 shadow">
          <span className="block h-3 rounded-sm bg-slate-200" />
          <span className="block h-3 rounded-sm bg-slate-200" />
          <span
            className="mt-auto block h-4 rounded"
            style={{ backgroundColor: "var(--gove-accent)" }}
          />
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-secondary text-sm text-muted-foreground"
      aria-hidden
    >
      Em branco
    </div>
  );
}