import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/portal/auth";
import { fetchFollowupResults, type FollowupResultRow } from "@/lib/portal/queries";

export const Route = createFileRoute("/doctor/followups")({
  component: FollowupResults,
});

function FollowupResults() {
  const { doctorId } = useAuth();
  const [rows, setRows] = useState<FollowupResultRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    void fetchFollowupResults(doctorId)
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [doctorId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Follow-up results</h2>
        <p className="text-sm text-muted-foreground">
          Completed AI follow-ups. Escalated feedback sorts first and is highlighted.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed follow-ups yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const summary = (r.summary_json ?? {}) as {
              adherence?: string;
              sentiment?: string;
              symptoms_reported?: string[];
              escalation_flag?: boolean;
            };
            const escalated = Boolean(summary.escalation_flag) || r.status === "escalated";
            return (
              <article
                key={r.id}
                className={`rounded-lg border bg-card p-5 shadow-card ${
                  escalated ? "border-destructive/50 ring-1 ring-gold/40" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg text-primary">
                      {r.patients?.full_name ?? "Patient"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.follow_up_date).toLocaleString()}
                    </p>
                  </div>
                  {escalated ? <Badge variant="destructive">Escalation flag</Badge> : <Badge variant="secondary">Completed</Badge>}
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Adherence</dt>
                    <dd className="font-medium capitalize">{summary.adherence?.replaceAll("_", " ") ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Sentiment</dt>
                    <dd className="font-medium capitalize">{summary.sentiment?.replaceAll("_", " ") ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Symptoms reported</dt>
                    <dd className="font-medium">
                      {(summary.symptoms_reported ?? []).join(", ") || "None reported"}
                    </dd>
                  </div>
                </dl>
                <Button
                  className="mt-4"
                  variant="outlineNavy"
                  size="pill"
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                >
                  {openId === r.id ? "Hide transcript" : "View full transcript"}
                </Button>
                {openId === r.id ? (
                  <pre className="mt-3 whitespace-pre-wrap rounded-md bg-surface p-4 text-xs text-foreground">
                    {r.transcript_text || "No transcript stored."}
                  </pre>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
