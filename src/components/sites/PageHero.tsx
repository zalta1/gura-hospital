export function PageHero({
  title,
  subtitle,
  kicker = "Gura Hospital",
}: {
  title: string;
  subtitle: string;
  kicker?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-primary">
      <img
        src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1800&q=80"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/70" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-24">
        <p className="eyebrow mb-3">{kicker}</p>
        <h1 className="max-w-3xl text-4xl text-primary-foreground md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/80">{subtitle}</p>
      </div>
    </section>
  );
}
