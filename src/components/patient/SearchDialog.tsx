import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { usePatientPortal } from "@/components/patient/PatientPortalProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchPortal } from "@/lib/patient-portal/data";

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { snapshot, t } = usePatientPortal();
  const [query, setQuery] = useState("");
  const hits = useMemo(() => (snapshot ? searchPortal(snapshot, query) : []), [query, snapshot]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-primary">{t("search")}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Appointments, doctors, medications, results"
          aria-label={t("search")}
        />
        <ul className="max-h-72 space-y-1 overflow-auto">
          {query.trim().length >= 2 && hits.length === 0 ? (
            <li className="px-1 py-4 text-sm text-muted-foreground">No matches in your chart.</li>
          ) : null}
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <Link
                to={hit.href as never}
                onClick={() => onOpenChange(false)}
                className="block rounded-md px-2 py-2 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="text-xs uppercase tracking-wide text-gold">{hit.kind}</p>
                <p className="text-sm font-medium text-primary">{hit.title}</p>
                <p className="text-xs text-muted-foreground">{hit.subtitle}</p>
              </Link>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
