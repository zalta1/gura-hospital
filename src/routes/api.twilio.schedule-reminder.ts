import { createFileRoute } from "@tanstack/react-router";
import { authorizeOutboundApiRequest } from "@/lib/api-auth";
import {
  scheduleReminderJob,
  type ReminderOutboundChannel,
} from "@/lib/twilio/reminder-jobs";

async function schedulePost({ request }: { request: Request }) {
  const auth = authorizeOutboundApiRequest(request);
  if (!auth.authorized) {
    return Response.json({ ok: false, error: auth.reason || "Unauthorized" }, { status: 401 });
  }

  try {
    const json = (await request.json()) as {
      reminderId?: string;
      patientId?: string;
      medicationPlanId?: string | null;
      channel?: ReminderOutboundChannel;
      scheduledTime?: string;
      drugName?: string;
      dose?: string;
      schedule?: string;
    };

    if (!json.reminderId || !json.patientId || !json.channel || !json.scheduledTime) {
      return Response.json(
        { ok: false, error: "reminderId, patientId, channel, and scheduledTime are required." },
        { status: 400 },
      );
    }
    if (json.channel !== "sms" && json.channel !== "cold_call") {
      return Response.json({ ok: false, error: "channel must be sms or cold_call." }, { status: 400 });
    }

    const job = await scheduleReminderJob({
      reminderId: json.reminderId,
      patientId: json.patientId,
      medicationPlanId: json.medicationPlanId ?? null,
      channel: json.channel,
      scheduledTime: json.scheduledTime,
      ...(json.drugName ? { drugName: json.drugName } : {}),
      ...(json.dose ? { dose: json.dose } : {}),
      ...(json.schedule ? { schedule: json.schedule } : {}),
    });

    return Response.json({ ok: true, job });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not schedule reminder.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/twilio/schedule-reminder")({
  server: {
    handlers: {
      POST: schedulePost,
    },
  },
});
