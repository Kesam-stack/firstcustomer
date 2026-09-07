import Link from "next/link";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { stripe } from "@/lib/stripe";
import { applyCheckoutSession } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ bounty?: string; key?: string; session_id?: string }> }) {
  const { bounty, key, session_id } = await searchParams;
  let activated = false;
  let matched = 0;
  if (bounty && key) {
    const campaign = await query<{ owner_secret_hash: string; status: string; network_matched_count: number }>("SELECT owner_secret_hash,status,network_matched_count FROM bounties WHERE id=$1", [bounty]);
    if (campaign.rows[0] && safeEqualHex(campaign.rows[0].owner_secret_hash, hashToken(key))) {
      activated = campaign.rows[0].status === "active";
      matched = campaign.rows[0].network_matched_count || 0;
      if (session_id && process.env.STRIPE_SECRET_KEY) {
        try {
          const session = await stripe().checkout.sessions.retrieve(session_id);
          if (session.metadata?.bounty_id === bounty) await applyCheckoutSession(session);
        } catch (error) {
          console.error(error);
        }
        const refreshed = await query<{ status: string; network_matched_count: number }>("SELECT status, network_matched_count FROM bounties WHERE id=$1", [bounty]);
        activated = refreshed.rows[0]?.status === "active";
        matched = refreshed.rows[0]?.network_matched_count || 0;
      }
    }
  }

  return <main className="narrow page-pad center-page"><div className="success-mark">✓</div><h1>{activated ? "You're on the board." : "Payment received."}</h1><p className="muted">{activated ? `Your bounty is live. Only automatic-payout campaigns compete for #1. Hold #1 for 7 days from the company dashboard. FirstCustomer has already routed it to ${matched} matching network member${matched === 1 ? "" : "s"}.` : "Activation is being confirmed."}</p>{bounty && key && <Link className="button launch-button" href={`/manage/${bounty}?key=${encodeURIComponent(key)}`}>Open company dashboard →</Link>}</main>;
}
