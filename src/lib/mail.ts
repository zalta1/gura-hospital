import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

export type NotificationEmailType = "request_submitted" | "appointment_confirmed";

export type RequestSubmittedEmailData = {
  patientName: string;
  reasonForVisit: string;
};

export type AppointmentConfirmedEmailData = {
  patientName: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentDate: string;
  appointmentTime: string;
  /** Campus name or telehealth join instructions / link. */
  location: string;
};

export type NotificationEmailData = RequestSubmittedEmailData | AppointmentConfirmedEmailData;

export type SendNotificationEmailResult = {
  ok: boolean;
  status: "sent" | "mocked" | "failed";
  error_message?: string;
  messageId?: string;
  logId?: string;
};

export type NotificationsLogRow = {
  id: string;
  booking_id: string | null;
  type: NotificationEmailType;
  status: "sent" | "mocked" | "failed";
  error_message: string | null;
  sent_at: string;
};

function dataDir() {
  return path.resolve(process.cwd(), ".data");
}

function logFile() {
  return path.join(dataDir(), "notifications-log.json");
}

function readLogRows(): NotificationsLogRow[] {
  try {
    const file = logFile();
    if (!existsSync(file)) return [];
    const parsed = JSON.parse(readFileSync(file, "utf8")) as NotificationsLogRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendLocalLog(row: NotificationsLogRow) {
  try {
    mkdirSync(dataDir(), { recursive: true });
    const rows = readLogRows();
    rows.unshift(row);
    writeFileSync(logFile(), JSON.stringify(rows.slice(0, 500), null, 2), "utf8");
  } catch (err) {
    console.warn("[mail] could not persist notifications_log locally:", err);
  }
}

async function appendSupabaseLog(row: NotificationsLogRow) {
  const url = process.env["VITE_SUPABASE_URL"]?.trim() || process.env["SUPABASE_URL"]?.trim();
  const key =
    process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim() ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
    process.env["VITE_SUPABASE_ANON_KEY"]?.trim();
  if (!url || !key) return;

  try {
    await fetch(`${url.replace(/\/$/, "")}/rest/v1/notifications_log`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: row.id,
        booking_id: row.booking_id,
        type: row.type,
        status: row.status,
        error_message: row.error_message,
        sent_at: row.sent_at,
      }),
    });
  } catch (err) {
    console.warn("[mail] notifications_log supabase insert failed:", err);
  }
}

async function writeNotificationsLog(row: NotificationsLogRow) {
  appendLocalLog(row);
  await appendSupabaseLog(row);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildRequestSubmittedEmail(data: RequestSubmittedEmailData) {
  const subject = "Gura Hospital — visit request received";
  const text = [
    `Hello ${data.patientName},`,
    ``,
    `We received your visit intake request at Gura Hospital.`,
    ``,
    `Reason for visit: ${data.reasonForVisit}`,
    ``,
    `A care team member will follow up with a doctor assignment and confirmed appointment time.`,
    ``,
    `— Gura Hospital`,
  ].join("\n");

  const html = `
    <p>Hello ${escapeHtml(data.patientName)},</p>
    <p>We received your visit intake request at <strong>Gura Hospital</strong>.</p>
    <p><strong>Reason for visit:</strong> ${escapeHtml(data.reasonForVisit)}</p>
    <p>A care team member will follow up with a doctor assignment and confirmed appointment time.</p>
    <p>— Gura Hospital</p>
  `;

  return { subject, text, html };
}

function buildAppointmentConfirmedEmail(data: AppointmentConfirmedEmailData) {
  const timeLabel = data.appointmentTime.slice(0, 5);
  const subject = `Gura Hospital — appointment confirmed with ${data.doctorName}`;
  const text = [
    `Hello ${data.patientName},`,
    ``,
    `Your appointment at Gura Hospital has been confirmed.`,
    ``,
    `Doctor: ${data.doctorName}`,
    `Specialty: ${data.doctorSpecialty}`,
    `Date: ${data.appointmentDate}`,
    `Time: ${timeLabel}`,
    `Location / visit: ${data.location}`,
    ``,
    `If you need to reschedule, reply to this email or call the hospital.`,
    ``,
    `— Gura Hospital`,
  ].join("\n");

  const html = `
    <p>Hello ${escapeHtml(data.patientName)},</p>
    <p>Your appointment at <strong>Gura Hospital</strong> has been confirmed.</p>
    <ul>
      <li><strong>Doctor:</strong> ${escapeHtml(data.doctorName)}</li>
      <li><strong>Specialty:</strong> ${escapeHtml(data.doctorSpecialty)}</li>
      <li><strong>Date:</strong> ${escapeHtml(data.appointmentDate)}</li>
      <li><strong>Time:</strong> ${escapeHtml(timeLabel)}</li>
      <li><strong>Location / visit:</strong> ${escapeHtml(data.location)}</li>
    </ul>
    <p>If you need to reschedule, reply to this email or call the hospital.</p>
    <p>— Gura Hospital</p>
  `;

  return { subject, text, html };
}

function buildEmail(type: NotificationEmailType, data: NotificationEmailData) {
  if (type === "request_submitted") {
    return buildRequestSubmittedEmail(data as RequestSubmittedEmailData);
  }
  return buildAppointmentConfirmedEmail(data as AppointmentConfirmedEmailData);
}

function createTransport() {
  const user = process.env["GMAIL_USER"]?.trim();
  const pass = process.env["GMAIL_APP_PASSWORD"]?.trim();
  if (!user || !pass) return null;

  return {
    user,
    pass,
    from: process.env["GMAIL_FROM"]?.trim() || user,
    transporter: nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    }),
  };
}

