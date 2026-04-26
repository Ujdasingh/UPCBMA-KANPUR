import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export async function PublicFooter() {
  const supabase = await createClient();
  const { data: office } = await supabase
    .from("office_info")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Wordmark + tagline */}
          <div className="md:col-span-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              UPCBMA
            </div>
            <div className="mt-0.5 text-base font-semibold text-heading">
              Kanpur Chapter
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted">
              Uttar Pradesh Corrugated Box Manufacturers&rsquo; Association &mdash;
              representing corrugated box manufacturers across the Kanpur
              region with testing, advocacy, and member services.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Quick links
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/about" className="no-underline text-text hover:text-heading">
                  About
                </Link>
              </li>
              <li>
                <Link href="/committee" className="no-underline text-text hover:text-heading">
                  Committee
                </Link>
              </li>
              <li>
                <Link href="/lab" className="no-underline text-text hover:text-heading">
                  Lab services
                </Link>
              </li>
              <li>
                <Link href="/news" className="no-underline text-text hover:text-heading">
                  News
                </Link>
              </li>
              <li>
                <Link href="/events" className="no-underline text-text hover:text-heading">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/contact" className="no-underline text-text hover:text-heading">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact block */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Contact
            </div>
            <ul className="mt-4 space-y-3 text-sm text-text">
              {office?.address && (
                <li className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className="whitespace-pre-line">{office.address}</span>
                </li>
              )}
              {office?.phone && (
                <li className="flex gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <a href={`tel:${office.phone}`} className="no-underline text-text hover:text-heading">
                    {office.phone}
                  </a>
                </li>
              )}
              {office?.email && (
                <li className="flex gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <a href={`mailto:${office.email}`} className="no-underline text-text hover:text-heading">
                    {office.email}
                  </a>
                </li>
              )}
              {office?.office_hours && (
                <li className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span>{office.office_hours}</span>
                </li>
              )}
              {!office && (
                <li className="text-muted italic">
                  Contact details to be published soon.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted md:flex-row md:items-center">
          <div>&copy; {year} UPCBMA Kanpur Chapter. All rights reserved.</div>
          <div className="flex gap-5">
            <Link href="/login" className="no-underline hover:text-heading">
              Member login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
