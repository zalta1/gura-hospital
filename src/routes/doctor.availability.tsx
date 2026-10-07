import { createFileRoute } from "@tanstack/react-router";
import { DoctorAvailabilityPanel } from "@/components/portal/DoctorAvailabilityPanel";
import { useAuth } from "@/lib/portal/auth";

export const Route = createFileRoute("/doctor/availability")({
  head: () => ({
    meta: [{ title: "My availability | Gura Hospital" }],
  }),
  component: DoctorAvailabilityPage,
});

function DoctorAvailabilityPage() {
  const { doctorId } = useAuth();
  if (!doctorId) {
    return (
      <p className="text-sm text-muted-foreground">
        No physician record is linked to this account. Ask an administrator to connect your profile.
      </p>
    );
  }
  return <DoctorAvailabilityPanel doctorId={doctorId} />;
}
