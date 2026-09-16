import type { SendGmailNotificationInput } from "@/lib/notifications/gmail-types";
import type { SendNotificationEmailResult } from "@/lib/mail";

export type ClientGmailResult =
  | (SendNotificationEmailResult & { ok: true })
  | { ok: false; status: "failed"; error: string; error_message?: string; logId?: string };

/** Client-callable wrapper around POST /api/notifications/send-gmail. */
export async function requestGmailNotification(
  input: SendGmailNotificationInput,
): Promise<ClientGmailResult> {
  let res: Response;
  try {
    res = await fetch("/api/notifications/send-gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return {
      ok: false,
      status: "failed",
      error: "Could not reach the email notification API.",
      error_message: "Could not reach the email notification API.",
    };
  }

  const payload = (await res.json().catch(() => ({}))) as SendNotificationEmailResult & {
    error?: string;
  };

  if (!res.ok || payload.ok === false) {
    const message =
      payload.error_message || payload.error || `Email failed (HTTP ${res.status}).`;
    return {
      ok: false,
      status: "failed",
      error: message,
      error_message: message,
      ...(payload.logId ? { logId: payload.logId } : {}),
    };
  }

  return {
    ok: true,
    status: payload.status ?? "sent",
    ...(payload.messageId ? { messageId: payload.messageId } : {}),
    ...(payload.logId ? { logId: payload.logId } : {}),
  };
}
