import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/portal/auth";
import { formatDateTime, visitPreferenceLabel } from "@/lib/portal/format";
import { fetchPatientTimeline, saveFollowup } from "@/lib/portal/queries";

export const Route = createFileRoute("/doctor/patients/$patientId")({
  head: () => ({
    meta: [{ title: "Patient chart | Gura Hospital" }],
  }),
  component: PatientChart,
});

function PatientChart() {
  const { patientId } = Route.useParams();
  const childMatches = useChildMatches();
  const hasChild = childMatches.length > 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", "patient", patientId],
    queryFn: () => fetchPatientTimeline(patientId),
  });

  const patient = data?.patient;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Chart</p>
          <h1 className="mt-1 text-2xl text-primary">{patient?.full_name ?? "Patient"}</h1>
          {patient ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {patient.dob ? `DOB ${patient.dob}` : "DOB unknown"}
              {patient.email ? ` · ${patient.email}` : ""}
              {patient.phone ? ` · ${patient.phone}` : ""}
              {patient.insurance ? ` · ${patient.insurance}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="pill" variant={hasChild ? "outlineNavy" : "gold"}>
            <Link to="/doctor/patients/$patientId" params={{ patientId }}>
              Timeline
            </Link>
          </Button>
          <Button asChild size="pill" variant="outlineNavy">
            <Link to="/doctor/patients/$patientId/report" params={{ patientId }}>
              Write report
            </Link>
          </Button>
          <Button asChild size="pill" variant="outlineNavy">
            <Link to="/doctor/patients/$patientId/medications" params={{ patientId }}>
              Meds & reminders
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Unable to load chart."}</p>
      ) : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading chart…</p> : null}
      {!isLoading && !patient ? (
        <p className="text-sm text-muted-foreground">This patient record was not found or is not assigned to you.</p>
      ) : null}

      {patient ? <IntakeFields patientId={patientId} /> : null}

      {hasChild ? <Outlet /> : <PatientTimeline patientId={patientId} />}
    </div>
  );
}

function IntakeFields({ patientId }: { patientId: string }) {
  const { data } = useQuery({
    queryKey: ["portal", "patient", patientId],
    queryFn: () => fetchPatientTimeline(patientId),
  });
  const patient = data?.patient;
  const latest = data?.appointments?.[0];
  if (!patient) return null;

  const fields = [
    ["Full name", patient.full_name],
    ["Date of birth", patient.dob ?? "—"],
    ["Email", patient.email ?? "—"],
    ["Phone", patient.phone ?? "—"],
    ["Insurance", patient.insurance ?? "—"],
    ["Reason for visit", latest?.reason_for_visit ?? "—"],
    ["Preferred specialty", latest?.preferred_specialty ?? "—"],
    [
      "Visit preference",
      visitPreferenceLabel(latest?.visit_preference, latest?.campus, latest?.visit_type),
    ],
    ["Requested", latest ? formatDateTime(latest.datetime) : "—"],
  ] as const;

  return (
    <section className="border border-border bg-card shadow-card">
      <div className="bg-primary px-4 py-2 text-primary-foreground">
        <h2 className="nav-label">Visit intake</h2>
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PatientTimeline({ patientId }: { patientId: string }) {
  const { doctorId } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["portal", "patient", patientId],
    queryFn: () => fetchPatientTimeline(patientId),
  });
  const [followDate, setFollowDate] = useState("");
  const [followNote, setFollowNote] = useState("");

  const schedule = useMutation({
    mutationFn: () => {
      if (!doctorId) throw new Error("No physician record is linked to this account.");
      return saveFollowup({
        patient_id: patientId,
        doctor_id: doctorId,
        follow_up_date: new Date(followDate).toISOString(),
        summary_json: { clinician_note: followNote, source: "doctor_portal" },
      });
    },
    onSuccess: () => {
      setFollowDate("");
      setFollowNote("");
      void queryClient.invalidateQueries({ queryKey: ["portal", "patient", patientId] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "followups"] });
    },
  });

  const events = [
    ...(data?.appointments ?? []).map((row) => ({
      at: row.datetime,
      title: `Appointment · ${row.status}`,
      body: `${row.visit_type.replace("_", " ")} · ${row.reason_for_visit || "No reason"} · ${row.doctors?.name ?? ""}`,
    })),
    ...(data?.reports ?? []).map((row) => ({
      at: row.created_at,
      title: row.approved_by_doctor ? "Report approved" : "Report draft",
      body: row.diagnosis || row.notes || "No diagnosis",
    })),
    ...(data?.medications ?? []).map((row) => ({
      at: row.created_at,
      title: `Medication · ${row.drug_name}`,
      body: `${row.dose} · ${row.schedule}${row.duration ? ` · ${row.duration}` : ""}`,
    })),
    ...(data?.reminders ?? []).map((row) => ({
      at: row.scheduled_time,
      title: `Reminder · ${row.channel}`,
      body: `${row.status}${row.approved_to_send ? " · approved to send" : " · not approved to send"}`,
    })),
    ...(data?.followups ?? []).map((row) => ({
      at: row.follow_up_date,
      title: `Follow-up · ${row.status}`,
      body: row.transcript_text || "No transcript yet",
    })),
    ...(data?.activity ?? []).map((row) => ({
      at: row.created_at,
      title: `AI · ${row.activity_type.replaceAll("_", " ")}`,
      body: `${row.outcome.replaceAll("_", " ")} · ${row.summary || "No summary"}`,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Timeline</h2>
        </div>
        {events.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No timeline events yet.</p>
        ) : (
          <ol className="divide-y divide-border">
            {events.map((event, index) => (
              <li key={`${event.at}-${index}`} className="px-4 py-4">
                <p className="text-xs text-gold">{formatDateTime(event.at)}</p>
                <p className="mt-1 font-medium text-primary">{event.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{event.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <aside className="space-y-4">
        <section className="border border-border bg-card shadow-card">
          <div className="bg-primary px-4 py-2 text-primary-foreground">
            <h2 className="nav-label">Schedule follow-up</h2>
          </div>
          <form
            className="space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              schedule.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="follow-date">Follow-up date</Label>
              <Input
                id="follow-date"
                type="datetime-local"
                value={followDate}
                onChange={(e) => setFollowDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="follow-note">Clinician note</Label>
              <Textarea
                id="follow-note"
                value={followNote}
                onChange={(e) => setFollowNote(e.target.value)}
                rows={4}
              />
            </div>
            {schedule.isError ? (
              <p className="text-sm text-destructive">
                {schedule.error instanceof Error ? schedule.error.message : "Could not schedule."}
              </p>
            ) : null}
            <Button type="submit" size="pill" variant="gold" disabled={schedule.isPending || !followDate}>
              Save follow-up
            </Button>
          </form>
        </section>
        <section className="border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">
            Reports, medication plans, and reminder approval stay on this chart. Nothing is sent to the
            patient until a doctor explicitly approves it.
          </p>
          <Button asChild size="pill" variant="outlineNavy" className="mt-3">
            <Link to="/doctor/followups">View follow-up results</Link>
          </Button>
        </section>
      </aside>
    </div>
  );
}
