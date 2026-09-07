import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FirstCustomer — put a bounty on your next customer",
  description: "Launch a public customer bounty. Reward people who bring you real customers.",
  referrer: "no-referrer",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="nav shell">
          <Link href="/" className="brand">firstcustomer<span>.xyz</span></Link>
          <nav>
            <Link href="/create" className="nav-link">Launch a bounty</Link>
          </nav>
        </header>
        {children}
        <footer className="footer shell">
          <span>© {new Date().getFullYear()} FirstCustomer</span>
          <span className="footer-links"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></span>
        </footer>
      </body>
    </html>
  );
}
