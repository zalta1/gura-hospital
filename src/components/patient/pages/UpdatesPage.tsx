import { useState } from "react";
import { PageGate, EmptyState, StatusChip } from "@/components/patient/ui";
import { useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/portal/format";
import type { Announcement } from "@/lib/patient-portal/types";

export function UpdatesPage() {
  return (
    <PageGate>
      <UpdatesBody />
    </PageGate>
  );
}

function UpdatesBody() {
  const snapshot = useSnapshot();
  const [active, setActive] = useState<Announcement | null>(null);
  const [category, setCategory] = useState<string>("All");
  const categories = ["All", ...new Set(snapshot.announcements.map((item) => item.category))];
  const pinned = snapshot.announcements.find((item) => item.pinned);
  const rest = snapshot.announcements.filter((item) => item.id !== pinned?.id && (category === "All" || item.category === category));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <Button key={item} type="button" size="sm" variant={category === item ? "gold" : "outline"} onClick={() => setCategory(item)}>
            {item}
          </Button>
        ))}
      </div>
      {pinned && (category === "All" || pinned.category === category) ? (
        <article className="border border-gold bg-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-gold">Pinned · {pinned.category}</p>
          <h2 className="mt-1 font-display text-xl text-primary">{pinned.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(pinned.date)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{pinned.summary}</p>
          <Button type="button" variant="link" className="px-0" onClick={() => setActive(pinned)}>
            Read more
          </Button>
        </article>
      ) : null}
      {rest.length === 0 && !pinned ? (
        <EmptyState title="No updates" body="Hospital news will be posted here." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rest.map((item) => (
            <article key={item.id} className="border border-border bg-card p-4 shadow-card">
              <StatusChip value="pending" label={item.category} />
              <h2 className="mt-2 font-display text-lg text-primary">{item.title}</h2>
              <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
              <Button type="button" variant="link" className="px-0" onClick={() => setActive(item)}>
                Read more
              </Button>
            </article>
          ))}
        </div>
      )}
      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-primary">{active.title}</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                {active.category} · {formatDate(active.date)}
              </p>
              <p className="text-sm">{active.body}</p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
