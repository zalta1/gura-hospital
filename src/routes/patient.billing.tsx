import { createFileRoute } from "@tanstack/react-router";
import { BillingPage } from "@/components/patient/pages/BillingPage";

export const Route = createFileRoute("/patient/billing")({
  head: () => ({ meta: [{ title: "Billing and Insurance | Patient Portal | Gura Hospital" }] }),
  component: BillingPage,
});
