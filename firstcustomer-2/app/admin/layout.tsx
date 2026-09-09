import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin — FirstCustomer",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdmin();
  return <div className="admin-app">
    {authed && <header className="admin-header">
      <div className="shell nav">
        <Link href="/admin" className="wordmark">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" fill="#11110f"/>
            <rect x="13" y="6" width="7" height="16" fill="#f4f1ea"/>
            <rect x="9" y="6" width="11" height="5" fill="#f4f1ea"/>
            <rect x="8" y="23" width="16" height="4" fill="#ff4f24"/>
          </svg>
          Admin
        </Link>
        <nav>
          <Link href="/admin">Overview</Link>
          <Link href="/admin/promote">Promote</Link>
          <Link href="/admin/analytics">Analytics</Link>
          <Link href="/admin/campaigns">Campaigns</Link>
          <Link href="/admin/payouts">Payouts</Link>
          <Link href="/admin/referrals" className="nav-hide-sm">Referrals</Link>
          <Link href="/admin/network" className="nav-hide-md">Network</Link>
        </nav>
        <form action="/api/admin/logout" method="post">
          <button className="nav-launch" type="submit">Log out</button>
        </form>
      </div>
    </header>}
    {children}
  </div>;
}
