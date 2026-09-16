import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHero } from "@/components/site/PageHero";
import { apiFetch, clearAuth, storeAuth, type AuthSession } from "@/lib/api";

export const Route = createFileRoute("/staff/reviews")({
  head: () => ({
    meta: [{ title: "Staff review queue | Gura Hospital" }],
  }),
  component: StaffReviews,
});

type ReviewItem = {
  id: string;
  action_type: string;
  status: string;
  summary: string;
  created_at: string;
  payload: Record<string, unknown>;
};

function StaffReviews() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("priya.nair@gura.example");
  const [password, setPassword] = useState("gura-staff-demo");
  const [authed, setAuthed] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const session = await apiFetch<AuthSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      storeAuth(session);
      setAuthed(true);
      await load();
    } catch {
      try {
        const session = await apiFetch<AuthSession>("/auth/demo-login", {
          method: "POST",
          body: JSON.stringify({ persona: "staff" }),
        });
        storeAuth(session);
        setAuthed(true);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed. Is the API running?");
      }
    }
  }

  async function load() {
    const data = await apiFetch<{ items: ReviewItem[] }>("/reviews/pending");
    setItems(data.items);
  }

  useEffect(() => {
    void apiFetch<{ items: ReviewItem[] }>("/reviews/pending")
      .then((data) => {
        setAuthed(true);
        setItems(data.items);
      })
      .catch(() => undefined);
  }, []);

  async function decide(id: string, decision: "approve" | "reject") {
    await apiFetch(`/reviews/${id}/${decision}`, { method: "POST", body: "{}" });
    await load();
  }

  return (
    <>
      <PageHero
        title="Clinician & staff review"
        subtitle="Follow-up plans and clinically adjacent outbound messages stay here until a licensed professional approves them. The agent cannot send them on its own."
        kicker="Staff portal"
      />
      <section className="mx-auto max-w-3xl px-4 py-16">
        {!authed ? (
          <form onSubmit={login} className="space-y-4 border border-border bg-card p-8 shadow-card">
            <h2 className="text-xl">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Seeded staff account: priya.nair@gura.example / gura-staff-demo
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="pillLg">
              Sign in
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Pending review</h2>
              <div className="flex gap-2">
                <Button variant="outlineNavy" size="pill" onClick={() => void load()}>
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="pill"
                  onClick={() => {
                    clearAuth();
                    setAuthed(false);
                    setItems([]);
                  }}
                >
                  Sign out
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items waiting. When the agent drafts a follow-up plan or patient message, it appears
                here.
              </p>
            ) : (
              items.map((item) => (
                <article key={item.id} className="border border-border bg-card p-6 shadow-card">
                  <p className="nav-label text-gold">{item.action_type}</p>
                  <h3 className="mt-2 text-lg">{item.summary}</h3>
                  <pre className="mt-3 overflow-x-auto bg-surface p-3 text-xs">
                    {JSON.stringify(item.payload, null, 2)}
                  </pre>
                  <div className="mt-4 flex gap-2">
                    <Button size="pill" onClick={() => void decide(item.id, "approve")}>
                      Approve
                    </Button>
                    <Button
                      size="pill"
                      variant="outlineNavy"
                      onClick={() => void decide(item.id, "reject")}
                    >
                      Return
                    </Button>
                  </div>
                </article>
              ))
            )}
            <p className="text-xs text-muted-foreground">
              Need the public site? <Link to="/">Return home</Link>
            </p>
          </div>
        )}
      </section>
    </>
  );
}
