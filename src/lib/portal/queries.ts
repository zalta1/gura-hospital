import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  coerceAppointmentStatus,
  coercePipelineStage,
  isSchemaMismatchError,
} from "@/lib/portal/appointment-stage";
import { doctorIdForSlug, isLocalPortalDemo } from "@/lib/portal/local-demo";
import { combineAppointmentDateTime } from "@/lib/portal/appointment-slot";
import { requestGmailNotification } from "@/lib/notifications/request-gmail-notification";
import * as local from "@/lib/portal/local-store";
import type { AssignAppointmentSlot } from "@/lib/portal/local-store";
import { scheduleOutboundReminder, fetchReminderJob } from "@/lib/twilio/schedule-reminder";
import type { OutboundReminderMeta, ReminderJob } from "@/lib/twilio/reminder-job-types";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
export type Staff = Database["public"]["Tables"]["staff"]["Row"];
export type Billing = Database["public"]["Tables"]["billing_records"]["Row"];
export type Inventory = Database["public"]["Tables"]["inventory_items"]["Row"];
export type Audit = Database["public"]["Tables"]["audit_log"]["Row"];
export type AiActivity = Database["public"]["Tables"]["ai_activity"]["Row"];
export type AiFollowup = Database["public"]["Tables"]["ai_followups"]["Row"];
export type Report = Database["public"]["Tables"]["patient_reports"]["Row"];
export type MedPlan = Database["public"]["Tables"]["medication_plans"]["Row"];
export type Reminder = Database["public"]["Tables"]["ai_reminders"]["Row"];

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function writeAudit(
  action: string,
  target_table?: string,
  target_id?: string,
  detail?: string,
) {
  if (isLocalPortalDemo()) return local.writeAudit(action, target_table, target_id, detail);
  const row: Database["public"]["Tables"]["audit_log"]["Insert"] = { action };
  if (target_table) row.target_table = target_table;
  if (target_id) row.target_id = target_id;
  if (detail) row.detail = detail;
  const { error } = await supabase.from("audit_log").insert(row);
  throwIf(error);
}

export type OverviewStats = {
  todaysAppointments: number;
  unassignedCount: number;
  pendingCount: number;
  doctorsOnShift: number;
  bedsInUseEstimate: number;
  aiCallsInProgress: number;
  escalationCount: number;
  aiActivityCount: number;
  staffCount: number;
};

export type AdminActivityItem = {
  id: string;
  at: string;
  kind: "booking" | "ai" | "escalation" | "audit" | "intake";
  title: string;
  detail: string;
  href: string;
};

function statsFromAppointments(
  rows: AppointmentRow[],
  extras: {
    doctorsOnShift: number;
    aiCallsInProgress: number;
    escalationCount: number;
    aiActivityCount: number;
    staffCount: number;
  },
): OverviewStats {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const todays = rows.filter((a) => {
    const t = new Date(a.datetime).getTime();
    return t >= start.getTime() && t <= end.getTime() && a.status !== "cancelled";
  });
  return {
    todaysAppointments: todays.length,
    unassignedCount: rows.filter((a) => isUnassignedAppointment(a) && a.status !== "cancelled").length,
    pendingCount: rows.filter(
      (a) => a.status !== "cancelled" && coercePipelineStage(a) === "pending_intake",
    ).length,
    doctorsOnShift: extras.doctorsOnShift,
    bedsInUseEstimate: todays.filter((a) => a.status === "confirmed" && a.visit_type === "in_person").length,
    aiCallsInProgress: extras.aiCallsInProgress,
    escalationCount: extras.escalationCount,
    aiActivityCount: extras.aiActivityCount,
    staffCount: extras.staffCount,
  };
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  if (isLocalPortalDemo()) {
    const [rest, rows, aiRows, staffRows] = await Promise.all([
      local.fetchOverviewStats(),
      local.fetchAppointments(),
      local.fetchAiActivity(),
      local.fetchStaff(),
    ]);
    return statsFromAppointments(rows.map(normalizeAppointmentRow), {
      doctorsOnShift: rest.doctorsOnShift,
      aiCallsInProgress: rest.aiCallsInProgress,
      escalationCount: rest.escalationCount,
      aiActivityCount: aiRows.length,
      staffCount: staffRows.length,
    });
  }

  const [rows, aiRows, staffRows, doctors, reminders, escalations] = await Promise.all([
    fetchAppointments(),
    fetchAiActivity().catch(() => []),
    fetchStaff().catch(() => []),
    fetchDoctors().catch(() => []),
    supabase
      .from("ai_reminders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "sent"]),
    supabase
      .from("ai_followups")
      .select("id", { count: "exact", head: true })
      .or("status.eq.escalated,summary_json->>escalation_flag.eq.true"),
  ]);

  return statsFromAppointments(rows, {
    doctorsOnShift: doctors.filter((d) => d.on_shift).length || doctors.length,
    aiCallsInProgress: reminders.error ? 0 : (reminders.count ?? 0),
    escalationCount: escalations.error ? 0 : (escalations.count ?? 0),
    aiActivityCount: aiRows.length,
    staffCount: staffRows.length,
  });
}

async function optionalList<T>(fn: () => Promise<T[]>, fallback: T[] = []): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    if (isSchemaMismatchError(err as { message?: string; code?: string })) return fallback;
    if (isLocalPortalDemo()) return fallback;
    throw err;
  }
}

