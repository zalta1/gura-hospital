/**
 * TEMPORARY client-side ElevenLabs tool implementations for local development.
 *
 * These run in the browser with the existing Supabase anon key. Safety depends
 * entirely on RLS (and on security-definer RPCs such as submit_booking).
 *
 * Migrate book_appointment and flag_emergency to Server Tool webhooks behind a
 * service-role key once this site has a public URL. Do not keep PHI-writing
 * tools on the client in production.
 *
 * RPC mismatch (do not change submit_booking without asking):
 * - Dashboard tool fields `doctor_id` + `slot` are NOT arguments on
 *   public.submit_booking. That RPC takes p_doctor_slug (not a UUID) and always
 *   inserts appointments.datetime = now(). We map doctor_id → slug and append
 *   the requested slot onto p_reason so navigators can still see it.
 */

import { supabase } from "@/integrations/supabase/client";
import { physicians, specialtyGroups } from "@/lib/hospital-data";
import { submitBooking } from "@/lib/portal/booking";
import { isLocalPortalDemo, doctorIdForSlug } from "@/lib/portal/local-demo";
import { fetchAppointments, flagVoiceEmergency } from "@/lib/portal/local-store";
import {
  getIntakeSession,
  intakeStatus,
  matchInsurance,
  patchIntakeSession,
  type IntakeRecord,
} from "@/lib/voice/intake";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function str(params: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asJson(value: unknown): string {
  return JSON.stringify(value);
}

function physicianBySlug(slug: string) {
  return physicians.find((p) => p.id === slug) ?? null;
}

function physicianByUuid(id: string) {
  return physicians.find((p) => doctorIdForSlug(p.id) === id) ?? null;
}

/** Accept a Find-a-Doctor slug or a portal UUID and return the booking slug. */
export function resolveDoctorSlug(doctorId: string): string {
  const id = doctorId.trim();
  if (!id) return "";
  if (!UUID_RE.test(id)) return id;
  return physicianByUuid(id)?.id ?? "";
}

function clinicSlots(startDate: string, endDate: string, occupiedIso: Set<string>): string[] {
  const start = parseDay(startDate);
  const end = parseDay(endDate);
  if (!start || !end || end < start) return [];

  const slots: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      for (let hour = 9; hour <= 16; hour++) {
        for (const minute of [0, 30]) {
          if (hour === 16 && minute === 30) continue;
          const stamp = localStamp(cursor, hour, minute);
          if (!occupiedIso.has(stamp)) slots.push(stamp);
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return slots.slice(0, 24);
}

function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function localStamp(day: Date, hour: number, minute: number): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:00`;
}

function occupiedKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 16);
  return localStamp(date, date.getHours(), date.getMinutes() < 30 ? 0 : 30);
}

function intakePatchFromParams(params: Record<string, unknown>): IntakeRecord {
  const patch: IntakeRecord = {};
  const reason = str(params, "reason", "reason_for_visit");
  const clinical = str(params, "clinical_followup", "clinical_notes");
  const specialty = str(params, "specialty", "preferred_specialty");
  const insurance = str(params, "insurance");
  const visit = str(params, "visit_preference", "visitPreference", "visit_type");
  const fullName = str(params, "full_name", "fullName", "name");
  const dob = str(params, "date_of_birth", "dob");
  const email = str(params, "email");
  const phone = str(params, "phone");
  if (reason) patch.reason = reason;
  if (clinical) patch.clinical_followup = clinical;
  if (specialty) patch.specialty = specialty;
  if (insurance) patch.insurance = insurance;
  if (visit) patch.visit_preference = visit;
  if (fullName) patch.full_name = fullName;
  if (dob) patch.date_of_birth = dob;
  if (email) patch.email = email;
  if (phone) patch.phone = phone;
  return patch;
}

function incompleteIntakeResponse(record: IntakeRecord) {
  const status = intakeStatus(record);
  return asJson({
    success: false,
    error: "Intake is incomplete. Do not end the call. Ask the next missing fields.",
    collected: status.collected,
    missing: status.missing,
    ask_next: status.ask_next,
  });
}

async function bookAppointment(
  params: Record<string, unknown>,
  sessionId: string,
  extras: { doctorSlug?: string; onBookingSuccess?: (() => void) | undefined },
) {
  const record = patchIntakeSession(sessionId, intakePatchFromParams(params));
  const status = intakeStatus(record);
  if (!status.complete) {
    return incompleteIntakeResponse(record);
  }

  const fullName = record.full_name ?? "";
  const email = record.email ?? "";
  const phone = record.phone ?? "";
  const doctorId = str(params, "doctor_id", "doctorId", "doctor_slug") || extras.doctorSlug || "";
  const slot = str(params, "slot", "appointment_time", "datetime");
  const reason = record.reason ?? "";
  const insurance = record.insurance ?? "";
  const dob = record.date_of_birth ?? "";
  const preferredSpecialty = record.specialty ?? "";
  const visitPreference = record.visit_preference || "in-person";
  const clinical =
    record.clinical_followup && record.clinical_followup !== "not_needed"
      ? record.clinical_followup
      : "";

  const doctorSlug = resolveDoctorSlug(doctorId);
  const physician = doctorSlug ? physicianBySlug(doctorSlug) : null;
  const slotNote = slot ? `Requested slot: ${slot}. ` : "";
  const clinicalNote = clinical ? ` Symptom details: ${clinical}.` : "";
  const combinedReason = `${slotNote}${reason}${clinicalNote}`.trim() || "Voice navigator appointment request";

  try {
    const appointmentId = await submitBooking({
      fullName,
      email,
      phone,
      dob,
      insurance,
      reason: combinedReason,
      preferredSpecialty: preferredSpecialty || physician?.specialty || "",
      visitPreference,
      doctorSlug,
    });

    extras.onBookingSuccess?.();
    const who = physician ? `${physician.name}, ${physician.credentials}` : "the next available specialist";
    const when = slot ? ` for ${slot}` : "";
    return asJson({
      success: true,
      appointment_id: appointmentId,
      confirmation: `Request received for ${fullName} to see ${who}${when}. A navigator will confirm within one business day. This is not a held slot.`,
    });
  } catch (err) {
    return asJson({
      success: false,
      error: err instanceof Error ? err.message : "Booking could not be saved.",
    });
  }
}

async function checkAvailability(params: Record<string, unknown>) {
  const doctorId = str(params, "doctor_id", "doctorId", "doctor_slug");
  const startDate = str(params, "start_date", "startDate", "from");
  const endDate = str(params, "end_date", "endDate", "to") || startDate;
  const doctorSlug = resolveDoctorSlug(doctorId);
  const physician = doctorSlug ? physicianBySlug(doctorSlug) : null;

  if (!doctorSlug || !physician) {
    return asJson({
      success: false,
      error: "Unknown doctor_id. Use a Find a Doctor slug such as nikolai-brandt.",
    });
  }
  if (!startDate) {
    return asJson({ success: false, error: "start_date is required (YYYY-MM-DD)." });
  }

  const occupied = new Set<string>();
  if (isLocalPortalDemo()) {
    try {
      const rows = await fetchAppointments({ doctorId: doctorIdForSlug(doctorSlug) });
      for (const row of rows) {
        if (row.status === "cancelled") continue;
        occupied.add(occupiedKey(row.datetime));
      }
    } catch {
      /* generated clinic hours are enough for spoken availability */
    }
  }

  const slots = clinicSlots(startDate, endDate, occupied);
  return asJson({
    success: true,
    doctor_name: physician.name,
    specialty: physician.specialty,
    slots: slots.slice(0, 8),
    note: "Weekday 9:00–16:00 requestable times. A navigator confirms the slot after the request.",
  });
}

async function flagEmergency(params: Record<string, unknown>, conversationId: string | null) {
  const reason = str(params, "reason");
  const conversation =
    str(params, "conversation_id", "conversationId") || conversationId || "";

  if (!reason) {
    return asJson({ success: false, error: "reason is required." });
  }

  const callerMessage =
    "This sounds like an emergency. Hang up and call 911 now. The emergency department is open 24 hours at 1400 Harborline Avenue.";

  void (async () => {
    const { error } = await supabase.rpc("flag_voice_emergency", {
      p_reason: reason,
      p_conversation_id: conversation || null,
    });
    if (error) {
      await supabase.from("emergency_flags").insert({
        conversation_id: conversation || null,
        reason,
        resolved: false,
      } as never);
    }
    try {
      await flagVoiceEmergency(reason, conversation || null);
    } catch {
      /* demo store is optional */
    }
  })();

  return asJson({
    success: true,
    tell_caller: callerMessage,
  });
}

async function matchDoctor(params: Record<string, unknown>) {
  const query = str(params, "query", "symptom", "specialty", "description").toLowerCase();
  if (!query) {
    return asJson({ success: false, error: "query (symptom or specialty description) is required." });
  }

  type Ranked = {
    slug: string;
    name: string;
    credentials: string;
    specialty: string;
    focus: string;
    group: string;
    office: string;
    score: number;
  };

  const ranked: Ranked[] = physicians.map((p) => {
    const group = specialtyGroups.find((g) => g.slug === p.specialtySlug);
    let score = 0;
    const hay = [
      p.name,
      p.specialty,
      p.subSpecialty,
      p.specialtySlug,
      group?.title ?? "",
      ...(group?.conditions ?? []),
      group?.blurb ?? "",
    ]
      .join(" ")
      .toLowerCase();

    if (p.specialty.toLowerCase() === query) score += 8;
    if (p.specialtySlug === query) score += 8;
    if (hay.includes(query)) score += 5;
    for (const token of query.split(/[\s,/]+/).filter((t) => t.length > 2)) {
      if (p.specialty.toLowerCase().includes(token)) score += 3;
      if (p.subSpecialty.toLowerCase().includes(token)) score += 3;
      if (group?.conditions.some((c) => c.toLowerCase().includes(token))) score += 2;
      if (p.name.toLowerCase().includes(token)) score += 1;
    }
    return {
      slug: p.id,
      name: p.name,
      credentials: p.credentials,
      specialty: p.specialty,
      focus: p.subSpecialty,
      group: group?.title ?? p.specialty,
      office: p.office,
      score,
    };
  });

  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const matches = ranked
    .filter((r) => r.score > 0)
    .slice(0, 3)
    .map(({ slug, name, credentials, specialty, office }) => ({
      slug,
      name,
      credentials,
      specialty,
      office,
    }));

  return asJson({
    success: true,
    matches,
  });
}

function recordIntakeFields(params: Record<string, unknown>, sessionId: string) {
  const record = patchIntakeSession(sessionId, intakePatchFromParams(params));
  const status = intakeStatus(record);
  return asJson({
    success: true,
    collected: status.collected,
    missing: status.missing,
    complete: status.complete,
    ask_next: status.ask_next,
    fields: record,
  });
}

function checkInsurance(params: Record<string, unknown>, sessionId: string) {
  const query = str(params, "plan", "insurance", "query", "provider") || "none";
  const result = matchInsurance(query);
  if (result.matched) {
    patchIntakeSession(sessionId, { insurance: result.matched });
  } else if (query) {
    patchIntakeSession(sessionId, { insurance: query });
  }
  const status = intakeStatus(getIntakeSession(sessionId));
  return asJson({
    ...result,
    // TODO(prod): this match is against the fictional published list in hospital-data.ts,
    // not a live payer/eligibility feed. Do not treat it as verified benefits.
    source: "hospital_published_demo_list",
    collected: status.collected,
    missing: status.missing,
    ask_next: status.ask_next,
  });
}

/**
 * Never register a tool named `end_call` here. @elevenlabs/client disconnects on
 * ANY agent_tool_response whose tool_name is "end_call" (BaseConversation
 * handleAgentToolResponse), regardless of what the handler returns — so a
 * "refuse to hang up" stub would itself force the hangup. Keep end_call
 * disabled server-side via built_in_tools in scripts/sync-voice-agent.mjs.
 */
export type VoiceClientTools = {
  book_appointment: (parameters: Record<string, unknown>) => Promise<string>;
  check_availability: (parameters: Record<string, unknown>) => Promise<string>;
  flag_emergency: (parameters: Record<string, unknown>) => Promise<string>;
  match_doctor: (parameters: Record<string, unknown>) => Promise<string>;
  record_intake_fields: (parameters: Record<string, unknown>) => Promise<string>;
  check_insurance: (parameters: Record<string, unknown>) => Promise<string>;
};

export function createVoiceClientTools(options: {
  getConversationId: () => string | null;
  getSessionId: () => string;
  getDoctorSlug?: () => string;
  onBookingSuccess?: () => void;
}): VoiceClientTools {
  const sessionId = () => options.getSessionId();
  return {
    book_appointment: (parameters) =>
      bookAppointment(parameters, sessionId(), {
        doctorSlug: options.getDoctorSlug?.() ?? "",
        onBookingSuccess: options.onBookingSuccess,
      }),
    check_availability: (parameters) => checkAvailability(parameters),
    flag_emergency: (parameters) => flagEmergency(parameters, options.getConversationId()),
    match_doctor: (parameters) => matchDoctor(parameters),
    record_intake_fields: (parameters) => Promise.resolve(recordIntakeFields(parameters, sessionId())),
    check_insurance: (parameters) => Promise.resolve(checkInsurance(parameters, sessionId())),
  };
}
