import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FirstCustomer — Pay for customers, not clicks",
  description: "A customer acquisition market where companies publish verified rewards and referrers earn for outcomes."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>
    <header className="site-header">
      <div className="shell nav">
        <Link href="/" className="wordmark">FirstCustomer</Link>
        <nav>
          <Link href="/explore">Market</Link>
          <Link href="/ledger">Ledger</Link>
          <Link href="/network">Earn</Link>
          <Link href="/create" className="nav-launch">Launch</Link>
        </nav>
      </div>
    </header>
    {children}
    <footer className="site-footer">
      <div className="shell footer">
        <div><b>FirstCustomer</b><span>Pay for outcomes.</span></div>
        <div><Link href="/explore">Market</Link><Link href="/ledger">Ledger</Link><Link href="/network">Earn</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div>
      </div>
    </footer>
  </body></html>;
}
