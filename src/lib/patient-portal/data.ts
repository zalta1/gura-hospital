import { formatWallClock } from "@/lib/portal/availability";
import { fetchPatientTimeline } from "@/lib/portal/queries";
import {
  morganActivity,
  morganAnnouncements,
  morganAppointments,
  morganCareNotes,
  morganCheckIns,
  morganDoctors,
  morganDocuments,
  morganEstimates,
  morganImaging,
  morganLabs,
  morganMedications,
  morganMessages,
  morganNotifications,
  morganPastFollowUps,
  morganPatient,
  morganStatements,
  morganVisitSummaries,
  morganVitals,
} from "@/lib/patient-portal/demoPatientMorgan";
import { MORGAN_PATIENT_ID, type ApptStatus, type DemoState, type PortalAppointment, type PortalSnapshot, type SearchHit } from "@/lib/patient-portal/types";

function scoped<T extends { patientId: string }>(rows: T[], patientId: string) {
  return rows.filter((row) => row.patientId === patientId);
}

function mapStatus(status: string): ApptStatus {
  if (status === "confirmed" || status === "completed" || status === "cancelled" || status === "pending") {
    return status;
  }
  return "pending";
}

/** Reads only this patient's appointments from the shared portal store. */
export async function loadSharedAppointments(patientId: string): Promise<PortalAppointment[]> {
  if (patientId !== MORGAN_PATIENT_ID) return [];
  try {
    const timeline = await fetchPatientTimeline(patientId);
    return timeline.appointments
      .filter((row) => row.patient_id === patientId)
      .map((row) => ({
        id: row.id,
        patientId,
        doctorId: row.doctor_id ?? morganPatient.primaryDoctorId,
        reason: row.reason_for_visit || "Visit",
        datetime: row.datetime,
        status: mapStatus(row.status),
        mode: row.visit_type === "telehealth" || row.visit_preference === "telehealth" ? "telehealth" : "in_person",
        location: row.visit_type === "telehealth" || row.visit_preference === "telehealth" ? "Video visit" : row.campus || "Gura Hospital",
        ...(row.appointment_date && row.appointment_time
          ? { timeLabel: formatWallClock(row.appointment_date, row.appointment_time) }
          : {}),
        shared: row.id === "a2222222-2222-2222-2222-222222222222",
      }));
  } catch {
    return [];
  }
}

