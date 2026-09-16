import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { placeTwilioColdCall } from "./cold-call";
import { sendTwilioSms } from "../sms/twilio";
import type { ReminderJob, ReminderOutboundChannel } from "./reminder-job-types";

export type { ReminderJob, ReminderOutboundChannel } from "./reminder-job-types";

const jobs = new Map<string, ReminderJob>();
const byReminderId = new Map<string, string>();

function dataDir() {
  return path.resolve(process.cwd(), ".data");
}

function jobsFile() {
  return path.join(dataDir(), "twilio-reminder-jobs.json");
}

function persist() {
  try {
    mkdirSync(dataDir(), { recursive: true });
    writeFileSync(jobsFile(), JSON.stringify([...jobs.values()], null, 2), "utf8");
  } catch {
    // Best-effort local persistence for dev restarts.
  }
}

function hydrate() {
  try {
    const file = jobsFile();
    if (!existsSync(file)) return;
    const rows = JSON.parse(readFileSync(file, "utf8")) as ReminderJob[];
    for (const row of rows) {
      jobs.set(row.id, row);
      byReminderId.set(row.reminderId, row.id);
    }
  } catch {
    // Ignore corrupt/missing file.
  }
}

hydrate();

export function getReminderJob(jobId: string): ReminderJob | null {
  return jobs.get(jobId) ?? null;
}

export function getReminderJobByReminderId(reminderId: string): ReminderJob | null {
  const id = byReminderId.get(reminderId);
  return id ? (jobs.get(id) ?? null) : null;
}

export function listReminderJobs(): ReminderJob[] {
  return [...jobs.values()].sort((a, b) => a.runAt.localeCompare(b.runAt));
}

function upsertJob(job: ReminderJob) {
  jobs.set(job.id, job);
  byReminderId.set(job.reminderId, job.id);
  persist();
}

async function executeJob(job: ReminderJob): Promise<ReminderJob> {
  const running: ReminderJob = {
    ...job,
    status: "running",
    updatedAt: new Date().toISOString(),
  };
  upsertJob(running);

  try {
    if (job.channel === "cold_call") {
      const parts = [
        "Hello, this is Gura Hospital with a medication reminder.",
        job.drugName ? `Please take ${job.drugName}` : "Please take your prescribed medicine",
        job.dose ? `at a dose of ${job.dose}` : null,
        job.schedule ? `on this schedule: ${job.schedule}` : null,
        "as directed by your doctor. Goodbye.",
      ].filter(Boolean);
      const sayText = parts.join(" ");
      const result = await placeTwilioColdCall({ sayText });
      const sent: ReminderJob = {
        ...running,
        status: "sent",
        sid: result.sid,
        twilioStatus: result.status,
        to: result.to,
        from: result.from,
        detail: result.instruction,
        error: undefined,
        updatedAt: new Date().toISOString(),
      };
      upsertJob(sent);
      return sent;
    }

    const result = await sendTwilioSms();
    const sent: ReminderJob = {
      ...running,
      status: "sent",
      sid: result.sid,
      twilioStatus: result.status,
      to: result.to,
      from: result.from,
      detail: result.body,
      error: undefined,
      updatedAt: new Date().toISOString(),
    };
    upsertJob(sent);
    return sent;
  } catch (err) {
    const failed: ReminderJob = {
      ...running,
      status: "failed",
      error: err instanceof Error ? err.message : "Outbound reminder failed.",
      updatedAt: new Date().toISOString(),
    };
    upsertJob(failed);
    return failed;
  }
}

export type ScheduleReminderInput = {
  reminderId: string;
  patientId: string;
  medicationPlanId?: string | null;
  channel: ReminderOutboundChannel;
  scheduledTime: string;
  drugName?: string;
  dose?: string;
  schedule?: string;
};

/**
 * Schedule (or immediately run) an approved SMS / cold-call reminder.
 * If runAt is in the past (or within 5s), executes now.
 */
export async function scheduleReminderJob(input: ScheduleReminderInput): Promise<ReminderJob> {
  const runAtDate = new Date(input.scheduledTime);
  if (Number.isNaN(runAtDate.getTime())) {
    throw new Error("Invalid scheduledTime.");
  }

  const existingId = byReminderId.get(input.reminderId);
  if (existingId) {
    const existing = jobs.get(existingId);
    if (existing && (existing.status === "scheduled" || existing.status === "running")) {
      return existing;
    }
  }

  const now = Date.now();
  const runAtMs = runAtDate.getTime();
  const immediate = runAtMs <= now + 5_000;

  const job: ReminderJob = {
    id: randomUUID(),
    reminderId: input.reminderId,
    patientId: input.patientId,
    medicationPlanId: input.medicationPlanId ?? null,
    channel: input.channel,
    runAt: runAtDate.toISOString(),
    ...(input.drugName ? { drugName: input.drugName } : {}),
    ...(input.dose ? { dose: input.dose } : {}),
    ...(input.schedule ? { schedule: input.schedule } : {}),
    status: "scheduled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  upsertJob(job);

  if (immediate) {
    return executeJob(job);
  }
  return job;
}

export async function processDueReminderJobs(now = new Date()): Promise<ReminderJob[]> {
  const due = [...jobs.values()].filter(
    (j) => j.status === "scheduled" && new Date(j.runAt).getTime() <= now.getTime(),
  );
  const results: ReminderJob[] = [];
  for (const job of due) {
    results.push(await executeJob(job));
  }
  return results;
}
