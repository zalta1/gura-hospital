export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <svg viewBox="0 0 48 48" className="size-10 shrink-0" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="4"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="2"
        />
        <path
          d="M24 14v20M14 24h20"
          fill="none"
          stroke={light ? "var(--color-primary-foreground)" : "var(--color-primary)"}
          strokeWidth="2.75"
          strokeLinecap="square"
        />
      </svg>
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
