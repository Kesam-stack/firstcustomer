import type { Metadata } from "next";
import Link from "next/link";
import { Instrument_Serif, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-serif" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "FirstCustomer — Highest bounty sits at #1",
  description: "A live board where companies pay for customers, not clicks. Rank is the reward.",
  openGraph: {
    title: "FirstCustomer",
    description: "Pay for customers. Not clicks. Highest bounty sits at #1.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
    <body>
      <header className="site-header">
        <div className="shell nav">
          <Link href="/" className="wordmark">FirstCustomer</Link>
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
          <div><b>FirstCustomer</b><span>Rank is the reward.</span></div>
          <div><Link href="/">Board</Link><Link href="/ledger">Ledger</Link><Link href="/network">Earn</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div>
        </div>
      </footer>
    </body>
  </html>;
}
