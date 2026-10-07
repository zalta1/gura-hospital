import { createFileRoute } from "@tanstack/react-router";
import { AvailabilityError, type BlockDraft } from "@/lib/portal/availability";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function fail(error: unknown) {
  const { availabilityErrorResponse } = await import("@/lib/portal/availability.server");
  return availabilityErrorResponse(error);
}

async function postBlock({ request }: { request: Request }) {
  try {
    const { requireDoctorId, createDoctorBlock } = await import("@/lib/portal/availability.server");
    const { doctorId } = await requireDoctorId(request);
    const body = (await request.json()) as { draft?: unknown };
    if (!isRecord(body.draft)) throw new AvailabilityError("validation", "Choose a time to block.");
    const draft: BlockDraft = {
      startsAt: typeof body.draft["startsAt"] === "string" ? body.draft["startsAt"] : "",
      endsAt: typeof body.draft["endsAt"] === "string" ? body.draft["endsAt"] : "",
    };
    if (typeof body.draft["doctorId"] === "string") draft.doctorId = body.draft["doctorId"];
    return Response.json({ block: await createDoctorBlock(doctorId, draft) });
  } catch (error) {
    return fail(error);
  }
}

async function deleteBlock({ request }: { request: Request }) {
  try {
    const { requireDoctorId, deleteDoctorBlock } = await import("@/lib/portal/availability.server");
    const { doctorId } = await requireDoctorId(request);
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) throw new AvailabilityError("validation", "Choose a block to remove.");
    await deleteDoctorBlock(doctorId, id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export const Route = createFileRoute("/api/doctor/blocks")({
  server: {
    handlers: {
      POST: postBlock,
      DELETE: deleteBlock,
    },
  },
});
