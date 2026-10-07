/**
 * Doctor availability and 30-minute slot rules.
 * Windows store hospital wall-clock times. Instants are UTC.
 * The hospital timezone is the single display and generation setting.
 */

export const HOSPITAL_TIME_ZONE = "America/New_York";
export const SLOT_MINUTES = 30;
export const DEFAULT_LEAD_MS = 2 * 60 * 60 * 1000;
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type VisitType = "in_person" | "telehealth";

export type AvailabilityWindow = {
  id: string;
  doctorId: string;
  date: string | null;
  weekday: number | null;
  startTime: string;
  endTime: string;
  visitType: VisitType;
  location: string | null;
  recurring: boolean;
  recurrenceEndDate: string | null;
  createdAt: string;
};

export type AvailabilityBlock = {
  id: string;
  doctorId: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type BusyAppointment = {
  id: string;
  doctorId: string;
  startsAt: string;
  status: string;
  patientName: string;
  patientId: string | null;
};

export type FreeSlot = {
  startsAt: string;
  visitType: VisitType;
  location: string | null;
};

export type DoctorSlotView =
  | (FreeSlot & { status: "open"; bookable: boolean })
  | (FreeSlot & {
      status: "booked";
      bookable: false;
      patientName: string;
      patientId: string | null;
      appointmentId: string;
    })
  | (FreeSlot & { status: "blocked"; bookable: false });

export type AffectedAppointment = {
  id: string;
  patientName: string;
  patientId: string | null;
  startsAt: string;
};

export class AvailabilityError extends Error {
  readonly code: "validation" | "overlap" | "taken" | "forbidden" | "has_appointments";
  readonly affected: AffectedAppointment[];

  constructor(code: AvailabilityError["code"], message: string, affected: AffectedAppointment[] = []) {
    super(message);
    this.name = "AvailabilityError";
    this.code = code;
    this.affected = affected;
  }
}

export const SLOT_TAKEN_MESSAGE = "That time was just booked. Please choose another opening.";

const HOLDING_STATUSES = new Set(["pending", "confirmed"]);

export function statusHoldsSlot(status: string) {
  return HOLDING_STATUSES.has(status);
}

export type WindowDraft = {
  id?: string;
  doctorId?: string;
  date: string | null;
  weekday: number | null;
  startTime: string;
  endTime: string;
  visitType: VisitType;
  location: string | null;
  recurring: boolean;
  recurrenceEndDate: string | null;
};

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function zonedParts(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const hour = Number(bag["hour"] ?? "0") % 24;
  return {
    year: Number(bag["year"] ?? "0"),
    month: Number(bag["month"] ?? "1"),
    day: Number(bag["day"] ?? "1"),
    hour,
    minute: Number(bag["minute"] ?? "0"),
    second: Number(bag["second"] ?? "0"),
  };
}

function offsetMinutesAt(utcMs: number, timeZone: string) {
  const parts = zonedParts(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - utcMs) / 60000);
}

/** Convert a hospital wall-clock time to UTC. Returns null when the clock time does not exist (DST gap). */
export function hospitalLocalToUtc(date: string, time: string, timeZone = HOSPITAL_TIME_ZONE): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const y = Number(dateMatch[1]);
  const m = Number(dateMatch[2]);
  const d = Number(dateMatch[3]);
  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);
  if (hh > 23 || mm > 59) return null;
  const localAsUtc = Date.UTC(y, m - 1, d, hh, mm, 0);
  const hits: number[] = [];
  for (let offsetMin = -12 * 60; offsetMin <= 14 * 60; offsetMin += 15) {
    const utc = localAsUtc - offsetMin * 60000;
    if (offsetMinutesAt(utc, timeZone) === offsetMin) hits.push(utc);
  }
  if (hits.length === 0) return null;
  return new Date(Math.min(...hits));
}

