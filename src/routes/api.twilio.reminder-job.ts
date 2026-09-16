import { createFileRoute } from "@tanstack/react-router";
import { getReminderJob, getReminderJobByReminderId } from "@/lib/twilio/reminder-jobs";

async function reminderJobGet({ request }: { request: Request }) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  const reminderId = url.searchParams.get("reminderId");

  const job = jobId
    ? getReminderJob(jobId)
    : reminderId
      ? getReminderJobByReminderId(reminderId)
      : null;

  if (!job) {
    return Response.json({ ok: false, error: "Job not found." }, { status: 404 });
  }
  return Response.json({ ok: true, job });
}

export const Route = createFileRoute("/api/twilio/reminder-job")({
  server: {
    handlers: {
      GET: reminderJobGet,
    },
  },
});
