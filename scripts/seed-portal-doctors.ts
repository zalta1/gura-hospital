/**
 * Seeds Supabase auth users + doctors rows from src/lib/hospital-data.ts physicians.
 * Usage (from repo root, with local Supabase running):
 *   npx tsx scripts/seed-portal-doctors.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_DOCTOR_PASSWORD,
  doctorAccountsFromPhysicians,
  physicianNameKey,
} from "../src/lib/doctor-accounts";

function loadEnvFile() {
  for (const filename of [".env", "env"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), filename), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      }
    } catch {
      // optional
    }
  }
}

loadEnvFile();

const url = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "http://127.0.0.1:54321";
const serviceKey =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
  // Standard local demo service_role JWT (supabase start)
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureUser(email: string, password: string, fullName: string, role: "doctor" | "admin") {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error) throw error;
    const { error: profileError } = await admin.from("profiles").upsert({
      id: existing.id,
      email,
      full_name: fullName,
      role,
    });
    if (profileError) throw profileError;
    return existing.id;
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.data.user.id,
    email,
    full_name: fullName,
    role,
  });
  if (profileError) throw profileError;
  return created.data.user.id;
}

async function main() {
  console.log(`Seeding portal doctors against ${url}`);

  const adminId = await ensureUser(DEMO_ADMIN_EMAIL, DEMO_DOCTOR_PASSWORD, "Gura Admin", "admin");
  console.log(`Admin ready: ${DEMO_ADMIN_EMAIL} (${adminId})`);

  const accounts = doctorAccountsFromPhysicians();
  const { data: existingRows, error: listError } = await admin
    .from("doctors")
    .select("id, name, slug, profile_id");
  if (listError) throw listError;
  const doctors = existingRows ?? [];

  for (const doc of accounts) {
    const userId = await ensureUser(doc.email, DEMO_DOCTOR_PASSWORD, doc.name, "doctor");
    const displayName = `${doc.name}, ${doc.credentials}`;
    const payload = {
      profile_id: userId,
      slug: doc.slug,
      name: displayName,
      specialty: doc.specialty,
      specialty_slug: doc.specialtySlug,
      office: doc.office,
      phone: doc.phone,
      on_shift: true,
    };

    const match =
      doctors.find((row) => row.slug === doc.slug) ??
      doctors.find((row) => row.profile_id === userId) ??
      doctors.find((row) => physicianNameKey(row.name) === physicianNameKey(doc.name));

    if (match?.id) {
      const { error } = await admin.from("doctors").update(payload).eq("id", match.id);
      if (error) throw error;
      match.slug = doc.slug;
      match.profile_id = userId;
      match.name = displayName;
    } else {
      const { data: inserted, error } = await admin.from("doctors").insert(payload).select("id, name, slug, profile_id").single();
      if (error) throw error;
      if (inserted) doctors.push(inserted);
    }

    console.log(`Doctor ready: ${doc.slug} → ${doc.email}`);
  }

  console.log(`Done. ${accounts.length} doctors + 1 admin. Password: ${DEMO_DOCTOR_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
