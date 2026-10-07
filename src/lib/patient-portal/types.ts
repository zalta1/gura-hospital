/** Demo patient portal models. All records carry patientId so reads can be scoped. */

export const MORGAN_PATIENT_ID = "c2222222-2222-2222-2222-222222222222";
/** Same appointment row the Doctor Portal seeds for Morgan's Holter follow-up. */
export const HOLTER_APPOINTMENT_ID = "a2222222-2222-2222-2222-222222222222";

export type VisitMode = "in_person" | "telehealth";
export type ApptStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type ResultFlag = "normal" | "borderline" | "abnormal";
export type ReleaseStatus = "released" | "pending_review";
export type StatementStatus = "paid" | "due" | "in_review";
export type NotificationType = "appointment" | "message" | "lab" | "refill" | "followup" | "billing";
export type AnnouncementCategory = "Services" | "Health tips" | "Events" | "Visiting hours" | "Policy";

export type PortalPatient = {
  id: string;
  fullName: string;
  dob: string;
  sex: string;
  email: string;
  phone: string;
  address: string;
  mrn: string;
  pharmacy: string;
  primaryDoctorId: string;
  emergencyContact: { name: string; relation: string; phone: string };
  insurance: { payer: string; planType: string; memberId: string; groupNumber: string };
  allergies: { substance: string; reaction: string }[];
  conditions: string[];
  history: string;
  immunizations: { name: string; date: string; site: string }[];
};

export type PortalDoctor = {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  location: string;
  phone: string;
  initials: string;
};

export type PortalAppointment = {
  id: string;
  patientId: string;
  doctorId: string;
  reason: string;
  datetime: string;
  status: ApptStatus;
  mode: VisitMode;
  location: string;
  /** Hospital wall-clock label for a booked slot. */
  timeLabel?: string;
  /** True when this row is the shared Doctor Portal appointment. */
  shared?: boolean;
};

export type PortalMessage = {
  id: string;
  patientId: string;
  doctorId: string;
  from: "patient" | "doctor" | "support";
  body: string;
  at: string;
  attachmentName?: string;
  read: boolean;
};

export type PortalMedication = {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  schedule: string;
  doctorId: string;
  refillsRemaining: number;
  nextDoseLabel: string;
  active: boolean;
  discontinuedReason?: string;
};

export type LabValue = {
  name: string;
  value: string;
  unit: string;
  range: string;
  flag: ResultFlag;
  trend: number[];
};

export type LabResult = {
  id: string;
  patientId: string;
  name: string;
  date: string;
  doctorId: string;
  release: ReleaseStatus;
  flag: ResultFlag;
  explanation: string;
  values: LabValue[];
};

export type ImagingStudy = {
  id: string;
  patientId: string;
  name: string;
  date: string;
  facility: string;
  release: ReleaseStatus;
  summary: string;
};

export type Statement = {
  id: string;
  patientId: string;
  date: string;
  service: string;
  billed: number;
  insurancePaid: number;
  patientBalance: number;
  status: StatementStatus;
};

export type PortalNotification = {
  id: string;
  patientId: string;
  type: NotificationType;
  title: string;
  body: string;
  at: string;
  href: string;
};

export type FollowUpCheckIn = {
  id: string;
  patientId: string;
  dayLabel: string;
  label: string;
  dueDate: string;
  status: "completed" | "due" | "upcoming";
  summary?: string;
};

export type PastFollowUp = {
  id: string;
  patientId: string;
  date: string;
  title: string;
  summary: string;
};

export type Announcement = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  date: string;
  summary: string;
  body: string;
  pinned?: boolean;
};

export type ActivityItem = {
  id: string;
  at: string;
  title: string;
  detail: string;
};

export type VitalPoint = { date: string; systolic: number; diastolic: number; hr: number };

export type PortalDocument = { id: string; title: string; date: string; lines: string[] };

export type VisitSummary = {
  id: string;
  date: string;
  doctorId: string;
  title: string;
  summary: string;
};

export type CareNote = { id: string; date: string; author: string; note: string };

export type FollowUpAnswers = {
  symptoms: string[];
  adherence: string;
  comfort: number;
  notes: string;
  sharedAt: string;
};

export type SupportMessage = {
  id: string;
  from: "patient" | "support";
  body: string;
  at: string;
};

export type DemoState = {
  extraMessages: PortalMessage[];
  readMessageIds: string[];
  takenDoseKeys: string[];
  refillPendingIds: string[];
  completedCheckInIds: string[];
  followUpAnswers: Record<string, FollowUpAnswers>;
  readNotificationIds: string[];
  extraNotifications: PortalNotification[];
  appointmentOverrides: Record<string, { status?: ApptStatus; datetime?: string; timeLabel?: string }>;
  paidStatementIds: string[];
  correctionNote: string | null;
  supportMessages: SupportMessage[];
  largeText: boolean;
  language: "en" | "es";
};

export type SearchHit = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  href: string;
};

export type PortalSnapshot = {
  patient: PortalPatient;
  doctors: PortalDoctor[];
  appointments: PortalAppointment[];
  messages: PortalMessage[];
  medications: PortalMedication[];
  labs: LabResult[];
  imaging: ImagingStudy[];
  statements: Statement[];
  notifications: PortalNotification[];
  checkIns: FollowUpCheckIn[];
  pastFollowUps: PastFollowUp[];
  announcements: Announcement[];
  activity: ActivityItem[];
  vitals: VitalPoint[];
  documents: PortalDocument[];
  visitSummaries: VisitSummary[];
  careNotes: CareNote[];
  estimates: PortalDocument[];
};
