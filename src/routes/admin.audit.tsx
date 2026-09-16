import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAuditLog } from "@/lib/portal/queries";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAudit,
});

function AdminAudit() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      action: string;
      target_table: string | null;
      target_id: string | null;
      detail: string | null;
      timestamp: string;
      profiles: { full_name: string; email: string | null } | null;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAuditLog()
      .then((data) => setRows(data as unknown as typeof rows))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Audit log</h2>
        <p className="text-sm text-muted-foreground">Read-only compliance trail of who did what, when.</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground">When</TableHead>
              <TableHead className="text-primary-foreground">Actor</TableHead>
              <TableHead className="text-primary-foreground">Action</TableHead>
              <TableHead className="text-primary-foreground">Target</TableHead>
              <TableHead className="text-primary-foreground">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {new Date(r.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>{r.profiles?.full_name ?? r.profiles?.email ?? "—"}</TableCell>
                <TableCell className="font-medium">{r.action}</TableCell>
                <TableCell className="text-sm">
                  {r.target_table ?? "—"}
                  {r.target_id ? (
                    <span className="block text-xs text-muted-foreground">{r.target_id.slice(0, 8)}…</span>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-md text-sm text-muted-foreground">{r.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
