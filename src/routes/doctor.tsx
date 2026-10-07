import { Outlet, createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CalendarDays, MessageSquareHeart, Stethoscope } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalRoles } from "@/lib/portal/portal-guard";

const doctorNav = [
  { to: "/doctor", label: "My Appointments", icon: CalendarDays },
  { to: "/doctor/followups", label: "Follow-up Results", icon: MessageSquareHeart },
  { to: "/doctor/availability", label: "My Availability", icon: CalendarClock },
];

export const Route = createFileRoute("/doctor")({
  beforeLoad: () => requirePortalRoles(["doctor"]),
  component: DoctorLayout,
});

function DoctorLayout() {
  return (
    <PortalShell title="Doctor Portal" navItems={doctorNav}>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Stethoscope className="size-4 text-gold" />
        Scoped to your assigned patients only. AI drafts never reach patients without your approval.
      </div>
      <Outlet />
    </PortalShell>
  );
}
