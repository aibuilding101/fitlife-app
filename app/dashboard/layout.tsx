"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/dashboard",           label: "Overview",   icon: "⊞" },
  { href: "/dashboard/macros",    label: "Macros",     icon: "◎" },
  { href: "/dashboard/body",      label: "Body",       icon: "◉" },
  { href: "/dashboard/routines",  label: "Routines",   icon: "▤" },
  { href: "/dashboard/analytics", label: "Analytics",  icon: "◈" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">FitLife<span>.</span></div>
        <nav className="sidebar-nav">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={`nav-item${pathname === href ? " active" : ""}`}>
              <span className="nav-dot" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-secondary btn-full" onClick={handleLogOut}>Log Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {NAV.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={`mobile-nav-item${pathname === href ? " active" : ""}`}>
            <span className="mobile-nav-icon">{icon}</span>
            <span className="mobile-nav-label">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
