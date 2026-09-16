import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/portal/auth";
import { coercePipelineStage } from "@/lib/portal/appointment-stage";
import { formatConfirmedSlot, formatDateTime, visitPreferenceLabel } from "@/lib/portal/format";
import { LOCAL_BOOKING_EVENT } from "@/lib/portal/local-store";
import {
  assignAppointmentDoctor,
  fetchAppointments,
  fetchDoctors,
  isUnassignedAppointment,
  type AppointmentRow,
} from "@/lib/portal/queries";

export const Route = createFileRoute("/admin/appointments")({
  component: AdminAppointments,
});

const STAGES = [
  { key: "pending_intake", label: "Pending intake" },
  { key: "navigator_matched", label: "Navigator-matched" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
] as const;

type AssignDraft = {
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
};

function AdminAppointments() {
  const { loading: authLoading, profile } = useAuth();
  const queryClient = useQueryClient();
  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string }[]>([]);
  const [doctorId, setDoctorId] = useState<string>("all");
  const [specialty, setSpecialty] = useState<string>("all");
  const [campus, setCampus] = useState<string>("all");
  const [date, setDate] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignDraft, setAssignDraft] = useState<Record<string, AssignDraft>>({});
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  const filters = useMemo(() => {
    const next: { doctorId?: string; specialty?: string; campus?: string; date?: string } = {};
    if (doctorId !== "all") next.doctorId = doctorId;
    if (specialty !== "all") next.specialty = specialty;
    if (campus !== "all") next.campus = campus;
    if (date) next.date = date;
    return next;
  }, [doctorId, specialty, campus, date]);

  const queryKey = ["portal", "admin-appointments", filters] as const;

  const { data, error, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAppointments(filters),
    enabled: !authLoading && Boolean(profile),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const rows = data ?? [];

  useEffect(() => {
    void fetchDoctors().then(setDoctors).catch(() => undefined);
  }, []);

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "admin-appointments"] });
    };
    window.addEventListener(LOCAL_BOOKING_EVENT, refresh);
    window.addEventListener("storage", refresh);
    const channel = supabase
      .channel("admin-appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener(LOCAL_BOOKING_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const specialties = useMemo(
    () => Array.from(new Set(doctors.map((d) => d.specialty))).sort(),
    [doctors],
  );
  const campuses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.campus).concat(["Fairmont Ridge", "Alder Bay"]))).sort(),
    [rows],
  );

  const unassigned = rows.filter(isUnassignedAppointment);

  function draftFor(id: string): AssignDraft {
    return (
      assignDraft[id] ?? {
        doctorId: "",
        appointmentDate: "",
        appointmentTime: "",
      }
    );
  }

  function patchDraft(id: string, patch: Partial<AssignDraft>) {
    setAssignDraft((prev) => ({
      ...prev,
      [id]: { ...draftFor(id), ...patch },
    }));
  }

  async function assign(row: AppointmentRow) {
    const draft = draftFor(row.id);
    if (!draft.doctorId || !draft.appointmentDate || !draft.appointmentTime) {
      setAssignError("Doctor, appointment date, and appointment time are all required.");
      return;
    }
    setAssigning(row.id);
    setAssignError(null);
    setAssignNotice(null);
    setEmailWarning(null);
    try {
      const result = await assignAppointmentDoctor(row.id, draft.doctorId, row.patient_id, {
        appointmentDate: draft.appointmentDate,
        appointmentTime: draft.appointmentTime,
      });
      setAssignNotice(
        `Assigned and confirmed for ${formatConfirmedSlot(draft.appointmentDate, draft.appointmentTime)}.`,
      );
      if (!result.emailOk) {
        setEmailWarning(
          "Assignment saved, but the confirmation email failed to send. Follow up with the patient manually.",
        );
      }
      setAssignDraft((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      await refetch();
    } catch (e: unknown) {
      setAssignError(e instanceof Error ? e.message : "Could not assign doctor");
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Appointment pipeline</h2>
        <p className="text-sm text-muted-foreground">
          Pending intake → navigator-matched → confirmed → completed. Unassigned requests stay visible until
          a physician is matched with a confirmed date and time.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-card md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Doctor</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="All doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All doctors</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Specialty</Label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger>
              <SelectValue placeholder="All specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specialties</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Campus</Label>
          <Select value={campus} onValueChange={setCampus}>
            <SelectTrigger>
              <SelectValue placeholder="All campuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campuses</SelectItem>
              {campuses.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      ) : null}
      {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
      {assignNotice ? <p className="text-sm text-muted-foreground">{assignNotice}</p> : null}
      {emailWarning ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {emailWarning}
        </p>
      ) : null}
      {isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading appointments…</p>
      ) : null}

      <section className="rounded-lg border border-gold/50 bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-2 text-primary-foreground">
          <h3 className="text-sm font-medium">Unassigned / Needs Matching</h3>
          <Badge className="bg-gold text-gold-foreground hover:bg-gold">{unassigned.length}</Badge>
        </div>
        <div className="space-y-2 p-3">
          {unassigned.length === 0 ? (
            <p className="text-xs text-muted-foreground">No unmatched requests.</p>
          ) : (
            unassigned.map((a) => {
              const draft = draftFor(a.id);
              const canConfirm = Boolean(
                draft.doctorId && draft.appointmentDate && draft.appointmentTime,
              );
              return (
                <article key={a.id} className="rounded-md border border-gold/30 bg-surface p-3 text-sm shadow-card">
                  <p className="font-medium text-primary">{a.patients?.full_name ?? "Patient"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.preferred_specialty || "No specialty selected"} ·{" "}
                    {visitPreferenceLabel(a.visit_preference, a.campus, a.visit_type)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested {formatDateTime(a.datetime)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.reason_for_visit}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Doctor</Label>
                      <Select
                        value={draft.doctorId}
                        onValueChange={(value) => patchDraft(a.id, { doctorId: value })}
                      >
                        <SelectTrigger className="h-9 bg-card">
                          <SelectValue placeholder="Assign a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Appointment date</Label>
                      <Input
                        type="date"
                        className="h-9 bg-card"
                        value={draft.appointmentDate}
                        onChange={(e) => patchDraft(a.id, { appointmentDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Appointment time</Label>
                      <Input
                        type="time"
                        className="h-9 bg-card"
                        value={draft.appointmentTime}
                        onChange={(e) => patchDraft(a.id, { appointmentTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="pill"
                      variant="gold"
                      disabled={!canConfirm || assigning === a.id}
                      onClick={() => void assign(a)}
                    >
                      {assigning === a.id ? "Confirming…" : "Confirm assignment"}
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const items = rows.filter((r) => coercePipelineStage(r) === stage.key);
          return (
            <div key={stage.key} className="rounded-lg border border-border bg-surface shadow-card">
              <div className="flex items-center justify-between border-b border-border bg-primary px-3 py-2 text-primary-foreground">
                <h3 className="text-sm font-medium">{stage.label}</h3>
                <Badge className="bg-gold text-gold-foreground hover:bg-gold">{items.length}</Badge>
              </div>
              <div className="space-y-2 p-3">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No appointments</p>
                ) : (
                  items.map((a) => (
                    <article key={a.id} className="rounded-md border border-border bg-card p-3 text-sm shadow-card">
                      <p className="font-medium text-primary">{a.patients?.full_name ?? "Patient"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isUnassignedAppointment(a) ? "Unassigned" : (a.doctors?.name ?? "Unassigned")}
                      </p>
                      <p className="mt-1 text-xs font-medium text-primary">
                        {a.appointment_date && a.appointment_time
                          ? `Confirmed ${formatConfirmedSlot(a.appointment_date, a.appointment_time)}`
                          : `Requested ${formatDateTime(a.datetime)}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{a.reason_for_visit}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="outline">{a.campus}</Badge>
                        <Badge variant="secondary">
                          {visitPreferenceLabel(a.visit_preference, a.campus, a.visit_type)}
                        </Badge>
                        <Badge variant="outline">{a.status}</Badge>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
