import { createFileRoute } from "@tanstack/react-router";
import { UpdatesPage } from "@/components/patient/pages/UpdatesPage";

export const Route = createFileRoute("/patient/updates")({
  head: () => ({ meta: [{ title: "Hospital Updates | Patient Portal | Gura Hospital" }] }),
  component: UpdatesPage,
});
