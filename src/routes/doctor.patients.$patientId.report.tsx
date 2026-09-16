import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Json } from "@/integrations/supabase/types";
import { draftClinicalReport } from "@/lib/portal/ai-draft";
import { useAuth } from "@/lib/portal/auth";
import { approveReport, fetchPatientTimeline, saveReport } from "@/lib/portal/queries";

export const Route = createFileRoute("/doctor/patients/$patientId/report")({
  head: () => ({
    meta: [{ title: "Write report | Gura Hospital" }],
  }),
  component: WriteReport,
});

function parseVitals(text: string): Json {
  try {
    return JSON.parse(text) as Json;
  } catch {
    return { raw: text };
  }
}

function WriteReport() {
  const { patientId } = Route.useParams();
  const { doctorId } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", "patient", patientId],
    queryFn: () => fetchPatientTimeline(patientId),
  });

  const latest = data?.reports[0];
  const latestAppointment = data?.appointments[0];
  const [reportId, setReportId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [vitals, setVitals] = useState("");
  const [aiDrafted, setAiDrafted] = useState(false);
  const [approved, setApproved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!latest || hydrated) return;
    setReportId(latest.id);
    setDiagnosis(latest.diagnosis ?? "");
    setNotes(latest.notes ?? "");
    setVitals(JSON.stringify(latest.vitals, null, 2));
    setAiDrafted(latest.ai_drafted);
    setApproved(latest.approved_by_doctor);
    setHydrated(true);
  }, [latest, hydrated]);

  const save = useMutation({
    mutationFn: async () => {
      if (!doctorId) throw new Error("No physician record is linked to this account.");
      const payload = {
        patient_id: patientId,
        doctor_id: doctorId,
        diagnosis,
        notes,
        vitals: parseVitals(vitals),
        ai_drafted: aiDrafted,
      };
      const withOptional = reportId ? { ...payload, id: reportId } : payload;
      const withAppt =
        latestAppointment && !reportId
          ? { ...withOptional, appointment_id: latestAppointment.id }
          : withOptional;
      return saveReport(withAppt);
    },
    onSuccess: (row) => {
      if (row?.id) setReportId(row.id);
      setApproved(false);
      void queryClient.invalidateQueries({ queryKey: ["portal", "patient", patientId] });
    },
  });

  const approve = useMutation({
    mutationFn: async () => {
      let id = reportId;
      if (!id) {
        const saved = await save.mutateAsync();
        id = saved?.id ?? null;
      }
      if (!id) throw new Error("Save the report before approving.");
      return approveReport(id);
    },
    onSuccess: () => {
      setApproved(true);
      void queryClient.invalidateQueries({ queryKey: ["portal", "patient", patientId] });
    },
  });

  function applyDraft() {
    const draft = draftClinicalReport({
      patientName: data?.patient?.full_name ?? "Patient",
      reason: latestAppointment?.reason_for_visit ?? "",
      visitType: latestAppointment?.visit_type ?? "in_person",
    });
    setDiagnosis(draft.diagnosis);
    setNotes(draft.notes);
    setVitals(draft.vitals);
    setAiDrafted(true);
    setApproved(false);
  }

  return (
    <section className="border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <h2 className="font-display text-lg">Clinical report</h2>
        {approved ? <Badge variant="secondary">Approved by doctor</Badge> : <Badge variant="outline">Draft</Badge>}
      </div>
      <div className="space-y-4 p-4 md:p-6">
        <p className="rounded-md bg-surface px-3 py-2 text-sm text-muted-foreground">
          AI drafts are a first pass for you to edit. They are not sent to patients. Approval is a separate
          action and is the only way <code>approved_by_doctor</code> is set.
        </p>
        {error ? (
          <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Unable to load report."}</p>
        ) : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading report…</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="pill" variant="outlineNavy" onClick={applyDraft}>
            Insert AI draft
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <Textarea id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={10} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vitals">Vitals (JSON)</Label>
          <Textarea id="vitals" value={vitals} onChange={(e) => setVitals(e.target.value)} rows={8} className="font-mono text-xs" />
        </div>
        {save.isError ? (
          <p className="text-sm text-destructive">{save.error instanceof Error ? save.error.message : "Save failed."}</p>
        ) : null}
        {approve.isError ? (
          <p className="text-sm text-destructive">
            {approve.error instanceof Error ? approve.error.message : "Approve failed."}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            size="pill"
            variant="outlineNavy"
            disabled={save.isPending || !doctorId}
            onClick={() => save.mutate()}
          >
            Save draft
          </Button>
          <Button
            size="pill"
            variant="gold"
            disabled={approve.isPending || !doctorId}
            onClick={() => approve.mutate()}
          >
            Approve
          </Button>
        </div>
      </div>
    </section>
  );
}
