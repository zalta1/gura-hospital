import { createFileRoute } from "@tanstack/react-router";
import { RecordPage } from "@/components/patient/pages/RecordPage";

export const Route = createFileRoute("/patient/record")({
  head: () => ({ meta: [{ title: "Health Record | Patient Portal | Gura Hospital" }] }),
  component: RecordPage,
});
