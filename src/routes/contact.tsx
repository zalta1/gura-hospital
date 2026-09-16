import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { hospitalInfo } from "@/lib/hospital-data";

const departments = [
  { name: "Main Hospital Operator", phone: hospitalInfo.phone },
  { name: "Appointment Scheduling", phone: "(555) 210-0120" },
  { name: "Billing & Financial Counseling", phone: "(555) 210-0455" },
  { name: "Medical Records", phone: "(555) 210-0388" },
  { name: "Media & Community Relations", phone: "(555) 210-0910" },
];

const campuses = [
  {
    name: "Harborline Main Campus",
    address: "1400 Harborline Avenue, Fairmont Ridge, NY 11042",
    note: "Emergency department open 24/7",
  },
  {
    name: "Westbrook Medical Pavilion",
    address: "88 Westbrook Parkway, Suite 300, Fairmont Ridge, NY 11043",
    note: "Outpatient clinics, Mon-Fri 7:00 AM - 6:00 PM",
  },
  {
    name: "Lakeview Ambulatory Center",
    address: "2210 Lakeview Road, Cedar Hollow, NY 11055",
    note: "Imaging, labs and same-day surgery",
  },
];

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Gura Hospital: Locations & Phone Numbers" },
      {
        name: "description",
        content:
          "Reach Gura Hospital by phone or visit one of three campuses. Department numbers for scheduling, billing, medical records and media relations.",
      },
      { property: "og:title", content: "Contact Us | Gura Hospital" },
      {
        property: "og:description",
        content: "Campus addresses, department phone numbers and hours for Gura Hospital.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <>
      <PageHero
        title="Contact Us"
        subtitle="Call, visit or send a message. Someone answers around the clock."
        mediaLabel="Hospital main entrance photograph placeholder"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow mb-3">Departments</p>
            <h2 className="text-3xl md:text-4xl">Direct lines</h2>
            <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
              {departments.map((d) => (
                <li key={d.name} className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-sm text-card-foreground">{d.name}</span>
                  <span className="text-sm font-medium text-primary">{d.phone}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
              <Phone className="mt-0.5 size-5 text-accent" />
              <div>
                <p className="text-sm font-medium">{hospitalInfo.phone}</p>
                <p className="text-sm text-muted-foreground">Main operator</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
              <Mail className="mt-0.5 size-5 text-accent" />
              <div>
                <p className="text-sm font-medium">hello@gurahospital-demo.org</p>
                <p className="text-sm text-muted-foreground">Non-urgent questions only</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
              <Clock className="mt-0.5 size-5 text-accent" />
              <div>
                <p className="text-sm font-medium">{hospitalInfo.hours}</p>
                <p className="text-sm text-muted-foreground">Emergency care never closes</p>
              </div>
            </div>
            <div className="media-placeholder h-44 rounded-2xl" role="img" aria-label="Campus map placeholder" />
          </div>
        </div>
      </section>

      <section className="bg-muted py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <p className="eyebrow mb-3">Locations</p>
          <h2 className="text-3xl md:text-4xl">Three campuses across the region</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {campuses.map((c) => (
              <article key={c.name} className="rounded-2xl border border-border bg-background p-6">
                <MapPin className="size-5 text-accent" />
                <h3 className="mt-3 text-lg">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.address}</p>
                <p className="mt-2 text-sm text-muted-foreground">{c.note}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="pill" variant="gold">
              <Link to="/book-appointment">Book an appointment</Link>
            </Button>
            <Button asChild size="pill" variant="outlineNavy">
              <Link to="/find-a-doctor">Find a doctor</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
