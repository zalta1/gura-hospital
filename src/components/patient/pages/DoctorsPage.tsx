import { Link } from "@tanstack/react-router";
import { PageGate, EmptyState } from "@/components/patient/ui";
import { useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { doctorName, visitsForDoctor } from "@/lib/patient-portal/data";
import { slugForDoctorId } from "@/lib/portal/local-demo";
import { formatDate } from "@/lib/portal/format";

export function DoctorsPage() {
  return (
    <PageGate>
      <DoctorsBody />
    </PageGate>
  );
}

function DoctorsBody() {
  const snapshot = useSnapshot();
  const doctors = snapshot.doctors.filter((doctor) =>
    snapshot.appointments.some((appointment) => appointment.doctorId === doctor.id),
  );

  if (doctors.length === 0) {
    return (
      <EmptyState title="No doctors yet" body="Doctors appear here after you have a visit or a booking with them." />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {doctors.map((doctor) => {
        const visits = visitsForDoctor(snapshot, doctor.id);
        const video = visits.next?.mode === "telehealth";
        return (
          <article key={doctor.id} className="border border-border bg-card shadow-card">
            <div className="media-placeholder flex h-28 items-center justify-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
                {doctor.initials}
              </span>
            </div>
            <div className="space-y-2 px-4 py-4">
              <p className="font-display text-lg text-primary">{doctorName(snapshot, doctor.id)}</p>
              <p className="text-sm text-gold">{doctor.specialty}</p>
              <p className="text-sm text-muted-foreground">{doctor.location}</p>
              <p className="text-xs text-muted-foreground">
                Last visit: {visits.last ? formatDate(visits.last.datetime) : "None yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                Next visit: {visits.next ? formatDate(visits.next.datetime) : "None scheduled"}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outlineNavy">
                  <Link to={"/patient/messages" as never} search={{ thread: doctor.id } as never}>
                    Message
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/book-appointment" search={slugForDoctorId(doctor.id) ? { doctor: slugForDoctorId(doctor.id) as string } : {}}>
                    Book follow-up
                  </Link>
                </Button>
                {video ? (
                  <Button asChild size="sm" variant="gold">
                    <Link to={"/patient/video" as never}>Start video visit</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
