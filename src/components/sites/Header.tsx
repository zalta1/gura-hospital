import { Link } from "@tanstack/react-router";
import { Menu, Phone, Search, Stethoscope, MapPin, Clock, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { hospitalInfo, specialtyGroups } from "@/lib/hospital-data";
import { Logo } from "./Logo";

type MenuItem = { label: string; to: string };

const patientLinks: MenuItem[] = [
  { label: "Patient Portal (demo)", to: "/for-patients" },
  { label: "Billing & Insurance", to: "/for-patients" },
  { label: "Medical Records", to: "/for-patients" },
  { label: "Visitor Information", to: "/for-patients" },
  { label: "Preparing For Surgery", to: "/for-patients" },
];

const programLinks: MenuItem[] = [
  { label: "Structural Heart Program", to: "/programs-services" },
  { label: "Joint Replacement Center", to: "/programs-services" },
  { label: "Stroke Response Team", to: "/programs-services" },
  { label: "Birth Center", to: "/programs-services" },
  { label: "Imaging & Diagnostics", to: "/programs-services" },
];

const resourceLinks: MenuItem[] = [
  { label: "Health Library", to: "/resources" },
  { label: "Classes & Events", to: "/resources" },
  { label: "Forms & Downloads", to: "/resources" },
  { label: "Price Transparency", to: "/resources" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Utility bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 text-xs md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-primary-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-gold" /> {hospitalInfo.address}
            </span>
            <a href="tel:5552100000" className="inline-flex items-center gap-1.5 hover:text-gold">
              <Phone className="size-3.5 text-gold" /> {hospitalInfo.phone}
            </a>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-gold" /> {hospitalInfo.hours}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/" className="tracking-wide hover:text-gold">
              Home
            </Link>
            <Link to="/login" className="tracking-wide hover:text-gold">
              Portal
            </Link>
            <Link to="/staff/reviews" className="tracking-wide hover:text-gold">
              Staff reviews
            </Link>
            <Link to="/for-physicians" className="tracking-wide hover:text-gold">
              For Physicians
            </Link>
            <Link to="/careers" className="tracking-wide hover:text-gold">
              Careers
            </Link>
            <Link to="/find-a-doctor" className="inline-flex items-center gap-1.5 hover:text-gold">
              <Stethoscope className="size-3.5 text-gold" /> Find a Doctor
            </Link>
            <Button asChild variant="gold" size="pill">
              <Link to="/for-patients" hash="billing">
                Pay a bill
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-gold" />

      {/* Main nav */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <MegaMenu label="Find a Doctor" to="/find-a-doctor" wide>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="relative h-64 overflow-hidden rounded-lg">
                  <img
                    src="/images/find-a-doctor-menu.jpg"
                    alt="Gura Hospital care team"
                    className="absolute inset-0 size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <Button asChild size="pill" variant="gold" className="w-full shadow-card">
                      <Link to="/find-a-doctor">Find a Doctor</Link>
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="eyebrow mb-3">By Specialty</p>
                  <ul className="space-y-1.5 text-sm">
                    {specialtyGroups.map((g) => (
                      <li key={g.slug}>
                        <Link
                          to="/specialties/$slug"
                          params={{ slug: g.slug }}
                          className="text-muted-foreground transition-colors hover:text-primary"
                        >
                          {g.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </MegaMenu>

            <MegaMenu label="For Patients" to="/for-patients">
              <MenuList items={patientLinks} />
            </MegaMenu>

            <MegaMenu label="Specialties" to="/specialties">
              <MenuList
                items={specialtyGroups.map((g) => ({
                  label: g.title,
                  to: `/specialties/${g.slug}`,
                }))}
              />
            </MegaMenu>

            <MegaMenu label="Programs & Services" to="/programs-services">
              <MenuList items={programLinks} />
            </MegaMenu>

            <MegaMenu label="Resources" to="/resources">
              <MenuList items={resourceLinks} />
            </MegaMenu>

            <Link
              to="/contact"
              className="nav-label rounded-md px-3 py-2 text-foreground/80 transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              Contact Us
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative hidden xl:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search Gura Hospital"
                placeholder="Search"
                className="h-9 w-44 rounded-full pl-9"
              />
            </div>
            <Button asChild size="pill" className="hidden md:inline-flex">
              <Link to="/book-appointment">Request Appointment</Link>
            </Button>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="mt-2 space-y-6">
                  <Logo />
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search" aria-label="Search" className="rounded-full pl-9" />
                  </div>
                  <MobileGroup
                    title="Care"
                    items={[
                      { label: "Find a Doctor", to: "/find-a-doctor" },
                      { label: "Specialties", to: "/specialties" },
                      { label: "Programs & Services", to: "/programs-services" },
                      { label: "Book Appointment", to: "/book-appointment" },
                    ]}
                    onNavigate={() => setMobileOpen(false)}
                  />
                  <MobileGroup
                    title="Patients"
                    items={patientLinks}
                    onNavigate={() => setMobileOpen(false)}
                  />
                  <MobileGroup
                    title="More"
                    items={[
                      { label: "Portal", to: "/login" },
                      { label: "Staff reviews", to: "/staff/reviews" },
                      { label: "Resources", to: "/resources" },
                      { label: "For Physicians", to: "/for-physicians" },
                      { label: "Careers", to: "/careers" },
                      { label: "Contact Us", to: "/contact" },
                    ]}
                    onNavigate={() => setMobileOpen(false)}
                  />
                  <Button asChild size="pill" className="w-full">
                    <Link to="/book-appointment" onClick={() => setMobileOpen(false)}>
                      Book Appointment
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

function MegaMenu({
  label,
  to,
  wide,
  children,
}: {
  label: string;
  to: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <Link
        to={to}
        className="nav-label inline-flex items-center gap-1 rounded-md px-3 py-2 text-foreground/80 transition-colors group-hover:text-primary"
        activeProps={{ className: "text-primary" }}
      >
        {label}
        <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" />
      </Link>
      <div
        className={`invisible absolute top-full left-0 z-50 translate-y-1 opacity-0 shadow-float transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 ${
          wide ? "w-[38rem]" : "w-72"
        }`}
      >
        <div className="mt-1 rounded-lg border border-border bg-popover p-5">{children}</div>
      </div>
    </div>
  );
}

function MenuList({ items }: { items: MenuItem[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.label}>
          <Link
            to={item.to}
            className="block text-muted-foreground transition-colors hover:text-primary"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MobileGroup({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: MenuItem[];
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label}>
            <Link to={item.to} onClick={onNavigate} className="block py-1 text-foreground/80">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
