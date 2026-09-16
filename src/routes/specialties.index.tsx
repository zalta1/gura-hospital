import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { physicians, specialtyGroups } from "@/lib/hospital-data";

export const Route = createFileRoute("/specialties/")({
  head: () => ({
    meta: [
      { title: "Specialties & Centers of Excellence | Gura Hospital" },
      {
        name: "description",
        content:
          "Explore Gura Hospital specialties including cardiology, orthopedics, neurology, gastroenterology, women's health and primary care.",
      },
      { property: "og:title", content: "Specialties & Centers of Excellence | Gura Hospital" },
      {
        property: "og:description",
        content: "Six fictional specialty programs with conditions treated and provider listings.",
      },
    ],
  }),
  component: SpecialtiesIndex,
});

function SpecialtiesIndex() {
  return (
    <>
      <PageHero
        title="Specialties"
        subtitle="Multidisciplinary teams organized around the conditions they treat, so your care never gets handed off and forgotten."
      />
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {specialtyGroups.map((g) => (
            <Link
              key={g.slug}
              to="/specialties/$slug"
              params={{ slug: g.slug }}
              className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-float"
            >
              <div className="media-placeholder h-36 border-b border-border" aria-hidden="true" />
              <div className="flex flex-1 flex-col p-6">
                <h2 className="text-lg">{g.title}</h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{g.blurb}</p>
                <p className="nav-label mt-5 inline-flex items-center gap-2 text-primary">
                  {physicians.filter((p) => p.specialtySlug === g.slug).length} providers
                  <ArrowRight className="size-4 text-gold transition-transform group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
