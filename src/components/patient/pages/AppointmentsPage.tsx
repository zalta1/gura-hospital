import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageGate, EmptyState, StatusChip } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlotPicker } from "@/components/portal/SlotPicker";
import { doctorName } from "@/lib/patient-portal/data";
import { downloadIcs } from "@/lib/patient-portal/files";
import { formatDateTime } from "@/lib/portal/format";
import type { PortalAppointment } from "@/lib/patient-portal/types";

export function AppointmentsPage() {
  return (
    <PageGate>
      <AppointmentsBody />
    </PageGate>
  );
}

function AppointmentsBody() {
  const snapshot = useSnapshot();
  const { cancelAppointment, rescheduleAppointment } = usePatientPortal();
  const [selected, setSelected] = useState<PortalAppointment | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<PortalAppointment | null>(null);
  const [when, setWhen] = useState("");

  const groups = {
    upcoming: snapshot.appointments.filter((row) => row.status === "pending" || row.status === "confirmed"),
    past: snapshot.appointments.filter((row) => row.status === "completed"),
    cancelled: snapshot.appointments.filter((row) => row.status === "cancelled"),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Pending requests await the doctor’s confirmation.</p>
        <Button asChild variant="gold" size="sm">
          <Link to="/book-appointment">Book new appointment</Link>
        </Button>
      </div>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        {(Object.keys(groups) as Array<keyof typeof groups>).map((key) => (
          <TabsContent key={key} value={key}>
            <section className="border border-border bg-card shadow-card">
              {groups[key].length === 0 ? (
                <EmptyState title="Nothing in this list" body="Visits you book or cancel will show up here." />
              ) : (
                <ul className="divide-y divide-border">
                  {groups[key]
                    .slice()
                    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
                    .map((row) => (
                      <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                        <div>
                          <p className="font-medium text-primary">{doctorName(snapshot, row.doctorId)}</p>
                          <p className="text-sm text-muted-foreground">{row.reason}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.timeLabel ?? formatDateTime(row.datetime)} · {row.mode === "telehealth" ? "Telehealth" : "In person"} · {row.location}
                          </p>
                          <div className="mt-2">
                            <StatusChip value={row.status} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => setSelected(row)}>
                            View details
                          </Button>
                          {key === "upcoming" ? (
                            <>
                              <Button type="button" size="sm" variant="outlineNavy" onClick={() => { setReschedule(row); setWhen(""); }}>
                                Reschedule
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setCancelId(row.id)}>
                                Cancel
                              </Button>
                            </>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              downloadIcs(
                                `${row.reason} — ${doctorName(snapshot, row.doctorId)}`,
                                new Date(row.datetime),
                                row.location,
                              )
                            }
                          >
                            Add to calendar
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-primary">{selected.reason}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p>{doctorName(snapshot, selected.doctorId)}</p>
                <p className="text-muted-foreground">{selected.timeLabel ?? formatDateTime(selected.datetime)}</p>
                <p className="text-muted-foreground">
                  {selected.mode === "telehealth" ? "Telehealth" : "In person"} · {selected.location}
                </p>
                <StatusChip value={selected.status} />
                {selected.status === "pending" ? (
                  <p className="text-muted-foreground">This request is waiting for your doctor to confirm the time.</p>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reschedule)} onOpenChange={(open) => !open && setReschedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-primary">Reschedule</DialogTitle>
          </DialogHeader>
          {reschedule ? (
            <SlotPicker
              doctorId={reschedule.doctorId}
              visit={reschedule.mode === "telehealth" ? "telehealth" : "in-person"}
              selectedStartsAt={when || null}
              onSelect={(slot) => setWhen(slot.startsAt)}
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="gold"
              disabled={!when || !reschedule}
              onClick={() => {
                if (!reschedule || !when) return;
                void rescheduleAppointment(reschedule.id, when)
                  .then(() => setReschedule(null))
                  .catch(() => undefined);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(cancelId)} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this visit?</AlertDialogTitle>
            <AlertDialogDescription>Cancelling returns this time so another patient can book it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep visit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelId) cancelAppointment(cancelId);
                setCancelId(null);
              }}
            >
              Cancel visit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
