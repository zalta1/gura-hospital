import { LOCAL_AMARA_DOCTOR_ID, LOCAL_CALLUM_DOCTOR_ID } from "@/lib/portal/local-demo";
import {
  HOLTER_APPOINTMENT_ID,
  MORGAN_PATIENT_ID,
  type Announcement,
  type CareNote,
  type FollowUpCheckIn,
  type ImagingStudy,
  type LabResult,
  type PastFollowUp,
  type PortalAppointment,
  type PortalDoctor,
  type PortalDocument,
  type PortalMedication,
  type PortalMessage,
  type PortalNotification,
  type PortalPatient,
  type Statement,
  type VisitSummary,
  type VitalPoint,
  type ActivityItem,
} from "@/lib/patient-portal/types";

/** Fictional chart for the patient-portal demo. Not real PHI. */
export const HELEN_CHO_DOCTOR_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

export const morganPatient: PortalPatient = {
  id: MORGAN_PATIENT_ID,
  fullName: "Morgan Ellis",
  dob: "1975-09-03",
  sex: "Female",
  email: "morgan.ellis@patient.example",
  phone: "(555) 401-2202",
  address: "14 Cedar Lane, Alder Bay, NY 11048",
  mrn: "GURA-DEMO-20481",
  pharmacy: "Harborline Pharmacy (demo)",
  primaryDoctorId: LOCAL_AMARA_DOCTOR_ID,
  emergencyContact: { name: "Evan Ellis", relation: "Spouse", phone: "(555) 401-2290" },
  insurance: {
    payer: "UnitedHealthcare",
    planType: "Choice Plus PPO",
    memberId: "UHC-DEMO-441928",
    groupNumber: "GRP-2206",
  },
  allergies: [
    { substance: "Penicillin", reaction: "Rash" },
    { substance: "Shellfish", reaction: "Hives" },
  ],
  conditions: [
    "Palpitations under evaluation",
    "Hypertension",
    "Premature ventricular contractions, history",
  ],
  history:
    "Morgan is 51 and walks most evenings. She does not smoke. A 48-hour Holter monitor was placed on September 18, 2026 after several weeks of skipped beats. She asked for a telehealth visit to review the tracing.",
  immunizations: [
    { name: "Influenza", date: "2025-10-12", site: "Gura Primary Care, Alder Bay" },
    { name: "COVID-19", date: "2025-10-12", site: "Gura Primary Care, Alder Bay" },
    { name: "Tdap", date: "2021-04-03", site: "Community clinic" },
  ],
};

export const morganDoctors: PortalDoctor[] = [
  {
    id: LOCAL_AMARA_DOCTOR_ID,
    name: "Dr. Amara Velloso",
    credentials: "MD, FACC",
    specialty: "Cardiology",
    location: "1400 Harborline Ave, Suite 320, Fairmont Ridge",
    phone: "(555) 210-4471",
    initials: "AV",
  },
  {
    id: LOCAL_CALLUM_DOCTOR_ID,
    name: "Dr. Callum Whitfield",
    credentials: "MD, FACP",
    specialty: "Internal Medicine",
    location: "9 Meridian Square, Suite 40, Alder Bay",
    phone: "(555) 210-3301",
    initials: "CW",
  },
  {
    id: HELEN_CHO_DOCTOR_ID,
    name: "Dr. Helen Cho",
    credentials: "MD",
    specialty: "Pulmonary and Sleep Medicine",
    location: "1400 Harborline Ave, Suite 210, Fairmont Ridge",
    phone: "(555) 210-5520",
    initials: "HC",
  },
];

/**
 * The Holter visit uses the same id as the Doctor Portal seed.
 * When the local portal store is available, that live row replaces the date and status.
 */
