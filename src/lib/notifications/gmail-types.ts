import type {
  AppointmentConfirmedEmailData,
  NotificationEmailType,
  RequestSubmittedEmailData,
} from "@/lib/mail";

export type GmailNotificationType = NotificationEmailType;

export type RequestSubmittedPayload = {
  type: "request_submitted";
  to: string;
  bookingId?: string | null;
} & RequestSubmittedEmailData;

export type AppointmentConfirmedPayload = {
  type: "appointment_confirmed";
  to: string;
  bookingId?: string | null;
} & AppointmentConfirmedEmailData;

export type SendGmailNotificationInput = RequestSubmittedPayload | AppointmentConfirmedPayload;
