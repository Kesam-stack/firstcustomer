import Link from "next/link";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { stripe } from "@/lib/stripe";
import { distributeCampaign } from "@/lib/network";

export const dynamic = "force-dynamic";

async function activate(bountyId: string, sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (session.payment_status !== "paid" || session.metadata?.bounty_id !== bountyId) return false;
  const paymentIntent = typeof session.payment_intent === "string" ? await stripe().paymentIntents.retrieve(session.payment_intent) : session.payment_intent;
  const paymentMethod = paymentIntent && typeof paymentIntent.payment_method === "string" ? paymentIntent.payment_method : null;
  const customer = typeof session.customer === "string" ? session.customer : null;
  await query(
    `UPDATE bounties SET status='active',activated_at=COALESCE(activated_at,NOW()),stripe_session_id=$2,
      stripe_customer_id=COALESCE($3,stripe_customer_id),stripe_payment_method_id=COALESCE($4,stripe_payment_method_id),payment_verified=TRUE WHERE id=$1`,
    [bountyId, session.id, customer, paymentMethod],
  );
  try { await distributeCampaign(bountyId); } catch (error) { console.error("Network distribution failed", error); }
  return true;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ bounty?: string; key?: string; integration?: string; session_id?: string }> }) {
  const { bounty, key, integration, session_id } = await searchParams;
  let activated = false;
  let matched = 0;
  if (bounty && key) {
    const campaign = await query<any>("SELECT owner_secret_hash,status,network_matched_count FROM bounties WHERE id=$1", [bounty]);
    if (campaign.rows[0] && safeEqualHex(campaign.rows[0].owner_secret_hash, hashToken(key))) {
      activated = campaign.rows[0].status === "active";
      matched = campaign.rows[0].network_matched_count || 0;
      if (!activated && session_id && process.env.STRIPE_SECRET_KEY) {
        activated = await activate(bounty, session_id);
        const refreshed = await query<{ network_matched_count: number }>("SELECT network_matched_count FROM bounties WHERE id=$1", [bounty]);
        matched = refreshed.rows[0]?.network_matched_count || 0;
      }
    }
  }

  return <main className="narrow page-pad center-page"><div className="success-mark">✓</div><h1>{activated ? "Mission is in the network." : "Payment received."}</h1><p className="muted">{activated ? `Your campaign is public and FirstCustomer has already routed it to ${matched} matching network member${matched === 1 ? "" : "s"}. You can share it externally too, but you do not have to.` : "Activation is being confirmed."}</p>{integration && <div className="integration-box"><b>Conversion API key — copy it now</b><code>{integration}</code><p className="fineprint">Use as: Authorization: Bearer &lt;key&gt;. Do not publish this key.</p></div>}{bounty && key && <Link className="button primary" href={`/manage/${bounty}?key=${encodeURIComponent(key)}&integration=${encodeURIComponent(integration || "")}`}>Open company dashboard →</Link>}</main>;
}
