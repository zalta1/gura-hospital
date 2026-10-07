import { createFileRoute } from "@tanstack/react-router";
import { DoctorsPage } from "@/components/patient/pages/DoctorsPage";

export const Route = createFileRoute("/patient/doctors")({
  head: () => ({ meta: [{ title: "My Doctors | Patient Portal | Gura Hospital" }] }),
  component: DoctorsPage,
});