export const morganAppointments: PortalAppointment[] = [
  {
    id: HOLTER_APPOINTMENT_ID,
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    reason: "Follow-up after Holter monitor",
    datetime: "2026-10-03T11:00:00",
    status: "pending",
    mode: "telehealth",
    location: "Video visit",
    shared: true,
  },
  {
    id: "p-appt-whitfield-nov",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_CALLUM_DOCTOR_ID,
    reason: "Blood pressure follow-up",
    datetime: "2026-11-12T09:30:00",
    status: "confirmed",
    mode: "in_person",
    location: "Alder Bay — Primary Care",
  },
  {
    id: "p-appt-holter-place",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    reason: "Holter monitor placement",
    datetime: "2026-09-18T10:15:00",
    status: "completed",
    mode: "in_person",
    location: "Fairmont Ridge — Heart Center",
  },
  {
    id: "p-appt-sleep",
    patientId: MORGAN_PATIENT_ID,
    doctorId: HELEN_CHO_DOCTOR_ID,
    reason: "Sleep consult for daytime fatigue",
    datetime: "2026-08-12T13:00:00",
    status: "completed",
    mode: "in_person",
    location: "Fairmont Ridge — Pulmonary Clinic",
  },
  {
    id: "p-appt-annual",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_CALLUM_DOCTOR_ID,
    reason: "Annual physical",
    datetime: "2026-06-02T08:40:00",
    status: "completed",
    mode: "in_person",
    location: "Alder Bay — Primary Care",
  },
  {
    id: "p-appt-video-past",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_CALLUM_DOCTOR_ID,
    reason: "Blood pressure check",
    datetime: "2026-05-14T16:00:00",
    status: "completed",
    mode: "telehealth",
    location: "Video visit",
  },
  {
    id: "p-appt-lipid-cancel",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    reason: "Lipid clinic visit",
    datetime: "2026-07-22T11:20:00",
    status: "cancelled",
    mode: "in_person",
    location: "Fairmont Ridge — Heart Center",
  },
];

export const morganMessages: PortalMessage[] = [
  {
    id: "msg-av-1",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    from: "doctor",
    body: "Morgan, your Holter report is in. The tracing shows occasional early beats and no sustained rhythm that needs emergency care. I would like to review it with you on our video visit.",
    at: "2026-09-28T14:10:00",
    read: true,
  },
  {
    id: "msg-av-2",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    from: "patient",
    body: "Thank you. I still notice a few skipped beats in the evening, usually after I climb the stairs.",
    at: "2026-09-28T15:02:00",
    read: true,
  },
  {
    id: "msg-av-3",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    from: "doctor",
    body: "Noted. Please have your medication list nearby for the visit. I attached a short summary you can read ahead of time.",
    at: "2026-09-28T16:40:00",
    attachmentName: "Holter-monitor-summary.pdf",
    read: true,
  },
  {
    id: "msg-cw-1",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_CALLUM_DOCTOR_ID,
    from: "doctor",
    body: "Your June labs looked steady. Keep checking blood pressure a few mornings a week and bring the log in November.",
    at: "2026-06-03T09:15:00",
    read: true,
  },
  {
    id: "msg-cw-2",
    patientId: MORGAN_PATIENT_ID,
    doctorId: LOCAL_CALLUM_DOCTOR_ID,
    from: "patient",
    body: "Will do. Morning readings have been in the 120s over 70s.",
    at: "2026-06-03T18:22:00",
    read: true,
  },
  {
    id: "msg-hc-1",
    patientId: MORGAN_PATIENT_ID,
    doctorId: HELEN_CHO_DOCTOR_ID,
    from: "doctor",
    body: "The sleep consult did not show a reason for an urgent sleep study. If snoring or daytime sleepiness returns, send me a note and we can revisit.",
    at: "2026-08-13T11:05:00",
    read: false,
  },
];

export const DOCTOR_REPLIES = [
  "Thank you, Morgan. I have this note and will review it before our video visit.",
  "Please continue your medications as prescribed. If you develop chest pain, fainting, or severe shortness of breath, call 911.",
  "I see that. Bring your medication list and any home blood pressure readings to the visit.",
  "Received. Our team will add this to your chart. Messages are not monitored overnight.",
];

export const SUPPORT_REPLIES = [
  "Thanks for writing. In a live clinic this note would reach a support specialist during staffed hours. Nothing here is sent off this device.",
  "You can call Gura Hospital at (555) 210-0000. If this is an emergency, call 911.",
];

