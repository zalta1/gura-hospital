import type { Database, Json } from "@/integrations/supabase/types";
import { coercePipelineStage } from "@/lib/portal/appointment-stage";
import { combineAppointmentDateTime } from "@/lib/portal/appointment-slot";
import {
  AvailabilityError,
  SLOT_TAKEN_MESSAGE,
  assertSlotBookable,
  hospitalClock,
  hospitalDateFromIso,
  sameSlotInstant,
  statusHoldsSlot,
  type BusyAppointment,
} from "@/lib/portal/availability";
import { readAvailability } from "@/lib/portal/availability-store";
import { doctorAccountsFromPhysicians } from "@/lib/doctor-accounts";
import { requestGmailNotification } from "@/lib/notifications/request-gmail-notification";
import {
  LOCAL_ADMIN_ID,
  LOCAL_AMARA_DOCTOR_ID,
  LOCAL_AMARA_PROFILE_ID,
  LOCAL_CALLUM_DOCTOR_ID,
  LOCAL_CALLUM_PROFILE_ID,
  LOCAL_STAFF_ID,
  doctorIdForSlug,
  profileIdForSlug,
} from "@/lib/portal/local-demo";
import { scheduleOutboundReminder, fetchReminderJob } from "@/lib/twilio/schedule-reminder";
import type { OutboundReminderMeta, ReminderJob } from "@/lib/twilio/reminder-job-types";

export type { OutboundReminderMeta } from "@/lib/twilio/reminder-job-types";
export type AssignAppointmentSlot = {
  appointmentDate: string;
  appointmentTime: string;
};

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Patient = Database["public"]["Tables"]["patients"]["Row"];
type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
type Staff = Database["public"]["Tables"]["staff"]["Row"];
type Billing = Database["public"]["Tables"]["billing_records"]["Row"];
type Inventory = Database["public"]["Tables"]["inventory_items"]["Row"];
type Audit = Database["public"]["Tables"]["audit_log"]["Row"];
type AiActivity = Database["public"]["Tables"]["ai_activity"]["Row"];
type AiFollowup = Database["public"]["Tables"]["ai_followups"]["Row"];
type Report = Database["public"]["Tables"]["patient_reports"]["Row"];
type MedPlan = Database["public"]["Tables"]["medication_plans"]["Row"];
type Reminder = Database["public"]["Tables"]["ai_reminders"]["Row"];

export type OverviewStats = {
  todaysAppointments: number;
  doctorsOnShift: number;
  bedsInUseEstimate: number;
  aiCallsInProgress: number;
  escalationCount: number;
};

export type AppointmentRow = Appointment & {
  patients: Pick<Patient, "id" | "full_name" | "phone" | "email" | "dob" | "insurance"> | null;
  doctors: Pick<Doctor, "id" | "name" | "specialty"> | null;
};

export type AiActivityRow = AiActivity & {
  patients: Pick<Patient, "id" | "full_name"> | null;
};

export type EscalationRow = AiFollowup & {
  patients: Pick<Patient, "id" | "full_name" | "phone" | "email"> | null;
  doctors: Pick<Doctor, "id" | "name"> | null;
};

export type PatientTimeline = {
  patient: Patient;
  appointments: AppointmentRow[];
  reports: Report[];
  medications: MedPlan[];
  reminders: Reminder[];
  followups: AiFollowup[];
  activity: AiActivity[];
};

export type FollowupResultRow = AiFollowup & {
  patients: Pick<Patient, "id" | "full_name"> | null;
};

const P1 = "c1111111-1111-1111-1111-111111111111";
const P2 = "c2222222-2222-2222-2222-222222222222";
const P3 = "c3333333-3333-3333-3333-333333333333";
const P4 = "c4444444-4444-4444-4444-444444444444";

function hoursFromStartOfDay(hours: number, dayOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
}

