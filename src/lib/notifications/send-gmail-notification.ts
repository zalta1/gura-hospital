import {
  sendNotificationEmail,
  type SendNotificationEmailResult,
} from "../mail";
import type { SendGmailNotificationInput } from "./gmail-types";

export type { SendGmailNotificationInput } from "./gmail-types";
export type SendGmailNotificationResult = SendNotificationEmailResult;

/** @deprecated Prefer checking result.ok — kept for Vite plugin type narrowing. */
export class GmailNotificationError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "GmailNotificationError";
    this.status = status;
  }
}

/**
 * Server-only wrapper around sendNotificationEmail.
 * Never throws for send failures — returns a status object.
 */
export async function sendGmailNotification(
  input: SendGmailNotificationInput,
): Promise<SendGmailNotificationResult> {
  const { type, to, bookingId, ...data } = input;
  return sendNotificationEmail(type, to, data, {
    bookingId: bookingId ?? null,
  });
}
