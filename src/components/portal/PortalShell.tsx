import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/portal/auth";

export type PortalNavItem = {
  to: string;
  label: string;
  icon?: LucideIcon;
};

type Props = {
  title: string;
  navItems: PortalNavItem[];
  children: ReactNode;
};

export function PortalShell({ title, navItems, children }: Props) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="flex w-64 shrink-0 flex-col bg-primary text-primary-foreground">
        <div className="border-b border-primary-foreground/10 px-5 py-5">
          <div className="flex items-center gap-2">
            <img src="/images/gura-logo.png" alt="" className="size-9 shrink-0 rounded-md bg-white object-contain" />
            <div>
              <p className="font-display text-sm leading-tight">Gura Hospital</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-gold">{title}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active =
              pathname === item.to || (item.to !== "/admin" && item.to !== "/doctor" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as never}
                activeOptions={{ exact: item.to === "/admin" || item.to === "/doctor" }}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-gold/20 text-gold"
                    : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
              >
                {Icon ? <Icon className="size-4 shrink-0" /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-primary-foreground/10 px-4 py-4">
          <p className="truncate text-sm font-medium" suppressHydrationWarning>
            {profile?.full_name ?? "Portal"}
          </p>
          <p className="text-xs capitalize text-primary-foreground/60">{profile?.role}</p>
          <Button
            type="button"
            variant="outlineLight"
            size="pill"
            className="mt-3 w-full"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-3.5" /> Sign out
          </Button>
          <Link to="/" className="mt-2 block text-center text-xs text-primary-foreground/50 hover:text-gold">
            Back to public site
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4 shadow-card">
          <div>
            <p className="eyebrow text-gold">Internal systems</p>
            <h1 className="font-display text-xl text-primary">{title}</h1>
          </div>
          <div className="h-0.5 w-16 bg-gold" />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
