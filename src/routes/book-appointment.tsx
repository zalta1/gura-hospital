import { createFileRoute } from "@tanstack/react-router";
import { Bot, CalendarCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SlotPicker } from "@/components/portal/SlotPicker";
import { VoiceNavigator, type VoiceFormContext } from "@/components/site/VoiceNavigator";
import { PageHero } from "@/components/site/PageHero";
import { insuranceProviders, physicians, specialtyGroups } from "@/lib/hospital-data";
import { formatHospitalDateTime, type FreeSlot } from "@/lib/portal/availability";
import { submitBooking } from "@/lib/portal/booking";
import { doctorIdForSlug } from "@/lib/portal/local-demo";
import { unlockWebAudio } from "@/lib/voice/microphone";

type Search = { doctor?: string | undefined };

export const Route = createFileRoute("/book-appointment")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    doctor: typeof search["doctor"] === "string" ? search["doctor"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Request an Appointment | Gura Hospital" },
      {
        name: "description",
        content: "Request a visit with a Gura Hospital specialist, or speak with a care navigation agent.",
      },
    ],
  }),
  component: BookAppointment,
});

function BookAppointment() {
  const { doctor } = Route.useSearch();
  const selected = physicians.find((p) => p.id === doctor);
  const formRef = useRef<HTMLFormElement>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [voiceContext, setVoiceContext] = useState<VoiceFormContext>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [specialty, setSpecialty] = useState(selected?.specialtySlug ?? "");
  const [insurance, setInsurance] = useState("");
  const [visit, setVisit] = useState("in-person");
  const [doctorSlug, setDoctorSlug] = useState(doctor ?? "");
  const [selectedSlot, setSelectedSlot] = useState<FreeSlot | null>(null);
  const [openingsStatus, setOpeningsStatus] = useState<"loading" | "error" | "empty" | "ready" | "idle">("idle");
  const [heldLabel, setHeldLabel] = useState<string | null>(null);
  const chosen = physicians.find((physician) => physician.id === doctorSlug) ?? selected;

  useEffect(() => {
    if (doctor) setDoctorSlug(doctor);
  }, [doctor]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const preferredSpecialty =
      specialtyGroups.find((g) => g.slug === specialty)?.title ?? specialty;
    const intent = String(form.get("intent") ?? "book");
    const bookingDoctor = doctorSlug;
    const holdSlot = Boolean(bookingDoctor) && intent !== "callback" && openingsStatus === "ready";
    if (holdSlot && !selectedSlot) {
      setError("Choose an open time.");
      setBusy(false);
      return;
    }
    try {
      const startsAt = holdSlot && selectedSlot ? selectedSlot.startsAt : undefined;
      if (startsAt) setHeldLabel(formatHospitalDateTime(startsAt));
      else setHeldLabel(null);
      await submitBooking({
        fullName: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        dob: String(form.get("dob") ?? ""),
        insurance,
        reason: String(form.get("reason") ?? ""),
        preferredSpecialty,
        visitPreference: selectedSlot && holdSlot ? (selectedSlot.visitType === "telehealth" ? "telehealth" : visit) : visit,
        doctorSlug: bookingDoctor,
        ...(startsAt ? { startsAt } : {}),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero
        title="Request an Appointment"
        subtitle="Tell us what you need. A navigator will match you with the right physician. Follow-up plans and clinical messages are reviewed by staff before they are sent."
      />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-border bg-card shadow-card">
          <div className="flex items-center gap-3 bg-primary px-6 py-5">
            <CalendarCheck className="size-5 text-gold" />
            <h2 className="text-lg text-primary-foreground">Visit intake</h2>
          </div>

          {submitted ? (
            <div className="space-y-4 px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto size-10 text-gold" />
              <h3 className="text-xl">Request received</h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {heldLabel
                  ? `Your ${heldLabel} visit is held until your doctor confirms it. If the time is declined or cancelled, it opens for other patients.`
                  : "A care navigator will confirm time, provider, and insurance. You may also continue with the live navigation agent if you have more to add."}
              </p>
              <Button size="pillLg" variant="outlineNavy" onClick={() => setSubmitted(false)}>
                Submit another request
              </Button>
            </div>
          ) : (
            <form ref={formRef} className="space-y-6 px-6 py-7" onSubmit={(e) => void onSubmit(e)}>
              {chosen && (
                <p className="bg-surface px-4 py-3 text-sm text-muted-foreground">
                  Requesting a visit with{" "}
                  <span className="font-medium text-foreground">
                    {chosen.name}, {chosen.credentials}
                  </span>{" "}
                  — {chosen.specialty}
                </p>
              )}

              <div className="space-y-2">
                <Label>Physician</Label>
                <Select
                  {...(doctorSlug ? { value: doctorSlug } : {})}
                  onValueChange={(value) => {
                    setDoctorSlug(value);
                    setSelectedSlot(null);
                    const match = physicians.find((physician) => physician.id === value);
                    if (match) setSpecialty(match.specialtySlug);
                  }}
                >
                  <SelectTrigger aria-label="Physician">
                    <SelectValue placeholder="Select a physician" />
                  </SelectTrigger>
                  <SelectContent>
                    {physicians.map((physician) => (
                      <SelectItem key={physician.id} value={physician.id}>
                        {physician.name}, {physician.credentials}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for visit</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  required
                  rows={3}
                  placeholder="Briefly describe your symptoms or the care you are looking for"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Preferred specialty</Label>
                  <Select value={specialty || undefined} onValueChange={setSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialtyGroups.map((g) => (
                        <SelectItem key={g.slug} value={g.slug}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Insurance</Label>
                  <Select value={insurance || undefined} onValueChange={setInsurance}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {insuranceProviders.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Visit preference</Label>
                <RadioGroup
                  value={visit}
                  onValueChange={(value) => {
                    setVisit(value);
                    setSelectedSlot(null);
                  }}
                  className="flex flex-wrap gap-6"
                >
                  {[
                    { v: "in-person", l: "In person — Fairmont Ridge" },
                    { v: "alder-bay", l: "In person — Alder Bay" },
                    { v: "telehealth", l: "Telehealth" },
                  ].map((o) => (
                    <div key={o.v} className="flex items-center gap-2">
                      <RadioGroupItem value={o.v} id={o.v} />
                      <Label htmlFor={o.v} className="font-normal">
                        {o.l}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {doctorSlug ? (
                <div className="space-y-3">
                  <Label>Open times</Label>
                  <SlotPicker
                    doctorId={doctorIdForSlug(doctorSlug)}
                    visit={visit === "telehealth" || visit === "alder-bay" ? visit : "in-person"}
                    selectedStartsAt={selectedSlot?.startsAt ?? null}
                    onSelect={setSelectedSlot}
                    onAvailability={(state) => setOpeningsStatus(state.status)}
                  />
                  {openingsStatus === "empty" ? (
                    <p className="text-sm text-muted-foreground">Request a callback and a navigator will contact you.</p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" required placeholder="Jordan Avery" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" name="dob" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" required placeholder="(555) 000-0000" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                By submitting, you consent to an AI navigation agent handling this request under staff
                supervision. You may withdraw consent through Health Information Management.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                {doctorSlug && openingsStatus === "ready" ? (
                  <Button type="submit" name="intent" value="book" size="pillLg" disabled={busy || !selectedSlot}>
                    {busy ? "Submitting…" : "Book this time"}
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  name="intent"
                  value={doctorSlug ? "callback" : "book"}
                  size="pillLg"
                  variant={doctorSlug && openingsStatus === "ready" ? "outlineNavy" : "default"}
                  disabled={busy || openingsStatus === "loading"}
                >
                  {busy ? "Submitting…" : doctorSlug ? "Request a callback" : "Submit request"}
                </Button>
                <Button
                  type="button"
                  size="pillLg"
                  variant="outlineNavy"
                  onClick={() => {
                    unlockWebAudio();
                    const fd = formRef.current ? new FormData(formRef.current) : null;
                    setVoiceContext({
                      doctorSlug,
                      doctorName: chosen ? `${chosen.name}, ${chosen.credentials}` : "",
                      reason: String(fd?.get("reason") ?? ""),
                      insurance,
                      preferredSpecialty:
                        specialtyGroups.find((g) => g.slug === specialty)?.title ?? "",
                      visitPreference: visit,
                      fullName: String(fd?.get("name") ?? ""),
                      email: String(fd?.get("email") ?? ""),
                      phone: String(fd?.get("phone") ?? ""),
                      dateOfBirth: String(fd?.get("dob") ?? ""),
                    });
                    setAgentOpen(true);
                  }}
                >
                  <Bot className="size-4" /> Speak with a navigator
                </Button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-6">
          <div className="border border-border bg-surface p-6">
            <ShieldCheck className="size-6 text-gold" />
            <h3 className="mt-4 text-lg">What happens next</h3>
            <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li>1. A navigator reviews your request within one business day.</li>
              <li>2. Benefits are verified with your plan before a slot is confirmed.</li>
              <li>3. You receive visit options by text or email after staff approval of any clinical follow-up.</li>
            </ol>
          </div>
          <div className="border border-border bg-card p-6">
            <p className="eyebrow mb-3">Emergency</p>
            <p className="text-sm text-muted-foreground">
              The emergency department is open 24 hours at 1400 Harborline Avenue. For a medical
              emergency, call 911.
            </p>
          </div>
        </aside>
      </section>

      <VoiceNavigator
        open={agentOpen}
        onOpenChange={setAgentOpen}
        onCallComplete={() => setSubmitted(true)}
        formContext={voiceContext}
      />
    </>
  );
}
