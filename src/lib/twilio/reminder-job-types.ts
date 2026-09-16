export type ReminderOutboundChannel = "sms" | "cold_call";

export type ReminderJob = {
  id: string;
  reminderId: string;
  patientId: string;
  medicationPlanId: string | null;
  channel: ReminderOutboundChannel;
  runAt: string;
  drugName?: string;
  dose?: string;
  schedule?: string;
  status: "scheduled" | "running" | "sent" | "failed";
  createdAt: string;
  updatedAt: string;
  sid?: string;
  twilioStatus?: string;
  to?: string;
  from?: string;
  detail?: string;
  error?: string;
};

export type OutboundReminderMeta = {
  job: ReminderJob;
};
