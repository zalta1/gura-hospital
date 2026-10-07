import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/patient/pages/NotificationsPage";

export const Route = createFileRoute("/patient/notifications")({
  head: () => ({ meta: [{ title: "Notifications | Patient Portal | Gura Hospital" }] }),
  component: NotificationsPage,
});