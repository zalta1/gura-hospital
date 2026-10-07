import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AvailabilityError,
  assertSlotBookable,
  createBlockIn,
  createWindowIn,
  deleteBlockIn,
  deleteWindowIn,
  hospitalClock,
  hospitalDateFromIso,
  listDoctorDaySlots,
  listFreeSlots,
  toPublicSlot,
  updateWindowIn,
  type AvailabilityBlock,
  type AvailabilityWindow,
  type BlockDraft,
  type BusyAppointment,
  type VisitType,
  type WindowDraft,
} from "@/lib/portal/availability";

type Admin = SupabaseClient;

function adminClient() {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
  if (!url || !key) {
    throw new AvailabilityError("validation", "Availability storage is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireDoctorId(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token === "local-demo-token") {
    throw new AvailabilityError("forbidden", "Sign in required.");
  }
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new AvailabilityError("forbidden", "Sign in required.");
  const { data: doctor, error: doctorError } = await admin
    .from("doctors")
    .select("id")
    .eq("profile_id", data.user.id)
    .maybeSingle();
  if (doctorError || !doctor?.id) {
    throw new AvailabilityError("forbidden", "You can only change your own schedule.");
  }
  return { admin, doctorId: doctor.id as string };
}

function clock(value: unknown) {
  return String(value ?? "").slice(0, 5);
}

function asWindow(row: Record<string, unknown>): AvailabilityWindow {
  const recurring = Boolean(row["recurring"]);
  return {
    id: String(row["id"]),
    doctorId: String(row["doctor_id"]),
    date: recurring ? null : row["availability_date"] ? String(row["availability_date"]) : null,
    weekday: recurring && row["weekday"] != null ? Number(row["weekday"]) : null,
    startTime: clock(row["start_time"]),
    endTime: clock(row["end_time"]),
    visitType: row["visit_type"] === "telehealth" ? "telehealth" : "in_person",
    location: row["location"] ? String(row["location"]) : null,
    recurring,
    recurrenceEndDate: row["recurrence_end_date"] ? String(row["recurrence_end_date"]) : null,
    createdAt: String(row["created_at"]),
  };
}

function asBlock(row: Record<string, unknown>): AvailabilityBlock {
  return {
    id: String(row["id"]),
    doctorId: String(row["doctor_id"]),
    startsAt: String(row["starts_at"]),
    endsAt: String(row["ends_at"]),
    createdAt: String(row["created_at"]),
  };
}

async function loadSchedule(admin: Admin, doctorId: string) {
  const [windowsResult, blocksResult] = await Promise.all([
    admin.from("doctor_availability").select("*").eq("doctor_id", doctorId),
    admin.from("doctor_blocks").select("*").eq("doctor_id", doctorId),
  ]);
  if (windowsResult.error) throw new AvailabilityError("validation", windowsResult.error.message);
  if (blocksResult.error) throw new AvailabilityError("validation", blocksResult.error.message);
  return {
    windows: ((windowsResult.data ?? []) as Record<string, unknown>[]).map(asWindow),
    blocks: ((blocksResult.data ?? []) as Record<string, unknown>[]).map(asBlock),
  };
}

async function loadBusy(admin: Admin, doctorId: string, withNames: boolean): Promise<BusyAppointment[]> {
  const selection = withNames
    ? "id, doctor_id, datetime, status, appointment_date, patient_id, patients(full_name)"
    : "id, doctor_id, datetime, status, appointment_date, patient_id";
  const { data, error } = await admin.from("appointments").select(selection).eq("doctor_id", doctorId);
  if (error) throw new AvailabilityError("validation", error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[])
    .filter((row) => row["doctor_id"] && row["datetime"] && row["appointment_date"])
    .map((row) => {
      const patients = row["patients"] as { full_name?: string } | { full_name?: string }[] | null;
      const named = Array.isArray(patients) ? patients[0] : patients;
      return {
        id: String(row["id"]),
        doctorId: String(row["doctor_id"]),
        startsAt: String(row["datetime"]),
        status: String(row["status"]),
        patientName: withNames ? named?.full_name || "Patient" : "",
        patientId: row["patient_id"] ? String(row["patient_id"]) : null,
      };
    });
}

function windowRow(window: AvailabilityWindow) {
  return {
    id: window.id,
    doctor_id: window.doctorId,
    availability_date: window.date,
    weekday: window.weekday,
    start_time: window.startTime,
    end_time: window.endTime,
    visit_type: window.visitType,
    location: window.location,
    recurring: window.recurring,
    recurrence_end_date: window.recurrenceEndDate,
    created_at: window.createdAt,
  };
}

export async function publicFreeSlots(doctorId: string, from: string, to: string) {
  const admin = adminClient();
  const schedule = await loadSchedule(admin, doctorId);
  const appointments = await loadBusy(admin, doctorId, false);
  return listFreeSlots({
    doctorId,
    from,
    to,
    windows: schedule.windows,
    blocks: schedule.blocks,
    appointments,
  }).map(toPublicSlot);
}

export async function doctorSchedule(doctorId: string, date?: string) {
  const admin = adminClient();
  const schedule = await loadSchedule(admin, doctorId);
  const appointments = await loadBusy(admin, doctorId, true);
  return {
    windows: schedule.windows.filter((window) => window.doctorId === doctorId),
    blocks: schedule.blocks.filter((block) => block.doctorId === doctorId),
    slots: date
      ? listDoctorDaySlots({
          doctorId,
          date,
          windows: schedule.windows,
          blocks: schedule.blocks,
          appointments,
        })
      : [],
  };
}

export async function createDoctorWindows(doctorId: string, drafts: WindowDraft[]) {
  const admin = adminClient();
  const schedule = await loadSchedule(admin, doctorId);
  let windows = schedule.windows;
  const created: AvailabilityWindow[] = [];
  for (const draft of drafts) {
    const window = createWindowIn(windows, doctorId, { ...draft, id: crypto.randomUUID() });
    windows = [...windows, window];
    created.push(window);
  }
  const { error } = await admin.from("doctor_availability").insert(created.map(windowRow));
  if (error) throw new AvailabilityError("validation", error.message);
  return created;
}

export async function updateDoctorWindow(doctorId: string, id: string, draft: WindowDraft) {
  const admin = adminClient();
  const schedule = await loadSchedule(admin, doctorId);
  const appointments = await loadBusy(admin, doctorId, true);
  const windows = updateWindowIn(schedule.windows, doctorId, id, draft, appointments);
  const window = windows.find((item) => item.id === id);
  if (!window) throw new AvailabilityError("validation", "That availability window was not found.");
  const { error } = await admin.from("doctor_availability").update(windowRow(window)).eq("id", id).eq("doctor_id", doctorId);
  if (error) throw new AvailabilityError("validation", error.message);
  return window;
}

export async function deleteDoctorWindow(doctorId: string, id: string) {
  const admin = adminClient();
  const schedule = await loadSchedule(admin, doctorId);
  const appointments = await loadBusy(admin, doctorId, true);
  deleteWindowIn(schedule.windows, doctorId, id, appointments);
  const { error } = await admin.from("doctor_availability").delete().eq("id", id).eq("doctor_id", doctorId);
  if (error) throw new AvailabilityError("validation", error.message);
}

export async function createDoctorBlock(doctorId: string, draft: BlockDraft) {
  const admin = adminClient();
  const block = createBlockIn(doctorId, { ...draft, id: crypto.randomUUID() });
  const { error } = await admin.from("doctor_blocks").insert({
    id: block.id,
    doctor_id: block.doctorId,
    starts_at: block.startsAt,
    ends_at: block.endsAt,
    created_at: block.createdAt,
  });
  if (error) throw new AvailabilityError("validation", error.message);
  return block;
}

export async function deleteDoctorBlock(doctorId: string, id: string) {
  const admin = adminClient();
  const schedule = await loadSchedule(admin, doctorId);
  deleteBlockIn(schedule.blocks, doctorId, id);
  const { error } = await admin.from("doctor_blocks").delete().eq("id", id).eq("doctor_id", doctorId);
  if (error) throw new AvailabilityError("validation", error.message);
}

type BookingBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  insurance?: string;
  reason?: string;
  preferredSpecialty?: string;
  visitPreference?: string;
  doctorSlug?: string;
  startsAt?: string;
};

