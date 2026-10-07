import { useNavigate } from "@tanstack/react-router";
import { signInAsMorgan } from "@/lib/patient-portal/session";
import { Button } from "@/components/ui/button";

export function SignInPage() {
  const navigate = useNavigate();

  function enter() {
    signInAsMorgan();
    void navigate({ to: "/patient" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-primary-foreground/10 bg-card shadow-float">
        <div className="bg-primary px-8 py-6 text-primary-foreground">
          <img src="/images/gura-logo.png" alt="" className="mb-3 h-14 w-14 rounded-md bg-white object-contain" />
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Gura Hospital</p>
          <h1 className="mt-1 font-display text-2xl">Patient portal</h1>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Demo chart for Morgan Ellis. No password is required.
          </p>
        </div>
        <div className="space-y-4 bg-card px-8 py-8">
          <Button type="button" variant="gold" size="pillLg" className="w-full" onClick={enter}>
            Sign in as Morgan Ellis
          </Button>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              enter();
            }}
          >
            <label className="block text-sm" htmlFor="demo-email">
              Email
              <input
                id="demo-email"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue="morgan.ellis@patient.example"
                readOnly
              />
            </label>
            <Button type="submit" variant="outlineNavy" className="w-full">
              Continue
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            UnitedHealthcare · Cardiology with Dr. Amara Velloso. This demo is separate from staff sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}
