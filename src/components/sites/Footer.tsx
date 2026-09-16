import { Link } from "@tanstack/react-router";
import { hospitalInfo, specialtyGroups } from "@/lib/hospital-data";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="h-1 bg-gold" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed text-primary-foreground/70">
            1400 Harborline Avenue, Fairmont Ridge. Level I trauma, 24-hour emergency services, and
            coordinated specialty care across two campuses.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Specialties</p>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            {specialtyGroups.map((g) => (
              <li key={g.slug}>
                <Link
                  to="/specialties/$slug"
                  params={{ slug: g.slug }}
                  className="transition-colors hover:text-gold"
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Patients & visitors</p>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            <li>
              <Link to="/find-a-doctor" className="hover:text-gold">
                Find a Doctor
              </Link>
            </li>
            <li>
              <Link to="/book-appointment" className="hover:text-gold">
                Request an Appointment
              </Link>
            </li>
            <li>
              <Link to="/for-patients" className="hover:text-gold">
                Patient Information
              </Link>
            </li>
            <li>
              <Link to="/programs-services" className="hover:text-gold">
                Programs & Services
              </Link>
            </li>
            <li>
              <Link to="/staff/reviews" className="hover:text-gold">
                Staff portal
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Contact</p>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            <li>{hospitalInfo.address}</li>
            <li>Main: {hospitalInfo.phone}</li>
            <li>Emergency: 24 hours</li>
            <li>
              <Link to="/contact" className="hover:text-gold">
                Directories & maps
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-primary-foreground/55 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Gura Hospital. All rights reserved.</p>
          <p>Privacy · Terms · Nondiscrimination · Accessibility</p>
        </div>
        <p className="mx-auto max-w-7xl px-4 pb-5 text-[11px] leading-relaxed text-primary-foreground/40">
          Demonstration environment with synthetic patients and providers. Not a live medical service.
          Licensed clinicians remain responsible for all clinical decisions. Production use requires
          HIPAA review, BAAs, and clinical validation.
        </p>
      </div>
    </footer>
  );
}