export function buildSnapshot(patientId: string, state: DemoState, shared: PortalAppointment[]): PortalSnapshot | null {
  if (patientId !== morganPatient.id) return null;

  const byId = new Map<string, PortalAppointment>();
  for (const row of scoped(morganAppointments, patientId)) byId.set(row.id, row);
  for (const row of shared.filter((row) => row.patientId === patientId)) {
    const existing = byId.get(row.id);
    byId.set(row.id, existing ? { ...existing, ...row, patientId } : row);
  }

  const appointments = [...byId.values()]
    .map((row) => {
      const override = state.appointmentOverrides[row.id];
      return override ? { ...row, ...override } : row;
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const read = new Set(state.readMessageIds);
  const messages = [...scoped(morganMessages, patientId), ...state.extraMessages.filter((m) => m.patientId === patientId)]
    .map((message) => ({ ...message, read: message.read || read.has(message.id) }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const checkIns = scoped(morganCheckIns, patientId).map((item) =>
    state.completedCheckInIds.includes(item.id) ? { ...item, status: "completed" as const } : item,
  );

  const notifications = [...scoped(morganNotifications, patientId), ...state.extraNotifications.filter((n) => n.patientId === patientId)].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  const statements = scoped(morganStatements, patientId).map((row) =>
    state.paidStatementIds.includes(row.id) ? { ...row, status: "paid" as const, patientBalance: 0 } : row,
  );

  return {
    patient: morganPatient,
    doctors: morganDoctors,
    appointments,
    messages,
    medications: scoped(morganMedications, patientId),
    labs: scoped(morganLabs, patientId),
    imaging: scoped(morganImaging, patientId),
    statements,
    notifications,
    checkIns,
    pastFollowUps: scoped(morganPastFollowUps, patientId),
    announcements: morganAnnouncements,
    activity: morganActivity,
    vitals: morganVitals,
    documents: morganDocuments,
    visitSummaries: morganVisitSummaries,
    careNotes: morganCareNotes,
    estimates: morganEstimates,
  };
}

export function doctorById(snapshot: PortalSnapshot, id: string) {
  return snapshot.doctors.find((doctor) => doctor.id === id) ?? null;
}

export function doctorName(snapshot: PortalSnapshot, id: string) {
  const doctor = doctorById(snapshot, id);
  if (!doctor) return "Your clinician";
  return `${doctor.name}, ${doctor.credentials}`;
}

export function nextAppointment(snapshot: PortalSnapshot) {
  const open = snapshot.appointments.filter((row) => row.status === "pending" || row.status === "confirmed");
  const pending = open
    .filter((row) => row.status === "pending")
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  if (pending[0]) return pending[0];
  return open.slice().sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())[0] ?? null;
}

export function canJoinVideo(appointment: PortalAppointment, now = Date.now()) {
  if (appointment.mode !== "telehealth") return false;
  if (appointment.status === "cancelled" || appointment.status === "completed") return false;
  const start = new Date(appointment.datetime).getTime();
  return now >= start - 15 * 60 * 1000 && now <= start + 2 * 60 * 60 * 1000;
}

export function todayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function doseKey(medicationId: string, date = new Date()) {
  return `${medicationId}:${todayKey(date)}`;
}

export function unreadMessages(snapshot: PortalSnapshot) {
  return snapshot.messages.filter((message) => message.from !== "patient" && !message.read).length;
}

export function unreadNotifications(snapshot: PortalSnapshot, state: DemoState) {
  return snapshot.notifications.filter((item) => !state.readNotificationIds.includes(item.id)).length;
}

export function outstandingBalance(snapshot: PortalSnapshot) {
  return snapshot.statements.reduce((sum, row) => sum + (row.status === "due" ? row.patientBalance : 0), 0);
}

export function visitsForDoctor(snapshot: PortalSnapshot, doctorId: string) {
  const rows = snapshot.appointments.filter((row) => row.doctorId === doctorId);
  const past = rows
    .filter((row) => row.status === "completed")
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  const upcoming = rows
    .filter((row) => row.status === "pending" || row.status === "confirmed")
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  return { last: past[0] ?? null, next: upcoming[0] ?? null };
}

export function searchPortal(snapshot: PortalSnapshot, query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const row of snapshot.appointments) {
    const doctor = doctorName(snapshot, row.doctorId);
    const hay = `${row.reason} ${doctor} ${row.location}`.toLowerCase();
    if (hay.includes(needle)) {
      hits.push({ id: row.id, kind: "Appointment", title: row.reason, subtitle: doctor, href: "/patient/appointments" });
    }
  }
  for (const doctor of snapshot.doctors) {
    const hay = `${doctor.name} ${doctor.specialty} ${doctor.location}`.toLowerCase();
    if (hay.includes(needle)) {
      hits.push({
        id: doctor.id,
        kind: "Doctor",
        title: `${doctor.name}, ${doctor.credentials}`,
        subtitle: doctor.specialty,
        href: "/patient/doctors",
      });
    }
  }
  for (const med of snapshot.medications) {
    if (`${med.name} ${med.dose}`.toLowerCase().includes(needle)) {
      hits.push({ id: med.id, kind: "Medication", title: med.name, subtitle: med.dose, href: "/patient/medications" });
    }
  }
  for (const lab of snapshot.labs) {
    if (lab.name.toLowerCase().includes(needle)) {
      hits.push({ id: lab.id, kind: "Result", title: lab.name, subtitle: "Lab", href: "/patient/results" });
    }
  }
  for (const study of snapshot.imaging) {
    if (`${study.name} ${study.facility}`.toLowerCase().includes(needle)) {
      hits.push({ id: study.id, kind: "Result", title: study.name, subtitle: "Imaging", href: "/patient/results" });
    }
  }
  return hits.slice(0, 8);
}

export function money(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function ageFromDob(dob: string) {
  const born = new Date(`${dob}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const month = now.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}
