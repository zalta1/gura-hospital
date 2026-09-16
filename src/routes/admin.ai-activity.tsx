import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAiActivity, type AiActivityRow } from "@/lib/portal/queries";
import { LOCAL_BOOKING_EVENT } from "@/lib/portal/local-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/ai-activity")({
  component: AdminAiActivity,
});

function AdminAiActivity() {
  const [rows, setRows] = useState<AiActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await fetchAiActivity());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("ai-activity-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_activity" }, () => {
        void load();
      })
      .subscribe();
    window.addEventListener(LOCAL_BOOKING_EVENT, load);
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener(LOCAL_BOOKING_EVENT, load);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">AI activity feed</h2>
        <p className="text-sm text-muted-foreground">
          Voice navigator sessions, medication reminders, and wellness checks. Escalated rows sort to the top.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground">Patient</TableHead>
              <TableHead className="text-primary-foreground">Type</TableHead>
              <TableHead className="text-primary-foreground">Outcome</TableHead>
              <TableHead className="text-primary-foreground">Summary</TableHead>
              <TableHead className="text-primary-foreground">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No AI activity yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const escalated = r.outcome === "escalated";
                return (
                  <TableRow
                    key={r.id}
                  className={escalated ? "bg-destructive/5 ring-1 ring-inset ring-gold/40" : ""}
                  >
                    <TableCell>
                      <div className="font-medium">{r.patients?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.patient_id?.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell className="capitalize">{r.activity_type.replaceAll("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant={escalated ? "destructive" : "secondary"} className="capitalize">
                        {r.outcome.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md text-sm">{r.summary}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
