/**
 * Server-only Twilio Voice cold-call helper. Never import from client components.
 */

export class TwilioVoiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "TwilioVoiceError";
    this.status = status;
  }
}

export type TwilioCallResult = {
  sid: string;
  status: string;
  to: string;
  from: string;
  instruction: string;
};

/** Official Twilio trial Voice template webhooks (Create Call `Url` param). */
export const TWILIO_VOICE_TEMPLATES = {
  text_to_speech: "https://webhooks.twilio.com/v1/Voice/Template/voice_text_to_speech",
  speech_recognition: "https://webhooks.twilio.com/v1/Voice/Template/voice_speech_recognition",
  keyboard_input: "https://webhooks.twilio.com/v1/Voice/Template/voice_keyboard_input",
  play_audio: "https://webhooks.twilio.com/v1/Voice/Template/voice_play_audio",
} as const;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new TwilioVoiceError(
      `Twilio Voice is not configured. Set ${name} (and the other TWILIO_* vars) in .env.`,
      503,
    );
  }
  return value;
}

/**
 * POC: always dial TWILIO_TEST_TO.
 * Trial accounts cannot pass custom Twiml — only an official template Url.
 * Prefer TWILIO_VOICE_FROM_NUMBER when set (Voice trial From can differ from SMS).
 */
export async function placeTwilioColdCall(options?: {
  /** Used only when TWILIO_VOICE_ALLOW_CUSTOM_TWIML=true (upgraded accounts). */
  sayText?: string;
}): Promise<TwilioCallResult> {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const to = requireEnv("TWILIO_TEST_TO");
  const from =
    process.env["TWILIO_VOICE_FROM_NUMBER"]?.trim() || requireEnv("TWILIO_FROM_NUMBER");

  const allowCustomTwiml = process.env["TWILIO_VOICE_ALLOW_CUSTOM_TWIML"]?.trim() === "true";
  const templateUrl =
    process.env["TWILIO_VOICE_TWIML_URL"]?.trim() || TWILIO_VOICE_TEMPLATES.text_to_speech;

  const form = new URLSearchParams({ To: to, From: from });

  if (allowCustomTwiml) {
    const sayText =
      options?.sayText?.trim() ||
      process.env["TWILIO_VOICE_SAY_TEXT"]?.trim() ||
      "Hello, this is Gura Hospital with a medication reminder. Please take your prescribed medicine as directed by your doctor. Goodbye.";
    const safe = sayText
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
    form.set(
      "Twiml",
      `<Response><Say voice="Polly.Joanna" language="en-US">${safe}</Say><Pause length="1"/><Hangup/></Response>`,
    );
  } else {
    form.set("Url", templateUrl);
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

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
    throw new TwilioVoiceError("Could not reach Twilio Voice.", 502);
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
    throw new TwilioVoiceError(detail, res.status >= 400 && res.status < 600 ? res.status : 502);
  }

  if (!payload.sid) {
    throw new TwilioVoiceError("Twilio did not return a call SID.", 502);
  }

  return {
    sid: payload.sid,
    status: payload.status ?? "queued",
    to,
    from,
    instruction: allowCustomTwiml ? "custom_twiml_say" : templateUrl,
  };
}
