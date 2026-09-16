import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchEscalations,
  resolveEscalation,
  type EscalationRow,
} from "@/lib/portal/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/escalations")({
  component: AdminEscalations,
});

function AdminEscalations() {
  const [rows, setRows] = useState<EscalationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await fetchEscalations());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
    // Immediate surface — realtime, not batch refresh
    const channel = supabase
      .channel("escalation-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_followups" },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function markResolved(id: string) {
    setBusy(id);
    try {
      await resolveEscalation(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resolve");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Escalation queue</h2>
        <p className="text-sm text-muted-foreground">
          Wellness-check responses flagged as concerning appear here immediately via realtime.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground shadow-card">
          No open escalations.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const summary = r.summary_json as {
              symptoms_reported?: string[];
              sentiment?: string;
              adherence?: string;
            } | null;
            return (
              <article
                key={r.id}
                className="rounded-lg border border-destructive/40 bg-card p-5 shadow-card ring-1 ring-gold/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-destructive" />
                      <h3 className="font-display text-lg text-primary">
                        {r.patients?.full_name ?? "Patient"}
                      </h3>
                      <Badge variant="destructive">Urgent</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Physician: {r.doctors?.name ?? "—"} ·{" "}
                      {new Date(r.follow_up_date).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Contact: </span>
                      {r.patients?.phone ?? "—"} · {r.patients?.email ?? "—"}
                    </p>
                    <p className="mt-1 text-sm">
                      Symptoms: {(summary?.symptoms_reported ?? []).join(", ") || "—"} · Sentiment:{" "}
                      {summary?.sentiment ?? "—"}
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    size="pill"
                    disabled={busy === r.id}
                    onClick={() => void markResolved(r.id)}
                  >
                    Mark resolved
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
