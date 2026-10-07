import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/components/patient/pages/OverviewPage";

export const Route = createFileRoute("/patient/")({
  head: () => ({ meta: [{ title: "Overview | Patient Portal | Gura Hospital" }] }),
  component: OverviewPage,
});
