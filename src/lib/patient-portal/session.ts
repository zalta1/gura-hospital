import { MORGAN_PATIENT_ID, type DemoState } from "@/lib/patient-portal/types";

const SESSION_KEY = "gura_patient_portal_session";
const STATE_KEY = "gura_patient_portal_state";

export type PatientSession = {
  patientId: string;
  fullName: string;
  signedInAt: string;
};

export function readPatientSession(): PatientSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PatientSession;
    if (!parsed?.patientId || typeof parsed.patientId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePatientSession(session: PatientSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearPatientSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function signInAsMorgan(): PatientSession {
  const session: PatientSession = {
    patientId: MORGAN_PATIENT_ID,
    fullName: "Morgan Ellis",
    signedInAt: new Date().toISOString(),
  };
  writePatientSession(session);
  return session;
}

export function defaultDemoState(): DemoState {
  return {
    extraMessages: [],
    readMessageIds: [],
    takenDoseKeys: [],
    refillPendingIds: [],
    completedCheckInIds: [],
    followUpAnswers: {},
    readNotificationIds: [],
    extraNotifications: [],
    appointmentOverrides: {},
    paidStatementIds: [],
    correctionNote: null,
    supportMessages: [
      {
        id: "support-welcome",
        from: "support",
        body: "Hello, this is Gura patient support. This chat is a demo and is not monitored. Call (555) 210-0000, or 911 in an emergency.",
        at: "2026-10-03T08:00:00",
      },
    ],
    largeText: false,
    language: "en",
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function readDemoState(): DemoState {
  const base = defaultDemoState();
  if (typeof window === "undefined") return base;
  const raw = window.localStorage.getItem(STATE_KEY);
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      ...base,
      ...parsed,
      extraMessages: Array.isArray(parsed.extraMessages) ? parsed.extraMessages : [],
      readMessageIds: asStringArray(parsed.readMessageIds),
      takenDoseKeys: asStringArray(parsed.takenDoseKeys),
      refillPendingIds: asStringArray(parsed.refillPendingIds),
      completedCheckInIds: asStringArray(parsed.completedCheckInIds),
      followUpAnswers: parsed.followUpAnswers && typeof parsed.followUpAnswers === "object" ? parsed.followUpAnswers : {},
      readNotificationIds: asStringArray(parsed.readNotificationIds),
      extraNotifications: Array.isArray(parsed.extraNotifications) ? parsed.extraNotifications : [],
      appointmentOverrides:
        parsed.appointmentOverrides && typeof parsed.appointmentOverrides === "object"
          ? parsed.appointmentOverrides
          : {},
      paidStatementIds: asStringArray(parsed.paidStatementIds),
      correctionNote: typeof parsed.correctionNote === "string" ? parsed.correctionNote : null,
      supportMessages: Array.isArray(parsed.supportMessages) ? parsed.supportMessages : base.supportMessages,
      largeText: Boolean(parsed.largeText),
      language: parsed.language === "es" ? "es" : "en",
    };
  } catch {
    return base;
  }
}

export function writeDemoState(state: DemoState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function clearDemoState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STATE_KEY);
}
