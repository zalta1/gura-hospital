import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { conditionsIndex } from "@/lib/hospital-data";

const events = [
  { date: "Sep 12", title: "Heart Health Screening Clinic", place: "Harborline Atrium" },
  { date: "Sep 19", title: "Joint Replacement Pre-Op Class", place: "Westbrook, Room 210" },
  { date: "Oct 03", title: "Childbirth Preparation Weekend", place: "Birth Center" },
  { date: "Oct 17", title: "Diabetes Nutrition Workshop", place: "Lakeview Education Suite" },
];

const forms = [
  "New Patient Registration",
  "Medical Records Release",
  "Advance Directive Packet",
  "Financial Assistance Application",
  "Standard Charges List (price transparency)",
];

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Patient Resources: Health Library, Classes & Forms | Gura Hospital" },
      {
        name: "description",
        content:
          "Gura Hospital resources: a health library of conditions treated, upcoming classes and events, downloadable forms and price transparency information.",
      },
      { property: "og:title", content: "Resources | Gura Hospital" },
      {
        property: "og:description",
        content: "Health library, classes and events, forms and price transparency.",
      },
    ],
  }),
  component: Resources,
});

function Resources() {
  return (
    <>
      <PageHero
        title="Resources"
        subtitle="Plain-language answers, classes worth attending and the paperwork in one place."
        mediaLabel="Health education library photograph placeholder"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <p className="eyebrow mb-3">Health Library</p>
        <h2 className="text-3xl md:text-4xl">Conditions we treat</h2>
        <div className="mt-8 flex flex-wrap gap-2">
          {conditionsIndex.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-muted py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">Classes &amp; Events</p>
            <h2 className="text-3xl md:text-4xl">What&rsquo;s coming up</h2>
            <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-background">
              {events.map((e) => (
                <li key={e.title} className="flex items-start gap-4 px-5 py-4">
                  <span className="w-16 shrink-0 text-sm font-medium text-accent">{e.date}</span>
                  <span>
                    <span className="block text-sm">{e.title}</span>
                    <span className="block text-sm text-muted-foreground">{e.place}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Forms &amp; Downloads</p>
            <h2 className="text-3xl md:text-4xl">Paperwork</h2>
            <ul className="mt-8 space-y-3">
              {forms.map((f) => (
                <li
                  key={f}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-5 py-4 text-sm"
                >
                  {f}
                  <span className="text-xs text-muted-foreground">PDF (demo)</span>
                </li>
              ))}
            </ul>
            <Button asChild size="pill" variant="gold" className="mt-8">
              <Link to="/contact">Ask a question</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
