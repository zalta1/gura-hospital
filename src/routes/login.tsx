import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/portal/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in | Gura Hospital" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@gurahospital.demo");
  const [password, setPassword] = useState("DemoGura2026!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !profile) return;
    const dest =
      profile.role === "admin" || profile.role === "staff"
        ? "/admin"
        : profile.role === "doctor"
          ? "/doctor"
          : "/";
    void navigate({ to: dest });
  }, [loading, profile, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const p = await signIn(email.trim(), password);
      if (p.role === "admin" || p.role === "staff") {
        await navigate({ to: "/admin" });
      } else if (p.role === "doctor") {
        await navigate({ to: "/doctor" });
      } else {
        await navigate({ to: "/" });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Is local Supabase running?",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-primary-foreground/10 bg-card shadow-float">
        <div className="bg-primary px-8 py-6 text-primary-foreground">
          <img src="/images/gura-logo.png" alt="" className="mb-3 h-14 w-14 rounded-md bg-white object-contain" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Gura Hospital</p>
          <h1 className="mt-1 font-display text-2xl">Staff & physician sign-in</h1>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Demo staff logins. Visit Intake bookings show on this dashboard immediately.
          </p>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 bg-card px-8 py-8">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant="gold" size="pillLg" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
          <div className="rounded-md bg-surface p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Local demo accounts</p>
            <p className="mt-1">Admin: admin@gurahospital.demo</p>
            <p>Doctors: firstname.lastname@gurahospital.demo (see Admin → Demo accounts)</p>
            <p>Password: DemoGura2026!</p>
          </div>
        </form>
      </div>
    </div>
  );
}
