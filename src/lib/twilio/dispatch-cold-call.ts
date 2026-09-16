export type ColdCallDispatchSuccess = {
  ok: true;
  sid: string;
  status: string;
  to: string;
  from: string;
  sayText: string;
};

export type ColdCallDispatchFailure = {
  ok: false;
  error: string;
  httpStatus: number;
};

export type ColdCallDispatchResult = ColdCallDispatchSuccess | ColdCallDispatchFailure;

/** Client-callable: hits the server Voice route. Secrets stay on the server. */
export async function dispatchColdCallReminder(input: {
  reminderId: string;
  patientId: string;
  medicationPlanId?: string | null;
  drugName?: string;
  dose?: string;
  schedule?: string;
}): Promise<ColdCallDispatchResult> {
  let res: Response;
  try {
    res = await fetch("/api/twilio/cold-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reminderId: input.reminderId,
        patientId: input.patientId,
        medicationPlanId: input.medicationPlanId ?? null,
        drugName: input.drugName,
        dose: input.dose,
        schedule: input.schedule,
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach the cold-call API.", httpStatus: 0 };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    sid?: string;
    status?: string;
    to?: string;
    from?: string;
    sayText?: string;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.sid) {
    return {
      ok: false,
      error: payload.error || `Cold call failed (HTTP ${res.status}).`,
      httpStatus: res.status,
    };
  }

  return {
    ok: true,
    sid: payload.sid,
    status: payload.status ?? "queued",
    to: payload.to ?? "",
    from: payload.from ?? "",
    sayText: payload.sayText ?? "",
  };
}
