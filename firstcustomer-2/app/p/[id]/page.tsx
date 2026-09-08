import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayoutReceipt } from "@/lib/db";
import { absoluteTime, money, xProfileUrl } from "@/lib/format";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

async function loadReceipt(id: string) {
  try { return await getPayoutReceipt(id); } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const receipt = await loadReceipt(id);
  if (!receipt) return { title: "Payout receipt — FirstCustomer" };

  const title = `${money(receipt.reward_cents)} paid to @${receipt.x_handle} — FirstCustomer`;
  const description = `Verified FirstCustomer payout for a qualified customer delivered to ${receipt.company_name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/p/${receipt.id}` },
    openGraph: { title, description, type: "website", url: siteUrl(`/p/${receipt.id}`) },
    twitter: { card: "summary", title, description },
  };
}

export default async function PayoutReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await loadReceipt(id);
  if (!receipt) notFound();

  const profileHref = receipt.identity_id ? `/people/${receipt.identity_id}` : null;
  const xHref = xProfileUrl(receipt.x_handle);
  const receiptUrl = siteUrl(`/p/${receipt.id}`);
  const shareText = encodeURIComponent(
    `I earned ${money(receipt.reward_cents)} bringing a qualified customer to ${receipt.company_name} through FirstCustomer. Verified receipt: ${receiptUrl}`,
  );

  return <main className="narrow page-pad">
    <section className="receipt-card">
      <div className="receipt-status"><span>Verified payout receipt</span><strong>Settled</strong></div>
      <div className="receipt-amount">
        <span>Reward paid</span>
        <h1>{money(receipt.reward_cents)}</h1>
        <p>
          {profileHref
            ? <Link href={profileHref}>@{receipt.x_handle}</Link>
            : xHref
              ? <a href={xHref} target="_blank" rel="noreferrer">@{receipt.x_handle}</a>
              : <span>@{receipt.x_handle}</span>}
          {" "}delivered a qualified customer to <Link href={`/b/${receipt.slug}`}>{receipt.company_name}</Link>.
        </p>
      </div>

      <div className="receipt-grid">
        <div><span>Status</span><strong>Paid</strong></div>
        <div><span>Settled</span><strong>{absoluteTime(receipt.paid_at)}</strong></div>
        <div><span>Campaign</span><strong>{receipt.company_name}</strong></div>
        <div><span>Receipt</span><strong>{receipt.id.slice(0, 8).toUpperCase()}</strong></div>
      </div>

      <div className="receipt-proof">
        <div><span>Public reputation</span><strong>{receipt.total_approved} approved customers</strong></div>
        <div><span>Total paid to this referrer</span><strong>{money(receipt.total_paid_cents)}</strong></div>
        {receipt.rainmaker && <b className="rainmaker">Rainmaker</b>}
      </div>

      <div className="receipt-actions">
        <Link className="button launch-button" href={`/b/${receipt.slug}`}>Earn from {receipt.company_name} →</Link>
        {profileHref && <Link className="button secondary" href={profileHref}>View public profile</Link>}
        <a className="button secondary" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${shareText}`}>Share receipt on X</a>
      </div>

      <p className="fineprint">This page contains no customer identity data. A receipt appears only after FirstCustomer records the associated Stripe reward transfer as paid.</p>
    </section>
  </main>;
}
