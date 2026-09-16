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
import { fetchInventory } from "@/lib/portal/queries";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventory,
});

function AdminInventory() {
  const [rows, setRows] = useState<Database["public"]["Tables"]["inventory_items"]["Row"][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchInventory()
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          Items at or below reorder threshold are flagged in red/gold.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground">Item</TableHead>
              <TableHead className="text-primary-foreground">Category</TableHead>
              <TableHead className="text-primary-foreground">On hand</TableHead>
              <TableHead className="text-primary-foreground">Reorder at</TableHead>
              <TableHead className="text-primary-foreground">Unit cost</TableHead>
              <TableHead className="text-primary-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const low = r.quantity_on_hand <= r.reorder_threshold;
              return (
                <TableRow
                  key={r.id}
                  className={low ? "bg-destructive/5 ring-1 ring-inset ring-gold/40" : ""}
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{r.quantity_on_hand}</TableCell>
                  <TableCell>{r.reorder_threshold}</TableCell>
                  <TableCell>${Number(r.unit_cost).toFixed(2)}</TableCell>
                  <TableCell>
                    {low ? <Badge variant="destructive">Reorder</Badge> : <Badge variant="secondary">OK</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
