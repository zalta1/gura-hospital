import { createFileRoute } from "@tanstack/react-router";
import { authorizeOutboundApiRequest } from "@/lib/api-auth";
import {
  sendGmailNotification,
  type SendGmailNotificationInput,
} from "@/lib/notifications/send-gmail-notification";

async function sendGmailPost({ request }: { request: Request }) {
  const auth = authorizeOutboundApiRequest(request);
  if (!auth.authorized) {
    return Response.json({ ok: false, status: "failed", error_message: auth.reason || "Unauthorized" }, { status: 401 });
  }

  try {
    const json = (await request.json()) as SendGmailNotificationInput;
    const result = await sendGmailNotification(json);
    // Always 200 — callers treat result.ok / result.status; email must not block flows.
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send email.";
    return Response.json(
      { ok: false, status: "failed", error_message: message },
      { status: 200 },
    );
  }
}

export const Route = createFileRoute("/api/notifications/send-gmail")({
  server: {
    handlers: {
      POST: sendGmailPost,
    },
  },
});
