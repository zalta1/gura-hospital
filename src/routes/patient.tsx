import { Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { PatientPortalProvider } from "@/components/patient/PatientPortalProvider";
import { PatientShell } from "@/components/patient/PatientShell";
import { readPatientSession } from "@/lib/patient-portal/session";

export const Route = createFileRoute("/patient")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/patient/sign-in") return;
    if (typeof window === "undefined") return;
    if (!readPatientSession()) {
      throw redirect({ to: "/patient/sign-in" });
    }
  },
  component: PatientLayout,
});

function PatientLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/patient/sign-in") return <Outlet />;
  return (
    <PatientPortalProvider>
      <PatientShell>
        <Outlet />
      </PatientShell>
    </PatientPortalProvider>
  );
}