export async function fetchAdminDashboard() {
  const [stats, appointments, ai, escalations, audit] = await Promise.all([
    fetchOverviewStats(),
    fetchAppointments(),
    optionalList(() => fetchAiActivity()),
    optionalList(() => fetchEscalations()),
    optionalList(async () => (await fetchAuditLog()) as Array<Record<string, unknown>>),
  ]);

  const activity: AdminActivityItem[] = [];
  for (const row of appointments) {
    activity.push({
      id: `booking-${row.id}`,
      at: row.created_at || row.datetime,
      kind: "booking",
      title: row.patients?.full_name ?? "Booking request",
      detail: `${row.doctors?.name ?? "Unassigned"} · ${row.reason_for_visit ?? "Appointment request"}`,
      href: "/admin/appointments",
    });
  }
  for (const row of ai) {
    activity.push({
      id: `ai-${row.id}`,
      at: row.created_at,
      kind: "ai",
      title: row.patients?.full_name ?? "AI activity",
      detail: `${row.activity_type} · ${row.outcome}`,
      href: "/admin/ai-activity",
    });
  }
  for (const row of escalations) {
    activity.push({
      id: `esc-${row.id}`,
      at: row.follow_up_date ?? row.created_at ?? new Date().toISOString(),
      kind: "escalation",
      title: row.patients?.full_name ?? "Escalation",
      detail: row.doctors?.name ? `Assigned to ${row.doctors.name}` : "Needs clinical review",
      href: "/admin/escalations",
    });
  }
  for (const row of audit) {
    activity.push({
      id: `audit-${String(row["id"] ?? crypto.randomUUID())}`,
      at: String(row["timestamp"] ?? new Date().toISOString()),
      kind: "audit",
      title: String(row["action"] ?? "Audit"),
      detail: String(row["detail"] ?? row["target_table"] ?? "Staff action"),
      href: "/admin/audit",
    });
  }

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    stats,
    appointments,
    unassigned: appointments.filter((row) => isUnassignedAppointment(row) && row.status !== "cancelled"),
    activity: activity.slice(0, 25),
  };
}

export type AppointmentRow = Appointment & {
  patients: Pick<Patient, "id" | "full_name" | "phone" | "email" | "dob" | "insurance"> | null;
  doctors: Pick<Doctor, "id" | "name" | "specialty"> | null;
};
export type AppointmentWithRelations = AppointmentRow;

const APPOINTMENT_SELECT =
  "*, patients(id, full_name, phone, email, dob, insurance), doctors(id, name, specialty)";

const CLOUD_APPOINTMENT_SELECT =
  "id, patient_id, provider_id, facility_id, care_request_id, appointment_time, appointment_type, status, created_at, patients(id, first_name, last_name, email, phone, date_of_birth), providers(id, first_name, last_name, specialty, slug), care_requests(reason_for_visit, preferred_specialty, visit_preference, preferred_facility, insurance_provider)";

export function isUnassignedAppointment(row: AppointmentRow) {
  return !row.doctor_id || row.status === "unassigned";
}

function displayName(person: { first_name?: string | null; last_name?: string | null } | null | undefined) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim();
}

function campusFromSlug(slug: string | null | undefined, visitType: Appointment["visit_type"]) {
  if (slug === "alder-bay") return "Alder Bay";
  if (slug === "telehealth" || visitType === "telehealth") return "Telehealth";
  return "Fairmont Ridge";
}

