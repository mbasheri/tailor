"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Board" },
  { href: "/jobs", label: "Jobs" },
  { href: "/resumes", label: "Resumes" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/analytics", label: "Analytics" },
];

export function NavBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b bg-bg/85 backdrop-blur">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="grid place-items-center w-7 h-7 rounded-md bg-accent text-[#04121f] font-bold text-sm">
            R
          </span>
          <span className="font-semibold tracking-tight">Runway</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                isActive(link.href)
                  ? "bg-bg-elevated text-text font-medium"
                  : "text-text-muted hover:text-text hover:bg-bg-raised"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/jobs/new"
          className="btn btn-primary ml-auto shrink-0 !py-1.5"
        >
          + Add job
        </Link>
      </div>
    </header>
  );
}
