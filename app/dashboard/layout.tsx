"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/dashboard",           label: "Overview" },
  { href: "/dashboard/macros",    label: "Macros" },
  { href: "/dashboard/body",      label: "Body" },
  { href: "/dashboard/routines",  label: "Routines" },
  { href: "/dashboard/analytics", label: "Analytics" },
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
      <aside className="sidebar">
        <div className="sidebar-logo">FitLife<span>.</span></div>
        <nav className="sidebar-nav">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item${pathname === href ? " active" : ""}`}
            >
              <span className="nav-dot" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-secondary btn-full" onClick={handleLogOut}>
            Log Out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
