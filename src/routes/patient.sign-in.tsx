import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignInPage } from "@/components/patient/pages/SignInPage";
import { readPatientSession } from "@/lib/patient-portal/session";

export const Route = createFileRoute("/patient/sign-in")({
  head: () => ({ meta: [{ title: "Sign in | Patient Portal | Gura Hospital" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (readPatientSession()) throw redirect({ to: "/patient" });
  },
  component: SignInPage,
});
