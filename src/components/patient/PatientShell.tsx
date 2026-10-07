import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileHeart,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Newspaper,
  Pill,
  Search,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { HelpWidget } from "@/components/patient/HelpWidget";
import { usePatientPortal } from "@/components/patient/PatientPortalProvider";
import { SearchDialog } from "@/components/patient/SearchDialog";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { unreadMessages } from "@/lib/patient-portal/data";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/portal/format";

const NAV: { to: string; labelKey: string; icon: LucideIcon; exact?: boolean; badge?: "messages" | "notifications" }[] = [
  { to: "/patient", labelKey: "overview", icon: LayoutDashboard, exact: true },
  { to: "/patient/record", labelKey: "record", icon: FileHeart },
  { to: "/patient/doctors", labelKey: "doctors", icon: Stethoscope },
  { to: "/patient/appointments", labelKey: "appointments", icon: CalendarDays },
  { to: "/patient/messages", labelKey: "messages", icon: MessageSquare, badge: "messages" },
  { to: "/patient/video", labelKey: "video", icon: Video },
  { to: "/patient/follow-up", labelKey: "followup", icon: Sparkles },
  { to: "/patient/medications", labelKey: "medications", icon: Pill },
  { to: "/patient/results", labelKey: "results", icon: FlaskConical },
  { to: "/patient/billing", labelKey: "billing", icon: CreditCard },
  { to: "/patient/updates", labelKey: "updates", icon: Newspaper },
  { to: "/patient/notifications", labelKey: "notifications", icon: Bell, badge: "notifications" },
];

const PAGE_META: Record<string, { eyebrow: string; title: string }> = {
  "/patient": { eyebrow: "eyebrowToday", title: "overview" },
  "/patient/record": { eyebrow: "eyebrowChart", title: "record" },
  "/patient/doctors": { eyebrow: "eyebrowCare", title: "doctors" },
  "/patient/appointments": { eyebrow: "eyebrowVisit", title: "appointments" },
  "/patient/messages": { eyebrow: "eyebrowInbox", title: "messages" },
  "/patient/video": { eyebrow: "eyebrowVideo", title: "video" },
  "/patient/follow-up": { eyebrow: "eyebrowFollow", title: "followup" },
  "/patient/medications": { eyebrow: "eyebrowMeds", title: "medications" },
  "/patient/results": { eyebrow: "eyebrowResults", title: "results" },
  "/patient/billing": { eyebrow: "eyebrowBill", title: "billing" },
  "/patient/updates": { eyebrow: "eyebrowNews", title: "updates" },
  "/patient/notifications": { eyebrow: "eyebrowAlerts", title: "notifications" },
};

export function PatientShell({ children }: { children: ReactNode }) {
  const portal = usePatientPortal();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const meta = PAGE_META[pathname] ?? { eyebrow: "eyebrowToday", title: "overview" };
  const messageCount = portal.snapshot ? unreadMessages(portal.snapshot) : 0;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function badgeFor(kind?: "messages" | "notifications") {
    if (kind === "messages") return messageCount;
    if (kind === "notifications") return portal.unreadNotificationCount;
    return 0;
  }

  return (
    <div
      className={cn("flex min-h-screen bg-surface", portal.largeText && "text-[1.0625rem] [&_.text-sm]:text-base [&_.text-xs]:text-sm")}
      lang={portal.language === "es" ? "es" : "en"}
      data-text-size={portal.largeText ? "large" : "standard"}
    >
      <a
        href="#patient-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[80] focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="hidden w-64 shrink-0 flex-col bg-primary text-primary-foreground md:flex">
        <SidebarBody badgeFor={badgeFor} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-primary p-0 text-primary-foreground [&>button]:text-primary-foreground">
          <SheetTitle className="sr-only">Patient menu</SheetTitle>
          <SidebarBody badgeFor={badgeFor} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 shadow-card sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <div className="min-w-0">
              <p className="eyebrow text-gold">{portal.t(meta.eyebrow)}</p>
              <h1 className="font-display text-xl text-primary">{portal.t(meta.title)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label={portal.t("search")} onClick={() => setSearchOpen(true)}>
              <Search />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={portal.largeText ? portal.t("textSizeOff") : portal.t("textSize")}
              aria-pressed={portal.largeText}
              onClick={() => portal.setLargeText(!portal.largeText)}
            >
              <span className="text-xs font-semibold">A+</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={portal.t("language")}
              onClick={() => portal.setLanguage(portal.language === "en" ? "es" : "en")}
            >
              <span className="text-xs font-semibold">{portal.language === "en" ? "EN" : "ES"}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="relative" aria-label={portal.t("notifications")}>
                  <Bell />
                  {portal.unreadNotificationCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-gold-foreground">
                      {portal.unreadNotificationCount}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {(portal.snapshot?.notifications ?? []).slice(0, 4).map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onSelect={() => {
                      portal.markNotificationRead(item.id);
                      void navigate({ to: item.href as never });
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(item.at)}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => void navigate({ to: "/patient/notifications" as never })}>
                  View all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="patient-main" className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
        <footer className="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.14em]">{portal.t("demoData")}</p>
            <button type="button" className="underline-offset-2 hover:text-primary hover:underline" onClick={portal.resetDemo}>
              {portal.t("reset")}
            </button>
          </div>
          <p className="mt-1">{portal.t("emergency")}</p>
          {portal.language === "es" ? <p className="mt-1">{portal.t("spanishNote")}</p> : null}
        </footer>
      </div>
      <HelpWidget />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <Toaster />
    </div>
  );
}

function SidebarBody({
  badgeFor,
  onNavigate,
}: {
  badgeFor: (kind?: "messages" | "notifications") => number;
  onNavigate?: () => void;
}) {
  const portal = usePatientPortal();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const name = portal.snapshot?.patient.fullName ?? "Morgan Ellis";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-primary-foreground/10 px-5 py-5">
        <div className="flex items-center gap-2">
          <img src="/images/gura-logo.png" alt="" className="size-9 shrink-0 rounded-md bg-white object-contain" />
          <div>
            <p className="font-display text-sm leading-tight">Gura Hospital</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-gold">{portal.t("portal")}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-auto px-3 py-4" aria-label="Patient portal">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          const count = badgeFor(item.badge);
          return (
            <Link
              key={item.to}
              to={item.to as never}
              activeOptions={{ exact: Boolean(item.exact) }}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                active
                  ? "bg-gold/20 text-gold"
                  : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{portal.t(item.labelKey)}</span>
              {count > 0 ? (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-semibold text-gold-foreground">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-primary-foreground/10 px-4 py-4">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-primary-foreground/60">{portal.t("role")}</p>
        <Button type="button" variant="outlineLight" size="pill" className="mt-3 w-full" onClick={portal.signOut}>
          <LogOut className="size-3.5" /> {portal.t("signOut")}
        </Button>
        <Link to="/" className="mt-2 block text-center text-xs text-primary-foreground/50 hover:text-gold">
          {portal.t("back")}
        </Link>
      </div>
    </div>
  );
}
