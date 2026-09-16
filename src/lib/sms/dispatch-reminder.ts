export type SmsDispatchSuccess = {
  ok: true;
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
};

export type SmsDispatchFailure = {
  ok: false;
  error: string;
  httpStatus: number;
};

export type SmsDispatchResult = SmsDispatchSuccess | SmsDispatchFailure;

/**
 * Client-callable: hits the server Twilio route. Secrets stay on the server.
 * POC always texts TWILIO_TEST_TO (configured server-side).
 */
export async function dispatchSmsReminder(input: {
  reminderId: string;
  patientId: string;
  medicationPlanId?: string | null;
}): Promise<SmsDispatchResult> {
  let res: Response;
  try {
    res = await fetch("/api/twilio/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reminderId: input.reminderId,
        patientId: input.patientId,
        medicationPlanId: input.medicationPlanId ?? null,
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach the SMS API.", httpStatus: 0 };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    sid?: string;
    status?: string;
    to?: string;
    from?: string;
    body?: string;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.sid) {
    return {
      ok: false,
      error: payload.error || `SMS send failed (HTTP ${res.status}).`,
      httpStatus: res.status,
    };
  }

  return {
    ok: true,
    sid: payload.sid,
    status: payload.status ?? "queued",
    to: payload.to ?? "",
    from: payload.from ?? "",
    body: payload.body ?? "",
  };
}
