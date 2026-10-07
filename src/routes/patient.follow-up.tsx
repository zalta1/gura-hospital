import { createFileRoute } from "@tanstack/react-router";
import { FollowUpPage } from "@/components/patient/pages/FollowUpPage";

export const Route = createFileRoute("/patient/follow-up")({
  head: () => ({ meta: [{ title: "AI Follow-up | Patient Portal | Gura Hospital" }] }),
  component: FollowUpPage,
});