function applyAppointmentFilters(
  rows: AppointmentRow[],
  filters?: { doctorId?: string; specialty?: string; campus?: string; date?: string },
) {
  let next = rows;
  if (filters?.doctorId) next = next.filter((r) => r.doctor_id === filters.doctorId);
  if (filters?.campus) next = next.filter((r) => r.campus === filters.campus);
  if (filters?.date) {
    next = next.filter((r) => {
      if (r.appointment_date) return r.appointment_date === filters.date;
      const day = new Date(filters.date!);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      const t = new Date(r.datetime).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  }
  if (filters?.specialty) {
    next = next.filter(
      (r) => r.doctors?.specialty === filters.specialty || r.preferred_specialty === filters.specialty,
    );
  }
  return next;
}

export function normalizeAppointmentRow(row: AppointmentRow): AppointmentRow {
  return {
    ...row,
    status: coerceAppointmentStatus(row.status),
    pipeline_stage: coercePipelineStage(row),
    patients: row.patients
      ? { ...row.patients, full_name: row.patients.full_name?.trim() || "Patient" }
      : row.patients,
  };
}

function mapCloudAppointment(raw: Record<string, unknown>): AppointmentRow {
  const patients = raw["patients"] as
    | {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        phone?: string | null;
        date_of_birth?: string | null;
        dob?: string | null;
        insurance?: string | null;
        full_name?: string | null;
      }
    | null;
  const providers = raw["providers"] as
    | {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        specialty?: string | null;
        slug?: string | null;
      }
    | null;
  const doctors = raw["doctors"] as { id: string; name: string; specialty: string } | null;
  const care = raw["care_requests"] as
    | {
        reason_for_visit?: string | null;
        preferred_specialty?: string | null;
        visit_preference?: string | null;
        preferred_facility?: string | null;
        insurance_provider?: string | null;
      }
    | null;
  const status = coerceAppointmentStatus(typeof raw["status"] === "string" ? raw["status"] : "pending");
  const visitPref = care?.visit_preference ?? (typeof raw["appointment_type"] === "string" ? raw["appointment_type"] : null);
  const visitType: Appointment["visit_type"] = visitPref === "telehealth" ? "telehealth" : "in_person";
  const providerSlug = providers?.slug ?? null;
  const cloudProviderId =
    (typeof raw["doctor_id"] === "string" ? raw["doctor_id"] : null) ??
    (typeof raw["provider_id"] === "string" ? raw["provider_id"] : null);
  const doctorId =
    isLocalPortalDemo() && providerSlug ? doctorIdForSlug(providerSlug) : cloudProviderId;
  const datetime =
    (typeof raw["datetime"] === "string" && raw["datetime"]) ||
    (typeof raw["appointment_time"] === "string" && raw["appointment_time"]) ||
    (typeof raw["created_at"] === "string" ? raw["created_at"] : new Date().toISOString());
  const providerName = displayName(providers);
  return normalizeAppointmentRow({
    id: String(raw["id"]),
    patient_id: String(raw["patient_id"]),
    doctor_id: doctorId,
    datetime,
    appointment_date:
      typeof raw["appointment_date"] === "string" ? raw["appointment_date"] : null,
    appointment_time:
      typeof raw["appointment_time"] === "string" &&
      !String(raw["appointment_time"]).includes("T")
        ? String(raw["appointment_time"])
        : null,
    status,
    pipeline_stage: coercePipelineStage({
      pipeline_stage: typeof raw["pipeline_stage"] === "string" ? raw["pipeline_stage"] : null,
      status,
    }),
    reason_for_visit:
      care?.reason_for_visit ?? (typeof raw["reason_for_visit"] === "string" ? raw["reason_for_visit"] : null),
    preferred_specialty:
      care?.preferred_specialty ??
      (typeof raw["preferred_specialty"] === "string" ? raw["preferred_specialty"] : null),
    visit_preference: visitPref,
    visit_type: visitType,
    campus:
      (typeof raw["campus"] === "string" && raw["campus"]) ||
      campusFromSlug(care?.preferred_facility, visitType),
    created_at: typeof raw["created_at"] === "string" ? raw["created_at"] : datetime,
    patients: patients
      ? {
          id: patients.id,
          full_name: patients.full_name?.trim() || displayName(patients) || "Patient",
          phone: patients.phone ?? null,
          email: patients.email ?? null,
          dob: patients.date_of_birth ?? patients.dob ?? null,
          insurance: patients.insurance ?? care?.insurance_provider ?? null,
        }
      : null,
    doctors: doctors
      ? doctors
      : providers
        ? {
            id: providers.id,
            name: providerName ? `Dr. ${providerName}` : "Provider",
            specialty: providers.specialty ?? "",
          }
        : null,
  });
}

type AppointmentFilters = {
  doctorId?: string;
  specialty?: string;
  campus?: string;
  date?: string;
};

async function fetchPortalAppointments(filters?: AppointmentFilters) {
  let q = supabase.from("appointments").select(APPOINTMENT_SELECT).order("datetime", { ascending: false });
  if (filters?.doctorId) q = q.eq("doctor_id", filters.doctorId);
  if (filters?.campus) q = q.eq("campus", filters.campus);
  if (filters?.date) {
    const day = new Date(filters.date);
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    q = q.gte("datetime", start.toISOString()).lte("datetime", end.toISOString());
  }
  const { data, error } = await q;
  if (error) return { ok: false as const, error };
  return { ok: true as const, rows: (data ?? []) as unknown as AppointmentRow[] };
}

async function fetchCloudAppointments(filters?: AppointmentFilters) {
  const db = supabase as unknown as { from: (table: string) => Record<string, (...args: never[]) => unknown> };
  let q: any = db.from("appointments").select(CLOUD_APPOINTMENT_SELECT).order("appointment_time", {
    ascending: false,
  });
  // Local demo doctor IDs are slug-derived and will not match providers.id.
  if (filters?.doctorId && !isLocalPortalDemo()) q = q.eq("provider_id", filters.doctorId);
  if (filters?.date) {
    const day = new Date(filters.date);
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    q = q.gte("appointment_time", start.toISOString()).lte("appointment_time", end.toISOString());
  }
  const { data, error } = (await q) as {
    data: Record<string, unknown>[] | null;
    error: { message: string; code?: string } | null;
  };
  if (error) return { ok: false as const, error };
  return { ok: true as const, rows: (data ?? []).map(mapCloudAppointment) };
}

function mergeAppointmentRows(rows: AppointmentRow[]) {
  const byId = new Map<string, AppointmentRow>();
  const byFingerprint = new Map<string, string>();
  const fingerprint = (row: AppointmentRow) =>
    `${(row.patients?.email ?? "").toLowerCase()}|${row.reason_for_visit ?? ""}|${(row.datetime ?? "").slice(0, 16)}`;
  for (const row of rows) {
    const fp = fingerprint(row);
    const existing = byFingerprint.get(fp);
    if (existing && existing !== row.id) continue;
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
      byFingerprint.set(fp, row.id);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  );
}

async function fetchRemoteAppointments(filters?: AppointmentFilters) {
  const [portal, cloud] = await Promise.all([
    fetchPortalAppointments(filters),
    fetchCloudAppointments(filters),
  ]);
  const rows: AppointmentRow[] = [];
  if (portal.ok) rows.push(...portal.rows.map(normalizeAppointmentRow));
  if (cloud.ok) rows.push(...cloud.rows);
  if (!portal.ok && !cloud.ok) {
    throwIf(portal.error ?? cloud.error);
  }
  return applyAppointmentFilters(mergeAppointmentRows(rows), {
    doctorId: filters?.doctorId,
    specialty: filters?.specialty,
    campus: filters?.campus,
  });
}

export async function fetchAppointments(filters?: AppointmentFilters) {
  if (isLocalPortalDemo()) {
    return (await local.fetchAppointments(filters)).map(normalizeAppointmentRow);
  }
  return fetchRemoteAppointments(filters);
}

export type AiActivityRow = AiActivity & {
  patients: Pick<Patient, "id" | "full_name"> | null;
};

export async function fetchAiActivity() {
  if (isLocalPortalDemo()) return local.fetchAiActivity();
  const { data, error } = await supabase
    .from("ai_activity")
    .select("*, patients(id, full_name)")
    .order("created_at", { ascending: false });
  if (error) {
    if (isSchemaMismatchError(error)) return [];
    throwIf(error);
  }
  const rows = (data ?? []) as unknown as AiActivityRow[];
  return rows.sort((a, b) => {
    const ae = a.outcome === "escalated" ? 0 : 1;
    const be = b.outcome === "escalated" ? 0 : 1;
    if (ae !== be) return ae - be;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export type EscalationRow = AiFollowup & {
  patients: Pick<Patient, "id" | "full_name" | "phone" | "email"> | null;
  doctors: Pick<Doctor, "id" | "name"> | null;
};

export async function fetchEscalations() {
  if (isLocalPortalDemo()) return local.fetchEscalations();
  const { data, error } = await supabase
    .from("ai_followups")
    .select("*, patients(id, full_name, phone, email), doctors(id, name)")
    .or("status.eq.escalated,summary_json->>escalation_flag.eq.true")
    .is("resolved_at", null)
    .order("follow_up_date", { ascending: false });
  if (error) {
    if (isSchemaMismatchError(error)) return [];
    throwIf(error);
  }
  return (data ?? []) as unknown as EscalationRow[];
}

export async function resolveEscalation(id: string) {
  if (isLocalPortalDemo()) return local.resolveEscalation(id);
  const { data: existing, error: readError } = await supabase
    .from("ai_followups")
    .select("summary_json")
    .eq("id", id)
    .maybeSingle();
  throwIf(readError);
  const prev =
    existing?.summary_json && typeof existing.summary_json === "object"
      ? (existing.summary_json as Record<string, Json | undefined>)
      : {};
  const { error } = await supabase
    .from("ai_followups")
    .update({
      status: "completed",
      resolved_at: new Date().toISOString(),
      summary_json: { ...prev, escalation_flag: false, resolved: true } as Json,
    })
    .eq("id", id);
  throwIf(error);
  await writeAudit("escalation.resolve", "ai_followups", id, "Marked resolved by staff/admin");
}

export async function fetchStaff() {
  if (isLocalPortalDemo()) return local.fetchStaff();
  const { data, error } = await supabase.from("staff").select("*").order("name");
  if (error) {
    if (isSchemaMismatchError(error)) return [];
    throwIf(error);
  }
  return (data ?? []) as Staff[];
}

export async function fetchDoctors() {
  if (isLocalPortalDemo()) return local.fetchDoctors();
  const portal = await supabase.from("doctors").select("*").order("name");
  if (!portal.error) return (portal.data ?? []) as Doctor[];
  if (!isSchemaMismatchError(portal.error)) throwIf(portal.error);

  const cloud = await (supabase as unknown as { from: (t: string) => any })
    .from("providers")
    .select("id, first_name, last_name, specialty, slug, office, phone, created_at")
    .order("last_name");
  throwIf(cloud.error);
  const now = new Date().toISOString();
  return ((cloud.data ?? []) as Array<Record<string, string | null>>).map((p) => {
    const name = displayName(p) || "Provider";
    return {
      id: String(p["id"]),
      profile_id: null,
      name: name.startsWith("Dr.") ? name : `Dr. ${name}`,
      specialty: p["specialty"] ?? "",
      specialty_slug: null,
      slug: p["slug"],
      office: p["office"],
      phone: p["phone"],
      on_shift: true,
      created_at: p["created_at"] ?? now,
    } as Doctor;
  });
}

export async function upsertStaff(
  row: Database["public"]["Tables"]["staff"]["Insert"] & { id?: string },
) {
  if (isLocalPortalDemo()) return local.upsertStaff(row);
  const { error } = await supabase.from("staff").upsert(row);
  throwIf(error);
  await writeAudit(row.id ? "staff.update" : "staff.create", "staff", row.id, row.name);
}

export async function fetchBilling() {
  if (isLocalPortalDemo()) return local.fetchBilling();
  const { data, error } = await supabase
    .from("billing_records")
    .select("*, patients(id, full_name)")
    .order("created_at", { ascending: false });
  throwIf(error);
  return data ?? [];
}

export async function updateBillingStatus(
  id: string,
  status: Database["public"]["Enums"]["billing_status"],
) {
  if (isLocalPortalDemo()) return local.updateBillingStatus(id, status);
  const { error } = await supabase.from("billing_records").update({ status }).eq("id", id);
  throwIf(error);
  await writeAudit("billing.update", "billing_records", id, status);
}

export async function fetchInventory() {
  if (isLocalPortalDemo()) return local.fetchInventory();
  const { data, error } = await supabase.from("inventory_items").select("*").order("name");
  throwIf(error);
  return (data ?? []) as Inventory[];
}

export async function fetchAuditLog() {
  if (isLocalPortalDemo()) return local.fetchAuditLog();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*, profiles:actor_id(full_name, email)")
    .order("timestamp", { ascending: false })
    .limit(200);
  if (error) {
    if (isSchemaMismatchError(error)) return [];
    throwIf(error);
  }
  return data ?? [];
}

export async function setDoctorAppointmentStatus(
  actorDoctorId: string,
  appointmentId: string,
  status: "confirmed" | "cancelled",
) {
  if (!actorDoctorId) throw new Error("You can only update your own appointments.");
  if (isLocalPortalDemo()) return local.setDoctorAppointmentStatus(actorDoctorId, appointmentId, status);
  const patch =
    status === "confirmed"
      ? { status, pipeline_stage: "confirmed" as const }
      : { status };
  const { data, error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", appointmentId)
    .eq("doctor_id", actorDoctorId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("You can only update your own appointments.");
}

export async function fetchDoctorAppointments(doctorId: string) {
  if (!doctorId) return [];
  if (isLocalPortalDemo()) {
    return (await local.fetchDoctorAppointments(doctorId)).map(normalizeAppointmentRow);
  }
  return (await fetchRemoteAppointments({ doctorId })).filter((row) => row.status !== "cancelled");
}

export type { AssignAppointmentSlot, AssignAppointmentResult } from "@/lib/portal/local-store";

export async function assignAppointmentDoctor(
  appointmentId: string,
  doctorId: string,
  patientId: string,
  slot: AssignAppointmentSlot,
): Promise<local.AssignAppointmentResult> {
  if (isLocalPortalDemo()) {
    return local.assignAppointmentDoctor(appointmentId, doctorId, patientId, slot);
  }
  if (!slot.appointmentDate?.trim() || !slot.appointmentTime?.trim()) {
    throw new Error("Appointment date and time are required.");
  }

  const appointmentDate = slot.appointmentDate.trim();
  const appointmentTime =
    slot.appointmentTime.trim().length === 5
      ? `${slot.appointmentTime.trim()}:00`
      : slot.appointmentTime.trim();
  const datetime = combineAppointmentDateTime(appointmentDate, appointmentTime);

  const portal = await supabase
    .from("appointments")
    .update({
      doctor_id: doctorId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      datetime,
      status: "confirmed",
      pipeline_stage: "confirmed",
    })
    .eq("id", appointmentId);
  if (portal.error && isSchemaMismatchError(portal.error)) {
    const cloud = await (supabase as unknown as { from: (t: string) => any })
      .from("appointments")
      .update({ provider_id: doctorId, status: "confirmed" })
      .eq("id", appointmentId);
    throwIf(cloud.error);
  } else {
    throwIf(portal.error);
    const { error: patientError } = await supabase
      .from("patients")
      .update({ assigned_doctor_id: doctorId })
      .eq("id", patientId);
    if (patientError && !isSchemaMismatchError(patientError)) throwIf(patientError);
  }

  await writeAudit(
    "appointment.assign",
    "appointments",
    appointmentId,
    `${doctorId} @ ${appointmentDate} ${appointmentTime}`,
  );

  const [{ data: patient }, { data: doctor }, { data: appt }] = await Promise.all([
    supabase.from("patients").select("full_name, email").eq("id", patientId).maybeSingle(),
    supabase.from("doctors").select("name, specialty").eq("id", doctorId).maybeSingle(),
    supabase
      .from("appointments")
      .select("campus, visit_preference, visit_type, reason_for_visit, preferred_specialty")
      .eq("id", appointmentId)
      .maybeSingle(),
  ]);

  const location =
    appt?.visit_type === "telehealth" || appt?.campus === "Telehealth"
      ? "Telehealth — join link will be shared before your visit"
      : `${appt?.campus ?? "Gura Hospital"} campus`;

  if (!patient?.email) {
    return {
      emailOk: false,
      emailError: "Assignment saved, but the patient has no email on file.",
    };
  }

  const mail = await requestGmailNotification({
    type: "appointment_confirmed",
    to: patient.email,
    bookingId: appointmentId,
    patientName: patient.full_name ?? "Patient",
    doctorName: doctor?.name ?? "Your physician",
    doctorSpecialty: doctor?.specialty ?? appt?.preferred_specialty ?? "General",
    appointmentDate,
    appointmentTime,
    location,
  });

  if (!mail.ok) {
    console.warn("[assignAppointmentDoctor] confirmation email failed:", mail.error);
    return {
      emailOk: false,
      emailError: mail.error || "Confirmation email failed to send.",
    };
  }

  return {
    emailOk: true,
    emailMocked: mail.status === "mocked",
  };
}

export type PatientTimeline = {
  patient: Patient;
  appointments: AppointmentRow[];
  reports: Report[];
  medications: MedPlan[];
  reminders: Reminder[];
  followups: AiFollowup[];
  activity: AiActivity[];
};

export async function fetchPatientTimeline(patientId: string): Promise<PatientTimeline> {
  if (isLocalPortalDemo()) return local.fetchPatientTimeline(patientId);
  const [patient, appointments, reports, medications, reminders, followups, activity] = await Promise.all([
    supabase.from("patients").select("*").eq("id", patientId).single(),
    supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("patient_id", patientId)
      .order("datetime", { ascending: false }),
    supabase.from("patient_reports").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
    supabase.from("medication_plans").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
    supabase.from("ai_reminders").select("*").eq("patient_id", patientId).order("scheduled_time", { ascending: false }),
    supabase.from("ai_followups").select("*").eq("patient_id", patientId).order("follow_up_date", { ascending: false }),
    supabase.from("ai_activity").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
  ]);
  throwIf(patient.error);
  throwIf(appointments.error);
  throwIf(reports.error);
  throwIf(medications.error);
  throwIf(reminders.error);
  throwIf(followups.error);
  throwIf(activity.error);
  if (!patient.data) throw new Error("Patient not found.");
  return {
    patient: patient.data,
    appointments: (appointments.data ?? []) as unknown as AppointmentRow[],
    reports: reports.data ?? [],
    medications: medications.data ?? [],
    reminders: reminders.data ?? [],
    followups: followups.data ?? [],
    activity: activity.data ?? [],
  };
}

export async function saveReport(
  payload: Database["public"]["Tables"]["patient_reports"]["Insert"] & { id?: string },
) {
  if (isLocalPortalDemo()) return local.saveReport(payload);
  const { id, ...rest } = payload;
  const row: Database["public"]["Tables"]["patient_reports"]["Insert"] = {
    ...rest,
    approved_by_doctor: false,
  };
  if (id) {
    const { data, error } = await supabase
      .from("patient_reports")
      .update({
        diagnosis: row.diagnosis ?? null,
        notes: row.notes ?? null,
        vitals: row.vitals ?? {},
        ai_drafted: row.ai_drafted ?? false,
        approved_by_doctor: false,
      })
      .eq("id", id)
      .select("*")
      .single();
    throwIf(error);
    if (!data) throw new Error("Save failed.");
    await writeAudit("report.save", "patient_reports", data.id, "Saved report draft");
    return data;
  }
  const { data, error } = await supabase.from("patient_reports").insert(row).select("*").single();
  throwIf(error);
  if (!data) throw new Error("Save failed.");
  await writeAudit("report.save", "patient_reports", data.id, "Saved report draft");
  return data;
}

export async function approveReport(id: string) {
  if (isLocalPortalDemo()) return local.approveReport(id);
  const { data, error } = await supabase
    .from("patient_reports")
    .update({ approved_by_doctor: true })
    .eq("id", id)
    .select("*")
    .single();
  throwIf(error);
  await writeAudit("report.approve", "patient_reports", id, "Doctor approved report");
  return data as Report;
}

export async function saveMedicationPlan(
  payload: Database["public"]["Tables"]["medication_plans"]["Insert"],
) {
  if (isLocalPortalDemo()) return local.saveMedicationPlan(payload);
  const { data, error } = await supabase.from("medication_plans").insert(payload).select("*").single();
  throwIf(error);
  if (!data) throw new Error("Save failed.");
  await writeAudit("medication.create", "medication_plans", data.id, payload.drug_name);
  return data;
}

export async function saveReminder(payload: Database["public"]["Tables"]["ai_reminders"]["Insert"]) {
  if (isLocalPortalDemo()) return local.saveReminder(payload);
  const row = { ...payload, approved_to_send: payload.approved_to_send ?? false };
  const { data, error } = await supabase.from("ai_reminders").insert(row).select("*").single();
  throwIf(error);
  if (!data) throw new Error("Save failed.");
  await writeAudit("reminder.create", "ai_reminders", data.id, "Reminder scheduled (not sent without approval)");

  if (
    (data.channel === "sms" || data.channel === "cold_call") &&
    data.approved_to_send
  ) {
    return finalizeOutboundReminder(data);
  }

  return data;
}

async function finalizeOutboundReminder(
  created: Database["public"]["Tables"]["ai_reminders"]["Row"],
): Promise<Reminder & { outbound: OutboundReminderMeta }> {
  let drugName: string | undefined;
  let dose: string | undefined;
  let scheduleText: string | undefined;
  if (created.medication_plan_id) {
    const { data: plan } = await supabase
      .from("medication_plans")
      .select("drug_name, dose, schedule")
      .eq("id", created.medication_plan_id)
      .maybeSingle();
    drugName = plan?.drug_name;
    dose = plan?.dose;
    scheduleText = plan?.schedule;
  }

  const scheduled = await scheduleOutboundReminder({
    reminderId: created.id,
    patientId: created.patient_id,
    medicationPlanId: created.medication_plan_id,
    channel: created.channel as "sms" | "cold_call",
    scheduledTime: created.scheduled_time,
    ...(drugName ? { drugName } : {}),
    ...(dose ? { dose } : {}),
    ...(scheduleText ? { schedule: scheduleText } : {}),
  });

  if (!scheduled.ok) {
    await supabase.from("ai_reminders").update({ status: "failed" }).eq("id", created.id);
    await supabase.from("ai_activity").insert({
      patient_id: created.patient_id,
      activity_type: "medication_reminder",
      outcome: "escalated",
      summary: `${created.channel} reminder failed to schedule: ${scheduled.error}`,
      related_id: created.id,
    });
    await writeAudit("reminder.outbound_failed", "ai_reminders", created.id, scheduled.error);
    const fakeJob: ReminderJob = {
      id: "schedule-failed",
      reminderId: created.id,
      patientId: created.patient_id,
      medicationPlanId: created.medication_plan_id,
      channel: created.channel as "sms" | "cold_call",
      runAt: created.scheduled_time,
      status: "failed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: scheduled.error,
    };
    return { ...created, status: "failed", outbound: { job: fakeJob } };
  }

  return applyReminderJobToSupabase(created, scheduled.job);
}

async function applyReminderJobToSupabase(
  created: Reminder,
  job: ReminderJob,
): Promise<Reminder & { outbound: OutboundReminderMeta }> {
  let nextStatus: Reminder["status"] = created.status;
  if (job.status === "sent") nextStatus = "sent";
  if (job.status === "failed") nextStatus = "failed";
  if (job.status === "scheduled" || job.status === "running") nextStatus = "pending";

  await supabase.from("ai_reminders").update({ status: nextStatus }).eq("id", created.id);

  if (job.status === "scheduled") {
    await supabase.from("ai_activity").insert({
      patient_id: created.patient_id,
      activity_type: "medication_reminder",
      outcome: "completed",
      summary: `${job.channel} medication reminder scheduled for ${new Date(job.runAt).toLocaleString()} (job ${job.id}).`,
      related_id: created.id,
    });
    await writeAudit(
      "reminder.outbound_scheduled",
      "ai_reminders",
      created.id,
      `Scheduled ${job.channel} for ${job.runAt}`,
    );
  } else if (job.status === "sent") {
    await supabase.from("ai_activity").insert({
      patient_id: created.patient_id,
      activity_type: "medication_reminder",
      outcome: "completed",
      summary: `${job.channel} medication reminder to ${job.to ?? "test number"} (Twilio ${job.sid}, status ${job.twilioStatus}).`,
      related_id: created.id,
    });
    await writeAudit(
      "reminder.outbound_sent",
      "ai_reminders",
      created.id,
      job.sid ? `Twilio SID ${job.sid}` : "sent",
    );
  } else if (job.status === "failed") {
    await supabase.from("ai_activity").insert({
      patient_id: created.patient_id,
      activity_type: "medication_reminder",
      outcome: "escalated",
      summary: `${job.channel} medication reminder failed: ${job.error ?? "unknown error"}`,
      related_id: created.id,
    });
    await writeAudit(
      "reminder.outbound_failed",
      "ai_reminders",
      created.id,
      job.error ?? "failed",
    );
  }

  return { ...created, status: nextStatus, outbound: { job } };
}

export async function syncReminderJob(
  reminderId: string,
): Promise<(Reminder & { outbound: OutboundReminderMeta }) | null> {
  if (isLocalPortalDemo()) return local.syncReminderJob(reminderId);
  const result = await fetchReminderJob({ reminderId });
  if (!result.ok) return null;
  const { data, error } = await supabase.from("ai_reminders").select("*").eq("id", reminderId).maybeSingle();
  throwIf(error);
  if (!data) return null;
  if (result.job.status === "scheduled" && data.status === "pending") {
    return { ...data, outbound: { job: result.job } };
  }
  // Avoid duplicate activity if already terminal-matching
  if (
    (result.job.status === "sent" && data.status === "sent") ||
    (result.job.status === "failed" && data.status === "failed")
  ) {
    return { ...data, outbound: { job: result.job } };
  }
  return applyReminderJobToSupabase(data, result.job);
}

export async function saveFollowup(payload: Database["public"]["Tables"]["ai_followups"]["Insert"]) {
  if (isLocalPortalDemo()) return local.saveFollowup(payload);
  const row = { ...payload, status: payload.status ?? "scheduled" };
  const { data, error } = await supabase.from("ai_followups").insert(row).select("*").single();
  throwIf(error);
  if (!data) throw new Error("Save failed.");
  await writeAudit("followup.schedule", "ai_followups", data.id, "Follow-up scheduled");
  return data;
}

export type FollowupResultRow = AiFollowup & {
  patients: Pick<Patient, "id" | "full_name"> | null;
};

export async function fetchFollowupResults(doctorId: string) {
  if (isLocalPortalDemo()) return local.fetchFollowupResults(doctorId);
  const { data, error } = await supabase
    .from("ai_followups")
    .select("*, patients(id, full_name)")
    .eq("doctor_id", doctorId)
    .eq("status", "completed")
    .order("follow_up_date", { ascending: false });
  throwIf(error);
  const rows = (data ?? []) as unknown as FollowupResultRow[];
  return rows.sort((a, b) => {
    const aj = a.summary_json as { escalation_flag?: boolean } | null;
    const bj = b.summary_json as { escalation_flag?: boolean } | null;
    const ae = aj?.escalation_flag || a.status === "escalated" ? 0 : 1;
    const be = bj?.escalation_flag || b.status === "escalated" ? 0 : 1;
    if (ae !== be) return ae - be;
    return new Date(b.follow_up_date).getTime() - new Date(a.follow_up_date).getTime();
  });
}

export function billingTotals(rows: Billing[]) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  let revenueThisMonth = 0;
  let outstanding = 0;
  for (const r of rows) {
    const amt = Number(r.amount) || 0;
    if (r.status === "paid" && new Date(r.created_at) >= monthStart) revenueThisMonth += amt;
    if (r.status === "pending" || r.status === "insurance_review") outstanding += amt;
  }
  return { revenueThisMonth, outstanding };
}