function isoOffset(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function seedDoctors(): Doctor[] {
  const now = new Date().toISOString();
  return doctorAccountsFromPhysicians().map((doc) => ({
    id: doctorIdForSlug(doc.slug),
    profile_id: profileIdForSlug(doc.slug),
    name: `${doc.name}, ${doc.credentials}`,
    specialty: doc.specialty,
    specialty_slug: doc.specialtySlug,
    slug: doc.slug,
    office: doc.office,
    phone: doc.phone,
    on_shift: true,
    created_at: now,
  }));
}

function withRelations(row: Appointment): AppointmentRow {
  const patient = db.patients.find((p) => p.id === row.patient_id) ?? null;
  const doctor = row.doctor_id ? (db.doctors.find((d) => d.id === row.doctor_id) ?? null) : null;
  return {
    ...row,
    patients: patient
      ? {
          id: patient.id,
          full_name: patient.full_name,
          phone: patient.phone,
          email: patient.email,
          dob: patient.dob,
          insurance: patient.insurance,
        }
      : null,
    doctors: doctor ? { id: doctor.id, name: doctor.name, specialty: doctor.specialty } : null,
  };
}

type Store = {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  staff: Staff[];
  billing: Billing[];
  inventory: Inventory[];
  audit: Array<Audit & { profiles: { full_name: string; email: string | null } | null }>;
  reports: Report[];
  medications: MedPlan[];
  reminders: Reminder[];
  followups: AiFollowup[];
  activity: AiActivity[];
};

function createStore(): Store {
  const now = new Date().toISOString();
  const doctors = seedDoctors();
  const patients: Patient[] = [
    {
      id: P1,
      full_name: "Jordan Avery",
      dob: "1988-04-12",
      email: "jordan.avery@patient.example",
      phone: "(555) 401-2201",
      address: "88 Harbor Walk, Fairmont Ridge",
      insurance: "Aetna PPO",
      assigned_doctor_id: LOCAL_AMARA_DOCTOR_ID,
      created_at: now,
    },
    {
      id: P2,
      full_name: "Morgan Ellis",
      dob: "1975-09-03",
      email: "morgan.ellis@patient.example",
      phone: "(555) 401-2202",
      address: "14 Cedar Lane, Alder Bay",
      insurance: "UnitedHealthcare",
      assigned_doctor_id: LOCAL_AMARA_DOCTOR_ID,
      created_at: now,
    },
    {
      id: P3,
      full_name: "Riley Chen",
      dob: "1992-01-28",
      email: "riley.chen@patient.example",
      phone: "(555) 401-2203",
      address: "9 Oak Street, Fairmont Ridge",
      insurance: "Blue Cross",
      assigned_doctor_id: LOCAL_CALLUM_DOCTOR_ID,
      created_at: now,
    },
    {
      id: P4,
      full_name: "Sam Okonkwo",
      dob: "1968-11-15",
      email: "sam.okonkwo@patient.example",
      phone: "(555) 401-2204",
      address: "220 Ridge Ave, Fairmont Ridge",
      insurance: "Medicare",
      assigned_doctor_id: LOCAL_AMARA_DOCTOR_ID,
      created_at: now,
    },
  ];

  const appointments: Appointment[] = [
    {
      id: "a1111111-1111-1111-1111-111111111111",
      patient_id: P1,
      doctor_id: LOCAL_AMARA_DOCTOR_ID,
      datetime: hoursFromStartOfDay(9),
      appointment_date: null,
      appointment_time: null,
      status: "confirmed",
      pipeline_stage: "confirmed",
      reason_for_visit: "Palpitations and fatigue",
      preferred_specialty: "Cardiology",
      visit_preference: "in-person",
      visit_type: "in_person",
      campus: "Fairmont Ridge",
      created_at: now,
    },
    {
      id: "a2222222-2222-2222-2222-222222222222",
      patient_id: P2,
      doctor_id: LOCAL_AMARA_DOCTOR_ID,
      datetime: hoursFromStartOfDay(11),
      appointment_date: null,
      appointment_time: null,
      status: "pending",
      pipeline_stage: "navigator_matched",
      reason_for_visit: "Follow-up after Holter monitor",
      preferred_specialty: "Cardiology",
      visit_preference: "telehealth",
      visit_type: "telehealth",
      campus: "Fairmont Ridge",
      created_at: now,
    },
    {
      id: "a3333333-3333-3333-3333-333333333333",
      patient_id: P3,
      doctor_id: LOCAL_CALLUM_DOCTOR_ID,
      datetime: hoursFromStartOfDay(14),
      appointment_date: null,
      appointment_time: null,
      status: "pending",
      pipeline_stage: "pending_intake",
      reason_for_visit: "Annual physical",
      preferred_specialty: "Internal Medicine",
      visit_preference: "in-person",
      visit_type: "in_person",
      campus: "Alder Bay",
      created_at: now,
    },
    {
      id: "a4444444-4444-4444-4444-444444444444",
      patient_id: P4,
      doctor_id: LOCAL_AMARA_DOCTOR_ID,
      datetime: hoursFromStartOfDay(10, 1),
      appointment_date: null,
      appointment_time: null,
      status: "confirmed",
      pipeline_stage: "confirmed",
      reason_for_visit: "Chest discomfort on exertion",
      preferred_specialty: "Cardiology",
      visit_preference: "in-person",
      visit_type: "in_person",
      campus: "Fairmont Ridge",
      created_at: now,
    },
    {
      id: "a5555555-5555-5555-5555-555555555555",
      patient_id: P1,
      doctor_id: LOCAL_AMARA_DOCTOR_ID,
      datetime: hoursFromStartOfDay(10, -7),
      appointment_date: null,
      appointment_time: null,
      status: "completed",
      pipeline_stage: "completed",
      reason_for_visit: "New patient cardiology consult",
      preferred_specialty: "Cardiology",
      visit_preference: "in-person",
      visit_type: "in_person",
      campus: "Fairmont Ridge",
      created_at: now,
    },
  ];

  return {
    doctors,
    patients,
    appointments,
    staff: [
      {
        id: "cd111111-1111-1111-1111-111111111111",
        profile_id: LOCAL_STAFF_ID,
        name: "Priya Nair",
        role_title: "Care Navigator",
        department: "Patient Access",
        shift_schedule: "Mon–Fri 07:00–15:00",
        created_at: now,
      },
      {
        id: "cd222222-2222-2222-2222-222222222222",
        profile_id: null,
        name: "Diego Alvarez",
        role_title: "Unit Coordinator",
        department: "Heart Center",
        shift_schedule: "Sun–Wed 15:00–23:00",
        created_at: now,
      },
      {
        id: "cd333333-3333-3333-3333-333333333333",
        profile_id: null,
        name: "Hannah Brooks",
        role_title: "Billing Specialist",
        department: "Revenue Cycle",
        shift_schedule: "Mon–Fri 09:00–17:00",
        created_at: now,
      },
    ],
    billing: [
      {
        id: "b1111111-1111-1111-1111-111111111111",
        patient_id: P1,
        appointment_id: "a5555555-5555-5555-5555-555555555555",
        amount: 425,
        status: "paid",
        payer: "Aetna PPO",
        created_at: isoOffset(-2 * 24 * 60 * 60 * 1000),
      },
      {
        id: "b2222222-2222-2222-2222-222222222222",
        patient_id: P2,
        appointment_id: "a2222222-2222-2222-2222-222222222222",
        amount: 180,
        status: "pending",
        payer: "UnitedHealthcare",
        created_at: isoOffset(-24 * 60 * 60 * 1000),
      },
      {
        id: "b3333333-3333-3333-3333-333333333333",
        patient_id: P4,
        appointment_id: null,
        amount: 960,
        status: "insurance_review",
        payer: "Medicare",
        created_at: isoOffset(-3 * 24 * 60 * 60 * 1000),
      },
      {
        id: "b4444444-4444-4444-4444-444444444444",
        patient_id: P3,
        appointment_id: "a3333333-3333-3333-3333-333333333333",
        amount: 210,
        status: "denied",
        payer: "Blue Cross",
        created_at: isoOffset(-10 * 24 * 60 * 60 * 1000),
      },
    ],
    inventory: [
      {
        id: "ce111111-1111-1111-1111-111111111111",
        name: "ECG electrode packs",
        category: "Cardiology",
        quantity_on_hand: 12,
        reorder_threshold: 20,
        unit_cost: 18.5,
        created_at: now,
      },
      {
        id: "ce222222-2222-2222-2222-222222222222",
        name: "Nitrile gloves (box)",
        category: "PPE",
        quantity_on_hand: 140,
        reorder_threshold: 40,
        unit_cost: 9.25,
        created_at: now,
      },
      {
        id: "ce333333-3333-3333-3333-333333333333",
        name: "Holter monitor kits",
        category: "Diagnostics",
        quantity_on_hand: 3,
        reorder_threshold: 5,
        unit_cost: 220,
        created_at: now,
      },
    ],
    audit: [
      {
        id: newId(),
        actor_id: LOCAL_ADMIN_ID,
        action: "seed.bootstrap",
        target_table: "profiles",
        target_id: LOCAL_ADMIN_ID,
        detail: "Local demo store loaded",
        timestamp: now,
        profiles: { full_name: "Gura Admin", email: "admin@gurahospital.demo" },
      },
    ],
    reports: [
      {
        id: "d1111111-1111-1111-1111-111111111111",
        patient_id: P1,
        doctor_id: LOCAL_AMARA_DOCTOR_ID,
        appointment_id: "a5555555-5555-5555-5555-555555555555",
        diagnosis: "Paroxysmal atrial fibrillation (provisional)",
        notes:
          "Discussed symptom diary, ECG reviewed. Plan for ambulatory monitoring. Patient counseled on when to seek emergency care.",
        vitals: { bp: "128/78", hr: 92, temp: 98.4, spo2: 98 },
        ai_drafted: false,
        approved_by_doctor: true,
        created_at: isoOffset(-7 * 24 * 60 * 60 * 1000),
      },
    ],
    medications: [
      {
        id: "e1111111-1111-1111-1111-111111111111",
        patient_id: P1,
        doctor_id: LOCAL_AMARA_DOCTOR_ID,
        drug_name: "Metoprolol tartrate",
        dose: "25 mg",
        schedule: "Twice daily with meals",
        duration: "30 days",
        created_at: now,
      },
    ],
    reminders: [
      {
        id: "aa111111-1111-1111-1111-111111111111",
        patient_id: P1,
        medication_plan_id: "e1111111-1111-1111-1111-111111111111",
        scheduled_time: isoOffset(2 * 60 * 60 * 1000),
        channel: "sms",
        status: "pending",
        approved_to_send: false,
        created_at: now,
      },
    ],
    followups: [
      {
        id: "f1111111-1111-1111-1111-111111111111",
        patient_id: P1,
        doctor_id: LOCAL_AMARA_DOCTOR_ID,
        follow_up_date: isoOffset(-24 * 60 * 60 * 1000),
        status: "completed",
        summary_json: {
          adherence: "mostly_adherent",
          sentiment: "cautiously_positive",
          symptoms_reported: ["mild fatigue"],
          escalation_flag: false,
        },
        transcript_text:
          "Navigator: How have you been feeling since your visit?\nPatient: A bit tired but the palpitations are less frequent.",
        resolved_at: isoOffset(-20 * 60 * 60 * 1000),
        created_at: now,
      },
      {
        id: "f2222222-2222-2222-2222-222222222222",
        patient_id: P2,
        doctor_id: LOCAL_AMARA_DOCTOR_ID,
        follow_up_date: isoOffset(-3 * 60 * 60 * 1000),
        status: "escalated",
        summary_json: {
          adherence: "uncertain",
          sentiment: "distressed",
          symptoms_reported: ["chest pressure", "shortness of breath"],
          escalation_flag: true,
        },
        transcript_text:
          "Navigator: Any new symptoms today?\nPatient: I have pressure in my chest and feel short of breath when walking.",
        resolved_at: null,
        created_at: now,
      },
    ],
    activity: [
      {
        id: "ca111111-1111-1111-1111-111111111111",
        patient_id: P2,
        activity_type: "wellness_check",
        outcome: "escalated",
        summary: "Chest pressure reported — escalated to care team",
        related_id: "f2222222-2222-2222-2222-222222222222",
        created_at: isoOffset(-3 * 60 * 60 * 1000),
      },
      {
        id: "ca222222-2222-2222-2222-222222222222",
        patient_id: P1,
        activity_type: "wellness_check",
        outcome: "completed",
        summary: "Post-visit check completed; adherence mostly good",
        related_id: "f1111111-1111-1111-1111-111111111111",
        created_at: isoOffset(-24 * 60 * 60 * 1000),
      },
      {
        id: "ca333333-3333-3333-3333-333333333333",
        patient_id: P1,
        activity_type: "voice_navigator",
        outcome: "completed",
        summary: "Intake navigator matched to Cardiology",
        related_id: "a1111111-1111-1111-1111-111111111111",
        created_at: isoOffset(-2 * 24 * 60 * 60 * 1000),
      },
    ],
  };
}

const db = createStore();

const BOOKINGS_STORAGE_KEY = "gura_local_portal_bookings";
export const LOCAL_BOOKING_EVENT = "gura-local-booking";

function persistBookings() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BOOKINGS_STORAGE_KEY,
    JSON.stringify({ patients: db.patients, appointments: db.appointments }),
  );
  window.dispatchEvent(new Event(LOCAL_BOOKING_EVENT));
}

