import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/patient/pages/MessagesPage";

export const Route = createFileRoute("/patient/messages")({
  head: () => ({ meta: [{ title: "Messages | Patient Portal | Gura Hospital" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    thread: typeof search["thread"] === "string" ? search["thread"] : undefined,
  }),
  component: MessagesPage,
});
