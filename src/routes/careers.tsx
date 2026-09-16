import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";

const openings = [
  { title: "Registered Nurse, Cardiac Step-Down", type: "Full time", campus: "Harborline Main" },
  { title: "Interventional Radiology Technologist", type: "Full time", campus: "Lakeview" },
  { title: "Nurse Navigator, Joint Replacement", type: "Full time", campus: "Westbrook" },
  { title: "Patient Access Representative", type: "Part time", campus: "Harborline Main" },
  { title: "Clinical Pharmacist, Inpatient", type: "Nights", campus: "Harborline Main" },
  { title: "Medical Assistant, Primary Care", type: "Full time", campus: "Cedar Hollow" },
];

const benefits = [
  "Tuition reimbursement up to $12,000 per year",
  "Certification bonuses and a clinical ladder for bedside nurses",
  "On-site childcare at the Harborline campus",
  "Retirement match up to 6% after one year",
];

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers at Gura Hospital: Clinical & Support Roles" },
      {
        name: "description",
        content:
          "Explore demo openings at Gura Hospital across nursing, imaging, pharmacy and patient access, plus benefits and the hiring process.",
      },
      { property: "og:title", content: "Careers | Gura Hospital" },
      {
        property: "og:description",
        content: "Nursing, imaging, pharmacy and support roles across three campuses.",
      },
    ],
  }),
  component: Careers,
});

function Careers() {
  return (
    <>
      <PageHero
        title="Careers"
        subtitle="Clinicians and support teams who would rather do it properly than quickly."
        mediaLabel="Care team portrait photograph placeholder"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <p className="eyebrow mb-3">Open Positions (demo)</p>
        <h2 className="text-3xl md:text-4xl">Currently hiring</h2>
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {openings.map((o) => (
            <li
              key={o.title}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-5"
            >
              <div>
                <p className="text-base text-card-foreground">{o.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {o.type} &middot; {o.campus}
                </p>
              </div>
              <Button size="pill" variant="outlineNavy">
                View role
              </Button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          These listings are fictional and provided for demonstration purposes only.
        </p>
      </section>

      <section className="bg-muted py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow mb-3">Benefits</p>
            <h2 className="text-3xl md:text-4xl">Support that lasts past orientation</h2>
            <ul className="mt-6 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {b}
                </li>
              ))}
            </ul>
            <Button asChild size="pill" variant="gold" className="mt-8">
              <Link to="/contact">Talk to a recruiter</Link>
            </Button>
          </div>
          <div
            className="media-placeholder h-72 rounded-2xl"
            role="img"
            aria-label="Nurses at the Harborline campus photograph placeholder"
          />
        </div>
      </section>
    </>
  );
}
