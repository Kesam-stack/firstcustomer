import { notFound } from "next/navigation";
import { getBountyById, listReferrals, listConversions, query, networkMatchCount } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import FounderDashboard from "@/components/FounderDashboard";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ key?: string; integration?: string }> }) {
  const { id } = await params;
  const { key, integration } = await searchParams;
  if (!key) notFound();
  const auth = await query<any>("SELECT owner_secret_hash FROM bounties WHERE id=$1", [id]);
  if (!auth.rows[0] || !safeEqualHex(auth.rows[0].owner_secret_hash, hashToken(key))) notFound();
  const bounty = await getBountyById(id);
  if (!bounty) notFound();
  const [referrals, conversions, matchCount] = await Promise.all([listReferrals(id), listConversions(id), networkMatchCount(id)]);
  return <FounderDashboard bounty={bounty} referrals={referrals} conversions={conversions} ownerKey={key} integrationKey={integration} networkMatchCount={matchCount} />;
}
