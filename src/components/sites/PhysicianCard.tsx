import { Link } from "@tanstack/react-router";
import { Printer, MapPin, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Physician } from "@/lib/hospital-data";
import { nextOpeningLabel } from "@/lib/portal/availability-api";
import { doctorIdForSlug } from "@/lib/portal/local-demo";

export function PhysicianCard({ physician }: { physician: Physician }) {
  const [open, setOpen] = useState(false);
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void nextOpeningLabel(doctorIdForSlug(physician.id)).then((label) => {
        if (!cancelled) setNextAvailable(label);
      });
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, [physician.id]);

  return (
    <>
      <article className="overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-float">
        <div className="flex flex-col items-center bg-primary px-6 pt-7 pb-6 text-center">
          <Headshot name={physician.name} />
          <h3 className="mt-4 text-base text-primary-foreground">
            {physician.name}
            {physician.credentials ? `, ${physician.credentials}` : ""}
          </h3>
          <p className="mt-1 text-xs tracking-wide text-gold">{physician.specialty}</p>
          {nextAvailable ? <p className="mt-2 text-xs text-primary-foreground/80">{nextAvailable}</p> : null}
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <p className="text-sm text-muted-foreground">{physician.subSpecialty}</p>
          <Button size="pill" variant="outlineNavy" className="self-start" onClick={() => setOpen(true)}>
            View Profile
          </Button>
        </div>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg overflow-hidden p-0">
          <div className="flex flex-col items-center bg-primary px-6 pt-8 pb-6 text-center">
            <Headshot name={physician.name} size="lg" />
            <DialogTitle className="mt-4 text-xl text-primary-foreground">
              {physician.name}
              {physician.credentials ? `, ${physician.credentials}` : ""}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gold">
              {physician.specialty} · {physician.subSpecialty}
            </DialogDescription>
          </div>
          <div className="space-y-4 px-6 py-6">
            <Detail icon={<MapPin className="size-4 text-gold" />} label="Office">
              {physician.office}
            </Detail>
            <Detail icon={<Phone className="size-4 text-gold" />} label="Phone">
              {physician.phone}
            </Detail>
            <Detail icon={<Printer className="size-4 text-gold" />} label="Fax">
              {physician.fax}
            </Detail>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="pillLg">
                <Link to="/book-appointment" search={{ doctor: physician.id }}>
                  Book Appointment
                </Link>
              </Button>
              <Button size="pillLg" variant="outlineNavy" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Headshot({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 border-gold bg-primary-soft ${
        size === "lg" ? "size-28" : "size-20"
      }`}
      role="img"
      aria-label={`Photo placeholder for ${name}`}
    >
      <UserRound className="size-8 text-primary-foreground/60" strokeWidth={1.5} />
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="nav-label text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{children}</p>
      </div>
    </div>
  );
}
