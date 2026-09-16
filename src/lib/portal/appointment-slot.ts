/** Combine YYYY-MM-DD + HH:MM into an ISO datetime for the legacy `datetime` column. */
export function combineAppointmentDateTime(appointmentDate: string, appointmentTime: string): string {
  const date = appointmentDate.trim();
  const timeRaw = appointmentTime.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("appointment_date must be YYYY-MM-DD.");
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(timeRaw)) {
    throw new Error("appointment_time must be HH:MM.");
  }
  const time = timeRaw.length === 5 ? `${timeRaw}:00` : timeRaw;
  const combined = new Date(`${date}T${time}`);
  if (Number.isNaN(combined.getTime())) {
    throw new Error("Invalid appointment date/time.");
  }
  return combined.toISOString();
}
