import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { hospitalInfo } from "@/lib/hospital-data";

const items = [
  {
    title: "Refer a Patient",
    body: "Send a referral by secure fax to (555) 210-0301 or call the physician liaison line. Most referrals are scheduled within two business days, urgent cases same day.",
  },
  {
    title: "Transfer Center",
    body: "One call reaches the on-call hospitalist, intensivist and bed control simultaneously. Accepting transfers 24 hours a day at (555) 210-0777.",
  },
  {
    title: "Continuing Medical Education",
    body: "Monthly grand rounds, tumor board and a quarterly cardiovascular symposium. AMA PRA Category 1 credit offered for demo purposes only.",
  },
  {
    title: "Clinical Results Access",
    body: "Referring providers receive consult notes, imaging reads and discharge summaries through the demo provider portal within 24 hours of the visit.",
  },
];

export const Route = createFileRoute("/for-physicians")({
  head: () => ({
    meta: [
      { title: "For Physicians: Referrals & Transfer Center | Gura Hospital" },
      {
        name: "description",
        content:
          "Referral pathways, 24-hour transfer center, CME offerings and clinical results access for providers partnering with Gura Hospital.",
      },
      { property: "og:title", content: "For Physicians | Gura Hospital" },
      {
        property: "og:description",
        content: "Referral lines, transfer center, CME and provider results access.",
      },
    ],
  }),
  component: ForPhysicians,
});

function ForPhysicians() {
  return (
    <>
      <PageHero
        title="For Physicians"
        subtitle="Direct lines, fast turnarounds and notes that actually make it back to you."
        mediaLabel="Physician consultation photograph placeholder"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((i) => (
            <article key={i.title} className="rounded-2xl border border-border bg-card p-7 shadow-sm">
              <h2 className="text-xl text-card-foreground">{i.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-muted py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow mb-3">Physician Liaison</p>
            <h2 className="text-3xl md:text-4xl">A named person, not a queue</h2>
            <p className="mt-4 text-muted-foreground">
              Dana Whitfield, MPH coordinates referrals, credentialing questions and joint clinic
              scheduling for community practices. Reach the main operator at {hospitalInfo.phone} and
              ask for extension 4120.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="pill" variant="gold">
                <Link to="/contact">Contact the liaison</Link>
              </Button>
              <Button asChild size="pill" variant="outlineNavy">
                <Link to="/specialties">Browse specialties</Link>
              </Button>
            </div>
          </div>
          <div
            className="media-placeholder h-72 rounded-2xl"
            role="img"
            aria-label="Grand rounds auditorium photograph placeholder"
          />
        </div>
      </section>
    </>
  );
}
