import { notFound } from "next/navigation";
import { getBountyById, listReferrals, query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import FounderDashboard from "@/components/FounderDashboard";

export const dynamic = "force-dynamic";

export default async function ManagePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ key?: string }> }) {
  const { id } = await params;
  const { key } = await searchParams;
  if (!key) notFound();
  const auth = await query<{ owner_secret_hash: string }>("SELECT owner_secret_hash FROM bounties WHERE id = $1", [id]);
  if (!auth.rows[0] || !safeEqualHex(auth.rows[0].owner_secret_hash, hashToken(key))) notFound();
  const bounty = await getBountyById(id);
  if (!bounty) notFound();
  const referrals = await listReferrals(id);
  return <FounderDashboard bounty={bounty} referrals={referrals} ownerKey={key} />;
}
