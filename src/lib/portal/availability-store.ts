import {
  createBlockIn,
  createWindowIn,
  deleteBlockIn,
  deleteWindowIn,
  listDoctorDaySlots,
  listFreeSlots,
  updateWindowIn,
  type AvailabilityBlock,
  type AvailabilityWindow,
  type BlockDraft,
  type BusyAppointment,
  type WindowDraft,
} from "@/lib/portal/availability";
import { LOCAL_AMARA_DOCTOR_ID } from "@/lib/portal/local-demo";

const STORAGE_KEY = "gura_doctor_availability";
export const AVAILABILITY_EVENT = "gura-availability";

type Persisted = {
  windows: AvailabilityWindow[];
  blocks: AvailabilityBlock[];
};

let memory: Persisted | null = null;

function amaraSeed(): Persisted {
  const createdAt = "2026-01-01T05:00:00.000Z";
  const clinic = {
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    date: null as string | null,
    recurring: true,
    recurrenceEndDate: null as string | null,
    createdAt,
    visitType: "in_person" as const,
    location: "Fairmont Ridge",
  };
  const video = {
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    date: null as string | null,
    recurring: true,
    recurrenceEndDate: null as string | null,
    createdAt,
    visitType: "telehealth" as const,
    location: null,
  };
  return {
    windows: [
      { ...clinic, id: "d1111111-1111-4111-8111-111111111111", weekday: 1, startTime: "09:00", endTime: "13:00" },
      { ...clinic, id: "d2222222-2222-4222-8222-222222222222", weekday: 3, startTime: "09:00", endTime: "13:00" },
      { ...clinic, id: "d3333333-3333-4333-8333-333333333333", weekday: 5, startTime: "09:00", endTime: "13:00" },
      { ...video, id: "d4444444-4444-4444-8444-444444444444", weekday: 2, startTime: "14:00", endTime: "17:00" },
      { ...video, id: "d5555555-5555-4555-8555-555555555555", weekday: 4, startTime: "14:00", endTime: "17:00" },
    ],
    blocks: [],
  };
}

function write(next: Persisted) {
  memory = next;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(AVAILABILITY_EVENT));
}

export function readAvailability(): Persisted {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        if (Array.isArray(parsed.windows) && Array.isArray(parsed.blocks)) {
          memory = parsed;
          return parsed;
        }
      }
    } catch {
      // Fall through to the seeded schedule.
    }
  }
  if (!memory) memory = amaraSeed();
  return memory;
}

function newId() {
  return crypto.randomUUID();
}

export function listOwnWindows(actorDoctorId: string) {
  return readAvailability().windows.filter((window) => window.doctorId === actorDoctorId);
}

export function listOwnBlocks(actorDoctorId: string) {
  return readAvailability().blocks.filter((block) => block.doctorId === actorDoctorId);
}

export function createAvailabilityWindows(actorDoctorId: string, drafts: WindowDraft[], now = new Date()) {
  const current = readAvailability();
  let windows = current.windows;
  const created: AvailabilityWindow[] = [];
  for (const draft of drafts) {
    const window = createWindowIn(windows, actorDoctorId, { ...draft, id: draft.id ?? newId() }, now);
    windows = [...windows, window];
    created.push(window);
  }
  write({ ...current, windows });
  return created;
}

export function updateAvailabilityWindow(
  actorDoctorId: string,
  id: string,
  draft: WindowDraft,
  appointments: BusyAppointment[],
  now = new Date(),
) {
  const current = readAvailability();
  const windows = updateWindowIn(current.windows, actorDoctorId, id, draft, appointments, now);
  write({ ...current, windows });
  return windows.find((window) => window.id === id) ?? null;
}

export function deleteAvailabilityWindow(
  actorDoctorId: string,
  id: string,
  appointments: BusyAppointment[],
  now = new Date(),
) {
  const current = readAvailability();
  const windows = deleteWindowIn(current.windows, actorDoctorId, id, appointments, now);
  write({ ...current, windows });
}

export function createAvailabilityBlock(actorDoctorId: string, draft: BlockDraft, now = new Date()) {
  const current = readAvailability();
  const block = createBlockIn(actorDoctorId, { ...draft, id: draft.id ?? newId() }, now);
  write({ ...current, blocks: [...current.blocks, block] });
  return block;
}

export function deleteAvailabilityBlock(actorDoctorId: string, id: string) {
  const current = readAvailability();
  const blocks = deleteBlockIn(current.blocks, actorDoctorId, id);
  write({ ...current, blocks });
}

export function freeSlotsFor(
  doctorId: string,
  from: string,
  to: string,
  appointments: BusyAppointment[],
  now = new Date(),
) {
  const schedule = readAvailability();
  return listFreeSlots({
    doctorId,
    from,
    to,
    windows: schedule.windows,
    blocks: schedule.blocks,
    appointments,
    now,
  });
}

export function doctorDaySlots(
  actorDoctorId: string,
  date: string,
  appointments: BusyAppointment[],
  now = new Date(),
) {
  const schedule = readAvailability();
  return listDoctorDaySlots({
    doctorId: actorDoctorId,
    date,
    windows: schedule.windows.filter((window) => window.doctorId === actorDoctorId),
    blocks: schedule.blocks.filter((block) => block.doctorId === actorDoctorId),
    appointments: appointments.filter((appointment) => appointment.doctorId === actorDoctorId),
    now,
  });
}
