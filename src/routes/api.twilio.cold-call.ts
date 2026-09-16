import { createFileRoute } from "@tanstack/react-router";
import { placeTwilioColdCall, TwilioVoiceError } from "@/lib/twilio/cold-call";

async function coldCallPost({ request }: { request: Request }) {
  try {
    const json = (await request.json().catch(() => ({}))) as {
      sayText?: string;
      reminderId?: string;
      patientId?: string;
      drugName?: string;
      dose?: string;
      schedule?: string;
    };

    let sayText = json.sayText?.trim();
    if (!sayText && (json.drugName || json.dose || json.schedule)) {
      const parts = [
        "Hello, this is Gura Hospital with a medication reminder.",
        json.drugName ? `Please take ${json.drugName}` : "Please take your prescribed medicine",
        json.dose ? `at a dose of ${json.dose}` : null,
        json.schedule ? `on this schedule: ${json.schedule}` : null,
        "as directed by your doctor. Goodbye.",
      ].filter(Boolean);
      sayText = parts.join(" ");
    }

    const result = await placeTwilioColdCall({
      ...(sayText ? { sayText } : {}),
    });

    return Response.json({
      ok: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      sayText: result.instruction,
      instruction: result.instruction,
      reminderId: json.reminderId ?? null,
      patientId: json.patientId ?? null,
    });
  } catch (err) {
    const status = err instanceof TwilioVoiceError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Could not place cold call.";
    return Response.json({ ok: false, error: message }, { status });
  }
}

export const Route = createFileRoute("/api/twilio/cold-call")({
  server: {
    handlers: {
      POST: coldCallPost,
    },
  },
});
