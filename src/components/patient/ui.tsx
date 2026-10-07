import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePatientPortal } from "@/components/patient/PatientPortalProvider";

export function PageGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = usePatientPortal();
  if (status === "loading") return <PageSkeleton />;
  if (status === "error") return <ErrorState message={error ?? "Something went wrong."} onRetry={retry} />;
  return children;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border border-border bg-card p-6 shadow-card" role="alert">
      <p className="font-display text-lg text-primary">This page didn’t load</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outlineNavy" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="font-medium text-primary">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-primary-foreground">
        <h2 className="nav-label">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const chipClass: Record<string, string> = {
  pending: "border-gold bg-gold/15 text-primary",
  confirmed: "border-primary/30 bg-primary/10 text-primary",
  completed: "border-border bg-surface text-muted-foreground",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
  normal: "border-primary/30 bg-primary/10 text-primary",
  borderline: "border-gold bg-gold/15 text-primary",
  abnormal: "border-destructive/40 bg-destructive/10 text-destructive",
  released: "border-primary/30 bg-primary/10 text-primary",
  pending_review: "border-gold bg-gold/15 text-primary",
  paid: "border-primary/30 bg-primary/10 text-primary",
  due: "border-gold bg-gold/15 text-primary",
  in_review: "border-border bg-surface text-muted-foreground",
};

export function StatusChip({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold capitalize",
        chipClass[value] ?? "border-border text-foreground",
      )}
    >
      {(label ?? value).replaceAll("_", " ")}
    </span>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 120;
  const height = 36;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-28 text-primary" role="img" aria-label={label}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

export function DualTrend({
  systolic,
  diastolic,
  label,
}: {
  systolic: number[];
  diastolic: number[];
  label: string;
}) {
  const all = [...systolic, ...diastolic];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const width = 280;
  const height = 96;
  const line = (values: number[]) =>
    values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / (max - min || 1)) * (height - 12) - 6;
        return `${x},${y}`;
      })
      .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" role="img" aria-label={label}>
      <polyline fill="none" stroke="var(--color-primary)" strokeWidth="2" points={line(systolic)} />
      <polyline fill="none" stroke="var(--color-gold)" strokeWidth="2" points={line(diastolic)} />
    </svg>
  );
}
