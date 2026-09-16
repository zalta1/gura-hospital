import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/lib/portal/auth";
import {
  fetchPatientTimeline,
  saveFollowup,
  saveMedicationPlan,
  saveReminder,
  syncReminderJob,
} from "@/lib/portal/queries";
import type { Database } from "@/integrations/supabase/types";
import type { ReminderJob } from "@/lib/twilio/reminder-job-types";

export const Route = createFileRoute("/doctor/patients/$patientId/medications")({
  component: MedicationsPage,
});

type Channel = Database["public"]["Enums"]["reminder_channel"];

function formatJobMessage(job: ReminderJob): string {
  const when = new Date(job.runAt).toLocaleString();
  if (job.status === "scheduled" || job.status === "running") {
    return `${job.channel === "cold_call" ? "Cold call" : "SMS"} scheduled for ${when}. Keep the dev server running — it will fire at that time.`;
  }
  if (job.status === "sent") {
    return `${job.channel === "cold_call" ? "Cold call" : "SMS"} completed at ${when}. Twilio SID ${job.sid} (${job.twilioStatus}).`;
  }
  return `${job.channel === "cold_call" ? "Cold call" : "SMS"} failed: ${job.error ?? "unknown error"}`;
}

function MedicationsPage() {
  const { patientId } = Route.useParams();
  const { doctorId } = useAuth();
  const [patientName, setPatientName] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [drug, setDrug] = useState("");
  const [dose, setDose] = useState("");
  const [schedule, setSchedule] = useState("");
  const [duration, setDuration] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [channel, setChannel] = useState<Channel>("cold_call");
  const [approveSend, setApproveSend] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchingReminderId, setWatchingReminderId] = useState<string | null>(null);
  const watchRef = useRef<string | null>(null);

  useEffect(() => {
    void fetchPatientTimeline(patientId)
      .then((d) => {
        setPatientName(d.patient.full_name);
        if (d.medications[0]) setPlanId(d.medications[0].id);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [patientId]);

  useEffect(() => {
    watchRef.current = watchingReminderId;
    if (!watchingReminderId) return;

    const tick = async () => {
      const id = watchRef.current;
      if (!id) return;
      try {
        const synced = await syncReminderJob(id);
        if (!synced?.outbound?.job) return;
        const job = synced.outbound.job;
        setMessage(formatJobMessage(job));
        if (job.status === "sent" || job.status === "failed") {
          if (job.status === "failed") {
            setError(job.error ?? "Outbound reminder failed.");
          }
          setWatchingReminderId(null);
        }
      } catch {
        // Keep polling; transient network blips are fine.
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 5_000);
    return () => window.clearInterval(timer);
  }, [watchingReminderId]);

  async function createPlan() {
    if (!doctorId) return setError("No doctor profile linked.");
    try {
      const plan = await saveMedicationPlan({
        patient_id: patientId,
        doctor_id: doctorId,
        drug_name: drug,
        dose,
        schedule,
        duration: duration || null,
      });
      setPlanId(plan.id);
      setMessage("Medication plan saved. Reminders are not sent until you approve them.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save plan");
    }
  }

  async function createReminder() {
    if (!planId) return setError("Create a medication plan first.");
    if (!remindAt) return setError("Choose a reminder date/time.");
    setError(null);
    setMessage(null);
    try {
      const saved = await saveReminder({
        patient_id: patientId,
        medication_plan_id: planId,
        scheduled_time: new Date(remindAt).toISOString(),
        channel,
        status: "pending",
        approved_to_send: approveSend,
      });
      const outbound = "outbound" in saved ? saved.outbound : undefined;
      if ((channel === "sms" || channel === "cold_call") && approveSend && outbound?.job) {
        const job = outbound.job;
        setMessage(formatJobMessage(job));
        if (job.status === "failed") {
          setError(job.error ?? "Outbound reminder failed.");
        } else if (job.status === "scheduled" || job.status === "running") {
          setWatchingReminderId(saved.id);
        }
        return;
      }
      setMessage(
        approveSend
          ? `Reminder saved and approved (${channel}). WhatsApp / app channels are not wired yet.`
          : "Reminder saved as pending — not approved to send yet.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save reminder");
    }
  }

  async function createFollowup() {
    if (!doctorId) return setError("No doctor profile linked.");
    if (!followUpDate) return setError("Choose a follow-up date.");
    try {
      await saveFollowup({
        patient_id: patientId,
        doctor_id: doctorId,
        follow_up_date: new Date(followUpDate).toISOString(),
        status: "scheduled",
        summary_json: {},
      });
      setMessage("AI follow-up scheduled with status “scheduled”.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule follow-up");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-primary">Medication & AI follow-up</h2>
          <p className="text-sm text-muted-foreground">{patientName || "Patient"}</p>
        </div>
        <Button asChild variant="outlineNavy" size="pill">
          <Link to="/doctor/patients/$patientId" params={{ patientId }}>
            Back to record
          </Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <section className="rounded-lg border border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-lg text-primary">Medication plan builder</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Drug name</Label>
            <Input value={drug} onChange={(e) => setDrug(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Dose</Label>
            <Input value={dose} onChange={(e) => setDose(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Schedule</Label>
            <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </div>
        </div>
        <Button className="mt-4" variant="gold" size="pill" onClick={() => void createPlan()}>
          Save medication plan
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-lg text-primary">AI reminder setup</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          With Approve checked, SMS / cold call fire at the date &amp; time you set (not immediately).
          Keep <code>npm run dev</code> running so the scheduler can place the call. Destination is{" "}
          <code>TWILIO_TEST_TO</code>.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Date & time</Label>
            <Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cold_call">Cold call</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="app">Gura app</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={approveSend}
            onChange={(e) => setApproveSend(e.target.checked)}
          />
          Approve to send (explicit clinician action)
        </label>
        <Button className="mt-4" variant="outlineNavy" size="pill" onClick={() => void createReminder()}>
          Save reminder
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-lg text-primary">AI follow-up setup</h3>
        <div className="mt-4 max-w-sm space-y-1.5">
          <Label>Follow-up date</Label>
          <Input
            type="datetime-local"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>
        <Button className="mt-4" size="pill" onClick={() => void createFollowup()}>
          Schedule follow-up
        </Button>
      </section>
    </div>
  );
}
