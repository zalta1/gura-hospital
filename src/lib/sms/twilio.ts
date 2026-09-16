/**
 * Server-only Twilio SMS helper. Never import from client components —
 * it reads TWILIO_* secrets from process.env.
 */

export class TwilioSmsError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "TwilioSmsError";
    this.status = status;
  }
}

export type TwilioSendResult = {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new TwilioSmsError(
      `Twilio is not configured. Set ${name} (and the other TWILIO_* vars) in .env.`,
      503,
    );
  }
  return value;
}

/** POC: always send to TWILIO_TEST_TO, never the patient chart phone. */
export async function sendTwilioSms(options?: {
  /** Override body; defaults to TWILIO_SMS_BODY or sms_appointment_reminders */
  body?: string;
}): Promise<TwilioSendResult> {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const from = requireEnv("TWILIO_FROM_NUMBER");
  const to = requireEnv("TWILIO_TEST_TO");
  const body =
    options?.body?.trim() ||
    process.env["TWILIO_SMS_BODY"]?.trim() ||
    "sms_appointment_reminders";

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: from, Body: body });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  } catch {
    throw new TwilioSmsError("Could not reach Twilio.", 502);
  }

  const payload = (await res.json().catch(() => ({}))) as {
    sid?: string;
    status?: string;
    message?: string;
    error_message?: string;
    code?: number;
  };

  if (!res.ok) {
    const detail =
      [payload.code ? `Twilio ${payload.code}` : null, payload.message || payload.error_message]
        .filter(Boolean)
        .join(": ") || `Twilio HTTP ${res.status}`;
    throw new TwilioSmsError(detail, res.status >= 400 && res.status < 600 ? res.status : 502);
  }

  if (!payload.sid) {
    throw new TwilioSmsError("Twilio did not return a message SID.", 502);
  }

  return {
    sid: payload.sid,
    status: payload.status ?? "queued",
    to,
    from,
    body,
  };
}
