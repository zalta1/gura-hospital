import { createFileRoute } from "@tanstack/react-router";
import { MedicationsPage } from "@/components/patient/pages/MedicationsPage";

export const Route = createFileRoute("/patient/medications")({
  head: () => ({ meta: [{ title: "Medications | Patient Portal | Gura Hospital" }] }),
  component: MedicationsPage,
});
