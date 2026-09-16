import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AlertTriangle, CalendarDays, Inbox, Stethoscope } from "lucide-react";
import { fetchAdminDashboard, type AdminActivityItem } from "@/lib/portal/queries";
import { useAuth } from "@/lib/portal/auth";
import { formatDateTime } from "@/lib/portal/format";
import { LOCAL_BOOKING_EVENT } from "@/lib/portal/local-store";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function StatCard({
  label,
  value,
  icon: Icon,
  urgent,
  to,
}: {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  urgent?: boolean;
  to?: string;
}) {
  const body = (
    <div
      className={`rounded-lg border bg-card p-5 shadow-card ${
        urgent ? "border-destructive/60 ring-2 ring-gold/50" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={`mt-2 font-display text-3xl ${urgent ? "text-destructive" : "text-primary"}`}>
            {value}
          </p>
        </div>
        <div className={`rounded-md p-2 ${urgent ? "bg-destructive/10 text-destructive" : "bg-surface text-gold"}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
  if (!to) return body;
  return (
    <Link to={to} className="block transition hover:opacity-95">
      {body}
    </Link>
  );
}

function kindLabel(kind: AdminActivityItem["kind"]) {
  if (kind === "ai") return "AI";
  if (kind === "escalation") return "Escalation";
  if (kind === "audit") return "Audit";
  return "Booking";
}

function AdminOverview() {
  const { loading: authLoading, profile } = useAuth();
  const queryClient = useQueryClient();
  const ready = !authLoading && Boolean(profile);
  const { data, error, isLoading } = useQuery({
    queryKey: ["portal", "admin-dashboard"],
    queryFn: fetchAdminDashboard,
    enabled: ready,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["portal"] });
    };
    window.addEventListener(LOCAL_BOOKING_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LOCAL_BOOKING_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [queryClient]);

  const stats = data?.stats;
  const unassigned = data?.unassigned ?? [];
  const recent = data?.appointments ?? [];
  const activity = data?.activity ?? [];
  const waiting = authLoading || isLoading || !stats;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Operations overview</h2>
        <p className="text-sm text-muted-foreground">
          Hospital-wide bookings, AI, and staff actions. Doctor and public pages stay scoped to their own data.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load"}</p>
      ) : null}
      {!stats ? (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Unassigned requests"
            value={stats.unassignedCount}
            icon={Inbox}
            urgent={stats.unassignedCount > 0}
            to="/admin/appointments"
          />
          <StatCard label="Pending intake" value={stats.pendingCount} icon={CalendarDays} to="/admin/appointments" />
          <StatCard label="Today's appointments" value={stats.todaysAppointments} icon={CalendarDays} />
          <StatCard label="Doctors on shift" value={stats.doctorsOnShift} icon={Stethoscope} to="/admin/staff" />
          <StatCard
            label="Open escalations"
            value={stats.escalationCount}
            icon={AlertTriangle}
            urgent={stats.escalationCount > 0}
            to="/admin/escalations"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-2 text-primary-foreground">
            <h3 className="text-sm font-medium">Unassigned / needs matching</h3>
            <Link to="/admin/appointments" className="text-xs text-gold hover:underline">
              Open pipeline →
            </Link>
          </div>
          {waiting ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : unassigned.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No unassigned Visit Intake requests.</p>
          ) : (
            <ul className="divide-y divide-border">
              {unassigned.slice(0, 8).map((row) => (
                <li key={row.id} className="px-4 py-3 text-sm">
                  <p className="font-medium text-primary">{row.patients?.full_name ?? "Patient"}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.reason_for_visit ?? "Appointment request"} · {formatDateTime(row.datetime)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-2 text-primary-foreground">
            <h3 className="text-sm font-medium">All recent bookings</h3>
            <Link to="/admin/appointments" className="text-xs text-gold hover:underline">
              See every doctor →
            </Link>
          </div>
          {waiting ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No booking requests yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.slice(0, 8).map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-primary">{row.patients?.full_name ?? "Patient"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.doctors?.name ?? "Unassigned"} · {row.reason_for_visit ?? "Appointment request"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{row.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(row.datetime)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-2 text-primary-foreground">
          <h3 className="text-sm font-medium">System activity</h3>
          <Link to="/admin/audit" className="text-xs text-gold hover:underline">
            Audit log →
          </Link>
        </div>
        {waiting ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : activity.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm hover:bg-surface"
                >
                  <div>
                    <p className="font-medium text-primary">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{kindLabel(item.kind)}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(item.at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
