import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/portal/auth";
import { fetchDoctors, fetchStaff, upsertStaff } from "@/lib/portal/queries";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/staff")({
  component: AdminStaff,
});

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];
type DoctorRow = Database["public"]["Tables"]["doctors"]["Row"];

const emptyForm = {
  name: "",
  role_title: "",
  department: "",
  shift_schedule: "",
  id: "",
};

function AdminStaff() {
  const { profile } = useAuth();
  const canEditHr = profile?.role === "admin";
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      const [s, d] = await Promise.all([fetchStaff(), fetchDoctors()]);
      setStaff(s);
      setDoctors(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    try {
      const row: Database["public"]["Tables"]["staff"]["Insert"] & { id?: string } = {
        name: form.name,
        role_title: form.role_title,
        department: form.department,
        shift_schedule: form.shift_schedule || null,
      };
      if (form.id) row.id = form.id;
      await upsertStaff(row);
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-primary">Staff & scheduling</h2>
          <p className="text-sm text-muted-foreground">
            Staff and physicians with role, department, and shift schedule.
            {!canEditHr ? " Staff accounts have view-only access (no HR edits)." : null}
          </p>
        </div>
        {canEditHr ? (
          <Button
            variant="gold"
            size="pill"
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            Add staff
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-sm text-primary-foreground">Clinical staff</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Shift schedule</TableHead>
              {canEditHr ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.role_title}</TableCell>
                <TableCell>{s.department}</TableCell>
                <TableCell>{s.shift_schedule ?? "—"}</TableCell>
                {canEditHr ? (
                  <TableCell className="text-right">
                    <Button
                      variant="outlineNavy"
                      size="pill"
                      onClick={() => {
                        setForm({
                          name: s.name,
                          role_title: s.role_title,
                          department: s.department,
                          shift_schedule: s.shift_schedule ?? "",
                          id: s.id,
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-sm text-primary-foreground">Physicians</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>On shift</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.specialty}</TableCell>
                <TableCell>{d.office ?? "—"}</TableCell>
                <TableCell>{d.on_shift ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit staff member" : "Add staff member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role title</Label>
              <Input
                value={form.role_title}
                onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Shift schedule</Label>
              <Input
                value={form.shift_schedule}
                onChange={(e) => setForm({ ...form, shift_schedule: e.target.value })}
              />
            </div>
            <Button variant="gold" size="pill" disabled={!canEditHr} onClick={() => void save()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
