"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Landmark,
  FlaskConical,
  ClipboardList,
  Newspaper,
  CalendarDays,
  Mail,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
};

const items: Item[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", Icon: Users },
  { href: "/admin/committee", label: "Committee", Icon: Landmark },
  { href: "/admin/lab-tests", label: "Lab tests", Icon: FlaskConical },
  { href: "/admin/bookings", label: "Bookings", Icon: ClipboardList },
  { href: "/admin/news", label: "News", Icon: Newspaper },
  { href: "/admin/events", label: "Events", Icon: CalendarDays },
  { href: "/admin/messages", label: "Messages", Icon: Mail },
  { href: "/admin/office-info", label: "Office info", Icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, Icon }) => {
        // Exact match for /admin (dashboard); prefix match for child pages.
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2 text-sm no-underline transition-colors",
              active
                ? "bg-heading text-white"
                : "text-text hover:bg-surface hover:text-heading",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                active ? "text-white" : "text-muted",
              )}
              strokeWidth={1.75}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
