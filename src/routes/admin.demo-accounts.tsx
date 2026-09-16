import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_DOCTOR_PASSWORD,
  doctorAccountsSortedForDemo,
} from "@/lib/doctor-accounts";
import { requirePortalRoles } from "@/lib/portal/portal-guard";

export const Route = createFileRoute("/admin/demo-accounts")({
  beforeLoad: () => requirePortalRoles(["admin"], "/admin"),
  component: DemoAccounts,
});

function DemoAccounts() {
  const rows = doctorAccountsSortedForDemo();
  let lastGroup = "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Demo accounts</h2>
        <p className="text-sm text-muted-foreground">
          Live presentation logins for every physician on Find a Doctor. Shared password for all seeded
          accounts.
        </p>
      </div>

      <div className="rounded-lg border border-gold/40 bg-card p-4 shadow-card">
        <p className="text-xs uppercase tracking-wider text-gold">Admin</p>
        <p className="mt-1 font-medium text-primary">{DEMO_ADMIN_EMAIL}</p>
        <p className="mt-1 font-mono text-sm">{DEMO_DOCTOR_PASSWORD}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground">Name</TableHead>
              <TableHead className="text-primary-foreground">Specialty</TableHead>
              <TableHead className="text-primary-foreground">Email</TableHead>
              <TableHead className="text-primary-foreground">Password</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const showGroup = row.specialtyGroupTitle !== lastGroup;
              lastGroup = row.specialtyGroupTitle;
              return (
                <Fragment key={row.slug}>
                  {showGroup ? (
                    <TableRow className="bg-surface hover:bg-surface">
                      <TableCell colSpan={4} className="py-2 text-xs font-medium uppercase tracking-wider text-gold">
                        {row.specialtyGroupTitle}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  <TableRow>
                    <TableCell className="font-medium text-primary">
                      {row.name}, {row.credentials}
                    </TableCell>
                    <TableCell>{row.specialty}</TableCell>
                    <TableCell className="font-mono text-xs">{row.email}</TableCell>
                    <TableCell className="font-mono text-xs">{DEMO_DOCTOR_PASSWORD}</TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