function hydratePersistedBookings() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { patients?: Patient[]; appointments?: Appointment[] };
    if (Array.isArray(parsed.patients) && parsed.patients.length > 0) {
      const ids = new Set(parsed.patients.map((p) => p.id));
      const extras = db.patients.filter((p) => !ids.has(p.id));
      db.patients = [...parsed.patients, ...extras];
    }
    if (Array.isArray(parsed.appointments) && parsed.appointments.length > 0) {
      const normalized = parsed.appointments.map((a) => ({
        ...a,
        appointment_date: a.appointment_date ?? null,
        appointment_time: a.appointment_time ?? null,
      }));
      const ids = new Set(normalized.map((a) => a.id));
      const extras = db.appointments.filter((a) => !ids.has(a.id));
      db.appointments = [...normalized, ...extras];
    }
  } catch {
    // ignore corrupt local demo cache
  }
}

hydratePersistedBookings();

function actorName(actorId: string | null) {
  if (actorId === LOCAL_ADMIN_ID) return { full_name: "Gura Admin", email: "admin@gurahospital.demo" };
  if (actorId === LOCAL_STAFF_ID) return { full_name: "Priya Nair", email: "staff@gura.example" };
  if (actorId === LOCAL_AMARA_PROFILE_ID)
    return { full_name: "Dr. Amara Velloso, MD, FACC", email: "amara.velloso@gurahospital.demo" };
  if (actorId === LOCAL_CALLUM_PROFILE_ID)
    return { full_name: "Dr. Callum Whitfield, MD, FACP", email: "callum.whitfield@gurahospital.demo" };
  return { full_name: "Local demo user", email: null };
}

