import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import { PhysicianCard } from "@/components/site/PhysicianCard";
import { physicians, specialtyGroups } from "@/lib/hospital-data";

type Search = { specialty?: string | undefined };

export const Route = createFileRoute("/find-a-doctor")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    specialty: typeof search["specialty"] === "string" ? search["specialty"] : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Find A Doctor | Gura Hospital" },
      {
        name: "description",
        content:
          "Browse Gura Hospital physicians by specialty, view profiles and book an appointment. All physicians shown are fictional.",
      },
      { property: "og:title", content: "Find A Doctor | Gura Hospital" },
      {
        property: "og:description",
        content: "Search fictional Gura Hospital physicians by specialty and sub-specialty.",
      },
    ],
  }),
  component: FindADoctor,
});

function FindADoctor() {
  const { specialty } = Route.useSearch();
  const [open, setOpen] = useState<string[]>(
    specialty ? [specialty] : [specialtyGroups[0]!.slug],
  );

  function toggle(slug: string) {
    setOpen((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  return (
    <>
      <PageHero
        title="Find a Doctor"
        subtitle="Search the medical staff directory by specialty. Request a visit online or by phone at (555) 210-0000."
      />

      <section className="mx-auto max-w-7xl space-y-4 px-4 py-16">
        {specialtyGroups.map((group) => {
          const isOpen = open.includes(group.slug);
          const docs = physicians.filter((p) => p.specialtySlug === group.slug);
          return (
            <div key={group.slug} className="overflow-hidden rounded-lg border border-border">
              <button
                type="button"
                onClick={() => toggle(group.slug)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 bg-primary px-6 py-5 text-left transition-colors hover:bg-primary-soft"
              >
                <span>
                  <span className="block font-display text-lg text-primary-foreground">
                    {group.title}
                  </span>
                  <span className="nav-label text-primary-foreground/60">
                    {docs.length} providers
                  </span>
                </span>
                <ChevronDown
                  className={`size-5 shrink-0 text-gold transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid gap-6 bg-surface p-6 sm:grid-cols-2 lg:grid-cols-3">
                    {docs.map((p) => (
                      <PhysicianCard key={p.id} physician={p} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
