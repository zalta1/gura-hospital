import { createFileRoute } from "@tanstack/react-router";
import { toPublicSlot } from "@/lib/portal/availability";

async function getSlots({ request }: { request: Request }) {
  const url = new URL(request.url);
  const doctorId = url.searchParams.get("doctorId") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!doctorId || !from || !to) {
    return Response.json({ error: "doctorId, from, and to are required." }, { status: 400 });
  }
  try {
    const { isLocalPortalDemo } = await import("@/lib/portal/local-demo");
    if (isLocalPortalDemo()) {
      const { fetchFreeSlots } = await import("@/lib/portal/availability-api");
      const slots = await fetchFreeSlots(doctorId, from, to);
      return Response.json({ slots: slots.map((slot) => toPublicSlot(slot)) });
    }
    const { publicFreeSlots } = await import("@/lib/portal/availability.server");
    return Response.json({ slots: await publicFreeSlots(doctorId, from, to) });
  } catch (error) {
    const { availabilityErrorResponse } = await import("@/lib/portal/availability.server");
    return availabilityErrorResponse(error);
  }
}

async function bookSlot({ request }: { request: Request }) {
  try {
    const { isLocalPortalDemo } = await import("@/lib/portal/local-demo");
    if (isLocalPortalDemo()) {
      return Response.json(
        { error: "Demo bookings are saved on this device.", code: "validation", affected: [] },
        { status: 400 },
      );
    }
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      dob?: string;
      insurance?: string;
      reason?: string;
      preferredSpecialty?: string;
      visitPreference?: string;
      doctorSlug?: string;
      startsAt?: string;
    };
    const { bookPublicSlot } = await import("@/lib/portal/availability.server");
    const appointmentId = await bookPublicSlot(body);
    return Response.json({ appointmentId });
  } catch (error) {
    const { availabilityErrorResponse } = await import("@/lib/portal/availability.server");
    return availabilityErrorResponse(error);
  }
}

export const Route = createFileRoute("/api/slots")({
  server: {
    handlers: {
      GET: getSlots,
      POST: bookSlot,
    },
  },
});
