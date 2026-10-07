import { useState } from "react";
import { PageGate, EmptyState, Sparkline, StatusChip } from "@/components/patient/ui";
import { useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { doctorName } from "@/lib/patient-portal/data";
import { downloadDemoPdf } from "@/lib/patient-portal/files";
import { formatDate } from "@/lib/portal/format";
import type { LabResult } from "@/lib/patient-portal/types";

export function ResultsPage() {
  return (
    <PageGate>
      <ResultsBody />
    </PageGate>
  );
}

function ResultsBody() {
  const snapshot = useSnapshot();
  const [openLab, setOpenLab] = useState<LabResult | null>(null);

  return (
    <div className="space-y-6">
      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Lab results</h2>
        </div>
        {snapshot.labs.length === 0 ? (
          <EmptyState title="No lab results" body="Released panels will appear in this table." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Panel</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Doctor</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Flag</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.labs.map((lab) => (
                  <tr key={lab.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setOpenLab(lab)}>
                        {lab.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">{formatDate(lab.date)}</td>
                    <td className="px-4 py-3">{doctorName(snapshot, lab.doctorId)}</td>
                    <td className="px-4 py-3">
                      <StatusChip value={lab.release} label={lab.release === "released" ? "Released by your doctor" : "Pending doctor review"} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip value={lab.flag} />
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
          <h2 className="nav-label">Imaging</h2>
        </div>
        {snapshot.imaging.length === 0 ? (
          <EmptyState title="No imaging studies" body="Reports your doctor releases will be listed here." />
        ) : (
          <ul className="divide-y divide-border">
            {snapshot.imaging.map((study) => (
              <li key={study.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-medium text-primary">{study.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(study.date)} · {study.facility}
                  </p>
                  <div className="mt-2">
                    <StatusChip value={study.release} label={study.release === "released" ? "Released by your doctor" : "Pending doctor review"} />
                  </div>
                  {study.release === "released" ? <p className="mt-2 text-sm text-muted-foreground">{study.summary}</p> : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outlineNavy"
                  onClick={() =>
                    downloadDemoPdf(study.name, study.name, [
                      `Date: ${study.date}`,
                      study.facility,
                      study.release === "released" ? study.summary : "Pending doctor review.",
                    ])
                  }
                >
                  Report available
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(openLab)} onOpenChange={(open) => !open && setOpenLab(null)}>
        <DialogContent className="max-h-[80vh] overflow-auto">
          {openLab ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-primary">{openLab.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{openLab.explanation}</p>
              {openLab.release === "pending_review" ? (
                <p className="text-sm">Pending doctor review. Values appear after your doctor releases them.</p>
              ) : (
                <ul className="space-y-3">
                  {openLab.values.map((value) => (
                    <li key={value.name} className="border border-border px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{value.name}</p>
                        <StatusChip value={value.flag} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {value.value} {value.unit} · range {value.range}
                      </p>
                      <Sparkline values={value.trend} label={`${value.name} trend`} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
