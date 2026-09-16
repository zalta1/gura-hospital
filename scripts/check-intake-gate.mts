/**
 * Sanity-checks the voice intake gate: which fields block submission and when
 * clinical follow-up is required. Run: npx tsx scripts/check-intake-gate.mts
 */
import {
  INTAKE_FIELD_KEYS,
  intakeComplete,
  matchInsurance,
  mergeIntake,
  missingFields,
  needsClinicalFollowup,
  nextAskHint,
  seedIntakeFromForm,
} from "../src/lib/voice/intake.ts";

function show(label: string, value: unknown) {
  console.log(`${label}: ${JSON.stringify(value)}`);
}

show("required fields", INTAKE_FIELD_KEYS);
show("empty call blocks on", missingFields({}));

show("knee pain needs follow-up", needsClinicalFollowup("my knee has been hurting"));
show("annual physical needs follow-up", needsClinicalFollowup("just my annual physical"));

const afterFirstAnswer = mergeIntake({}, { reason: "my knee has been hurting" });
show("after only the opening answer, still missing", missingFields(afterFirstAnswer));
show("ask_next", nextAskHint(afterFirstAnswer));

const partial = mergeIntake(afterFirstAnswer, {
  clinical_followup: "two weeks, about a 6, getting worse on stairs",
  specialty: "Orthopedics & Sports Medicine",
});
show("mid-intake missing", missingFields(partial));
show("mid-intake complete", intakeComplete(partial));

const full = mergeIntake(partial, {
  insurance: "Cedarline Health",
  visit_preference: "telehealth",
  full_name: "Jordan Avery",
  date_of_birth: "1988-03-04",
  email: "jordan@example.com",
  phone: "5552100000",
});
show("full complete", intakeComplete(full));
show("full missing", missingFields(full));

const routine = mergeIntake({}, { reason: "annual physical" });
show("routine auto-marks clinical_followup", routine.clinical_followup);
show("routine missing", missingFields(routine));

show("seeded from form", seedIntakeFromForm({ visitPreference: "in-person", fullName: "Jordan Avery" }));

show("insurance accepted", matchInsurance("cedarline"));
show("insurance unknown", matchInsurance("Totally Made Up Plan"));
show("insurance self-pay", matchInsurance("no insurance"));
