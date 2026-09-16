import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";

const programs = [
  {
    name: "Structural Heart Program",
    body: "A joint cardiology and cardiac surgery team evaluating valve disease together in a single visit, with transcatheter and surgical options reviewed side by side.",
    stat: "410 valve procedures last year",
  },
  {
    name: "Joint Replacement Center",
    body: "Hip and knee replacement with a dedicated pre-op class, one nurse navigator per patient and a median discharge of 1.2 days.",
    stat: "94% same-day mobilization",
  },
  {
    name: "Stroke Response Team",
    body: "Neurology, imaging and pharmacy activate on a single page, with CT completed before the patient leaves the resuscitation bay.",
    stat: "28-minute median door-to-needle",
  },
  {
    name: "Birth Center",
    body: "Twelve labor suites, midwifery and OB care under one roof, on-site level III NICU and lactation support for twelve weeks postpartum.",
    stat: "2,300 births per year",
  },
  {
    name: "Imaging & Diagnostics",
    body: "3T MRI, low-dose CT, echocardiography and interventional radiology with next-day appointments at the Lakeview campus.",
    stat: "Results read within 24 hours",
  },
  {
    name: "Rehabilitation Services",
    body: "Inpatient and outpatient physical, occupational and speech therapy, including cardiac and pulmonary rehab cohorts.",
    stat: "18 therapy suites",
  },
];

export const Route = createFileRoute("/programs-services")({
  head: () => ({
    meta: [
      { title: "Programs & Services | Gura Hospital" },
      {
        name: "description",
        content:
          "Gura Hospital programs including structural heart, joint replacement, stroke response, the Birth Center, imaging and rehabilitation services.",
      },
      { property: "og:title", content: "Programs & Services | Gura Hospital" },
      {
        property: "og:description",
        content: "Six coordinated demo programs spanning heart, joints, stroke, birth, imaging and rehab.",
      },
    ],
  }),
  component: ProgramsServices,
});

function ProgramsServices() {
  return (
    <>
      <PageHero
        title="Programs & Services"
        subtitle="Coordinated programs built around one condition at a time, not one department at a time."
        mediaLabel="Hybrid operating suite photograph placeholder"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <article
              key={p.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="text-xl text-card-foreground">{p.name}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              <p className="mt-5 text-sm font-medium text-accent">{p.stat}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-primary py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl text-primary-foreground md:text-4xl">
            Not sure which program fits?
          </h2>
          <p className="mt-4 text-primary-foreground/75">
            Our access team will route you to the right specialist, usually within one business day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="pill" variant="gold">
              <Link to="/book-appointment">Book appointment</Link>
            </Button>
            <Button asChild size="pill" variant="outlineLight">
              <Link to="/find-a-doctor">Find a doctor</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