export const morganMedications: PortalMedication[] = [
  {
    id: "med-metoprolol",
    patientId: MORGAN_PATIENT_ID,
    name: "Metoprolol succinate",
    dose: "25 mg",
    schedule: "Every morning",
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    refillsRemaining: 2,
    nextDoseLabel: "8:00 AM",
    active: true,
  },
  {
    id: "med-lisinopril",
    patientId: MORGAN_PATIENT_ID,
    name: "Lisinopril",
    dose: "10 mg",
    schedule: "Every morning",
    doctorId: LOCAL_CALLUM_DOCTOR_ID,
    refillsRemaining: 3,
    nextDoseLabel: "8:00 AM",
    active: true,
  },
  {
    id: "med-aspirin",
    patientId: MORGAN_PATIENT_ID,
    name: "Aspirin",
    dose: "81 mg",
    schedule: "Every morning with food",
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    refillsRemaining: 5,
    nextDoseLabel: "8:00 AM",
    active: true,
  },
  {
    id: "med-omeprazole",
    patientId: MORGAN_PATIENT_ID,
    name: "Omeprazole",
    dose: "20 mg",
    schedule: "Daily",
    doctorId: LOCAL_CALLUM_DOCTOR_ID,
    refillsRemaining: 0,
    nextDoseLabel: "—",
    active: false,
    discontinuedReason: "Stopped June 2026 after heartburn resolved.",
  },
];

export const morganLabs: LabResult[] = [
  {
    id: "lab-lipid",
    patientId: MORGAN_PATIENT_ID,
    name: "Lipid panel",
    date: "2026-09-20",
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    release: "released",
    flag: "borderline",
    explanation: "LDL is above the usual goal. This is not an emergency. Dr. Velloso will discuss it at your visit.",
    values: [
      { name: "Total cholesterol", value: "198", unit: "mg/dL", range: "< 200", flag: "normal", trend: [214, 206, 201, 198] },
      { name: "LDL", value: "142", unit: "mg/dL", range: "< 100", flag: "borderline", trend: [158, 151, 146, 142] },
      { name: "HDL", value: "48", unit: "mg/dL", range: "> 50", flag: "borderline", trend: [44, 45, 47, 48] },
      { name: "Triglycerides", value: "130", unit: "mg/dL", range: "< 150", flag: "normal", trend: [148, 140, 136, 130] },
    ],
  },
  {
    id: "lab-bmp",
    patientId: MORGAN_PATIENT_ID,
    name: "Basic metabolic panel",
    date: "2026-09-18",
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    release: "released",
    flag: "normal",
    explanation: "Kidney function and electrolytes are within the reference ranges used by this lab.",
    values: [
      { name: "Sodium", value: "139", unit: "mmol/L", range: "135–145", flag: "normal", trend: [140, 139, 138, 139] },
      { name: "Potassium", value: "4.2", unit: "mmol/L", range: "3.5–5.1", flag: "normal", trend: [4.0, 4.1, 4.3, 4.2] },
      { name: "Creatinine", value: "0.84", unit: "mg/dL", range: "0.50–1.10", flag: "normal", trend: [0.8, 0.82, 0.86, 0.84] },
    ],
  },
  {
    id: "lab-cbc",
    patientId: MORGAN_PATIENT_ID,
    name: "Complete blood count",
    date: "2026-08-12",
    doctorId: HELEN_CHO_DOCTOR_ID,
    release: "released",
    flag: "normal",
    explanation: "Blood counts are in the expected range. Nothing here needs a same-day call.",
    values: [
      { name: "WBC", value: "6.4", unit: "K/uL", range: "4.0–11.0", flag: "normal", trend: [6.1, 6.8, 6.2, 6.4] },
      { name: "Hemoglobin", value: "13.6", unit: "g/dL", range: "12.0–16.0", flag: "normal", trend: [13.2, 13.4, 13.5, 13.6] },
      { name: "Platelets", value: "228", unit: "K/uL", range: "150–400", flag: "normal", trend: [240, 232, 230, 228] },
    ],
  },
  {
    id: "lab-tsh",
    patientId: MORGAN_PATIENT_ID,
    name: "TSH",
    date: "2026-10-01",
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    release: "pending_review",
    flag: "normal",
    explanation: "This result is waiting for your doctor to review it before it is released to you.",
    values: [],
  },
];

