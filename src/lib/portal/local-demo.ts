import type { Session, User } from "@supabase/supabase-js";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_DOCTOR_PASSWORD,
  doctorAccountsFromPhysicians,
} from "@/lib/doctor-accounts";
import type { Database } from "@/integrations/supabase/types";

export type ProfileRole = Database["public"]["Enums"]["app_role"];

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  role: ProfileRole;
};

const STORAGE_KEY = "gura_local_portal_auth";

/** Demo logins only. Appointment writes still go to Supabase (`submit_booking`). */
export function isLocalPortalDemo() {
  return String(import.meta.env["VITE_PORTAL_LOCAL_DEMO"] ?? "").trim() === "true";
}

export type LocalPortalAuth = {
  session: Session;
  user: User;
  profile: Profile;
  doctorId: string | null;
};

export const LOCAL_ADMIN_ID = "11111111-1111-1111-1111-111111111111";
export const LOCAL_STAFF_ID = "22222222-2222-2222-2222-222222222222";
export const LOCAL_AMARA_PROFILE_ID = "33333333-3333-3333-3333-333333333333";
export const LOCAL_CALLUM_PROFILE_ID = "44444444-4444-4444-4444-444444444444";
export const LOCAL_AMARA_DOCTOR_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const LOCAL_CALLUM_DOCTOR_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function hexPad(input: string, len: number) {
  let hex = "";
  for (const ch of input) hex += ch.charCodeAt(0).toString(16);
  return hex.replace(/[^0-9a-f]/gi, "0").padEnd(len, "0").slice(0, len);
}

export function doctorIdForSlug(slug: string) {
  if (slug === "amara-velloso") return LOCAL_AMARA_DOCTOR_ID;
  if (slug === "callum-whitfield") return LOCAL_CALLUM_DOCTOR_ID;
  return `aa000000-0000-4000-8000-${hexPad(slug, 12)}`;
}

export function profileIdForSlug(slug: string) {
  if (slug === "amara-velloso") return LOCAL_AMARA_PROFILE_ID;
  if (slug === "callum-whitfield") return LOCAL_CALLUM_PROFILE_ID;
  return `bb000000-0000-4000-8000-${hexPad(slug, 12)}`;
}

function fakeUser(id: string, email: string, fullName: string, role: ProfileRole): User {
  const now = new Date().toISOString();
  return {
    id,
    email,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: fullName, role },
    aud: "authenticated",
    created_at: now,
    role: "authenticated",
  } as User;
}

function fakeSession(user: User): Session {
  return {
    access_token: "local-demo-token",
    refresh_token: "local-demo-refresh",
    expires_in: 60 * 60 * 24,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    token_type: "bearer",
    user,
  } as Session;
}

export type DemoAccount = {
  email: string;
  password: string;
  profile: Profile;
  doctorId: string | null;
};

export function localDemoAccounts(): DemoAccount[] {
  const doctors = doctorAccountsFromPhysicians().map((doc) => {
    const id = profileIdForSlug(doc.slug);
    return {
      email: doc.email,
      password: DEMO_DOCTOR_PASSWORD,
      profile: {
        id,
        email: doc.email,
        full_name: `${doc.name}, ${doc.credentials}`,
        role: "doctor" as const,
      },
      doctorId: doctorIdForSlug(doc.slug),
    };
  });

  return [
    {
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_DOCTOR_PASSWORD,
      profile: {
        id: LOCAL_ADMIN_ID,
        email: DEMO_ADMIN_EMAIL,
        full_name: "Gura Admin",
        role: "admin",
      },
      doctorId: null,
    },
    {
      email: "staff@gura.example",
      password: "gura-demo-2026",
      profile: {
        id: LOCAL_STAFF_ID,
        email: "staff@gura.example",
        full_name: "Priya Nair",
        role: "staff",
      },
      doctorId: null,
    },
    {
      email: "doctor@gura.example",
      password: "gura-demo-2026",
      profile: {
        id: LOCAL_AMARA_PROFILE_ID,
        email: "amara.velloso@gurahospital.demo",
        full_name: "Dr. Amara Velloso, MD, FACC",
        role: "doctor",
      },
      doctorId: LOCAL_AMARA_DOCTOR_ID,
    },
    ...doctors,
  ];
}

export function findLocalDemoAccount(email: string, password: string) {
  const needle = email.trim().toLowerCase();
  return localDemoAccounts().find(
    (a) => a.email.toLowerCase() === needle && a.password === password,
  );
}

export function toLocalPortalAuth(account: DemoAccount): LocalPortalAuth {
  const user = fakeUser(
    account.profile.id,
    account.profile.email ?? account.email,
    account.profile.full_name,
    account.profile.role,
  );
  return {
    user,
    session: fakeSession(user),
    profile: account.profile,
    doctorId: account.doctorId,
  };
}

export function readLocalPortalAuth(): LocalPortalAuth | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalPortalAuth;
  } catch {
    return null;
  }
}

export function writeLocalPortalAuth(auth: LocalPortalAuth) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearLocalPortalAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
