import { createFileRoute } from "@tanstack/react-router";
import { AvailabilityError, type WindowDraft } from "@/lib/portal/availability";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readDraft(value: unknown): WindowDraft {
  if (!isRecord(value)) throw new AvailabilityError("validation", "Availability details are incomplete.");
  const draft: WindowDraft = {
    date: typeof value["date"] === "string" ? value["date"] : null,
    weekday: typeof value["weekday"] === "number" ? value["weekday"] : null,
    startTime: typeof value["startTime"] === "string" ? value["startTime"] : "",
    endTime: typeof value["endTime"] === "string" ? value["endTime"] : "",
    visitType: value["visitType"] === "telehealth" ? "telehealth" : "in_person",
    location: typeof value["location"] === "string" ? value["location"] : null,
    recurring: Boolean(value["recurring"]),
    recurrenceEndDate: typeof value["recurrenceEndDate"] === "string" ? value["recurrenceEndDate"] : null,
  };
  if (typeof value["doctorId"] === "string") draft.doctorId = value["doctorId"];
  return draft;
}

async function fail(error: unknown) {
  const { availabilityErrorResponse } = await import("@/lib/portal/availability.server");
  return availabilityErrorResponse(error);
}

async function getAvailability({ request }: { request: Request }) {
  try {
    const { requireDoctorId, doctorSchedule } = await import("@/lib/portal/availability.server");
    const { doctorId } = await requireDoctorId(request);
    const date = new URL(request.url).searchParams.get("date") ?? undefined;
    return Response.json(await doctorSchedule(doctorId, date));
  } catch (error) {
    return fail(error);
  }
}

async function postAvailability({ request }: { request: Request }) {
  try {
    const { requireDoctorId, createDoctorWindows } = await import("@/lib/portal/availability.server");
    const { doctorId } = await requireDoctorId(request);
    const body = (await request.json()) as { drafts?: unknown[] };
    const drafts = (body.drafts ?? []).map(readDraft);
    if (drafts.length === 0) throw new AvailabilityError("validation", "Add at least one availability window.");
    return Response.json({ windows: await createDoctorWindows(doctorId, drafts) });
  } catch (error) {
    return fail(error);
  }
}

async function patchAvailability({ request }: { request: Request }) {
  try {
    const { requireDoctorId, updateDoctorWindow } = await import("@/lib/portal/availability.server");
    const { doctorId } = await requireDoctorId(request);
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const body = (await request.json()) as { draft?: unknown };
    if (!id || !body.draft) throw new AvailabilityError("validation", "Choose a window to update.");
    return Response.json({ window: await updateDoctorWindow(doctorId, id, readDraft(body.draft)) });
  } catch (error) {
    return fail(error);
  }
}

async function deleteAvailability({ request }: { request: Request }) {
  try {
    const { requireDoctorId, deleteDoctorWindow } = await import("@/lib/portal/availability.server");
    const { doctorId } = await requireDoctorId(request);
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) throw new AvailabilityError("validation", "Choose a window to remove.");
    await deleteDoctorWindow(doctorId, id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export const Route = createFileRoute("/api/doctor/availability")({
  server: {
    handlers: {
      GET: getAvailability,
      POST: postAvailability,
      PATCH: patchAvailability,
      DELETE: deleteAvailability,
    },
  },
});
