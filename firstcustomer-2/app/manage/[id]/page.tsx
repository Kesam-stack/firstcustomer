import { notFound } from "next/navigation";
import { getBountyById, listReferrals, listConversions, query, networkMatchCount } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { stripe } from "@/lib/stripe";
import { applyCheckoutSession } from "@/lib/checkout";
import { config } from "@/lib/config";
import FounderDashboard from "@/components/FounderDashboard";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ key?: string; integration?: string; session_id?: string; cancelled?: string }> }) {
  const { id } = await params;
  const { key, integration, session_id, cancelled } = await searchParams;
  if (!key) notFound();
  const auth = await query<{ owner_secret_hash: string }>("SELECT owner_secret_hash FROM bounties WHERE id=$1", [id]);
  if (!auth.rows[0] || !safeEqualHex(auth.rows[0].owner_secret_hash, hashToken(key))) notFound();

  let checkoutNotice = cancelled === "1" ? "Checkout was cancelled. Nothing was charged." : "";
  if (session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id);
      if (session.metadata?.bounty_id === id) {
        const result = await applyCheckoutSession(session);
        if (result.ok && "kind" in result && result.kind === "billing") checkoutNotice = "Payout card saved. Approvals can now pay referrers.";
        if (result.ok && "kind" in result && result.kind === "featured") checkoutNotice = `Hold #1 is active for ${config.featuredHoldDays} days.`;
      }
    } catch (error) {
      console.error(error);
    }
  }

  const bounty = await getBountyById(id);
  if (!bounty) notFound();
  const billing = await query<{ stripe_customer_id: string | null; stripe_payment_method_id: string | null }>(
    "SELECT stripe_customer_id, stripe_payment_method_id FROM bounties WHERE id=$1",
    [id],
  );
  const prefix = await query<{ integration_secret_prefix: string | null }>("SELECT integration_secret_prefix FROM bounties WHERE id=$1", [id]);
  const [referrals, conversions, matchCount] = await Promise.all([listReferrals(id), listConversions(id), networkMatchCount(id)]);
  return <FounderDashboard
    bounty={bounty}
    referrals={referrals}
    conversions={conversions}
    ownerKey={key}
    integrationKey={integration}
    integrationPrefix={prefix.rows[0]?.integration_secret_prefix || undefined}
    networkMatchCount={matchCount}
    payoutReady={Boolean(billing.rows[0]?.stripe_customer_id && billing.rows[0]?.stripe_payment_method_id)}
    featuredFeeCents={config.featuredFeeCents}
    featuredHoldDays={config.featuredHoldDays}
    checkoutNotice={checkoutNotice}
  />;
}
