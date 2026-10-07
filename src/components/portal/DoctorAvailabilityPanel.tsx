import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AvailabilityError,
  WEEKDAY_LABELS,
  addCalendarDays,
  formatHospitalDateTime,
  formatHospitalTime,
  hospitalLocalToUtc,
  hospitalToday,
  type AffectedAppointment,
  type DoctorSlotView,
  type VisitType,
  type WindowDraft,
} from "@/lib/portal/availability";
import {
  fetchDoctorDay,
  fetchOwnBlocks,
  fetchOwnWindows,
  removeAvailabilityBlock,
  removeAvailabilityWindow,
  saveAvailabilityBlock,
  saveAvailabilityWindow,
  saveAvailabilityWindows,
} from "@/lib/portal/availability-api";
import { AVAILABILITY_EVENT } from "@/lib/portal/availability-store";
import { LOCAL_BOOKING_EVENT } from "@/lib/portal/local-store";
import { cn } from "@/lib/utils";

const WEEKDAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function clockLabel(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(Date.UTC(2026, 0, 1, Number(match[1]), Number(match[2]))));
}

function civilLabel(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)));
}

export function DoctorAvailabilityPanel({ doctorId }: { doctorId: string }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [visitType, setVisitType] = useState<VisitType>("in_person");
  const [location, setLocation] = useState("Fairmont Ridge");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("17:00");
  const [allDay, setAllDay] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [affected, setAffected] = useState<AffectedAppointment[]>([]);
  const [saving, setSaving] = useState(false);
  const [slotNote, setSlotNote] = useState<string | null>(null);

  useEffect(() => {
    const today = hospitalToday();
    setSelectedDate(today);
    setDate(today);
    setBlockDate(today);
  }, []);

  const schedule = useQuery({
    queryKey: ["portal", "availability", doctorId, selectedDate],
    queryFn: async () => {
      const [windows, blocks, slots] = await Promise.all([
        fetchOwnWindows(doctorId),
        fetchOwnBlocks(doctorId),
        fetchDoctorDay(doctorId, selectedDate),
      ]);
      return { windows, blocks, slots };
    },
    enabled: Boolean(doctorId && selectedDate),
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "availability", doctorId] });
    };
    window.addEventListener("focus", refresh);
    window.addEventListener(LOCAL_BOOKING_EVENT, refresh);
    window.addEventListener(AVAILABILITY_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(LOCAL_BOOKING_EVENT, refresh);
      window.removeEventListener(AVAILABILITY_EVENT, refresh);
    };
  }, [doctorId, queryClient]);

  const weekStart = hospitalToday();
  const week = Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));
  const windows = schedule.data?.windows ?? [];
  const blocks = schedule.data?.blocks ?? [];
  const slots = schedule.data?.slots ?? [];

  function rememberError(error: unknown) {
    if (error instanceof AvailabilityError) {
      setFormError(error.message);
      setAffected(error.affected);
      return;
    }
    setAffected([]);
    setFormError(error instanceof Error ? error.message : "Could not save that change.");
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["portal", "availability", doctorId] });
  }

  function draft(weekday: number | null): WindowDraft {
    return {
      date: recurring ? null : date,
      weekday: recurring ? weekday : null,
      startTime,
      endTime,
      visitType,
      location: visitType === "in_person" ? location.trim() : null,
      recurring,
      recurrenceEndDate: recurring && recurrenceEnd ? recurrenceEnd : null,
    };
  }

  async function onSaveWindow(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setAffected([]);
    setSaving(true);
    try {
      if (editingId) {
        const weekday = weekdays[0] ?? null;
        await saveAvailabilityWindow(doctorId, editingId, draft(weekday));
        setEditingId(null);
      } else if (recurring) {
        if (weekdays.length === 0) {
          setFormError("Choose at least one weekday.");
          return;
        }
        await saveAvailabilityWindows(
          doctorId,
          weekdays.map((weekday) => draft(weekday)),
        );
      } else {
        await saveAvailabilityWindows(doctorId, [draft(null)]);
      }
      await refresh();
    } catch (error) {
      rememberError(error);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteWindow(id: string) {
    setFormError(null);
    setAffected([]);
    setSaving(true);
    try {
      await removeAvailabilityWindow(doctorId, id);
      if (editingId === id) setEditingId(null);
      await refresh();
    } catch (error) {
      rememberError(error);
    } finally {
      setSaving(false);
    }
  }

  async function onBlock(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setAffected([]);
    setSlotNote(null);
    const start = hospitalLocalToUtc(blockDate, allDay ? "00:00" : blockStart);
    const end = hospitalLocalToUtc(blockDate, allDay ? "23:59" : blockEnd);
    if (!start || !end) {
      setFormError("That blocked time is not a valid clock time.");
      return;
    }
    setSaving(true);
    try {
      await saveAvailabilityBlock(doctorId, { startsAt: start.toISOString(), endsAt: end.toISOString() });
      await refresh();
    } catch (error) {
      rememberError(error);
    } finally {
      setSaving(false);
    }
  }

  async function onRemoveOpen(slot: DoctorSlotView) {
    setSlotNote(null);
    setFormError(null);
    setSaving(true);
    try {
      await saveAvailabilityBlock(doctorId, {
        startsAt: slot.startsAt,
        endsAt: new Date(new Date(slot.startsAt).getTime() + 30 * 60 * 1000).toISOString(),
      });
      await refresh();
    } catch (error) {
      rememberError(error);
    } finally {
      setSaving(false);
    }
  }

  async function onUnblock(slot: DoctorSlotView) {
    setSlotNote(null);
    const start = new Date(slot.startsAt).getTime();
    const end = start + 30 * 60 * 1000;
    const covering = blocks.filter((block) => {
      const blockStartMs = new Date(block.startsAt).getTime();
      const blockEndMs = new Date(block.endsAt).getTime();
      return start < blockEndMs && end > blockStartMs;
    });
    const short = covering.find((block) => new Date(block.endsAt).getTime() - new Date(block.startsAt).getTime() <= 31 * 60 * 1000);
    if (!short) {
      setSlotNote("This time is part of a longer leave block. Remove that block from the list below.");
      return;
    }
    setSaving(true);
    try {
      await removeAvailabilityBlock(doctorId, short.id);
      await refresh();
    } catch (error) {
      rememberError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Schedule</p>
        <h1 className="mt-1 font-display text-2xl text-primary">My availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set when patients can book you. Booked slots are removed automatically.
        </p>
      </div>

      {formError ? (
        <div className="border border-destructive/40 bg-card px-4 py-3 text-sm" role="alert">
          <p className="text-destructive">{formError}</p>
          {affected.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {affected.map((appointment) => (
                <li key={appointment.id}>
                  {appointment.patientId ? (
                    <Link
                      to="/doctor/patients/$patientId"
                      params={{ patientId: appointment.patientId }}
                      className="font-medium text-primary"
                    >
                      {appointment.patientName}
                    </Link>
                  ) : (
                    <span className="font-medium text-primary">{appointment.patientName}</span>
                  )}
                  <span className="text-muted-foreground"> · {formatHospitalDateTime(appointment.startsAt)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">{editingId ? "Edit availability" : "Add availability"}</h2>
        </div>
        <form className="space-y-5 px-4 py-5" onSubmit={(event) => void onSaveWindow(event)}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Schedule type">
            <button
              type="button"
              aria-pressed={!recurring}
              onClick={() => {
                setRecurring(false);
                setEditingId(null);
              }}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                !recurring ? "border-gold bg-gold/20 text-primary" : "border-border text-muted-foreground",
              )}
            >
              One date
            </button>
            <button
              type="button"
              aria-pressed={recurring}
              onClick={() => setRecurring(true)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                recurring ? "border-gold bg-gold/20 text-primary" : "border-border text-muted-foreground",
              )}
            >
              Repeat weekly
            </button>
          </div>

          {recurring ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-primary">Weekdays</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, index) => {
                  const weekday = index + 1;
                  const pressed = weekdays.includes(weekday);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => {
                        setWeekdays((current) => {
                          if (editingId) return [weekday];
                          return current.includes(weekday)
                            ? current.filter((item) => item !== weekday)
                            : [...current, weekday].sort((a, b) => a - b);
                        });
                      }}
                      className={cn(
                        "h-9 min-w-12 rounded-md border text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                        pressed ? "border-gold bg-gold/20 text-primary" : "border-border text-muted-foreground",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="availability-date">Date</Label>
              <Input id="availability-date" type="date" required value={date} min={hospitalToday()} onChange={(event) => setDate(event.target.value)} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="availability-start">Check-in time</Label>
              <Input id="availability-start" type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability-end">End time</Label>
              <Input id="availability-end" type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-primary">Visit type</legend>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["in_person", "In person"],
                  ["telehealth", "Telehealth"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="visit-type"
                    value={value}
                    checked={visitType === value}
                    onChange={() => setVisitType(value)}
                    className="accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {visitType === "in_person" ? (
            <div className="space-y-2">
              <Label htmlFor="availability-location">Location</Label>
              <Input
                id="availability-location"
                required
                value={location}
                placeholder="Fairmont Ridge"
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
          ) : null}

          {recurring ? (
            <div className="space-y-2">
              <Label htmlFor="availability-until">Repeat until (optional)</Label>
              <Input
                id="availability-until"
                type="date"
                value={recurrenceEnd}
                min={hospitalToday()}
                onChange={(event) => setRecurrenceEnd(event.target.value)}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="gold" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save window" : "Add window"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outlineNavy" onClick={() => setEditingId(null)}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Block a date or time range</h2>
        </div>
        <form className="space-y-4 px-4 py-5" onSubmit={(event) => void onBlock(event)}>
          <p className="text-sm text-muted-foreground">Leave and other holds override recurring availability.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="block-date">Date</Label>
              <Input id="block-date" type="date" required value={blockDate} min={hospitalToday()} onChange={(event) => setBlockDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-start">Start</Label>
              <Input id="block-start" type="time" required disabled={allDay} value={blockStart} onChange={(event) => setBlockStart(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-end">End</Label>
              <Input id="block-end" type="time" required disabled={allDay} value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              className="accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            />
            All day
          </label>
          <Button type="submit" variant="outlineNavy" disabled={saving}>
            Block this time
          </Button>
          {blocks.length > 0 ? (
            <ul className="divide-y divide-border border border-border">
              {blocks.map((block) => (
                <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    {formatHospitalDateTime(block.startsAt)} – {formatHospitalTime(block.endsAt)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void removeAvailabilityBlock(doctorId, block.id).then(refresh).catch(rememberError);
                    }}
                  >
                    Remove block
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-primary">Windows</h2>
        {schedule.isLoading ? <p className="text-sm text-muted-foreground">Loading your schedule…</p> : null}
        {schedule.isError ? (
          <div role="alert" className="space-y-2">
            <p className="text-sm text-destructive">
              {schedule.error instanceof Error ? schedule.error.message : "Unable to load availability."}
            </p>
            <Button type="button" size="sm" variant="outlineNavy" onClick={() => void schedule.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}
        {!schedule.isLoading && !schedule.isError && windows.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have not published any openings yet. Add a window above so patients can book you.</p>
        ) : null}
        <ul className="grid gap-3 lg:grid-cols-2">
          {windows.map((window) => (
            <li key={window.id} className="flex flex-wrap items-start justify-between gap-3 border border-border bg-card px-4 py-3 shadow-card">
              <div>
                <p className="font-medium text-primary">
                  {window.recurring ? (WEEKDAY_FULL[(window.weekday ?? 1) - 1] ?? "Weekly") : window.date} · {clockLabel(window.startTime)} – {clockLabel(window.endTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {window.visitType === "telehealth" ? "Telehealth" : `In person · ${window.location}`}
                  {window.recurrenceEndDate ? ` · until ${window.recurrenceEndDate}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(window.id);
                    setRecurring(window.recurring);
                    setWeekdays(window.weekday ? [window.weekday] : []);
                    setDate(window.date ?? hospitalToday());
                    setStartTime(window.startTime);
                    setEndTime(window.endTime);
                    setVisitType(window.visitType);
                    setLocation(window.location ?? "Fairmont Ridge");
                    setRecurrenceEnd(window.recurrenceEndDate ?? "");
                    setFormError(null);
                    setAffected([]);
                  }}
                >
                  Edit
                </Button>
                <Button type="button" size="sm" variant="outlineNavy" disabled={saving} onClick={() => void onDeleteWindow(window.id)}>
                  Remove window
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl text-primary">Openings</h2>
          <p className="text-sm text-muted-foreground">Each visit is 30 minutes. Booked times stay on your schedule until you change them in My Appointments.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Week">
          {week.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={day === selectedDate}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "min-w-24 shrink-0 rounded-md border px-3 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                day === selectedDate ? "border-gold bg-gold/20 text-primary" : "border-border bg-card",
              )}
            >
              {civilLabel(day)}
            </button>
          ))}
        </div>
        {slotNote ? <p className="text-sm text-muted-foreground">{slotNote}</p> : null}
        {!schedule.isLoading && slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No openings on this day.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) => (
              <li key={slot.startsAt}>
                <SlotCard
                  slot={slot}
                  busy={saving}
                  onRemove={() => void onRemoveOpen(slot)}
                  onUnblock={() => void onUnblock(slot)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SlotCard({
  slot,
  busy,
  onRemove,
  onUnblock,
}: {
  slot: DoctorSlotView;
  busy: boolean;
  onRemove: () => void;
  onUnblock: () => void;
}) {
  const place = slot.visitType === "telehealth" ? "Telehealth" : slot.location || "In person";
  const tone =
    slot.status === "booked"
      ? "border-primary bg-primary/5"
      : slot.status === "blocked"
        ? "border-border bg-muted/40"
        : "border-gold/50 bg-card";
  return (
    <article aria-label={`${formatHospitalTime(slot.startsAt)} ${slot.status}`} className={cn("space-y-2 border px-3 py-3", tone)}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-primary">{formatHospitalTime(slot.startsAt)}</p>
        <span className="text-xs uppercase tracking-wide text-gold">
          {slot.status === "open" ? "Open" : slot.status === "booked" ? "Booked" : "Blocked"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{place}</p>
      {slot.status === "open" && !slot.bookable ? (
        <p className="text-xs text-muted-foreground">Patients can book this once it is more than 2 hours away.</p>
      ) : null}
      {slot.status === "booked" ? (
        <div className="space-y-1 text-sm">
          <p className="text-primary">{slot.patientName}</p>
          {slot.patientId ? (
            <Link to="/doctor/patients/$patientId" params={{ patientId: slot.patientId }} className="text-xs font-medium text-gold">
              Open chart
            </Link>
          ) : null}
          <p className="text-xs text-muted-foreground">This visit is booked. Reschedule or cancel it from My Appointments.</p>
        </div>
      ) : null}
      {slot.status === "open" ? (
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onRemove}>
          Remove slot
        </Button>
      ) : null}
      {slot.status === "blocked" ? (
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onUnblock}>
          Unblock
        </Button>
      ) : null}
    </article>
  );
}