export async function flagVoiceEmergency(reason: string, conversationId: string | null) {
  const id = newId();
  const now = new Date().toISOString();
  db.activity.unshift({
    id: newId(),
    patient_id: null,
    activity_type: "voice_navigator",
    outcome: "escalated",
    summary: `Emergency flag: caller instructed to call 911. Reason: ${reason}`,
    related_id: id,
    created_at: now,
  });
  await writeAudit(
    "voice.emergency_flag",
    "emergency_flags",
    id,
    `${reason}${conversationId ? ` (conversation ${conversationId})` : ""}`,
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LOCAL_BOOKING_EVENT));
  }
  return id;
}

export async function writeAudit(
  action: string,
  target_table?: string,
  target_id?: string,
  detail?: string,
) {
  const now = new Date().toISOString();
  db.audit.unshift({
    id: newId(),
    actor_id: LOCAL_ADMIN_ID,
    action,
    target_table: target_table ?? null,
    target_id: target_id ?? null,
    detail: detail ?? null,
    timestamp: now,
    profiles: actorName(LOCAL_ADMIN_ID),
  });
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  hydratePersistedBookings();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const todays = db.appointments.filter((a) => {
    const t = new Date(a.datetime).getTime();
    return t >= start.getTime() && t <= end.getTime() && a.status !== "cancelled";
  });
  return {
    todaysAppointments: todays.length,
    doctorsOnShift: db.doctors.filter((d) => d.on_shift).length,
    bedsInUseEstimate: todays.filter((a) => a.status === "confirmed" && a.visit_type === "in_person").length,
    aiCallsInProgress: db.reminders.filter((r) => r.status === "pending" || r.status === "sent").length,
    escalationCount:
      db.followups.filter((f) => {
        const flag = (f.summary_json as { escalation_flag?: boolean } | null)?.escalation_flag;
        return (f.status === "escalated" || flag === true) && !f.resolved_at;
      }).length +
      db.activity.filter((a) => a.activity_type === "voice_navigator" && a.outcome === "escalated")
        .length,
  };
}

