import { supabase } from "@/integrations/supabase/client";
import {
  AvailabilityError,
  addCalendarDays,
  formatHospitalDateTime,
  hospitalToday,
  toPublicSlot,
  type AvailabilityBlock,
  type AvailabilityWindow,
  type BlockDraft,
  type DoctorSlotView,
  type FreeSlot,
  type WindowDraft,
} from "@/lib/portal/availability";
import {
  createAvailabilityBlock,
  createAvailabilityWindows,
  deleteAvailabilityBlock,
  deleteAvailabilityWindow,
  doctorDaySlots,
  freeSlotsFor,
  listOwnBlocks,
  listOwnWindows,
  updateAvailabilityWindow,
} from "@/lib/portal/availability-store";
import { isLocalPortalDemo } from "@/lib/portal/local-demo";
import { listBusyAppointments } from "@/lib/portal/local-store";

type ErrorBody = {
  error?: string;
  code?: AvailabilityError["code"];
  affected?: AvailabilityError["affected"];
};

function endpoint(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  throw new AvailabilityError(
    body.code ?? (response.status === 403 ? "forbidden" : "validation"),
    body.error ?? "Request failed.",
    body.affected ?? [],
  );
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AvailabilityError("forbidden", "Sign in required.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchFreeSlots(doctorId: string, from: string, to: string): Promise<FreeSlot[]> {
  if (!doctorId || !from || !to) return [];
  if (isLocalPortalDemo()) {
    return freeSlotsFor(doctorId, from, to, await listBusyAppointments()).map(toPublicSlot);
  }
  const params = new URLSearchParams({ doctorId, from, to });
  const response = await fetch(endpoint(`/api/slots?${params.toString()}`));
  if (!response.ok) await readError(response);
  const body = (await response.json()) as { slots?: FreeSlot[] };
  return (body.slots ?? []).map(toPublicSlot);
}

export async function nextOpeningLabel(doctorId: string) {
  const from = hospitalToday();
  const slots = await fetchFreeSlots(doctorId, from, addCalendarDays(from, 21));
  const first = slots[0];
  if (!first) return null;
  return `Next available: ${formatHospitalDateTime(first.startsAt)}`;
}

export async function fetchOwnWindows(actorDoctorId: string): Promise<AvailabilityWindow[]> {
  if (isLocalPortalDemo()) return listOwnWindows(actorDoctorId);
  const body = await doctorRequest<{ windows: AvailabilityWindow[] }>("/api/doctor/availability");
  return body.windows.filter((window) => window.doctorId === actorDoctorId);
}

export async function fetchOwnBlocks(actorDoctorId: string): Promise<AvailabilityBlock[]> {
  if (isLocalPortalDemo()) return listOwnBlocks(actorDoctorId);
  const body = await doctorRequest<{ blocks: AvailabilityBlock[] }>("/api/doctor/availability");
  return body.blocks.filter((block) => block.doctorId === actorDoctorId);
}

export async function fetchDoctorDay(actorDoctorId: string, date: string): Promise<DoctorSlotView[]> {
  if (!actorDoctorId || !date) return [];
  if (isLocalPortalDemo()) return doctorDaySlots(actorDoctorId, date, await listBusyAppointments());
  const body = await doctorRequest<{ slots: DoctorSlotView[] }>(
    `/api/doctor/availability?date=${encodeURIComponent(date)}`,
  );
  return body.slots;
}

export async function saveAvailabilityWindows(actorDoctorId: string, drafts: WindowDraft[]) {
  if (isLocalPortalDemo()) return createAvailabilityWindows(actorDoctorId, drafts);
  const body = await doctorRequest<{ windows: AvailabilityWindow[] }>("/api/doctor/availability", {
    method: "POST",
    body: JSON.stringify({ drafts }),
  });
  return body.windows;
}

export async function saveAvailabilityWindow(actorDoctorId: string, id: string, draft: WindowDraft) {
  if (isLocalPortalDemo()) return updateAvailabilityWindow(actorDoctorId, id, draft, await listBusyAppointments());
  const body = await doctorRequest<{ window: AvailabilityWindow }>(`/api/doctor/availability?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ draft }),
  });
  return body.window;
}

export async function removeAvailabilityWindow(actorDoctorId: string, id: string) {
  if (isLocalPortalDemo()) {
    deleteAvailabilityWindow(actorDoctorId, id, await listBusyAppointments());
    return;
  }
  await doctorRequest(`/api/doctor/availability?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function saveAvailabilityBlock(actorDoctorId: string, draft: BlockDraft) {
  if (isLocalPortalDemo()) return createAvailabilityBlock(actorDoctorId, draft);
  const body = await doctorRequest<{ block: AvailabilityBlock }>("/api/doctor/blocks", {
    method: "POST",
    body: JSON.stringify({ draft }),
  });
  return body.block;
}

export async function removeAvailabilityBlock(actorDoctorId: string, id: string) {
  if (isLocalPortalDemo()) {
    deleteAvailabilityBlock(actorDoctorId, id);
    return;
  }
  await doctorRequest(`/api/doctor/blocks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function doctorRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(endpoint(path), { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!response.ok) await readError(response);
  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}
