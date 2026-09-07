import Link from "next/link";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ bounty?: string; key?: string; session_id?: string }> }) {
  const { bounty, key, session_id } = await searchParams;
  let activated = false;

  if (bounty && key) {
    const check = await query<{ owner_secret_hash: string; status: string }>("SELECT owner_secret_hash, status FROM bounties WHERE id = $1", [bounty]);
    const row = check.rows[0];
    if (row && safeEqualHex(row.owner_secret_hash, hashToken(key))) {
      if (row.status === "active") activated = true;
      else if (session_id && process.env.STRIPE_SECRET_KEY) {
        const session = await stripe().checkout.sessions.retrieve(session_id);
        if (session.payment_status === "paid" && session.metadata?.bounty_id === bounty) {
          await query("UPDATE bounties SET status = 'active', activated_at = COALESCE(activated_at, NOW()), stripe_session_id = COALESCE(stripe_session_id, $2) WHERE id = $1", [bounty, session.id]);
          activated = true;
        }
      } else if (process.env.ALLOW_DEMO_BILLING === "true" && process.env.NODE_ENV !== "production") {
        await query("UPDATE bounties SET status = 'active', activated_at = COALESCE(activated_at, NOW()) WHERE id = $1", [bounty]);
        activated = true;
      }
    }
  }

  return (
    <main className="shell narrow page-pad center-page">
      <div className="success-mark">✓</div>
      <h1>{activated ? "Your bounty is live." : "Payment received. Activating…"}</h1>
      <p className="muted">Keep your private founder link. It is how you verify referrals and manage conversions in this MVP.</p>
      {bounty && key && <Link className="button primary" href={`/manage/${bounty}?key=${encodeURIComponent(key)}`}>Open founder dashboard →</Link>}
    </main>
  );
}