export const morganImaging: ImagingStudy[] = [
  {
    id: "img-echo",
    patientId: MORGAN_PATIENT_ID,
    name: "Transthoracic echocardiogram",
    date: "2026-09-18",
    facility: "Gura Heart Center, Fairmont Ridge",
    release: "released",
    summary: "Left ventricular function is within the expected range. No significant valve leak was described in the report shared with you.",
  },
  {
    id: "img-cxr",
    patientId: MORGAN_PATIENT_ID,
    name: "Chest X-ray",
    date: "2026-08-12",
    facility: "Alder Bay Imaging",
    release: "released",
    summary: "No acute finding was described. Lungs are clear on the report released to you.",
  },
];

export const morganStatements: Statement[] = [
  {
    id: "b2222222-2222-2222-2222-222222222222",
    patientId: MORGAN_PATIENT_ID,
    date: "2026-09-28",
    service: "Holter monitor interpretation",
    billed: 180,
    insurancePaid: 0,
    patientBalance: 0,
    status: "in_review",
  },
  {
    id: "stmt-copay",
    patientId: MORGAN_PATIENT_ID,
    date: "2026-09-18",
    service: "Heart Center office visit copay",
    billed: 40,
    insurancePaid: 0,
    patientBalance: 40,
    status: "due",
  },
  {
    id: "stmt-annual",
    patientId: MORGAN_PATIENT_ID,
    date: "2026-06-02",
    service: "Annual physical",
    billed: 210,
    insurancePaid: 210,
    patientBalance: 0,
    status: "paid",
  },
];

export const morganNotifications: PortalNotification[] = [
  {
    id: "nt-appt",
    patientId: MORGAN_PATIENT_ID,
    type: "appointment",
    title: "Telehealth request received",
    body: "Your Holter follow-up with Dr. Velloso is pending her confirmation.",
    at: "2026-10-03T08:05:00",
    href: "/patient/appointments",
  },
  {
    id: "nt-msg",
    patientId: MORGAN_PATIENT_ID,
    type: "message",
    title: "New message from Dr. Cho",
    body: "A note about your sleep consult is waiting.",
    at: "2026-08-13T11:06:00",
    href: "/patient/messages",
  },
  {
    id: "nt-lab",
    patientId: MORGAN_PATIENT_ID,
    type: "lab",
    title: "Lab result released",
    body: "Your lipid panel from September 20 is available.",
    at: "2026-09-21T09:00:00",
    href: "/patient/results",
  },
  {
    id: "nt-refill",
    patientId: MORGAN_PATIENT_ID,
    type: "refill",
    title: "Refill approved",
    body: "Aspirin 81 mg was approved by the pharmacy demo queue.",
    at: "2026-09-15T13:40:00",
    href: "/patient/medications",
  },
  {
    id: "nt-fu",
    patientId: MORGAN_PATIENT_ID,
    type: "followup",
    title: "AI check-in due",
    body: "Day 7 after your Holter results is ready for you.",
    at: "2026-10-03T07:30:00",
    href: "/patient/follow-up",
  },
  {
    id: "nt-bill",
    patientId: MORGAN_PATIENT_ID,
    type: "billing",
    title: "Statement ready",
    body: "A Heart Center copay of $40.00 is due.",
    at: "2026-09-19T10:00:00",
    href: "/patient/billing",
  },
];

export const morganCheckIns: FollowUpCheckIn[] = [
  {
    id: "fu-day-1",
    patientId: MORGAN_PATIENT_ID,
    dayLabel: "Day 1",
    label: "Day 1 after Holter results",
    dueDate: "2026-09-27",
    status: "completed",
    summary: "No chest pain. Metoprolol taken as directed. Comfort 7 out of 10.",
  },
  {
    id: "fu-day-3",
    patientId: MORGAN_PATIENT_ID,
    dayLabel: "Day 3",
    label: "Day 3 after Holter results",
    dueDate: "2026-09-29",
    status: "completed",
    summary: "Evening palpitations after stairs. No fainting. Comfort 6 out of 10.",
  },
  {
    id: "fu-day-7",
    patientId: MORGAN_PATIENT_ID,
    dayLabel: "Day 7",
    label: "Day 7 after Holter results",
    dueDate: "2026-10-03",
    status: "due",
  },
];

