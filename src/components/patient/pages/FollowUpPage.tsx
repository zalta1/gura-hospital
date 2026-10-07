import { useState } from "react";
import { PageGate, EmptyState, StatusChip } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { RED_FLAG_SYMPTOMS, SYMPTOM_OPTIONS } from "@/lib/patient-portal/demoPatientMorgan";
import { formatDate } from "@/lib/portal/format";

export function FollowUpPage() {
  return (
    <PageGate>
      <FollowUpBody />
    </PageGate>
  );
}

function FollowUpBody() {
  const snapshot = useSnapshot();
  const { submitFollowUp, state } = usePatientPortal();
  const due = snapshot.checkIns.find((item) => item.status === "due");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [adherence, setAdherence] = useState("Taken as prescribed");
  const [comfort, setComfort] = useState(7);
  const [notes, setNotes] = useState("");
  const redFlag = symptoms.some((item) => RED_FLAG_SYMPTOMS.includes(item));
  const saved = due ? state.followUpAnswers[due.id] : undefined;

  function toggle(symptom: string) {
    setSymptoms((current) => {
      if (symptom === "None of these") return current.includes(symptom) ? [] : ["None of these"];
      const next = current.filter((item) => item !== "None of these");
      return next.includes(symptom) ? next.filter((item) => item !== symptom) : [...next, symptom];
    });
  }

  return (
    <div className="space-y-6">
      <p className="border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-card">
        AI messages are drafts reviewed by your care team. This is not a substitute for emergency care.
      </p>
      <ol className="space-y-3">
        {snapshot.checkIns.map((item) => {
          const answer = state.followUpAnswers[item.id];
          return (
          <li key={item.id} className="border border-border bg-card px-4 py-3 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gold">{item.dayLabel}</p>
                <p className="font-medium text-primary">{item.label}</p>
                <p className="text-xs text-muted-foreground">{formatDate(item.dueDate)}</p>
              </div>
              <StatusChip value={item.status === "due" ? "pending" : item.status === "completed" ? "completed" : "confirmed"} label={item.status === "due" ? "due now" : item.status} />
            </div>
            {answer ? (
              <p className="mt-2 text-sm text-muted-foreground">Shared with Dr. Velloso for review.</p>
            ) : item.summary ? (
              <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
            ) : null}
          </li>
          );
        })}
      </ol>

      {due && !saved ? (
        <form
          className="space-y-4 border border-border bg-card p-4 shadow-card"
          onSubmit={(event) => {
            event.preventDefault();
            if (redFlag) return;
            submitFollowUp(due.id, {
              symptoms,
              adherence,
              comfort,
              notes,
              sharedAt: new Date().toISOString(),
            });
          }}
        >
          <h2 className="font-display text-xl text-primary">Due now</h2>
          <fieldset>
            <legend className="text-sm font-medium">Symptoms since the last check-in</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {SYMPTOM_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={symptoms.includes(option)} onChange={() => toggle(option)} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
          {redFlag ? (
            <div className="border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive" role="alert">
              Chest pain or fainting needs urgent care. Call 911 or the care team at (555) 210-0000. This check-in will not continue.
            </div>
          ) : (
            <>
              <fieldset>
                <legend className="text-sm font-medium">Medication adherence</legend>
                <div className="mt-2 space-y-1 text-sm">
                  {["Taken as prescribed", "Missed some doses", "Not taking them"].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input type="radio" name="adherence" checked={adherence === option} onChange={() => setAdherence(option)} />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="comfort" className="text-sm font-medium">
                  Comfort, 1 to 10: {comfort}
                </label>
                <Slider id="comfort" className="mt-3" min={1} max={10} step={1} value={[comfort]} onValueChange={(value) => setComfort(value[0] ?? 1)} />
              </div>
              <div>
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </label>
                <Textarea id="notes" className="mt-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
              <Button type="submit" variant="gold" disabled={symptoms.length === 0}>
                Submit check-in
              </Button>
            </>
          )}
        </form>
      ) : null}

      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Past follow-up summaries</h2>
        </div>
        {snapshot.pastFollowUps.length === 0 ? (
          <EmptyState title="No past follow-ups" body="Completed plans will be summarized here." />
        ) : (
          <ul className="divide-y divide-border">
            {snapshot.pastFollowUps.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium text-primary">{item.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
