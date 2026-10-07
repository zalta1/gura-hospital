import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";
import { physicians, specialtyGroups } from "@/lib/hospital-data";

const specialtyGallery: Record<
  string,
  | {
      layout: "pair";
      clinical: { src: string; alt: string };
      provider: { src: string; alt: string };
    }
  | { layout: "feature"; feature: { src: string; alt: string } }
> = {
  "cardiology-electrophysiology": {
    layout: "pair",
    clinical: {
      src: "/images/specialties/heart-vascular/clinical-photo.jpg",
      alt: "Gura Hospital heart surgery team at work",
    },
    provider: {
      src: "/images/specialties/heart-vascular/provider-portrait.jpg",
      alt: "Gura Hospital heart and vascular surgeon",
    },
  },
  orthopedics: {
    layout: "pair",
    clinical: {
      src: "/images/specialties/orthopedics/clinical-photo.jpg",
      alt: "Orthopedic diagnostic imaging of bones and joints",
    },
    provider: {
      src: "/images/specialties/orthopedics/provider-portrait.jpg",
      alt: "Advanced orthopedic imaging and treatment technology at Gura Hospital",
    },
  },
  neurology: {
    layout: "pair",
    clinical: {
      src: "/images/specialties/neurology/clinical-photo.jpg",
      alt: "Brain MRI scans reviewed by the neurology team",
    },
    provider: {
      src: "/images/specialties/neurology/provider-portrait.jpg",
      alt: "Neurologist reviewing head and spine imaging",
    },
  },
  gastroenterology: {
    layout: "pair",
    clinical: {
      src: "/images/specialties/digestive-health/clinical-photo.jpg",
      alt: "Anatomical illustration of the digestive system",
    },
    provider: {
      src: "/images/specialties/digestive-health/provider-portrait.jpg",
      alt: "Digestive health consultation and nutrition planning",
    },
  },
  "womens-health": {
    layout: "feature",
    feature: {
      src: "/images/specialties/womens-health/feature-photo.jpg",
      alt: "Women’s health awareness and care at Gura Hospital",
    },
  },
  "primary-care": {
    layout: "feature",
    feature: {
      src: "/images/specialties/primary-care/feature-photo.jpg",
      alt: "Primary care at Gura Hospital",
    },
  },
};

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
    const description = group.description[0] ?? group.blurb;
    return {
      meta: [
        { title: `${group.title} | Gura Hospital` },
        { name: "description", content: description },
        { property: "og:title", content: `${group.title} | Gura Hospital` },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: SpecialtyNotFound,
  component: SpecialtyDetail,
});

function SpecialtyDetail() {
  const { group } = Route.useLoaderData();
  const docs = physicians.filter((p) => p.specialtySlug === group.slug);
  const heroLead = group.description[0] ?? group.blurb;
  const gallery = specialtyGallery[group.slug];

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
          <p className="mt-4 max-w-2xl text-primary-foreground/75">{heroLead}</p>
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
          {group.description.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            {gallery?.layout === "feature" ? (
              <div className="relative col-span-full aspect-[21/9] min-h-[14rem] overflow-hidden rounded-lg bg-surface shadow-card sm:aspect-[2/1] sm:min-h-[16rem]">
                <img
                  src={gallery.feature.src}
                  alt={gallery.feature.alt}
                  className="absolute inset-0 size-full object-cover object-center"
                />
              </div>
            ) : gallery?.layout === "pair" ? (
              <>
                <SpecialtyPhoto src={gallery.clinical.src} alt={gallery.clinical.alt} />
                <SpecialtyPhoto src={gallery.provider.src} alt={gallery.provider.alt} />
              </>
            ) : (
              <>
                <MediaPlaceholder label="Clinical photo" className="aspect-4/3 rounded-lg" />
                <MediaPlaceholder label="Provider portrait" className="aspect-4/3 rounded-lg" />
              </>
            )}
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

      {group.accordion.length > 0 ? (
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16">
            {group.accordionHeading ? (
              <div className="mb-8 max-w-3xl">
                <p className="eyebrow mb-3">Program highlights</p>
                <h2 className="text-3xl md:text-4xl">{group.accordionHeading}</h2>
              </div>
            ) : null}
            <Accordion
              type="single"
              collapsible
              className="mx-auto max-w-4xl rounded-lg border border-border bg-card px-5 shadow-card"
            >
              {group.accordion.map((item, index) => (
                <AccordionItem key={item.title} value={`item-${index}`}>
                  <AccordionTrigger>{item.title}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 leading-relaxed">
                      {item.paragraphs.map((p) => (
                        <p key={p.slice(0, 56)}>{p}</p>
                      ))}
                      {item.bullets && item.bullets.length > 0 ? (
                        <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                          {item.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      ) : null}
                      {item.afterBullets?.map((p) => (
                        <p key={p.slice(0, 56)}>{p}</p>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      ) : null}
    </>
  );
}

function SpecialtyPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-surface shadow-card">
      <img src={src} alt={alt} className="absolute inset-0 size-full object-cover object-center" />
    </div>
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
