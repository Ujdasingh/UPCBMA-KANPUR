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
  Network,
  Crown,
  Tags,
  Shield,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  /** If true, only super_admins see it. */
  superOnly?: boolean;
};

const items: Item[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", Icon: Users },
  { href: "/admin/committee", label: "Committee", Icon: Landmark },
  { href: "/admin/committee-roles", label: "Committee roles", Icon: Crown },
  { href: "/admin/member-categories", label: "Member categories", Icon: Tags },
  { href: "/admin/agendas", label: "Agendas", Icon: Megaphone },
  { href: "/admin/lab-tests", label: "Lab tests", Icon: FlaskConical },
  { href: "/admin/bookings", label: "Bookings", Icon: ClipboardList },
  { href: "/admin/news", label: "News", Icon: Newspaper },
  { href: "/admin/events", label: "Events", Icon: CalendarDays },
  { href: "/admin/messages", label: "Messages", Icon: Mail },
  { href: "/admin/office-info", label: "Office info", Icon: Building2 },
  { href: "/admin/chapters", label: "Chapters", Icon: Network, superOnly: true },
  { href: "/admin/super", label: "Super tools", Icon: Shield, superOnly: true },
];

export function Sidebar({ isSuper }: { isSuper: boolean }) {
  const pathname = usePathname();
  const visible = items.filter((i) => !i.superOnly || isSuper);

  return (
    <nav className="flex flex-col gap-0.5">
      {visible.map(({ href, label, Icon }) => {
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
