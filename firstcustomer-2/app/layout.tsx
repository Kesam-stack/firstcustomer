import type { Metadata } from "next";
import Link from "next/link";
import { Instrument_Serif, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-serif" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "FirstCustomer — Highest funded bounty sits at #1",
  description: "A live board where companies pay for customers, not clicks. Rank is funded automatic-payout demand.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://firstcustomer-production.up.railway.app"),
  openGraph: {
    title: "FirstCustomer",
    description: "Pay for customers. Not clicks. Highest funded bounty sits at #1.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FirstCustomer",
    description: "Pay for customers. Not clicks. Highest funded bounty sits at #1.",
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
            <Link href="/network" className="nav-hide-md">Earn</Link>
          </nav>
          <Link href="/create" className="nav-launch">List<span className="hide-sm"> bounty</span></Link>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="shell footer">
          <div><b>FirstCustomer</b><span>Rank is funded demand.</span></div>
          <div><Link href="/">Board</Link><Link href="/ledger">Ledger</Link><Link href="/network">Earn</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div>
        </div>
      </footer>
    </body>
  </html>;
}
