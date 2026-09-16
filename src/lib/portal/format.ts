/** Stable en-US formatting so SSR and the browser render the same string. */
export function formatDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Prefer admin-confirmed appointment_date + appointment_time when present. */
export function formatConfirmedSlot(
  appointmentDate?: string | null,
  appointmentTime?: string | null,
  fallbackDatetime?: string | null,
) {
  if (appointmentDate && appointmentTime) {
    const time = appointmentTime.length === 5 ? `${appointmentTime}:00` : appointmentTime;
    const combined = new Date(`${appointmentDate}T${time}`);
    if (!Number.isNaN(combined.getTime())) return formatDateTime(combined);
    return `${appointmentDate} · ${appointmentTime.slice(0, 5)}`;
  }
  if (fallbackDatetime) return formatDateTime(fallbackDatetime);
  return "—";
}

export function visitPreferenceLabel(
  value?: string | null,
  campus?: string | null,
  visitType?: string | null,
) {
  if (value === "telehealth" || visitType === "telehealth" || campus === "Telehealth") {
    return "Telehealth";
  }
  if (value === "alder-bay" || campus === "Alder Bay") {
    return "In person — Alder Bay";
  }
  if (value === "in-person" || campus === "Fairmont Ridge") {
    return "In person — Fairmont Ridge";
  }
  if (campus) return `In person — ${campus}`;
  return "—";
}

export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
