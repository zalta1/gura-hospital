import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  CalendarDays,
} from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalRoles } from "@/lib/portal/portal-guard";
import { useAuth } from "@/lib/portal/auth";

const adminNav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/admin/ai-activity", label: "AI Activity", icon: Activity },
  { to: "/admin/escalations", label: "Escalation Queue", icon: AlertTriangle },
  { to: "/admin/staff", label: "Staff & Scheduling", icon: Users },
  { to: "/admin/billing", label: "Billing", icon: Receipt },
  { to: "/admin/inventory", label: "Inventory", icon: Package },
  { to: "/admin/audit", label: "Audit Log", icon: ClipboardList },
];

const demoAccountsNav = { to: "/admin/demo-accounts", label: "Demo accounts", icon: KeyRound };

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requirePortalRoles(["admin", "staff"]),
  component: AdminLayout,
});

function AdminLayout() {
  const { profile, loading } = useAuth();
  const navItems = profile?.role === "admin" ? [...adminNav, demoAccountsNav] : adminNav;
  return (
    <PortalShell title="Admin Dashboard" navItems={navItems}>
      {!loading && !profile ? (
        <p className="text-sm text-muted-foreground">
          Sign in as admin to load hospital-wide activity.{" "}
          <Link to="/login" className="text-gold underline">
            Open sign-in
          </Link>
        </p>
      ) : (
        <Outlet />
      )}
    </PortalShell>
  );
}
