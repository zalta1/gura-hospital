import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/portal/auth";
import { formatConfirmedSlot, formatDateTime, visitPreferenceLabel } from "@/lib/portal/format";
import { LOCAL_BOOKING_EVENT } from "@/lib/portal/local-store";
import { fetchDoctorAppointments, setDoctorAppointmentStatus, type AppointmentRow } from "@/lib/portal/queries";

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
            rows.map((row) => <AppointmentRowCard key={row.id} row={row} doctorId={doctorId ?? ""} />)
          )}
        </div>
      </section>
    </div>
  );
}

function AppointmentRowCard({ row, doctorId }: { row: AppointmentRow; doctorId: string }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<"confirmed" | "cancelled" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const details = (
    <div>
      <p className="font-medium text-primary">{row.patients?.full_name ?? "Unknown patient"}</p>
      <p className="mt-1 text-sm text-muted-foreground">{row.reason_for_visit || "No reason recorded"}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {row.patients?.insurance || "Insurance not provided"} ·{" "}
        {visitPreferenceLabel(row.visit_preference, row.campus, row.visit_type)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {row.appointment_date && row.appointment_time
          ? `Visit ${formatConfirmedSlot(row.appointment_date, row.appointment_time)}`
          : `Requested ${formatDateTime(row.datetime)}`}
      </p>
      <Badge variant="outline" className="mt-2">
        {row.status}
      </Badge>
    </div>
  );

  async function decide(status: "confirmed" | "cancelled") {
    setActionError(null);
    setPending(status);
    try {
      await setDoctorAppointmentStatus(doctorId, row.id, status);
      await queryClient.invalidateQueries({ queryKey: ["portal", "doctor-appointments", doctorId] });
      await queryClient.invalidateQueries({ queryKey: ["free-slots"] });
      await queryClient.invalidateQueries({ queryKey: ["portal", "availability", doctorId] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update this visit.");
    } finally {
      setPending(null);
    }
  }

  return (
    <article className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
      {row.patient_id ? (
        <Link
          to="/doctor/patients/$patientId"
          params={{ patientId: row.patient_id }}
          className="min-w-0 flex-1 rounded-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {details}
          <p className="mt-2 text-xs font-medium text-gold">Open chart →</p>
        </Link>
      ) : (
        details
      )}
      {row.status === "pending" ? (
        <div className="flex flex-col gap-2">
          <Button type="button" size="sm" variant="gold" disabled={pending !== null} onClick={() => void decide("confirmed")}>
            {pending === "confirmed" ? "Confirming…" : "Confirm"}
          </Button>
          <Button type="button" size="sm" variant="outlineNavy" disabled={pending !== null} onClick={() => void decide("cancelled")}>
            {pending === "cancelled" ? "Declining…" : "Decline"}
          </Button>
          {actionError ? <p className="max-w-40 text-xs text-destructive">{actionError}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
