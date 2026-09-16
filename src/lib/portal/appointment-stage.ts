import type { Database } from "@/integrations/supabase/types";

export type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

const PIPELINE_STAGES = new Set<string>([
  "pending_intake",
  "navigator_matched",
  "confirmed",
  "completed",
]);

/**
 * Admin boards group by pipeline_stage. Public bookings often only set status
 * (pending / requested / unassigned). Map those onto a board column so they
 * cannot disappear from /admin while still showing on /doctor.
 */
export function coercePipelineStage(input: {
  pipeline_stage?: string | null;
  status?: string | null;
}): PipelineStage {
  const stage = input.pipeline_stage?.trim();
  if (stage && PIPELINE_STAGES.has(stage)) return stage as PipelineStage;

  switch (input.status) {
    case "confirmed":
    case "scheduled":
      return "confirmed";
    case "completed":
    case "cancelled":
      return "completed";
    case "navigator_matched":
      return "navigator_matched";
    default:
      return "pending_intake";
  }
}

export function coerceAppointmentStatus(status: string | null | undefined): AppointmentStatus {
  switch (status) {
    case "confirmed":
    case "completed":
    case "cancelled":
    case "unassigned":
    case "pending":
      return status;
    case "requested":
    case "scheduled":
    case "new":
      return "pending";
    default:
      return "pending";
  }
}

export function isSchemaMismatchError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  return (
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("column")
  );
}
