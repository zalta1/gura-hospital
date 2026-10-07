import { createFileRoute } from "@tanstack/react-router";
import { ResultsPage } from "@/components/patient/pages/ResultsPage";

export const Route = createFileRoute("/patient/results")({
  head: () => ({ meta: [{ title: "Lab Results and Imaging | Patient Portal | Gura Hospital" }] }),
  component: ResultsPage,
});
