import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/portal/auth";
import { formatConfirmedSlot, formatDateTime, visitPreferenceLabel } from "@/lib/portal/format";
import { LOCAL_BOOKING_EVENT } from "@/lib/portal/local-store";
import { fetchDoctorAppointments, type AppointmentRow } from "@/lib/portal/queries";

export const Route = createFileRoute("/doctor/")({
  head: () => ({
    meta: [{ title: "My appointments | Gura Hospital" }],
  }),
  component: DoctorAppointments,
});

function DoctorAppointments() {
  const { doctorId } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", "doctor-appointments", doctorId],
    queryFn: () => fetchDoctorAppointments(doctorId ?? ""),
    enabled: Boolean(doctorId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!doctorId) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "doctor-appointments", doctorId] });
    };
    window.addEventListener(LOCAL_BOOKING_EVENT, refresh);
    window.addEventListener("storage", refresh);
    const channel = supabase
      .channel(`doctor-appointments-${doctorId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        refresh,
      )
      .subscribe();
    return () => {
      window.removeEventListener(LOCAL_BOOKING_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      void supabase.removeChannel(channel);
    };
  }, [doctorId, queryClient]);

  const rows = data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Schedule</p>
        <h1 className="mt-1 text-2xl text-primary">My appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Newest requests first. Open a row for the full intake.</p>
      </div>
      {!doctorId && !isLoading ? (
        <p className="text-sm text-muted-foreground">
          No physician record is linked to this account. Ask an administrator to connect your profile.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Unable to load appointments."}</p>
      ) : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading your schedule…</p> : null}

      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Incoming requests</h2>
        </div>
        <div className="divide-y divide-border">
          {rows.length === 0 && !isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            rows.map((row) => <AppointmentRowCard key={row.id} row={row} />)
          )}
        </div>
      </section>
    </div>
  );
}

function AppointmentRowCard({ row }: { row: AppointmentRow }) {
  const body = (
    <article className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-surface">
      <div>
        <p className="font-medium text-primary">{row.patients?.full_name ?? "Unknown patient"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{row.reason_for_visit || "No reason recorded"}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {row.patients?.insurance || "Insurance not provided"} ·{" "}
          {visitPreferenceLabel(row.visit_preference, row.campus, row.visit_type)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.appointment_date && row.appointment_time
            ? `Confirmed ${formatConfirmedSlot(row.appointment_date, row.appointment_time)}`
            : `Requested ${formatDateTime(row.datetime)}`}
        </p>
        <Badge variant="outline" className="mt-2">
          {row.status}
        </Badge>
      </div>
      <p className="text-xs font-medium text-gold">Open chart →</p>
    </article>
  );

  if (!row.patient_id) return body;
  return (
    <Link to="/doctor/patients/$patientId" params={{ patientId: row.patient_id }} className="block">
      {body}
    </Link>
  );
}
