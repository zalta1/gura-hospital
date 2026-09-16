/**
 * Derives demo auth accounts from the Find a Doctor physicians list
 * (single source of truth in hospital-data.ts).
 */
import { physicians, specialtyGroups, type Physician } from "./hospital-data";

export const DEMO_DOCTOR_PASSWORD = "DemoGura2026!";
export const DEMO_ADMIN_EMAIL = "admin@gurahospital.demo";

export type DoctorAccount = {
  slug: string;
  name: string;
  credentials: string;
  specialty: string;
  specialtySlug: string;
  specialtyGroupTitle: string;
  office: string;
  phone: string;
  email: string;
};

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

/** "Dr. Amara Velloso, MD, FACC" → "amara velloso" for matching seed rows. */
export function physicianNameKey(name: string): string {
  return stripDiacritics(name)
    .replace(/^Dr\.?\s*/i, "")
    .replace(/,.*$/, "")
    .replace(/[^a-zA-Z\s.-]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** "Dr. Amara Velloso" → "amara.velloso@gurahospital.demo" */
export function emailFromPhysicianName(name: string): string {
  const cleaned = stripDiacritics(name)
    .replace(/^Dr\.?\s*/i, "")
    .replace(/[^a-zA-Z\s.-]/g, " ")
    .trim()
    .toLowerCase();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) throw new Error(`Cannot derive email from name: ${name}`);
  return `${parts.join(".")}@gurahospital.demo`;
}

export function doctorAccountsFromPhysicians(list: Physician[] = physicians): DoctorAccount[] {
  const groupTitle = new Map(specialtyGroups.map((g) => [g.slug, g.title]));
  return list.map((p) => ({
    slug: p.id,
    name: p.name,
    credentials: p.credentials,
    specialty: p.specialty,
    specialtySlug: p.specialtySlug,
    specialtyGroupTitle: groupTitle.get(p.specialtySlug) ?? p.specialty,
    office: p.office,
    phone: p.phone,
    email: emailFromPhysicianName(p.name),
  }));
}

/** Specialty-group order matching Find a Doctor, then name. */
export function doctorAccountsSortedForDemo(): DoctorAccount[] {
  const order = new Map(specialtyGroups.map((g, i) => [g.slug, i]));
  return doctorAccountsFromPhysicians().sort((a, b) => {
    const ao = order.get(a.specialtySlug) ?? 99;
    const bo = order.get(b.specialtySlug) ?? 99;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });
}