export function hospitalToday(now = new Date(), timeZone = HOSPITAL_TIME_ZONE) {
  const parts = zonedParts(now, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function hospitalDateFromIso(iso: string, timeZone = HOSPITAL_TIME_ZONE) {
  return hospitalToday(new Date(iso), timeZone);
}

export function hospitalClock(iso: string, timeZone = HOSPITAL_TIME_ZONE) {
  const parts = zonedParts(new Date(iso), timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatHospitalTime(iso: string, timeZone = HOSPITAL_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatHospitalDate(iso: string, timeZone = HOSPITAL_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatHospitalDateTime(iso: string, timeZone = HOSPITAL_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Print a stored hospital wall clock without shifting it into the browser timezone. */
export function formatWallClock(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})/.exec(time);
  if (!dateMatch || !timeMatch) return `${date} ${time}`;
  const utc = new Date(
    Date.UTC(
      Number(dateMatch[1]),
      Number(dateMatch[2]) - 1,
      Number(dateMatch[3]),
      Number(timeMatch[1]),
      Number(timeMatch[2]),
    ),
  );
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(utc);
}

/** Monday = 1 … Sunday = 7 for a civil date. */
export function weekdayMon1(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return 1;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function addCalendarDays(date: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12));
  return utc.toISOString().slice(0, 10);
}

export function eachDate(from: string, to: string) {
  const dates: string[] = [];
  if (from > to) return dates;
  let cursor = from;
  while (cursor <= to && dates.length < 400) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

function minutesOf(time: string) {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clockFromMinutes(total: number) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function sameSlotInstant(a: string, b: string) {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return Math.floor(left / 60000) === Math.floor(right / 60000);
}

export function activeSlotKey(doctorId: string, startsAt: string) {
  return `${doctorId}|${Math.floor(new Date(startsAt).getTime() / 60000)}`;
}

function createdDate(window: AvailabilityWindow, timeZone: string) {
  return hospitalDateFromIso(window.createdAt, timeZone);
}

export function windowApplies(window: AvailabilityWindow, date: string, timeZone = HOSPITAL_TIME_ZONE) {
  if (date < createdDate(window, timeZone)) return false;
  if (window.recurring) {
    if (window.weekday == null || weekdayMon1(date) !== window.weekday) return false;
    if (window.recurrenceEndDate && date > window.recurrenceEndDate) return false;
    return true;
  }
  return window.date === date;
}

export function generateSlotStarts(
  date: string,
  startTime: string,
  endTime: string,
  timeZone = HOSPITAL_TIME_ZONE,
  slotMinutes = SLOT_MINUTES,
) {
  const startMin = minutesOf(startTime);
  const endMin = minutesOf(endTime);
  const slots: string[] = [];
  if (endMin - startMin < slotMinutes) return slots;
  for (let cursor = startMin; cursor + slotMinutes <= endMin; cursor += slotMinutes) {
    const instant = hospitalLocalToUtc(date, clockFromMinutes(cursor), timeZone);
    const endInstant = hospitalLocalToUtc(date, clockFromMinutes(cursor + slotMinutes), timeZone);
    if (!instant || !endInstant) continue;
    if (endInstant.getTime() - instant.getTime() !== slotMinutes * 60000) continue;
    slots.push(instant.toISOString());
  }
  return slots;
}

function timeOverlaps(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) {
  return minutesOf(a.startTime) < minutesOf(b.endTime) && minutesOf(b.startTime) < minutesOf(a.endTime);
}

function rangeEnd(window: AvailabilityWindow) {
  if (!window.recurring) return window.date ?? "0000-01-01";
  return window.recurrenceEndDate ?? "9999-12-31";
}

function daySetsOverlap(a: AvailabilityWindow, b: AvailabilityWindow, timeZone: string) {
  const aStart = createdDate(a, timeZone);
  const bStart = createdDate(b, timeZone);
  const aEnd = rangeEnd(a);
  const bEnd = rangeEnd(b);
  if (aStart > bEnd || bStart > aEnd) return false;
  if (a.recurring && b.recurring) return a.weekday === b.weekday;
  if (!a.recurring && !b.recurring) return a.date != null && a.date === b.date;
  const oneOff = a.recurring ? b : a;
  const recur = a.recurring ? a : b;
  if (!oneOff.date || recur.weekday == null) return false;
  if (weekdayMon1(oneOff.date) !== recur.weekday) return false;
  const recurStart = createdDate(recur, timeZone);
  const recurEnd = rangeEnd(recur);
  return oneOff.date >= recurStart && oneOff.date <= recurEnd;
}

export function validateWindowDraft(draft: WindowDraft, now = new Date(), timeZone = HOSPITAL_TIME_ZONE) {
  if (draft.visitType !== "in_person" && draft.visitType !== "telehealth") {
    throw new AvailabilityError("validation", "Choose in person or telehealth.");
  }
  if (!/^\d{2}:\d{2}$/.test(draft.startTime) || !/^\d{2}:\d{2}$/.test(draft.endTime)) {
    throw new AvailabilityError("validation", "Enter a start and end time.");
  }
  if (minutesOf(draft.endTime) <= minutesOf(draft.startTime)) {
    throw new AvailabilityError("validation", "End time must be after the start time.");
  }
  if (minutesOf(draft.endTime) - minutesOf(draft.startTime) < SLOT_MINUTES) {
    throw new AvailabilityError("validation", "The window must be at least 30 minutes long.");
  }
  if (draft.visitType === "in_person" && !draft.location?.trim()) {
    throw new AvailabilityError("validation", "Location is required for an in-person window.");
  }
  const today = hospitalToday(now, timeZone);
  if (draft.recurring) {
    if (draft.weekday == null || draft.weekday < 1 || draft.weekday > 7) {
      throw new AvailabilityError("validation", "Choose at least one weekday.");
    }
    if (draft.recurrenceEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.recurrenceEndDate)) {
      throw new AvailabilityError("validation", "Enter a valid end date.");
    }
    if (draft.recurrenceEndDate && draft.recurrenceEndDate < today) {
      throw new AvailabilityError("validation", "The repeat end date cannot be in the past.");
    }
  } else {
    if (!draft.date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      throw new AvailabilityError("validation", "Choose a date.");
    }
    if (draft.date < today) {
      throw new AvailabilityError("validation", "Availability dates cannot be in the past.");
    }
  }
}

export function assertOwnDoctor(actorDoctorId: string, resourceDoctorId: string) {
  if (!actorDoctorId || actorDoctorId !== resourceDoctorId) {
    throw new AvailabilityError("forbidden", "You can only change your own schedule.");
  }
}

export function createWindowIn(
  windows: AvailabilityWindow[],
  actorDoctorId: string,
  draft: WindowDraft,
  now = new Date(),
  timeZone = HOSPITAL_TIME_ZONE,
) {
  if (draft.doctorId && draft.doctorId !== actorDoctorId) {
    throw new AvailabilityError("forbidden", "You can only change your own schedule.");
  }
  if (!actorDoctorId) {
    throw new AvailabilityError("forbidden", "You can only change your own schedule.");
  }
  validateWindowDraft(draft, now, timeZone);
  const window: AvailabilityWindow = {
    id: draft.id ?? "pending",
    doctorId: actorDoctorId,
    date: draft.recurring ? null : draft.date,
    weekday: draft.recurring ? draft.weekday : null,
    startTime: draft.startTime,
    endTime: draft.endTime,
    visitType: draft.visitType,
    location: draft.visitType === "telehealth" ? null : (draft.location?.trim() ?? null),
    recurring: draft.recurring,
    recurrenceEndDate: draft.recurring ? draft.recurrenceEndDate : null,
    createdAt: now.toISOString(),
  };
  assertNoOverlap(windows, window, timeZone);
  return window;
}

function assertNoOverlap(windows: AvailabilityWindow[], window: AvailabilityWindow, timeZone: string) {
  for (const existing of windows) {
    if (existing.id === window.id) continue;
    if (existing.doctorId !== window.doctorId) continue;
    if (timeOverlaps(existing, window) && daySetsOverlap(existing, window, timeZone)) {
      throw new AvailabilityError("overlap", "That window overlaps another availability window.");
    }
  }
}

function holdingInside(
  appointment: BusyAppointment,
  window: AvailabilityWindow,
  now: Date,
  timeZone: string,
) {
  if (appointment.doctorId !== window.doctorId) return false;
  if (!statusHoldsSlot(appointment.status)) return false;
  const start = new Date(appointment.startsAt);
  if (Number.isNaN(start.getTime()) || start.getTime() < now.getTime()) return false;
  const date = hospitalDateFromIso(appointment.startsAt, timeZone);
  if (!windowApplies(window, date, timeZone)) return false;
  const clock = minutesOf(hospitalClock(appointment.startsAt, timeZone));
  return clock >= minutesOf(window.startTime) && clock < minutesOf(window.endTime);
}

export function appointmentsLost(
  before: AvailabilityWindow[],
  after: AvailabilityWindow[],
  appointments: BusyAppointment[],
  now = new Date(),
  timeZone = HOSPITAL_TIME_ZONE,
): AffectedAppointment[] {
  return appointments
    .filter((appointment) => {
      const wasCovered = before.some((window) => holdingInside(appointment, window, now, timeZone));
      const stillCovered = after.some((window) => holdingInside(appointment, window, now, timeZone));
      return wasCovered && !stillCovered;
    })
    .map((appointment) => ({
      id: appointment.id,
      patientName: appointment.patientName,
      patientId: appointment.patientId,
      startsAt: appointment.startsAt,
    }));
}

export function deleteWindowIn(
  windows: AvailabilityWindow[],
  actorDoctorId: string,
  id: string,
  appointments: BusyAppointment[],
  now = new Date(),
  timeZone = HOSPITAL_TIME_ZONE,
) {
  const window = windows.find((item) => item.id === id);
  if (!window) throw new AvailabilityError("validation", "That availability window was not found.");
  assertOwnDoctor(actorDoctorId, window.doctorId);
  const after = windows.filter((item) => item.id !== id);
  const lost = appointmentsLost(windows, after, appointments, now, timeZone);
  if (lost.length > 0) {
    throw new AvailabilityError(
      "has_appointments",
      "This window still has booked visits. Reschedule or cancel them from My Appointments before removing it.",
      lost,
    );
  }
  return after;
}

export function updateWindowIn(
  windows: AvailabilityWindow[],
  actorDoctorId: string,
  id: string,
  draft: WindowDraft,
  appointments: BusyAppointment[],
  now = new Date(),
  timeZone = HOSPITAL_TIME_ZONE,
) {
  const current = windows.find((item) => item.id === id);
  if (!current) throw new AvailabilityError("validation", "That availability window was not found.");
  assertOwnDoctor(actorDoctorId, current.doctorId);
  const replacement = createWindowIn(
    windows.filter((item) => item.id !== id),
    actorDoctorId,
    { ...draft, id },
    now,
    timeZone,
  );
  replacement.createdAt = current.createdAt;
  assertNoOverlap(
    windows.filter((item) => item.id !== id),
    replacement,
    timeZone,
  );
  const after = windows.map((item) => (item.id === id ? replacement : item));
  const lost = appointmentsLost(windows, after, appointments, now, timeZone);
  if (lost.length > 0) {
    throw new AvailabilityError(
      "has_appointments",
      "Changing this window would drop booked visits. Reschedule or cancel them from My Appointments first.",
      lost,
    );
  }
  return after;
}

export type BlockDraft = {
  id?: string;
  doctorId?: string;
  startsAt: string;
  endsAt: string;
};

export function createBlockIn(
  actorDoctorId: string,
  draft: BlockDraft,
  now = new Date(),
) {
  if (draft.doctorId && draft.doctorId !== actorDoctorId) {
    throw new AvailabilityError("forbidden", "You can only change your own schedule.");
  }
  if (!actorDoctorId) {
    throw new AvailabilityError("forbidden", "You can only change your own schedule.");
  }
  const start = new Date(draft.startsAt);
  const end = new Date(draft.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    throw new AvailabilityError("validation", "The blocked end time must be after the start time.");
  }
  if (end.getTime() <= now.getTime()) {
    throw new AvailabilityError("validation", "Blocked time cannot be in the past.");
  }
  const block: AvailabilityBlock = {
    id: draft.id ?? "pending",
    doctorId: actorDoctorId,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    createdAt: now.toISOString(),
  };
  return block;
}

export function deleteBlockIn(blocks: AvailabilityBlock[], actorDoctorId: string, id: string) {
  const block = blocks.find((item) => item.id === id);
  if (!block) throw new AvailabilityError("validation", "That blocked time was not found.");
  assertOwnDoctor(actorDoctorId, block.doctorId);
  return blocks.filter((item) => item.id !== id);
}

type SlotSource = {
  startsAt: string;
  visitType: VisitType;
  location: string | null;
};

function sourcesForDate(
  doctorId: string,
  date: string,
  windows: AvailabilityWindow[],
  timeZone: string,
) {
  const sources: SlotSource[] = [];
  const seen = new Set<string>();
  for (const window of windows) {
    if (window.doctorId !== doctorId) continue;
    if (!windowApplies(window, date, timeZone)) continue;
    for (const startsAt of generateSlotStarts(date, window.startTime, window.endTime, timeZone)) {
      const key = activeSlotKey(doctorId, startsAt);
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({ startsAt, visitType: window.visitType, location: window.location });
    }
  }
  sources.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return sources;
}

function slotBlocked(startsAt: string, doctorId: string, blocks: AvailabilityBlock[]) {
  const start = new Date(startsAt).getTime();
  const end = start + SLOT_MINUTES * 60000;
  return blocks.some((block) => {
    if (block.doctorId !== doctorId) return false;
    const blockStart = new Date(block.startsAt).getTime();
    const blockEnd = new Date(block.endsAt).getTime();
    return start < blockEnd && end > blockStart;
  });
}

function holdingAt(appointments: BusyAppointment[], doctorId: string, startsAt: string, excludeId?: string) {
  return appointments.find(
    (appointment) =>
      appointment.doctorId === doctorId &&
      appointment.id !== excludeId &&
      statusHoldsSlot(appointment.status) &&
      sameSlotInstant(appointment.startsAt, startsAt),
  );
}

export function listDoctorDaySlots(input: {
  doctorId: string;
  date: string;
  windows: AvailabilityWindow[];
  blocks: AvailabilityBlock[];
  appointments: BusyAppointment[];
  now?: Date;
  leadMs?: number;
  timeZone?: string;
}): DoctorSlotView[] {
  const now = input.now ?? new Date();
  const leadMs = input.leadMs ?? DEFAULT_LEAD_MS;
  const timeZone = input.timeZone ?? HOSPITAL_TIME_ZONE;
  const views: DoctorSlotView[] = [];
  for (const source of sourcesForDate(input.doctorId, input.date, input.windows, timeZone)) {
    if (new Date(source.startsAt).getTime() < now.getTime()) continue;
    const held = holdingAt(input.appointments, input.doctorId, source.startsAt);
    if (held) {
      views.push({
        ...source,
        status: "booked",
        bookable: false,
        patientName: held.patientName,
        patientId: held.patientId,
        appointmentId: held.id,
      });
      continue;
    }
    if (slotBlocked(source.startsAt, input.doctorId, input.blocks)) {
      views.push({ ...source, status: "blocked", bookable: false });
      continue;
    }
    views.push({
      ...source,
      status: "open",
      bookable: new Date(source.startsAt).getTime() >= now.getTime() + leadMs,
    });
  }
  return views;
}

export function listFreeSlots(input: {
  doctorId: string;
  from: string;
  to: string;
  windows: AvailabilityWindow[];
  blocks: AvailabilityBlock[];
  appointments: BusyAppointment[];
  now?: Date;
  leadMs?: number;
  timeZone?: string;
}): FreeSlot[] {
  const now = input.now ?? new Date();
  const leadMs = input.leadMs ?? DEFAULT_LEAD_MS;
  const timeZone = input.timeZone ?? HOSPITAL_TIME_ZONE;
  const earliest = now.getTime() + leadMs;
  const free: FreeSlot[] = [];
  for (const date of eachDate(input.from, input.to)) {
    for (const source of sourcesForDate(input.doctorId, date, input.windows, timeZone)) {
      const start = new Date(source.startsAt).getTime();
      if (start < earliest) continue;
      if (slotBlocked(source.startsAt, input.doctorId, input.blocks)) continue;
      if (holdingAt(input.appointments, input.doctorId, source.startsAt)) continue;
      free.push({ startsAt: source.startsAt, visitType: source.visitType, location: source.location });
    }
  }
  return free;
}

export function assertSlotBookable(input: {
  doctorId: string;
  startsAt: string;
  windows: AvailabilityWindow[];
  blocks: AvailabilityBlock[];
  appointments: BusyAppointment[];
  excludeAppointmentId?: string;
  now?: Date;
  leadMs?: number;
  timeZone?: string;
}) {
  const now = input.now ?? new Date();
  const leadMs = input.leadMs ?? DEFAULT_LEAD_MS;
  const timeZone = input.timeZone ?? HOSPITAL_TIME_ZONE;
  const start = new Date(input.startsAt);
  if (!input.doctorId || Number.isNaN(start.getTime())) {
    throw new AvailabilityError("taken", "That time is no longer open. Choose another opening.");
  }
  if (start.getTime() < now.getTime() + leadMs) {
    throw new AvailabilityError("taken", "That time is no longer open. Choose another opening.");
  }
  const date = hospitalDateFromIso(input.startsAt, timeZone);
  const match = sourcesForDate(input.doctorId, date, input.windows, timeZone).find((source) =>
    sameSlotInstant(source.startsAt, input.startsAt),
  );
  if (!match || slotBlocked(match.startsAt, input.doctorId, input.blocks)) {
    throw new AvailabilityError("taken", "That time is no longer open. Choose another opening.");
  }
  if (holdingAt(input.appointments, input.doctorId, match.startsAt, input.excludeAppointmentId)) {
    throw new AvailabilityError("taken", SLOT_TAKEN_MESSAGE);
  }
  return match;
}

export function commitBooking(input: {
  windows: AvailabilityWindow[];
  blocks: AvailabilityBlock[];
  appointments: BusyAppointment[];
  doctorId: string;
  startsAt: string;
  appointmentId: string;
  patientName: string;
  patientId: string | null;
  now?: Date;
  leadMs?: number;
  timeZone?: string;
}) {
  const now = input.now ?? new Date();
  const match = assertSlotBookable({
    doctorId: input.doctorId,
    startsAt: input.startsAt,
    windows: input.windows,
    blocks: input.blocks,
    appointments: input.appointments,
    now,
    ...(input.leadMs !== undefined ? { leadMs: input.leadMs } : {}),
    ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
  });
  const next: BusyAppointment = {
    id: input.appointmentId,
    doctorId: input.doctorId,
    startsAt: match.startsAt,
    status: "pending",
    patientName: input.patientName,
    patientId: input.patientId,
  };
  if (holdingAt(input.appointments, input.doctorId, match.startsAt)) {
    throw new AvailabilityError("taken", SLOT_TAKEN_MESSAGE);
  }
  return [...input.appointments, next];
}

/** In-process unique lock. The database partial unique index is the cross-request lock. */
export function reserveActiveSlot(held: Set<string>, doctorId: string, startsAt: string) {
  const key = activeSlotKey(doctorId, startsAt);
  if (held.has(key)) throw new AvailabilityError("taken", SLOT_TAKEN_MESSAGE);
  held.add(key);
  return key;
}

export function toPublicSlot(slot: FreeSlot): FreeSlot {
  return { startsAt: slot.startsAt, visitType: slot.visitType, location: slot.location };
}
