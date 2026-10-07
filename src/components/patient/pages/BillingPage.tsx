import { useState } from "react";
import { PageGate, EmptyState, StatusChip } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/patient-portal/data";
import { downloadDemoPdf } from "@/lib/patient-portal/files";
import { formatDate } from "@/lib/portal/format";

export function BillingPage() {
  return (
    <PageGate>
      <BillingBody />
    </PageGate>
  );
}

function BillingBody() {
  const snapshot = useSnapshot();
  const { payStatement } = usePatientPortal();
  const insurance = snapshot.patient.insurance;
  const [revealed, setRevealed] = useState(false);
  const [payId, setPayId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const paying = snapshot.statements.find((row) => row.id === payId) ?? null;
  const masked = `•••• •••• ${insurance.memberId.slice(-4)}`;

  return (
    <div className="space-y-6">
      <section className="border border-border bg-primary p-5 text-primary-foreground shadow-card">
        <p className="text-[10px] uppercase tracking-[0.16em] text-gold">{insurance.payer}</p>
        <h2 className="mt-1 font-display text-2xl">{snapshot.patient.fullName}</h2>
        <p className="mt-3 text-sm">{insurance.planType}</p>
        <p className="mt-2 text-sm">
          Member ID: {revealed ? insurance.memberId : masked}
          <button type="button" className="ml-3 text-gold underline-offset-2 hover:underline" onClick={() => setRevealed((value) => !value)}>
            {revealed ? "Hide" : "Reveal"}
          </button>
        </p>
        <p className="text-sm">Group {insurance.groupNumber}</p>
      </section>

      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Statements</h2>
        </div>
        {snapshot.statements.length === 0 ? (
          <EmptyState title="No statements" body="Bills for your visits will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Billed</th>
                  <th className="px-4 py-2 font-medium">Insurance paid</th>
                  <th className="px-4 py-2 font-medium">You owe</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {snapshot.statements.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">{row.service}</td>
                    <td className="px-4 py-3">{money(row.billed)}</td>
                    <td className="px-4 py-3">{money(row.insurancePaid)}</td>
                    <td className="px-4 py-3">{money(row.patientBalance)}</td>
                    <td className="px-4 py-3">
                      <StatusChip value={row.status} label={row.status === "in_review" ? "in review" : row.status} />
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "due" ? (
                        <Button type="button" size="sm" variant="gold" onClick={() => { setPayId(row.id); setDone(false); }}>
                          Pay now
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Estimates and explanations of benefits</h2>
        </div>
        <ul className="divide-y divide-border">
          {snapshot.estimates.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-primary">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(doc.date)}</p>
              </div>
              <Button type="button" size="sm" variant="outlineNavy" onClick={() => downloadDemoPdf(doc.title, doc.title, doc.lines)}>
                Download
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={Boolean(paying)} onOpenChange={(open) => !open && setPayId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-primary">{done ? "Payment recorded" : "Pay now"}</DialogTitle>
          </DialogHeader>
          {done ? (
            <p className="text-sm text-muted-foreground">Demo payment, no real charge. Your statement is marked paid on this device.</p>
          ) : paying ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                payStatement(paying.id);
                setDone(true);
              }}
            >
              <p className="text-xs uppercase tracking-wide text-gold">Demo payment, no real charge</p>
              <div>
                <Label htmlFor="payer-name">Name</Label>
                <Input id="payer-name" defaultValue={snapshot.patient.fullName} />
              </div>
              <div>
                <Label htmlFor="demo-token">Demo payment token</Label>
                <Input id="demo-token" defaultValue="DEMO-NOT-A-CARD" readOnly />
              </div>
              <p className="text-sm">Amount {money(paying.patientBalance)}</p>
              <DialogFooter>
                <Button type="submit" variant="gold">
                  Submit demo payment
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