export const morganPastFollowUps: PastFollowUp[] = [
  {
    id: "fu-past-escalation",
    patientId: MORGAN_PATIENT_ID,
    date: "2026-09-26",
    title: "Earlier wellness check",
    summary:
      "A check-in noted chest pressure and shortness of breath while walking. The care team was alerted. Dr. Velloso can see that same event in the physician portal. It was not treated as an emergency dispatch.",
  },
];

export const morganAnnouncements: Announcement[] = [
  {
    id: "ann-hours",
    category: "Visiting hours",
    title: "Heart Center visiting hours",
    date: "2026-10-01",
    summary: "Evening visiting on the cardiology floor now ends at 8:00 PM.",
    body: "Beginning October 1, visitors on the Fairmont Ridge cardiology floor are welcome from 10:00 AM to 8:00 PM. Quiet hours still start at 9:00 PM. This notice is demo copy.",
    pinned: true,
  },
  {
    id: "ann-flu",
    category: "Services",
    title: "Flu shots at Alder Bay primary care",
    date: "2026-09-24",
    summary: "Walk-in influenza vaccines are offered weekday mornings through October.",
    body: "Primary care at Alder Bay is offering influenza vaccines on weekdays from 8:00 AM to 11:00 AM. Bring your insurance card. No appointment is required for the shot itself.",
  },
  {
    id: "ann-bp",
    category: "Health tips",
    title: "Home blood pressure, done simply",
    date: "2026-09-18",
    summary: "Sit for five minutes, feet on the floor, and take two readings.",
    body: "Rest five minutes before you measure. Keep your arm supported at heart level. Write down both readings and the time. Bring the log to your next visit.",
  },
  {
    id: "ann-talk",
    category: "Events",
    title: "Heart health talk, October 16",
    date: "2026-09-12",
    summary: "A cardiologist will speak in the Fairmont Ridge atrium at noon.",
    body: "Join a 40-minute talk on walking, blood pressure, and when to call the care team. Seating is first come. The event is free and open to patients.",
  },
  {
    id: "ann-parking",
    category: "Policy",
    title: "Garage B elevator maintenance",
    date: "2026-09-08",
    summary: "Use the Harborline lobby entrance on October 8 and 9.",
    body: "Garage B elevators will be offline for maintenance on October 8 and 9. Valet at the main lobby remains open, and the clinic shuttle will stop at the east circle.",
  },
  {
    id: "ann-video",
    category: "Services",
    title: "How video visits work",
    date: "2026-08-30",
    summary: "Join from the patient portal. A quiet room and your medication list are enough.",
    body: "Video visits open in the portal. You do not need to download an app for this demo. Have your medication list ready and sit where you can hear clearly.",
  },
  {
    id: "ann-mask",
    category: "Policy",
    title: "Masking when you have a cough",
    date: "2026-08-20",
    summary: "Please wear a mask in clinics if you have cold or flu symptoms.",
    body: "Masks are available at each clinic desk. If you have a fever, call before you come so the team can decide whether a video visit is safer.",
  },
];

export const morganActivity: ActivityItem[] = [
  {
    id: "act-1",
    at: "2026-10-03T08:05:00",
    title: "Telehealth follow-up requested",
    detail: "Holter review with Dr. Velloso, pending confirmation.",
  },
  {
    id: "act-2",
    at: "2026-09-28T16:40:00",
    title: "Message from Dr. Velloso",
    detail: "Holter summary attached to your cardiology thread.",
  },
  {
    id: "act-3",
    at: "2026-09-21T09:00:00",
    title: "Lipid panel released",
    detail: "LDL is borderline. Your doctor will review it with you.",
  },
  {
    id: "act-4",
    at: "2026-09-18T10:15:00",
    title: "Holter monitor placed",
    detail: "In person at the Fairmont Ridge Heart Center.",
  },
];

