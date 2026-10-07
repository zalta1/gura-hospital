import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageGate, EmptyState } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/portal/format";
import type { NotificationType } from "@/lib/patient-portal/types";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ id: "all" | NotificationType; label: string }> = [
  { id: "all", label: "All" },
  { id: "appointment", label: "Appointments" },
  { id: "message", label: "Messages" },
  { id: "lab", label: "Results" },
  { id: "refill", label: "Refills" },
  { id: "followup", label: "Follow-up" },
  { id: "billing", label: "Billing" },
];

export function NotificationsPage() {
  return (
    <PageGate>
      <NotificationsBody />
    </PageGate>
  );
}

function NotificationsBody() {
  const snapshot = useSnapshot();
  const { state, markNotificationRead, markAllNotificationsRead } = usePatientPortal();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const items = snapshot.notifications.filter((item) => filter === "all" || item.type === filter);
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = formatDate(item.at);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button key={item.id} type="button" size="sm" variant={filter === item.id ? "gold" : "outline"} onClick={() => setFilter(item.id)}>
              {item.label}
            </Button>
          ))}
        </div>
        <Button type="button" size="sm" variant="outlineNavy" onClick={markAllNotificationsRead}>
          Mark all as read
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No notifications" body="Alerts for this filter will collect here." />
      ) : (
        [...groups.entries()].map(([day, rows]) => (
          <section key={day}>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{day}</h2>
            <ul className="divide-y divide-border border border-border bg-card shadow-card">
              {rows.map((item) => {
                const read = state.readNotificationIds.includes(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={cn("flex w-full flex-col items-start px-4 py-3 text-left hover:bg-surface", !read && "bg-gold/10")}
                      onClick={() => {
                        markNotificationRead(item.id);
                        void navigate({ to: item.href as never });
                      }}
                    >
                      <span className="text-sm font-medium text-primary">{item.title}</span>
                      <span className="text-sm text-muted-foreground">{item.body}</span>
                      <span className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.at)}</span>
                      {!read ? (
                        <span className="mt-2 text-xs font-medium text-gold" onClick={(event) => { event.stopPropagation(); markNotificationRead(item.id); }}>
                          Mark as read
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
