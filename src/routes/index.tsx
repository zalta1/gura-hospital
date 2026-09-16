import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Baby,
  Bone,
  Brain,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityCommitmentBanner } from "@/components/sites/CommunityCommitmentBanner";
import { ScrollReveal } from "@/components/sites/ScrollReveal";
import { specialtyGroups } from "@/lib/hospital-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gura Hospital | Academic Medical Center" },
      {
        name: "description",
        content:
          "Gura Hospital connects patients with specialists in cardiology, orthopedics, neurology, and more. Request an appointment or speak with a care navigator.",
      },
      { property: "og:title", content: "Gura Hospital | Academic Medical Center" },
      {
        property: "og:description",
        content: "Request an appointment with a Gura Hospital specialist.",
      },
    ],
  }),
  component: Home,
});

const steps = [
  {
    icon: ClipboardList,
    title: "Share why you need care",
    body: "Complete a short intake or speak with the care navigation agent. Clinicians review anything that could affect your plan of care.",
  },
  {
    icon: UserCheck,
    title: "Match with the right specialist",
    body: "Navigators pair you with a physician whose focus fits your condition, insurance, and campus preference.",
  },
  {
    icon: HeartPulse,
    title: "Visit, then stay connected",
    body: "See your doctor in person or by telehealth. Follow-up plans are reviewed by staff before they reach you.",
  },
];

const stats = [
  { value: "1978", label: "Founded" },
  { value: "620+", label: "Physicians & APPs" },
  { value: "41", label: "Specialties" },
  { value: "2", label: "Campuses" },
];

const featured = [
  { icon: HeartPulse, slug: "cardiology-electrophysiology", title: "Heart & Vascular" },
  { icon: Bone, slug: "orthopedics", title: "Orthopedics" },
  { icon: Brain, slug: "neurology", title: "Neurosciences" },
  { icon: Activity, slug: "gastroenterology", title: "Digestive Health" },
  { icon: Baby, slug: "womens-health", title: "Women's Health" },
  { icon: Stethoscope, slug: "primary-care", title: "Primary Care" },
];

function Home() {
  return (
    <>
      <section className="relative isolate min-h-[32rem] overflow-hidden bg-primary md:min-h-[38rem]">
        <img
          src="https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=2000&q=80"
          alt="Gura Hospital main campus"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/40" />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-4 py-24 md:py-36">
          <ScrollReveal as="p" className="eyebrow mb-4" delay={40}>
            Fairmont Ridge · Alder Bay
          </ScrollReveal>
          <ScrollReveal as="h1" className="max-w-3xl text-4xl text-primary-foreground md:text-6xl" delay={120}>
            Medicine that is precise. Care that stays with you.
          </ScrollReveal>
          <ScrollReveal
            as="p"
            className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/85 md:text-lg"
            delay={200}
          >
            More than 620 physicians across 41 specialties, same-day imaging, and navigators who
            remain on your care team from first contact through follow-up.
          </ScrollReveal>
          <ScrollReveal className="mt-9 flex flex-wrap gap-3" delay={280}>
            <Button asChild size="pillLg" variant="gold">
              <Link to="/book-appointment">Request an Appointment</Link>
            </Button>
            <Button asChild size="pillLg" variant="outlineLight">
              <Link to="/find-a-doctor">Find a Doctor</Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 lg:grid-cols-4">
          {stats.map((s, i) => (
            <ScrollReveal key={s.label} className="text-center lg:text-left" delay={i * 80}>
              <p className="font-display text-3xl text-primary md:text-4xl">{s.value}</p>
              <p className="nav-label mt-2 text-muted-foreground">{s.label}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <ScrollReveal className="max-w-2xl">
          <p className="eyebrow mb-3">Getting started</p>
          <h2 className="text-3xl md:text-4xl">Three steps to the right specialist</h2>
        </ScrollReveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <ScrollReveal key={step.title} delay={i * 80} className="border-t-2 border-gold bg-card p-7 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
                  <step.icon className="size-5" />
                </span>
                <span className="font-display text-2xl text-gold">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <ScrollReveal className="max-w-2xl">
              <p className="eyebrow mb-3">Centers of excellence</p>
              <h2 className="text-3xl md:text-4xl">Specialty care, organized around you</h2>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <Button asChild size="pill" variant="outlineNavy">
                <Link to="/specialties">All specialties</Link>
              </Button>
            </ScrollReveal>
          </div>
          <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((f, i) => {
              const group = specialtyGroups.find((g) => g.slug === f.slug);
              return (
                <ScrollReveal key={f.slug} delay={i * 80} as="div">
                  <Link
                    to="/specialties/$slug"
                    params={{ slug: f.slug }}
                    className="specialty-card group block p-8"
                  >
                    <f.icon className="specialty-card-icon size-6" />
                    <h3 className="specialty-card-title mt-5 text-lg">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{group?.blurb}</p>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
        <ScrollReveal>
          <img
            src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80"
            alt="Clinical team in a Gura Hospital procedure suite"
            className="aspect-4/3 w-full object-cover"
          />
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <p className="eyebrow mb-3">Continuity of care</p>
          <h2 className="text-3xl md:text-4xl">AI-assisted navigation. Human accountability.</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Our care navigation agent helps patients describe symptoms, find the right specialty, and
            request times that fit. Follow-up plans and clinically adjacent messages wait in a
            pending-review queue until a physician or staff member approves them. The agent never
            diagnoses and never writes directly to the medical record.
          </p>
          <div className="mt-6 flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-gold" />
            <p>
              Minimum-necessary data access, tenant isolation, and a full transcript of every agent
              action — designed so licensed professionals remain responsible for clinical decisions.
            </p>
          </div>
          <Button asChild size="pillLg" className="mt-8">
            <Link to="/book-appointment">Start intake</Link>
          </Button>
        </ScrollReveal>
      </section>

      <CommunityCommitmentBanner />

      <section className="bg-primary">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-20 lg:flex-row lg:items-center lg:justify-between">
          <ScrollReveal className="max-w-2xl">
            <p className="eyebrow mb-3">Appointments</p>
            <h2 className="text-3xl text-primary-foreground md:text-4xl">
              Request a visit or speak with a navigator today.
            </h2>
            <p className="mt-4 text-primary-foreground/75">
              Care navigators: {hospitalInfoPhone()} — 24 hours a day.
            </p>
          </ScrollReveal>
          <ScrollReveal className="flex flex-wrap gap-3" delay={100}>
            <Button asChild size="pillLg" variant="gold">
              <Link to="/book-appointment">Request Appointment</Link>
            </Button>
            <Button asChild size="pillLg" variant="outlineLight">
              <Link to="/find-a-doctor">Find a Doctor</Link>
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

function hospitalInfoPhone() {
  return "(555) 210-0000";
}
