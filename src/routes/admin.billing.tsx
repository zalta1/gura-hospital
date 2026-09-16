import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/portal/auth";
import { billingTotals, fetchBilling, updateBillingStatus } from "@/lib/portal/queries";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/billing")({
  component: AdminBilling,
});

type BillingStatus = Database["public"]["Enums"]["billing_status"];

function AdminBilling() {
  const { profile } = useAuth();
  const canEdit = profile?.role === "admin";
  const [rows, setRows] = useState<
    Array<
      Database["public"]["Tables"]["billing_records"]["Row"] & {
        patients: { id: string; full_name: string } | null;
      }
    >
  >([]);
  const [status, setStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchBilling()
      .then((data) => setRows(data as unknown as typeof rows))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((r) => r.status === status)),
    [rows, status],
  );
  const totals = billingTotals(rows);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Billing</h2>
        <p className="text-sm text-muted-foreground">
          {profile?.role === "staff"
            ? "View-only for staff accounts — billing edits require admin."
            : "Billing records with status filters and monthly totals."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Revenue this month</p>
          <p className="mt-2 font-display text-3xl text-primary">
            ${totals.revenueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Outstanding balance</p>
          <p className="mt-2 font-display text-3xl text-gold">
            ${totals.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="max-w-xs space-y-1.5">
        <Label>Status filter</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {(["pending", "paid", "denied", "insurance_review"] as BillingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground">Patient</TableHead>
              <TableHead className="text-primary-foreground">Amount</TableHead>
              <TableHead className="text-primary-foreground">Status</TableHead>
              <TableHead className="text-primary-foreground">Payer</TableHead>
              <TableHead className="text-primary-foreground">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                <TableCell>${Number(r.amount).toFixed(2)}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Select
                      value={r.status}
                      onValueChange={(v) => {
                        const next = v as BillingStatus;
                        void updateBillingStatus(r.id, next)
                          .then(() =>
                            setRows((prev) => prev.map((row) => (row.id === r.id ? { ...row, status: next } : row))),
                          )
                          .catch((e: unknown) => setError(e instanceof Error ? e.message : "Update failed"));
                      }}
                    >
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["pending", "paid", "denied", "insurance_review"] as BillingStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {r.status.replaceAll("_", " ")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{r.payer ?? "—"}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
