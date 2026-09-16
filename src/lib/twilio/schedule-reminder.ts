import type { ReminderJob, ReminderOutboundChannel } from "@/lib/twilio/reminder-job-types";

export type { ReminderJob, ReminderOutboundChannel } from "@/lib/twilio/reminder-job-types";

export type ScheduleOutboundResult =
  | { ok: true; job: ReminderJob }
  | { ok: false; error: string; httpStatus: number };

export async function scheduleOutboundReminder(input: {
  reminderId: string;
  patientId: string;
  medicationPlanId?: string | null;
  channel: ReminderOutboundChannel;
  scheduledTime: string;
  drugName?: string;
  dose?: string;
  schedule?: string;
}): Promise<ScheduleOutboundResult> {
  let res: Response;
  try {
    res = await fetch("/api/twilio/schedule-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: "Could not reach the reminder scheduler.", httpStatus: 0 };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    job?: ReminderJob;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.job) {
    return {
      ok: false,
      error: payload.error || `Schedule failed (HTTP ${res.status}).`,
      httpStatus: res.status,
    };
  }

  return { ok: true, job: payload.job };
}

export async function fetchReminderJob(input: {
  jobId?: string;
  reminderId?: string;
}): Promise<ScheduleOutboundResult> {
  const params = new URLSearchParams();
  if (input.jobId) params.set("jobId", input.jobId);
  if (input.reminderId) params.set("reminderId", input.reminderId);

  let res: Response;
  try {
    res = await fetch(`/api/twilio/reminder-job?${params.toString()}`);
  } catch {
    return { ok: false, error: "Could not reach the reminder job API.", httpStatus: 0 };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    job?: ReminderJob;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.job) {
    return {
      ok: false,
      error: payload.error || `Job lookup failed (HTTP ${res.status}).`,
      httpStatus: res.status,
    };
  }

  return { ok: true, job: payload.job };
}