/**
 * Server-only Gmail SMTP sender. Never throws — always returns a status object
 * so callers are never blocked by email failures.
 */
export async function sendNotificationEmail(
  type: NotificationEmailType,
  to: string,
  data: NotificationEmailData,
  options?: { bookingId?: string | null },
): Promise<SendNotificationEmailResult> {
  const bookingId = options?.bookingId?.trim() || null;
  const logId = randomUUID();
  const sentAt = new Date().toISOString();

  const finish = async (
    result: Omit<SendNotificationEmailResult, "logId">,
  ): Promise<SendNotificationEmailResult> => {
    await writeNotificationsLog({
      id: logId,
      booking_id: bookingId,
      type,
      status: result.status,
      error_message: result.error_message ?? null,
      sent_at: sentAt,
    });
    return { ...result, logId };
  };

  try {
    if (type !== "request_submitted" && type !== "appointment_confirmed") {
      return finish({
        ok: false,
        status: "failed",
        error_message: `Unsupported notification type: ${String(type)}`,
      });
    }

    const recipient = to?.trim();
    if (!recipient) {
      return finish({
        ok: false,
        status: "failed",
        error_message: "Patient email is required.",
      });
    }

    if (type === "request_submitted") {
      const d = data as RequestSubmittedEmailData;
      if (!d.patientName?.trim() || !d.reasonForVisit?.trim()) {
        return finish({
          ok: false,
          status: "failed",
          error_message: "patientName and reasonForVisit are required.",
        });
      }
    } else {
      const d = data as AppointmentConfirmedEmailData;
      if (
        !d.patientName?.trim() ||
        !d.doctorName?.trim() ||
        !d.doctorSpecialty?.trim() ||
        !d.appointmentDate?.trim() ||
        !d.appointmentTime?.trim() ||
        !d.location?.trim()
      ) {
        return finish({
          ok: false,
          status: "failed",
          error_message:
            "patientName, doctorName, doctorSpecialty, appointmentDate, appointmentTime, and location are required.",
        });
      }
    }

    const { subject, text, html } = buildEmail(type, data);
    const transport = createTransport();

    if (!transport) {
      console.info("[mail] mocked (missing GMAIL_USER / GMAIL_APP_PASSWORD)", {
        type,
        to: recipient,
        subject,
        bookingId,
      });
      return finish({ ok: true, status: "mocked" });
    }

    const info = await transport.transporter.sendMail({
      from: `Gura Hospital <${transport.from}>`,
      to: recipient,
      subject,
      text,
      html,
    });

    return finish({
      ok: true,
      status: "sent",
      messageId: info.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail send failed.";
    console.warn("[mail] send failed:", message);
    return finish({
      ok: false,
      status: "failed",
      error_message: message,
    });
  }
}
