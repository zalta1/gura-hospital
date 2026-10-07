import { createFileRoute } from "@tanstack/react-router";
import { AppointmentsPage } from "@/components/patient/pages/AppointmentsPage";

export const Route = createFileRoute("/patient/appointments")({
  head: () => ({ meta: [{ title: "Appointments | Patient Portal | Gura Hospital" }] }),
  component: AppointmentsPage,
});
