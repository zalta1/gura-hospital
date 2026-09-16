import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";
import { physicians, specialtyGroups } from "@/lib/hospital-data";

export const Route = createFileRoute("/specialties/$slug")({
  loader: ({ params }) => {
    const group = specialtyGroups.find((g) => g.slug === params.slug);
    if (!group) throw notFound();
    return { group };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Specialty unavailable | Gura Hospital" }, { name: "robots", content: "noindex" }],
      };
    }
    const { group } = loaderData;
    return {
      meta: [
        { title: `${group.title} | Gura Hospital` },
        { name: "description", content: group.blurb },
        { property: "og:title", content: `${group.title} | Gura Hospital` },
        { property: "og:description", content: group.blurb },
      ],
    };
  },
  notFoundComponent: SpecialtyNotFound,
  component: SpecialtyDetail,
});

function SpecialtyDetail() {
  const { group } = Route.useLoaderData();
  const docs = physicians.filter((p) => p.specialtySlug === group.slug);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-primary">
        <MediaPlaceholder
          label="Specialty hero image"
          className="absolute inset-0 border-0 opacity-20"
        />
        <div className="absolute inset-0 bg-primary/80" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <p className="eyebrow mb-3">Specialty</p>
          <h1 className="max-w-3xl text-4xl text-primary-foreground md:text-5xl">{group.title}</h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/75">{group.blurb}</p>
          <div className="mt-8">
            <Button asChild size="pillLg" variant="gold">
              <Link to="/find-a-doctor" search={{ specialty: group.slug }}>
                Find a Doctor in this Specialty
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <p className="eyebrow">About the program</p>
          <h2 className="text-3xl">Care built around your diagnosis</h2>
          <p className="text-muted-foreground">
            Our {group.title.toLowerCase()} team meets weekly to review complex cases together, so
            your plan reflects the judgment of several specialists rather than one. Imaging,
            laboratory work and follow-up visits are coordinated by a single navigator who knows your
            history.
          </p>
          <p className="text-muted-foreground">
            All details on this page — including provider names, offices and outcomes — are fictional
            placeholder content created for a design demonstration.
          </p>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <MediaPlaceholder label="Clinical photo" className="aspect-4/3 rounded-lg" />
            <MediaPlaceholder label="Provider portrait" className="aspect-4/3 rounded-lg" />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="eyebrow mb-4">Common conditions treated</p>
            <ul className="space-y-3 text-sm text-foreground">
              {group.conditions.map((c) => (
                <li key={c} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="eyebrow mb-3">Providers in this specialty</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {docs.map((d) => (
                <li key={d.id}>
                  {d.name}, {d.credentials} — {d.subSpecialty}
                </li>
              ))}
            </ul>
            <Button asChild size="pill" variant="outlineNavy" className="mt-5">
              <Link to="/find-a-doctor" search={{ specialty: group.slug }}>
                View profiles
              </Link>
            </Button>
          </div>
        </aside>
      </section>
    </>
  );
}

function SpecialtyNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-28 text-center">
      <h1 className="text-3xl">Specialty not found</h1>
      <p className="mt-3 text-muted-foreground">
        That specialty page doesn't exist in this demo. Browse all specialties instead.
      </p>
      <Button asChild size="pillLg" className="mt-6">
        <Link to="/specialties">All specialties</Link>
      </Button>
    </div>
  );
}
