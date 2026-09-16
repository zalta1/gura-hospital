import { insuranceProviders, specialtyGroups } from "@/lib/hospital-data";

export const INTAKE_FIELD_KEYS = [
  "reason",
  "clinical_followup",
  "specialty",
  "insurance",
  "visit_preference",
  "full_name",
  "date_of_birth",
  "email",
  "phone",
] as const;

export type IntakeFieldKey = (typeof INTAKE_FIELD_KEYS)[number];

export type IntakeRecord = Partial<Record<IntakeFieldKey, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /\d{7,}/;
const DOB_RE = /\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/;

const ROUTINE_REASON =
  /\b(annual|physical|checkup|check-up|wellness|preventive|screening|routine|follow-?up visit|medication refill)\b/i;

const CLINICAL_REASON =
  /\b(pain|hurt|worse|worsening|injury|injured|bleed|fever|short(ness)? of breath|dizzy|numb|weak|swelling|infection|chest|stroke|migraine|fracture|fall|vomit|nausea)\b/i;

export function emptyIntake(): IntakeRecord {
  return {};
}

export function seedIntakeFromForm(ctx?: {
  doctorName?: string;
  reason?: string;
  insurance?: string;
  preferredSpecialty?: string;
  visitPreference?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}): IntakeRecord {
  const next: IntakeRecord = {};
  if (ctx?.reason?.trim()) next.reason = ctx.reason.trim();
  if (ctx?.preferredSpecialty?.trim()) next.specialty = ctx.preferredSpecialty.trim();
  if (ctx?.insurance?.trim()) next.insurance = ctx.insurance.trim();
  if (ctx?.visitPreference?.trim()) next.visit_preference = ctx.visitPreference.trim();
  if (ctx?.fullName?.trim()) next.full_name = ctx.fullName.trim();
  if (ctx?.email?.trim()) next.email = ctx.email.trim();
  if (ctx?.phone?.trim()) next.phone = ctx.phone.trim();
  if (ctx?.dateOfBirth?.trim()) next.date_of_birth = ctx.dateOfBirth.trim();
  if (next.reason && !needsClinicalFollowup(next.reason)) {
    next.clinical_followup = "not_needed";
  }
  return next;
}

export function needsClinicalFollowup(reason: string): boolean {
  if (ROUTINE_REASON.test(reason) && !CLINICAL_REASON.test(reason)) return false;
  return true;
}

export function isFieldFilled(key: IntakeFieldKey, value: string | undefined): boolean {
  const v = value?.trim() ?? "";
  if (!v) return false;
  if (key === "email") return EMAIL_RE.test(v);
  if (key === "phone") return PHONE_RE.test(v);
  if (key === "date_of_birth") return DOB_RE.test(v);
  if (key === "clinical_followup") return v.length >= 4 || v === "not_needed";
  if (key === "visit_preference") {
    return /in-?person|fairmont|alder|telehealth|virtual|video/i.test(v);
  }
  return v.length >= 2;
}

export function missingFields(record: IntakeRecord): IntakeFieldKey[] {
  const next = { ...record };
  if (next.reason && !needsClinicalFollowup(next.reason) && !next.clinical_followup) {
    next.clinical_followup = "not_needed";
  }
  return INTAKE_FIELD_KEYS.filter((key) => !isFieldFilled(key, next[key]));
}

export function intakeComplete(record: IntakeRecord): boolean {
  return missingFields(record).length === 0;
}

export const FIELD_LABEL: Record<IntakeFieldKey, string> = {
  reason: "reason for visit",
  clinical_followup: "a couple of details about those symptoms",
  specialty: "preferred specialty",
  insurance: "insurance",
  visit_preference: "in-person or telehealth",
  full_name: "full name",
  date_of_birth: "date of birth",
  email: "email",
  phone: "phone number",
};

export function nextAskHint(record: IntakeRecord): string {
  const [first, second] = missingFields(record);
  if (!first) return "All required intake fields are collected. You may call book_appointment.";
  if (first === "clinical_followup") {
    return "Ask one or two natural follow-ups: how long, how severe, and whether it is getting worse. Do not read a checklist.";
  }
  if (second) return `Ask about ${FIELD_LABEL[first]}, then ${FIELD_LABEL[second]}. One or two questions only.`;
  return `Ask about ${FIELD_LABEL[first]}.`;
}

export function mergeIntake(current: IntakeRecord, patch: IntakeRecord): IntakeRecord {
  const next = { ...current };
  for (const key of INTAKE_FIELD_KEYS) {
    const value = patch[key]?.trim();
    if (value) next[key] = value;
  }
  if (next.reason && needsClinicalFollowup(next.reason) && next.clinical_followup === "not_needed") {
    delete next.clinical_followup;
  }
  if (next.reason && !needsClinicalFollowup(next.reason) && !next.clinical_followup) {
    next.clinical_followup = "not_needed";
  }
  return next;
}

const intakeBySession = new Map<string, IntakeRecord>();

export function resetIntakeSession(sessionId: string, seed?: IntakeRecord): IntakeRecord {
  const next = seed ? mergeIntake(emptyIntake(), seed) : emptyIntake();
  intakeBySession.set(sessionId, next);
  return { ...next };
}

export function getIntakeSession(sessionId: string): IntakeRecord {
  return { ...(intakeBySession.get(sessionId) ?? emptyIntake()) };
}

export function patchIntakeSession(sessionId: string, patch: IntakeRecord): IntakeRecord {
  const next = mergeIntake(getIntakeSession(sessionId), patch);
  intakeBySession.set(sessionId, next);
  return { ...next };
}

export function intakeStatus(record: IntakeRecord) {
  const missing = missingFields(record);
  return {
    collected: INTAKE_FIELD_KEYS.filter((key) => !missing.includes(key)),
    missing,
    complete: missing.length === 0,
    ask_next: nextAskHint(record),
  };
}

/**
 * Demo roster from the public booking form (`insuranceProviders` in hospital-data).
 * TODO(prod): replace with a live payer/eligibility source — this list is fictional demo data.
 */
export function matchInsurance(query: string): {
  status: "accepted" | "self_pay" | "unknown";
  matched?: string;
  note: string;
} {
  const raw = query.trim();
  if (!raw) {
    return { status: "unknown", note: "Ask whether they have insurance, and the plan name if they do." };
  }
  if (/self-?pay|no insurance|uninsured|none/i.test(raw)) {
    return {
      status: "self_pay",
      matched: "Self-pay / No insurance",
      note: "We can still request a visit as self-pay. A navigator will talk through cost before anything is confirmed.",
    };
  }
  const lower = raw.toLowerCase();
  const hit = insuranceProviders.find((name) => {
    const n = name.toLowerCase();
    const stem = n.replace(/\s*\(.*\)\s*/g, "").trim();
    if (lower.length < 4) return n === lower || stem === lower;
    return n.includes(lower) || lower.includes(stem);
  });
  if (hit) {
    return {
      status: "accepted",
      matched: hit,
      note: `${hit} is on Gura Hospital's published accepted-plans list for this demo. A navigator still verifies benefits before the visit.`,
    };
  }
  return {
    status: "unknown",
    note: `${raw} is not on the hospital's published list (${insuranceProviders.filter((p) => !/self-pay/i.test(p)).join(", ")}). Do not invent coverage. A navigator will verify.`,
  };
}

export function specialtyTitles(): string[] {
  return specialtyGroups.map((g) => g.title);
}
