import { useState } from "react";
import { PageGate, DualTrend, Panel, Sparkline } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ageFromDob, doctorName } from "@/lib/patient-portal/data";
import { downloadDemoPdf } from "@/lib/patient-portal/files";
import { formatDate } from "@/lib/portal/format";

export function RecordPage() {
  return (
    <PageGate>
      <RecordBody />
    </PageGate>
  );
}

function RecordBody() {
  const snapshot = useSnapshot();
  const { requestCorrection, state } = usePatientPortal();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const patient = snapshot.patient;
  const hr = snapshot.vitals.map((point) => point.hr);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Read-only chart for {patient.fullName}.</p>
        <Button type="button" variant="outlineNavy" size="sm" onClick={() => setOpen(true)}>
          Request a correction
        </Button>
      </div>
      {state.correctionNote ? (
        <p className="text-sm text-muted-foreground">Your last correction request is saved on this device.</p>
      ) : null}
      <Tabs defaultValue="personal">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="personal">Personal details</TabsTrigger>
          <TabsTrigger value="allergies">Allergies</TabsTrigger>
          <TabsTrigger value="conditions">Conditions and history</TabsTrigger>
          <TabsTrigger value="vitals">Vitals trend</TabsTrigger>
          <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
          <TabsTrigger value="visits">Visit summaries</TabsTrigger>
          <TabsTrigger value="notes">Care team notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <Panel title="Personal details">
            <dl className="grid gap-3 px-4 py-4 sm:grid-cols-2">
              <Item label="Name" value={patient.fullName} />
              <Item label="Age" value={`${ageFromDob(patient.dob)} (${formatDate(patient.dob)})`} />
              <Item label="Sex" value={patient.sex} />
              <Item label="MRN" value={patient.mrn} />
              <Item label="Email" value={patient.email} />
              <Item label="Phone" value={patient.phone} />
              <Item label="Address" value={patient.address} />
              <Item label="Pharmacy" value={patient.pharmacy} />
              <Item label="Insurance" value={patient.insurance.payer} />
              <Item
                label="Emergency contact"
                value={`${patient.emergencyContact.name}, ${patient.emergencyContact.relation}, ${patient.emergencyContact.phone}`}
              />
            </dl>
          </Panel>
        </TabsContent>
        <TabsContent value="allergies">
          <Panel title="Allergies">
            {patient.allergies.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No allergies on file.</p>
            ) : (
              <ul className="divide-y divide-border">
                {patient.allergies.map((item) => (
                  <li key={item.substance} className="px-4 py-3 text-sm">
                    <span className="font-medium text-primary">{item.substance}</span>
                    <span className="text-muted-foreground"> — {item.reaction}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="conditions">
          <Panel title="Conditions and history">
            <ul className="list-disc space-y-1 px-8 py-4 text-sm">
              {patient.conditions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground">{patient.history}</p>
          </Panel>
        </TabsContent>
        <TabsContent value="vitals">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Blood pressure">
              <div className="px-4 py-4">
                <DualTrend
                  systolic={snapshot.vitals.map((point) => point.systolic)}
                  diastolic={snapshot.vitals.map((point) => point.diastolic)}
                  label="Blood pressure trend, systolic in navy and diastolic in gold"
                />
                <p className="mt-2 text-xs text-muted-foreground">Navy is systolic. Gold is diastolic. Readings from the Holter period.</p>
              </div>
            </Panel>
            <Panel title="Resting heart rate">
              <div className="px-4 py-4">
                <Sparkline values={hr} label="Resting heart rate trend" />
                <p className="mt-2 text-sm text-muted-foreground">Latest resting rate {hr[hr.length - 1]} bpm.</p>
              </div>
            </Panel>
          </div>
        </TabsContent>
        <TabsContent value="immunizations">
          <Panel title="Immunizations">
            <ul className="divide-y divide-border">
              {patient.immunizations.map((item) => (
                <li key={item.name} className="px-4 py-3 text-sm">
                  <p className="font-medium text-primary">{item.name}</p>
                  <p className="text-muted-foreground">
                    {formatDate(item.date)} · {item.site}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="visits">
          <Panel title="Visit summaries">
            <ul className="divide-y divide-border">
              {snapshot.visitSummaries.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-primary">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.date)} · {doctorName(snapshot, item.doctorId)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="notes">
          <Panel title="Care team notes shared with you">
            <ul className="divide-y divide-border">
              {snapshot.careNotes.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.date)} · {item.author}
                  </p>
                  <p className="mt-1 text-sm">{item.note}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="documents">
          <Panel title="Documents">
            <ul className="divide-y divide-border">
              {snapshot.documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-primary">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(doc.date)} · Demo PDF</p>
                  </div>
                  <Button
                    type="button"
                    variant="outlineNavy"
                    size="sm"
                    onClick={() => downloadDemoPdf(doc.title, doc.title, doc.lines)}
                  >
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-primary">Request a correction</DialogTitle>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What should we correct?"
            aria-label="Correction details"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="gold"
              disabled={note.trim().length < 3}
              onClick={() => {
                requestCorrection(note.trim());
                setOpen(false);
                setNote("");
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-primary">{value}</dd>
    </div>
  );
}
