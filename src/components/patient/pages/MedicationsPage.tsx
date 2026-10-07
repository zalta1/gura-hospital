import { useState } from "react";
import { PageGate, EmptyState } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { doctorName, doseKey } from "@/lib/patient-portal/data";

export function MedicationsPage() {
  return (
    <PageGate>
      <MedicationsBody />
    </PageGate>
  );
}

function MedicationsBody() {
  const snapshot = useSnapshot();
  const { state, markDoseTaken, requestRefill } = usePatientPortal();
  const [refillId, setRefillId] = useState<string | null>(null);
  const active = snapshot.medications.filter((item) => item.active);
  const past = snapshot.medications.filter((item) => !item.active);
  const taken = active.filter((item) => state.takenDoseKeys.includes(doseKey(item.id))).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Today’s adherence: {taken} of {active.length} doses marked taken.
      </p>
      {active.length === 0 ? (
        <EmptyState title="No active medications" body="Prescriptions your doctors share will be listed here." />
      ) : (
        <ul className="space-y-3">
          {active.map((med) => {
            const key = doseKey(med.id);
            const isTaken = state.takenDoseKeys.includes(key);
            const pending = state.refillPendingIds.includes(med.id);
            return (
              <li key={med.id} className="border border-border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-primary">
                      {med.name} · {med.dose}
                    </p>
                    <p className="text-sm text-muted-foreground">{med.schedule}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {doctorName(snapshot, med.doctorId)} · {med.refillsRemaining} refills left · Next dose {med.nextDoseLabel}
                    </p>
                    {pending ? <p className="mt-2 text-xs font-medium text-primary">Refill pending</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isTaken ? "gold" : "outlineNavy"}
                      aria-pressed={isTaken}
                      onClick={() => markDoseTaken(med.id, key, !isTaken)}
                    >
                      {isTaken ? "Taken" : "Mark as taken"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setRefillId(med.id)}>
                      Request refill
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Past or discontinued</h2>
        </div>
        {past.length === 0 ? (
          <EmptyState title="None on file" body="Stopped medications will be listed here." />
        ) : (
          <ul className="divide-y divide-border">
            {past.map((med) => (
              <li key={med.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-primary">
                  {med.name} · {med.dose}
                </p>
                <p className="text-muted-foreground">{med.discontinuedReason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(refillId)} onOpenChange={(open) => !open && setRefillId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-primary">Request a refill?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">The pharmacy demo queue will show this as pending. No prescription is sent.</p>
          <DialogFooter>
            <Button
              type="button"
              variant="gold"
              onClick={() => {
                if (refillId) requestRefill(refillId);
                setRefillId(null);
              }}
            >
              Confirm request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
