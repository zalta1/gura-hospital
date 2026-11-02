import { createFileRoute } from "@tanstack/react-router";
import { authorizeOutboundApiRequest } from "@/lib/api-auth";
import { sendTwilioSms, TwilioSmsError } from "@/lib/sms/twilio";

async function sendSmsPost({ request }: { request: Request }) {
  const auth = authorizeOutboundApiRequest(request);
  if (!auth.authorized) {
    return Response.json({ ok: false, error: auth.reason || "Unauthorized" }, { status: 401 });
  }

  try {
    const json = (await request.json().catch(() => ({}))) as {
      body?: string;
      reminderId?: string;
      patientId?: string;
    };
    const result = await sendTwilioSms({
      ...(json.body ? { body: json.body } : {}),
    });
    return Response.json({
      ok: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      body: result.body,
      reminderId: json.reminderId ?? null,
      patientId: json.patientId ?? null,
    });
  } catch (err) {
    const status = err instanceof TwilioSmsError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Could not send SMS.";
    return Response.json({ ok: false, error: message }, { status });
  }
}

export const Route = createFileRoute("/api/twilio/send-sms")({
  server: {
    handlers: {
      POST: sendSmsPost,
    },
  },
});
