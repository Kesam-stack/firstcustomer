import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "FirstCustomer — Customer acquisition network", description: "Companies pay for verified customers. FirstCustomer routes missions to people who can deliver them." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><header className="site-header"><div className="shell nav-new"><Link href="/" className="brand-new">FirstCustomer<span>.</span></Link><nav><Link href="/explore">Missions</Link><Link href="/network">Earn</Link><Link href="/#how">How it works</Link><Link href="/create" className="nav-cta">Launch a mission</Link></nav></div></header>{children}<footer className="site-footer"><div className="shell footer-new"><div><b>FirstCustomer.</b><span>The customer-acquisition network.</span></div><div><Link href="/explore">Missions</Link><Link href="/network">Network</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div></div></footer></body></html>;
}