export async function fetchAppointments(filters?: {
  doctorId?: string;
  specialty?: string;
  campus?: string;
  date?: string;
}) {
  hydratePersistedBookings();
  let rows = db.appointments.map(withRelations).map((row) => ({
    ...row,
    pipeline_stage: coercePipelineStage(row),
  }));
  if (filters?.doctorId) rows = rows.filter((r) => r.doctor_id === filters.doctorId);
  if (filters?.campus) rows = rows.filter((r) => r.campus === filters.campus);
  if (filters?.date) {
    const day = new Date(filters.date);
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    rows = rows.filter((r) => {
      const t = new Date(r.datetime).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  }
  if (filters?.specialty) {
    rows = rows.filter(
      (r) => r.doctors?.specialty === filters.specialty || r.preferred_specialty === filters.specialty,
    );
  }
  return rows.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export async function fetchAiActivity(): Promise<AiActivityRow[]> {
  const rows: AiActivityRow[] = db.activity.map((row) => {
    const patient = row.patient_id ? db.patients.find((p) => p.id === row.patient_id) : null;
    return {
      ...row,
      patients: patient ? { id: patient.id, full_name: patient.full_name } : null,
    };
  });
  return rows.sort((a, b) => {
    const ae = a.outcome === "escalated" ? 0 : 1;
    const be = b.outcome === "escalated" ? 0 : 1;
    if (ae !== be) return ae - be;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function fetchEscalations(): Promise<EscalationRow[]> {
  return db.followups
    .filter((f) => {
      const flag = (f.summary_json as { escalation_flag?: boolean } | null)?.escalation_flag;
      return (f.status === "escalated" || flag === true) && !f.resolved_at;
    })
    .map((f) => {
      const patient = db.patients.find((p) => p.id === f.patient_id) ?? null;
      const doctor = db.doctors.find((d) => d.id === f.doctor_id) ?? null;
      return {
        ...f,
        patients: patient
          ? { id: patient.id, full_name: patient.full_name, phone: patient.phone, email: patient.email }
          : null,
        doctors: doctor ? { id: doctor.id, name: doctor.name } : null,
      };
    });
}

export async function resolveEscalation(id: string) {
  const row = db.followups.find((f) => f.id === id);
  if (!row) throw new Error("Escalation not found.");
  const prev =
    row.summary_json && typeof row.summary_json === "object"
      ? (row.summary_json as Record<string, Json | undefined>)
      : {};
  row.status = "completed";
  row.resolved_at = new Date().toISOString();
  row.summary_json = { ...prev, escalation_flag: false, resolved: true } as Json;
  await writeAudit("escalation.resolve", "ai_followups", id, "Marked resolved by staff/admin");
}

export async function fetchStaff() {
  return [...db.staff].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchDoctors() {
  return [...db.doctors].sort((a, b) => a.name.localeCompare(b.name));
}

export async function upsertStaff(row: Database["public"]["Tables"]["staff"]["Insert"] & { id?: string }) {
  const now = new Date().toISOString();
  if (row.id) {
    const idx = db.staff.findIndex((s) => s.id === row.id);
    if (idx >= 0) {
      db.staff[idx] = { ...db.staff[idx], ...row, id: row.id };
    }
  } else {
    db.staff.push({
      id: newId(),
      profile_id: row.profile_id ?? null,
      name: row.name,
      role_title: row.role_title,
      department: row.department,
      shift_schedule: row.shift_schedule ?? null,
      created_at: now,
    });
  }
  await writeAudit(row.id ? "staff.update" : "staff.create", "staff", row.id, row.name);
}

export async function fetchBilling() {
  return db.billing
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((row) => {
      const patient = db.patients.find((p) => p.id === row.patient_id) ?? null;
      return {
        ...row,
        patients: patient ? { id: patient.id, full_name: patient.full_name } : null,
      };
    });
}

export async function updateBillingStatus(
  id: string,
  status: Database["public"]["Enums"]["billing_status"],
) {
  const row = db.billing.find((b) => b.id === id);
  if (!row) throw new Error("Billing record not found.");
  row.status = status;
  await writeAudit("billing.update", "billing_records", id, status);
}

export async function fetchInventory() {
  return [...db.inventory].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchAuditLog() {
  return db.audit
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200);
}

export async function fetchDoctorAppointments(doctorId: string) {
  hydratePersistedBookings();
  return db.appointments
    .filter((a) => a.doctor_id === doctorId && a.status !== "cancelled")
    .map(withRelations)
    .map((row) => ({ ...row, pipeline_stage: coercePipelineStage(row) }))
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export type LocalBookingInput = {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  insurance: string;
  reason: string;
  preferredSpecialty: string;
  visitPreference: string;
  doctorSlug: string;
  id?: string;
  startsAt?: string;
};

export function listBusyAppointments(): BusyAppointment[] {
  hydratePersistedBookings();
  return db.appointments
    .filter((appointment) => appointment.doctor_id && appointment.datetime && appointment.appointment_date && appointment.appointment_time)
    .map((appointment) => ({
      id: appointment.id,
      doctorId: appointment.doctor_id as string,
      startsAt: appointment.datetime,
      status: appointment.status,
      patientName: db.patients.find((patient) => patient.id === appointment.patient_id)?.full_name ?? "Patient",
      patientId: appointment.patient_id,
    }));
}

/** Mirror of a remote submit_booking row for local demo auth sessions. */
export async function submitBooking(input: LocalBookingInput): Promise<string> {
  hydratePersistedBookings();
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error("Full name is required");
  if (!email) throw new Error("Email is required");

  const slug = input.doctorSlug.trim();
  const doctor = slug ? (db.doctors.find((d) => d.slug === slug) ?? null) : null;
  const doctorId = doctor?.id ?? null;

  let visitType: Appointment["visit_type"] = "in_person";
  let campus = "Fairmont Ridge";
  if (input.visitPreference === "telehealth") {
    visitType = "telehealth";
    campus = "Telehealth";
  } else if (input.visitPreference === "alder-bay") {
    campus = "Alder Bay";
  }

  const now = new Date().toISOString();
  const status: Appointment["status"] = doctorId ? "pending" : "unassigned";
  const pipeline_stage: Appointment["pipeline_stage"] = "pending_intake";
  let slotStart: string | null = null;
  let slotDate: string | null = null;
  let slotTime: string | null = null;

  if (input.startsAt) {
    if (!doctorId) throw new AvailabilityError("validation", "Choose a physician before booking a time.");
    const schedule = readAvailability();
    const slot = assertSlotBookable({
      doctorId,
      startsAt: input.startsAt,
      windows: schedule.windows,
      blocks: schedule.blocks,
      appointments: listBusyAppointments(),
    });
    visitType = slot.visitType;
    campus = slot.visitType === "telehealth" ? "Telehealth" : slot.location || "Fairmont Ridge";
    slotStart = slot.startsAt;
    slotDate = hospitalDateFromIso(slot.startsAt);
    slotTime = `${hospitalClock(slot.startsAt)}:00`;
  }

  let patient = db.patients.find((p) => (p.email ?? "").toLowerCase() === email);
  if (!patient) {
    patient = {
      id: newId(),
      full_name: fullName,
      dob: input.dob || null,
      email,
      phone: input.phone.trim() || null,
      address: null,
      insurance: input.insurance.trim() || null,
      assigned_doctor_id: doctorId,
      created_at: now,
    };
    db.patients.unshift(patient);
  } else {
    patient.full_name = fullName;
    if (input.dob) patient.dob = input.dob;
    if (input.phone.trim()) patient.phone = input.phone.trim();
    if (input.insurance.trim()) patient.insurance = input.insurance.trim();
    if (doctorId) patient.assigned_doctor_id = doctorId;
  }

  if (input.id && db.appointments.some((a) => a.id === input.id)) {
    persistBookings();
    return input.id;
  }

  const appointment: Appointment = {
    id: input.id || newId(),
    patient_id: patient.id,
    doctor_id: doctorId,
    datetime: slotStart ?? now,
    appointment_date: slotDate,
    appointment_time: slotTime,
    status,
    pipeline_stage,
    reason_for_visit: input.reason.trim() || null,
    preferred_specialty: input.preferredSpecialty.trim() || null,
    visit_preference: input.visitPreference.trim() || null,
    visit_type: visitType,
    campus,
    created_at: now,
  };
  db.appointments.unshift(appointment);
  await writeAudit(
    "booking.submit",
    "appointments",
    appointment.id,
    `Public booking for ${email} (doctor_slug=${slug || "none"})`,
  );
  persistBookings();

  // Fire-and-forget: never block the patient response on email delivery.
  void requestGmailNotification({
    type: "request_submitted",
    to: email,
    bookingId: appointment.id,
    patientName: fullName,
    reasonForVisit: input.reason.trim() || "Not specified",
  }).catch((err) => {
    console.warn("[submitBooking] request_submitted email failed:", err);
  });

  return appointment.id;
}

export type AssignAppointmentResult = {
  emailOk: boolean;
  emailMocked?: boolean;
  emailError?: string;
};

export async function assignAppointmentDoctor(
  appointmentId: string,
  doctorId: string,
  patientId: string,
  slot: AssignAppointmentSlot,
): Promise<AssignAppointmentResult> {
  const appt = db.appointments.find((a) => a.id === appointmentId);
  if (!appt) throw new Error("Appointment not found.");
  if (!slot.appointmentDate?.trim() || !slot.appointmentTime?.trim()) {
    throw new Error("Appointment date and time are required.");
  }

  const datetime = combineAppointmentDateTime(slot.appointmentDate, slot.appointmentTime);
  const clash = listBusyAppointments().some(
    (appointment) =>
      appointment.id !== appointmentId &&
      appointment.doctorId === doctorId &&
      statusHoldsSlot(appointment.status) &&
      sameSlotInstant(appointment.startsAt, datetime),
  );
  if (clash) throw new AvailabilityError("taken", SLOT_TAKEN_MESSAGE);
  const timeStored =
    slot.appointmentTime.trim().length === 5
      ? `${slot.appointmentTime.trim()}:00`
      : slot.appointmentTime.trim();

  appt.doctor_id = doctorId;
  appt.appointment_date = slot.appointmentDate.trim();
  appt.appointment_time = timeStored;
  appt.datetime = datetime;
  appt.status = "confirmed";
  appt.pipeline_stage = "confirmed";

  const patient = db.patients.find((p) => p.id === patientId);
  if (patient) patient.assigned_doctor_id = doctorId;

  const doctor = db.doctors.find((d) => d.id === doctorId);
  await writeAudit(
    "appointment.assign",
    "appointments",
    appointmentId,
    `${doctorId} @ ${slot.appointmentDate} ${slot.appointmentTime}`,
  );
  persistBookings();

  const location =
    appt.visit_type === "telehealth" || appt.campus === "Telehealth"
      ? "Telehealth — join link will be shared before your visit"
      : `${appt.campus} campus`;

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
    patientName: patient.full_name,
    doctorName: doctor?.name ?? "Your physician",
    doctorSpecialty: doctor?.specialty ?? appt.preferred_specialty ?? "General",
    appointmentDate: slot.appointmentDate.trim(),
    appointmentTime: timeStored,
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

export async function setDoctorAppointmentStatus(
  actorDoctorId: string,
  appointmentId: string,
  status: "confirmed" | "cancelled",
) {
  hydratePersistedBookings();
  const appointment = db.appointments.find((item) => item.id === appointmentId);
  if (!appointment || appointment.doctor_id !== actorDoctorId) {
    throw new Error("You can only update your own appointments.");
  }
  if (status === "confirmed" && appointment.status !== "pending" && appointment.status !== "confirmed") {
    throw new Error("Only a pending visit can be confirmed.");
  }
  appointment.status = status;
  if (status === "confirmed") appointment.pipeline_stage = "confirmed";
  await writeAudit(
    status === "confirmed" ? "appointment.confirm" : "appointment.decline",
    "appointments",
    appointmentId,
    actorDoctorId,
  );
  persistBookings();
}

export async function cancelSharedAppointment(appointmentId: string) {
  hydratePersistedBookings();
  const appointment = db.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return false;
  appointment.status = "cancelled";
  persistBookings();
  return true;
}

export async function rescheduleSharedAppointment(appointmentId: string, startsAt: string) {
  hydratePersistedBookings();
  const appointment = db.appointments.find((item) => item.id === appointmentId);
  if (!appointment?.doctor_id) return false;
  const schedule = readAvailability();
  const slot = assertSlotBookable({
    doctorId: appointment.doctor_id,
    startsAt,
    windows: schedule.windows,
    blocks: schedule.blocks,
    appointments: listBusyAppointments(),
    excludeAppointmentId: appointmentId,
  });
  appointment.datetime = slot.startsAt;
  appointment.appointment_date = hospitalDateFromIso(slot.startsAt);
  appointment.appointment_time = `${hospitalClock(slot.startsAt)}:00`;
  appointment.visit_type = slot.visitType;
  appointment.campus = slot.visitType === "telehealth" ? "Telehealth" : slot.location || appointment.campus;
  if (slot.visitType === "telehealth") appointment.visit_preference = "telehealth";
  persistBookings();
  return true;
}

export async function fetchPatientTimeline(patientId: string): Promise<PatientTimeline> {
  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) throw new Error("Patient not found.");
  return {
    patient,
    appointments: db.appointments.filter((a) => a.patient_id === patientId).map(withRelations),
    reports: db.reports.filter((r) => r.patient_id === patientId),
    medications: db.medications.filter((m) => m.patient_id === patientId),
    reminders: db.reminders.filter((r) => r.patient_id === patientId),
    followups: db.followups.filter((f) => f.patient_id === patientId),
    activity: db.activity.filter((a) => a.patient_id === patientId),
  };
}

export async function saveReport(
  payload: Database["public"]["Tables"]["patient_reports"]["Insert"] & { id?: string },
) {
  const { id, ...rest } = payload;
  if (id) {
    const row = db.reports.find((r) => r.id === id);
    if (!row) throw new Error("Save failed.");
    row.diagnosis = rest.diagnosis ?? null;
    row.notes = rest.notes ?? null;
    row.vitals = rest.vitals ?? {};
    row.ai_drafted = rest.ai_drafted ?? false;
    row.approved_by_doctor = false;
    await writeAudit("report.save", "patient_reports", row.id, "Saved report draft");
    return row;
  }
  const created: Report = {
    id: newId(),
    patient_id: rest.patient_id,
    doctor_id: rest.doctor_id,
    appointment_id: rest.appointment_id ?? null,
    diagnosis: rest.diagnosis ?? null,
    notes: rest.notes ?? null,
    vitals: rest.vitals ?? {},
    ai_drafted: rest.ai_drafted ?? false,
    approved_by_doctor: false,
    created_at: new Date().toISOString(),
  };
  db.reports.unshift(created);
  await writeAudit("report.save", "patient_reports", created.id, "Saved report draft");
  return created;
}

export async function approveReport(id: string) {
  const row = db.reports.find((r) => r.id === id);
  if (!row) throw new Error("Report not found.");
  row.approved_by_doctor = true;
  await writeAudit("report.approve", "patient_reports", id, "Doctor approved report");
  return row;
}

export async function saveMedicationPlan(payload: Database["public"]["Tables"]["medication_plans"]["Insert"]) {
  const created: MedPlan = {
    id: newId(),
    patient_id: payload.patient_id,
    doctor_id: payload.doctor_id,
    drug_name: payload.drug_name,
    dose: payload.dose,
    schedule: payload.schedule,
    duration: payload.duration ?? null,
    created_at: new Date().toISOString(),
  };
  db.medications.unshift(created);
  await writeAudit("medication.create", "medication_plans", created.id, payload.drug_name);
  return created;
}

export async function saveReminder(payload: Database["public"]["Tables"]["ai_reminders"]["Insert"]) {
  const created: Reminder = {
    id: newId(),
    patient_id: payload.patient_id,
    medication_plan_id: payload.medication_plan_id ?? null,
    scheduled_time: payload.scheduled_time,
    channel: payload.channel ?? "sms",
    status: payload.status ?? "pending",
    approved_to_send: payload.approved_to_send ?? false,
    created_at: new Date().toISOString(),
  };
  db.reminders.unshift(created);
  await writeAudit("reminder.create", "ai_reminders", created.id, "Reminder scheduled (not sent without approval)");

  if (
    (created.channel === "sms" || created.channel === "cold_call") &&
    created.approved_to_send
  ) {
    return finalizeOutboundReminder(created);
  }

  return created;
}

async function finalizeOutboundReminder(
  created: Reminder,
): Promise<Reminder & { outbound: OutboundReminderMeta }> {
  const plan = created.medication_plan_id
    ? db.medications.find((m) => m.id === created.medication_plan_id)
    : undefined;

  const scheduled = await scheduleOutboundReminder({
    reminderId: created.id,
    patientId: created.patient_id,
    medicationPlanId: created.medication_plan_id,
    channel: created.channel as "sms" | "cold_call",
    scheduledTime: created.scheduled_time,
    ...(plan?.drug_name ? { drugName: plan.drug_name } : {}),
    ...(plan?.dose ? { dose: plan.dose } : {}),
    ...(plan?.schedule ? { schedule: plan.schedule } : {}),
  });

  if (!scheduled.ok) {
    const failed: Reminder = { ...created, status: "failed" };
    const idx = db.reminders.findIndex((r) => r.id === created.id);
    if (idx >= 0) {
      const current = db.reminders[idx];
      if (current) db.reminders[idx] = { ...current, status: "failed" };
    }
    db.activity.unshift({
      id: newId(),
      patient_id: created.patient_id,
      activity_type: "medication_reminder",
      outcome: "escalated",
      summary: `${created.channel} reminder failed to schedule: ${scheduled.error}`,
      related_id: created.id,
      created_at: new Date().toISOString(),
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
    return { ...failed, outbound: { job: fakeJob } };
  }

  return applyReminderJobResult(created, scheduled.job);
}

/** Apply a scheduler job result onto the local reminder + ai_activity. */
export function applyReminderJobResult(
  created: Reminder,
  job: ReminderJob,
): Reminder & { outbound: OutboundReminderMeta } {
  let nextStatus: Reminder["status"] = created.status;
  if (job.status === "sent") nextStatus = "sent";
  if (job.status === "failed") nextStatus = "failed";
  if (job.status === "scheduled" || job.status === "running") nextStatus = "pending";

  const idx = db.reminders.findIndex((r) => r.id === created.id);
  if (idx >= 0) {
    const current = db.reminders[idx];
    if (current) db.reminders[idx] = { ...current, status: nextStatus };
  }
  const updated: Reminder = { ...created, status: nextStatus };

  if (job.status === "scheduled") {
    db.activity.unshift({
      id: newId(),
      patient_id: created.patient_id,
      activity_type: "medication_reminder",
      outcome: "completed",
      summary: `${job.channel} medication reminder scheduled for ${new Date(job.runAt).toLocaleString()} (job ${job.id}).`,
      related_id: created.id,
      created_at: new Date().toISOString(),
    });
    void writeAudit(
      "reminder.outbound_scheduled",
      "ai_reminders",
      created.id,
      `Scheduled ${job.channel} for ${job.runAt}`,
    );
  } else if (job.status === "sent") {
    db.activity.unshift({
      id: newId(),
      patient_id: created.patient_id,
      activity_type: "medication_reminder",
      outcome: "completed",
      summary: `${job.channel} medication reminder to ${job.to ?? "test number"} (Twilio ${job.sid}, status ${job.twilioStatus}).`,
      related_id: created.id,
      created_at: new Date().toISOString(),
    });
    void writeAudit(
      "reminder.outbound_sent",
      "ai_reminders",
      created.id,
      job.sid ? `Twilio SID ${job.sid}` : "sent",
    );
  } else if (job.status === "failed") {
    db.activity.unshift({
      id: newId(),
      patient_id: created.patient_id,
      activity_type: "medication_reminder",
      outcome: "escalated",
      summary: `${job.channel} medication reminder failed: ${job.error ?? "unknown error"}`,
      related_id: created.id,
      created_at: new Date().toISOString(),
    });
    void writeAudit(
      "reminder.outbound_failed",
      "ai_reminders",
      created.id,
      job.error ?? "failed",
    );
  }

  return { ...updated, outbound: { job } };
}

export async function syncReminderJob(reminderId: string): Promise<(Reminder & { outbound: OutboundReminderMeta }) | null> {
  const result = await fetchReminderJob({ reminderId });
  if (!result.ok) return null;
  const created = db.reminders.find((r) => r.id === reminderId);
  if (!created) return null;
  // Avoid duplicate "scheduled" activity spam on poll — only apply terminal/new states.
  if (result.job.status === "scheduled" && created.status === "pending") {
    return { ...created, outbound: { job: result.job } };
  }
  if (
    (result.job.status === "sent" && created.status === "sent") ||
    (result.job.status === "failed" && created.status === "failed")
  ) {
    return { ...created, outbound: { job: result.job } };
  }
  return applyReminderJobResult(created, result.job);
}

export async function saveFollowup(payload: Database["public"]["Tables"]["ai_followups"]["Insert"]) {
  const created: AiFollowup = {
    id: newId(),
    patient_id: payload.patient_id,
    doctor_id: payload.doctor_id,
    follow_up_date: payload.follow_up_date,
    status: payload.status ?? "scheduled",
    summary_json: payload.summary_json ?? {},
    transcript_text: payload.transcript_text ?? null,
    resolved_at: payload.resolved_at ?? null,
    created_at: new Date().toISOString(),
  };
  db.followups.unshift(created);
  await writeAudit("followup.schedule", "ai_followups", created.id, "Follow-up scheduled");
  return created;
}

export async function fetchFollowupResults(doctorId: string): Promise<FollowupResultRow[]> {
  const rows: FollowupResultRow[] = db.followups
    .filter((f) => f.doctor_id === doctorId && f.status === "completed")
    .map((f) => {
      const patient = db.patients.find((p) => p.id === f.patient_id) ?? null;
      return {
        ...f,
        patients: patient ? { id: patient.id, full_name: patient.full_name } : null,
      };
    });
  return rows.sort((a, b) => {
    const aj = a.summary_json as { escalation_flag?: boolean } | null;
    const bj = b.summary_json as { escalation_flag?: boolean } | null;
    const ae = aj?.escalation_flag || a.status === "escalated" ? 0 : 1;
    const be = bj?.escalation_flag || b.status === "escalated" ? 0 : 1;
    if (ae !== be) return ae - be;
    return new Date(b.follow_up_date).getTime() - new Date(a.follow_up_date).getTime();
  });
}