export const morganVitals: VitalPoint[] = [
  { date: "2026-08-12", systolic: 138, diastolic: 86, hr: 78 },
  { date: "2026-09-02", systolic: 134, diastolic: 82, hr: 74 },
  { date: "2026-09-18", systolic: 128, diastolic: 80, hr: 71 },
  { date: "2026-09-22", systolic: 130, diastolic: 78, hr: 68 },
  { date: "2026-09-26", systolic: 126, diastolic: 76, hr: 66 },
  { date: "2026-10-01", systolic: 124, diastolic: 76, hr: 64 },
];

export const morganDocuments: PortalDocument[] = [
  {
    id: "doc-holter",
    title: "Holter monitor report summary",
    date: "2026-09-26",
    lines: [
      "Demo document. Not a real medical record.",
      "Patient: Morgan Ellis",
      "Study: 48-hour Holter, placed September 18, 2026",
      "Average heart rate 68. Occasional premature ventricular contractions.",
      "No sustained atrial or ventricular arrhythmia in this summary.",
      "Released for the patient portal demo by Dr. Amara Velloso.",
    ],
  },
  {
    id: "doc-avs",
    title: "After-visit summary, September 18",
    date: "2026-09-18",
    lines: [
      "Demo document. Not a real medical record.",
      "Visit: Holter monitor placement with Dr. Velloso.",
      "Continue metoprolol, lisinopril, and aspirin.",
      "Call 911 for chest pain, fainting, or severe shortness of breath.",
    ],
  },
];

export const morganEstimates: PortalDocument[] = [
  {
    id: "doc-estimate",
    title: "Visit estimate — telehealth follow-up",
    date: "2026-10-01",
    lines: [
      "Demo estimate. Not a bill and not a guarantee of coverage.",
      "Service: cardiology video follow-up",
      "Estimated charge: $180.00",
      "Your plan: UnitedHealthcare Choice Plus PPO",
    ],
  },
  {
    id: "doc-eob",
    title: "Explanation of benefits — annual physical",
    date: "2026-06-20",
    lines: [
      "Demo explanation of benefits. Not issued by an insurer.",
      "Service date: June 2, 2026",
      "Billed $210.00. Plan paid $210.00. You paid $0.00.",
    ],
  },
];

export const morganVisitSummaries: VisitSummary[] = [
  {
    id: "vs-holter",
    date: "2026-09-18",
    doctorId: LOCAL_AMARA_DOCTOR_ID,
    title: "Holter monitor placement",
    summary:
      "Monitor placed for 48 hours. Morgan was asked to note skipped beats and dizziness. Return precautions were reviewed, including chest pain and fainting.",
  },
  {
    id: "vs-sleep",
    date: "2026-08-12",
    doctorId: HELEN_CHO_DOCTOR_ID,
    title: "Sleep consult",
    summary:
      "Daytime fatigue discussed. No urgent sleep study recommended. Chest X-ray was ordered and later released as unremarkable.",
  },
  {
    id: "vs-annual",
    date: "2026-06-02",
    doctorId: LOCAL_CALLUM_DOCTOR_ID,
    title: "Annual physical",
    summary: "Blood pressure improved on lisinopril. Vaccines reviewed. Next routine visit planned for the fall.",
  },
];

export const morganCareNotes: CareNote[] = [
  {
    id: "note-1",
    date: "2026-09-26",
    author: "Dr. Amara Velloso",
    note: "Holter summary shared with Morgan. Video follow-up requested so we can talk through the early beats and the lipid panel together.",
  },
  {
    id: "note-2",
    date: "2026-06-02",
    author: "Dr. Callum Whitfield",
    note: "Home blood pressure log requested. Continue lisinopril 10 mg each morning.",
  },
];

export const RED_FLAG_SYMPTOMS = ["Chest pain", "Fainting"];

export const SYMPTOM_OPTIONS = [
  "None of these",
  "Skipped beats",
  "Shortness of breath",
  "Dizziness",
  "Chest pain",
  "Fainting",
];
