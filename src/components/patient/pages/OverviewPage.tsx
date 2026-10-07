import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageGate, Panel, StatusChip } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import {
  canJoinVideo,
  doctorName,
  nextAppointment,
  outstandingBalance,
  unreadMessages,
  doseKey,
  money,
} from "@/lib/patient-portal/data";
import { formatDateTime } from "@/lib/portal/format";

export function OverviewPage() {
  return (
    <PageGate>
      <OverviewBody />
    </PageGate>
  );
}

function OverviewBody() {
  const snapshot = useSnapshot();
  const { state } = usePatientPortal();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const next = nextAppointment(snapshot);
  const join = next ? canJoinVideo(next, now) : false;
  const dueCheck = snapshot.checkIns.find((item) => item.status === "due");
  const activeMeds = snapshot.medications.filter((item) => item.active);
  const taken = activeMeds.filter((item) => state.takenDoseKeys.includes(doseKey(item.id))).length;
  const unread = unreadMessages(snapshot);
  const balance = outstandingBalance(snapshot);
  const latestLab = snapshot.labs.find((lab) => lab.release === "released");
  const pinned = snapshot.announcements.find((item) => item.pinned) ?? snapshot.announcements[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <p className="font-display text-2xl text-primary">{`${greeting}, ${snapshot.patient.fullName.split(" ")[0]}`}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="border border-border bg-card p-4 shadow-card sm:col-span-2 xl:col-span-1">
          <p className="eyebrow">Next appointment</p>
          {next ? (
            <>
              <p className="mt-2 font-medium text-primary">{next.reason}</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(next.datetime)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{doctorName(snapshot, next.doctorId)}</p>
              <div className="mt-3">
                {join ? (
                  <Button asChild variant="gold" size="sm">
                    <Link to={"/patient/video" as never}>Join video visit</Link>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled>
                    Join video visit
                  </Button>
                )}
              </div>
              {!join && next.mode === "telehealth" ? (
                <p className="mt-2 text-xs text-muted-foreground">Opens 15 minutes before the start time.</p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No upcoming visit.</p>
          )}
        </article>
        <SummaryCard
          eyebrow="AI follow-up"
          title={dueCheck ? "Check-in due now" : "Up to date"}
          detail={dueCheck ? dueCheck.label : "No check-in is waiting."}
          href="/patient/follow-up"
        />
        <SummaryCard
          eyebrow="Medications"
          title={`${taken} of ${activeMeds.length} taken`}
          detail="Doses due this morning"
          href="/patient/medications"
        />
        <SummaryCard eyebrow="Messages" title={`${unread} unread`} detail="Secure notes from your doctors" href="/patient/messages" />
        <SummaryCard eyebrow="Balance" title={money(balance)} detail="Outstanding patient balance" href="/patient/billing" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent activity">
          <ol className="divide-y divide-border">
            {snapshot.activity.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted-foreground">No recent activity.</li>
            ) : (
              snapshot.activity.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-primary">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.at)}</p>
                </li>
              ))
            )}
          </ol>
        </Panel>
        <Panel title="Latest lab">
          {latestLab ? (
            <div className="space-y-2 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-primary">{latestLab.name}</p>
                <StatusChip value={latestLab.flag} />
              </div>
              <p className="text-sm text-muted-foreground">{latestLab.explanation}</p>
              <Link to={"/patient/results" as never} className="text-xs font-medium text-gold">
                Open results →
              </Link>
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">No released results yet.</p>
          )}
        </Panel>
        <Panel title="Hospital announcement">
          {pinned ? (
            <div className="space-y-2 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-gold">{pinned.category}</p>
              <p className="font-medium text-primary">{pinned.title}</p>
              <p className="text-sm text-muted-foreground">{pinned.summary}</p>
              <Link to={"/patient/updates" as never} className="text-xs font-medium text-gold">
                Read updates →
              </Link>
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">No announcements.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function SummaryCard({ eyebrow, title, detail, href }: { eyebrow: string; title: string; detail: string; href: string }) {
  return (
    <Link to={href as never} className="block border border-border bg-card p-4 shadow-card transition-colors hover:bg-surface">
      <p className="eyebrow">{eyebrow}</p>
      <p className="mt-2 font-medium text-primary">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </Link>
  );
}
