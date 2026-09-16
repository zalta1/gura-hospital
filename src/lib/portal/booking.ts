import { supabase } from "@/integrations/supabase/client";
import { isLocalPortalDemo } from "@/lib/portal/local-demo";
import { submitBooking as submitLocalBooking } from "@/lib/portal/local-store";
import { requestGmailNotification } from "@/lib/notifications/request-gmail-notification";

export type BookingInput = {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  insurance: string;
  reason: string;
  preferredSpecialty: string;
  visitPreference: string;
  doctorSlug: string;
};

function rpcArgs(input: BookingInput) {
  return {
    p_full_name: input.fullName,
    p_email: input.email,
    p_phone: input.phone,
    p_reason: input.reason,
    p_dob: input.dob || null,
    p_insurance: input.insurance || null,
    p_preferred_specialty: input.preferredSpecialty || null,
    p_visit_preference: input.visitPreference || "in-person",
    p_doctor_slug: input.doctorSlug || null,
  };
}

/**
 * Demo staff logins cannot pass RLS, so the portal store is the live admin/doctor
 * feed. Cloud submit_booking is still attempted so the remote row exists.
 */
export async function submitBooking(input: BookingInput): Promise<string> {
  if (isLocalPortalDemo()) {
    const id = await submitLocalBooking(input);
    void supabase.rpc("submit_booking", rpcArgs(input)).then(
      () => undefined,
      () => undefined,
    );
    return id;
  }

  const { data, error } = await supabase.rpc("submit_booking", rpcArgs(input));
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Booking did not return an appointment id.");
  const appointmentId = data as string;

  // Fire-and-forget confirmation that the intake request was received.
  void requestGmailNotification({
    type: "request_submitted",
    to: input.email.trim(),
    bookingId: appointmentId,
    patientName: input.fullName.trim(),
    reasonForVisit: input.reason.trim() || "Not specified",
  }).catch(() => undefined);

  return appointmentId;
}
