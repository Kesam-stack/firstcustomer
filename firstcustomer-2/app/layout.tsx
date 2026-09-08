import type { Metadata } from "next";
import Link from "next/link";
import { Instrument_Serif, IBM_Plex_Mono, Inter } from "next/font/google";
import { CANONICAL_ORIGIN, CONTACT_EMAIL } from "@/lib/site";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-serif" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "FirstCustomer — Pay for customers, not clicks",
  description: "Companies publish exact customer outcomes and rewards. Referrers bring qualified customers and get paid after verification.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || CANONICAL_ORIGIN),
  alternates: { canonical: "/" },
  openGraph: {
    title: "FirstCustomer",
    description: "Companies publish exact customer outcomes and rewards. Referrers bring qualified customers and get paid after verification.",
    type: "website",
    url: CANONICAL_ORIGIN,
    siteName: "FirstCustomer",
  },
  twitter: {
    card: "summary_large_image",
    title: "FirstCustomer",
    description: "Companies publish exact customer outcomes and rewards. Referrers bring qualified customers and get paid after verification.",
  },
};

export const viewport = {
  themeColor: "#f4f1ea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
    <body>
      <header className="site-header">
        <div className="shell nav">
          <Link href="/" className="wordmark">
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" fill="#11110f"/>
              <rect x="13" y="6" width="7" height="16" fill="#f4f1ea"/>
              <rect x="9" y="6" width="11" height="5" fill="#f4f1ea"/>
              <rect x="8" y="23" width="16" height="4" fill="#ff4f24"/>
            </svg>
            FirstCustomer
          </Link>
          <nav>
            <Link href="/" className="nav-hide-sm">Board</Link>
            <Link href="/explore" className="nav-hide-sm">Market</Link>
            <Link href="/ledger" className="nav-hide-md">Ledger</Link>
            <Link href="/leaderboard" className="nav-hide-md">Rank</Link>
            <Link href="/network" className="nav-hide-md">Earn</Link>
          </nav>
          <Link href="/create" className="nav-launch">Launch<span className="hide-sm"> mission</span></Link>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="shell footer">
          <div><b>FirstCustomer</b><span>Customer acquisition, priced.</span></div>
          <div><Link href="/">Board</Link><Link href="/ledger">Ledger</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/network">Earn</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
        </div>
      </footer>
    </body>
  </html>;
}
