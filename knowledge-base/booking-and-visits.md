<!-- Source: src/routes/book-appointment.tsx, src/routes/index.tsx, src/routes/for-patients.tsx, src/routes/find-a-doctor.tsx, src/routes/programs-services.tsx, src/lib/hospital-data.ts, src/lib/portal/booking.ts -->

# PLACEHOLDER — Demonstration content

Appointment requests on this demo site are not a live scheduling system. Phone numbers and insurance plan names are fictional.

---

# Requesting an appointment

Page title: Request an Appointment

Hero: "Tell us what you need. A navigator will match you with the right physician. Follow-up plans and clinical messages are reviewed by staff before they are sent."

Find a Doctor: "Search the medical staff directory by specialty. Request a visit online or by phone at (555) 210-0000."

You may request a specific physician using the booking URL query param `doctor` matching the physician id (example: `nikolai-brandt`). When a doctor is selected the form shows: "Requesting a visit with [name], [credentials] — [specialty]".

You may also "Speak with a navigator" (voice intake) on the same page.

## Information collected

- Reason for visit (required). Placeholder prompt: "Briefly describe your symptoms or the care you are looking for"
- Preferred specialty (the six Find a Doctor group titles)
- Insurance (hospital-wide plan list)
- Visit preference
- Full name (required)
- Date of birth (optional)
- Email (required)
- Phone (required)

## Consent (exact)

> By submitting, you consent to an AI navigation agent handling this request under staff supervision. You may withdraw consent through Health Information Management.

## After you submit

Confirmation heading: "Request received"

Confirmation body: "A care navigator will confirm time, provider, and insurance. You may also continue with the live navigation agent if you have more to add."

## What happens next (exact)

1. A navigator reviews your request within one business day.
2. Benefits are verified with your plan before a slot is confirmed.
3. You receive visit options by text or email after staff approval of any clinical follow-up.

Programs & Services: "Our access team will route you to the right specialist, usually within one business day."

---

# How care starts (home page)

1. Share why you need care — "Complete a short intake or speak with the care navigation agent. Clinicians review anything that could affect your plan of care."
2. Match with the right specialist — "Navigators pair you with a physician whose focus fits your condition, insurance, and campus preference."
3. Visit, then stay connected — "See your doctor in person or by telehealth. Follow-up plans are reviewed by staff before they reach you."

---

# Visit types

Offered on the request form:

- In person — Fairmont Ridge
- In person — Alder Bay
- Telehealth

The form does not restrict telehealth to certain doctors. Only Dr. Yuki Tanabe's directory focus is "Telehealth & Same-Day Care". Primary Care & Internal Medicine blurb: "same-day telehealth visits."

Westbrook Medical Pavilion (contact page, not the booking radios): Outpatient clinics, Mon-Fri 7:00 AM - 6:00 PM.

---

# Visit preparation

From For Patients, Preparing For Surgery:

> Your pre-op nurse navigator calls 72 hours before your procedure to review medications, fasting instructions, arrival time and your ride home.

There is no general new-patient visit-prep checklist (what to bring, arrive-early time) in the codebase besides surgery prep and visitor hours.

---

# Emergency instead of booking

> The emergency department is open 24 hours at 1400 Harborline Avenue. For a medical emergency, call 911.