export async function bookPublicSlot(input: BookingBody) {
  const fullName = input.fullName?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const startsAt = input.startsAt ?? "";
  if (!fullName || !email || !startsAt) {
    throw new AvailabilityError("validation", "Name, email, and an open time are required.");
  }
  const admin = adminClient();
  const slug = input.doctorSlug?.trim() ?? "";
  const { data: doctor, error: doctorError } = await admin.from("doctors").select("id").eq("slug", slug).maybeSingle();
  if (doctorError || !doctor?.id) {
    throw new AvailabilityError("validation", "Choose a physician before booking a time.");
  }
  const doctorId = doctor.id as string;
  const schedule = await loadSchedule(admin, doctorId);
  const appointments = await loadBusy(admin, doctorId, false);
  const slot = assertSlotBookable({
    doctorId,
    startsAt,
    windows: schedule.windows,
    blocks: schedule.blocks,
    appointments,
  });

  let patientId: string | null = null;
  const { data: existing } = await admin.from("patients").select("id").ilike("email", email).maybeSingle();
  if (existing?.id) {
    patientId = existing.id as string;
    await admin
      .from("patients")
      .update({
        full_name: fullName,
        phone: input.phone?.trim() || null,
        insurance: input.insurance?.trim() || null,
        assigned_doctor_id: doctorId,
      })
      .eq("id", patientId);
  } else {
    const { data: created, error: patientError } = await admin
      .from("patients")
      .insert({
        full_name: fullName,
        email,
        dob: input.dob?.trim() || null,
        phone: input.phone?.trim() || null,
        insurance: input.insurance?.trim() || null,
        assigned_doctor_id: doctorId,
      })
      .select("id")
      .single();
    if (patientError || !created?.id) throw new AvailabilityError("validation", patientError?.message || "Could not save the patient.");
    patientId = created.id as string;
  }

  const visitType: VisitType = slot.visitType;
  const { data: appointment, error } = await admin
    .from("appointments")
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      datetime: slot.startsAt,
      appointment_date: hospitalDateFromIso(slot.startsAt),
      appointment_time: `${hospitalClock(slot.startsAt)}:00`,
      status: "pending",
      pipeline_stage: "pending_intake",
      reason_for_visit: input.reason?.trim() || null,
      preferred_specialty: input.preferredSpecialty?.trim() || null,
      visit_preference: visitType === "telehealth" ? "telehealth" : input.visitPreference || "in-person",
      visit_type: visitType,
      campus: visitType === "telehealth" ? "Telehealth" : slot.location || "Fairmont Ridge",
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new AvailabilityError("taken", "That time was just booked. Please choose another opening.");
    throw new AvailabilityError("validation", error.message);
  }
  return String(appointment.id);
}

export function availabilityErrorResponse(error: unknown) {
  if (error instanceof AvailabilityError) {
    const status = error.code === "forbidden" ? 403 : error.code === "taken" ? 409 : 400;
    return Response.json({ error: error.message, code: error.code, affected: error.affected }, { status });
  }
  const message = error instanceof Error ? error.message : "Request failed.";
  return Response.json({ error: message, code: "validation", affected: [] }, { status: 400 });
}
