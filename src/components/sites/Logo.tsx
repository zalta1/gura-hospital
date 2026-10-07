export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <img
        src="/images/gura-logo.png"
        alt=""
        className="h-11 w-11 shrink-0 object-contain"
      />
      <span className="leading-none">
        <span
          className={`block font-display text-[1.35rem] tracking-tight ${light ? "text-primary-foreground" : "text-primary"}`}
        >
          Gura Hospital
        </span>
        <span className={`nav-label mt-1 block text-[0.58rem] ${light ? "text-primary-foreground/55" : "text-muted-foreground"}`}>
          Academic Medical Center
        </span>
      </span>
    </span>
  );
}
