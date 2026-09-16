import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { hospitalInfo, insuranceProviders } from "@/lib/hospital-data";

const sections = [
  {
    id: "portal",
    title: "Patient Portal (demo)",
    body: "Message your care team, review lab results, request refills and manage upcoming visits. This demo portal is illustrative only and stores no information.",
  },
  {
    id: "records",
    title: "Medical Records",
    body: "Request a copy of your chart, transfer records to another provider or authorize a family member. Standard demo turnaround is 3-5 business days.",
  },
  {
    id: "visitors",
    title: "Visitor Information",
    body: "Two visitors per patient between 9:00 AM and 8:00 PM. Complimentary valet at the Harborline entrance. Quiet hours begin at 9:00 PM on all inpatient floors.",
  },
  {
    id: "surgery",
    title: "Preparing For Surgery",
    body: "Your pre-op nurse navigator calls 72 hours before your procedure to review medications, fasting instructions, arrival time and your ride home.",
  },
];

export const Route = createFileRoute("/for-patients")({
  head: () => ({
    meta: [
      { title: "For Patients: Portal, Billing & Visitor Info | Gura Hospital" },
      {
        name: "description",
        content:
          "Patient resources at Gura Hospital: demo patient portal, billing and insurance, medical records requests, visitor guidelines and surgery preparation.",
      },
      { property: "og:title", content: "For Patients | Gura Hospital" },
      {
        property: "og:description",
        content: "Portal access, billing and insurance, records, visitor hours and pre-surgery prep.",
      },
    ],
  }),
  component: ForPatients,
});

function ForPatients() {
  return (
    <>
      <PageHero
        title="For Patients"
        subtitle="Everything you need before, during and after your visit, in one place."
        mediaLabel="Patient services desk photograph placeholder"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((s) => (
            <article
              key={s.id}
              id={s.id}
              className="rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <h2 className="text-xl text-card-foreground">{s.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="billing" className="bg-muted py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <p className="eyebrow mb-3">Billing &amp; Insurance</p>
          <h2 className="max-w-2xl text-3xl md:text-4xl">
            Clear pricing conversations before the care begins
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            A financial counselor reviews your estimated out-of-pocket cost and payment options
            before any scheduled procedure. Questions about a statement? Call{" "}
            {hospitalInfo.phone}.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insuranceProviders.map((p) => (
              <li
                key={p}
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              >
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="pill" variant="gold">
              <Link to="/book-appointment">Book an appointment</Link>
            </Button>
            <Button asChild size="pill" variant="outlineNavy">
              <Link to="/contact">Contact billing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
